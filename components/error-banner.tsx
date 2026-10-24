/** Warning shown when a load or refresh fails. Pages keep showing the last good data under it. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="rounded border border-amber-300 px-2 py-0.5 dark:border-amber-700">
        Retry
      </button>
    </div>
  );
}
