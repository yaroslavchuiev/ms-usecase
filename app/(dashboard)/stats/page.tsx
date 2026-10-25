"use client";

import { useState } from "react";
import { useDashboard } from "@/components/dashboard-context";
import { ErrorBanner } from "@/components/error-banner";
import { Group } from "@/components/stats/group";
import { StatsSkeleton } from "@/components/stats/skeleton";
import { CheckInsPanel, IncidentsStatsPanel, MembersPanel, OccupancyPanel, RoomsPanel, SalesPanel } from "@/components/stats/panels";
import { usePolling } from "@/components/use-polling";
import type { StatsDto, StatsRange } from "@/lib/dto";

const RANGES: { value: StatsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export default function StatsPage() {
  const { location } = useDashboard();
  const [range, setRange] = useState<StatsRange>("30d");
  // Stats are loaded on demand (no polling): they only change over days.
  const { data, error, retry } = usePolling<StatsDto>(`/api/stats?location=${location.slug}&range=${range}`, null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Location Stats – {location.name}</h1>
        <div role="group" aria-label="Period" className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              aria-pressed={range === r.value}
              className={`rounded px-3 py-1 text-sm ${
                range === r.value ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={`Couldn't load stats (${error}).`} onRetry={retry} />}

      {!data ? (
        !error && <StatsSkeleton />
      ) : (
        <div className="space-y-8">
          <Group title="Sales & members">
            <SalesPanel sales={data.sales} />
            <MembersPanel members={data.members} />
          </Group>
          <Group title="Space">
            <OccupancyPanel occupancy={data.occupancy} />
            <RoomsPanel rooms={data.rooms} />
          </Group>
          <Group title="Building activity & operations">
            <CheckInsPanel checkIns={data.checkIns} />
            <IncidentsStatsPanel incidents={data.incidents} />
          </Group>
        </div>
      )}
    </div>
  );
}
