import type {
  EntryDto,
  FreeSpotsDto,
  IncidentDto,
  LocationDto,
  AgendaItemDto,
  CompanyDto,
  TaskDto,
  UsefulLinkDto,
  DeliveryDto,
  ReceptionDto,
  RoomUtilisationDto,
  StatsDto,
  StatsRange,
} from "@/lib/dto";
import { addLocalDays, localDateString, localHour, startOfLocalDay } from "@/lib/time";
import type { SfBooking, SfCase, SfCheckIn, SfContract, SfDelivery, SfLocation, SfOccupancySnapshot, SfSpace, SfTask, SfTour } from "./types";

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
  toursToday: SfTour[];
  waitingDeliveries: SfDelivery[];
  activeContracts: SfContract[];
}

export const mapDelivery = (d: SfDelivery): DeliveryDto => ({
  id: d.Id,
  company: d.Account__r.Name,
  carrier: d.Carrier__c,
  receivedAt: new Date(d.Received_Time__c).toISOString(),
});

/** One entry per company (a company could hold several contracts), sorted by name. */
export function mapCompanies(contracts: SfContract[]): CompanyDto[] {
  const byId = new Map(contracts.map((c) => [c.AccountId, c.Account.Name]));
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

const iso = (sfDateTime: string) => new Date(sfDateTime).toISOString(); // "…+0000" -> "…Z"
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 } as const;

/** Things that come from configuration rather than from Salesforce records. */
export interface ReceptionExtras {
  salesforceBaseUrl: string | null; // for "open in Salesforce" links on cases
  links: UsefulLinkDto[];
}

export function buildReception(location: LocationDto, raw: RawReception, now: Date, extras: ReceptionExtras): ReceptionDto {
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
      url: extras.salesforceBaseUrl && `${extras.salesforceBaseUrl}/lightning/r/Case/${c.Id}/view`,
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
    }))
    .sort((a, b) => b.enteredAt.localeCompare(a.enteredAt));

  const bookings: AgendaItemDto[] = raw.bookingsToday.map((b) => ({
    id: b.Id,
    kind: b.Space__r.Type__c === "Event Space" ? ("event" as const) : ("room" as const),
    title: b.Space__r.Name,
    company: b.Account__r.Name,
    host: null,
    start: iso(b.Start__c),
    end: iso(b.End__c),
    guests: b.Guest_Count__c,
  }));
  const tours: AgendaItemDto[] = raw.toursToday.map((t) => ({
    id: t.Id,
    kind: "tour" as const,
    title: "Sales tour",
    company: t.Prospect_Company__c,
    host: t.Host__r.Name,
    start: iso(t.Start__c),
    end: iso(t.End__c),
    guests: t.Guest_Count__c,
  }));
  const agenda = [...bookings, ...tours].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));

  return {
    location,
    lastUpdated: now.toISOString(),
    incidents,
    freeSpots,
    entered,
    agenda,
    deliveries: raw.waitingDeliveries.map(mapDelivery).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)),
    links: extras.links,
    companies: mapCompanies(raw.activeContracts),
  };
}

// --- Tasks -------------------------------------------------------------------------------------

const TASK_PRIORITY_ORDER = { High: 0, Normal: 1, Low: 2 } as const;

