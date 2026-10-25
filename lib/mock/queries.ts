import { UPCOMING_DAYS, type RawReception, type RawStats, type StatsPeriod } from "@/lib/salesforce/mappers";
import type { SfContract } from "@/lib/salesforce/types";
import { mockWaitingDeliveries } from "./deliveries";
import { getMockDataset } from "./index";

// Mock equivalents of the SOQL queries in lib/salesforce/queries.ts (step 7): the same
// WHERE conditions, applied to the fixtures with plain array filters.

/** Contracts valid today: the member companies that can receive deliveries here. */
export function mockActiveContracts(locationId: string, today: string): SfContract[] {
  return getMockDataset().contracts.records.filter((c) => c.Location__c === locationId && c.StartDate <= today && c.EndDate >= today);
}

export function mockReceptionRecords(locationId: string, dayStart: Date, dayEnd: Date, today: string): RawReception {
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
    // WHERE Location__c = :id AND Status__c IN ('Scheduled', 'Completed') AND Start__c >= :dayStart AND Start__c < :dayEnd
    toursToday: inLocation(ds.tours.records).filter((t) => ["Scheduled", "Completed"].includes(t.Status__c) && inDay(t.Start__c)),
    // WHERE Location__c = :id AND Status__c = 'Waiting' ORDER BY Received_Time__c
    waitingDeliveries: mockWaitingDeliveries(locationId),
    activeContracts: mockActiveContracts(locationId, today),
  };
}

export function mockStatsRecords(locationId: string, { from, to, fromDate, now }: StatsPeriod): RawStats {
  const ds = getMockDataset();
  const inLocation = <T extends { Location__c: string }>(rows: T[]) => rows.filter((r) => r.Location__c === locationId);
  const between = (dateTime: string) => Date.parse(dateTime) >= from.getTime() && Date.parse(dateTime) < to.getTime();

  return {
    // WHERE Location__c = :id AND Date__c >= :fromDate
    snapshots: inLocation(ds.snapshots.records).filter((s) => s.Date__c >= fromDate),
    // WHERE Location__c = :id AND Check_In_Time__c >= :from AND Check_In_Time__c < :to
    checkIns: inLocation(ds.checkIns.records).filter((c) => between(c.Check_In_Time__c)),
    // WHERE Location__c = :id AND Type__c = 'Room'
    rooms: inLocation(ds.spaces.records).filter((s) => s.Type__c === "Room"),
    // WHERE Location__c = :id AND Start__c >= :from AND Start__c < :to
    bookings: inLocation(ds.bookings.records).filter((b) => between(b.Start__c)),
    // WHERE RecordType.Name = 'Building Incident' AND Location__c = :id AND CreatedDate >= :from
    casesCreated: inLocation(ds.cases.records).filter((c) => between(c.CreatedDate)),
    // WHERE Location__c = :id AND EndDate >= :fromDate
    contracts: inLocation(ds.contracts.records).filter((c) => c.EndDate >= fromDate),
    // WHERE Location__c = :id AND Status__c IN ('Completed', 'No Show', 'Cancelled') AND Start__c >= :from AND Start__c < :to
    toursHeld: inLocation(ds.tours.records).filter((t) => ["Completed", "No Show", "Cancelled"].includes(t.Status__c) && between(t.Start__c)),
    // WHERE Location__c = :id AND Status__c = 'Scheduled' AND Start__c >= :now AND Start__c < :now + 7 days
    toursUpcoming: inLocation(ds.tours.records).filter(
      (t) => t.Status__c === "Scheduled" && Date.parse(t.Start__c) >= now.getTime() && Date.parse(t.Start__c) < now.getTime() + UPCOMING_DAYS * 86_400_000,
    ),
  };
}
