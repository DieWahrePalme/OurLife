import { dateForDayNumber, dayNumberFor } from './dates';

const HUNDRED = 100;

/** Same calendar date as the start, in a later year: the number of years, otherwise 0. */
function anniversaryYears(startStamp: number, dayNumber: number): number {
  const start = new Date(startStamp);
  const day = new Date(dateForDayNumber(startStamp, dayNumber));
  const sameDate = start.getUTCMonth() === day.getUTCMonth() && start.getUTCDate() === day.getUTCDate();
  return sameDate ? Math.max(day.getUTCFullYear() - start.getUTCFullYear(), 0) : 0;
}

/**
 * Text for inside a dot, or null on an ordinary day. Every 100th day counts,
 * and every yearly anniversary of the start date ("1y"), which is day 366, 731 ...
 */
export function milestoneLabelFor(dayNumber: number, startStamp: number): string | null {
  const years = anniversaryYears(startStamp, dayNumber);
  if (years > 0) return `${years}y`;
  return dayNumber % HUNDRED === 0 ? String(dayNumber) : null;
}

/** The first milestone day that is strictly after `dayNumber`. */
export function nextMilestone(dayNumber: number, startStamp: number): number {
  const nextHundred = (Math.floor(dayNumber / HUNDRED) + 1) * HUNDRED;
  const start = new Date(startStamp);
  let year = new Date(dateForDayNumber(startStamp, dayNumber)).getUTCFullYear();
  let nextAnniversary = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 3 && nextAnniversary === Number.POSITIVE_INFINITY; i += 1, year += 1) {
    const candidate = dayNumberFor(startStamp, Date.UTC(year, start.getUTCMonth(), start.getUTCDate()));
    if (candidate > dayNumber && year > start.getUTCFullYear()) nextAnniversary = candidate;
  }
  return Math.min(nextHundred, nextAnniversary);
}
