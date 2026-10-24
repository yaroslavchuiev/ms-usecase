import type { EntryDto, FreeSpotsDto, IncidentDto, LocationDto, MeetingDto, ReceptionDto } from "@/lib/dto";
import type { SfBooking, SfCase, SfCheckIn, SfLocation, SfSpace } from "./types";

/** "Kraków" -> "krakow", "Tel Aviv" -> "tel-aviv". Slugs are what group names refer to. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function mapLocation(record: SfLocation): LocationDto {
  return { id: record.Id, slug: slugify(record.Name), name: record.Name, timeZone: record.Time_Zone__c };
}

// --- Reception ---------------------------------------------------------------------------------
// Pure functions: raw Salesforce records in, clean DTO out. Mock and live mode both feed them,
// which is what guarantees identical response shapes.

/** What the Reception view needs from Salesforce. Fetched per location (see lib/data/reception.ts). */
export interface RawReception {
  openCases: SfCase[];
  spaces: SfSpace[];
  checkInsToday: SfCheckIn[];
  bookingsToday: SfBooking[];
}

const iso = (sfDateTime: string) => new Date(sfDateTime).toISOString(); // "…+0000" -> "…Z"
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 } as const;

export function buildReception(location: LocationDto, raw: RawReception, now: Date): ReceptionDto {
  const incidents: IncidentDto[] = raw.openCases
    .map((c) => ({
      id: c.Id,
      number: c.CaseNumber,
      subject: c.Subject,
      category: c.Category__c,
      priority: c.Priority,
      status: c.Status,
      createdAt: iso(c.CreatedDate),
      ageMinutes: Math.max(0, Math.floor((now.getTime() - Date.parse(c.CreatedDate)) / 60_000)),
    }))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.ageMinutes - a.ageMinutes);

  const freeSpots: FreeSpotsDto[] = (["Desk", "Office", "Room"] as const).map((type) => {
    const ofType = raw.spaces.filter((s) => s.Type__c === type);
    return { type, available: ofType.filter((s) => s.Status__c === "Available").length, total: ofType.length };
  });

  const entered: EntryDto[] = raw.checkInsToday
    .map((c) => ({
      id: c.Id,
      name: c.Contact__r?.Name ?? c.Guest_Name__c ?? "Unknown",
      company: c.Account__r.Name,
      kind: c.Type__c === "Member" ? ("member" as const) : ("guest" as const),
      enteredAt: iso(c.Check_In_Time__c),
      leftAt: c.Check_Out_Time__c ? iso(c.Check_Out_Time__c) : null,
      status: c.Check_Out_Time__c ? ("left" as const) : ("in-building" as const),
    }))
    .sort((a, b) => b.enteredAt.localeCompare(a.enteredAt));

  const meetings: MeetingDto[] = raw.bookingsToday
    .map((b) => ({
      id: b.Id,
      room: b.Space__r.Name,
      start: iso(b.Start__c),
      end: iso(b.End__c),
      company: b.Account__r.Name,
      guests: b.Guest_Count__c,
    }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.room.localeCompare(b.room));

  return { location, lastUpdated: now.toISOString(), incidents, freeSpots, entered, meetings };
}
