import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const validConfig = {
  inputPath: 'data/expenses.csv',
  outputPath: 'reports/report.json',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
};
let directory: string;
let configPath: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'expense-config-'));
  configPath = join(directory, 'config.json');
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
async function load(value: unknown) {
  await writeFile(configPath, JSON.stringify(value));
  return loadConfig(configPath);
}

describe('loadConfig', () => {
  it('resolves paths relative to the config file, not the working directory', async () => {
    expect(await load(validConfig)).toEqual({
      ...validConfig,
      inputPath: join(directory, 'data/expenses.csv'),
      outputPath: join(directory, 'reports/report.json'),
    });
  });
  it('accepts absolute paths and a single-day range', async () => {
    const config = {
      ...validConfig,
      inputPath: join(directory, 'in.csv'),
      outputPath: join(directory, 'out.json'),
      endDate: validConfig.startDate,
    };
    expect(await load(config)).toEqual(config);
  });
  it.each([null, [], true, 'config', 42])(
    'rejects a non-object config %j',
    async (value) => {
      await expect(load(value)).rejects.toThrow('config must be a JSON object');
    },
  );
  it.each(['inputPath', 'outputPath', 'startDate', 'endDate'])(
    'rejects missing %s',
    async (field) => {
      const config: Record<string, unknown> = { ...validConfig };
      delete config[field];
      await expect(load(config)).rejects.toThrow(
        `config.${field} must be a nonempty string`,
      );
    },
  );
  it.each(['', ' ', null, 123])(
    'rejects invalid path %j',
    async (inputPath) => {
      await expect(load({ ...validConfig, inputPath })).rejects.toThrow(
        'config.inputPath must be a nonempty string',
      );
    },
  );
  it('rejects unknown keys instead of silently ignoring typos', async () => {
    await expect(load({ ...validConfig, currency: 'USD' })).rejects.toThrow(
      'config contains unknown keys',
    );
  });
  it('rejects an invalid calendar date', async () => {
    await expect(
      load({ ...validConfig, startDate: '2026-02-30' }),
    ).rejects.toThrow(
      'startDate must be a valid YYYY-MM-DD date (years 0001-9999)',
    );
  });
  it('rejects inverted ranges', async () => {
    await expect(
      load({ ...validConfig, startDate: '2026-02-01' }),
    ).rejects.toThrow('startDate must not be after endDate');
  });
  it('rejects a NUL path', async () => {
    await expect(
      load({ ...validConfig, outputPath: 'bad\0path' }),
    ).rejects.toThrow('config.outputPath must not contain NUL');
  });
  it('rejects overwriting the CSV', async () => {
    await expect(
      load({ ...validConfig, outputPath: './data/expenses.csv' }),
    ).rejects.toThrow(
      'outputPath must differ from inputPath and the config file',
    );
  });
  it('rejects overwriting the config', async () => {
    await expect(
      load({ ...validConfig, outputPath: 'config.json' }),
    ).rejects.toThrow(
      'outputPath must differ from inputPath and the config file',
    );
  });
  it('normalizes malformed JSON errors', async () => {
    await writeFile(configPath, '{');
    await expect(loadConfig(configPath)).rejects.toThrow(
      'config must contain valid JSON',
    );
  });
  it('normalizes missing config errors', async () => {
    await expect(loadConfig(configPath)).rejects.toThrow(
      'cannot read config file',
    );
  });
});
