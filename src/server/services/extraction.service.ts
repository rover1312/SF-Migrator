import fs from 'node:fs/promises';
import path from 'node:path';
import type { MigrationConfig } from '../types';
import { config } from '../utils/config';
import { toCsv } from '../utils/csv';
import logger from '../utils/logger';
import { sleepMs } from '../utils/retry';
import { buildSelect } from '../utils/soql';
import { configService } from './config.service';
import { jobStore } from './jobs';
import { salesforceService } from './salesforce.service';

export interface ExtractionState {
  orgId: string;
  config: MigrationConfig;
}

export interface ExtractManifestEntry {
  object: string;
  file: string;
  records: number;
  fields: string[];
}

/**
 * Extraction worker. Pages SOQL per object (dependency order) and streams
 * rows to `data/extracted/<jobId>/<Object>.csv` plus a manifest. The source
 * `Id` is always included first so downstream loads can trace rows.
 */
export class ExtractionService {
  async start(orgId: string, migrationConfig: MigrationConfig): Promise<string> {
    const outcome = configService.validate(migrationConfig);
    if (!outcome.valid || !outcome.config) {
      throw new Error(`Invalid migration config: ${outcome.errors.join('; ')}`);
    }
    const job = await jobStore.create<ExtractionState>('extract', {
      orgId,
      config: outcome.config,
    });
    await jobStore.update(job.id, {
      status: 'running',
      progress: { totalObjects: outcome.config.objects.length },
    });
    void this.run(job.id).catch((err) => logger.error(`Extract ${job.id} crashed`, err));
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

  private failIfStopped(status: string): void {
    if (status === 'cancelled') throw new Error('__CANCELLED__');
  }

  private async waitWhilePaused(id: string): Promise<void> {
    for (;;) {
      const job = jobStore.get(id);
      if (!job || job.status !== 'paused') return;
      await sleepMs(500);
    }
  }

  private async run(id: string): Promise<void> {
    const job = jobStore.get(id);
    if (!job) return;
    const { orgId, config: migration } = job.state as unknown as ExtractionState;
    const outDir = path.join(config.extractedDir, id);
    await fs.mkdir(outDir, { recursive: true });
    const manifest: ExtractManifestEntry[] = [];
    let processed = 0;

    try {
      const ordered = [...migration.objects].sort((a, b) => a.order - b.order);
      for (const obj of ordered) {
        await this.waitWhilePaused(id);
        const current = jobStore.get(id);
        if (!current || current.status === 'cancelled') {
          await jobStore.update(id, { status: 'cancelled', error: 'Cancelled by user' });
          return;
        }
        const fields = migration.fields[obj.name] ?? [];
        const columns = ['Id', ...fields.filter((f) => f !== 'Id')];
        const filters = migration.filters.filter((f) => f.objectName === obj.name);
        const soql = buildSelect({ object: obj.name, fields: columns, filters });
        const filePath = path.join(outDir, `${obj.name}.csv`);
        await fs.writeFile(filePath, `${columns.join(',')}\n`, 'utf-8');

        let objectTotal = 0;
        try {
          objectTotal = await salesforceService.getRecordCount(orgId, obj.name, filters);
        } catch (err) {
          logger.warn(`Count failed for ${obj.name}: ${(err as Error).message}`);
        }
        const prevTotal = jobStore.get(id)?.progress.totalRecords ?? 0;
        await jobStore.update(id, {
          currentObject: obj.name,
          progress: { totalRecords: prevTotal + objectTotal },
        });

        let records = 0;
        await salesforceService.queryAllPaged<Record<string, unknown>>(
          orgId,
          soql,
          async (page) => {
            await this.waitWhilePaused(id);
            this.failIfStopped(jobStore.get(id)?.status ?? '');
            const rows = page.map((r) =>
              Object.fromEntries(columns.map((c) => [c, flatten(r[c])])),
            );
            await fs.appendFile(filePath, `${toCsv(columns, rows, false)}\n`);
            records += page.length;
            processed += page.length;
            await jobStore.update(id, {
              progress: { processedRecords: processed, succeededRecords: processed },
            });
          },
        );

        manifest.push({ object: obj.name, file: `${obj.name}.csv`, records, fields: columns });
        await jobStore.update(id, {
          progress: { completedObjects: manifest.length },
          currentObject: undefined,
        });
      }
      const manifestPath = path.join(outDir, 'manifest.json');
      await fs.writeFile(
        manifestPath,
        JSON.stringify(
          { jobId: id, completedAt: new Date().toISOString(), objects: manifest },
          null,
          2,
        ),
      );
      await jobStore.update(id, { status: 'completed', result: { manifest: manifestPath } });
      logger.info(`Extract ${id} completed: ${processed} records`);
    } catch (err) {
      if ((err as Error).message === '__CANCELLED__') {
        await jobStore.update(id, { status: 'cancelled', error: 'Cancelled by user' });
        return;
      }
      await jobStore.update(id, { status: 'failed', error: (err as Error).message });
    }
  }
}

/** Flatten nested Salesforce values (e.g. reference objects) to strings. */
function flatten(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.Id === 'string') return record.Id;
    return JSON.stringify(value);
  }
  return value;
}

export const extractionService = new ExtractionService();
