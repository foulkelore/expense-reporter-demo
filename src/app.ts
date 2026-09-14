import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { loadConfig } from './config.js';
import { parseExpenses } from './csv.js';
import { buildReport, renderSummary, serializeReport } from './report.js';
import type { Config } from './types.js';

const usage =
  'Usage: expense-reporter [--config <path>]\n       expense-reporter --help\n';

export interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs one report without writing to process streams or exiting the process. */
export async function run(
  args: readonly string[],
  cwd: string,
): Promise<CliResult> {
  if (args.length === 1 && args[0] === '--help') {
    return { exitCode: 0, stdout: usage, stderr: '' };
  }
  if (
    args.length !== 0 &&
    !(args.length === 2 && args[0] === '--config' && args[1] !== '')
  ) {
    return {
      exitCode: 2,
      stdout: '',
      stderr: 'Error: invalid arguments\n' + usage,
    };
  }
  try {
    const configPath = resolve(cwd, args[1] ?? 'config.json');
    const config = await loadConfig(configPath);
    let csv: string;
    try {
      csv = await readFile(config.inputPath, 'utf8');
    } catch {
      throw new Error('cannot read input CSV');
    }
    const report = buildReport(parseExpenses(csv), config);
    await assertOutputSafe(config, configPath);
    await writeReport(config.outputPath, serializeReport(report));
    return { exitCode: 0, stdout: renderSummary(report), stderr: '' };
  } catch (error) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Error: ${error instanceof Error ? error.message : 'unexpected failure'}\n`,
    };
  }
}

async function assertOutputSafe(
  config: Config,
  configPath: string,
): Promise<void> {
  let output;
  let sources;
  try {
    output = await stat(config.outputPath);
    sources = await Promise.all([stat(config.inputPath), stat(configPath)]);
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    )
      return;
    throw new Error('cannot write report file');
  }
  if (
    sources.some(
      (source) => source.dev === output.dev && source.ino === output.ino,
    )
  ) {
    throw new Error(
      'outputPath must differ from inputPath and the config file',
    );
  }
}

async function writeReport(outputPath: string, json: string): Promise<void> {
  const temporaryPath = join(
    dirname(outputPath),
    `.expense-reporter-${randomUUID()}.tmp`,
  );
  let created = false;
  try {
    await mkdir(dirname(outputPath), { recursive: true });
    const file = await open(temporaryPath, 'wx');
    created = true;
    try {
      await file.writeFile(json, 'utf8');
    } finally {
      await file.close();
    }
    // A sibling file keeps replacement on the same filesystem and atomic.
    await rename(temporaryPath, outputPath);
  } catch {
    throw new Error('cannot write report file');
  } finally {
    if (created) {
      try {
        await rm(temporaryPath, { force: true });
      } catch {
        throw new Error('cannot write report file');
      }
    }
  }
}
