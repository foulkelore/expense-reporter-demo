import type { CategoryTotal, Config, Expense, Report } from './types.js';

// JavaScript's default sort compares UTF-16 code units, not Unicode code points.
function compareCategories(left: string, right: string): number {
  let leftIndex = 0;
  let rightIndex = 0;

  while (true) {
    const leftPoint = left.codePointAt(leftIndex);
    const rightPoint = right.codePointAt(rightIndex);
    if (leftPoint === undefined || rightPoint === undefined) {
      if (leftPoint === rightPoint) return 0;
      return leftPoint === undefined ? -1 : 1;
    }
    if (leftPoint !== rightPoint) return leftPoint - rightPoint;
    leftIndex += leftPoint > 0xffff ? 2 : 1;
    rightIndex += rightPoint > 0xffff ? 2 : 1;
  }
}

export function buildReport(
  expenses: readonly Expense[],
  range: Pick<Config, 'startDate' | 'endDate'>,
): Report {
  const categories = new Map<string, CategoryTotal>();
  let expenseCount = 0;
  let totalCents = 0;

  for (const expense of expenses) {
    if (expense.date < range.startDate || expense.date > range.endDate)
      continue;
    if (expense.amountCents > Number.MAX_SAFE_INTEGER - totalCents) {
      throw new Error(
        'report total exceeds maximum safe cents (9007199254740991)',
      );
    }

    totalCents += expense.amountCents;
    expenseCount += 1;
    const previous = categories.get(expense.category);
    categories.set(expense.category, {
      category: expense.category,
      expenseCount: (previous?.expenseCount ?? 0) + 1,
      totalCents: (previous?.totalCents ?? 0) + expense.amountCents,
    });
  }

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    expenseCount,
    totalCents,
    categories: [...categories.values()].sort((left, right) =>
      compareCategories(left.category, right.category),
    ),
  };
}

function formatCurrency(cents: number): string {
  const integerCents = BigInt(cents);
  const dollars = integerCents / 100n;
  const remainder = (integerCents % 100n).toString().padStart(2, '0');
  return `$${dollars}.${remainder}`;
}

export function renderSummary(report: Report): string {
  return [
    `Expense report: ${report.startDate} to ${report.endDate}`,
    `Expenses: ${report.expenseCount}`,
    '',
    'Category | Expenses | Total',
    ...report.categories.map(
      ({ category, expenseCount, totalCents }) =>
        `${category} | ${expenseCount} | ${formatCurrency(totalCents)}`,
    ),
    '',
    `Total: ${formatCurrency(report.totalCents)}`,
    '',
  ].join('\n');
}

export function serializeReport(report: Report): string {
  return `${JSON.stringify(
    {
      startDate: report.startDate,
      endDate: report.endDate,
      expenseCount: report.expenseCount,
      totalCents: report.totalCents,
      categories: report.categories.map(
        ({ category, expenseCount, totalCents }) => ({
          category,
          expenseCount,
          totalCents,
        }),
      ),
    },
    null,
    2,
  )}\n`;
}
