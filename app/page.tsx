import { getSessionUser } from "@/lib/auth/session";

// Temporary landing page: proves the session works. Step 4 replaces it with the real layout.
export default async function Home() {
  const user = await getSessionUser();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Mindspace Location Dashboards</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Signed in as {user?.name}</p>
        <form action="/api/auth/logout" method="post" className="mt-4">
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
