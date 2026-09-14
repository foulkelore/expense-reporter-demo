# Expense Reporter Demo

A small, offline TypeScript CLI for demonstrating AI-assisted **TypeScript → Python → Go** migrations. It reads fictional expenses from CSV, selects an inclusive date range, groups by category, and prints a summary while saving a deterministic JSON report.

The interesting part is preserving behavior, not translating syntax: exact cents, calendar validation, CSV quoting, Unicode ordering, filesystem safety, and process output all have tests. This repository starts with **TypeScript only**; the two prompts below are exercises, not prebuilt Python or Go implementations.

All amounts are fictional dollars. This is not an accounting product; refunds, currency conversion, databases, a UI, and external services are out of scope.

## Quick start

Prerequisites: access to the private `foulkelore/expense-reporter-demo` repository, Git, and **Node.js 22 (at least 22.12.0)** with npm. `.nvmrc` selects major version `22`; use `nvm install` and `nvm use` if you manage Node with nvm.

```sh
git clone https://github.com/foulkelore/expense-reporter-demo.git
cd expense-reporter-demo
npm ci
npm run check
npm run build
npm run --silent start
```

`check` already builds; the explicit build shows the standalone compilation step. `npm start` also works, but npm may print a script banner. Use `npm run --silent start` or `node dist/cli.js` for clean application stdout.

With the supplied `config.json` and `data/expenses.csv`, stdout is exactly the following, including a final LF:

```text
Expense report: 2026-01-01 to 2026-01-31
Expenses: 5

Category | Expenses | Total
Meals | 2 | $31.25
Supplies | 1 | $9.99
Travel | 2 | $50.25

Total: $91.49
```

The app creates `reports/` and writes `reports/report.json`: five selected expenses, totaling **9149 cents**. See the [complete expected JSON](tests/fixtures/normal.json).

### Network and demo preparation

After dependencies are installed, the CLI runs offline: no API keys, external services, or runtime network calls. Installation is a separate preparation step. AI-assisted conversion itself needs network access to your chosen model unless you use an already available local model; its access and costs are separate from the CLI.

Before an offline demo, install/cache Node dependencies, **uv, Python 3.12+, and pytest**, plus the **Go toolchain** and any required module/build caches. Prewarm the target environments as well as the TypeScript baseline; do not rely on first-run downloads during the presentation. The starter has no Python or Go dependency files yet.

### Commands

| Task                                             | Command                                 |
| ------------------------------------------------ | --------------------------------------- |
| Install locked dependencies                      | `npm ci`                                |
| Run Vitest tests, including CLI fixtures         | `npm test`                              |
| Compile TypeScript to `dist/`                    | `npm run build`                         |
| Run compiled CLI                                 | `npm start` or `npm run --silent start` |
| Run without npm output                           | `node dist/cli.js`                      |
| Select configuration                             | `node dist/cli.js --config config.json` |
| Display help without reading files               | `node dist/cli.js --help`               |
| Check TypeScript types                           | `npm run typecheck`                     |
| Run tests with V8 coverage                       | `npm run test:coverage`                 |
| Check formatting without changes                 | `npm run format:check`                  |
| Run typecheck, coverage tests, build, formatting | `npm run check`                         |

Build before directly running `dist/cli.js`. CLI integration tests compile their own entry point before executing it.

## Behavioral contract

### Configuration and safe output

No arguments loads `config.json` in the **current working directory**. `--config` accepts a nonempty path argument; quote paths containing spaces. Configured relative input/output paths resolve against the **configuration file's directory**, not the working directory. Absolute paths are accepted.

```json
{
  "inputPath": "data/expenses.csv",
  "outputPath": "reports/report.json",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31"
}
```

These are exactly the four required keys; unknown keys fail. Values must be nonempty strings. Paths must be nonblank and contain no NUL; their meaningful leading/trailing spaces are preserved, not trimmed away. Dates must be exact Gregorian `YYYY-MM-DD`, years `0001`–`9999`, with `startDate <= endDate`. Both boundaries are included; a single-day range is valid.

