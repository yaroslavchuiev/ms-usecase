import { LoadingRegion, Skeleton } from "@/components/skeleton";

/** Page body placeholder used before we know which dashboard (Reception or Stats) is opening. */
export function PageSkeleton() {
  return (
    <LoadingRegion className="space-y-4">
      <Skeleton className="h-7 w-64" />
      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Header bar + page body, shown while the dashboard layout is waiting for the user and locations. */
export function ShellSkeleton() {
  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 2xl:max-w-[110rem]">
          <span className="font-semibold tracking-tight">Mindspace</span>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-44" />
          <Skeleton className="ml-auto h-7 w-40" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 2xl:max-w-[110rem]">
        <PageSkeleton />
      </main>
    </>
  );
}
