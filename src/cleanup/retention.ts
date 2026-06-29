/**
 * @file src/cleanup/retention.ts
 * @description Retention-policy enforcer.
 *
 * Scans `logDir` for files matching the weekly filename pattern
 * (`YYYY-MM-DD_to_YYYY-MM-DD.log`), sorts them by start-date (oldest first),
 * and deletes any that exceed the configured `retentionWeeks` limit.
 *
 * Called automatically after every week rotation — never on every log write
 * so there is zero overhead during normal operation.
 */

import { promises as fs } from 'fs';
import path from 'path';

/** Regex that matches `2026-06-29_to_2026-07-05.log` and captures the start-date. */
const LOG_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})_to_\d{4}-\d{2}-\d{2}\.log$/;

/**
 * A parsed representation of a weekly log file found on disk.
 */
interface LogFileEntry {
  /** Absolute path to the file. */
  filePath: string;

  /** Start-date parsed from the filename — used for age comparison. */
  startDate: Date;
}

/**
 * Lists all weekly log files in `logDir`, sorted from oldest to newest.
 * Files that do not match the naming pattern are silently ignored.
 *
 * @param logDir - Absolute or relative path to the log directory.
 * @returns Sorted array of `LogFileEntry` objects (oldest first).
 */
async function listLogFiles(logDir: string): Promise<LogFileEntry[]> {
  let names: string[];
  try {
    names = await fs.readdir(logDir);
  } catch {
    // Directory may not exist yet on first run — nothing to clean up.
    return [];
  }

  const entries: LogFileEntry[] = [];

  for (const name of names) {
    const match = LOG_FILE_PATTERN.exec(name);
    if (!match || !match[1]) {
      continue;
    }
    const startDate = new Date(match[1]);
    if (isNaN(startDate.getTime())) {
      continue;
    }
    entries.push({ filePath: path.join(logDir, name), startDate });
  }

  // Sort oldest → newest so we can easily slice from the front.
  entries.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return entries;
}

/**
 * Enforces the retention policy by deleting the oldest log files.
 *
 * @param logDir         - Path to the log directory.
 * @param retentionWeeks - Maximum number of weekly files to keep.
 * @param onError        - Optional error callback (never throws).
 *
 * @example
 * ```ts
 * await enforceRetention('./logs', 4);
 * ```
 */
export async function enforceRetention(
  logDir: string,
  retentionWeeks: number,
  onError?: (err: unknown) => void,
): Promise<void> {
  try {
    const files = await listLogFiles(logDir);

    if (files.length <= retentionWeeks) {
      return;
    }

    // Delete the oldest (files.length - retentionWeeks) files.
    const toDelete = files.slice(0, files.length - retentionWeeks);

    await Promise.all(
      toDelete.map(async (entry) => {
        try {
          await fs.unlink(entry.filePath);
        } catch (err: unknown) {
          onError?.(err);
        }
      }),
    );
  } catch (err: unknown) {
    onError?.(err);
  }
}
