import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JobStore } from '../../src/server/services/jobs';

describe('job store', () => {
  it('persists jobs to disk and reloads them', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sfm-jobs-'));
    const store = new JobStore(dir);
    const job = await store.create('extract', { orgId: 'x' });
    expect(job.status).toBe('pending');
    await store.update(job.id, { status: 'running', progress: { processedRecords: 5 } });

    const fresh = new JobStore(dir);
    const reloaded = await fresh.load(job.id);
    expect(reloaded?.status).toBe('running');
    expect(reloaded?.progress.processedRecords).toBe(5);
    expect(await fresh.load('missing')).toBeUndefined();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
