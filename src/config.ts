import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Config } from './types.js';
import { validateDate } from './validation.js';

const fields = ['inputPath', 'outputPath', 'startDate', 'endDate'] as const;

/** Loads configuration and resolves paths against the config file's directory. */
export async function loadConfig(configPath: string): Promise<Config> {
  let text: string;
  try {
    text = await readFile(configPath, 'utf8');
  } catch {
    throw new Error('cannot read config file');
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('config must contain valid JSON');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('config must be a JSON object');
  }
  const object = value as Record<string, unknown>;
  if (
    Object.keys(object).some((key) => !fields.some((field) => field === key))
  ) {
    throw new Error('config contains unknown keys');
  }
  const inputPath = getString(object, 'inputPath');
  const outputPath = getString(object, 'outputPath');
  const startDate = validateDate(getString(object, 'startDate'), 'startDate');
  const endDate = validateDate(getString(object, 'endDate'), 'endDate');
  if (startDate > endDate)
    throw new Error('startDate must not be after endDate');
  for (const [field, path] of [
    ['inputPath', inputPath],
    ['outputPath', outputPath],
  ]) {
    if (path?.includes('\0'))
      throw new Error(`config.${field} must not contain NUL`);
  }
  const directory = dirname(resolve(configPath));
  const config = {
    inputPath: resolve(directory, inputPath),
    outputPath: resolve(directory, outputPath),
    startDate,
    endDate,
  };
  if (
    config.outputPath === config.inputPath ||
    config.outputPath === resolve(configPath)
  ) {
    throw new Error(
      'outputPath must differ from inputPath and the config file',
    );
  }
  return config;
}

function getString(object: Record<string, unknown>, field: string): string {
  const value = object[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`config.${field} must be a nonempty string`);
  }
  return value;
}
