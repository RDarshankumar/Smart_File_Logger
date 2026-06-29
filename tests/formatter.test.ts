/**
 * @file tests/formatter.test.ts
 * @description Unit tests for the text formatter.
 */

import { buildTextLine, buildJsonLine, buildDaySeparator, formatEntry } from '../src/formatter';
import type { LogEntry } from '../src/types';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: '2026-06-29T10:20:15.000Z',
    time: '10:20:15',
    date: '29-06-2026',
    dayName: 'Monday',
    level: 'INFO',
    message: 'Server Started',
    ...overrides,
  };
}

describe('buildTextLine', () => {
  it('formats a basic INFO entry', () => {
    const line = buildTextLine(makeEntry());
    expect(line).toMatch(/^\[10:20:15\] INFO\s+Server Started$/);
  });

  it('includes metadata as inline JSON', () => {
    const entry = makeEntry({
      level: 'ERROR',
      message: 'DB Error',
      metadata: { host: 'localhost' },
    });
    const line = buildTextLine(entry);
    expect(line).toContain('{"host":"localhost"}');
  });

  it('omits metadata section when metadata is empty object', () => {
    const entry = makeEntry({ metadata: {} });
    const line = buildTextLine(entry);
    expect(line).not.toContain('{');
  });

  it('pads level label to consistent width', () => {
    const info = buildTextLine(makeEntry({ level: 'INFO' }));
    const success = buildTextLine(makeEntry({ level: 'SUCCESS' }));
    // Both should have level label followed by exactly one space before message
    expect(info).toMatch(/INFO\s+Server Started/);
    expect(success).toMatch(/SUCCESS\s+Server Started/);
  });
});

describe('buildJsonLine', () => {
  it('returns valid JSON', () => {
    const line = buildJsonLine(makeEntry());
    expect(() => JSON.parse(line)).not.toThrow();
  });

  it('contains required fields', () => {
    const line = buildJsonLine(makeEntry());
    const obj = JSON.parse(line) as Record<string, unknown>;
    expect(obj).toHaveProperty('timestamp');
    expect(obj).toHaveProperty('level', 'INFO');
    expect(obj).toHaveProperty('message', 'Server Started');
  });

  it('includes metadata when present', () => {
    const entry = makeEntry({ metadata: { userId: 42 } });
    const line = buildJsonLine(entry);
    const obj = JSON.parse(line) as Record<string, unknown>;
    expect(obj).toHaveProperty('metadata');
    expect((obj['metadata'] as Record<string, unknown>)['userId']).toBe(42);
  });

  it('omits metadata field when absent', () => {
    const line = buildJsonLine(makeEntry());
    const obj = JSON.parse(line) as Record<string, unknown>;
    expect(obj).not.toHaveProperty('metadata');
  });
});

describe('buildDaySeparator', () => {
  it('contains the day name and date', () => {
    const sep = buildDaySeparator(makeEntry());
    expect(sep).toContain('Monday');
    expect(sep).toContain('29-06-2026');
  });

  it('contains the separator line of equals signs', () => {
    const sep = buildDaySeparator(makeEntry());
    expect(sep).toMatch(/={10,}/);
  });
});

describe('formatEntry', () => {
  it('returns all four fields', () => {
    const result = formatEntry(makeEntry(), false);
    expect(result).toHaveProperty('textLine');
    expect(result).toHaveProperty('jsonLine');
    expect(result).toHaveProperty('consoleLine');
    expect(result).toHaveProperty('daySeparator');
  });

  it('daySeparator is empty string when isNewDay is false', () => {
    const result = formatEntry(makeEntry(), false);
    expect(result.daySeparator).toBe('');
  });

  it('daySeparator is non-empty when isNewDay is true', () => {
    const result = formatEntry(makeEntry(), true);
    expect(result.daySeparator.length).toBeGreaterThan(0);
    expect(result.daySeparator).toContain('Monday');
  });
});
