import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeJsonFile } from '../../src/server/utils/files.js';

describe('files', () => {
  it('writeJsonFile() creates parents and round-trips JSON', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sfm-'));
    const file = path.join(dir, 'nested', 'out.json');
    await writeJsonFile(file, { hello: 'world' });
    const raw = await fs.readFile(file, 'utf-8');
    expect(JSON.parse(raw)).toEqual({ hello: 'world' });
    await fs.rm(dir, { recursive: true, force: true });
  });
});
