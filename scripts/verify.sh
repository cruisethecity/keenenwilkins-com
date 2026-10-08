#!/usr/bin/env bash
#
# Every gate this repo has, in one command.
#
#   ./scripts/verify.sh            everything
#   ./scripts/verify.sh --quick    skip npm ci and terraform init, for a fast re-run
#
# Deliberately does NOT use `set -e`. A failing gate should not hide the gates
# after it, because the whole point is one report rather than one error at a
# time. Exits non-zero if anything failed, so CI or a git hook can use it.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
ROOT=$(pwd)
QUICK=${1:-}

RESULTS=()
FAILED=0

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

gate() {                       # gate "<name>" <command...>
  local name=$1; shift
  printf '\n'; bold "▸ $name"
  if "$@"; then
    RESULTS+=("PASS  $name"); printf '\033[32m  ok\033[0m\n'
  else
    RESULTS+=("FAIL  $name"); FAILED=1; printf '\033[31m  failed\033[0m\n'
  fi
}

note() { RESULTS+=("NOTE  $*"); }

# --------------------------------------------------------------- environment

bold "Environment"

TF_LOCAL=$(terraform version -json 2>/dev/null | sed -n 's/.*"terraform_version": *"\([^"]*\)".*/\1/p' | head -1)
TF_PINNED=$(sed -n 's/.*TERRAFORM_VERSION: *"\(.*\)".*/\1/p' .github/workflows/backend-deploy.yml | head -1)
PY_PINNED=$(sed -n 's/.*PYTHON_VERSION: *"\(.*\)".*/\1/p' .github/workflows/backend-deploy.yml | head -1)
NODE_PINNED=$(sed -n 's/.*NODE_VERSION: *"\(.*\)".*/\1/p' .github/workflows/frontend-deploy.yml | head -1)

# Prefer the project venv over whatever python3 happens to be on PATH. macOS
# ships 3.9, which cannot install this project at all.
VENV="$ROOT/backend/.venv"
if [ -x "$VENV/bin/python" ]; then PY="$VENV/bin/python"; else PY=$(command -v python3); fi
PY_LOCAL=$("$PY" -V 2>&1 | awk '{print $2}')

dim "  terraform  ${TF_LOCAL:-missing}   (CI pins ${TF_PINNED:-?})"
dim "  python     ${PY_LOCAL:-missing}   (CI pins ${PY_PINNED:-?})   $PY"
dim "  node       $(node -v 2>/dev/null || echo missing)   (CI pins ${NODE_PINNED:-?})"
dim "  aws        $(aws --version 2>&1 | awk '{print $1}' || echo missing)"

# The pin has to be >= whatever writes state locally. Terraform refuses to read
# state written by a newer version, so a lower CI pin breaks every pipeline run
# after the first local apply.
if [ -n "$TF_LOCAL" ] && [ -n "$TF_PINNED" ] && [ "$TF_LOCAL" != "$TF_PINNED" ]; then
  lowest=$(printf '%s\n%s\n' "$TF_LOCAL" "$TF_PINNED" | sort -V | head -1)
  if [ "$lowest" = "$TF_PINNED" ]; then
    RESULTS+=("FAIL  terraform CI pin $TF_PINNED is older than local $TF_LOCAL, state will break CI"); FAILED=1
  else
    note "terraform CI pin $TF_PINNED differs from local $TF_LOCAL, but is newer so state is readable"
  fi
fi

case "$PY_LOCAL" in
  3.9*|3.10*|2.*) RESULTS+=("FAIL  python $PY_LOCAL is below the 3.11 this project requires"); FAILED=1 ;;
esac

# ----------------------------------------------------------------- frontend

if [ "$QUICK" != "--quick" ]; then
  gate "frontend install"  bash -c "cd '$ROOT/frontend' && npm ci"
fi
gate "frontend lint"       bash -c "cd '$ROOT/frontend' && npm run lint"
gate "frontend build"      bash -c "cd '$ROOT/frontend' && npm run build"

# ------------------------------------------------------------------ backend

if [ -x "$VENV/bin/pytest" ]; then
  gate "backend tests"     bash -c "cd '$ROOT/backend' && '$VENV/bin/pytest'"
  gate "backend lint"      bash -c "cd '$ROOT/backend' && '$VENV/bin/ruff' check ."
else
  RESULTS+=("FAIL  backend/.venv missing, run: python3.12 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements-dev.txt"); FAILED=1
fi

# ---------------------------------------------------------------- terraform

gate "terraform fmt"       terraform fmt -check -recursive "$ROOT/terraform"

for root in bootstrap environments/prod; do
  d="$ROOT/terraform/$root"
  if [ "$QUICK" != "--quick" ]; then
    # -backend=false so validate never needs AWS credentials or a state bucket.
    gate "terraform init  $root"  bash -c "cd '$d' && terraform init -backend=false -input=false -no-color >/dev/null"
  fi
  gate "terraform validate  $root" bash -c "cd '$d' && terraform validate -no-color"
done

# ------------------------------------------------------------------- report

printf '\n'; bold "────────── summary ──────────"
for r in "${RESULTS[@]}"; do
  case "$r" in
    PASS*) printf '\033[32m  %s\033[0m\n' "$r" ;;
    FAIL*) printf '\033[31m  %s\033[0m\n' "$r" ;;
    *)     printf '\033[33m  %s\033[0m\n' "$r" ;;
  esac
done
printf '\n'
if [ "$FAILED" -eq 0 ]; then bold "all gates passed"; else bold "something failed, see above"; fi
exit $FAILED
