import { useState } from 'react';
import { api } from '../utils/api-client.js';

/** Authenticate an org and track connection status. */
export function useOrgAuth() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  async function connect(payload: unknown) {
    setLoading(true);
    try {
      await api.post('/api/auth/org', payload);
      setConnected(true);
    } finally {
      setLoading(false);
    }
  }

  return { connected, loading, connect };
}
