import { sleepMs } from '../utils/retry';
import { toCsv } from '../utils/csv';

/**
 * Bulk API 2.0 ingest (insert/update/upsert) over plain REST calls.
 * Pass `conn.request.bind(conn)` as the transport; tests inject a fake.
 */

export type BulkOperation = 'insert' | 'update' | 'upsert';

export interface BulkTransport {
  (params: {
    method: string;
    url: string;
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<unknown>;
}

export interface IngestSummary {
  jobId: string;
  state: string;
  recordsProcessed: number;
  recordsFailed: number;
  failedCsv?: string;
}

interface JobRecord {
  id: string;
  state: string;
  numberRecordsProcessed?: number;
  numberRecordsFailed?: number;
}

export class BulkIngest {
  constructor(
    private transport: BulkTransport,
    private apiVersion = '60.0',
    private pollIntervalMs = 3000,
    private pollAttempts = 200,
  ) {}

  private base(): string {
    return `/services/data/v${this.apiVersion}`;
  }

  async run(
    object: string,
    operation: BulkOperation,
    columns: string[],
    rows: Record<string, unknown>[],
    externalIdField?: string,
  ): Promise<IngestSummary> {
    if (operation === 'upsert' && !externalIdField) {
      throw new Error('upsert requires externalIdField');
    }
    const created = (await this.transport({
      method: 'POST',
      url: `${this.base()}/jobs/ingest`,
      body: JSON.stringify({
        object,
        operation: operation === 'upsert' ? 'upsert' : operation,
        contentType: 'CSV',
        lineEnding: 'LF',
        ...(externalIdField ? { externalIdFieldName: externalIdField } : {}),
      }),
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })) as JobRecord;

    await this.transport({
      method: 'PUT',
      url: `${this.base()}/jobs/ingest/${created.id}/batches`,
      body: toCsv(columns, rows),
      headers: { 'Content-Type': 'text/csv' },
    });

    await this.transport({
      method: 'PATCH',
      url: `${this.base()}/jobs/ingest/${created.id}`,
      body: JSON.stringify({ state: 'UploadComplete' }),
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    });

    const final = await this.poll(created.id);
    let failedCsv: string | undefined;
    if ((final.numberRecordsFailed ?? 0) > 0) {
      failedCsv = (await this.transport({
        method: 'GET',
        url: `${this.base()}/jobs/ingest/${created.id}/failedResults/`,
      })) as string;
    }
    return {
      jobId: created.id,
      state: final.state,
      recordsProcessed: final.numberRecordsProcessed ?? 0,
      recordsFailed: final.numberRecordsFailed ?? 0,
      failedCsv,
    };
  }

  private async poll(jobId: string): Promise<JobRecord> {
    for (let i = 0; i < this.pollAttempts; i += 1) {
      const job = (await this.transport({
        method: 'GET',
        url: `${this.base()}/jobs/ingest/${jobId}`,
      })) as JobRecord;
      if (['JobComplete', 'Failed', 'Aborted'].includes(job.state)) return job;
      await sleepMs(this.pollIntervalMs);
    }
    throw new Error(`Bulk job ${jobId} did not finish in time`);
  }
}
