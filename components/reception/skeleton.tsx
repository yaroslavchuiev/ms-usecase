import { LoadingRegion, Skeleton, SkeletonRows } from "@/components/skeleton";
import { Panel, Section } from "@/components/panel";

// Same panels, titles and grid as the real Reception page, so nothing jumps when the data arrives.
export function ReceptionSkeleton() {
  return (
    <LoadingRegion className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Panel title="Front desk">
        <div className="space-y-5">
          <Section title="Free spots & entered today">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-[5.25rem]" />
              ))}
            </div>
          </Section>
          <Section title="Deliveries">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-[5.25rem]" />
              <Skeleton className="h-[5.25rem]" />
            </div>
          </Section>
          <Section title="Useful links">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </Section>
        </div>
      </Panel>

      <div className="grid gap-4">
        <Panel title="Ongoing cases">
          <SkeletonRows count={5} />
        </Panel>
        <Panel title="My today & overdue tasks">
          <SkeletonRows count={3} />
        </Panel>
      </div>

      <Panel title="Today's agenda">
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-1.5 border-l border-zinc-200 pl-5 dark:border-zinc-800">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      </Panel>
    </LoadingRegion>
  );
}
