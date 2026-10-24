import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { buildMe } from "@/lib/me";

// "/" has no content of its own: send the user to their first dashboard.
export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const first = (await buildMe(user)).locations[0];
  if (!first) redirect("/reception"); // the layout shows the "no access" message
  const role = first.roles.includes("reception") ? "reception" : first.roles[0];
  redirect(`/${role}?location=${first.slug}`);
}
