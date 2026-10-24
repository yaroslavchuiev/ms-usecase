"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PollingState<T> {
  url: string | null; // the URL `data` belongs to
  data: T | null;
  error: string | null;
}

/**
 * Fetches `url` now and then every `intervalMs`. If a refresh fails, `error` is set but the
 * last good `data` is kept, so the screen never goes blank. Data from a previous URL (e.g. the
 * previous location) is never returned.
 */
export function usePolling<T>(url: string | null, intervalMs: number) {
  const router = useRouter();
  const [state, setState] = useState<PollingState<T>>({ url: null, data: null, error: null });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login"); // session expired
          return;
        }
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        setState({ url, data: body as T, error: null });
      } catch (e) {
        if (controller.signal.aborted) return;
        const error = e instanceof Error ? e.message : "Request failed";
        setState((s) => (s.url === url ? { ...s, error } : { url, data: null, error }));
      }
      timer = setTimeout(load, intervalMs);
    };
    load();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [url, intervalMs, router]);

  const current = state.url === url;
  return { data: current ? state.data : null, error: current ? state.error : null };
}
