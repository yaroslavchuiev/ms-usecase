import type {
  SfAccount,
  SfBooking,
  SfCase,
  SfCheckIn,
  SfContract,
  SfDelivery,
  SfLocation,
  SfOccupancySnapshot,
  SfQueryResult,
  SfSpace,
  SfTour,
} from "@/lib/salesforce/types";
import { addLocalDays, localDateString, localDayOfWeek, startOfLocalDay } from "@/lib/time";
import { createIdFactory, createRng, queryResult, record, ref, sfDateTime } from "./helpers";
import {
  CARRIERS,
  COMPANY_NAMES,
  FIRST_NAMES,
  INCIDENTS,
  INCIDENT_CATEGORY_WEIGHTS,
  LAST_NAMES,
  PROSPECT_COMPANIES,
  ROOM_NAMES,
  SALES_HOSTS,
} from "./names";

// Fixtures in Salesforce REST format: what `SELECT ... FROM Object` would return for ALL
// locations. The mock query layer (later steps) filters by Location__c like a SOQL WHERE.
// Everything is generated relative to `now`, so the demo always looks live. Randomness is
// seeded per location: data varies between locations but is stable between reloads.

export interface MockDataset {
  locations: SfQueryResult<SfLocation>;
  cases: SfQueryResult<SfCase>;
  spaces: SfQueryResult<SfSpace>;
  checkIns: SfQueryResult<SfCheckIn>;
  bookings: SfQueryResult<SfBooking>;
  tours: SfQueryResult<SfTour>;
  deliveries: SfQueryResult<SfDelivery>;
  snapshots: SfQueryResult<SfOccupancySnapshot>;
  accounts: SfQueryResult<SfAccount>;
  contracts: SfQueryResult<SfContract>;
}

const HISTORY_DAYS = 90;
const MIN = 60_000;

// Kraków shares Warsaw's zone; Tel Aviv is the one with a different zone and UTC offset.
const LOCATIONS = [
  { name: "Warsaw", tz: "Europe/Warsaw", desks: 60, offices: 28, rooms: 8, eventSpace: "Town Hall", occupancy: 0.82, companies: [0, 24] },
  { name: "Kraków", tz: "Europe/Warsaw", desks: 40, offices: 18, rooms: 5, eventSpace: "Atrium", occupancy: 0.71, companies: [20, 36] },
  { name: "Tel Aviv", tz: "Asia/Jerusalem", desks: 50, offices: 24, rooms: 6, eventSpace: "Rooftop Studio", occupancy: 0.77, companies: [30, 50] },
] as const;

