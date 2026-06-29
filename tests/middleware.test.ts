/**
 * @file tests/middleware.test.ts
 * @description Unit tests for the standalone createHttpMiddleware factory.
 */

import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { createHttpMiddleware } from '../src/middleware';
import { createLogger } from '../src/index';
import type { HttpRequest, HttpResponse, NextFunction } from '../src/types';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sfl-mw-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeReq(overrides: Partial<HttpRequest> = {}): HttpRequest {
  return { method: 'GET', url: '/test', headers: {}, ...overrides };
}

function makeRes(statusCode = 200): { res: HttpResponse; finish: () => void } {
  let cb: (() => void) | undefined;
  const res: HttpResponse = {
    statusCode,
    on(_event: string, listener: () => void) {
      cb = listener;
      return this;
    },
  };
  return { res, finish: () => cb?.() };
}

describe('createHttpMiddleware', () => {
  it('calls next() immediately', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const mw = createHttpMiddleware(logger);
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    const { res } = makeRes();
    mw(makeReq(), res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('logs INFO for 2xx responses', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(200);
    mw(makeReq(), res, () => undefined);
    finish();
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [message] = infoSpy.mock.calls[0]!;
    expect(message).toContain('GET');
    expect(message).toContain('200');
  });

  it('logs WARN for 4xx responses', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const warnSpy = jest.spyOn(logger, 'warn');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(404);
    mw(makeReq({ method: 'GET', url: '/missing' }), res, () => undefined);
    finish();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain('404');
  });

  it('logs ERROR for 5xx responses', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const errorSpy = jest.spyOn(logger, 'error');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(500);
    mw(makeReq({ method: 'POST', url: '/api/data' }), res, () => undefined);
    finish();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]![0]).toContain('500');
  });

  it('skips logging for 2xx when errorsOnly is true', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger, { errorsOnly: true });
    const { res, finish } = makeRes(200);
    mw(makeReq(), res, () => undefined);
    finish();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('still logs 4xx when errorsOnly is true', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const warnSpy = jest.spyOn(logger, 'warn');
    const mw = createHttpMiddleware(logger, { errorsOnly: true });
    const { res, finish } = makeRes(400);
    mw(makeReq(), res, () => undefined);
    finish();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('uses a custom getIp function', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger, { getIp: () => '10.0.0.99' });
    const { res, finish } = makeRes(200);
    mw(makeReq(), res, () => undefined);
    finish();
    expect(infoSpy.mock.calls[0]?.[1]?.ip).toBe('10.0.0.99');
  });

  it('uses req.ip when available', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(200);
    mw(makeReq({ ip: '192.168.1.100' }), res, () => undefined);
    finish();
    expect(infoSpy.mock.calls[0]?.[1]?.ip).toBe('192.168.1.100');
  });

  it('extracts first IP from X-Forwarded-For header', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(200);
    mw(makeReq({ headers: { 'x-forwarded-for': '10.1.1.1, 10.2.2.2' } }), res, () => undefined);
    finish();
    expect(infoSpy.mock.calls[0]?.[1]?.ip).toBe('10.1.1.1');
  });

  it('falls back to socket.remoteAddress', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(200);
    const req: HttpRequest = {
      method: 'GET',
      url: '/',
      headers: {},
      socket: { remoteAddress: '172.16.0.5' },
    };
    mw(req, res, () => undefined);
    finish();
    expect(infoSpy.mock.calls[0]?.[1]?.ip).toBe('172.16.0.5');
  });

  it('falls back to "unknown" when no IP source is available', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(200);
    mw(makeReq({ headers: {} }), res, () => undefined);
    finish();
    expect(infoSpy.mock.calls[0]?.[1]?.ip).toBe('unknown');
  });

  it('uses req.path when req.url is absent', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(200);
    const req: HttpRequest = { method: 'GET', headers: {}, path: '/dashboard' };
    mw(req, res, () => undefined);
    finish();
    expect(infoSpy.mock.calls[0]?.[0]).toContain('/dashboard');
  });

  it('includes metadata fields in the log call', () => {
    const logger = createLogger({ logDir: tmpDir, console: false, file: false });
    const infoSpy = jest.spyOn(logger, 'info');
    const mw = createHttpMiddleware(logger);
    const { res, finish } = makeRes(200);
    mw(makeReq(), res, () => undefined);
    finish();
    const meta = infoSpy.mock.calls[0]?.[1];
    expect(meta).toHaveProperty('statusCode', 200);
    expect(meta).toHaveProperty('method', 'GET');
    expect(meta).toHaveProperty('url', '/test');
    expect(meta).toHaveProperty('durationMs');
  });
});
