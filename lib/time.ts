// Time-zone helpers. The server runs in UTC, but "today" and displayed times must follow each
// location's own time zone (Warsaw, Tel Aviv, ...). Everything is built on Intl, no date library.

/** Offset of `tz` from UTC at the given instant, in ms (e.g. Warsaw in summer = +2h). */
export function zonedOffsetMs(date: Date, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Local calendar date in `tz` as YYYY-MM-DD (the format of Salesforce Date fields). */
export function localDateString(date: Date, tz: string): string {
  return new Date(date.getTime() + zonedOffsetMs(date, tz)).toISOString().slice(0, 10);
}

/** The instant at which the local day containing `date` started in `tz`. */
export function startOfLocalDay(date: Date, tz: string): Date {
  const localMidnightAsUtc = Date.parse(localDateString(date, tz) + "T00:00:00Z");
  // Look the offset up at the guessed instant so days that contain a DST change stay correct.
  const guess = new Date(localMidnightAsUtc - zonedOffsetMs(date, tz));
  return new Date(localMidnightAsUtc - zonedOffsetMs(guess, tz));
}

/** Start of the local day `days` after (or before, if negative) the day starting at `dayStart`. */
export function addLocalDays(dayStart: Date, days: number, tz: string): Date {
  // Jump to local noon of the target day first, so a 23h/25h DST day can't land on the wrong date.
  return startOfLocalDay(new Date(dayStart.getTime() + days * 86_400_000 + 12 * 3_600_000), tz);
}

/** Day of week of the local day starting at `dayStart`: 0 = Sunday ... 6 = Saturday. */
export function localDayOfWeek(dayStart: Date, tz: string): number {
  return new Date(localDateString(dayStart, tz) + "T00:00:00Z").getUTCDay();
}
