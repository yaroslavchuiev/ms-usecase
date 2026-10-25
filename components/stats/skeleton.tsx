import { Panel } from "@/components/panel";
import { LoadingRegion, Skeleton } from "@/components/skeleton";
import { Group } from "./group";

/** One Stats panel: a row of big numbers, then a chart-sized block. */
function PanelSkeleton({ title, kpis, height }: { title: string; kpis: number; height: number }) {
  return (
    <Panel title={title}>
      <div className="mb-4 flex gap-8">
        {Array.from({ length: kpis }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="w-full" height={height} />
    </Panel>
  );
}

export function StatsSkeleton() {
  return (
    <LoadingRegion className="space-y-8">
      <Group title="Sales & members">
        <PanelSkeleton title="Sales tours" kpis={4} height={260} />
        <PanelSkeleton title="Members" kpis={3} height={140} />
      </Group>
      <Group title="Space">
        <PanelSkeleton title="Occupancy" kpis={2} height={220} />
        <PanelSkeleton title="Meeting room utilisation" kpis={2} height={220} />
      </Group>
      <Group title="Building activity & operations">
        <PanelSkeleton title="Check-ins" kpis={2} height={300} />
        <PanelSkeleton title="Incidents" kpis={3} height={220} />
      </Group>
    </LoadingRegion>
  );
}
