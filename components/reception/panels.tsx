"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { EmptyState, Panel } from "@/components/panel";
import { useNow } from "@/components/use-now";
import type { AgendaItemDto, EntryDto, FreeSpotsDto, IncidentDto } from "@/lib/dto";
import { formatAge, formatTime } from "@/lib/format";

const PRIORITY_STYLE = {
  High: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
} as const;

export function IncidentsPanel({ incidents }: { incidents: IncidentDto[] }) {
  return (
    <Panel title="Ongoing cases" aside={`${incidents.length} open`}>
      {incidents.length === 0 ? (
        <EmptyState>No open cases — all clear</EmptyState>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {incidents.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-2">
              <span className={`w-16 shrink-0 rounded px-2 py-0.5 text-center text-xs font-medium ${PRIORITY_STYLE[i.priority]}`}>
                {i.priority}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.subject}</p>
                <p className="text-xs text-zinc-500">
                  {i.category} · {i.status}
                </p>
              </div>
              <span className="text-sm tabular-nums text-zinc-500">{formatAge(i.ageMinutes)}</span>
              {i.url && (
                <a
                  href={i.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open case ${i.number} in Salesforce`}
                  title="Open in Salesforce"
                  className="shrink-0 rounded border border-zinc-300 px-2 py-0.5 text-xs hover:border-zinc-500 dark:border-zinc-700"
                >
                  Salesforce ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function OverviewPanel({ freeSpots, entered, timeZone }: { freeSpots: FreeSpotsDto[]; entered: EntryDto[]; timeZone: string }) {
  const label = { Desk: "desks", Office: "offices", Room: "meeting rooms" } as const;
  return (
    <Panel title="Free spots & entered today">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {freeSpots.map((s) => (
          <div key={s.type} className="rounded border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="text-3xl font-semibold tabular-nums">{s.available}</p>
            <p className="text-xs text-zinc-500">
              free of {s.total} {label[s.type]}
            </p>
          </div>
        ))}
        <EnteredTile entered={entered} timeZone={timeZone} />
      </div>
    </Panel>
  );
}

function EnteredTile({ entered, timeZone }: { entered: EntryDto[]; timeZone: string }) {
  const [open, setOpen] = useState(false);
  // Reception screens face visitors: let staff blur names with one click.
  const [blur, setBlur] = useState(false);
  const members = entered.filter((e) => e.kind === "member").length;

  return (
    <>
      {/* Only entries are known (no check-out data), so this is a counter, not "in the building". */}
      <button
        type="button"
        disabled={entered.length === 0}
        onClick={() => setOpen(true)}
        className="rounded border border-zinc-200 p-3 text-center transition enabled:hover:border-zinc-400 dark:border-zinc-800 dark:enabled:hover:border-zinc-600"
      >
        <span className="block text-3xl font-semibold tabular-nums">{entered.length}</span>
        <span className="block text-xs text-zinc-500">entered today</span>
        {entered.length > 0 && <span className="mt-1 block text-xs text-indigo-500">See who</span>}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <>
            Entered today · {entered.length}
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {members} members, {entered.length - members} guests
            </span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => setBlur((b) => !b)}
            aria-pressed={blur}
            className="rounded border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700"
          >
            {blur ? "Show names" : "Blur names"}
          </button>
        }
      >
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="py-1 pr-3 font-normal">Name</th>
                <th className="py-1 pr-3 font-normal">Company</th>
                <th className="py-1 pr-3 font-normal">Type</th>
                <th className="py-1 font-normal">Entered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {entered.map((e) => (
                <tr key={e.id}>
                  <td className={`py-1.5 pr-3 font-medium ${blur ? "blur-sm select-none" : ""}`}>{e.name}</td>
                  <td className="py-1.5 pr-3">{e.company}</td>
                  <td className="py-1.5 pr-3 capitalize">{e.kind}</td>
                  <td className="py-1.5 tabular-nums">{formatTime(e.enteredAt, timeZone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}

// Tours are sales visits by prospects (Mindspace showing the building), so they must not look like
// a member's room booking: different colour and label, and the host is shown instead of the room.
const KIND = {
  tour: { label: "Sales tour", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  room: { label: "Room booking", dot: "bg-sky-500", badge: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  event: { label: "Event space", dot: "bg-violet-500", badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
} as const;

function guestsLabel(n: number) {
  return n === 1 ? "1 guest" : `${n} guests`;
}

export function AgendaPanel({ agenda, timeZone }: { agenda: AgendaItemDto[]; timeZone: string }) {
  const now = useNow(30_000);
  const scroller = useRef<HTMLDivElement>(null);
  const nowMarker = useRef<HTMLLIElement>(null);
  const current = useRef<HTMLLIElement>(null); // first item that is running now or still to come

  // Start the view around "now" instead of at 08:00: last finished items stay peeking above.
  useEffect(() => {
    const box = scroller.current;
    const target = current.current ?? nowMarker.current;
    if (!box || !target) return;
    box.scrollTop = target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 48;
  }, []);

  const tours = agenda.filter((a) => a.kind === "tour").length;
  // The "now" line goes before the first item that has not started yet; items running now stay above it.
  const firstUpcoming = agenda.findIndex((a) => Date.parse(a.start) > now);
  const markerAt = firstUpcoming === -1 ? agenda.length : firstUpcoming;
  const firstCurrent = agenda.findIndex((a) => Date.parse(a.end) > now);

  return (
    <Panel title="Today's agenda" aside={`${tours} ${tours === 1 ? "tour" : "tours"} · ${agenda.length - tours} ${agenda.length - tours === 1 ? "booking" : "bookings"}`}>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500" aria-label="Legend">
        {Object.values(KIND).map((k) => (
          <li key={k.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${k.dot}`} />
            {k.label}
          </li>
        ))}
      </ul>

      {agenda.length === 0 ? (
        <EmptyState>Nothing scheduled today</EmptyState>
      ) : (
        <div ref={scroller} className="max-h-[40rem] overflow-y-auto pr-1">
          <ol className="ml-1.5 border-l border-zinc-300 dark:border-zinc-700">
            {[...agenda, null].map((item, i) => (
              <Fragment key={item?.id ?? "end"}>
                {i === markerAt && (
                  <li ref={nowMarker} className="relative py-1 pl-5" aria-label="Current time">
                    <span className="absolute -left-[6px] top-2 h-3 w-3 rounded-full bg-emerald-500" />
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Now {formatTime(new Date(now).toISOString(), timeZone)}
                      <span className="h-px flex-1 bg-emerald-500/50" />
                    </div>
                  </li>
                )}
                {item && <AgendaRow item={item} now={now} timeZone={timeZone} rowRef={i === firstCurrent ? current : undefined} />}
              </Fragment>
            ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}

function AgendaRow({ item, now, timeZone, rowRef }: { item: AgendaItemDto; now: number; timeZone: string; rowRef?: React.Ref<HTMLLIElement> }) {
  const kind = KIND[item.kind];
  const ongoing = Date.parse(item.start) <= now && now < Date.parse(item.end);
  const past = now >= Date.parse(item.end);
  return (
    <li ref={rowRef} className={`relative py-1.5 pl-5 ${past ? "opacity-45" : ""}`}>
      <span className={`absolute -left-[5px] top-3.5 h-2.5 w-2.5 rounded-full ${kind.dot}`} />
      <div className={`rounded px-2 py-1 ${ongoing ? "bg-emerald-50 dark:bg-emerald-950" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="tabular-nums font-medium">
            {formatTime(item.start, timeZone)}–{formatTime(item.end, timeZone)}
          </span>
          <span className={`rounded px-1.5 py-0.5 font-medium ${kind.badge}`}>{kind.label}</span>
          {ongoing && <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-medium text-white">NOW</span>}
        </div>
        <p className="mt-0.5 text-sm font-medium">{item.company}</p>
        <p className="text-xs text-zinc-500">
          {item.kind === "tour" ? `Hosted by ${item.host}` : item.title} · {guestsLabel(item.guests)}
        </p>
      </div>
    </li>
  );
}
