import "server-only";
import { query } from "./client";
import type { RawReception, RawStats } from "./mappers";
import type { SfBooking, SfCase, SfCheckIn, SfContract, SfLocation, SfOccupancySnapshot, SfSpace } from "./types";

// The SOQL behind each dashboard. lib/mock/queries.ts mirrors these WHERE clauses, so mock
// and live return the same records. Field lists are exactly what the mappers read.

/** SOQL literals are not parameterised: only ever interpolate values produced by these helpers. */
const id = (value: string) => {
  if (!/^[a-zA-Z0-9]{15,18}$/.test(value)) throw new Error("Invalid Salesforce Id");
  return `'${value}'`;
};
const dateTime = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z"); // 2026-10-24T08:00:00Z, unquoted
const BUILDING_INCIDENT = "RecordType.Name = 'Building Incident'";

const CASE_FIELDS =
  "Id, CaseNumber, Subject, Category__c, Priority, Status, IsClosed, CreatedDate, ClosedDate, SLA_Breached__c, Location__c, RecordType.Name";
const SPACE_FIELDS = "Id, Name, Type__c, Capacity__c, Status__c, Location__c";
const CHECK_IN_FIELDS =
  "Id, Type__c, Contact__c, Contact__r.Name, Guest_Name__c, Account__c, Account__r.Name, Check_In_Time__c, Location__c";
const BOOKING_FIELDS = "Id, Name, Space__c, Space__r.Name, Account__c, Account__r.Name, Start__c, End__c, Guest_Count__c, Location__c";

export function fetchLocations() {
  return query<SfLocation>("SELECT Id, Name, Capacity__c, Time_Zone__c FROM Location__c ORDER BY Name");
}

export async function fetchReceptionRecords(locationId: string, dayStart: Date, dayEnd: Date): Promise<RawReception> {
  const loc = id(locationId);
  const [openCases, spaces, checkInsToday, bookingsToday] = await Promise.all([
    query<SfCase>(`SELECT ${CASE_FIELDS} FROM Case WHERE ${BUILDING_INCIDENT} AND IsClosed = false AND Location__c = ${loc}`),
    query<SfSpace>(`SELECT ${SPACE_FIELDS} FROM Space__c WHERE Location__c = ${loc}`),
    query<SfCheckIn>(
      `SELECT ${CHECK_IN_FIELDS} FROM Check_In__c WHERE Location__c = ${loc} AND Check_In_Time__c >= ${dateTime(dayStart)} AND Check_In_Time__c < ${dateTime(dayEnd)}`,
    ),
    query<SfBooking>(
      `SELECT ${BOOKING_FIELDS} FROM Booking__c WHERE Location__c = ${loc} AND Start__c >= ${dateTime(dayStart)} AND Start__c < ${dateTime(dayEnd)}`,
    ),
  ]);
  return { openCases, spaces, checkInsToday, bookingsToday };
}

export async function fetchStatsRecords(locationId: string, from: Date, to: Date, fromDate: string): Promise<RawStats> {
  const loc = id(locationId);
  const period = (field: string) => `${field} >= ${dateTime(from)} AND ${field} < ${dateTime(to)}`;
  const [snapshots, checkIns, rooms, bookings, casesCreated, contracts] = await Promise.all([
    query<SfOccupancySnapshot>(
      `SELECT Id, Date__c, Occupied__c, Total__c, Location__c FROM Occupancy_Snapshot__c WHERE Location__c = ${loc} AND Date__c >= ${fromDate} ORDER BY Date__c`,
    ),
    // Realistic note: for 90 days this is thousands of rows. A production version would use
    // GROUP BY (COUNT per day/hour) or a reporting snapshot instead of pulling every record.
    query<SfCheckIn>(`SELECT ${CHECK_IN_FIELDS} FROM Check_In__c WHERE Location__c = ${loc} AND ${period("Check_In_Time__c")}`),
    query<SfSpace>(`SELECT ${SPACE_FIELDS} FROM Space__c WHERE Location__c = ${loc} AND Type__c = 'Room'`),
    query<SfBooking>(`SELECT ${BOOKING_FIELDS} FROM Booking__c WHERE Location__c = ${loc} AND ${period("Start__c")}`),
    query<SfCase>(`SELECT ${CASE_FIELDS} FROM Case WHERE ${BUILDING_INCIDENT} AND Location__c = ${loc} AND ${period("CreatedDate")}`),
    query<SfContract>(
      `SELECT Id, ContractNumber, AccountId, Account.Name, Status, StartDate, EndDate, Location__c FROM Contract WHERE Location__c = ${loc} AND EndDate >= ${fromDate}`,
    ),
  ]);
  return { snapshots, checkIns, rooms, bookings, casesCreated, contracts };
}
