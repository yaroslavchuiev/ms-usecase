"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import type { MeDto } from "@/lib/dto";

type Location = MeDto["locations"][number];

interface DashboardState {
  me: MeDto;
  /** The location picked in the header: `?location=<slug>`, else the user's first one. */
  location: Location;
}

const DashboardContext = createContext<DashboardState | null>(null);

// The selected location lives in the URL (shareable, survives reloads, readable on the server).
// This is UX only: every API call is authorised again on the server.
export function DashboardProvider({ me, children }: { me: MeDto; children: ReactNode }) {
  const slug = useSearchParams().get("location");
  const location = me.locations.find((l) => l.slug === slug) ?? me.locations[0];
  return <DashboardContext.Provider value={{ me, location }}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardState {
  const state = useContext(DashboardContext);
  if (!state) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return state;
}
