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
  leftAt: string | null;
  status: "in-building" | "left";
}

export interface MeetingDto {
  id: string;
  room: string;
  start: string;
  end: string;
  company: string;
  guests: number;
}

export interface ReceptionDto {
  location: LocationDto;
  lastUpdated: string;
  incidents: IncidentDto[]; // open only, highest priority first
  freeSpots: FreeSpotsDto[];
  entered: EntryDto[]; // today in the location's time zone, latest first
  meetings: MeetingDto[]; // today, chronological
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
