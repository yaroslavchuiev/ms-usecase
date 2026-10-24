import type { RawReception } from "@/lib/salesforce/mappers";
import { getMockDataset } from "./index";

// Mock equivalents of the SOQL queries in lib/salesforce/queries.ts (step 7): the same
// WHERE conditions, applied to the fixtures with plain array filters.

export function mockReceptionRecords(locationId: string, dayStart: Date, dayEnd: Date): RawReception {
  const ds = getMockDataset();
  const inLocation = <T extends { Location__c: string }>(rows: T[]) => rows.filter((r) => r.Location__c === locationId);
  const inDay = (dateTime: string) => Date.parse(dateTime) >= dayStart.getTime() && Date.parse(dateTime) < dayEnd.getTime();

  return {
    // WHERE RecordType.Name = 'Building Incident' AND IsClosed = false AND Location__c = :id
    openCases: inLocation(ds.cases.records).filter((c) => !c.IsClosed),
    // WHERE Location__c = :id
    spaces: inLocation(ds.spaces.records),
    // WHERE Location__c = :id AND Check_In_Time__c >= :dayStart AND Check_In_Time__c < :dayEnd
    checkInsToday: inLocation(ds.checkIns.records).filter((c) => inDay(c.Check_In_Time__c)),
    // WHERE Location__c = :id AND Start__c >= :dayStart AND Start__c < :dayEnd
    bookingsToday: inLocation(ds.bookings.records).filter((b) => inDay(b.Start__c)),
  };
}
