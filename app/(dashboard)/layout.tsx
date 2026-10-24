import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSessionUser } from "@/lib/auth/session";
import { buildMe } from "@/lib/me";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const me = await buildMe(user);
  if (me.locations.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p>{user.name} isn&apos;t in any location group yet. Ask an administrator for access.</p>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700">
            Sign out
          </button>
        </form>
      </main>
    );
  }
  return <DashboardShell me={me}>{children}</DashboardShell>;
}
