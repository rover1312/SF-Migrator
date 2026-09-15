import { useState } from 'react';
import { api } from '../utils/api-client.js';

/** Start extraction and poll status for Step 7. */
export function useExtraction() {
  const [status, setStatus] = useState('idle');

  async function start() {
    setStatus('running');
    await api.post('/api/extract/start', {});
    setStatus('started');
  }

  return { status, start };
}
