export interface Config {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface Expense {
  readonly date: string;
  readonly category: string;
  readonly description: string;
  readonly amountCents: number;
}

export interface CategoryTotal {
  readonly category: string;
  readonly expenseCount: number;
  readonly totalCents: number;
}

export interface Report {
  readonly startDate: string;
  readonly endDate: string;
  readonly expenseCount: number;
  readonly totalCents: number;
  readonly categories: CategoryTotal[];
}