The output must not alias the input CSV or config, including through symlinks or hard links. Only after all validation and calculation succeeds does the app create missing parent directories, write a sibling temporary file, and rename it over the destination. A failed run preserves an existing report; failure does not promise to remove newly created parent directories.

### CSV and money

- Header fields must be exactly `date,category,description,amount`, in that order and case, without header whitespace normalization.
- An optional UTF-8 BOM, LF/CRLF, and truly empty lines are accepted. Spaces-only lines are not empty records and fail. Every data record must have four fields.
- Quoted commas, escaped double quotes, and multiline descriptions work. ASCII spaces and tabs are trimmed from cell-value edges, including quoted values; other whitespace is not broadly trimmed.
- Descriptions may be empty and do not affect totals. Categories must be nonempty after trimming and remain case-sensitive, with no Unicode normalization.
- Categories cannot contain C0/C1 controls (including DEL), U+2028, U+2029, or `|`. They sort lexicographically by **Unicode code point**, not locale or JavaScript's default UTF-16 ordering.
- Dates follow the same calendar rules as config. **All records validate before filtering**: an invalid out-of-range expense still fails the run. Error record numbers count parsed records including the header, not physical lines of multiline CSV.
- Amount syntax is ASCII digits with an optional decimal point and one or two fractional digits: `0`, `12.3`, `12.34`, `0001.02` are valid. Negative/positive signs, exponents, `.5`, `1.`, separators, and extra precision are invalid.
- Parse and sum **integer cents**, never floating-point currency. Each amount and the selected grand total must be at most `9007199254740991` cents. Valid excluded amounts do not contribute to the total; zero-cent selected expenses still count.
- A header-only file or a range with no matching expenses produces a zero report with `categories: []`. A completely empty file fails header validation.

### Deterministic output and errors

The summary uses literal `$`, two fractional digits, no thousands separators, LF line endings, and a final LF. JSON uses UTF-8 with unescaped Unicode, two-space indentation, and a final LF. Property order is `startDate`, `endDate`, `expenseCount`, `totalCents`, `categories`; each category has `category`, `expenseCount`, `totalCents` in that order. Descriptions and timestamps are absent from reports. JSON syntax characters still receive necessary escaping.

Only no arguments, exactly `--config <nonempty-path>`, or `--help` alone are accepted. The logical help text is:

```text
Usage: expense-reporter [--config <path>]
       expense-reporter --help
```

`expense-reporter` here is a usage label, **not an installed binary**. Invoke it through Node as shown above.

| Result                    | Exit | stdout             | stderr                                                 |
| ------------------------- | ---- | ------------------ | ------------------------------------------------------ |
| Report written            | `0`  | Summary only       | Empty                                                  |
| Help alone                | `0`  | Help plus final LF | Empty                                                  |
| Validation or I/O failure | `1`  | Empty              | `Error: <message>\n`, no stack trace                   |
| Invalid arguments         | `2`  | Empty              | `Error: invalid arguments\n` followed by the help text |

Stable I/O messages are `cannot read config file`, `cannot read input CSV`, and `cannot write report file`. Consult [config tests](tests/config.test.ts), [CSV tests](tests/csv.test.ts), [validation tests](tests/validation.test.ts), [application tests](tests/app.test.ts), and the [fixture manifest](tests/fixtures/cases.json) for exact validation strings and precedence. Do not replace these with platform-specific exception messages during a migration.

## Code and tests

| Location                           | Responsibility                                                        |
| ---------------------------------- | --------------------------------------------------------------------- |
| `src/cli.ts`                       | Process adapter: arguments, stdout/stderr, exit status                |
| `src/app.ts`                       | Orchestration, input I/O, alias protection, atomic report replacement |
| `src/config.ts`                    | JSON schema checks, calendar range, config-relative paths             |
| `src/csv.ts`                       | CSV parsing and complete record validation                            |
| `src/validation.ts`                | Gregorian dates and exact decimal-to-cents parsing                    |
| `src/report.ts`                    | Pure filtering, aggregation, sorting, summary and JSON rendering      |
| `src/types.ts`                     | Config, expense, category total, and report types                     |
| `data/expenses.csv`, `config.json` | Fictional default demo input and configuration                        |
| `tests/*.test.ts`                  | Unit, filesystem/application, and process integration tests           |
| `tests/fixtures/`                  | Language-neutral CSV inputs, expected outputs, and case manifest      |

