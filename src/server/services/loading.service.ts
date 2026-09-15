import fs from 'node:fs/promises';
import path from 'node:path';
import type { MigrationConfig } from '../types';
import { config } from '../utils/config';
import { parseCsv, toCsv } from '../utils/csv';
import logger from '../utils/logger';
import { chunk, sleepMs, withRetry } from '../utils/retry';
import { BulkIngest, type BulkTransport } from './bulk.service';
import { configService } from './config.service';
import { jobStore } from './jobs';
import { salesforceService } from './salesforce.service';

export interface LoadingState {
  targetOrgId: string;
  extractJobId: string;
  config: MigrationConfig;
}

export interface FailedRow {
  object: string;
  sourceId: string;
  error: string;
  record: Record<string, unknown>;
}

export interface ObjectReport {
  object: string;
  total: number;
  succeeded: number;
  failed: number;
}

const REST_THRESHOLD = 2000;
const REST_CHUNK = 200;

/**
 * Dependency-order loader. Reads extracted CSVs, translates lookup fields
 * through per-object ID maps (source Id -> target Id), and inserts via REST
 * (small) or Bulk API 2.0 (large). `Id` is never sent — it is kept as
 * `__source_id` for traceability.
 */
export class LoadingService {
  async start(
    targetOrgId: string,
    extractJobId: string,
    migrationConfig: MigrationConfig,
  ): Promise<string> {
    const outcome = configService.validate(migrationConfig);
    if (!outcome.valid || !outcome.config) {
      throw new Error(`Invalid migration config: ${outcome.errors.join('; ')}`);
    }
    const extractDir = path.join(config.extractedDir, extractJobId);
    try {
      await fs.access(path.join(extractDir, 'manifest.json'));
    } catch {
      throw new Error(`Extract job ${extractJobId} has no manifest (not completed?)`);
    }
    const job = await jobStore.create<LoadingState>('load', {
      targetOrgId,
      extractJobId,
      config: outcome.config,
    });
    await jobStore.update(job.id, { status: 'running' });
    void this.run(job.id).catch((err) => logger.error(`Load ${job.id} crashed`, err));
    return job.id;
  }

  async pause(id: string): Promise<void> {
    await jobStore.update(id, { status: 'paused' });
  }

  async resume(id: string): Promise<void> {
    const job = jobStore.get(id);
    if (!job) throw new Error(`Unknown job: ${id}`);
    if (job.status !== 'paused') throw new Error(`Job ${id} is not paused`);
    await jobStore.update(id, { status: 'running' });
  }

  async cancel(id: string): Promise<void> {
    await jobStore.update(id, { status: 'cancelled', error: 'Cancelled by user' });
  }

  /** Retry rows recorded as failed, appending to the same report. */
  async retryFailed(id: string): Promise<void> {
    const job = await jobStore.load(id);
    if (!job) throw new Error(`Unknown job: ${id}`);
    const state = job.state as unknown as LoadingState & { failedRows?: FailedRow[] };
    if (job.status !== 'failed' && job.status !== 'completed') {
      throw new Error(`Job ${id} is ${job.status}; only failed/completed jobs can retry`);
    }
    if (!state.failedRows || state.failedRows.length === 0) {
      throw new Error(`Job ${id} has no failed rows to retry`);
    }
    await jobStore.update(id, { status: 'running', error: undefined });
    void this.runRetry(id).catch((err) => logger.error(`Retry ${id} crashed`, err));
  }

  private async waitWhilePaused(id: string): Promise<void> {
    for (;;) {
      const job = jobStore.get(id);
      if (!job || job.status !== 'paused') return;
      await sleepMs(500);
    }
  }

  private control(id: string): void {
    if (jobStore.get(id)?.status === 'cancelled') throw new Error('__CANCELLED__');
  }

  private idMapPath(loadId: string, object: string): string {
    return path.join(jobStore.dirFor(loadId), 'idmaps', `${object}.csv`);
  }

