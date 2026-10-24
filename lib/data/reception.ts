import "server-only";
import { cached } from "@/lib/cache";
import type { LocationDto, ReceptionDto } from "@/lib/dto";
import { mockReceptionRecords } from "@/lib/mock/queries";
import { getUsefulLinks } from "@/lib/links";
import { getSalesforceBaseUrl } from "@/lib/salesforce/config";
import { buildReception } from "@/lib/salesforce/mappers";
import { fetchReceptionRecords } from "@/lib/salesforce/queries";
import { addLocalDays, localDateString, startOfLocalDay } from "@/lib/time";
import { isLiveMode } from "./mode";

const LIVE_CACHE_MS = 30_000; // all reception screens of a building share one Salesforce round of queries

// Fetch differs by DATA_MODE; everything after it (mapping to the DTO) is shared, so both
// modes return exactly the same shape.
export async function getReception(location: LocationDto, now = new Date()): Promise<ReceptionDto> {
  // "Today" is the location's calendar day, not the server's (Vercel runs in UTC).
  const dayStart = startOfLocalDay(now, location.timeZone);
  const dayEnd = addLocalDays(dayStart, 1, location.timeZone);
  const today = localDateString(dayStart, location.timeZone);

  const extras = { salesforceBaseUrl: getSalesforceBaseUrl(), links: getUsefulLinks(location) };

  if (!isLiveMode()) return buildReception(location, mockReceptionRecords(location.id, dayStart, dayEnd, today), now, extras);

  return cached(`reception:${location.id}`, LIVE_CACHE_MS, async () => {
    const raw = await fetchReceptionRecords(location.id, dayStart, dayEnd, today);
    return buildReception(location, raw, new Date(), extras);
  });
}
