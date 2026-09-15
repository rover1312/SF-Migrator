/**
 * Shared types for SF-Migrator.
 * Keep this file small: only cross-cutting contracts live here.
 */

export interface OrgConnection {
  orgId: string;
  nickname?: string;
  loginUrl?: string;
  instanceUrl?: string;
  username?: string;
  connected: boolean;
}

export interface SelectedObject {
  name: string;
  label: string;
  custom: boolean;
  recordCount?: number;
}

export interface SelectedField {
  objectName: string;
  name: string;
  label: string;
  type: string;
  selected: boolean;
  creatable: boolean;
  updateable: boolean;
}

export interface FilterDefinition {
  objectName: string;
  field: string;
  operator: string;
  value: string;
}

/** Serializable migration configuration (export/import, jobs). No secrets. */
export interface MigrationConfig {
  version: 1;
  sourceOrg: { nickname: string; loginUrl: string };
  targetOrgs: { nickname: string; loginUrl: string }[];
  objects: { name: string; label?: string; order: number }[];
  fields: Record<string, string[]>;
  filters: FilterDefinition[];
  extraction: { format: 'csv' | 'json' | 'both'; batchSize: number; includeDeleted?: boolean };
  loading: {
    operation: 'insert' | 'update' | 'upsert';
    externalIdField?: string;
    batchSize: number;
    stopOnError: boolean;
  };
  /** Child object -> lookup field -> referenced parent object (parents load first). */
  lookups?: Record<string, Record<string, string>>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  message?: string;
}
