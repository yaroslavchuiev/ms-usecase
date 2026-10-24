// Raw Salesforce shapes, exactly as the REST API / SOQL returns them (API names, __c / __r).
// These types are server-side only: mappers turn them into the clean DTOs in lib/dto.ts,
// and the UI never imports this file.

export interface SfAttributes {
  type: string;
  url: string;
}

/** Every record carries `attributes` and an 18-character `Id`. */
export interface SfRecord {
  attributes: SfAttributes;
  Id: string;
}

/** Relationship subquery result (`Account__r`, `Contact__r`, ...): a partial record without Id. */
export type SfRef<Fields> = { attributes: SfAttributes } & Fields;

/** Response of `GET /services/data/vXX.X/query?q=...` */
export interface SfQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  /** Present when `done` is false: URL of the next page (2000 records per page by default). */
  nextRecordsUrl?: string;
}

// Datetimes look like "2026-10-24T14:03:21.000+0000"; Date fields like "2026-10-24".

export interface SfLocation extends SfRecord {
  Name: string;
  Capacity__c: number;
  Time_Zone__c: string; // IANA name, e.g. "Europe/Warsaw"
}

/** Case with record type "Building Incident". */
export interface SfCase extends SfRecord {
  CaseNumber: string;
  Subject: string;
  Category__c: string;
  Priority: "High" | "Medium" | "Low";
  Status: "New" | "Working" | "Escalated" | "Closed";
  IsClosed: boolean;
  CreatedDate: string;
  ClosedDate: string | null;
  SLA_Breached__c: boolean;
  Location__c: string;
  RecordType: SfRef<{ Name: string }>;
}

export type SfSpaceType = "Desk" | "Office" | "Room" | "Event Space";

export interface SfSpace extends SfRecord {
  Name: string;
  Type__c: SfSpaceType;
  Capacity__c: number;
  Status__c: "Available" | "Occupied" | "Reserved" | "Out of Service";
  Location__c: string;
}

/** One entry to the building. Members have Contact__c; guests have Guest_Name__c. */
export interface SfCheckIn extends SfRecord {
  Type__c: "Member" | "Guest";
  Contact__c: string | null;
  Contact__r: SfRef<{ Name: string }> | null;
  Guest_Name__c: string | null;
  Account__c: string; // member's company, or the company a guest is visiting
  Account__r: SfRef<{ Name: string }>;
  Check_In_Time__c: string;
  Location__c: string;
}

/** Meeting-room booking. */
export interface SfBooking extends SfRecord {
  Name: string; // auto-number, e.g. "BK-0001234"
  Space__c: string;
  Space__r: SfRef<{ Name: string; Type__c: SfSpaceType }>;
  Account__c: string;
  Account__r: SfRef<{ Name: string }>;
  Start__c: string;
  End__c: string;
  Guest_Count__c: number;
  Location__c: string;
}

/** A parcel received at reception for a member company, waiting to be collected. */
export interface SfDelivery extends SfRecord {
  Name: string; // auto-number, e.g. "DL-0000123"
  Account__c: string;
  Account__r: SfRef<{ Name: string }>;
  Carrier__c: string | null;
  Received_Time__c: string;
  Collected_Time__c: string | null;
  Status__c: "Waiting" | "Collected";
  Location__c: string;
}

/** Sales tour: Mindspace showing a building to a prospective client. Not a room booking. */
export interface SfTour extends SfRecord {
  Name: string; // auto-number, e.g. "TR-0000123"
  Start__c: string;
  End__c: string;
  Prospect_Company__c: string;
  Guest_Count__c: number;
  Host__c: string; // the sales person (User)
  Host__r: SfRef<{ Name: string }>;
  Status__c: "Scheduled" | "Completed" | "Cancelled";
  Location__c: string;
}

/** Daily snapshot (scheduled Flow). Salesforce keeps no history of current values on its own. */
export interface SfOccupancySnapshot extends SfRecord {
  Date__c: string;
  Occupied__c: number;
  Total__c: number;
  Location__c: string;
}

export interface SfAccount extends SfRecord {
  Name: string;
}

export interface SfContract extends SfRecord {
  ContractNumber: string;
  AccountId: string;
  Account: SfRef<{ Name: string }>; // standard lookups use the plain name, not __r
  Status: "Activated" | "Expired";
  StartDate: string;
  EndDate: string;
  Location__c: string;
}
