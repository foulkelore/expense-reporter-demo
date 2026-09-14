import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../src/app.js';

const usage =
  'Usage: expense-reporter [--config <path>]\n       expense-reporter --help\n';
const validConfig = {
  inputPath: 'input.csv',
  outputPath: 'output/report.json',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
};
const validCsv =
  'date,category,description,amount\n2026-01-01,Meals,Lunch,1.23\n';
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'expense-app-'));
  await writeFile(join(directory, 'config.json'), JSON.stringify(validConfig));
  await writeFile(join(directory, 'input.csv'), validCsv);
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('run', () => {
  it('uses config.json by default and creates the output directory', async () => {
    expect(await run([], directory)).toEqual({
      exitCode: 0,
      stdout:
        'Expense report: 2026-01-01 to 2026-01-31\nExpenses: 1\n\nCategory | Expenses | Total\nMeals | 1 | $1.23\n\nTotal: $1.23\n',
      stderr: '',
    });
    expect(
      JSON.parse(
        await readFile(join(directory, validConfig.outputPath), 'utf8'),
      ),
    ).toMatchObject({ expenseCount: 1, totalCents: 123 });
  });
  it('resolves an explicit config from another working directory', async () => {
    expect(
      (await run(['--config', join(directory, 'config.json')], tmpdir()))
        .exitCode,
    ).toBe(0);
  });
  it('handles config paths with spaces', async () => {
    await writeFile(
      join(directory, 'custom config.json'),
      JSON.stringify(validConfig),
    );
    expect(
      (await run(['--config', 'custom config.json'], directory)).exitCode,
    ).toBe(0);
  });
  it('prints help without reading config or writing output', async () => {
    await rm(join(directory, 'config.json'));
    expect(await run(['--help'], directory)).toEqual({
      exitCode: 0,
      stdout: usage,
      stderr: '',
    });
    expect(await readdir(directory)).toEqual(['input.csv']);
  });
  it.each([
    ['--unknown'],
    ['--config'],
    ['--config', ''],
    ['--help', 'extra'],
    ['one', 'two'],
    ['--config', 'config.json', 'extra'],
  ])('returns usage exit code 2 for %j', async (...args) => {
    expect(await run(args, directory)).toEqual({
      exitCode: 2,
      stdout: '',
      stderr: 'Error: invalid arguments\n' + usage,
    });
  });
  it('normalizes missing config errors', async () => {
    expect(await run(['--config', 'absent.json'], directory)).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Error: cannot read config file\n',
    });
  });
  it('normalizes missing input errors', async () => {
    await rm(join(directory, 'input.csv'));
    expect(await run([], directory)).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Error: cannot read input CSV\n',
    });
  });
  it('does not overwrite a previous report on invalid CSV', async () => {
    await mkdir(join(directory, 'output'));
    await writeFile(
      join(directory, validConfig.outputPath),
      'previous report\n',
    );
    await writeFile(join(directory, 'input.csv'), 'bad');
    expect((await run([], directory)).exitCode).toBe(1);
    expect(
      await readFile(join(directory, validConfig.outputPath), 'utf8'),
    ).toBe('previous report\n');
  });
  it('does not overwrite a previous report on invalid config', async () => {
    await mkdir(join(directory, 'output'));
    await writeFile(
      join(directory, validConfig.outputPath),
      'previous report\n',
    );
    await writeFile(join(directory, 'config.json'), '{');
    expect((await run([], directory)).exitCode).toBe(1);
    expect(
      await readFile(join(directory, validConfig.outputPath), 'utf8'),
    ).toBe('previous report\n');
  });
  it('replaces an existing report only on success and leaves no temp files', async () => {
    await mkdir(join(directory, 'output'));
    await writeFile(
      join(directory, validConfig.outputPath),
      'previous report\n',
    );
    expect((await run([], directory)).exitCode).toBe(0);
    expect(await readdir(join(directory, 'output'))).toEqual(['report.json']);
  });
  it('returns an actionable error when the output parent is a file', async () => {
    await writeFile(join(directory, 'output'), 'not a directory');
    expect(await run([], directory)).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Error: cannot write report file\n',
    });
  });
  it('cleans up temporary files when report replacement fails', async () => {
    await mkdir(join(directory, validConfig.outputPath), { recursive: true });
    expect(await run([], directory)).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Error: cannot write report file\n',
    });
    expect(await readdir(join(directory, 'output'))).toEqual(['report.json']);
  });
  it.each(['input.csv', 'config.json'])(
    'rejects an output symlink to %s without modifying the source',
    async (source) => {
      const before = await readFile(join(directory, source), 'utf8');
      await mkdir(join(directory, 'output'));
      await symlink(
        join(directory, source),
        join(directory, validConfig.outputPath),
      );
      expect(await run([], directory)).toEqual({
        exitCode: 1,
        stdout: '',
        stderr:
          'Error: outputPath must differ from inputPath and the config file\n',
      });
      expect(await readFile(join(directory, source), 'utf8')).toBe(before);
    },
  );
  it('rejects an output hard link to the input', async () => {
    await mkdir(join(directory, 'output'));
    await link(
      join(directory, 'input.csv'),
      join(directory, validConfig.outputPath),
    );
    expect((await run([], directory)).stderr).toBe(
      'Error: outputPath must differ from inputPath and the config file\n',
    );
  });
});
