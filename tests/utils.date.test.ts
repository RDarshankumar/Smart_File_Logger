/**
 * @file tests/utils.date.test.ts
 * @description Unit tests for date utility helpers.
 */

import {
  getDayName,
  formatDate,
  formatTime,
  toISODate,
  addDays,
  getWeekStart,
  getLogFileName,
  isNewWeek,
} from '../src/utils/date';

describe('getDayName', () => {
  it('returns Monday for 2026-06-29', () => {
    expect(getDayName(new Date('2026-06-29T10:00:00'))).toBe('Monday');
  });

  it('returns Sunday for 2026-06-28', () => {
    expect(getDayName(new Date('2026-06-28T10:00:00'))).toBe('Sunday');
  });

  it('returns Saturday for 2026-07-04', () => {
    expect(getDayName(new Date('2026-07-04T10:00:00'))).toBe('Saturday');
  });
});

describe('formatDate', () => {
  it('formats as DD-MM-YYYY', () => {
    expect(formatDate(new Date('2026-06-29T00:00:00'))).toBe('29-06-2026');
  });

  it('pads single-digit day and month', () => {
    expect(formatDate(new Date('2026-01-05T00:00:00'))).toBe('05-01-2026');
  });
});

describe('formatTime', () => {
  it('formats as HH:MM:SS', () => {
    const d = new Date('2026-06-29T00:00:00');
    d.setHours(10, 20, 15);
    const result = formatTime(d);
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

describe('toISODate', () => {
  it('returns YYYY-MM-DD', () => {
    expect(toISODate(new Date('2026-06-29T15:00:00'))).toBe('2026-06-29');
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    const result = addDays(new Date('2026-06-29'), 6);
    expect(toISODate(result)).toBe('2026-07-05');
  });

  it('does not mutate the original date', () => {
    const original = new Date('2026-06-29');
    addDays(original, 10);
    expect(toISODate(original)).toBe('2026-06-29');
  });

  it('handles adding 0 days', () => {
    const result = addDays(new Date('2026-06-29'), 0);
    expect(toISODate(result)).toBe('2026-06-29');
  });
});

describe('getWeekStart', () => {
  it('returns a Monday for a date mid-week', () => {
    const ws = getWeekStart(new Date('2026-07-02T10:00:00')); // Thursday
    expect(ws.getDay()).toBe(1); // Monday
  });

  it('returns the same Monday for every day in the week', () => {
    const dates = [
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ];
    const starts = dates.map((d) => toISODate(getWeekStart(new Date(d))));
    expect(new Set(starts).size).toBe(1);
  });

  it('returns a different Monday for the following week', () => {
    const week1 = toISODate(getWeekStart(new Date('2026-07-05')));
    const week2 = toISODate(getWeekStart(new Date('2026-07-06')));
    expect(week1).not.toBe(week2);
  });
});

describe('getLogFileName', () => {
  it('returns correct filename for 2026-06-29', () => {
    const name = getLogFileName(new Date('2026-06-29T10:00:00'));
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.log$/);
  });

  it('filename spans exactly 6 days', () => {
    const name = getLogFileName(new Date('2026-06-29T10:00:00'));
    const [startStr, endStr] = name.replace('.log', '').split('_to_');
    const start = new Date(startStr!);
    const end = new Date(endStr!);
    const diffDays = (end.getTime() - start.getTime()) / 86_400_000;
    expect(diffDays).toBe(6);
  });

  it('all days in the same week produce the same filename', () => {
    const dates = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02'];
    const names = dates.map((d) => getLogFileName(new Date(d)));
    expect(new Set(names).size).toBe(1);
  });
});

describe('isNewWeek', () => {
  it('returns false when fileDate matches current week start', () => {
    const now = new Date('2026-06-30T10:00:00');
    const weekStart = toISODate(getWeekStart(now));
    expect(isNewWeek(weekStart, now)).toBe(false);
  });

  it('returns true when fileDate is from a previous week', () => {
    const oldWeekStart = '2026-06-22'; // previous week
    const now = new Date('2026-06-29T10:00:00');
    expect(isNewWeek(oldWeekStart, now)).toBe(true);
  });
});
