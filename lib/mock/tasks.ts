import type { SfTask } from "@/lib/salesforce/types";
import { createRng, createIdFactory, record, ref } from "./helpers";
import { COMPANY_NAMES } from "./names";

// Mock tasks for whichever user asks: generated from the owner's email, so every demo user gets
// their own stable list. In Salesforce these are the standard Task records owned by that user.

const SUBJECTS = [
  "Order new visitor badges",
  "Call courier about a missed parcel",
  "Restock the welcome kit in the lounge",
  "Print guest Wi-Fi vouchers",
  "Confirm catering for the event space booking",
  "Follow up with {company} about access cards",
  "Send {company} the building rules reminder",
  "Check the meeting room screens",
];

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Returns the user's open tasks. Like the SOQL it mirrors, it only returns ones due today or earlier. */
export function mockTasks(ownerEmail: string, today: string): SfTask[] {
  const rng = createRng(`tasks:${ownerEmail}`);
  const newId = createIdFactory(rng.int(0, 5000));
  const tasks: SfTask[] = [];

  // A few overdue, a few due today, one due later (must not show) and one already done (must not show).
  const plan = [...Array.from({ length: rng.int(1, 3) }, () => -rng.int(1, 9)), ...Array.from({ length: rng.int(2, 3) }, () => 0), 3, -2];
  plan.forEach((offset, i) => {
    const company = rng.pick(COMPANY_NAMES);
    const done = i === plan.length - 1;
    const related = rng.chance(0.6);
    tasks.push(
      record("Task", newId("00T"), {
        Subject: rng.pick(SUBJECTS).replace("{company}", company),
        ActivityDate: addDays(today, offset),
        Status: done ? ("Completed" as const) : rng.pick(["Not Started", "In Progress"] as const),
        Priority: rng.weighted([["High", 2], ["Normal", 6], ["Low", 2]] as const),
        IsClosed: done,
        What: related ? ref("Account", "0015g00000000000AAA", { Name: company }) : null,
        Owner: ref("User", "0055g00000000000AAA", { Email: ownerEmail }),
      }),
    );
  });
  return tasks.filter((t) => !t.IsClosed && t.ActivityDate !== null && t.ActivityDate <= today);
}
