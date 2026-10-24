"use client";

import { useDashboard } from "@/components/dashboard-context";

// Placeholder: step 5 adds /api/reception and the real panels.
export default function ReceptionPage() {
  const { location } = useDashboard();
  return <h1 className="text-xl font-semibold">Reception – {location.name}</h1>;
}
