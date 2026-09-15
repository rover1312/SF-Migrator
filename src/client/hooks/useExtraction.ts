import { useState } from 'react';
import { api } from '../utils/api-client';
import { useJob } from './useJob';

/** Start extraction and poll status for Step 7. */
export function useExtraction() {
  const { jobId, setJobId, job, error } = useJob((id) => `/api/extract/status?id=${id}`);
  const [starting, setStarting] = useState(false);

  async function start(orgId: string, config: unknown): Promise<string> {
    setStarting(true);
    try {
      const { jobId: id } = await api.post<{ jobId: string }>('/api/extract/start', {
        orgId,
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
    await api.post(`/api/extract/${action}`, { id: jobId });
  }

  return { jobId, job, error, starting, start, control };
}