// Service levels per priority, in hours. Used for Case.SLA_Breached__c.
const SLA_HOURS = { High: 4, Medium: 24, Low: 72 } as const;
type Priority = keyof typeof SLA_HOURS;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function buildMockDataset(now: Date = new Date()): MockDataset {
  const newId = createIdFactory();

  const locations: SfLocation[] = [];
  const cases: SfCase[] = [];
  const spaces: SfSpace[] = [];
  const checkIns: SfCheckIn[] = [];
  const bookings: SfBooking[] = [];
  const tours: SfTour[] = [];
  const deliveries: SfDelivery[] = [];
  const snapshots: SfOccupancySnapshot[] = [];
  const contracts: SfContract[] = [];

  // One Account per company; a company can rent in more than one building.
  const accounts = COMPANY_NAMES.map((Name) => record("Account", newId("001"), { Name }));
  const salesHosts = SALES_HOSTS.map((name) => ({ id: newId("005"), name }));
  let bookingNumber = 1000;
  let tourNumber = 100;
  let deliveryNumber = 100;
  let caseNumber = 1000;
  let contractNumber = 100;

  for (const cfg of LOCATIONS) {
    const rng = createRng(cfg.name);
    const tz = cfg.tz;
    const today = startOfLocalDay(now, tz);
    const dayStart = (offset: number) => addLocalDays(today, offset, tz);

    const location = record("Location__c", newId("a00"), {
      Name: cfg.name,
      Capacity__c: 0, // filled in once the spaces exist
      Time_Zone__c: tz,
    });
    locations.push(location);
    const locationId = location.Id;

    // --- Spaces ---------------------------------------------------------------------------
    const mySpaces: SfSpace[] = [];
    const addSpace = (Name: string, Type__c: SfSpace["Type__c"], Capacity__c: number) => {
      const Status__c = Type__c === "Desk" || Type__c === "Office" ? pickDeskStatus(rng.next()) : "Available";
      mySpaces.push(record("Space__c", newId("a01"), { Name, Type__c, Capacity__c, Status__c, Location__c: locationId }));
    };
    // Share of desks/offices taken right now: occupied mostly, a few reserved or out of service.
    const pickDeskStatus = (r: number): SfSpace["Status__c"] =>
      r < cfg.occupancy ? "Occupied" : r < cfg.occupancy + 0.06 ? "Reserved" : r > 0.98 ? "Out of Service" : "Available";

    for (let i = 1; i <= cfg.desks; i++) addSpace(`Desk ${String.fromCharCode(64 + Math.ceil(i / 20))}-${String(i).padStart(2, "0")}`, "Desk", 1);
    for (let i = 1; i <= cfg.offices; i++) addSpace(`Office ${300 + i}`, "Office", rng.pick([2, 4, 4, 6, 8, 10]));
    const roomSpaces: SfSpace[] = [];
    for (let i = 0; i < cfg.rooms; i++) {
      addSpace(ROOM_NAMES[i], "Room", i === 0 ? 16 : rng.pick([4, 6, 8, 12]));
      roomSpaces.push(mySpaces[mySpaces.length - 1]);
    }
    // Event spaces (town hall, atrium...) are booked like rooms but are not part of the room stats.
    addSpace(cfg.eventSpace, "Event Space", 60);
    const eventSpace = mySpaces[mySpaces.length - 1];
    const rentable = mySpaces.filter((s) => s.Type__c === "Desk" || s.Type__c === "Office");
    location.Capacity__c = rentable.reduce((sum, s) => sum + s.Capacity__c, 0);

    // --- Companies, contracts and their people ------------------------------------------
    // A mix of contract situations so the Members panel has something to show:
    // 4 recently ended (move-outs), 5 recently started (move-ins), 4 ending soon, rest steady.
    const [from, to] = cfg.companies;
    const myContracts: SfContract[] = [];
    const contactsByAccount = new Map<string, { id: string; name: string }[]>();
    accounts.slice(from, to).forEach((account, i) => {
      const [startOffset, endOffset] =
        i < 4 ? [-rng.int(200, 400), -rng.int(3, 85)]
        : i < 9 ? [-rng.int(2, 85), rng.int(300, 700)]
        : i < 13 ? [-rng.int(300, 700), rng.int(5, 88)]
        : [-rng.int(100, 700), rng.int(100, 700)];
      const endDate = localDateString(dayStart(endOffset), tz);
      const contract = record("Contract", newId("800"), {
        ContractNumber: String(++contractNumber).padStart(8, "0"),
        AccountId: account.Id,
        Account: ref("Account", account.Id, { Name: account.Name }),
        Status: endOffset < 0 ? ("Expired" as const) : ("Activated" as const),
        StartDate: localDateString(dayStart(startOffset), tz),
        EndDate: endDate,
        Location__c: locationId,
      });
      myContracts.push(contract);
      contactsByAccount.set(
        account.Id,
        Array.from({ length: rng.int(3, 9) }, () => ({
          id: newId("003"),
          name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
        })),
      );
    });
    contracts.push(...myContracts);
    const activeOn = (date: string) => myContracts.filter((c) => c.StartDate <= date && c.EndDate >= date);

    // --- Meeting room bookings: every room, every day, plus the rest of today -------------
    // A room has a popularity, so the stats can show most and least used rooms.
    const popularity = new Map(roomSpaces.map((r) => [r.Id, rng.int(35, 120) / 100]));
    popularity.set(eventSpace.Id, 0.3); // events are rarer than meetings
    for (let d = -HISTORY_DAYS; d <= 0; d++) {
      const start = dayStart(d);
      const date = localDateString(start, tz);
      const weekend = [0, 6].includes(localDayOfWeek(start, tz));
      const companies = activeOn(date);
      if (companies.length === 0) continue;
      for (const room of [...roomSpaces, eventSpace]) {
        const isEvent = room === eventSpace;
        let cursor = 8 * 60; // rooms are bookable 08:00-20:00 local
        while (cursor < 19 * 60) {
          if (!rng.chance(0.33 * popularity.get(room.Id)! * (weekend ? 0.25 : 1))) {
            cursor += 30;
            continue;
          }
          const end = Math.min(cursor + rng.pick(isEvent ? [120, 180, 240] : [30, 60, 60, 90, 120]), 20 * 60);
          const company = rng.pick(companies);
          bookings.push(
            record("Booking__c", newId("a03"), {
              Name: `BK-${String(++bookingNumber).padStart(7, "0")}`,
              Space__c: room.Id,
              Space__r: ref("Space__c", room.Id, { Name: room.Name, Type__c: room.Type__c }),
              Account__c: company.AccountId,
              Account__r: ref("Account", company.AccountId, { Name: company.Account.Name }),
              Start__c: sfDateTime(new Date(start.getTime() + cursor * MIN)),
              End__c: sfDateTime(new Date(start.getTime() + end * MIN)),
              Guest_Count__c: isEvent ? rng.int(15, 55) : rng.int(1, Math.min(room.Capacity__c, 10)),
              Location__c: locationId,
            }),
          );
          cursor = end + rng.pick([0, 15, 30]);
        }
      }
    }
    // --- Sales tours: prospects shown around the building by a Mindspace sales host ----------
    for (let d = -HISTORY_DAYS; d <= 0; d++) {
      const start = dayStart(d);
      const weekend = [0, 6].includes(localDayOfWeek(start, tz));
      for (let i = weekend ? rng.int(1, 2) : rng.int(2, 4); i > 0; i--) {
        const from = Math.round(rng.int(9 * 60, 17 * 60) / 15) * 15;
        const startsAt = new Date(start.getTime() + from * MIN);
        const endsAt = new Date(startsAt.getTime() + rng.pick([30, 45, 60]) * MIN);
        const host = rng.pick(salesHosts);
        tours.push(
          record("Tour__c", newId("a05"), {
            Name: `TR-${String(++tourNumber).padStart(7, "0")}`,
            Start__c: sfDateTime(startsAt),
            End__c: sfDateTime(endsAt),
            Prospect_Company__c: rng.pick(PROSPECT_COMPANIES),
            Guest_Count__c: rng.int(1, 4),
            Host__c: host.id,
            Host__r: ref("User", host.id, { Name: host.name }),
            Status__c: rng.chance(0.08) ? ("Cancelled" as const) : endsAt < now ? ("Completed" as const) : ("Scheduled" as const),
            Location__c: locationId,
          }),
        );
      }
    }
    // --- Deliveries: a few parcels waiting at reception, plus collected ones as history -------
    const recipients = activeOn(localDateString(today, tz));
    const waitingCount = rng.int(2, 4);
    for (let i = 0; i < 14 && recipients.length > 0; i++) {
      const waiting = i < waitingCount;
      const company = rng.pick(recipients);
      const received = new Date(now.getTime() - (waiting ? rng.int(30, 3 * 24 * 60) : rng.int(24 * 60, 20 * 24 * 60)) * MIN);
      deliveries.push(
        record("Delivery__c", newId("a06"), {
          Name: `DL-${String(++deliveryNumber).padStart(7, "0")}`,
          Account__c: company.AccountId,
          Account__r: ref("Account", company.AccountId, { Name: company.Account.Name }),
          Carrier__c: rng.pick(CARRIERS) as string | null,
          Received_Time__c: sfDateTime(received),
          Collected_Time__c: waiting ? null : sfDateTime(new Date(received.getTime() + rng.int(60, 23 * 60) * MIN)),
          Status__c: waiting ? ("Waiting" as const) : ("Collected" as const),
          Location__c: locationId,
        }),
      );
    }
    // A room is "Occupied" right now if a booking covers this instant.
    for (const room of roomSpaces) {
      const busy = bookings.some(
        (b) => b.Space__c === room.Id && Date.parse(b.Start__c) <= now.getTime() && Date.parse(b.End__c) > now.getTime(),
      );
      if (busy) room.Status__c = "Occupied";
    }
    spaces.push(...mySpaces);

    // --- Daily occupancy snapshots: slow upward trend, today = the live space statuses -----
    const total = rentable.length;
    const occupiedNow = rentable.filter((s) => s.Status__c === "Occupied").length;
    const snapshotsByDate = new Map<string, number>();
    for (let d = -HISTORY_DAYS; d <= 0; d++) {
      const date = localDateString(dayStart(d), tz);
      const progress = (d + HISTORY_DAYS) / HISTORY_DAYS;
      const fraction = cfg.occupancy - 0.07 + 0.07 * progress + (rng.next() - 0.5) * 0.03;
      const occupied = d === 0 ? occupiedNow : Math.round(total * fraction);
      snapshotsByDate.set(date, occupied);
      snapshots.push(
        record("Occupancy_Snapshot__c", newId("a04"), {
          Date__c: date,
          Occupied__c: occupied,
          Total__c: total,
          Location__c: locationId,
        }),
      );
    }

    // --- Check-ins: ~1.5 people per occupied space, fewer at weekends -----------------------
    for (let d = -HISTORY_DAYS; d <= 0; d++) {
      const start = dayStart(d);
      const date = localDateString(start, tz);
      const weekend = [0, 6].includes(localDayOfWeek(start, tz));
      const arrivals = Math.round(snapshotsByDate.get(date)! * 1.5 * (weekend ? 0.4 : 1) * (0.85 + rng.next() * 0.3));
      const guestCount = Math.round(arrivals * 0.15);

      const people = rng
        .shuffle(activeOn(date).flatMap((c) => contactsByAccount.get(c.AccountId)!.map((p) => ({ ...p, account: c }))))
        .slice(0, arrivals - guestCount);
      const hosts = activeOn(date);
      const visitors = Array.from({ length: hosts.length ? guestCount : 0 }, () => ({
        guest: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
        account: rng.pick(hosts),
      }));

      for (const person of [...people, ...visitors]) {
        // Most people arrive around 9:00; the rest spread through the day.
        const arrival = clamp(rng.chance(0.7) ? rng.normal(9 * 60, 70) : rng.int(7 * 60, 17 * 60), 6 * 60, 20 * 60 + 30);
        const enteredAt = start.getTime() + Math.round(arrival) * MIN;
        // Today is generated for the whole day, then cut at `now`, so the data stays stable.
        if (enteredAt > now.getTime()) continue;
        const member = "id" in person;
        checkIns.push(
          record("Check_In__c", newId("a02"), {
            Type__c: member ? ("Member" as const) : ("Guest" as const),
            Contact__c: member ? person.id : null,
            Contact__r: member ? ref("Contact", person.id, { Name: person.name }) : null,
            Guest_Name__c: member ? null : person.guest,
            Account__c: person.account.AccountId,
            Account__r: ref("Account", person.account.AccountId, { Name: person.account.Account.Name }),
            Check_In_Time__c: sfDateTime(new Date(enteredAt)),
            Location__c: locationId,
          }),
        );
      }
    }

    // --- Incidents (Cases) --------------------------------------------------------------------
    const makeCase = (createdAt: Date, closedAt: Date | null, status: SfCase["Status"], priority: Priority, category = rng.weighted(INCIDENT_CATEGORY_WEIGHTS), subject = rng.pick(INCIDENTS[category])) => {
      const end = closedAt ?? now;
      cases.push(
        record("Case", newId("500"), {
          CaseNumber: String(++caseNumber).padStart(8, "0"),
          // Some subjects are about a person, e.g. "Create access card for Anna Kowalska".
          Subject: subject.replace("{name}", `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`),
          Category__c: category,
          Priority: priority,
          Status: status,
          IsClosed: closedAt !== null,
          CreatedDate: sfDateTime(createdAt),
          ClosedDate: closedAt ? sfDateTime(closedAt) : null,
          SLA_Breached__c: end.getTime() - createdAt.getTime() > SLA_HOURS[priority] * 3_600_000,
          Location__c: locationId,
          RecordType: ref("RecordType", "012000000000000AAA", { Name: "Building Incident" }),
        }),
      );
    };
    const randomPriority = () => rng.weighted<Priority>([["High", 15], ["Medium", 50], ["Low", 35]]);

    // Closed history: ~1-2 a day. Resolution time depends on priority.
    for (let d = -HISTORY_DAYS; d <= 0; d++) {
      for (let i = rng.int(0, 3); i > 0; i--) {
        const priority = randomPriority();
        const [min, max] = { High: [1, 8], Medium: [2, 36], Low: [8, 100] }[priority];
        const created = new Date(dayStart(d).getTime() + rng.int(7 * 60, 19 * 60) * MIN);
        const closed = new Date(created.getTime() + rng.int(min * 60, max * 60) * MIN);
        if (created < now && closed < now) makeCase(created, closed, "Closed", priority);
      }
    }
    // Open right now: created within the last 3 days, mostly recent ones.
    for (let i = rng.int(4, 7); i > 0; i--) {
      const priority = randomPriority();
      const ageMinutes = Math.round(rng.next() ** 2 * 72 * 60) + 5;
      const status = priority === "High" && rng.chance(0.4) ? "Escalated" : rng.weighted<SfCase["Status"]>([["New", 45], ["Working", 55]]);
      makeCase(new Date(now.getTime() - ageMinutes * MIN), null, status, priority);
    }
    // Always one open "new access card" request, so the demo shows a person-related case.
    makeCase(new Date(now.getTime() - rng.int(20, 180) * MIN), null, "New", "Medium", "Access Control", "Create access card for {name}");
  }

  return {
    locations: queryResult(locations),
    cases: queryResult(cases),
    spaces: queryResult(spaces),
    checkIns: queryResult(checkIns),
    bookings: queryResult(bookings),
    tours: queryResult(tours),
    deliveries: queryResult(deliveries),
    snapshots: queryResult(snapshots),
    accounts: queryResult(accounts),
    contracts: queryResult(contracts),
  };
}
