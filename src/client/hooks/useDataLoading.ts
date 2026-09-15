import { useState } from 'react';
import { api } from '../utils/api-client.js';

/** Start loading and poll status for Step 10. */
export function useDataLoading() {
  const [status, setStatus] = useState('idle');

  async function start() {
    setStatus('running');
    await api.post('/api/load/start', {});
    setStatus('started');
  }

  return { status, start };
}
