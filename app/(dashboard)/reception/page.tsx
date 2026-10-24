"use client";

import { useDashboard } from "@/components/dashboard-context";
import { EmptyState } from "@/components/panel";
import { EnteredPanel, FreeSpotsPanel, IncidentsPanel, MeetingsPanel } from "@/components/reception/panels";
import { useNow } from "@/components/use-now";
import { usePolling } from "@/components/use-polling";
import type { ReceptionDto } from "@/lib/dto";

const POLL_MS = 30_000;

function LastUpdated({ iso }: { iso: string }) {
  const now = useNow(5_000);
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return <span className="text-sm text-zinc-500">Updated {seconds < 5 ? "just now" : `${seconds}s ago`}</span>;
}

export default function ReceptionPage() {
  const { location } = useDashboard();
  const { data, error } = usePolling<ReceptionDto>(`/api/reception?location=${location.slug}`, POLL_MS);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Reception – {location.name}</h1>
        {data && <LastUpdated iso={data.lastUpdated} />}
      </div>

      {error && (
        <p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Couldn&apos;t refresh ({error}). {data ? "Showing the last data we received." : "Retrying…"}
        </p>
      )}

      {!data ? (
        !error && <EmptyState>Loading…</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <IncidentsPanel incidents={data.incidents} />
          <EnteredPanel entered={data.entered} timeZone={location.timeZone} />
          <FreeSpotsPanel freeSpots={data.freeSpots} />
          <MeetingsPanel meetings={data.meetings} timeZone={location.timeZone} />
        </div>
      )}
    </div>
  );
}
