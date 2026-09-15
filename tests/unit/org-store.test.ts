import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { OrgStore } from '../../src/server/services/org-store';

describe('org store', () => {
  it('round-trips orgs without touching the real data dir', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sfm-orgs-'));
    const store = new OrgStore(dir);
    expect(await store.loadAll()).toEqual([]);
    await store.save({ orgId: 'a', nickname: 'prod', loginUrl: 'https://login.salesforce.com' });
    expect((await store.get('a'))?.nickname).toBe('prod');
    expect(await store.loadAll()).toHaveLength(1);
    expect(await store.remove('a')).toBe(true);
    expect(await store.remove('missing')).toBe(false);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
