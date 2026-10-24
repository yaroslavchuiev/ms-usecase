"use client";

import { useState } from "react";
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
  // Reception screens face visitors: let staff blur names with one click.
  const [blur, setBlur] = useState(false);
  const inBuilding = entered.filter((e) => e.status === "in-building").length;

  return (
    <Panel
      title="Entered today"
      className="lg:row-span-2"
      aside={
        <span className="flex items-center gap-3">
          {entered.length} entered · {inBuilding} in building
          <button
            type="button"
            onClick={() => setBlur((b) => !b)}
            aria-pressed={blur}
            className="rounded border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700"
          >
            {blur ? "Show names" : "Blur names"}
          </button>
        </span>
      }
    >
      {entered.length === 0 ? (
        <EmptyState>Nobody has checked in yet today</EmptyState>
      ) : (
        <div className="max-h-[32rem] overflow-auto 2xl:max-h-[44rem]">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-zinc-500 dark:bg-black">
              <tr>
                <th className="py-1 pr-3 font-normal">Name</th>
                <th className="py-1 pr-3 font-normal">Company</th>
                <th className="py-1 pr-3 font-normal">Type</th>
                <th className="py-1 pr-3 font-normal">In</th>
                <th className="py-1 pr-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {entered.map((e) => (
                <tr key={e.id}>
                  <td className={`py-1.5 pr-3 font-medium ${blur ? "blur-sm select-none" : ""}`}>{e.name}</td>
                  <td className="py-1.5 pr-3">{e.company}</td>
                  <td className="py-1.5 pr-3 capitalize">{e.kind}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{formatTime(e.enteredAt, timeZone)}</td>
                  <td className="whitespace-nowrap py-1.5">
                    {e.status === "in-building" ? (
                      <span className="text-emerald-600 dark:text-emerald-400">In building</span>
                    ) : (
                      <span className="text-zinc-500">Left {e.leftAt && formatTime(e.leftAt, timeZone)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
