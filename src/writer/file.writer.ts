/**
 * @file src/writer/file.writer.ts
 * @description Async file writer with weekly rotation, day-separator tracking,
 * and a serial write-queue that prevents interleaved writes without blocking
 * the event loop. All I/O errors are caught and swallowed so the host app
 * never crashes because of a logging failure.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { LoggerConfig, WriterState } from '../types/index.js';
import { getLogFileName, getWeekStart, toISODate } from '../utils/date.js';

// ─── Write Queue ──────────────────────────────────────────────────────────────

/**
 * A minimal async FIFO queue that serialises concurrent write calls.
 * Each call enqueues a thunk; the thunk runs only after the previous one
 * resolves. This avoids interleaved writes without ever blocking the event loop.
 */
export class WriteQueue {
  private queue: Promise<void> = Promise.resolve();

  /**
   * Enqueues `task` to run after all previously enqueued tasks complete.
   * @param task - Async function that performs a single write operation.
   */
  enqueue(task: () => Promise<void>): void {
    this.queue = this.queue.then(task).catch(() => {
      /* swallow to keep the queue alive */
    });
  }
}

// ─── File Writer ──────────────────────────────────────────────────────────────

/**
 * Ensures the log directory exists.
 * Uses `recursive: true` so intermediate directories are created automatically.
 * Safe to call multiple times — no-ops if the directory already exists.
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Appends `content` to the file at `filePath`.
 * Creates the file if it does not exist.
 */
async function appendToFile(filePath: string, content: string): Promise<void> {
  await fs.appendFile(filePath, content, { encoding: 'utf8' });
}

/**
 * Builds an initial `WriterState` for the current moment.
 * Called once during logger construction and again after each week rotation.
 */
export function buildInitialState(now: Date, logDir: string): WriterState {
  const weekStart = getWeekStart(now);
  return {
    currentFilePath: path.join(logDir, getLogFileName(now)),
    lastWrittenDate: '',
    weekStart: toISODate(weekStart),
  };
}

/**
 * Determines whether a new 7-day file should be started.
 */
export function needsWeekRotation(state: WriterState, now: Date): boolean {
  const currentWeekStart = toISODate(getWeekStart(now));
  return state.weekStart !== currentWeekStart;
}

/**
 * Determines whether a day-separator should be prepended to the next write.
 * Returns `true` the very first time a date is written in a new file,
 * and whenever the calendar date has changed since the last write.
 */
export function needsDaySeparator(state: WriterState, isoDate: string): boolean {
  return state.lastWrittenDate !== isoDate;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Parameters for a single write operation. */
export interface WriteParams {
  /** Text to write to the file (may include a leading day-separator). */
  content: string;

  /** ISO date of this entry — used to track day changes. */
  isoDate: string;

  /** Whether to rotate to a new weekly file before writing. */
  rotate: boolean;

  /** New weekly file path (only relevant when `rotate` is true). */
  newFilePath: string;

  /** New week-start ISO date (only relevant when `rotate` is true). */
  newWeekStart: string;
}

/**
 * FileWriter encapsulates all disk I/O for the logger.
 * - Maintains mutable `WriterState` (current file path, last date written).
 * - Serialises all writes through `WriteQueue`.
 * - Guarantees the log directory exists before any write.
 * - Never throws — all errors are caught and optionally reported via `onError`.
 */
export class FileWriter {
  private readonly config: Readonly<LoggerConfig>;
  private state: WriterState;
  private readonly queue: WriteQueue;
  private dirReady = false;

  constructor(config: Readonly<LoggerConfig>) {
    this.config = config;
    this.state = buildInitialState(new Date(), config.logDir);
    this.queue = new WriteQueue();
  }

  /**
   * Returns the path of the currently active log file.
   * Useful for diagnostics and tests.
   */
  get currentFilePath(): string {
    return this.state.currentFilePath;
  }

  /**
   * Returns the ISO week-start date of the current log file.
   */
  get weekStart(): string {
    return this.state.weekStart;
  }

  /**
   * Returns the last written ISO date (YYYY-MM-DD).
   * An empty string means nothing has been written yet.
   */
  get lastWrittenDate(): string {
    return this.state.lastWrittenDate;
  }

  /**
   * Writes a prepared content string to disk.
   * Rotation and day-separator logic must be resolved by the caller (Logger)
   * before calling this method — the writer simply appends.
   *
   * @param isoDate     - Calendar date of this entry (`YYYY-MM-DD`).
   * @param content     - The full string to append to the log file.
   * @param rotate      - Replace `currentFilePath` with `newFilePath` first.
   * @param newFilePath - Target file path after rotation.
   * @param newWeekStart- New week-start ISO date after rotation.
   * @param onError     - Optional callback invoked when a write fails.
   */
  write(
    isoDate: string,
    content: string,
    rotate: boolean,
    newFilePath: string,
    newWeekStart: string,
    onError?: (err: unknown) => void,
  ): void {
    this.queue.enqueue(async () => {
      try {
        if (!this.dirReady) {
          await ensureDir(this.config.logDir);
          this.dirReady = true;
        }

        if (rotate) {
          this.state = {
            currentFilePath: newFilePath,
            lastWrittenDate: '',
            weekStart: newWeekStart,
          };
        }

        await appendToFile(this.state.currentFilePath, content);
        this.state.lastWrittenDate = isoDate;
      } catch (err: unknown) {
        onError?.(err);
      }
    });
  }
}
