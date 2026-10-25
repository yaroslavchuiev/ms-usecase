"use client";

import { useDashboard } from "@/components/dashboard-context";
import { ErrorBanner } from "@/components/error-banner";
import { Panel } from "@/components/panel";
import { ReceptionSkeleton } from "@/components/reception/skeleton";
import { DeliveriesSection } from "@/components/reception/deliveries";
import { TasksPanel } from "@/components/reception/tasks";
import { LinksSection } from "@/components/reception/useful-links";
import { AgendaPanel, IncidentsPanel, SpotsSection } from "@/components/reception/panels";
import { useNow } from "@/components/use-now";
import { usePolling } from "@/components/use-polling";
import type { ReceptionDto } from "@/lib/dto";
import { formatTime } from "@/lib/format";

const POLL_MS = 30_000;

function LastUpdated({ iso }: { iso: string }) {
  const now = useNow(5_000);
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  // Polling is every 30 s: after 90 s without news, say so.
  const stale = seconds > 90;
  return (
    <span className={`text-sm ${stale ? "font-medium text-amber-600" : "text-zinc-500"}`}>
      Updated {seconds < 5 ? "just now" : seconds < 120 ? `${seconds}s ago` : `${Math.round(seconds / 60)} min ago`}
    </span>
  );
}

export default function ReceptionPage() {
  const { location } = useDashboard();
  const { data, error, retry } = usePolling<ReceptionDto>(`/api/reception?location=${location.slug}`, POLL_MS);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Reception – {location.name}</h1>
        {data && <LastUpdated iso={data.lastUpdated} />}
      </div>

      {error && (
        <ErrorBanner
          message={`Couldn't refresh (${error}). ${data ? `Showing data from ${formatTime(data.lastUpdated, location.timeZone)}.` : "Retrying…"}`}
          onRetry={retry}
        />
      )}

      {!data ? (
        !error && <ReceptionSkeleton />
      ) : (
        // Three columns on wide screens: front desk | cases | agenda.
        <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Panel title="Front desk">
            <div className="space-y-5">
              <SpotsSection freeSpots={data.freeSpots} entered={data.entered} timeZone={location.timeZone} />
              <DeliveriesSection locationSlug={location.slug} deliveries={data.deliveries} companies={data.companies} onChanged={retry} />
              <LinksSection links={data.links} />
            </div>
          </Panel>
          <div className="grid gap-4">
            <IncidentsPanel incidents={data.incidents} />
            <TasksPanel locationSlug={location.slug} />
          </div>
          <AgendaPanel agenda={data.agenda} timeZone={location.timeZone} />
        </div>
      )}
    </div>
  );
}
