"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
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
  const router = useRouter();
  const pathname = usePathname();
  const slug = useSearchParams().get("location");
  const role = pathname.startsWith("/stats") ? "stats" : "reception";
  // Fallback: the first location where the user has this page's role, else simply their first location.
  const location =
    me.locations.find((l) => l.slug === slug) ?? me.locations.find((l) => l.roles.includes(role)) ?? me.locations[0];

  // A missing, unknown or not-allowed slug falls back as above; put that in the URL too, so the
  // address bar always matches what the screen shows.
  useEffect(() => {
    if (slug !== location.slug) router.replace(`${pathname}?location=${location.slug}`);
  }, [slug, location.slug, pathname, router]);
  return <DashboardContext.Provider value={{ me, location }}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardState {
  const state = useContext(DashboardContext);
  if (!state) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return state;
}
