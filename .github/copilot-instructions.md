# Expense Reporter Demo — Project Instructions

## Purpose and scope

- This offline TypeScript expense CLI is a TypeScript → Python → Go migration demo, not an accounting product. Don't migrate without an explicit request.
- Use fictional dollars only. Don't add refunds, currency conversion, databases, a UI, authentication, API keys, external services, or runtime networking.
- Read `README.md`, source/tests, and `tests/fixtures/cases.json` before changes. Preserve user work; don't assume layouts or prior migrations.
- Keep new Markdown under `.github/`, except root `README.md`; update renamed paths/functions and README commands. Don't publish private paths, key names, credentials, or author details.

## Planning and TDD

- **Plans and analysis docs (local, untracked) go in `.github/plans/`.** The only exception is `README.md` at the project root.
- Nontrivial changes need a plan: Summary, Goals, Scope, test-first Approach, Out of Scope, Risks & Open Questions, Checklist. **Stop for explicit approval before production code**; approve each migration separately.
- Run a failing behavioral test, implement minimally, then refactor with tests green. Keep calculation/rendering pure and I/O isolated.
- Run focused then broader checks; record exact commands/results. Don't claim unrun checks passed or fix unrelated failures.

### General workflow

- Act on clear requests; keep reviews read-only. Ask when exploration vs. implementation is ambiguous or facts are missing; don't guess.
- **Address me as "My liege"** at the end of every response, worked naturally into your closing sentence(s) — not awkwardly tacked on its own line.
- Terminal starts at the project root; don't prefix commands with `cd`. Use head/tail output limits, not truncating pipes; `clear` resets an unreadable terminal.
- Remove unused functions, parameters, and commented-out code within scope. Comments explain non-obvious intent; they are earned, not required.

## Baseline tooling and boundaries

- Use Node.js 22, at least 22.12.0 (`.nvmrc`: `22`), strict TypeScript, and the npm lockfile. Install with `npm ci`.
- Commands: `npm test`, `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npm run format:check`, `npm run check` (typecheck, coverage, build, formatting). Format: `npm run format`. No lint script.
- Build before `node dist/cli.js` or `npm run --silent start`; `npm start` may print npm's banner.
- Vitest runs unit, temporary-filesystem, and built-process tests together under `tests/`; no real services.

### Dependencies

- `csv-parse` is the only runtime dependency; justify additions. Keep exact pins; refresh `package-lock.json` with `npm install` after dependency changes.
- For vulnerability fixes, prefer latest stable over the minimum fixed version. Check release notes: if latest requires breaking code changes here, use the highest non-breaking version at or above the fix and explain in the PR why latest wasn't taken.

## Contract that migrations must preserve

- Preserve validation, stdout/stderr/JSON bytes, ordering, final LF, and exit statuses. Keep integer cents capped at `9007199254740991` in every language.
- Flag changes to output alias checks, atomic replacement, or failure cleanup. Never overwrite CSV/config or lose an existing report on failure.

## Fixtures and migration discipline

- `tests/fixtures/` inputs/expectations are immutable and manually authored: **never generate or refresh expected output from the implementation** to make tests pass.
- Preserve exact harness streams, report bytes, status, and old-report assertions. Map every scenario, including parameterized cases, to a named destination test/assertion; fixture parity and equal counts aren't full coverage.
- Inspect actual Python before planning Go; preserve both README prompts. Measure ISO start/end, elapsed/active work, approval/install waits; mark unmeasured values unknown.
- Don't commit, branch, write remotes, or delete files without permission. Old-language cleanup needs full mapping, verified parity, and separate permission; preserve fixtures, inputs, sample/config, and planning history.
- Document actual launchers; arguments, help, errors, reports, and filesystem safety stay unchanged. Cache uv/Python/pytest and Go toolchains/dependencies for offline demos. Report offline verification or its absence; model access is separate.

## Instruction Files Policy

- `*.instructions.md` files are **manual-attach only** unless they have a narrow `applyTo` glob. Don't use broad globs such as `**/*`; references don't auto-load files.
- Declare scope in YAML `description`. `applyTo` accepts comma-separated globs; optional `excludeAgent: "code-review"` or `excludeAgent: "cloud-agent"` excludes that agent.
- [Expense CLI conventions](instructions/expense-cli.instructions.md) covers implementation, tests, and detailed contracts; its scope is `src/**,tests/**,config.json,data/*.csv`.
