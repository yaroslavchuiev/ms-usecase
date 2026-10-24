import "server-only";
import type { DashboardRole } from "@/lib/dto";
import type { MockUser } from "./users";

const GROUP_PATTERN = /^(reception|stats)-(.+)$/;

/** location slug -> roles the user holds there, derived from group names. */
export function rolesByLocation(user: MockUser): Map<string, DashboardRole[]> {
  const result = new Map<string, DashboardRole[]>();
  for (const group of user.groups) {
    const match = GROUP_PATTERN.exec(group);
    if (!match) continue;
    const [, role, slug] = match;
    result.set(slug, [...(result.get(slug) ?? []), role as DashboardRole]);
  }
  return result;
}

/** The check every API route must pass before returning location data. */
export function authorise(user: MockUser, locationSlug: string, role: DashboardRole): boolean {
  return rolesByLocation(user).get(locationSlug)?.includes(role) ?? false;
}