`csv-parse` is the only runtime dependency; it handles CSV syntax rather than a hand-written comma splitter. TypeScript, Vitest/V8 coverage, and Prettier are development tooling.

The [14-case manifest](tests/fixtures/cases.json) covers normal, header-only, no-match, quoted, Unicode, maximum cents, invalid date/amount/header, malformed CSV, overflow, empty category, overprecision, and unsafe category scenarios. [The CLI harness](tests/cli.test.ts) runs each case in a temporary workspace and compares exact stdout, stderr, report bytes, and exit status; failures must preserve a preexisting report.

Expected `.stdout`, `.json`, and manifest error strings are **manually authored contract data**. Never regenerate them from application output to make a test pass. Keep inputs and expectations unchanged across languages. Unit and filesystem tests cover additional scenarios beyond these 14 cases; fixture parity alone does not prove complete migration coverage.

To compare the default run after building:

```sh
node dist/cli.js
node dist/cli.js > reports/summary.txt
diff -u tests/fixtures/normal.stdout reports/summary.txt
diff -u tests/fixtures/normal.json reports/report.json
```

Run once **before redirecting**: the shell opens `reports/summary.txt` before launching Node, so redirection fails if `reports/` does not exist yet. This comparison assumes the supplied default config and input are unchanged. No diff output means equality; the full CLI test suite also checks errors and exit status.

## A 5–10 minute presentation

1. **Baseline safety (1–2 min):** show `config.json` and the fictional CSV. Run `npm test`, `npm run build`, then the fixture comparison above. Point out 5 expenses, $91.49, integer cents, and failure-preserves-report tests.
2. **TypeScript → Python (2–3 min):** paste the first prompt into your coding agent. Show its inspected baseline, scenario mapping, and saved plan. It must stop for approval; review before authorizing implementation. Then show RED evidence, GREEN tests, and identical fixture bytes.
3. **Python → Go (2–3 min):** use the second prompt only against the actual converted Python project. Repeat the plan approval and parity demonstration, highlighting CSV differences, integer limits, and JSON escaping.
4. **Wrap up (1–2 min):** compare tool-measured elapsed times, exact commands/results, and any unresolved gaps. Discuss why equal test counts are not equal coverage.

These are presentation timeboxes, **not promised migration durations**. Rehearse in advance and use preserved migration logs if conversion exceeds the slot. Never skip approval or report imagined timing/results to fit the talk. Do not delete the original implementations merely to tidy a live demo.

## Copy-ready migration prompts

Each block is independently pasteable. They instruct a future agent to inspect, plan, and **stop for approval before production code**. Do not run them while preparing the TypeScript starter.

### Prompt 1: TypeScript → Python

