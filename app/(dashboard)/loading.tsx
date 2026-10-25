import { PageSkeleton } from "@/components/shell-skeleton";

// Shown while a dashboard page is loading (the header from the layout stays on screen).
export default function Loading() {
  return <PageSkeleton />;
}
