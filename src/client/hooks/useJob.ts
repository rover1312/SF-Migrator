import { useEffect, useState } from 'react';
import { api } from '../utils/api-client';

export interface JobSnapshot {
  id: string;
  kind: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentObject?: string;
  error?: string;
  progress: {
    totalObjects: number;
    completedObjects: number;
    totalRecords: number;
    processedRecords: number;
    succeededRecords: number;
    failedRecords: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
}

const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

/** Poll a job status endpoint until it reaches a terminal state. */
export function useJob(statusPath: (id: string) => string, pollMs = 2000) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const finish = (): void => {
      alive = false;
      clearInterval(timer);
    };
    const poll = async (): Promise<void> => {
      try {
        const data = await api.get<JobSnapshot>(statusPath(jobId));
        if (!alive) return;
        setJob(data);
        if (TERMINAL.has(data.status)) finish();
      } catch (err) {
        if (!alive) return;
        setError((err as Error).message);
        finish();
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), pollMs);
    return finish;
  }, [jobId, pollMs, statusPath]);

  return { jobId, setJobId, job, error };
}
