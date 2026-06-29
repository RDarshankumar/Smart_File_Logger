/**
 * @file tests/logger.test.ts
 * @description Integration tests for the SmartLogger and createLogger factory.
 */

import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { createLogger } from '../src/index';
import type { HttpRequest, HttpResponse, NextFunction } from '../src/types';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sfl-logger-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ─── createLogger ─────────────────────────────────────────────────────────────

describe('createLogger', () => {
  it('returns an object with all 5 log methods and middleware', () => {
    const logger = createLogger({ logDir: tmpDir, console: false });
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.success).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.middleware).toBe('function');
  });

  it('throws RangeError for invalid retentionWeeks', () => {
    expect(() => createLogger({ retentionWeeks: 0 })).toThrow(RangeError);
  });
});

// ─── File output ─────────────────────────────────────────────────────────────

describe('file output (text mode)', () => {
  it('writes log entries to a file inside logDir', async () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: true, json: false });

    await logger.info('Server Started');
    await logger.error('DB Failed', { host: 'localhost' });

    // Give the write-queue time to flush.
    await new Promise<void>((r) => setTimeout(r, 300));

    const files = await fs.readdir(tmpDir);
    expect(files.length).toBeGreaterThan(0);

    const logFile = files.find((f) => f.endsWith('.log'));
    expect(logFile).toBeDefined();

    const content = await fs.readFile(path.join(tmpDir, logFile!), 'utf8');
    expect(content).toContain('Server Started');
    expect(content).toContain('DB Failed');
    expect(content).toContain('INFO');
    expect(content).toContain('ERROR');
  });

  it('writes the day separator once per date', async () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: true, json: false });

    await logger.info('First');
    await logger.info('Second');

    await new Promise<void>((r) => setTimeout(r, 300));

    const files = await fs.readdir(tmpDir);
    const logFile = files.find((f) => f.endsWith('.log'))!;
    const content = await fs.readFile(path.join(tmpDir, logFile), 'utf8');

    // The separator block contains exactly 2 lines of ===
    const separatorCount = (content.match(/={20,}/g) ?? []).length;
    expect(separatorCount).toBe(2);
  });
});

describe('file output (json mode)', () => {
  it('writes valid NDJSON entries', async () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: true, json: true });

    await logger.info('hello');
    await logger.warn('careful');

    await new Promise<void>((r) => setTimeout(r, 300));

    const files = await fs.readdir(tmpDir);
    const logFile = files.find((f) => f.endsWith('.log'))!;
    const content = await fs.readFile(path.join(tmpDir, logFile), 'utf8');

    const lines = content.trim().split('\n').filter((l) => l.trim());
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});

// ─── Console output ───────────────────────────────────────────────────────────

describe('console output', () => {
  it('does not throw when console is enabled', async () => {
    const logger = createLogger({ logDir: tmpDir, console: true, file: false });
    await expect(logger.info('test')).resolves.not.toThrow();
  });
});

// ─── All log levels ───────────────────────────────────────────────────────────

describe('all log levels', () => {
  const levels = ['info', 'success', 'warn', 'error', 'debug'] as const;

  for (const level of levels) {
    it(`logger.${level}() writes the correct level label`, async () => {
      const logger = createLogger({ logDir: tmpDir, console: false, file: true, json: false });
      await logger[level](`Test ${level}`);
      await new Promise<void>((r) => setTimeout(r, 300));

      const files = await fs.readdir(tmpDir);
      const logFile = files.find((f) => f.endsWith('.log'))!;
      const content = await fs.readFile(path.join(tmpDir, logFile), 'utf8');
      expect(content).toContain(level.toUpperCase());
    });
  }
});

// ─── Metadata ────────────────────────────────────────────────────────────────

describe('metadata', () => {
  it('serialises metadata inline in text mode', async () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: true, json: false });
    await logger.error('DB Error', { host: 'localhost', port: 5432 });
    await new Promise<void>((r) => setTimeout(r, 300));

    const files = await fs.readdir(tmpDir);
    const logFile = files.find((f) => f.endsWith('.log'))!;
    const content = await fs.readFile(path.join(tmpDir, logFile), 'utf8');
    expect(content).toContain('"host":"localhost"');
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────

describe('middleware()', () => {
  it('calls next() immediately', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const mw = logger.middleware();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    const req: HttpRequest = {
      method: 'GET',
      url: '/health',
      ip: '127.0.0.1',
      headers: {},
    };

    let finishCallback: (() => void) | undefined;
    const res: HttpResponse = {
      statusCode: 200,
      on(_event: string, listener: () => void) {
        finishCallback = listener;
        return this;
      },
    };

    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Simulate response finish.
    finishCallback?.();
  });

  it('logs ERROR level for 5xx responses', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const errorSpy = jest.spyOn(logger, 'error');
    const mw = logger.middleware();

    const req: HttpRequest = { method: 'POST', url: '/api/data', headers: {} };
    let finishCb: (() => void) | undefined;
    const res: HttpResponse = {
      statusCode: 500,
      on(_event: string, listener: () => void) {
        finishCb = listener;
        return this;
      },
    };

    mw(req, res, () => undefined);
    finishCb?.();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message] = errorSpy.mock.calls[0]!;
    expect(message).toContain('POST');
    expect(message).toContain('500');
  });

  it('logs WARN level for 4xx responses', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const warnSpy = jest.spyOn(logger, 'warn');
    const mw = logger.middleware();

    const req: HttpRequest = { method: 'GET', url: '/missing', headers: {} };
    let finishCb: (() => void) | undefined;
    const res: HttpResponse = {
      statusCode: 404,
      on(_event: string, listener: () => void) {
        finishCb = listener;
        return this;
      },
    };

    mw(req, res, () => undefined);
    finishCb?.();

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
