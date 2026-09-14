import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixtureDirectory = join(root, 'tests/fixtures');
interface FixtureCase {
  name: string;
  input: string;
  startDate: string;
  endDate: string;
  exitCode: number;
  stdoutFile?: string;
  reportFile?: string;
  stderr?: string;
}
const cases: FixtureCase[] = JSON.parse(
  await readFile(join(fixtureDirectory, 'cases.json'), 'utf8'),
);
const directories: string[] = [];

beforeAll(() => {
  const build = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules/typescript/bin/tsc'),
      '-p',
      'tsconfig.build.json',
    ],
    { cwd: root, encoding: 'utf8', timeout: 30000 },
  );
  expect(build.error).toBeUndefined();
  expect(build.status, build.stdout + build.stderr).toBe(0);
}, 35000);
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'expense-cli-'));
  directories.push(directory);
  return directory;
}
function execute(directory: string, args: string[] = []) {
  return spawnSync(process.execPath, [join(root, 'dist/cli.js'), ...args], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
}

describe('language-neutral CLI fixture contract', () => {
  it.each(cases)(
    '$name preserves exact stdout, stderr, JSON bytes and exit status',
    async (scenario) => {
      const directory = await workspace();
      await copyFile(
        join(fixtureDirectory, scenario.input),
        join(directory, 'input.csv'),
      );
      await writeFile(
        join(directory, 'config.json'),
        JSON.stringify({
          inputPath: 'input.csv',
          outputPath: 'report.json',
          startDate: scenario.startDate,
          endDate: scenario.endDate,
        }),
      );
      await writeFile(join(directory, 'report.json'), 'previous report\n');

      const result = execute(directory);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(scenario.exitCode);
      expect(result.stderr).toBe(scenario.stderr ?? '');
      expect(result.stdout).toBe(
        scenario.stdoutFile
          ? await readFile(join(fixtureDirectory, scenario.stdoutFile), 'utf8')
          : '',
      );
      expect(await readFile(join(directory, 'report.json'), 'utf8')).toBe(
        scenario.reportFile
          ? await readFile(join(fixtureDirectory, scenario.reportFile), 'utf8')
          : 'previous report\n',
      );
    },
  );
});

describe('CLI process boundary', () => {
  it('prints stable help without requiring files', async () => {
    const result = execute(await workspace(), ['--help']);
    expect({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    }).toEqual({
      status: 0,
      stdout:
        'Usage: expense-reporter [--config <path>]\n       expense-reporter --help\n',
      stderr: '',
    });
  });
  it('uses exit 2 for unsupported arguments', async () => {
    const result = execute(await workspace(), ['--bad']);
    expect({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    }).toEqual({
      status: 2,
      stdout: '',
      stderr:
        'Error: invalid arguments\nUsage: expense-reporter [--config <path>]\n       expense-reporter --help\n',
    });
  });
  it('reads --config from outside its directory, including spaces in the path', async () => {
    const directory = await workspace();
    await copyFile(
      join(fixtureDirectory, 'normal.csv'),
      join(directory, 'input.csv'),
    );
    const configPath = join(directory, 'custom config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        inputPath: 'input.csv',
        outputPath: 'report.json',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      }),
    );
    const result = execute(tmpdir(), ['--config', configPath]);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      await readFile(join(fixtureDirectory, 'normal.stdout'), 'utf8'),
    );
  });
  it('leaves no new report on invalid input', async () => {
    const directory = await workspace();
    await copyFile(
      join(fixtureDirectory, 'invalid-amount.csv'),
      join(directory, 'input.csv'),
    );
    await writeFile(
      join(directory, 'config.json'),
      JSON.stringify({
        inputPath: 'input.csv',
        outputPath: 'report.json',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      }),
    );
    expect(execute(directory).status).toBe(1);
    await expect(
      readFile(join(directory, 'report.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