```text
Migrate expense-reporter-demo from its actual TypeScript baseline to Python.
This is a behavior-preserving demo, not an accounting product. Do not add
refunds, currencies, databases, a UI, external APIs, or runtime networking.

PHASE 1 — INSPECT, MEASURE, PLAN, THEN STOP
1. Read README.md, .github/copilot-instructions.md, package.json, src/*,
   tests/*, tests/fixtures/cases.json, all referenced fixtures, config.json,
   and data/expenses.csv. Inspect actual files; do not assume module names.
   Preserve existing work and report missing files or conflicting contracts.
2. Use a tool/clock to record an actual ISO-8601 start timestamp before work.
   Run the existing TypeScript checks and fixture harness; record commands,
   results, environment, and blockers. Never claim unrun checks passed.
   Track approval waits and dependency/install waits separately from active
   migration work. Never invent timestamps, durations, or benchmark claims.
3. Before production code, save .github/plans/migrate-typescript-to-python.md
   with Summary, Goals, Scope, test-first Approach, Out of Scope, Risks & Open
   Questions, and Checklist. Include a scenario map from EVERY source test
   (including parameterized cases) to a named destination test and its
   preserved assertion. No dropped scenarios; test-count parity is not proof.
   Keep timing/results and the map in this plan or a migration log in .github/.
4. PRESENT THE PLAN AND STOP. Wait for explicit approval. No production code,
   dependency changes, or implementation cleanup before that approval.

PHASE 2 — ONLY AFTER APPROVAL
5. Use Python 3.12+ and uv; select an available compatible version and pin it
   with uv python pin. Use pyproject.toml and uv.lock; pytest is a development
   dependency. Prefer dataclasses, pathlib, csv, json, and integer arithmetic.
   Do not add unnecessary dependencies. Document the actual runtime command;
   changing the language launcher is allowed, changing app arguments is not.
6. Work in small RED-GREEN-REFACTOR cycles. Write destination tests first,
   execute them and retain meaningful failing evidence for missing behavior,
   implement the minimum, then refactor with tests green. Port every mapped
   unit, config, filesystem, and process scenario, not only happy-path fixtures.
7. Preserve the following contract, checking actual source/tests for details:
   - Only no args, exactly --config with a nonempty path argument, or --help
     alone. Default config.json is in cwd; input/output paths are relative to
     the config file. Preserve path spaces; reject blank and NUL config paths.
   - Help is exactly the following string (escapes denote LF bytes):
     "Usage: expense-reporter [--config <path>]\n       expense-reporter --help\n"
     This remains a logical label, not a requirement to install that binary.
   - Successful report: exit 0, summary only on stdout, empty stderr. Help:
     exit 0, help only on stdout. Validation/I/O: exit 1, empty stdout,
     "Error: <message>\n" on stderr, no stack trace. Invalid args: exit 2,
     empty stdout, "Error: invalid arguments\n" plus help on stderr.
     Preserve exact error strings and validation precedence from tests.
   - Config is an object with exactly inputPath/outputPath/startDate/endDate,
     all required nonempty strings, no unknown keys. Dates are exact Gregorian
     YYYY-MM-DD, years 0001-9999; start <= end, inclusive on both boundaries.
   - CSV header sequence is date,category,description,amount, exact case and
     no header trimming; four fields per record. Accept optional BOM, LF/CRLF,
     truly blank lines, quoted commas, escaped quotes, multiline descriptions.
     Reject spaces-only lines. Trim only ASCII spaces/tabs at cell-value edges;
     descriptions may be empty. Validate ALL rows before date filtering and
     number parsed records including the header, not physical CSV lines.
   - Categories stay case-sensitive, nonempty, not Unicode-normalized, sorted
     by Unicode code point. Forbid C0/C1 controls, DEL, U+2028/U+2029, and |.
   - Amounts are ASCII digits plus optional 1-2 decimals, leading zeros allowed;
     reject signs, exponents, .5, 1., separators, and extra precision. No floats.
     Keep the 9007199254740991-cent ceiling for each amount and selected total
     despite Python's unbounded ints. Count zero amounts; excluded rows do not
     add to the total. Header-only/no matches yields zero totals and [].
   - Summary bytes, blank lines, dollar formatting, and final LF are unchanged.
     JSON: UTF-8, ensure_ascii=False, indent=2, final LF, integer-cent numbers;
     field order startDate/endDate/expenseCount/totalCents/categories, then
     category/expenseCount/totalCents in each item. Empty categories is [].
   - Reject output aliases to input/config, including symlinks and hard links.
     Validate/calculate before writing; create parents, write a sibling temp
     file, then atomically replace. Preserve the old report on any failure,
     clean temp files, and normalize I/O errors to the original messages.
8. Use csv with strict=True and newline-aware UTF-8 reading, handling BOM.
   Do not assume strict=True enforces identical quoting or record widths:
   verify header, blank-line, malformed-quote, CRLF/multiline, and row-number
   semantics against the source; add explicit adaptations where needed.
   Python date/regex/whitespace defaults must not broaden accepted input.
9. Consume unchanged tests/fixtures/cases.json in a subprocess fixture harness.
   Compare stdout/stderr and JSON as BYTES, not parsed-equivalent JSON; assert
   exit status, no new report on invalid input, and preserved old reports.
   Expectations are manually authored: never rewrite/regenerate fixtures from
   the implementation. Validate all mapped scenarios plus full fixture parity.
10. Run uv run pytest and the documented Python CLI with dependencies cached
    and network disabled/offline mode; prevent uv first-run downloads. Record
    actual offline evidence or clearly state offline execution was unverified.
    Show default output equals normal.stdout and normal.json. Create report
    parents via an initial app run before redirecting stdout into reports/.
11. Preserve history: no commits, branches, remote writes, or deletions without
    explicit permission. Propose old-language cleanup ONLY after the scenario
    map is complete and all parity checks pass; obtain separate permission.
    Keep shared fixtures, original inputs, sample CSV/config, plans, migration
    logs, README migration prompts, and history. Update README commands and
    launcher adapters to reflect the real Python entry point without erasing
    the demo's TypeScript origin or the independent Python-to-Go prompt.
12. Finish with a tool-measured ISO-8601 end timestamp and actual elapsed wall
    time. Distinguish total elapsed, approval waits, install waits, and active
    coding/testing time; mark anything not measured as unknown. Summarize
    changed files, exact validation commands/results, scenario coverage,
    fixture parity, runtime command, and unresolved limitations honestly.
```

