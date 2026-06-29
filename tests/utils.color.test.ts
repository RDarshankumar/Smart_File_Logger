/**
 * @file tests/utils.color.test.ts
 * @description Unit tests for ANSI color utilities, including color-enabled paths.
 */

import { colorize, bold, supportsColor } from '../src/utils';

describe('supportsColor', () => {
  let savedIsTTY: boolean | undefined;
  let savedNoColor: string | undefined;

  beforeEach(() => {
    savedIsTTY = process.stdout.isTTY;
    savedNoColor = process.env['NO_COLOR'];
    delete process.env['NO_COLOR'];
  });

  afterEach(() => {
    process.stdout.isTTY = savedIsTTY as boolean;
    if (savedNoColor === undefined) {
      delete process.env['NO_COLOR'];
    } else {
      process.env['NO_COLOR'] = savedNoColor;
    }
  });

  it('returns false when NO_COLOR env var is set', () => {
    process.env['NO_COLOR'] = '';
    expect(supportsColor()).toBe(false);
  });

  it('returns false when isTTY is false', () => {
    process.stdout.isTTY = false;
    expect(supportsColor()).toBe(false);
  });

  it('returns true when isTTY is true and NO_COLOR is absent', () => {
    process.stdout.isTTY = true;
    expect(supportsColor()).toBe(true);
  });
});

describe('colorize', () => {
  let savedIsTTY: boolean | undefined;

  beforeEach(() => {
    savedIsTTY = process.stdout.isTTY;
    delete process.env['NO_COLOR'];
  });

  afterEach(() => {
    process.stdout.isTTY = savedIsTTY as boolean;
    delete process.env['NO_COLOR'];
  });

  it('returns plain text when colors are not supported', () => {
    process.stdout.isTTY = false;
    expect(colorize('INFO', 'hello')).toBe('hello');
  });

  it('returns ANSI-wrapped text when colors are supported', () => {
    process.stdout.isTTY = true;
    const result = colorize('INFO', 'hello');
    expect(result).toContain('hello');
    expect(result).toContain('\x1b[');
    expect(result).toContain('\x1b[0m');
  });

  it('applies the correct color code for each level', () => {
    process.stdout.isTTY = true;
    expect(colorize('ERROR', 'x')).toContain('\x1b[31m');
    expect(colorize('WARN', 'x')).toContain('\x1b[33m');
    expect(colorize('SUCCESS', 'x')).toContain('\x1b[32m');
    expect(colorize('DEBUG', 'x')).toContain('\x1b[90m');
  });
});

describe('bold', () => {
  let savedIsTTY: boolean | undefined;

  beforeEach(() => {
    savedIsTTY = process.stdout.isTTY;
    delete process.env['NO_COLOR'];
  });

  afterEach(() => {
    process.stdout.isTTY = savedIsTTY as boolean;
    delete process.env['NO_COLOR'];
  });

  it('returns plain text when colors are not supported', () => {
    process.stdout.isTTY = false;
    expect(bold('title')).toBe('title');
  });

  it('wraps text in bold ANSI codes when colors are supported', () => {
    process.stdout.isTTY = true;
    const result = bold('title');
    expect(result).toContain('title');
    expect(result).toContain('\x1b[1m');
    expect(result).toContain('\x1b[0m');
  });
});
