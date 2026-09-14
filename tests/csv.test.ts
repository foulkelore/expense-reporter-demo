import { describe, expect, it } from 'vitest';
import { parseExpenses } from '../src/csv.js';

const header = 'date,category,description,amount\n';

describe('parseExpenses', () => {
  it('reads quoted commas, escaped quotes and multiline descriptions', () => {
    expect(
      parseExpenses(
        header + '2026-01-01,Meals,"Lunch, with ""team""\nsecond line",12.30\n',
      ),
    ).toEqual([
      {
        date: '2026-01-01',
        category: 'Meals',
        description: 'Lunch, with "team"\nsecond line',
        amountCents: 1230,
      },
    ]);
  });
  it('accepts BOM, CRLF, trailing newline and blank lines', () => {
    expect(
      parseExpenses(
        '\ufeff' +
          header.replace('\n', '\r\n') +
          '\r\n2026-01-01,Meals,Lunch,1\r\n\r\n',
      ),
    ).toHaveLength(1);
  });
  it('trims ASCII spaces and tabs around cell values including quoted values', () => {
    expect(
      parseExpenses(header + '2026-01-01,  Meals  ," Lunch ", 1.20\n'),
    ).toEqual([
      {
        date: '2026-01-01',
        category: 'Meals',
        description: 'Lunch',
        amountCents: 120,
      },
    ]);
  });
  it('allows an empty description', () => {
    expect(parseExpenses(header + '2026-01-01,Meals,,0')).toEqual([
      {
        date: '2026-01-01',
        category: 'Meals',
        description: '',
        amountCents: 0,
      },
    ]);
  });
  it('accepts a header-only file as no expenses', () => {
    expect(parseExpenses(header)).toEqual([]);
  });
  it('accepts Unicode categories without folding case', () => {
    expect(parseExpenses(header + '2026-01-01,餐饮,Lunch,1')[0]?.category).toBe(
      '餐饮',
    );
  });
  it.each([
    '',
    'date,category,amount,description\n',
    'date,category,description,amount,extra\n',
    'date,category,category,amount\n',
    'Date,category,description,amount\n',
  ])('rejects missing or incorrect headers %j', (csv) => {
    expect(() => parseExpenses(csv)).toThrow(
      'CSV header must be exactly: date,category,description,amount',
    );
  });
  it.each([
    '2026-01-01,Meals,Lunch\n',
    '2026-01-01,Meals,Lunch,1,extra\n',
    '2026-01-01,Meals,"unterminated,1\n',
  ])('normalizes malformed CSV errors', (row) => {
    expect(() => parseExpenses(header + row)).toThrow('CSV is malformed');
  });
  it('rejects whitespace-only lines rather than treating them as empty data', () => {
    expect(() => parseExpenses(header + '   \n')).toThrow('CSV is malformed');
  });
  it('reports record numbers including the header, not physical line numbers', () => {
    expect(() =>
      parseExpenses(
        header + '2026-01-01,Meals,"two\nlines",1\n2026-02-30,Meals,invalid,1',
      ),
    ).toThrow(
      'record 3: date must be a valid YYYY-MM-DD date (years 0001-9999)',
    );
  });
  it('rejects an empty category', () => {
    expect(() => parseExpenses(header + '2026-01-01,  ,Lunch,1')).toThrow(
      'record 2: category must be nonempty',
    );
  });
  it.each([
    'bad|category',
    'bad\u001bcategory',
    'bad\u007fcategory',
    'bad\ncategory',
    'bad\u0085category',
    'bad\u2028category',
    'bad\u2029category',
  ])('rejects unsafe summary category %j', (category) => {
    expect(() =>
      parseExpenses(header + `2026-01-01,"${category}",Lunch,1`),
    ).toThrow(
      'record 2: category must not contain control characters, line separators or |',
    );
  });
  it('adds record context to amount validation errors', () => {
    expect(() => parseExpenses(header + '2026-01-01,Meals,Lunch,-1')).toThrow(
      'record 2: amount must be a nonnegative decimal with at most two fractional digits',
    );
  });
  it('validates all records even when dates are outside the report range', () => {
    expect(() => parseExpenses(header + '2025-01-01,Meals,Old,1.234')).toThrow(
      'record 2: amount must be a nonnegative decimal with at most two fractional digits',
    );
  });
});
