import "server-only";
import type { LocationDto } from "@/lib/dto";
import { getMockDataset } from "@/lib/mock";
import { mapLocation } from "@/lib/salesforce/mappers";

// Single entry point for "which locations exist". Step 7 adds the DATA_MODE switch here:
// mock -> fixtures, live -> SOQL against Location__c. Callers only ever see LocationDto.
export async function getLocations(): Promise<LocationDto[]> {
  return getMockDataset().locations.records.map(mapLocation);
}