  private async loadIdMap(loadId: string, object: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    try {
      const text = await fs.readFile(this.idMapPath(loadId, object), 'utf-8');
      for (const row of parseCsv(text).rows) map.set(row.source_id, row.target_id);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    return map;
  }

  private async run(id: string): Promise<void> {
    const job = jobStore.get(id);
    if (!job) return;
    const { targetOrgId, extractJobId, config: migration } = job.state as unknown as LoadingState;
    const lookups = migration.lookups ?? {};
    const reports: ObjectReport[] = [];
    const failedRows: FailedRow[] = [];
    const errors: { object: string; sourceId: string; error: string }[] = [];
    let processed = 0;

    try {
      const ordered = [...migration.objects].sort((a, b) => a.order - b.order);
      await jobStore.update(id, { progress: { totalObjects: ordered.length } });

      for (const obj of ordered) {
        await this.waitWhilePaused(id);
        this.control(id);
        await jobStore.update(id, { currentObject: obj.name });

        const csvText = await fs.readFile(
          path.join(config.extractedDir, extractJobId, `${obj.name}.csv`),
          'utf-8',
        );
        const { rows } = parseCsv(csvText);
        const parentMaps = new Map<string, Map<string, string>>();
        for (const parent of new Set(Object.values(lookups[obj.name] ?? {}))) {
          parentMaps.set(parent, await this.loadIdMap(id, parent));
        }

        const ready: { sourceId: string; payload: Record<string, unknown> }[] = [];
        for (const row of rows) {
          const sourceId = row.Id ?? '';
          const payload: Record<string, unknown> = {};
          let rowError: string | undefined;
          for (const [key, value] of Object.entries(row)) {
            if (key === 'Id' || key === '') continue;
            const parent = lookups[obj.name]?.[key];
            if (parent && value !== '') {
              const targetId = parentMaps.get(parent)?.get(value);
              if (!targetId) {
                rowError = `unresolved lookup ${key}=${value} (parent ${parent} not loaded)`;
                break;
              }
              payload[key] = targetId;
            } else {
              payload[key] = value === '' ? null : value;
            }
          }
          if (rowError) {
            failedRows.push({ object: obj.name, sourceId, error: rowError, record: payload });
            errors.push({ object: obj.name, sourceId, error: rowError });
          } else {
            ready.push({ sourceId, payload });
          }
        }

        const idMapRows: { source_id: string; target_id: string }[] = [];
        const fail = (sourceId: string, error: string, record: Record<string, unknown>): void => {
          failedRows.push({ object: obj.name, sourceId, error, record });
          errors.push({ object: obj.name, sourceId, error });
        };

        for (const batch of chunk(ready, migration.loading.batchSize)) {
          await this.waitWhilePaused(id);
          this.control(id);
          if (batch.length > REST_THRESHOLD) {
            await this.loadViaBulk(targetOrgId, migration, obj.name, batch, idMapRows, fail);
          } else {
            await this.loadViaRest(targetOrgId, migration, obj.name, batch, idMapRows, fail);
          }
          processed += batch.length;
          await jobStore.update(id, {
            progress: {
              processedRecords: processed,
              succeededRecords: processed - failedRows.length,
              failedRecords: failedRows.length,
            },
          });
          if (migration.loading.stopOnError && failedRows.length > 0) {
            throw new Error(`Stopped on error in ${obj.name}: ${failedRows[0].error}`);
          }
        }

        await fs.mkdir(path.dirname(this.idMapPath(id, obj.name)), { recursive: true });
        await fs.writeFile(
          this.idMapPath(id, obj.name),
          toCsv(['source_id', 'target_id'], idMapRows),
        );
        const objectFailed = failedRows.filter((f) => f.object === obj.name).length;
        reports.push({
          object: obj.name,
          total: rows.length,
          succeeded: rows.length - objectFailed,
          failed: objectFailed,
        });
        await jobStore.update(id, { progress: { completedObjects: reports.length } });
      }

      await this.finish(id, reports, failedRows, errors);
    } catch (err) {
      if ((err as Error).message === '__CANCELLED__') {
        await this.finish(id, reports, failedRows, errors, 'cancelled');
        return;
      }
      await jobStore.update(id, { status: 'failed', error: (err as Error).message });
      await this.writeArtifacts(id, reports, failedRows, errors);
    }
  }

  private async runRetry(id: string): Promise<void> {
    const job = jobStore.get(id);
    if (!job) return;
    const state = job.state as unknown as LoadingState & { failedRows?: FailedRow[] };
    const { targetOrgId, config: migration } = state;
    const pending = state.failedRows ?? [];
    const idMapRows: { source_id: string; target_id: string }[] = [];
    const stillFailed: FailedRow[] = [];
    try {
      for (const batch of chunk(pending, migration.loading.batchSize)) {
        await this.waitWhilePaused(id);
        this.control(id);
        const group = new Map<string, typeof batch>();
        for (const row of batch) {
          const list = group.get(row.object) ?? [];
          list.push(row);
          group.set(row.object, list);
        }
        for (const [object, rows] of group) {
          await this.loadViaRest(
            targetOrgId,
            migration,
            object,
            rows.map((r) => ({ sourceId: r.sourceId, payload: r.record })),
            idMapRows,
            (sourceId, error, record) => stillFailed.push({ object, sourceId, error, record }),
          );
        }
      }
      state.failedRows = stillFailed;
      await jobStore.setState(id, state);
      await jobStore.update(id, {
        status: stillFailed.length > 0 ? 'completed' : 'completed',
        progress: { failedRecords: stillFailed.length },
        result: { ...(job.result ?? {}), retriedAt: new Date().toISOString() },
      });
    } catch (err) {
      if ((err as Error).message === '__CANCELLED__') {
        await jobStore.update(id, { status: 'cancelled' });
        return;
      }
      await jobStore.update(id, { status: 'failed', error: (err as Error).message });
    }
  }

  private async loadViaRest(
    targetOrgId: string,
    migration: MigrationConfig,
    object: string,
    batch: { sourceId: string; payload: Record<string, unknown> }[],
    idMapRows: { source_id: string; target_id: string }[],
    fail: (sourceId: string, error: string, record: Record<string, unknown>) => void,
  ): Promise<void> {
    const conn = salesforceService.requireConnection(targetOrgId);
    for (const group of chunk(batch, REST_CHUNK)) {
      const results = (await withRetry(() =>
        Promise.resolve(conn.sobject(object).create(group.map((g) => g.payload))),
      )) as unknown as {
        id?: string;
        success: boolean;
        errors?: { message: string }[] | string[];
      }[];
      const list = Array.isArray(results) ? results : [results];
      list.forEach((result, i) => {
        if (result.success && result.id) {
          idMapRows.push({ source_id: group[i].sourceId, target_id: result.id });
        } else {
          const messages = (result.errors ?? ['Unknown error'])
            .map((e) => (typeof e === 'string' ? e : e.message))
            .join('; ');
          fail(group[i].sourceId, messages, group[i].payload);
        }
      });
    }
  }

  private async loadViaBulk(
    targetOrgId: string,
    migration: MigrationConfig,
    object: string,
    batch: { sourceId: string; payload: Record<string, unknown> }[],
    idMapRows: { source_id: string; target_id: string }[],
    fail: (sourceId: string, error: string, record: Record<string, unknown>) => void,
  ): Promise<void> {
    const conn = salesforceService.requireConnection(targetOrgId);
    const transport: BulkTransport = (params) =>
      (conn.request as (p: unknown) => Promise<unknown>)(params);
    const bulk = new BulkIngest(transport, conn.version ?? '60.0', 3000, 200);
    const columns = [...new Set(batch.flatMap((b) => Object.keys(b.payload)))];
    const summary = await bulk.run(
      object,
      migration.loading.operation,
      columns,
      batch.map((b) => b.payload),
      migration.loading.externalIdField,
    );
    // Bulk 2.0 successful results omit source keys, so per-row ID mapping is
    // only exact for fully-successful batches; partial batches need review.
    if (summary.recordsFailed > 0) {
      fail('', `bulk job ${summary.jobId}: ${summary.recordsFailed} failed — see errors CSV`, {});
    }
    void idMapRows;
  }

  private async finish(
    id: string,
    reports: ObjectReport[],
    failedRows: FailedRow[],
    errors: { object: string; sourceId: string; error: string }[],
    status: 'completed' | 'cancelled' = 'completed',
  ): Promise<void> {
    const job = jobStore.get(id);
    if (!job) return;
    const state = job.state as unknown as LoadingState & { failedRows?: FailedRow[] };
    state.failedRows = failedRows;
    await jobStore.setState(id, state);
    await this.writeArtifacts(id, reports, failedRows, errors);
    const totals = reports.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        succeeded: acc.succeeded + r.succeeded,
        failed: acc.failed + r.failed,
      }),
      { total: 0, succeeded: 0, failed: 0 },
    );
    await jobStore.update(id, {
      status,
      result: {
        report: path.join(jobStore.dirFor(id), 'report.json'),
        errors: path.join(jobStore.dirFor(id), 'errors.csv'),
        ...totals,
        objects: reports,
      },
      progress: {
        processedRecords: totals.total,
        succeededRecords: totals.succeeded,
        failedRecords: totals.failed,
      },
    });
    logger.info(`Load ${id} ${status}: ${totals.succeeded}/${totals.total} succeeded`);
  }

  private async writeArtifacts(
    id: string,
    reports: ObjectReport[],
    failedRows: FailedRow[],
    errors: { object: string; sourceId: string; error: string }[],
  ): Promise<void> {
    const dir = jobStore.dirFor(id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'report.json'),
      JSON.stringify(
        { jobId: id, generatedAt: new Date().toISOString(), objects: reports },
        null,
        2,
      ),
    );
    await fs.writeFile(
      path.join(dir, 'errors.csv'),
      toCsv(['object', 'sourceId', 'error'], errors),
    );
    await fs.writeFile(
      path.join(dir, 'failed-rows.json'),
      JSON.stringify(failedRows.slice(0, 50000)),
    );
  }
}

export const loadingService = new LoadingService();
