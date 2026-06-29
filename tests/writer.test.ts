/**
 * @file tests/writer.test.ts
 * @description Unit tests for FileWriter and its helpers.
 */

import {
  FileWriter,
  WriteQueue,
  buildInitialState,
  needsWeekRotation,
  needsDaySeparator,
} from '../src/writer';
import { toISODate, getWeekStart, getLogFileName } from '../src/utils/date';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// ─── WriteQueue ───────────────────────────────────────────────────────────────

describe('WriteQueue', () => {
  it('executes tasks in order', async () => {
    const queue = new WriteQueue();
    const results: number[] = [];

    queue.enqueue(async () => {
      await new Promise<void>((r) => setTimeout(r, 10));
      results.push(1);
    });
    queue.enqueue(async () => {
      results.push(2);
    });
    queue.enqueue(async () => {
      results.push(3);
    });

    // Wait for the queue to drain by appending a sentinel task.
    await new Promise<void>((resolve) => {
      queue.enqueue(async () => {
        resolve();
      });
    });

    expect(results).toEqual([1, 2, 3]);
  });

  it('continues processing after a failing task', async () => {
    const queue = new WriteQueue();
    const results: string[] = [];

    queue.enqueue(async () => {
      throw new Error('boom');
    });
    queue.enqueue(async () => {
      results.push('after-error');
    });

    await new Promise<void>((resolve) => {
      queue.enqueue(async () => resolve());
    });

    expect(results).toContain('after-error');
  });
});

// ─── buildInitialState ────────────────────────────────────────────────────────

describe('buildInitialState', () => {
  it('sets currentFilePath inside logDir', () => {
    const now = new Date('2026-06-29T10:00:00');
    const state = buildInitialState(now, './logs');
    expect(state.currentFilePath).toContain('logs');
    expect(state.currentFilePath.endsWith('.log')).toBe(true);
  });

  it('sets lastWrittenDate to empty string', () => {
    const state = buildInitialState(new Date(), './logs');
    expect(state.lastWrittenDate).toBe('');
  });

  it('sets weekStart to ISO date of the week start', () => {
    const now = new Date('2026-07-02T10:00:00'); // Thursday
    const state = buildInitialState(now, './logs');
    const expected = toISODate(getWeekStart(now));
    expect(state.weekStart).toBe(expected);
  });
});

// ─── needsWeekRotation ────────────────────────────────────────────────────────

describe('needsWeekRotation', () => {
  it('returns false when same week', () => {
    const now = new Date('2026-06-29T10:00:00');
    const state = buildInitialState(now, './logs');
    expect(needsWeekRotation(state, now)).toBe(false);
  });

  it('returns true when a new week has started', () => {
    const oldNow = new Date('2026-06-29T10:00:00');
    const state = buildInitialState(oldNow, './logs');
    const newNow = new Date('2026-07-06T10:00:00'); // next week
    expect(needsWeekRotation(state, newNow)).toBe(true);
  });
});

// ─── needsDaySeparator ────────────────────────────────────────────────────────

describe('needsDaySeparator', () => {
  it('returns true when lastWrittenDate is empty (first write)', () => {
    const state = { currentFilePath: 'x.log', lastWrittenDate: '', weekStart: '2026-06-29' };
    expect(needsDaySeparator(state, '2026-06-29')).toBe(true);
  });

  it('returns false when same date as last write', () => {
    const state = {
      currentFilePath: 'x.log',
      lastWrittenDate: '2026-06-29',
      weekStart: '2026-06-29',
    };
    expect(needsDaySeparator(state, '2026-06-29')).toBe(false);
  });

  it('returns true when date has changed', () => {
    const state = {
      currentFilePath: 'x.log',
      lastWrittenDate: '2026-06-29',
      weekStart: '2026-06-29',
    };
    expect(needsDaySeparator(state, '2026-06-30')).toBe(true);
  });
});

// ─── FileWriter integration ───────────────────────────────────────────────────

describe('FileWriter (integration)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sfl-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates the log directory and writes content', async () => {
    const config = {
      logDir: path.join(tmpDir, 'nested', 'logs'),
      retentionWeeks: 4,
      console: false,
      file: true,
      json: false,
    };

    const writer = new FileWriter(config);
    const isoDate = toISODate(new Date());
    const weekStart = toISODate(getWeekStart(new Date()));
    const filePath = path.join(config.logDir, getLogFileName(new Date()));

    let done = false;
    writer.write(isoDate, 'hello world\n', false, filePath, weekStart, (err) => {
      throw err;
    });

    // Drain the queue.
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    done = true;

    const content = await fs.readFile(writer.currentFilePath, 'utf8');
    expect(content).toContain('hello world');
    expect(done).toBe(true);
  });

  it('does not throw when the directory cannot be created (error callback fires)', async () => {
    // Provide an impossible path (file exists where dir should be).
    const blockerFile = path.join(tmpDir, 'blocker');
    await fs.writeFile(blockerFile, 'i am a file, not a dir');

    const config = {
      logDir: path.join(blockerFile, 'logs'), // dir path inside a file — will fail
      retentionWeeks: 4,
      console: false,
      file: true,
      json: false,
    };

    const errors: unknown[] = [];
    const writer = new FileWriter(config);
    writer.write('2026-06-29', 'test\n', false, 'x.log', '2026-06-29', (err) => {
      errors.push(err);
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    expect(errors.length).toBeGreaterThan(0);
  });
});
