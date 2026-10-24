import "server-only";
import { rolesByLocation } from "@/lib/auth/authorise";
import type { MockUser } from "@/lib/auth/users";
import type { MeDto } from "@/lib/dto";
import { getLocations } from "@/lib/locations";

/** Who the user is and which locations/roles their groups grant. Shared by /api/me and the layout. */
export async function buildMe(user: MockUser): Promise<MeDto> {
  const roles = rolesByLocation(user);
  const locations = (await getLocations())
    .filter((l) => roles.has(l.slug)) // groups naming unknown locations are ignored
    .map((l) => ({ ...l, roles: roles.get(l.slug)! }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { user: { id: user.id, name: user.name, email: user.email }, locations };
}
