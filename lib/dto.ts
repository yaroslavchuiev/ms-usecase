// Clean response types shared by the API routes and the UI. Mock and live mode both produce
// exactly these shapes; nothing here knows about Salesforce field names.
// Timestamps are ISO-8601 UTC strings; the UI formats them with `location.timeZone`.

export type DashboardRole = "reception" | "stats";

export interface LocationDto {
  id: string;
  slug: string; // used in groups and URLs, e.g. "warsaw"
  name: string;
  timeZone: string;
}

// --- /api/me ---------------------------------------------------------------

export interface MeDto {
  user: { id: string; name: string; email: string };
  /** Only the locations this user may see, with the roles they hold there. */
  locations: (LocationDto & { roles: DashboardRole[] })[];
}

// --- /api/reception --------------------------------------------------------

export interface IncidentDto {
  id: string;
  number: string;
  subject: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  createdAt: string;
  ageMinutes: number;
  url: string | null; // opens the case in Salesforce (null if no org URL is configured)
}

export interface FreeSpotsDto {
  type: "Desk" | "Office" | "Room";
  available: number;
  total: number;
}

export interface EntryDto {
  id: string;
  name: string;
  company: string;
  kind: "member" | "guest";
  enteredAt: string;
}

/** A shortcut shown on Reception. `url` may be https:// or tel:. */
export interface UsefulLinkDto {
  label: string;
  description: string;
  url: string;
}

/** One of the signed-in user's open Salesforce tasks that is due today or overdue. */
export interface TaskDto {
  id: string;
  subject: string;
  related: string | null; // name of the related record, e.g. the company
  dueDate: string; // YYYY-MM-DD, local
  overdue: boolean;
  priority: "High" | "Normal" | "Low";
  status: string;
  url: string | null; // opens the task in Salesforce
}

export interface TasksDto {
  lastUpdated: string;
  tasks: TaskDto[]; // overdue first (oldest due date first), then today
}

export interface CompanyDto {
  id: string;
  name: string;
}

/** A parcel waiting at reception. */
export interface DeliveryDto {
  id: string;
  company: string;
  carrier: string | null;
  receivedAt: string;
}

/** Body of POST /api/deliveries?location=... */
export interface NewDeliveryBody {
  companyId: string;
  carrier?: string;
}

/** One line of today's agenda. Tours are sales visits by prospects; room/event are bookings by members. */
export interface AgendaItemDto {
  id: string;
  kind: "tour" | "room" | "event";
  title: string; // room or event space name; "Sales tour" for tours
  company: string; // booking company, or the prospect's company for tours
  host: string | null; // Mindspace sales host (tours only)
  start: string;
  end: string;
  guests: number;
}

export interface ReceptionDto {
  location: LocationDto;
  lastUpdated: string;
  incidents: IncidentDto[]; // open only, highest priority first
  freeSpots: FreeSpotsDto[];
  entered: EntryDto[]; // today in the location's time zone, latest first
  agenda: AgendaItemDto[]; // tours and bookings today, chronological
  deliveries: DeliveryDto[]; // waiting to be collected, oldest first
  links: UsefulLinkDto[];
  companies: CompanyDto[]; // member companies with an active contract here: recipients for a new delivery
}

// --- /api/stats ------------------------------------------------------------

export type StatsRange = "7d" | "30d" | "90d";

export interface OccupancyPointDto {
  date: string; // YYYY-MM-DD, local
  occupied: number;
  total: number;
  percent: number;
}

export interface RoomUtilisationDto {
  room: string;
  bookedHours: number;
  availableHours: number;
  percent: number;
}

export interface StatsDto {
  location: LocationDto;
  range: StatsRange;
  lastUpdated: string;
  occupancy: {
    currentPercent: number;
    averagePercent: number;
    trend: OccupancyPointDto[];
  };
  checkIns: {
    total: number;
    averagePerDay: number;
    daily: { date: string; count: number }[];
    /** Average entries per hour of the local day (0-23): shows peak hours. */
    byHour: { hour: number; average: number }[];
  };
  rooms: {
    utilisationPercent: number;
    bookedHours: number;
    availableHours: number;
    mostUsed: RoomUtilisationDto[];
    leastUsed: RoomUtilisationDto[];
  };
  incidents: {
    total: number;
    byCategory: { category: string; count: number }[];
    averageResolutionHours: number;
    slaBreaches: number;
  };
  members: {
    activeCompanies: number;
    moveIns: number;
    moveOuts: number;
    endingSoon: { company: string; endDate: string }[]; // contracts ending in next 90 days
  };
}

/** Body of every non-2xx API response. */
export interface ApiError {
  error: string;
}
