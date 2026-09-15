import { useState } from 'react';
import { api } from '../utils/api-client';

/** Fetch available SObjects for Step 4. */
export function useObjectDiscovery(orgId?: string) {
  const [objects, setObjects] = useState<string[]>([]);

  async function load() {
    const data = await api.get<string[]>(`/api/objects/list?orgId=${orgId ?? ''}`);
    setObjects(data);
  }

  return { objects, load };
}
