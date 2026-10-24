import "server-only";
import type { LocationDto, StatsDto, StatsRange } from "@/lib/dto";
import { mockStatsRecords } from "@/lib/mock/queries";
import { RANGE_DAYS, buildStats } from "@/lib/salesforce/mappers";
import { addLocalDays, localDateString, startOfLocalDay } from "@/lib/time";

// Same pattern as reception: step 7 switches the fetch between mock and live (SOQL).
export async function getStats(location: LocationDto, range: StatsRange, now = new Date()): Promise<StatsDto> {
  const tz = location.timeZone;
  const todayStart = startOfLocalDay(now, tz);
  // The period is whole local days: the last N days including today.
  const from = addLocalDays(todayStart, 1 - RANGE_DAYS[range], tz);
  const to = addLocalDays(todayStart, 1, tz);

  const raw = mockStatsRecords(location.id, from, to, localDateString(from, tz));
  return buildStats(location, range, raw, now);
}
