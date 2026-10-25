import { Section } from "@/components/panel";
import type { UsefulLinkDto } from "@/lib/dto";

export function LinksSection({ links }: { links: UsefulLinkDto[] }) {
  return (
    <Section title="Useful links">
      <ul className="grid grid-cols-2 gap-3">
        {links.map((l) => {
          const external = l.url.startsWith("https://"); // tel: links stay in the same tab
          return (
            <li key={l.label}>
              <a
                href={l.url}
                {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                className="block h-full rounded border border-zinc-200 p-3 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  {l.label}
                  <span aria-hidden className="text-zinc-400">{external ? "↗" : "☎"}</span>
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">{l.description}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
