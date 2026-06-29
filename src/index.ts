/**
 * @file src/index.ts
 * @description Public API surface for smart-file-logger.
 *
 * Everything a consumer needs is re-exported from here.
 * Internal implementation details (WriteQueue, FileWriter, etc.) are NOT
 * re-exported — this file is the stability boundary.
 *
 * @example Basic usage
 * ```ts
 * import { createLogger } from 'smart-file-logger';
 *
 * const logger = createLogger({ logDir: './logs', retentionWeeks: 4 });
 *
 * await logger.info('Server started');
 * await logger.error('DB failed', { host: 'localhost' });
 * ```
 *
 * @example Express middleware
 * ```ts
 * import express from 'express';
 * import { createLogger } from 'smart-file-logger';
 *
 * const app = express();
 * const logger = createLogger();
 *
 * app.use(logger.middleware());
 * ```
 *
 * @example Standalone middleware factory
 * ```ts
 * import { createLogger, createHttpMiddleware } from 'smart-file-logger';
 *
 * const logger = createLogger();
 * app.use(createHttpMiddleware(logger, { errorsOnly: true }));
 * ```
 */

import { SmartLogger } from './logger/index.js';
import { resolveConfig } from './config/index.js';
import type { LoggerOptions, Logger } from './types/index.js';

// ─── Factory function ─────────────────────────────────────────────────────────

/**
 * Creates and returns a new `Logger` instance.
 *
 * All options are optional — calling `createLogger()` with no arguments gives
 * you a logger that writes to `./logs` with a 4-week retention, console output
 * enabled, and human-readable text format.
 *
 * @param options - Partial configuration. Unspecified fields use defaults.
 * @returns A fully configured `Logger` instance.
 *
 * @throws {RangeError} If `retentionWeeks` is outside the range 1–52.
 *
 * @example
 * ```ts
 * const logger = createLogger({
 *   logDir: './logs',
 *   retentionWeeks: 4,
 *   console: true,
 *   file: true,
 *   json: false,
 * });
 * ```
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const config = resolveConfig(options);
  return new SmartLogger(config);
}

// ─── Middleware factory (standalone) ─────────────────────────────────────────

export { createHttpMiddleware } from './middleware/index.js';
export type { MiddlewareOptions } from './middleware/index.js';

// ─── Type exports ─────────────────────────────────────────────────────────────

export type {
  Logger,
  LogLevel,
  LogMetadata,
  LogEntry,
  LoggerConfig,
  LoggerOptions,
  FormattedEntry,
  WriterState,
  HttpRequest,
  HttpResponse,
  NextFunction,
} from './types/index.js';
