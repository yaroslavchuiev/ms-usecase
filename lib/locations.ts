import "server-only";
import { cached } from "@/lib/cache";
import { isLiveMode } from "@/lib/data/mode";
import type { LocationDto } from "@/lib/dto";
import { getMockDataset } from "@/lib/mock";
import { mapLocation } from "@/lib/salesforce/mappers";
import { fetchLocations } from "@/lib/salesforce/queries";

// Single entry point for "which locations exist". Callers only ever see LocationDto.
export async function getLocations(): Promise<LocationDto[]> {
  if (!isLiveMode()) return getMockDataset().locations.records.map(mapLocation);
  // Buildings rarely change: 5 minutes is plenty.
  return cached("locations", 5 * 60_000, async () => (await fetchLocations()).map(mapLocation));
}
