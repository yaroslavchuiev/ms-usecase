import { jsonError } from "@/lib/api";
import { rolesByLocation } from "@/lib/auth/authorise";
import { getSessionUser } from "@/lib/auth/session";
import type { MeDto } from "@/lib/dto";
import { getLocations } from "@/lib/locations";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError(401, "Authentication required");

  const roles = rolesByLocation(user);
  const locations = (await getLocations())
    .filter((l) => roles.has(l.slug)) // groups naming unknown locations are ignored
    .map((l) => ({ ...l, roles: roles.get(l.slug)! }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const body: MeDto = { user: { id: user.id, name: user.name, email: user.email }, locations };
  return Response.json(body);
}
