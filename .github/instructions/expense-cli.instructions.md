---
description: "Expense CLI implementation, filesystem safety, and shared fixture contracts in src/, tests/, and demo configuration."
applyTo: "src/**,tests/**,config.json,data/*.csv"
---

# Expense CLI conventions

## TypeScript boundaries

- Keep `src/cli.ts` as the process adapter, `src/app.ts` as orchestration/I/O, `src/config.ts` as config validation/path resolution, `src/csv.ts` as record parsing/validation, `src/validation.ts` as date/money rules, `src/report.ts` as pure calculation/rendering, and `src/types.ts` as domain shapes.
- Use TypeScript 5.9 with ES2022/NodeNext, `.js` relative import specifiers, named exports, `import type`, and readonly domain fields. Don't introduce CommonJS or mutate report inputs.
- Keep `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and unused-local/parameter checks enabled. `skipLibCheck` is configured; no source-level suppression exceptions are established.
- Use Prettier's single quotes and trailing commas. Files have no copyright banner; don't invent one.
- Don't hand-split CSV; use `csv-parse/sync`. Don't parse currency through floats; `parseMoney` uses `BigInt` before returning bounded number cents. Don't replace calendar validation with timezone-dependent `Date` parsing or code-point sorting with default/locale sorting.
- Keep `run(args, cwd)` returning `CliResult`; only `src/cli.ts` writes process streams and sets `process.exitCode`. Don't add logging to contract output.
- Normalize I/O errors to `cannot read config file`, `cannot read input CSV`, or `cannot write report file`. Catch errors to translate or rethrow, not silently discard them. Preserve the intentional `ENOENT`/`ENOTDIR` handling in output alias checks.

## Testing

- Use Vitest 4 `describe`/`it`/`it.each` with behavioral `expect` assertions, not snapshots of generated expectations.
- `tests/validation.test.ts`, `tests/csv.test.ts`, and `tests/report.test.ts` cover pure behavior. `tests/config.test.ts` and `tests/app.test.ts` use real temporary files; clean workspaces in `afterEach`.
- `tests/cli.test.ts` builds via `tsc -p tsconfig.build.json` before spawning Node against `dist/cli.js`. Keep bounded subprocess timeouts and checks on spawn errors, exit status, stdout, stderr, report bytes, and old-report preservation.
- All tiers run in `npm test`; no separate integration runner or real service infrastructure is involved. Focus process/fixture checks with `npm test -- tests/cli.test.ts` or filesystem checks with `npm test -- tests/config.test.ts tests/app.test.ts`.
- `npm run test:coverage` uses V8 with 80% thresholds for statements, branches, functions, and lines. `src/cli.ts` and `src/types.ts` are excluded from instrumentation; CLI behavior remains subprocess-tested.
- Keep `tests/fixtures/` excluded from Prettier. The 14-case `tests/fixtures/cases.json` manifest is not a substitute for unit, config, filesystem, and process edge tests.

## Contract that migrations must preserve

- Accept only no args, exactly `--config <nonempty-path>`, or `--help` alone. Default config is `config.json` in cwd; resolve configured relative paths against the config file directory. The help label `expense-reporter` does not imply an installed binary.
- Config has exactly four required nonempty strings: `inputPath`, `outputPath`, `startDate`, `endDate`. Reject unknown keys and blank/NUL paths; preserve meaningful path spaces. Use exact Gregorian dates `YYYY-MM-DD`, years `0001`–`9999`, `startDate <= endDate`, inclusive boundaries.
- CSV header fields are exactly `date,category,description,amount` in order and case, without header trimming. Require four fields; support optional BOM, LF/CRLF, empty lines, quoted commas, escaped quotes, and multiline descriptions. Spaces-only lines fail. Trim only ASCII spaces/tabs at cell-value edges, not all Unicode whitespace.
- Validate all rows before filtering, even excluded rows. Error record numbers count parsed records including the header, not physical lines. Descriptions may be empty; categories may not. Categories are case-sensitive, not normalized, code-point sorted, and exclude C0/C1 controls, DEL, U+2028/U+2029, and `|`.
- Money is ASCII digits plus an optional decimal with one or two fractional digits; leading zeros are allowed. Reject signs, exponents, separators, `.5`, `1.`, and extra precision. Parse/sum integer cents without floats. Enforce `9007199254740991` cents per amount and selected grand total in every language; wider integer types do not relax this ceiling.
- Count zero-cent selected expenses. Header-only CSV/no matches yields zero totals and `categories: []`; a completely empty file fails header validation.
- Preserve stdout/stderr/JSON bytes, exit status, error messages, ordering, and final LF. Summary dollar formatting is locale-independent. JSON uses two-space indentation, UTF-8 unescaped Unicode, integer cents, and ordered fields `startDate`, `endDate`, `expenseCount`, `totalCents`, `categories`; item fields are `category`, `expenseCount`, `totalCents`.
- Successful reports and help exit `0` with empty stderr. Validation/I/O exits `1` with empty stdout and `Error: <message>\n`, no stack trace. Invalid args exit `2` with empty stdout and `Error: invalid arguments\n` followed by the exact help text. Tests/fixtures define exact strings and precedence.
- Prevent output aliases to CSV/config, including symlinks/hard links. Validate/calculate before writing; create parents, use a sibling temporary file and atomic replacement, clean temporary files on failure, and preserve an existing report. Never expose platform-specific I/O errors instead of normalized messages.
