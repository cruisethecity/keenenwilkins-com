import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Live telemetry hook.
 *
 * Behaviour worth explaining, because the naive version of this is wrong in
 * two ways.
 *
 * 1. It increments once per browser session, not once per render. React
 *    StrictMode mounts effects twice in development, and a bare POST in an
 *    effect would double every local visit. A session flag plus a ref guard
 *    keeps the number honest.
 *
 * 2. It fails quietly. If the API is cold, throttled or unreachable, the badge
 *    shows a neutral state instead of an error. A resume site that renders a
 *    stack trace because DynamoDB blinked is a worse outcome than a missing
 *    number.
 */

const SESSION_KEY = "telemetry:counted";
const REQUEST_TIMEOUT_MS = 6000;

function safeSessionRead(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    // Private browsing and hardened privacy settings both throw here.
    return null;
  }
}

function safeSessionWrite(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Nothing to do. The count simply increments again on the next visit.
  }
}

export function useVisitorCount() {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const endpoint = baseUrl ? `${baseUrl}/visits` : "";

  const [state, setState] = useState({
    status: endpoint ? "loading" : "unconfigured",
    count: null,
    error: null,
  });

  const hasRequested = useRef(false);

  const load = useCallback(async () => {
    if (!endpoint) return;

    const alreadyCounted = safeSessionRead(SESSION_KEY) === "1";
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(endpoint, {
        method: alreadyCounted ? "GET" : "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`counter responded ${response.status}`);
      }

      const payload = await response.json();

      if (typeof payload.count !== "number") {
        throw new Error("counter payload missing a numeric count");
      }

      if (!alreadyCounted) {
        safeSessionWrite(SESSION_KEY, "1");
      }

      setState({ status: "ready", count: payload.count, error: null });
    } catch (error) {
      setState({
        status: "error",
        count: null,
        error: error instanceof Error ? error.message : "unknown error",
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }, [endpoint]);

  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;
    load();
  }, [load]);

  return { ...state, endpoint, retry: load };
}
