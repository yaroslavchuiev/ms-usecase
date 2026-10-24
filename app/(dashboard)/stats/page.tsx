"use client";

import { useDashboard } from "@/components/dashboard-context";

// Placeholder: step 6 adds /api/stats and the charts.
export default function StatsPage() {
  const { location } = useDashboard();
  return <h1 className="text-xl font-semibold">Location Stats – {location.name}</h1>;
}
