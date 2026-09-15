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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  message?: string;
}
