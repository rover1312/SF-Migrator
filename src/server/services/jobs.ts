import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../utils/config';

export type JobKind = 'extract' | 'load';
export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface JobProgress {
  totalObjects: number;
  completedObjects: number;
  totalRecords: number;
  processedRecords: number;
  succeededRecords: number;
  failedRecords: number;
}

export interface Job<TState = Record<string, unknown>> {
  id: string;
  kind: JobKind;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  currentObject?: string;
  error?: string;
  progress: JobProgress;
  state: TState;
  result?: Record<string, unknown>;
}

const emptyProgress = (): JobProgress => ({
  totalObjects: 0,
  completedObjects: 0,
  totalRecords: 0,
  processedRecords: 0,
  succeededRecords: 0,
  failedRecords: 0,
});

/**
 * Persisted job registry. Jobs live in memory while the server runs and as
 * JSON files under `data/logs/jobs/` so progress survives restarts.
 */
export class JobStore {
  private memory = new Map<string, Job>();

  constructor(private baseDir: string = path.join(config.logsDir, 'jobs')) {}

  private fileFor(id: string): string {
    return path.join(this.baseDir, `${id}.json`);
  }

  async create<TState>(kind: JobKind, state: TState): Promise<Job<TState>> {
    const now = new Date().toISOString();
    const job: Job<TState> = {
      id: `${kind}-${Date.now()}-${randomUUID().slice(0, 8)}`,
      kind,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      progress: emptyProgress(),
      state,
    };
    this.memory.set(job.id, job as Job);
    await this.persist(job.id);
    return job;
  }

  get(id: string): Job | undefined {
    return this.memory.get(id);
  }

  async load(id: string): Promise<Job | undefined> {
    const cached = this.memory.get(id);
    if (cached) return cached;
    try {
      const raw = await fs.readFile(this.fileFor(id), 'utf-8');
      const job = JSON.parse(raw) as Job;
      this.memory.set(id, job);
      return job;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw err;
    }
  }

  async update(
    id: string,
    patch: Partial<Pick<Job, 'status' | 'currentObject' | 'error' | 'result'>> & {
      progress?: Partial<JobProgress>;
    },
  ): Promise<Job> {
    const job = this.memory.get(id);
    if (!job) throw new Error(`Unknown job: ${id}`);
    Object.assign(job, {
      ...patch,
      progress: { ...job.progress, ...(patch.progress ?? {}) },
      updatedAt: new Date().toISOString(),
    });
    await this.persist(id);
    return job;
  }

  async setState<TState>(id: string, state: TState): Promise<void> {
    const job = this.memory.get(id);
    if (!job) throw new Error(`Unknown job: ${id}`);
    job.state = state as Record<string, unknown>;
    await this.persist(id);
  }

  dirFor(id: string): string {
    return path.join(this.baseDir, id);
  }

  private async persist(id: string): Promise<void> {
    const job = this.memory.get(id);
    if (!job) return;
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(this.fileFor(id), JSON.stringify(job, null, 2), 'utf-8');
  }
}

export const jobStore = new JobStore();
