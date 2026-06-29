/**
 * @file src/config/index.ts
 * @description Resolves and validates logger configuration.
 * Merges caller-supplied options with `DEFAULT_CONFIG`, then freezes
 * the result so downstream modules cannot mutate shared config.
 */

import type { LoggerConfig, LoggerOptions } from '../types/index.js';
import { DEFAULT_CONFIG } from './defaults.js';

/**
 * Merges partial user options with defaults and returns a frozen config object.
 *
 * @param options - Partial logger options supplied by the caller.
 * @returns A fully resolved, immutable `LoggerConfig`.
 *
 * @example
 * ```ts
 * const config = resolveConfig({ logDir: './my-logs', retentionWeeks: 2 });
 * ```
 */
export function resolveConfig(options: LoggerOptions = {}): Readonly<LoggerConfig> {
  const merged: LoggerConfig = {
    logDir: options.logDir ?? DEFAULT_CONFIG.logDir,
    retentionWeeks:
      options.retentionWeeks !== undefined
        ? validateRetentionWeeks(options.retentionWeeks)
        : DEFAULT_CONFIG.retentionWeeks,
    console: options.console ?? DEFAULT_CONFIG.console,
    file: options.file ?? DEFAULT_CONFIG.file,
    json: options.json ?? DEFAULT_CONFIG.json,
  };

  return Object.freeze(merged);
}

/**
 * Validates the `retentionWeeks` value.
 * Must be a positive integer between 1 and 52.
 */
function validateRetentionWeeks(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 52) {
    throw new RangeError(
      `[smart-file-logger] retentionWeeks must be an integer between 1 and 52, got: ${value}`,
    );
  }
  return value;
}

export { DEFAULT_CONFIG } from './defaults.js';
export type { LoggerConfig, LoggerOptions };
