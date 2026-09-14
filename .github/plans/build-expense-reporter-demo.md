# Build the Expense Reporter Migration Demo

## Summary

Create a standalone, offline TypeScript expense-reporting CLI for a presentation demonstrating AI-assisted TypeScript-to-Python and then Python-to-Go migrations. Publish the approved baseline to GitHub and open this project in Zed. Do not convert the baseline during initial implementation.

Status: complete. The TypeScript baseline is published to the private `foulkelore/expense-reporter-demo` repository on `main`. Final validation and publication results are recorded in `.github/plans/resume-expense-reporter-demo.md`.

## Goals

- Read fictional CSV expenses, filter by an inclusive configured date range, group by category, and print/save a deterministic report.
- Demonstrate the same input, configuration, report data, and observable behavior across three languages.
- Run without API keys, external services, or network access after dependency installation.
- Include complete README demo instructions and separate copy-ready migration prompts for TypeScript to Python and Python to Go.
- Publish through the confirmed SSH identity without changing global Git or SSH configuration.

## Scope

- New project: the standalone `expense-reporter-demo` workspace.
- Approved GitHub repository: `foulkelore/expense-reporter-demo`, private.
- TypeScript source under src/: CLI entry point, configuration, CSV parsing, report calculation/rendering, and domain types.
- tests/: unit tests, CLI integration tests, and reusable language-neutral input/expected-output fixtures.
- Example config.json and fictional CSV data; no real financial information.
- npm/TypeScript/test configuration, lockfile, .gitignore, README.md, and project-specific .github/copilot-instructions.md.
- All additional Markdown planning/documentation files under .github/; README.md at the project root.

## Approach

1. Confirm the plan, repository name/account/visibility, and work SSH identity before production code or remote publication.
2. Scaffold Node.js 22+ tooling with strict TypeScript, npm, and Vitest. Select compatible stable dependencies during implementation. Use a maintained CSV parser for quoted fields rather than splitting on commas.
3. Follow short Red-Green-Refactor cycles. Write failing tests first for money parsing, calendar-date validation, config loading, CSV validation, filtering, aggregation, formatting, and CLI behavior.
4. Introduce typed Config, Expense, and Report models. Keep calculation pure and isolate filesystem/CLI boundaries for fast tests.
5. Proposed contract: CSV headers date,category,description,amount; valid YYYY-MM-DD dates; nonempty categories; nonnegative amounts with at most two decimal places. Store and sum integer cents, reject overflow, and do not use floating-point currency arithmetic. Refunds and currency conversion are excluded.
6. Keep a small JSON configuration with input/output paths and start/end dates. Resolve configured paths relative to the config file. Reject inverted date ranges. Document exact validation and error/exit behavior.
7. Sort categories deterministically, show a console summary, and write a two-space-indented JSON report with integer-cent totals. Avoid current timestamps and locale-dependent formatting so comparison across languages is straightforward.
8. Add fixtures covering normal expenses, quoted commas, empty data, malformed values, date boundaries, and repeated categories. CLI tests use temporary directories; unsuccessful validation must not overwrite a previous report.
9. Document installation, commands, exact output contract, test execution, and a short presentation walkthrough. Preinstall dependencies before the presentation. Show baseline tests/run, agent approval, conversion, and fixture parity.
10. Include two independent README prompts:
    - TypeScript to Python: inspect and baseline first, save a plan and wait for approval, use uv and Python 3.12+, dataclasses, csv/pathlib, pytest, preserved config/output/error contracts, and tests before implementation.
    - Python to Go: inspect the actual converted Python project, save a plan and wait for approval, use a supported pinned Go toolchain, modules, structs, encoding/csv and encoding/json, integer cents, table-driven tests, and the same fixture/CLI contracts.
    - Both prompts require tool-measured timing, an explicit test-scenario mapping, offline CLI validation, and cleanup only after parity passes. Preserve shared fixtures and demo history; do not silently add features or change validation. Neither prompt runs during starter-project creation.
11. Validate tests, TypeScript checks/build, and an actual offline demo run against checked-in expected outputs. Independently check README examples, links, and commands. Review the final tracked-file set for secrets and generated files.
12. After approval and validation, initialize Git, create an initial conventional commit, create the GitHub repository, and push using the confirmed SSH alias. Do not add co-author trailers manually; the configured hook handles them. Verify the remote and published commit, then open the project in Zed.

## Out of Scope

- Web UI, database, authentication, external APIs, real expense data, currency conversion, refunds, deployment, and Docker.
- Implementing Python or Go now; those are the presentation migration exercises.
- Editing or moving the existing Reddit scraper project.
- Changing global Git/SSH settings, copying private keys, or replacing existing repositories.

## Risks & Open Questions

- Latest user instruction confirms `foulkelore/expense-reporter-demo`, superseding the earlier owner choice. Retain private visibility and the confirmed existing Git author configuration.
- The existing SSH routing successfully authenticates as the repository owner; use it without changing global configuration.
- Use the repository owner's saved CLI credential only in a child process environment, without printing it or changing the active/global authentication. Machine-specific paths and personal author details were omitted from this publication copy.
- CSV quoting, invalid calendar dates, integer overflow, ordering, path resolution, and error behavior are potential migration differences; fixtures and explicit contracts guard them.
- New-project scope may require reopening the Zed agent thread after switching workspaces.

## Checklist

- [x] Inspect destination parent and existing SSH routing.
- [x] Verify the existing SSH routing authenticates as the repository owner.
- [x] Create the new local project directory and save this plan.
- [x] Approve scope, repository visibility/name, SSH identity, and author identity.
- [x] Resolve GitHub repository-creation authentication.
- [x] Scaffold tooling and write failing tests.
- [x] Implement and refactor the TypeScript CLI.
- [x] Add demo fixtures and deterministic expected outputs.
- [x] Write README with both migration prompts and demo walkthrough.
- [x] Add project instructions and ignore rules.
- [x] Complete final validation: clean npm ci and Node 22 quality gate passed (168 tests); network-denied CLI execution and exact sample fixture parity passed.
- [x] Commit, create the private remote repository, push via the confirmed SSH routing, and verify the published baseline commit.
- [x] Open the new project in Zed (current workspace).
