/**
 * @file src/types/index.ts
 * @description Central type definitions for smart-file-logger.
 * All interfaces, enums, and type aliases live here — no scattered inline types.
 */

// ─── Log Levels ──────────────────────────────────────────────────────────────

/** Supported log severity levels. */
export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';

// ─── Logger Configuration ────────────────────────────────────────────────────

/**
 * Options accepted by `createLogger()`.
 * Every field has a sensible default so the user can pass an empty object.
 */
export interface LoggerConfig {
  /** Directory where log files are written. Defaults to `"./logs"`. */
  logDir: string;

  /** Number of weekly log files to keep before deleting older ones. Defaults to `4`. */
  retentionWeeks: number;

  /** Whether to print logs to the console. Defaults to `true`. */
  console: boolean;

  /** Whether to write logs to disk. Defaults to `true`. */
  file: boolean;

  /**
   * When `true`, each log entry is stored as a single-line JSON object.
   * When `false`, logs use the human-readable text format.
   * Defaults to `false`.
   */
  json: boolean;
}

/** Partial version used when constructing a logger — all fields optional. */
export type LoggerOptions = Partial<LoggerConfig>;

// ─── Log Entry ───────────────────────────────────────────────────────────────

/** Optional arbitrary metadata attached to any log call. */
export type LogMetadata = Record<string, unknown>;

/** A fully-resolved log entry ready for formatting or serialisation. */
export interface LogEntry {
  /** ISO-8601 timestamp at which the entry was created. */
  timestamp: string;

  /** Wall-clock time string, e.g. `"10:20:15"`. */
  time: string;

  /** Calendar date string, e.g. `"29-06-2026"`. */
  date: string;

  /** Day-of-week name, e.g. `"Monday"`. */
  dayName: string;

  /** Severity level. */
  level: LogLevel;

  /** The human-readable message. */
  message: string;

  /** Optional structured metadata. */
  metadata?: LogMetadata;
}

// ─── Formatted Output ────────────────────────────────────────────────────────

/** Result returned by the formatter — one string per output target. */
export interface FormattedEntry {
  /** Plain-text line for the log file (human-readable format). */
  textLine: string;

  /** JSON string for the log file (json mode). */
  jsonLine: string;

  /** ANSI-coloured string for the console. */
  consoleLine: string;

  /** Day-separator block (only populated when the date has changed). */
  daySeparator: string;
}

// ─── Writer State ────────────────────────────────────────────────────────────

/** Internal state tracked by the file writer. */
export interface WriterState {
  /** Absolute path to the currently active log file. */
  currentFilePath: string;

  /** The ISO date (`YYYY-MM-DD`) of the last written entry — used to detect day changes. */
  lastWrittenDate: string;

  /** Start date of the current 7-day window (ISO `YYYY-MM-DD`). */
  weekStart: string;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/** Minimal request shape the middleware needs. Works with Express or any compatible framework. */
export interface HttpRequest {
  method: string;
  url?: string;
  path?: string;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers: Record<string, string | string[] | undefined>;
}

/** Minimal response shape the middleware needs. */
export interface HttpResponse {
  statusCode: number;
  on(event: string, listener: () => void): this;
}

/** Signature of a framework-agnostic `next()` function. */
export type NextFunction = (err?: unknown) => void;

// ─── Public Logger Interface ──────────────────────────────────────────────────

/** The public API surface returned by `createLogger()`. */
export interface Logger {
  /**
   * Log an informational message.
   * @param message - Human-readable message text.
   * @param metadata - Optional structured key/value data.
   */
  info(message: string, metadata?: LogMetadata): Promise<void>;

  /**
   * Log a success message.
   * @param message - Human-readable message text.
   * @param metadata - Optional structured key/value data.
   */
  success(message: string, metadata?: LogMetadata): Promise<void>;

  /**
   * Log a warning message.
   * @param message - Human-readable message text.
   * @param metadata - Optional structured key/value data.
   */
  warn(message: string, metadata?: LogMetadata): Promise<void>;

  /**
   * Log an error message.
   * @param message - Human-readable message text.
   * @param metadata - Optional structured key/value data.
   */
  error(message: string, metadata?: LogMetadata): Promise<void>;

  /**
   * Log a debug message.
   * @param message - Human-readable message text.
   * @param metadata - Optional structured key/value data.
   */
  debug(message: string, metadata?: LogMetadata): Promise<void>;

  /**
   * Returns an Express-compatible request-logging middleware.
   * Usage: `app.use(logger.middleware())`
   */
  middleware(): (req: HttpRequest, res: HttpResponse, next: NextFunction) => void;
}
