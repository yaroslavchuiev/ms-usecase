import "server-only";
import type { LocationDto, ReceptionDto } from "@/lib/dto";
import { mockReceptionRecords } from "@/lib/mock/queries";
import { buildReception } from "@/lib/salesforce/mappers";
import { addLocalDays, startOfLocalDay } from "@/lib/time";

// Step 7 adds the DATA_MODE switch here: mock -> fixtures, live -> SOQL. Everything after
// the fetch (mapping to the DTO) is shared, so both modes return the same shape.
export async function getReception(location: LocationDto, now = new Date()): Promise<ReceptionDto> {
  // "Today" is the location's calendar day, not the server's (Vercel runs in UTC).
  const dayStart = startOfLocalDay(now, location.timeZone);
  const dayEnd = addLocalDays(dayStart, 1, location.timeZone);

  const raw = mockReceptionRecords(location.id, dayStart, dayEnd);
  return buildReception(location, raw, now);
}
