import "server-only";
import { cached } from "@/lib/cache";
import type { LocationDto, StatsDto, StatsRange } from "@/lib/dto";
import { mockStatsRecords } from "@/lib/mock/queries";
import { RANGE_DAYS, buildStats } from "@/lib/salesforce/mappers";
import { fetchStatsRecords } from "@/lib/salesforce/queries";
import { addLocalDays, localDateString, startOfLocalDay } from "@/lib/time";
import { isLiveMode } from "./mode";

const LIVE_CACHE_MS = 5 * 60_000; // history changes slowly, so cache longer than Reception

export async function getStats(location: LocationDto, range: StatsRange, now = new Date()): Promise<StatsDto> {
  const tz = location.timeZone;
  const todayStart = startOfLocalDay(now, tz);
  // The period is whole local days: the last N days including today.
  const from = addLocalDays(todayStart, 1 - RANGE_DAYS[range], tz);
  const to = addLocalDays(todayStart, 1, tz);
  const fromDate = localDateString(from, tz);

  if (!isLiveMode()) return buildStats(location, range, mockStatsRecords(location.id, from, to, fromDate), now);

  return cached(`stats:${location.id}:${range}`, LIVE_CACHE_MS, async () => {
    const raw = await fetchStatsRecords(location.id, from, to, fromDate);
    return buildStats(location, range, raw, new Date());
  });
}
