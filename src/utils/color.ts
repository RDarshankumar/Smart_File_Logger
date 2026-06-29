/**
 * @file src/utils/color.ts
 * @description ANSI escape-code helpers for console coloring.
 * Uses only the 16-color standard palette — universally supported.
 * Falls back to plain text when the terminal does not support colors
 * (detected via NO_COLOR env-var and process.stdout.isTTY).
 */

import type { LogLevel } from '../types/index.js';

const RESET = '\x1b[0m';

const ANSI: Record<LogLevel, string> = {
  INFO: '\x1b[34m', // Blue
  SUCCESS: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  DEBUG: '\x1b[90m', // Gray (bright black)
};

/**
 * Returns `true` when the current environment supports ANSI colors.
 * Respects the `NO_COLOR` convention (https://no-color.org/).
 */
export function supportsColor(): boolean {
  if (process.env['NO_COLOR'] !== undefined) {
    return false;
  }
  return process.stdout.isTTY === true;
}

/**
 * Wraps `text` in ANSI color codes for the given log level.
 * Returns plain text when the terminal does not support colors.
 *
 * @param level - The log level determining the color.
 * @param text  - The string to colorize.
 */
export function colorize(level: LogLevel, text: string): string {
  if (!supportsColor()) {
    return text;
  }
  return `${ANSI[level]}${text}${RESET}`;
}

/**
 * Wraps `text` in bold ANSI codes.
 * Returns plain text when the terminal does not support colors.
 */
export function bold(text: string): string {
  if (!supportsColor()) {
    return text;
  }
  return `\x1b[1m${text}${RESET}`;
}
