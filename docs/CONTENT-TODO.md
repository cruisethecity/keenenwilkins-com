# Content to verify before you publish

Everything in this list is real content of yours that I either inferred or left as a placeholder. None of it is wrong on purpose, but none of it should go public without your eyes on it.

## Must fix

**Employment date ranges.** `frontend/src/data/resumeData.json`, the `experience` array.

I have Sazerac at `2024 to 2026` and Zumiez at `2016 to 2024`. Those add up to eight years at Zumiez and two at Sazerac, which is why the experience section headline reads "Ten years of owning outcomes." If your real dates differ, fix the `dateRange` values and then adjust two lines of copy that depend on them:

- `experience` section title in `frontend/src/components/ExperienceRail.jsx`
- the `operations` highlight value in `resumeData.json`, currently `8` years

**The resume PDF.** `frontend/public/resume/keenen-wilkins-resume.pdf` is a one page placeholder that exists only so the download button never 404s. Replace the file, keep the name.

## Should verify

**Degree name.** I used "B.S. Cloud Computing, AWS track" because that is how you described it. Confirm it matches what WGU will print on the diploma.

**i.c.stars.** Listed as a technology leadership internship, In progress. The credential wording is mine, not yours. Correct it to whatever the program is actually called, and tell me if it deserves a row in Experience as well as a card here.

**Per Scholas is removed.** You are not enrolled, so it is gone from the site copy entirely.

**Terraform Associate.** Listed as In progress. The exam version number is deliberately omitted from the site copy since it changes.

**Threat pipeline metrics.** The `Under 60s` alert to containment figure on the featured project tile is the one number I am least sure about. If you have not measured it, either measure it or replace it with something you can defend, because that is exactly the number an interviewer will ask about.

**Project count.** The lineup headline says "Six builds." If you add or remove a project, update that string in `frontend/src/components/ProLineup.jsx`.

## Deliberately left out

**LaunchCode.** Removed from all site copy, per your note that the description was outdated. It appears nowhere in `resumeData.json`, the hero, or the credentials section. When you want it back, add an entry to `credentials.education`.

**Trash Guard.** Not included. You have it flagged as permanently excluded from resumes, and this page is a resume.

**Contact phone number.** Present in `meta.links.phone` in the data file but not rendered anywhere. Add it to the `contact.cards` array if you want it on the page. Publishing a mobile number on an indexed site invites recruiter spam, so that is your call.

## The copy rules in force

If you edit any visible text, two constraints apply throughout:

1. **No hyphens in readable English.** Use commas, periods, or rewrite. Date ranges use the word "to". Hyphens are fine inside code, file paths, CSS class names and package names.
2. **No em dashes.** Same reasoning. Use a period or a comma.

There is an automated check for the first rule you can run any time:

```bash
cd frontend
python3 - <<'PY'
import json, pathlib, re
data = json.loads(pathlib.Path("src/data/resumeData.json").read_text())

def walk(node, path="$"):
    if isinstance(node, dict):
        for k, v in node.items():
            yield from walk(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk(v, f"{path}[{i}]")
    elif isinstance(node, str):
        yield path, node

CODE_KEYS = ("resumePath", "links", "href", "id", "icon", "accent", "size")
bad = [(p, v) for p, v in walk(data)
       if "-" in v and not any(k in p for k in CODE_KEYS)]
print("\n".join(f"{p}: {v}" for p, v in bad) or "clean")
PY
```
