"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, Panel } from "@/components/panel";
import type { RoomUtilisationDto, StatsDto } from "@/lib/dto";
import { formatDay } from "@/lib/format";

// Charts draw in `currentColor` (set by the wrapper's text colour), so they follow light/dark mode.
const ACCENT = "#6366f1";
const tick = { fill: "currentColor", fontSize: 12 };

function Chart({ children, height = 224 }: { children: ReactNode; height?: number }) {
  return (
    <div className="text-zinc-500" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

export function OccupancyPanel({ occupancy }: { occupancy: StatsDto["occupancy"] }) {
  return (
    <Panel title="Occupancy" aside="occupied vs total desks and offices">
      <div className="mb-4 flex gap-8">
        <Kpi label="today" value={`${occupancy.currentPercent}%`} />
        <Kpi label="average for the period" value={`${occupancy.averagePercent}%`} />
      </div>
      <Chart>
        <LineChart data={occupancy.trend} margin={{ left: -20, right: 8, top: 4 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDay} tick={tick} minTickGap={32} />
          <YAxis domain={[0, 100]} unit="%" tick={tick} />
          <Tooltip labelFormatter={(d) => formatDay(String(d))} formatter={(v) => [`${v}%`, "Occupancy"]} />
          <Line dataKey="percent" stroke={ACCENT} strokeWidth={2} dot={false} />
        </LineChart>
      </Chart>
    </Panel>
  );
}

export function CheckInsPanel({ checkIns }: { checkIns: StatsDto["checkIns"] }) {
  const peak = checkIns.byHour.reduce((a, b) => (b.average > a.average ? b : a));
  return (
    <Panel title="Check-ins" aside={peak.average > 0 ? `peak hour: ${String(peak.hour).padStart(2, "0")}:00` : undefined}>
      <div className="mb-4 flex gap-8">
        <Kpi label="entries in the period" value={checkIns.total.toLocaleString("en-GB")} />
        <Kpi label="per day on average" value={checkIns.averagePerDay} />
      </div>
      <p className="mb-1 text-xs text-zinc-500">Entries per day</p>
      <Chart height={160}>
        <BarChart data={checkIns.daily} margin={{ left: -20, right: 8 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDay} tick={tick} minTickGap={32} />
          <YAxis tick={tick} allowDecimals={false} />
          <Tooltip labelFormatter={(d) => formatDay(String(d))} formatter={(v) => [v, "Entries"]} />
          <Bar dataKey="count" fill={ACCENT} />
        </BarChart>
      </Chart>
      <p className="mb-1 mt-4 text-xs text-zinc-500">Average entries by hour of day (building time)</p>
      <Chart height={140}>
        <BarChart data={checkIns.byHour.slice(5, 22)} margin={{ left: -20, right: 8 }}>
          <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={tick} interval={1} />
          <YAxis tick={tick} />
          <Tooltip labelFormatter={(h) => `${h}:00`} formatter={(v) => [v, "Avg entries"]} />
          <Bar dataKey="average" fill={ACCENT} />
        </BarChart>
      </Chart>
    </Panel>
  );
}

function RoomRow({ room }: { room: RoomUtilisationDto }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0">{room.room}</span>
      <span className="h-2 flex-1 rounded bg-zinc-200 dark:bg-zinc-800">
        <span className="block h-2 rounded bg-indigo-500" style={{ width: `${room.percent}%` }} />
      </span>
      <span className="w-20 shrink-0 text-right tabular-nums text-zinc-500">
        {room.percent}% · {room.bookedHours}h
      </span>
    </li>
  );
}

export function RoomsPanel({ rooms }: { rooms: StatsDto["rooms"] }) {
  return (
    <Panel title="Meeting room utilisation" aside="booked vs bookable hours (08–20)">
      <div className="mb-4 flex gap-8">
        <Kpi label="overall utilisation" value={`${rooms.utilisationPercent}%`} />
        <Kpi label="hours booked" value={rooms.bookedHours.toLocaleString("en-GB")} hint={`of ${rooms.availableHours.toLocaleString("en-GB")}`} />
      </div>
      <h3 className="mb-2 text-xs font-medium text-zinc-500">Most used</h3>
      <ul className="mb-4 space-y-2">{rooms.mostUsed.map((r) => <RoomRow key={r.room} room={r} />)}</ul>
      <h3 className="mb-2 text-xs font-medium text-zinc-500">Least used</h3>
      <ul className="space-y-2">{rooms.leastUsed.map((r) => <RoomRow key={r.room} room={r} />)}</ul>
    </Panel>
  );
}

export function IncidentsStatsPanel({ incidents }: { incidents: StatsDto["incidents"] }) {
  return (
    <Panel title="Incidents" aside="opened in the period">
      {incidents.total === 0 ? (
        <EmptyState>No incidents in this period</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex gap-8">
            <Kpi label="incidents" value={incidents.total} />
            <Kpi label="avg resolution" value={`${incidents.averageResolutionHours}h`} />
            <Kpi label="SLA breaches" value={incidents.slaBreaches} />
          </div>
          <Chart height={Math.max(120, incidents.byCategory.length * 32)}>
            <BarChart data={incidents.byCategory} layout="vertical" margin={{ left: 20, right: 16 }}>
              <XAxis type="number" tick={tick} allowDecimals={false} />
              <YAxis type="category" dataKey="category" tick={tick} width={110} />
              <Tooltip formatter={(v) => [v, "Incidents"]} />
              <Bar dataKey="count" fill={ACCENT} />
            </BarChart>
          </Chart>
        </>
      )}
    </Panel>
  );
}

export function MembersPanel({ members }: { members: StatsDto["members"] }) {
  return (
    <Panel title="Members" aside="companies with a contract here">
      <div className="mb-4 flex gap-8">
        <Kpi label="active companies" value={members.activeCompanies} />
        <Kpi label="move-ins" value={members.moveIns} />
        <Kpi label="move-outs" value={members.moveOuts} />
      </div>
      <h3 className="mb-2 text-xs font-medium text-zinc-500">Contracts ending in the next 90 days</h3>
      {members.endingSoon.length === 0 ? (
        <EmptyState>No contracts ending soon</EmptyState>
      ) : (
        <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          {members.endingSoon.map((c) => (
            <li key={c.company} className="flex justify-between py-1.5">
              <span>{c.company}</span>
              <span className="tabular-nums text-zinc-500">{formatDay(c.endDate)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function FunnelRow({ label, count, of, note }: { label: string; count: number; of: number; note?: string }) {
  const width = of === 0 ? 0 : Math.max(2, Math.round((count / of) * 100));
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0">{label}</span>
      <span className="h-5 flex-1 rounded bg-zinc-200 dark:bg-zinc-800">
        <span className="block h-5 rounded bg-indigo-500" style={{ width: `${width}%` }} />
      </span>
      <span className="w-24 shrink-0 text-right tabular-nums">
        {count} <span className="text-xs text-zinc-500">{note}</span>
      </span>
    </li>
  );
}

export function SalesPanel({ sales }: { sales: StatsDto["sales"] }) {
  return (
    <Panel title="Sales tours" aside={`${sales.upcoming} booked for the next 7 days`}>
      {sales.booked === 0 ? (
        <EmptyState>No tours in this period</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-3">
            <Kpi label="tours held" value={sales.completed} hint={`${sales.cancelled} cancelled`} />
            <Kpi label="show rate" value={`${sales.showRatePercent}%`} hint={`${sales.noShows} no-shows`} />
            <Kpi label="signed after tour" value={`${sales.conversionPercent}%`} hint={`${sales.signed} contracts`} />
            <Kpi label="days tour → signed" value={sales.averageDaysToSign ?? "–"} />
          </div>
          <ul className="mb-4 space-y-2" aria-label="Tour funnel">
            <FunnelRow label="Booked" count={sales.booked} of={sales.booked} />
            <FunnelRow label="Held" count={sales.completed} of={sales.booked} note={`${percentOf(sales.completed, sales.booked)}%`} />
            <FunnelRow label="Signed" count={sales.signed} of={sales.booked} note={`${percentOf(sales.signed, sales.completed)}% of held`} />
          </ul>
          <p className="mb-4 text-xs text-zinc-500">Deals take days to close, so recent tours can still convert: short periods read low.</p>
          <h3 className="mb-2 text-xs font-medium text-zinc-500">By sales host</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-500">
              <tr>
                <th className="py-1 font-normal">Host</th>
                <th className="py-1 text-right font-normal">Tours held</th>
                <th className="py-1 text-right font-normal">Signed</th>
                <th className="py-1 text-right font-normal">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {sales.byHost.map((h) => (
                <tr key={h.host}>
                  <td className="py-1.5">{h.host}</td>
                  <td className="py-1.5 text-right tabular-nums">{h.completed}</td>
                  <td className="py-1.5 text-right tabular-nums">{h.signed}</td>
                  <td className="py-1.5 text-right tabular-nums">{h.conversionPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  );
}

const percentOf = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));
