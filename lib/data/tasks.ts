import "server-only";
import { cached } from "@/lib/cache";
import type { LocationDto, TasksDto } from "@/lib/dto";
import { mockTasks } from "@/lib/mock/tasks";
import { getSalesforceBaseUrl } from "@/lib/salesforce/config";
import { buildTasks } from "@/lib/salesforce/mappers";
import { fetchTasks } from "@/lib/salesforce/queries";
import { localDateString } from "@/lib/time";
import { isLiveMode } from "./mode";

const LIVE_CACHE_MS = 60_000;

/**
 * The signed-in user's own tasks. The owner is the user's email, taken from the session on the server
 * (never from the request), matched to the Salesforce user with that email. "Today" is the location's day.
 */
export async function getTasks(location: LocationDto, ownerEmail: string, now = new Date()): Promise<TasksDto> {
  const today = localDateString(now, location.timeZone);
  const baseUrl = getSalesforceBaseUrl();

  const records = isLiveMode()
    ? await cached(`tasks:${ownerEmail}:${today}`, LIVE_CACHE_MS, () => fetchTasks(ownerEmail, today))
    : mockTasks(ownerEmail, today);
  return { lastUpdated: now.toISOString(), tasks: buildTasks(records, today, baseUrl) };
}
