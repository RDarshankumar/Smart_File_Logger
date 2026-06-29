/**
 * @file tests/config.test.ts
 * @description Unit tests for config resolution.
 */

import { resolveConfig } from '../src/config';

describe('resolveConfig', () => {
  it('returns all defaults when called with no arguments', () => {
    const cfg = resolveConfig();
    expect(cfg.logDir).toBe('./logs');
    expect(cfg.retentionWeeks).toBe(4);
    expect(cfg.console).toBe(true);
    expect(cfg.file).toBe(true);
    expect(cfg.json).toBe(false);
  });

  it('overrides individual fields', () => {
    const cfg = resolveConfig({ logDir: './custom', retentionWeeks: 2, json: true });
    expect(cfg.logDir).toBe('./custom');
    expect(cfg.retentionWeeks).toBe(2);
    expect(cfg.json).toBe(true);
    // unchanged defaults
    expect(cfg.console).toBe(true);
    expect(cfg.file).toBe(true);
  });

  it('returns a frozen object', () => {
    const cfg = resolveConfig();
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  it('throws RangeError for retentionWeeks = 0', () => {
    expect(() => resolveConfig({ retentionWeeks: 0 })).toThrow(RangeError);
  });

  it('throws RangeError for retentionWeeks = 53', () => {
    expect(() => resolveConfig({ retentionWeeks: 53 })).toThrow(RangeError);
  });

  it('throws RangeError for non-integer retentionWeeks', () => {
    expect(() => resolveConfig({ retentionWeeks: 2.5 })).toThrow(RangeError);
  });

  it('accepts retentionWeeks = 52', () => {
    const cfg = resolveConfig({ retentionWeeks: 52 });
    expect(cfg.retentionWeeks).toBe(52);
  });

  it('accepts retentionWeeks = 1', () => {
    const cfg = resolveConfig({ retentionWeeks: 1 });
    expect(cfg.retentionWeeks).toBe(1);
  });

  it('disabling console and file both work', () => {
    const cfg = resolveConfig({ console: false, file: false });
    expect(cfg.console).toBe(false);
    expect(cfg.file).toBe(false);
  });
});
