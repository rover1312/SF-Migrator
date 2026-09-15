import { useState } from 'react';
import { api } from '../utils/api-client';
import { useJob } from './useJob';

/** Start loading and poll status for Step 10. */
export function useDataLoading() {
  const { jobId, setJobId, job, error } = useJob((id) => `/api/load/status?id=${id}`);
  const [starting, setStarting] = useState(false);

  async function start(
    targetOrgId: string,
    extractJobId: string,
    config: unknown,
  ): Promise<string> {
    setStarting(true);
    try {
      const { jobId: id } = await api.post<{ jobId: string }>('/api/load/start', {
        targetOrgId,
        extractJobId,
        config,
      });
      setJobId(id);
      return id;
    } finally {
      setStarting(false);
    }
  }

  async function control(action: 'pause' | 'resume' | 'cancel'): Promise<void> {
    if (!jobId) return;
    await api.post(`/api/load/${action}`, { id: jobId });
  }

  async function retry(): Promise<void> {
    if (!jobId) return;
    await api.post('/api/load/retry', { id: jobId });
  }

  return { jobId, job, error, starting, start, control, retry };
}
