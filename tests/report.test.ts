import { describe, expect, it } from 'vitest';
import { buildReport, renderSummary, serializeReport } from '../src/report.js';
import type { Config, Expense, Report } from '../src/types.js';

const january: Pick<Config, 'startDate' | 'endDate'> = {
  startDate: '2026-01-01',
  endDate: '2026-01-31',
};

function expense(
  category: string,
  amountCents: number,
  date = '2026-01-15',
): Expense {
  return { date, category, description: 'Example expense', amountCents };
}

const sampleReport: Report = {
  ...january,
  expenseCount: 2,
  totalCents: 1234,
  categories: [{ category: 'Meals', expenseCount: 2, totalCents: 1234 }],
};

const emptyReport: Report = {
  ...january,
  expenseCount: 0,
  totalCents: 0,
  categories: [],
};

const sampleJson = `{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "expenseCount": 2,
  "totalCents": 1234,
  "categories": [
    {
      "category": "Meals",
      "expenseCount": 2,
      "totalCents": 1234
    }
  ]
}
`;

const sampleSummary =
  'Expense report: 2026-01-01 to 2026-01-31\n' +
  'Expenses: 2\n\n' +
  'Category | Expenses | Total\n' +
  'Meals | 2 | $12.34\n\n' +
  'Total: $12.34\n';

const emptySummary =
  'Expense report: 2026-01-01 to 2026-01-31\n' +
  'Expenses: 0\n\n' +
  'Category | Expenses | Total\n\n' +
  'Total: $0.00\n';

describe('buildReport', () => {
  it('includes both date boundaries and excludes expenses outside the range', () => {
    const expenses = [
      expense('Excluded', 500, '2025-12-31'),
      expense('Meals', 100, '2026-01-01'),
      expense('Meals', 200, '2026-01-15'),
      expense('Meals', 300, '2026-01-31'),
      expense('Excluded', 700, '2026-02-01'),
    ];

    expect(buildReport(expenses, january)).toEqual({
      ...january,
      expenseCount: 3,
      totalCents: 600,
      categories: [{ category: 'Meals', expenseCount: 3, totalCents: 600 }],
    });
  });

  it('supports an inclusive single-day range', () => {
    const range = { startDate: '2026-01-15', endDate: '2026-01-15' };
    const expenses = [
      expense('Meals', 100, '2026-01-14'),
      expense('Meals', 200, '2026-01-15'),
      expense('Meals', 300, '2026-01-16'),
    ];

    expect(buildReport(expenses, range)).toEqual({
      ...range,
      expenseCount: 1,
      totalCents: 200,
      categories: [{ category: 'Meals', expenseCount: 1, totalCents: 200 }],
    });
  });

  it('groups repeated categories while preserving case and ignoring descriptions', () => {
    const expenses = [
      expense('Travel', 500),
      expense('Meals', 100),
      { ...expense('Travel', 200), description: 'Different description' },
      expense('meals', 300),
    ];

    expect(buildReport(expenses, january)).toEqual({
      ...january,
      expenseCount: 4,
      totalCents: 1100,
      categories: [
        { category: 'Meals', expenseCount: 1, totalCents: 100 },
        { category: 'Travel', expenseCount: 2, totalCents: 700 },
        { category: 'meals', expenseCount: 1, totalCents: 300 },
      ],
    });
  });

  it('counts zero-cent expenses and retains their categories', () => {
    expect(
      buildReport([expense('Meals', 0), expense('Meals', 0)], january),
    ).toEqual({
      ...january,
      expenseCount: 2,
      totalCents: 0,
      categories: [{ category: 'Meals', expenseCount: 2, totalCents: 0 }],
    });
  });

  it('returns zero counts and no categories for empty input', () => {
    expect(buildReport([], january)).toEqual(emptyReport);
  });

  it('returns an empty report when no expenses match', () => {
    expect(buildReport([expense('Meals', 100, '2025-12-31')], january)).toEqual(
      emptyReport,
    );
  });

  it('handles category names that are object prototype properties', () => {
    const expenses = [
      expense('constructor', 10),
      expense('__proto__', 20),
      expense('__proto__', 30),
    ];

    expect(buildReport(expenses, january)).toEqual({
      ...january,
      expenseCount: 3,
      totalCents: 60,
      categories: [
        { category: '__proto__', expenseCount: 2, totalCents: 50 },
        { category: 'constructor', expenseCount: 1, totalCents: 10 },
      ],
    });
  });

  it('adds ten and twenty cents exactly as integers', () => {
    expect(
      buildReport([expense('Meals', 10), expense('Meals', 20)], january),
    ).toEqual({
      ...january,
      expenseCount: 2,
      totalCents: 30,
      categories: [{ category: 'Meals', expenseCount: 2, totalCents: 30 }],
    });
  });

  it('accepts an exact maximum-safe total followed by a zero-cent expense', () => {
    const expenses = [
      expense('Meals', Number.MAX_SAFE_INTEGER - 1),
      expense('Meals', 1),
      expense('Meals', 0),
    ];

    expect(buildReport(expenses, january)).toEqual({
      ...january,
      expenseCount: 3,
      totalCents: Number.MAX_SAFE_INTEGER,
      categories: [
        {
          category: 'Meals',
          expenseCount: 3,
          totalCents: Number.MAX_SAFE_INTEGER,
        },
      ],
    });
  });

  it.each(['Meals', 'Travel'])(
    'rejects overflow when an extra cent is in category %s',
    (category) => {
      const expenses = [
        expense('Meals', Number.MAX_SAFE_INTEGER),
        expense(category, 1),
      ];

      expect(() => buildReport(expenses, january)).toThrow(
        new Error('report total exceeds maximum safe cents (9007199254740991)'),
      );
    },
  );

  it('does not count out-of-range amounts toward overflow', () => {
    const expenses = [
      expense('Excluded', Number.MAX_SAFE_INTEGER, '2025-12-31'),
      expense('Meals', 1),
      expense('Excluded', Number.MAX_SAFE_INTEGER, '2026-02-01'),
    ];

    expect(buildReport(expenses, january).totalCents).toBe(1);
  });

  it('sorts by Unicode code point rather than locale or UTF-16 code unit', () => {
    const expectedCategories = [
      'A',
      'Z',
      'a',
      'aa',
      'aé',
      'a\uE000',
      'a\u{10000}',
      'é',
      '\uE000',
      '\u{10000}',
      '\u{10000}a',
      '\u{10000}b',
      '\u{10001}',
      '😀',
    ];
    const expenses = [...expectedCategories]
      .reverse()
      .map((category) => expense(category, 1));

    expect(
      buildReport(expenses, january).categories.map((total) => total.category),
    ).toEqual(expectedCategories);
  });

  it('produces identical reports for different input orders', () => {
    const expenses = [
      expense('😀', 10),
      expense('Meals', 20),
      expense('\uE000', 30),
      expense('Meals', 40),
    ];
    const expected = buildReport(expenses, january);
    const permutations = expenses.flatMap((_, index) => {
      const rotated = [...expenses.slice(index), ...expenses.slice(0, index)];
      return [rotated, [...rotated].reverse()];
    });

    expect(permutations.map((items) => buildReport(items, january))).toEqual(
      permutations.map(() => expected),
    );
  });

  it('does not mutate expenses or the configured range', () => {
    const expenses = Object.freeze([
      Object.freeze(expense('Travel', 30)),
      Object.freeze(expense('Meals', 20)),
      Object.freeze(expense('Travel', 10)),
    ]);
    const range = Object.freeze({ ...january });
    const before = structuredClone({ expenses, range });

    buildReport(expenses, range);

    expect({ expenses, range }).toEqual(before);
  });
});

