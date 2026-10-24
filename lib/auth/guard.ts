import "server-only";
import { jsonError } from "@/lib/api";
import type { DashboardRole, LocationDto } from "@/lib/dto";
import { getLocations } from "@/lib/locations";
import { authorise } from "./authorise";
import { getSessionUser } from "./session";

/**
 * The gate for every location-scoped API route:
 * 401 no session, 400 no location, 403 no group for this location + role.
 * Unknown slugs also get 403, so the API doesn't reveal which locations exist.
 */
export async function authoriseLocationRequest(
  request: Request,
  role: DashboardRole,
): Promise<{ location: LocationDto } | { error: Response }> {
  const user = await getSessionUser();
  if (!user) return { error: jsonError(401, "Authentication required") };

  const slug = new URL(request.url).searchParams.get("location");
  if (!slug) return { error: jsonError(400, "Missing 'location' parameter") };
  if (!authorise(user, slug, role)) return { error: jsonError(403, "You don't have access to this location") };

  const location = (await getLocations()).find((l) => l.slug === slug);
  if (!location) return { error: jsonError(404, "Location not found") };
  return { location };
}
