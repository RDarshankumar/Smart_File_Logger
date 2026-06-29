/**
 * @file src/utils/date.ts
 * @description Pure date-manipulation helpers. No side-effects, fully unit-testable.
 * All functions work with plain Date objects so callers control time sources.
 */

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Returns the full day-of-week name for a given Date.
 * @example getDayName(new Date('2026-06-29')) // → 'Monday'
 */
export function getDayName(date: Date): string {
  const name = DAY_NAMES[date.getDay()];
  // DAY_NAMES has exactly 7 entries indexed 0-6; getDay() always returns 0-6.
  return name as string;
}

/**
 * Formats a Date as `DD-MM-YYYY`.
 * @example formatDate(new Date('2026-06-29')) // → '29-06-2026'
 */
export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Formats a Date as `HH:MM:SS` (24-hour, local time).
 * @example formatTime(new Date()) // → '10:20:15'
 */
export function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Formats a Date as `YYYY-MM-DD` (ISO date portion, local time).
 * Used as a stable, sortable key for day-change detection.
 */
export function toISODate(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Adds `days` to a Date and returns a new Date (does not mutate the input).
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Computes the start of the current 7-day log window.
 *
 * Logic: windows are fixed-width starting from a stable epoch (2000-01-03,
 * a Monday), so week boundaries are always the same regardless of when the
 * logger first starts. Callers never need to store state between restarts.
 *
 * @returns The start Date of the 7-day window that contains `now`.
 */
export function getWeekStart(now: Date): Date {
  // Epoch anchor: 2000-01-03 (Monday). Any fixed Monday works.
  const EPOCH = new Date('2000-01-03T00:00:00.000');
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msSinceEpoch = nowMidnight.getTime() - EPOCH.getTime();
  const daysSinceEpoch = Math.floor(msSinceEpoch / 86_400_000);
  const weekIndex = Math.floor(daysSinceEpoch / 7);
  const weekStartMs = EPOCH.getTime() + weekIndex * 7 * 86_400_000;
  return new Date(weekStartMs);
}

/**
 * Builds the log file name for the 7-day window containing `now`.
 * @example getLogFileName(new Date('2026-06-29')) // → '2026-06-29_to_2026-07-05.log'
 */
export function getLogFileName(now: Date): string {
  const start = getWeekStart(now);
  const end = addDays(start, 6);
  const fmt = (d: Date): string => {
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  return `${fmt(start)}_to_${fmt(end)}.log`;
}

/**
 * Returns true when `now` falls in a different 7-day window than `fileDate`.
 *
 * @param fileDate - The `weekStart` stored in WriterState (ISO `YYYY-MM-DD`).
 * @param now      - The current Date.
 */
export function isNewWeek(fileDate: string, now: Date): boolean {
  const currentStart = toISODate(getWeekStart(now));
  return fileDate !== currentStart;
}
