import { MOCK_USERS } from "@/lib/auth/users";

export const metadata = { title: "Sign in – Mindspace Location Dashboards" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Mindspace Location Dashboards</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Demo sign-in. Pick a user to see what their groups allow. Production uses Google SSO.
        </p>
        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">Unknown user, please pick one below.</p>}

        <ul className="mt-6 space-y-3">
          {MOCK_USERS.map((user) => (
            <li key={user.id}>
              <form action="/api/auth/login" method="post">
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-zinc-300 p-4 text-left transition hover:border-zinc-500 dark:border-zinc-700"
                >
                  <span className="block font-medium">{user.name}</span>
                  <span className="mt-1 block font-mono text-xs text-zinc-500">{user.groups.join(", ")}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
