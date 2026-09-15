import { useState } from 'react';
import { api } from '../utils/api-client';

/** Fetch field metadata with permissions for Step 5. */
export function useFieldMetadata() {
  const [fields, setFields] = useState<unknown[]>([]);

  async function load(objectName: string, orgId?: string) {
    const data = await api.get<unknown[]>(
      `/api/fields/describe/${objectName}?orgId=${orgId ?? ''}`,
    );
    setFields(data);
  }

  return { fields, load };
}
