"use client";

import { useEffect } from "react";

// Last-resort boundary for unexpected rendering errors (API failures are handled inline by the pages).
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">The dashboard couldn&apos;t be displayed. This is usually temporary.</p>
      <button type="button" onClick={retry} className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700">
        Try again
      </button>
    </main>
  );
}
