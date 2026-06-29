/**
 * @file src/logger/smart-logger.ts
 * @description Core logger implementation.
 *
 * Orchestration flow for each log call:
 *  1. Build a `LogEntry` from the message + metadata.
 *  2. Decide whether a week rotation is needed.
 *  3. Decide whether a day separator is needed.
 *  4. Format via `formatEntry()`.
 *  5. Print to console (if enabled).
 *  6. Enqueue a disk write (if enabled) via `FileWriter`.
 *  7. If a rotation just occurred, run `enforceRetention` in the background.
 *
 * The class never throws — all I/O errors are caught internally.
 */

import type { Logger, LogLevel, LogMetadata, LogEntry, HttpRequest, HttpResponse, NextFunction } from '../types/index.js';
import type { LoggerConfig } from '../config/index.js';
import { FileWriter, needsWeekRotation, needsDaySeparator } from '../writer/index.js';
import { formatEntry } from '../formatter/index.js';
import { enforceRetention } from '../cleanup/index.js';
import { getDayName, formatDate, formatTime, toISODate, getWeekStart, getLogFileName } from '../utils/date.js';
import { buildConsoleSeparator } from '../formatter/text.formatter.js';
import path from 'path';

export class SmartLogger implements Logger {
  private readonly config: Readonly<LoggerConfig>;
  private readonly writer: FileWriter;
  /** Optimistic cache of the last written ISO date — updated synchronously so
   *  rapid back-to-back calls don't both see an empty string and emit duplicates. */
  private lastKnownDate = '';
  private lastKnownWeekStart = '';

  constructor(config: Readonly<LoggerConfig>) {
    this.config = config;
    this.writer = new FileWriter(config);
    this.lastKnownWeekStart = this.writer.weekStart;
  }

  // ─── Public log methods ─────────────────────────────────────────────────────

  async info(message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('INFO', message, metadata);
  }

  async success(message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('SUCCESS', message, metadata);
  }

  async warn(message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('WARN', message, metadata);
  }

  async error(message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('ERROR', message, metadata);
  }

  async debug(message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('DEBUG', message, metadata);
  }

  // ─── Middleware factory ────────────────────────────────────────────────────

  /**
   * Returns an Express-compatible request-logging middleware.
   *
   * Logs: method, URL, status code, response time, and client IP.
   *
   * @example
   * ```ts
   * app.use(logger.middleware());
   * ```
   */
  middleware(): (req: HttpRequest, res: HttpResponse, next: NextFunction) => void {
    return (req: HttpRequest, res: HttpResponse, next: NextFunction): void => {
      const startMs = Date.now();
      const method = req.method;
      const url = req.url ?? req.path ?? '/';
      const ip =
        req.ip ??
        req.socket?.remoteAddress ??
        (req.headers['x-forwarded-for'] as string | undefined) ??
        'unknown';

      res.on('finish', () => {
        const durationMs = Date.now() - startMs;
        const status = res.statusCode;
        const level: LogLevel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
        const message = `${method} ${url} ${status} ${durationMs}ms`;
        const logMethod = this[level.toLowerCase() as Lowercase<LogLevel>].bind(this);

        void logMethod(message, { ip, statusCode: status, durationMs });
      });

      next();
    };
  }

  // ─── Internal orchestration ─────────────────────────────────────────────────

  /**
   * Core log dispatch. All five public methods delegate here.
   *
   * Marked `async` so callers can `await` it and be sure the console write
   * has occurred synchronously before the promise resolves.
   * The file write is intentionally fire-and-forget via the write queue.
   */
  private async log(level: LogLevel, message: string, metadata?: LogMetadata): Promise<void> {
    const now = new Date();
    const entry = this.buildEntry(level, message, now, metadata);
    const isoDate = toISODate(now);

    // ── Week rotation detection (synchronous via optimistic cache) ──
    const shouldRotate = needsWeekRotation(
      { currentFilePath: this.writer.currentFilePath, lastWrittenDate: this.lastKnownDate, weekStart: this.lastKnownWeekStart },
      now,
    );

    if (shouldRotate) {
      this.lastKnownDate = '';
      this.lastKnownWeekStart = toISODate(getWeekStart(now));
    }

    const showSeparator = needsDaySeparator(
      { currentFilePath: this.writer.currentFilePath, lastWrittenDate: this.lastKnownDate, weekStart: this.lastKnownWeekStart },
      isoDate,
    );

    // Update optimistic cache immediately so subsequent calls see the new date.
    this.lastKnownDate = isoDate;

    // ── Format ──
    const formatted = formatEntry(entry, showSeparator);

    // ── Console output ──
    if (this.config.console) {
      if (showSeparator) {
        process.stdout.write(buildConsoleSeparator(entry) + '\n');
      }
      process.stdout.write(formatted.consoleLine + '\n');
    }

    // ── File output ──
    if (this.config.file) {
      const line = this.config.json ? formatted.jsonLine + '\n' : formatted.daySeparator + formatted.textLine + '\n';

      const weekStart = toISODate(getWeekStart(now));
      const newFilePath = path.join(this.config.logDir, getLogFileName(now));

      this.writer.write(isoDate, line, shouldRotate, newFilePath, weekStart, (err) => {
        process.stderr.write(`[smart-file-logger] write error: ${String(err)}\n`);
      });

      // Enforce retention after a rotation (fire-and-forget, never throws).
      if (shouldRotate) {
        void enforceRetention(this.config.logDir, this.config.retentionWeeks, (err) => {
          process.stderr.write(`[smart-file-logger] cleanup error: ${String(err)}\n`);
        });
      }
    }
  }

  /**
   * Builds a fully-resolved `LogEntry` from raw inputs.
   */
  private buildEntry(
    level: LogLevel,
    message: string,
    now: Date,
    metadata?: LogMetadata,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: now.toISOString(),
      time: formatTime(now),
      date: formatDate(now),
      dayName: getDayName(now),
      level,
      message,
    };
    if (metadata !== undefined) {
      entry.metadata = metadata;
    }
    return entry;
  }
}
