/**
 * @file src/config/defaults.ts
 * @description Default values applied when the user omits a config field.
 */

import type { LoggerConfig } from '../types/index.js';

/** Frozen defaults — never mutate this object. */
export const DEFAULT_CONFIG: Readonly<LoggerConfig> = Object.freeze({
  logDir: './logs',
  retentionWeeks: 4,
  console: true,
  file: true,
  json: false,
});