### Prompt 2: Python → Go

```text
Migrate expense-reporter-demo from its ACTUAL converted Python version to Go.
First verify Python is present; if only TypeScript exists, STOP and explain
that the Python migration is a prerequisite. Do not invent a Python layout.
This is a behavior-preserving demo, not an accounting product. No new refunds,
currencies, databases, UI, external APIs, or runtime networking.

PHASE 1 — INSPECT, MEASURE, PLAN, THEN STOP
1. Read README.md, .github/copilot-instructions.md, the actual Python source,
   pyproject.toml, uv.lock, the Python pin, tests, shared fixture manifest
   tests/fixtures/cases.json and referenced files, config.json, sample CSV,
   and prior migration plans/logs. Discover actual paths and runtime commands.
   Preserve existing work; report missing files or conflicting contracts.
2. Use a tool/clock to record an actual ISO-8601 start timestamp before work.
   Run the actual Python baseline tests and fixture harness. Record exact
   commands, environment, results, blockers, and separate approval/install
   waits from active migration work. Never invent times or successful checks.
3. Before production code, save .github/plans/migrate-python-to-go.md with
   Summary, Goals, Scope, test-first Approach, Out of Scope, Risks & Open
   Questions, and Checklist. Map EVERY actual Python test scenario (including
   parameterized cases) to a named Go test/subtest and preserved assertion;
   reconcile the prior TypeScript mapping too. No dropped scenarios: matching
   test counts is insufficient. Save the map and timing/results in .github/.
4. PRESENT THE PLAN AND STOP for explicit approval. Do not write production
   code, alter dependencies, or clean up source languages before approval.

PHASE 2 — ONLY AFTER APPROVAL
5. Select a currently supported compatible Go toolchain, verify its availability,
   and pin/document it in go.mod using appropriate go/toolchain directives.
   Cache it before offline runs; avoid automatic toolchain downloads then.
   Prefer the standard library: structs, encoding/csv, encoding/json, strings,
   integer arithmetic, filesystem and process APIs. Use go.sum only if external
   dependencies require it. Do not add dependencies just to mirror Python.
   Discover a suitable module/entry layout; document the actual Go launcher.
6. Use small RED-GREEN-REFACTOR cycles: write and RUN failing Go tests before
   implementation, retain meaningful RED evidence, implement the minimum,
   refactor with tests green. Use table-driven tests and named subtests for
   mapped cases. Port unit, config, filesystem, and process edge tests too.
7. Preserve the contract, checking actual Python/source tests for details:
   - Only no args, exactly --config with a nonempty path argument, or --help
     alone. Default config.json is in cwd; configured paths resolve against
     the config file. Preserve path spaces; reject blank/NUL config paths.
   - Help string (escapes denote LF bytes) remains exactly:
     "Usage: expense-reporter [--config <path>]\n       expense-reporter --help\n"
     The launcher may change; this logical label and arguments must not.
   - Report success: exit 0, summary only on stdout, empty stderr. Help: exit 0,
     help only on stdout. Validation/I/O: exit 1, empty stdout, stderr exactly
     "Error: <message>\n", no stack. Invalid args: exit 2, empty stdout,
     stderr "Error: invalid arguments\n" plus help. Preserve tested messages
     and precedence, not default Go flag/parser or OS error wording.
   - Config is exactly inputPath/outputPath/startDate/endDate, all required
     nonempty strings, no unknown keys. Dates: exact Gregorian YYYY-MM-DD,
     years 0001-9999; start <= end and both inclusive. Do not allow year zero.
   - CSV exact header sequence date,category,description,amount, case-sensitive
     without header trimming; four fields per record. Optional BOM, LF/CRLF,
     truly blank lines, quoted commas/escaped quotes/multiline descriptions
     accepted; spaces-only lines rejected. Trim ONLY ASCII space/tab at value
     edges; descriptions can be empty. Validate ALL rows before filtering;
     errors number parsed records including header, not physical lines.
   - Categories: nonempty, case-sensitive, no Unicode normalization, ordered
     by Unicode code point, no C0/C1 controls, DEL, U+2028/U+2029, or |.
   - Amounts: ASCII digits with optional 1-2 decimals and leading zeros. No
     signs, exponents, .5, 1., separators, extra precision, or floating point.
     Use int64 cents but enforce 9007199254740991 for EACH amount and selected
     total. Check bounds BEFORE multiply/add so huge input cannot overflow.
     Zero-cent expenses count; excluded rows do not add to the selected total.
     Header-only/no matches gives zero totals and categories [].
   - Preserve exact summary bytes, dollar formatting, blank lines, final LF.
     JSON: two-space indent, UTF-8 unescaped Unicode, final LF, integer cents.
     Use ordered struct fields with JSON names startDate/endDate/expenseCount/
     totalCents/categories, then category/expenseCount/totalCents per item.
     Initialize empty slices so categories encodes as [], never null.
   - Reject output aliases to input/config, including symlinks and hard links.
     Validate/calculate first, create parents, write a sibling temporary file,
     then atomically rename. Preserve old reports on failure, clean temporary
     files, and keep normalized I/O errors identical to the Python baseline.
8. Verify encoding/csv differences explicitly: BOM, fixed field counts, strict
   quotes, blank versus spaces-only lines, and CRLF normalization even inside
   quoted descriptions. Adapt to the actual source contract, not defaults.
   Do not let strings.TrimSpace or date parsing broaden accepted input.
   encoding/json escapes HTML characters by default: use SetEscapeHTML(false)
   and verify bytes. It still escapes U+2028/U+2029, but categories forbid them
   and descriptions are absent from reports. Preserve necessary JSON escaping.
9. Reuse immutable tests/fixtures/cases.json with a process harness invoking
   the BUILT Go binary, not go run (which can wrap exit codes). Compare exact
   stdout/stderr/JSON bytes and status, not JSON structural equality. Assert
   old-report preservation on failures and no new report for invalid input.
   Never regenerate manually authored expectations from application output.
   Complete every mapped scenario as well as the shared fixture suite.
10. Run gofmt, go test -race ./..., go vet ./..., and go build ./.... Document
    the command that produces the runnable demo binary. Run it offline with
    the toolchain/dependencies cached; record evidence or mark offline status
    unverified. Compare default output against normal.stdout and normal.json;
    run the app once to create reports/ before redirecting stdout into it.
11. Preserve history: no commits, branches, remote writes, or deletions without
    explicit permission. Only PROPOSE Python/TypeScript cleanup after complete
    scenario mapping and passing parity; get separate permission to remove.
    Keep shared fixtures, original inputs, sample CSV/config, plans, migration
    logs, both README prompts, and history. Update README runtime commands and
    launcher adapters without erasing the TypeScript-to-Python-to-Go narrative.
12. Record a tool-measured ISO-8601 end timestamp and actual elapsed wall time.
    Report total elapsed, approval waits, install waits, and active coding/test
    time separately; unmeasured components are unknown, not estimates. Finish
    with changed files, exact checks/results, coverage mapping, fixture parity,
    actual runtime command, and unresolved limitations. Do not claim unrun
    validations or silently weaken the contract to get green tests.
```
