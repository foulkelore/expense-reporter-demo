/** Parses decimal currency without floating-point arithmetic. */
export function parseMoney(value: string): number {
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(value)) {
    throw new Error(
      'amount must be a nonnegative decimal with at most two fractional digits',
    );
  }
  const [whole = '0', fraction = ''] = value.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('amount exceeds maximum safe cents (9007199254740991)');
  }
  return Number(cents);
}

/** Validates a Gregorian date without time zones or Date rollover. */
export function validateDate(value: string, field: string): string {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) ||
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (days[month - 1] ?? 0)
  ) {
    throw new Error(
      `${field} must be a valid YYYY-MM-DD date (years 0001-9999)`,
    );
  }
  return value;
}
