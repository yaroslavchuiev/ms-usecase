"use client";

import { useRef, useState } from "react";
import { EmptyState, Panel } from "@/components/panel";
import { useNow } from "@/components/use-now";
import type { EntryDto, FreeSpotsDto, IncidentDto, MeetingDto } from "@/lib/dto";
import { formatAge, formatTime } from "@/lib/format";

const PRIORITY_STYLE = {
  High: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
} as const;

export function IncidentsPanel({ incidents }: { incidents: IncidentDto[] }) {
  return (
    <Panel title="Ongoing incidents" aside={`${incidents.length} open`}>
      {incidents.length === 0 ? (
        <EmptyState>No incidents — all clear</EmptyState>
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
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function FreeSpotsPanel({ freeSpots }: { freeSpots: FreeSpotsDto[] }) {
  const label = { Desk: "Desks", Office: "Offices", Room: "Meeting rooms" } as const;
  return (
    <Panel title="Free spots">
      <div className="grid grid-cols-3 gap-3">
        {freeSpots.map((s) => (
          <div key={s.type} className="rounded border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="text-3xl font-semibold tabular-nums">{s.available}</p>
            <p className="text-xs text-zinc-500">
              of {s.total} {label[s.type].toLowerCase()}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function EnteredPanel({ entered, timeZone }: { entered: EntryDto[]; timeZone: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  // Reception screens face visitors: let staff blur names with one click.
  const [blur, setBlur] = useState(false);
  const members = entered.filter((e) => e.kind === "member").length;

  return (
    <Panel title="Entered today">
      {/* Only entries are known (no check-out data), so this is a counter, not "in the building". */}
      <button
        type="button"
        disabled={entered.length === 0}
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        className="w-full rounded border border-zinc-200 p-3 text-center transition enabled:hover:border-zinc-400 dark:border-zinc-800 dark:enabled:hover:border-zinc-600"
      >
        <span className="block text-3xl font-semibold tabular-nums">{entered.length}</span>
        <span className="block text-xs text-zinc-500">
          {entered.length === 0 ? "Nobody has checked in yet today" : `${members} members · ${entered.length - members} guests`}
        </span>
        {entered.length > 0 && <span className="mt-1 block text-xs text-indigo-500">Click to see who</span>}
      </button>

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()} // click on the backdrop
        aria-label="People who entered today"
        className="m-auto w-[min(48rem,92vw)] rounded-lg bg-white p-4 text-zinc-900 backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {open && (
          <>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Entered today · {entered.length}</h2>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBlur((b) => !b)}
                  aria-pressed={blur}
                  className="rounded border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700"
                >
                  {blur ? "Show names" : "Blur names"}
                </button>
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  className="rounded border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700"
                >
                  Close
                </button>
              </span>
            </div>
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
          </>
        )}
      </dialog>
    </Panel>
  );
}

export function MeetingsPanel({ meetings, timeZone }: { meetings: MeetingDto[]; timeZone: string }) {
  const now = useNow(30_000);
  return (
    <Panel title="Today's meetings" aside={`${meetings.length} booked`}>
      {meetings.length === 0 ? (
        <EmptyState>No meetings booked today</EmptyState>
      ) : (
        <ul className="max-h-96 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
          {meetings.map((m) => {
            const start = Date.parse(m.start);
            const end = Date.parse(m.end);
            const state = now >= end ? "past" : now >= start ? "now" : "upcoming";
            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 px-2 py-2 text-sm ${
                  state === "now" ? "rounded bg-emerald-50 dark:bg-emerald-950" : state === "past" ? "text-zinc-400 dark:text-zinc-600" : ""
                }`}
              >
                <span className="w-24 shrink-0 tabular-nums">
                  {formatTime(m.start, timeZone)}–{formatTime(m.end, timeZone)}
                </span>
                <span className="w-24 shrink-0 font-medium">{m.room}</span>
                <span className="min-w-0 flex-1 truncate">{m.company}</span>
                <span className="shrink-0 text-xs">{m.guests} guests</span>
                {state === "now" && <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-medium text-white">NOW</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
