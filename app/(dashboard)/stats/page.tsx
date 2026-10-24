"use client";

import { useState } from "react";
import { useDashboard } from "@/components/dashboard-context";
import { EmptyState } from "@/components/panel";
import { CheckInsPanel, IncidentsStatsPanel, MembersPanel, OccupancyPanel, RoomsPanel } from "@/components/stats/panels";
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
  const { data, error } = usePolling<StatsDto>(`/api/stats?location=${location.slug}&range=${range}`, null);

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

      {error && (
        <p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Couldn&apos;t load stats ({error}).
        </p>
      )}

      {!data ? (
        !error && <EmptyState>Loading…</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <OccupancyPanel occupancy={data.occupancy} />
          <CheckInsPanel checkIns={data.checkIns} />
          <RoomsPanel rooms={data.rooms} />
          <IncidentsStatsPanel incidents={data.incidents} />
          <MembersPanel members={data.members} />
        </div>
      )}
    </div>
  );
}
