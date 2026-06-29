/**
 * @file src/middleware/http.middleware.ts
 * @description Express/Connect-compatible HTTP request-logging middleware factory.
 *
 * The middleware hooks into the `res.on('finish')` event so that it always
 * captures the final status code (which Express may not set until after the
 * route handler runs).
 *
 * Logged fields per request:
 *  - HTTP method
 *  - URL / path
 *  - Status code
 *  - Response time (ms)
 *  - Client IP (honours X-Forwarded-For when present)
 *
 * Level mapping:
 *  - 5xx → ERROR
 *  - 4xx → WARN
 *  - 2xx / 3xx → INFO
 */

import type { Logger, HttpRequest, HttpResponse, NextFunction, LogLevel } from '../types/index.js';

/**
 * Options that fine-tune middleware behaviour.
 */
export interface MiddlewareOptions {
  /**
   * When `true`, skip logging for requests where `res.statusCode < 400`.
   * Useful in high-traffic services to keep logs focused on anomalies.
   * Defaults to `false`.
   */
  errorsOnly?: boolean;

  /**
   * Custom function to extract the client IP from a request.
   * If omitted, the middleware uses `req.ip`, `req.socket.remoteAddress`,
   * or the `X-Forwarded-For` header (in that order).
   */
  getIp?: (req: HttpRequest) => string;
}

/**
 * Extracts the best-available client IP from a request object.
 */
function resolveIp(req: HttpRequest): string {
  if (req.ip) {
    return req.ip;
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // X-Forwarded-For can be a comma-separated list; the first entry is the client.
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Maps an HTTP status code to the appropriate log level.
 */
function statusToLevel(statusCode: number): LogLevel {
  if (statusCode >= 500) {
    return 'ERROR';
  }
  if (statusCode >= 400) {
    return 'WARN';
  }
  return 'INFO';
}

/**
 * Creates an Express/Connect-compatible request-logging middleware.
 *
 * @param logger  - A `Logger` instance to write log entries to.
 * @param options - Optional middleware configuration.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createLogger, createHttpMiddleware } from 'smart-file-logger';
 *
 * const app = express();
 * const logger = createLogger({ logDir: './logs' });
 *
 * app.use(createHttpMiddleware(logger));
 * ```
 */
export function createHttpMiddleware(
  logger: Logger,
  options: MiddlewareOptions = {},
): (req: HttpRequest, res: HttpResponse, next: NextFunction) => void {
  const { errorsOnly = false, getIp = resolveIp } = options;

  return (req: HttpRequest, res: HttpResponse, next: NextFunction): void => {
    const startMs = Date.now();

    res.on('finish', () => {
      const statusCode = res.statusCode;

      if (errorsOnly && statusCode < 400) {
        return;
      }

      const method = req.method;
      const url = req.url ?? req.path ?? '/';
      const ip = getIp(req);
      const durationMs = Date.now() - startMs;
      const level = statusToLevel(statusCode);
      const message = `${method} ${url} ${statusCode} ${durationMs}ms`;

      void logger[level.toLowerCase() as Lowercase<LogLevel>](message, {
        ip,
        statusCode,
        durationMs,
        method,
        url,
      });
    });

    next();
  };
}
