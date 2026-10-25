import type { ReactNode } from "react";

/** Panels grouped by purpose, each group under a heading. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="grid items-start gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}