/** `today` is the location's local date (YYYY-MM-DD). Open tasks without a due date never reach this far. */
export function buildTasks(records: SfTask[], today: string, salesforceBaseUrl: string | null): TaskDto[] {
  return records
    .filter((t) => !t.IsClosed && t.ActivityDate && t.ActivityDate <= today)
    .map((t) => ({
      id: t.Id,
      subject: t.Subject,
      related: t.What?.Name ?? null,
      dueDate: t.ActivityDate!,
      overdue: t.ActivityDate! < today,
      priority: t.Priority,
      status: t.Status,
      url: salesforceBaseUrl && `${salesforceBaseUrl}/lightning/r/Task/${t.Id}/view`,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || TASK_PRIORITY_ORDER[a.priority] - TASK_PRIORITY_ORDER[b.priority]);
}

// --- Stats -------------------------------------------------------------------------------------

export const RANGE_DAYS: Record<StatsRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

// Meeting rooms are bookable 08:00-20:00, the denominator of "utilisation".
const BOOKABLE_HOURS_PER_DAY = 12;

/** What the Stats view needs from Salesforce, all limited to the selected period. */
/** The window a Stats request covers. `from`..`to` are whole local days; `now` splits past from upcoming. */
export interface StatsPeriod {
  from: Date;
  to: Date;
  fromDate: string; // local date of `from`, YYYY-MM-DD
  now: Date;
}

export const UPCOMING_DAYS = 7;

export interface RawStats {
  snapshots: SfOccupancySnapshot[];
  checkIns: SfCheckIn[];
  rooms: SfSpace[];
  bookings: SfBooking[];
  casesCreated: SfCase[];
  contracts: SfContract[];
  /** Tours in the period that took place or were cancelled (not the ones still scheduled). */
  toursHeld: SfTour[];
  /** Tours still scheduled for the next UPCOMING_DAYS days. */
  toursUpcoming: SfTour[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

function buildSales(tours: SfTour[], upcoming: number): StatsDto["sales"] {
  const count = (status: SfTour["Status__c"]) => tours.filter((t) => t.Status__c === status).length;
  const completed = tours.filter((t) => t.Status__c === "Completed");
  const signed = completed.filter((t) => t.Signed_Date__c);
  const noShows = count("No Show");

  const days = signed.map((t) => (Date.parse(t.Signed_Date__c!) - Date.parse(t.Start__c.slice(0, 10))) / 86_400_000);
  const hosts = new Map<string, { completed: number; signed: number }>();
  for (const t of completed) {
    const h = hosts.get(t.Host__r.Name) ?? { completed: 0, signed: 0 };
    h.completed++;
    if (t.Signed_Date__c) h.signed++;
    hosts.set(t.Host__r.Name, h);
  }

  return {
    booked: tours.length,
    cancelled: count("Cancelled"),
    noShows,
    completed: completed.length,
    signed: signed.length,
    showRatePercent: percent(completed.length, completed.length + noShows),
    conversionPercent: percent(signed.length, completed.length),
    averageDaysToSign: days.length ? round1(Math.max(0, days.reduce((a, b) => a + b, 0) / days.length)) : null,
    upcoming,
    byHost: [...hosts]
      .map(([host, h]) => ({ host, ...h, conversionPercent: percent(h.signed, h.completed) }))
      .sort((a, b) => b.signed - a.signed || b.completed - a.completed),
  };
}

export function buildStats(location: LocationDto, range: StatsRange, raw: RawStats, now: Date): StatsDto {
  const tz = location.timeZone;
  const days = RANGE_DAYS[range];
  const todayStart = startOfLocalDay(now, tz);
  const today = localDateString(todayStart, tz);
  const dates = Array.from({ length: days }, (_, i) => localDateString(addLocalDays(todayStart, i - days + 1, tz), tz));

  // Occupancy: one snapshot per day.
  const trend = raw.snapshots
    .map((s) => ({ date: s.Date__c, occupied: s.Occupied__c, total: s.Total__c, percent: percent(s.Occupied__c, s.Total__c) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const averagePercent = trend.length ? Math.round(trend.reduce((sum, p) => sum + p.percent, 0) / trend.length) : 0;

  // Check-ins: per local day and per local hour of day (to see peak hours).
  const perDay = new Map(dates.map((d) => [d, 0]));
  const perHour = new Array<number>(24).fill(0);
  for (const c of raw.checkIns) {
    const at = new Date(c.Check_In_Time__c);
    const date = localDateString(at, tz);
    perDay.set(date, (perDay.get(date) ?? 0) + 1);
    perHour[localHour(at, tz)]++;
  }

  // Rooms: booked hours vs bookable hours, per room and overall.
  const availableHours = days * BOOKABLE_HOURS_PER_DAY;
  const bookedByRoom = new Map(raw.rooms.map((r) => [r.Id, 0]));
  for (const b of raw.bookings) {
    const hours = (Date.parse(b.End__c) - Date.parse(b.Start__c)) / 3_600_000;
    bookedByRoom.set(b.Space__c, (bookedByRoom.get(b.Space__c) ?? 0) + hours);
  }
  const perRoom: RoomUtilisationDto[] = raw.rooms
    .map((r) => {
      const booked = bookedByRoom.get(r.Id) ?? 0;
      return { room: r.Name, bookedHours: Math.round(booked), availableHours, percent: percent(booked, availableHours) };
    })
    .sort((a, b) => b.percent - a.percent);
  const bookedTotal = perRoom.reduce((sum, r) => sum + r.bookedHours, 0);
  const availableTotal = availableHours * raw.rooms.length;

  // Incidents opened in the period.
  const byCategory = new Map<string, number>();
  for (const c of raw.casesCreated) byCategory.set(c.Category__c, (byCategory.get(c.Category__c) ?? 0) + 1);
  const resolved = raw.casesCreated.filter((c) => c.ClosedDate);
  const resolutionHours = resolved.reduce((sum, c) => sum + (Date.parse(c.ClosedDate!) - Date.parse(c.CreatedDate)), 0) / 3_600_000;

  // Members: contract start/end dates are plain YYYY-MM-DD strings, so they compare as text.
  const periodStart = dates[0];
  const in90Days = localDateString(addLocalDays(todayStart, 90, tz), tz);
  const active = raw.contracts.filter((c) => c.StartDate <= today && c.EndDate >= today);

  return {
    location,
    range,
    lastUpdated: now.toISOString(),
    occupancy: { currentPercent: trend.at(-1)?.percent ?? 0, averagePercent, trend },
    checkIns: {
      total: raw.checkIns.length,
      averagePerDay: round1(raw.checkIns.length / days),
      daily: dates.map((date) => ({ date, count: perDay.get(date) ?? 0 })),
      byHour: perHour.map((count, hour) => ({ hour, average: round1(count / days) })),
    },
    rooms: {
      utilisationPercent: percent(bookedTotal, availableTotal),
      bookedHours: bookedTotal,
      availableHours: availableTotal,
      mostUsed: perRoom.slice(0, 3),
      leastUsed: perRoom.slice(-3).reverse(),
    },
    incidents: {
      total: raw.casesCreated.length,
      byCategory: [...byCategory].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      averageResolutionHours: resolved.length ? round1(resolutionHours / resolved.length) : 0,
      slaBreaches: raw.casesCreated.filter((c) => c.SLA_Breached__c).length,
    },
    sales: buildSales(raw.toursHeld, raw.toursUpcoming.length),
    members: {
      activeCompanies: new Set(active.map((c) => c.AccountId)).size,
      moveIns: raw.contracts.filter((c) => c.StartDate >= periodStart && c.StartDate <= today).length,
      moveOuts: raw.contracts.filter((c) => c.EndDate >= periodStart && c.EndDate < today).length,
      endingSoon: raw.contracts
        .filter((c) => c.EndDate >= today && c.EndDate <= in90Days)
        .sort((a, b) => a.EndDate.localeCompare(b.EndDate))
        .map((c) => ({ company: c.Account.Name, endDate: c.EndDate })),
    },
  };
}
