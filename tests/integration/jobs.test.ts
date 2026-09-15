import fs from 'node:fs/promises';
import path from 'node:path';
import type { Connection } from 'jsforce';
import { extractionService } from '../../src/server/services/extraction.service';
import { jobStore } from '../../src/server/services/jobs';
import { loadingService } from '../../src/server/services/loading.service';
import { salesforceService } from '../../src/server/services/salesforce.service';
import { validationService } from '../../src/server/services/validation.service';
import type { MigrationConfig } from '../../src/server/types';
import { config } from '../../src/server/utils/config';

/** Fake jsforce connection: 2 accounts over 2 pages, successful inserts. */
function fakeConnection(): Connection {
  const accountPages = [[{ Id: '001A', Name: 'Acme' }], [{ Id: '001B', Name: 'Globex' }]];
  const contactPages = [[{ Id: '003A', LastName: 'Doe', AccountId: '001A' }], []];
  // queryMore carries no object context; extractions always run Account then
  // Contact, so odd calls belong to Account and even calls to Contact.
  let moreCalls = 0;
  return {
    describeGlobal: async () => ({
      sobjects: [
        { name: 'Account', label: 'Account', custom: false },
        { name: 'Contact', label: 'Contact', custom: false },
      ],
    }),
    sobject: (name: string) => ({
      describe: async () => ({
        fields: [
          {
            name: 'Id',
            label: 'ID',
            type: 'id',
            custom: false,
            createable: false,
            updateable: false,
            nillable: false,
          },
          {
            name: 'Name',
            label: 'Name',
            type: 'string',
            custom: false,
            createable: true,
            updateable: true,
            nillable: true,
          },
          {
            name: 'LastName',
            label: 'Last Name',
            type: 'string',
            custom: false,
            createable: true,
            updateable: true,
            nillable: false,
          },
          {
            name: 'AccountId',
            label: 'Account',
            type: 'reference',
            custom: false,
            createable: true,
            updateable: true,
            nillable: true,
          },
        ].filter((f) => name === 'Account' || f.name !== 'Name'),
      }),
      create: async (records: unknown[]) =>
        (records as unknown[]).map((_, i) => ({
          id: `tgt-${name}-${i}`,
          success: true,
          errors: [],
        })),
    }),
    query: async (soql: string) => {
      if (soql.startsWith('SELECT COUNT')) return { records: [], totalSize: 2, done: true };
      const pages = soql.includes('FROM Contact') ? contactPages : accountPages;
      return { records: pages[0], totalSize: 2, done: false, nextRecordsUrl: '/next' };
    },
    queryMore: async () => {
      moreCalls += 1;
      const records = moreCalls % 2 === 1 ? accountPages[1] : contactPages[1];
      return { records, totalSize: 2, done: true };
    },
  } as unknown as Connection;
}

function baseConfig(): MigrationConfig {
  return {
    version: 1,
    sourceOrg: { nickname: 'prod', loginUrl: 'https://login.salesforce.com' },
    targetOrgs: [{ nickname: 'sandbox', loginUrl: 'https://test.salesforce.com' }],
    objects: [
      { name: 'Account', order: 0 },
      { name: 'Contact', order: 1 },
    ],
    fields: { Account: ['Name'], Contact: ['LastName', 'AccountId'] },
    filters: [],
    extraction: { format: 'csv', batchSize: 1000 },
    loading: { operation: 'insert', batchSize: 200, stopOnError: false },
    lookups: { Contact: { AccountId: 'Account' } },
  };
}

async function waitFor(id: string, timeoutMs = 20000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const job = jobStore.get(id);
    if (job && ['completed', 'failed', 'cancelled'].includes(job.status)) return job.status;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for job ${id}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe('extract -> validate -> load', () => {
  const created: string[] = [];

  beforeAll(() => {
    salesforceService.setConnection('test-src', fakeConnection());
    salesforceService.setConnection('test-tgt', fakeConnection());
  });

  afterAll(async () => {
    for (const id of created) {
      await fs.rm(path.join(config.extractedDir, id), { recursive: true, force: true });
      await fs.rm(path.join(config.logsDir, 'jobs', `${id}.json`), { force: true });
      await fs.rm(path.join(config.logsDir, 'jobs', id), { recursive: true, force: true });
    }
    const logs = await fs.readdir(config.logsDir);
    for (const file of logs.filter((f) => f.startsWith('validation-test-tgt'))) {
      await fs.rm(path.join(config.logsDir, file), { force: true });
    }
    salesforceService.disconnect('test-src');
    salesforceService.disconnect('test-tgt');
  });

  it('extracts both objects to CSV with a manifest', async () => {
    const extractId = await extractionService.start('test-src', baseConfig());
    created.push(extractId);
    expect(await waitFor(extractId)).toBe('completed');
    const manifest = JSON.parse(
      await fs.readFile(path.join(config.extractedDir, extractId, 'manifest.json'), 'utf-8'),
    );
    expect(manifest.objects).toHaveLength(2);
    const accounts = await fs.readFile(
      path.join(config.extractedDir, extractId, 'Account.csv'),
      'utf-8',
    );
    expect(accounts).toContain('Id,Name');
    expect(accounts).toContain('Acme');
  });

  it('validates target permissions as proceedable', async () => {
    const report = await validationService.validateTarget('test-tgt', baseConfig());
    expect(report.canProceed).toBe(true);
    expect(report.failed).toBe(0);
  });

  it('loads in order, resolving lookups through ID maps', async () => {
    const extractId = await extractionService.start('test-src', baseConfig());
    created.push(extractId);
    expect(await waitFor(extractId)).toBe('completed');
    const loadId = await loadingService.start('test-tgt', extractId, baseConfig());
    created.push(loadId);
    expect(await waitFor(loadId)).toBe('completed');
    const job = jobStore.get(loadId);
    const result = job?.result as { total: number; succeeded: number; failed: number };
    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    const idmap = await fs.readFile(
      path.join(config.logsDir, 'jobs', loadId, 'idmaps', 'Account.csv'),
      'utf-8',
    );
    expect(idmap).toContain('source_id,target_id');
    expect(idmap).toContain('001A');
  });
});