describe('renderSummary', () => {
  it('renders the exact summary including blank lines and final LF', () => {
    expect(renderSummary(sampleReport)).toBe(sampleSummary);
  });

  it('retains the table header and separator with no category rows for empty input', () => {
    expect(renderSummary(emptyReport)).toBe(emptySummary);
  });

  it('renders all categories and counts without altering Unicode labels', () => {
    const report = buildReport(
      [expense('😀', 20), expense('Café', 10), expense('Café', 100)],
      january,
    );

    expect(renderSummary(report)).toBe(
      'Expense report: 2026-01-01 to 2026-01-31\n' +
        'Expenses: 3\n\n' +
        'Category | Expenses | Total\n' +
        'Café | 2 | $1.10\n' +
        '😀 | 1 | $0.20\n\n' +
        'Total: $1.30\n',
    );
  });

  it.each([
    [0, '0.00'],
    [1, '0.01'],
    [10, '0.10'],
    [30, '0.30'],
    [99, '0.99'],
    [100, '1.00'],
    [101, '1.01'],
    [9007199254740899, '90071992547408.99'],
    [9007199254740900, '90071992547409.00'],
    [Number.MAX_SAFE_INTEGER, '90071992547409.91'],
  ])('formats %s cents exactly as $%s', (cents, formatted) => {
    const report = buildReport([expense('Meals', cents)], january);

    expect(renderSummary(report)).toBe(
      'Expense report: 2026-01-01 to 2026-01-31\n' +
        'Expenses: 1\n\n' +
        'Category | Expenses | Total\n' +
        `Meals | 1 | $${formatted}\n\n` +
        `Total: $${formatted}\n`,
    );
  });
});

describe('serializeReport', () => {
  it('uses ordered fields, two-space indentation, integer cents and a final LF', () => {
    expect(serializeReport(sampleReport)).toBe(sampleJson);
  });

  it('normalizes field insertion order without mutating the supplied report', () => {
    const report: Report = Object.freeze({
      categories: [
        Object.freeze({ totalCents: 1234, expenseCount: 2, category: 'Meals' }),
      ],
      totalCents: 1234,
      expenseCount: 2,
      endDate: january.endDate,
      startDate: january.startDate,
    });
    Object.freeze(report.categories);

    expect(serializeReport(report)).toBe(sampleJson);
  });

  it('serializes an empty report with an empty categories array', () => {
    expect(serializeReport(emptyReport)).toBe(
      '{\n' +
        '  "startDate": "2026-01-01",\n' +
        '  "endDate": "2026-01-31",\n' +
        '  "expenseCount": 0,\n' +
        '  "totalCents": 0,\n' +
        '  "categories": []\n' +
        '}\n',
    );
  });

  it('preserves maximum-safe integer cents without exponent or decimal notation', () => {
    const report = buildReport(
      [expense('Meals', Number.MAX_SAFE_INTEGER)],
      january,
    );

    expect(serializeReport(report)).toBe(
      '{\n' +
        '  "startDate": "2026-01-01",\n' +
        '  "endDate": "2026-01-31",\n' +
        '  "expenseCount": 1,\n' +
        '  "totalCents": 9007199254740991,\n' +
        '  "categories": [\n' +
        '    {\n' +
        '      "category": "Meals",\n' +
        '      "expenseCount": 1,\n' +
        '      "totalCents": 9007199254740991\n' +
        '    }\n' +
        '  ]\n' +
        '}\n',
    );
  });

  it('round-trips Unicode and JSON-sensitive category labels', () => {
    const report = buildReport([expense('Café "A" \\ 😀', 10)], january);

    expect(JSON.parse(serializeReport(report))).toEqual(report);
  });
});
