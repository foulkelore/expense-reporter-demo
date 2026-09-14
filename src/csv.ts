import { parse } from 'csv-parse/sync';
import type { Expense } from './types.js';
import { parseMoney, validateDate } from './validation.js';

const header = ['date', 'category', 'description', 'amount'];

/** Parses and validates every CSV record before any date filtering. */
export function parseExpenses(csv: string): Expense[] {
  let records: string[][];
  try {
    records = parse(csv, { bom: true, skip_empty_lines: true });
  } catch {
    throw new Error('CSV is malformed');
  }
  const actualHeader = records[0];
  if (
    !actualHeader ||
    actualHeader.length !== header.length ||
    header.some((field, i) => actualHeader[i] !== field)
  ) {
    throw new Error(
      'CSV header must be exactly: date,category,description,amount',
    );
  }
  return records.slice(1).map((record, index) => {
    const [date = '', category = '', description = '', amount = ''] =
      record.map((cell) => cell.replace(/^[ \t]+|[ \t]+$/g, ''));
    try {
      validateDate(date, 'date');
      if (!category) throw new Error('category must be nonempty');
      if (/[\x00-\x1f\x7f-\x9f\u2028\u2029|]/.test(category)) {
        throw new Error(
          'category must not contain control characters, line separators or |',
        );
      }
      return { date, category, description, amountCents: parseMoney(amount) };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new Error(`record ${index + 2}: ${error.message}`);
    }
  });
}
