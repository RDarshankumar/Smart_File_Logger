/**
 * @file src/formatter/text.formatter.ts
 * @description Builds human-readable log lines and day separators.
 *
 * Example output:
 *   [10:20:15] INFO     Server Started
 *   [10:20:15] ERROR    Database Error  {"host":"localhost"}
 *
 * Day separator:
 *   =========================================================
 *   Monday | 29-06-2026
 *   =========================================================
 */

import type { LogEntry, FormattedEntry } from '../types/index.js';
import { colorize, bold } from '../utils/color.js';

const SEPARATOR = '=========================================================';

/** Width used to left-pad the level label so columns align. */
const LEVEL_PAD = 7;

/**
 * Pads a log level string to `LEVEL_PAD` characters.
 * Keeps log entries visually aligned regardless of level name length.
 */
function padLevel(level: string): string {
  return level.padEnd(LEVEL_PAD);
}

/**
 * Serialises optional metadata to a compact inline string.
 * Returns an empty string when metadata is absent or empty.
 */
function formatMetadata(metadata?: Record<string, unknown>): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }
  return `  ${JSON.stringify(metadata)}`;
}

/**
 * Builds the plain-text line written to disk.
 * Format: `[HH:MM:SS] LEVEL   Message  {metadata}`
 */
export function buildTextLine(entry: LogEntry): string {
  const meta = formatMetadata(entry.metadata);
  return `[${entry.time}] ${padLevel(entry.level)} ${entry.message}${meta}`;
}

/**
 * Builds the ANSI-coloured line printed to the console.
 * The level label and message are coloured; brackets and metadata are plain.
 */
export function buildConsoleLine(entry: LogEntry): string {
  const meta = formatMetadata(entry.metadata);
  const level = colorize(entry.level, padLevel(entry.level));
  const message = colorize(entry.level, entry.message);
  return `[${entry.time}] ${level} ${message}${meta}`;
}

/**
 * Builds the day-separator block.
 * Only generated when the writer detects a date change.
 *
 * ```
 * =========================================================
 * Monday | 29-06-2026
 * =========================================================
 * ```
 */
export function buildDaySeparator(entry: LogEntry): string {
  return `\n${SEPARATOR}\n${entry.dayName} | ${entry.date}\n${SEPARATOR}\n\n`;
}

/**
 * Builds the console-friendly day-separator (bold header + separator lines).
 */
export function buildConsoleSeparator(entry: LogEntry): string {
  return `\n${bold(SEPARATOR)}\n${bold(`${entry.dayName} | ${entry.date}`)}\n${bold(SEPARATOR)}\n`;
}

/**
 * Builds the JSON line written to disk in json-mode.
 * Each entry is a single line (NDJSON) so log files remain grep-friendly.
 */
export function buildJsonLine(entry: LogEntry): string {
  const record: Record<string, unknown> = {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
  };
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    record['metadata'] = entry.metadata;
  }
  return JSON.stringify(record);
}

/**
 * Master formatter: produces every representation of a log entry at once.
 * Callers decide which representation(s) to actually use.
 *
 * @param entry          - The resolved log entry.
 * @param isNewDay       - Whether this entry starts a new calendar day.
 */
export function formatEntry(entry: LogEntry, isNewDay: boolean): FormattedEntry {
  return {
    textLine: buildTextLine(entry),
    jsonLine: buildJsonLine(entry),
    consoleLine: buildConsoleLine(entry),
    daySeparator: isNewDay ? buildDaySeparator(entry) : '',
  };
}
