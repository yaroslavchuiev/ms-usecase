import type { ReactNode } from "react";

export function Panel({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {aside && <div className="text-sm text-zinc-500">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-zinc-500">{children}</p>;
}
