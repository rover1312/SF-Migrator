import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

/** Ensure local data directories exist. Call once at server startup. */
export async function ensureDataDirs(): Promise<void> {
  const dirs = [config.dataDir, config.extractedDir, config.configsDir, config.logsDir, config.tempDir];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/** Write a JSON file, creating parent directories as needed. */
export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}
