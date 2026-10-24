"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface PollingState<T> {
  url: string | null; // the URL `data` belongs to
  data: T | null;
  error: string | null;
  updatedAt: number | null; // when `data` last arrived (ms)
}

/**
 * Fetches `url` now and then every `intervalMs` (null = fetch once, e.g. for Stats).
 * - If a refresh fails, `error` is set but the last good `data` is kept, so the screen never goes blank.
 * - Data from a previous URL (e.g. the previous location) is never returned.
 * - Polling pauses while the browser tab is hidden (saves Salesforce API calls) and catches up when it is shown again.
 * - `retry()` reloads immediately.
 */
export function usePolling<T>(url: string | null, intervalMs: number | null) {
  const router = useRouter();
  const [state, setState] = useState<PollingState<T>>({ url: null, data: null, error: null, updatedAt: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let loadedOnce = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      if (loadedOnce && document.hidden) {
        if (intervalMs !== null) timer = setTimeout(load, intervalMs);
        return;
      }
      inFlight = true;
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login"); // session expired
          return;
        }
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        loadedOnce = true;
        setState({ url, data: body as T, error: null, updatedAt: Date.now() });
      } catch (e) {
        if (controller.signal.aborted) return;
        const error = e instanceof Error ? e.message : "Request failed";
        setState((s) => (s.url === url ? { ...s, error } : { url, data: null, error, updatedAt: null }));
      } finally {
        inFlight = false;
      }
      if (intervalMs !== null) timer = setTimeout(load, intervalMs);
    };

    const onVisible = () => {
      if (!document.hidden && intervalMs !== null) {
        clearTimeout(timer);
        load();
      }
    };

    load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, intervalMs, router, attempt]);

  const current = state.url === url;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    updatedAt: current ? state.updatedAt : null,
    retry,
  };
}
