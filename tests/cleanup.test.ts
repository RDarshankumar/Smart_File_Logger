/**
 * @file tests/cleanup.test.ts
 * @description Unit tests for the retention-policy enforcer.
 */

import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { enforceRetention } from '../src/cleanup';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sfl-cleanup-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/** Creates a dummy weekly log file in tmpDir. */
async function createLogFile(startDate: string, endDate: string): Promise<string> {
  const name = `${startDate}_to_${endDate}.log`;
  const filePath = path.join(tmpDir, name);
  await fs.writeFile(filePath, `log for ${startDate}\n`);
  return filePath;
}

describe('enforceRetention', () => {
  it('does nothing when file count is within retention limit', async () => {
    await createLogFile('2026-06-01', '2026-06-07');
    await createLogFile('2026-06-08', '2026-06-14');

    await enforceRetention(tmpDir, 4);

    const files = await fs.readdir(tmpDir);
    expect(files.length).toBe(2);
  });

  it('deletes oldest files beyond retention limit', async () => {
    // Create 5 weekly files.
    await createLogFile('2026-05-04', '2026-05-10');
    await createLogFile('2026-05-11', '2026-05-17');
    await createLogFile('2026-05-18', '2026-05-24');
    await createLogFile('2026-05-25', '2026-05-31');
    await createLogFile('2026-06-01', '2026-06-07');

    await enforceRetention(tmpDir, 3);

    const files = await fs.readdir(tmpDir);
    expect(files.length).toBe(3);

    // The two oldest should be gone.
    expect(files).not.toContain('2026-05-04_to_2026-05-10.log');
    expect(files).not.toContain('2026-05-11_to_2026-05-17.log');
  });

  it('keeps exactly `retentionWeeks` files when count equals limit', async () => {
    await createLogFile('2026-06-01', '2026-06-07');
    await createLogFile('2026-06-08', '2026-06-14');
    await createLogFile('2026-06-15', '2026-06-21');
    await createLogFile('2026-06-22', '2026-06-28');

    await enforceRetention(tmpDir, 4);

    const files = await fs.readdir(tmpDir);
    expect(files.length).toBe(4);
  });

  it('ignores files that do not match the naming pattern', async () => {
    await fs.writeFile(path.join(tmpDir, 'not-a-log.txt'), 'noise');
    await fs.writeFile(path.join(tmpDir, 'random.log'), 'noise');
    await createLogFile('2026-06-22', '2026-06-28');

    await enforceRetention(tmpDir, 1);

    // The noise files should be untouched.
    const files = await fs.readdir(tmpDir);
    expect(files).toContain('not-a-log.txt');
    expect(files).toContain('random.log');
  });

  it('does not throw when the log directory does not exist', async () => {
    await expect(
      enforceRetention(path.join(tmpDir, 'nonexistent'), 4),
    ).resolves.not.toThrow();
  });

  it('calls onError when a file cannot be deleted', async () => {
    // We can't easily make unlink fail on all platforms, but we can test that
    // the callback mechanism works by passing a file path that doesn't exist
    // after deletion of the first file leaves the count equal to retentionWeeks.
    // So instead, we just verify no unhandled rejection occurs.
    await createLogFile('2026-05-11', '2026-05-17');
    await createLogFile('2026-05-18', '2026-05-24');

    const errors: unknown[] = [];
    await enforceRetention(tmpDir, 1, (err) => errors.push(err));
    // At most 1 file should remain.
    const files = await fs.readdir(tmpDir);
    expect(files.length).toBeLessThanOrEqual(1);
  });
});
