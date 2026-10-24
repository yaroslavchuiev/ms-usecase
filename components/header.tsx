"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DashboardRole } from "@/lib/dto";
import { useDashboard } from "./dashboard-context";

const TABS: { role: DashboardRole; label: string }[] = [
  { role: "reception", label: "Reception" },
  { role: "stats", label: "Location Stats" },
];

/** Building-local time. Uses the location's zone, not the browser's. Rendered after mount to avoid a hydration mismatch. */
function LocationClock({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0); // not a direct setState in the effect body
    const id = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const time = now?.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" });
  return <span className="tabular-nums text-sm text-zinc-500">{time ?? "--:--"} local</span>;
}

export function Header() {
  const { me, location } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();
  const currentRole = pathname.startsWith("/stats") ? "stats" : "reception";

  // Switching building keeps the current tab if the user has that role there, else the first one they have.
  const changeLocation = (slug: string) => {
    const next = me.locations.find((l) => l.slug === slug);
    if (!next) return;
    const role = next.roles.includes(currentRole) ? currentRole : next.roles[0];
    router.push(`/${role}?location=${slug}`);
  };

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-7xl 2xl:max-w-[110rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-semibold tracking-tight">Mindspace</span>

        {me.locations.length > 1 ? (
          <select
            aria-label="Location"
            value={location.slug}
            onChange={(e) => changeLocation(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
          >
            {me.locations.map((l) => (
              <option key={l.slug} value={l.slug} className="text-black">
                {l.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-medium">{location.name}</span>
        )}
        <LocationClock timeZone={location.timeZone} />

        <nav className="flex gap-1" aria-label="Dashboards">
          {TABS.filter((t) => location.roles.includes(t.role)).map((t) => (
            <Link
              key={t.role}
              href={`/${t.role}?location=${location.slug}`}
              aria-current={currentRole === t.role ? "page" : undefined}
              className={`rounded px-3 py-1 text-sm ${
                currentRole === t.role ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{me.user.name}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
