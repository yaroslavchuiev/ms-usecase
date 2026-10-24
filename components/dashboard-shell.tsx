"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { MeDto } from "@/lib/dto";
import { DashboardProvider, useDashboard } from "./dashboard-context";
import { Header } from "./header";

function Content({ children }: { children: ReactNode }) {
  const { location } = useDashboard();
  const role = usePathname().startsWith("/stats") ? "stats" : "reception";

  // Typing a URL by hand must not show a dashboard the groups don't grant (the API refuses it too).
  if (!location.roles.includes(role)) {
    return (
      <p className="rounded bg-amber-50 p-4 text-sm text-amber-800">
        You don&apos;t have access to the {role} dashboard for {location.name}.
      </p>
    );
  }
  return <>{children}</>;
}

export function DashboardShell({ me, children }: { me: MeDto; children: ReactNode }) {
  return (
    <DashboardProvider me={me}>
      <Header />
      <main className="mx-auto w-full max-w-7xl 2xl:max-w-[110rem] flex-1 px-4 py-6">
        <Content>{children}</Content>
      </main>
    </DashboardProvider>
  );
}
