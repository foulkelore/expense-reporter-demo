import { describe, expect, it } from 'vitest';
import { parseMoney, validateDate } from '../src/validation.js';

describe('parseMoney', () => {
  it.each([
    ['0', 0],
    ['0.00', 0],
    ['1', 100],
    ['12.3', 1230],
    ['12.34', 1234],
    ['0001.02', 102],
    ['90071992547409.91', Number.MAX_SAFE_INTEGER],
  ])('converts %s to exact integer cents', (value, expected) => {
    expect(parseMoney(value)).toBe(expected);
  });

  it.each([
    '',
    '-1',
    '+1',
    '1.234',
    '.50',
    '1.',
    '1e2',
    'NaN',
    'Infinity',
    ' 1',
    '1 ',
    '1,000',
    '１２',
    '1\n',
    '1\r',
    '1\u2028',
  ])('rejects invalid amount %j', (value) => {
    expect(() => parseMoney(value)).toThrow(
      'amount must be a nonnegative decimal with at most two fractional digits',
    );
  });

  it.each(['90071992547409.92', '90071992547410', '999999999999999999999999'])(
    'rejects overflow %s',
    (value) => {
      expect(() => parseMoney(value)).toThrow(
        'amount exceeds maximum safe cents (9007199254740991)',
      );
    },
  );
});

describe('validateDate', () => {
  it.each([
    '0001-01-01',
    '0099-12-31',
    '2000-02-29',
    '2024-02-29',
    '2026-09-30',
    '9999-12-31',
  ])('accepts calendar date %s', (value) => {
    expect(validateDate(value, 'date')).toBe(value);
  });

  it.each([
    '0000-01-01',
    '1900-02-29',
    '2025-02-29',
    '2026-04-31',
    '2026-00-10',
    '2026-13-10',
    '2026-01-00',
    '2026-01-32',
    '2026-1-01',
    '26-01-01',
    '2026-01-01T00:00:00Z',
    ' 2026-01-01',
    '',
    '2026-01-01\n',
    '2026-01-01\r',
    '2026-01-01\u2028',
  ])('rejects invalid calendar date %j', (value) => {
    expect(() => validateDate(value, 'startDate')).toThrow(
      'startDate must be a valid YYYY-MM-DD date (years 0001-9999)',
    );
  });
});
