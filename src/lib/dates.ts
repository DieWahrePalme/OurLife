const MS_PER_DAY = 86_400_000;

/** Parses "YYYY-MM-DD" as a calendar day (no timezone drift). */
function toDayStamp(year: number, month: number, day: number): number {
  return Date.UTC(year, month, day);
}

export function parseIsoDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return toDayStamp(y, m - 1, d);
}

export function todayStamp(now: Date = new Date()): number {
  return toDayStamp(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Day 1 is the start date itself. */
export function dayNumberFor(startStamp: number, dayStamp: number): number {
  return Math.round((dayStamp - startStamp) / MS_PER_DAY) + 1;
}

export function dateForDayNumber(startStamp: number, dayNumber: number): number {
  return startStamp + (dayNumber - 1) * MS_PER_DAY;
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
const DAY_FORMAT_WEEKDAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' });

export function formatDay(stamp: number, withWeekday = false): string {
  return (withWeekday ? DAY_FORMAT_WEEKDAY : DAY_FORMAT).format(new Date(stamp));
}

/** "Oct" or, with year, "Oct ’25". */
export function formatMonthLabel(stamp: number, withYear: boolean): string {
  const date = new Date(stamp);
  const month = MONTH_FORMAT.format(date);
  return withYear ? `${month} ’${String(date.getUTCFullYear()).slice(-2)}` : month;
}

