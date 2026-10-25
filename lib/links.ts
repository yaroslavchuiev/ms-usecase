import "server-only";
import type { LocationDto, UsefulLinkDto } from "@/lib/dto";
import { getSalesforceBaseUrl } from "@/lib/salesforce/config";

// "Useful links" for the front desk. Static configuration, kept in code for now: a real version
// would store these per building in Salesforce (e.g. fields on Location__c) or Custom Metadata so
// the location team can edit them. The Salesforce links are built from SALESFORCE_INSTANCE_URL.

const mapsSearch = (query: string) => `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

// Per building: public transport site and emergency number (they differ by city and country).
const LOCAL: Record<string, { transport: UsefulLinkDto; emergency: UsefulLinkDto }> = {
  warsaw: {
    transport: { label: "Public transport", description: "Warsaw timetables and journey planner", url: "https://www.ztm.waw.pl" },
    emergency: { label: "Emergency services", description: "Call 112", url: "tel:112" },
  },
  krakow: {
    transport: { label: "Public transport", description: "Kraków timetables and journey planner", url: "https://www.mpk.krakow.pl" },
    emergency: { label: "Emergency services", description: "Call 112", url: "tel:112" },
  },
  "tel-aviv": {
    transport: { label: "Public transport", description: "Journey planner for visitors", url: "https://moovitapp.com/tel_aviv-1/poi/en" },
    emergency: { label: "Emergency services", description: "Call 100 (police)", url: "tel:100" },
  },
};

export function getUsefulLinks(location: LocationDto): UsefulLinkDto[] {
  const local = LOCAL[location.slug];
  const salesforce = getSalesforceBaseUrl();

  return [
    { label: "Parking", description: "Car parks near the building", url: mapsSearch(`parking near Mindspace ${location.name}`) },
    ...(local ? [local.transport] : []),
    { label: "Taxi", description: "Order a ride for a guest (Uber)", url: "https://www.uber.com/go/home" },
    { label: "Coffee & lunch nearby", description: "Places to recommend to visitors", url: mapsSearch(`coffee and lunch near Mindspace ${location.name}`) },
    { label: "Salesforce", description: "Open Salesforce", url: `${salesforce}/lightning/page/home` },
    { label: "New case", description: "Report an issue or request in Salesforce", url: `${salesforce}/lightning/o/Case/new` }
  ];
}
