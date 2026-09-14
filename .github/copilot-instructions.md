# Expense Reporter Demo — Project Instructions

## Purpose and scope

- This is an offline expense-reporting CLI and AI-assisted TypeScript → Python → Go migration demo, not an accounting product. The starter remains TypeScript only unless a migration is explicitly requested.
- Use fictional dollar amounts only. Do not add refunds, currency conversion, databases, a UI, authentication, API keys, external services, or runtime networking.
- Read `README.md`, actual source/tests, and `tests/fixtures/cases.json` before changes. Preserve user work; do not invent file layouts or assume a previous migration occurred.
- Keep docs focused. `README.md` may live at the root; all other new Markdown belongs under `.github/`. Never include private machine paths, key names, credentials, or personal author details in public-facing examples.

## Planning and TDD

- For nontrivial changes, first save a descriptive plan under `.github/plans/`; create that directory if needed. Include Summary, Goals, Scope, test-first Approach, Out of Scope, Risks & Open Questions, and Checklist.
- Present the saved plan and **stop for explicit approval before production code**. The initial build plan is `.github/plans/build-expense-reporter-demo.md`; its approval does not approve either migration.
- Use short RED-GREEN-REFACTOR cycles: write and execute a failing test, implement the minimum, then refactor with tests green. Reproduce bugs in tests before fixing them.
- Test observable behavior, not private implementation details. Keep calculation/rendering pure and isolate filesystem/process boundaries. Match existing test patterns.
- Run focused tests, then relevant broader checks. Record exact commands and results; never claim validation passed if it was not run. Report unrelated failures rather than changing unrelated code.

## Baseline tooling and boundaries

- Use Node.js 22, at least 22.12.0 (`.nvmrc`: `22`), strict TypeScript, and the npm lockfile. Install with `npm ci`.
- Commands: `npm test`, `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npm run format:check`, and `npm run check` (typecheck, coverage tests, build, formatting).
- Run the built app with `node dist/cli.js` or `npm run --silent start`; `npm start` may include npm's banner. The CLI test harness builds before executing process tests.
- `csv-parse` is the only runtime dependency. Prefer existing tooling and standard libraries; justify any new dependency.
- Keep `cli` as the process adapter, `app` as orchestration/I/O, `config` as config validation/path resolution, `csv` as record parsing/validation, `validation` as date/money rules, `report` as pure calculation/rendering, and `types` as domain shapes.

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

## Fixtures and migration discipline

- Shared inputs and expected outputs in `tests/fixtures/` are immutable migration contracts. Expectations were manually authored: **never generate or refresh expected output from the implementation** to make tests pass.
- The manifest-driven harness compares exact stdout, stderr, JSON bytes, exit status, and old-report preservation. Keep that harness behavior in destination languages. Fixture parity does not replace unit, config, filesystem, and process edge tests.
- Map every source test scenario, including parameterized cases, to a named destination test and assertion. Do not drop coverage; equal test counts are insufficient. Inspect the actual Python conversion before planning Go.
- Follow the independent README migration prompts, including a new saved plan and approval gate. Record tool-measured ISO start/end times, elapsed wall time, approval/install waits, and active work; mark unmeasured values unknown.
- Preserve history. Do not commit, branch, write to remotes, or delete files without explicit permission. Propose old-language cleanup only after complete test mapping and verified parity, with separate permission; preserve fixtures, original inputs, sample/config, plans/logs, and both README prompts.
- Runtime launchers may change across languages; arguments, logical help, errors, reports, and filesystem safety may not. Document actual entry commands rather than assuming an installed command.
- The CLI must run offline after installation. Model access for conversion is separate. Cache uv/Python/pytest and the Go toolchain/dependencies before offline demos; report actual offline verification or explicitly state its absence.
