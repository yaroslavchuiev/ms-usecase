// Fictional names for fixtures.

export const FIRST_NAMES = [
  "Anna", "Piotr", "Katarzyna", "Michał", "Agnieszka", "Tomasz", "Magdalena", "Jakub", "Ewa", "Paweł",
  "Joanna", "Marcin", "Zofia", "Krzysztof", "Aleksandra", "Adam", "Maria", "Łukasz", "Natalia", "Bartosz",
  "Noa", "Daniel", "Maya", "Eitan", "Shira", "Yonatan", "Tal", "Omer", "Lior", "Avigail",
  "Sarah", "James", "Elena", "Lucas", "Sofia", "Oliver", "Clara", "Mateo",
];

export const LAST_NAMES = [
  "Kowalski", "Nowak", "Wiśniewska", "Wójcik", "Kamiński", "Lewandowska", "Zieliński", "Szymańska", "Woźniak", "Dąbrowski",
  "Kozłowska", "Jankowski", "Mazur", "Krawczyk", "Piotrowska", "Grabowski", "Pawlak", "Michalski", "Król", "Wieczorek",
  "Cohen", "Levi", "Mizrahi", "Peretz", "Biton", "Avraham", "Friedman", "Katz", "Shapiro", "Dahan",
  "Miller", "Garcia", "Rossi", "Dubois", "Andersson", "Novak", "Silva", "Meyer",
];

export const COMPANY_NAMES = [
  "Nordlight Software", "Bluebird Analytics", "Kraftwerk Labs", "Vistula Ventures", "Orbit Payments",
  "Greenfield Logistics", "Pixelforge Studio", "Aurum Capital Partners", "Lumen Health", "Tandem Robotics",
  "Redwood Legal", "Cobalt Cloud", "Fjord Design", "Meridian Consulting", "Quanta Bio",
  "Harbor Insurance Tech", "Sprout Education", "Zenith Mobility", "Atlas Freight Tech", "Mosaic Media",
  "Pioneer Energy Systems", "Ironclad Security", "Birch & Co Architects", "Helix Genomics", "Skyline Travel",
  "Copperleaf Finance", "Nimbus Data", "Oakbridge HR", "Polaris Games", "Summit Retail Tech",
  "Tidal Marketing", "Violet Fashion Lab", "Waypoint Mapping", "Yellowpine Foods", "Zephyr Wind",
  "Amberwood Property", "Brightpath Coaching", "Crestline Ventures", "Driftwood Apps", "Evergreen Carbon",
  "Foxglove Pharma", "Gridlock Traffic AI", "Horizon Telecom", "Indigo Fintech", "Juniper Cyber",
  "Keystone Accounting", "Lighthouse Maritime", "Maple Mobility", "Northwind Trading", "Opal Interiors",
];

export const INCIDENTS: Record<string, string[]> = {
  Cleaning: ["Spill in the kitchen area", "Restrooms need restocking", "Bins overflowing on the lounge floor"],
  Maintenance: ["Broken chair in the open space", "Door closer loose at the main entrance", "Flickering ceiling light"],
  "IT & Network": ["Wi-Fi dropping in the east wing", "Meeting room screen not turning on", "Printer offline"],
  "HVAC & Climate": ["Too warm in the open space", "Air conditioning leaking in a meeting room", "Heating not working in an office"],
  "Access Control": ["Create access card for {name}", "Member badge not opening the door", "Turnstile stuck at the entrance", "Lift card reader not responding"],
  "Safety & Security": ["Emergency exit blocked by boxes", "Unattended bag in the lobby", "Fire extinguisher check overdue"],
  Noise: ["Loud call in the quiet zone", "Construction noise next door"],
};

export const INCIDENT_CATEGORY_WEIGHTS: (readonly [string, number])[] = [
  ["Cleaning", 22],
  ["Maintenance", 20],
  ["IT & Network", 22],
  ["HVAC & Climate", 14],
  ["Access Control", 10],
  ["Safety & Security", 5],
  ["Noise", 7],
];

export const ROOM_NAMES = ["Boardroom", "Aurora", "Cedar", "Delta", "Echo", "Granite", "Harbor", "Ivory"];

// Sales tours: prospects are NOT existing accounts, and hosts are Mindspace sales people.
export const PROSPECT_COMPANIES = [
  "Brightwave Studios", "Kestrel Biotech", "Lindqvist & Partners", "Moonrise Gaming", "Novatek Systems",
  "Orchard Capital", "Pelican Logistics", "Quartz Robotics", "Riverbend Health", "Stonebridge Law",
  "Tern Aerospace", "Umbra Security", "Valley Analytics", "Wren Design Co", "Yarrow Energy",
];

export const SALES_HOSTS = ["Marta Zielińska", "Daniel Rosen", "Kasia Lis", "Ori Ben-David"];

export const CARRIERS = ["DHL", "UPS", "FedEx", "InPost", "DPD", "Poczta Polska"];
