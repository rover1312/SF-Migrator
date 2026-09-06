import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Field {
  name: string;
  label: string;
  type: string;
  length?: number;
  nillable: boolean;
  permissions: {
    Create: boolean;
    Read: boolean;
    Update: boolean;
    Delete: boolean;
  };
  selected: boolean;
}

export interface SalesforceObject {
  objectApiName: string;
  label: string;
  custom: boolean;
  queryable: boolean;
  retrieveable: boolean;
  recordCount?: number;
  fields?: Field[];
  filter?: string;
  order: number;
}

export interface OrgConfig {
  orgId: string;
  orgName: string;
  username?: string;
  authType: 'oauth' | 'username_password' | 'passkey';
  credentials: Record<string, string>;
  isConnected: boolean;
  isDefault?: boolean;
}

export interface MigrationConfig {
  version: string;
  sourceOrg: OrgConfig | null;
  targetOrgs: OrgConfig[];
  objects: SalesforceObject[];
  createdAt: string;
  updatedAt: string;
}

interface MigrationState {
  // Wizard state
  currentStep: number;
  configMode: 'simple' | 'upload';
  
  // Configuration data
  migrationConfig: MigrationConfig;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStep: (step: number) => void;
  setConfigMode: (mode: 'simple' | 'upload') => void;
  setSourceOrg: (org: OrgConfig) => void;
  addTargetOrg: (org: OrgConfig) => void;
  removeTargetOrg: (orgId: string) => void;
  setDefaultTargetOrg: (orgId: string) => void;
  setObjects: (objects: SalesforceObject[]) => void;
  setSelectedObjects: (objectNames: string[]) => void;
  reorderObjects: (fromIndex: number, toIndex: number) => void;
  setFieldsForObject: (objectName: string, fields: Field[]) => void;
  setFieldSelection: (objectName: string, fieldName: string, selected: boolean) => void;
  setFilterForObject: (objectName: string, filter: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  importConfig: (config: MigrationConfig) => void;
  exportConfig: () => MigrationConfig;
  resetWizard: () => void;
}

const initialConfig: MigrationConfig = {
  version: '1.0',
  sourceOrg: null,
  targetOrgs: [],
  objects: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useMigrationStore = create<MigrationState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      configMode: 'simple',
      migrationConfig: initialConfig,
      isLoading: false,
      error: null,

      setStep: (step) => set({ currentStep: step }),
      
      setConfigMode: (mode) => set({ configMode: mode }),
      
      setSourceOrg: (org) =>
        set((state) => ({
          migrationConfig: {
            ...state.migrationConfig,
            sourceOrg: org,
            updatedAt: new Date().toISOString(),
          },
        })),
      
      addTargetOrg: (org) =>
        set((state) => ({
          migrationConfig: {
            ...state.migrationConfig,
            targetOrgs: [...state.migrationConfig.targetOrgs, org],
            updatedAt: new Date().toISOString(),
          },
        })),
      
      removeTargetOrg: (orgId) =>
        set((state) => ({
          migrationConfig: {
            ...state.migrationConfig,
            targetOrgs: state.migrationConfig.targetOrgs.filter(
              (org) => org.orgId !== orgId
            ),
            updatedAt: new Date().toISOString(),
          },
        })),
      
      setDefaultTargetOrg: (orgId) =>
        set((state) => ({
          migrationConfig: {
            ...state.migrationConfig,
            targetOrgs: state.migrationConfig.targetOrgs.map((org) => ({
              ...org,
              isDefault: org.orgId === orgId,
            })),
            updatedAt: new Date().toISOString(),
          },
        })),
      
      setObjects: (objects) =>
        set((state) => ({
          migrationConfig: {
            ...state.migrationConfig,
            objects,
            updatedAt: new Date().toISOString(),
          },
        })),
      
      setSelectedObjects: (objectNames) =>
        set((state) => {
          const newObjects = state.migrationConfig.objects.filter((obj) =>
            objectNames.includes(obj.objectApiName)
          );
          return {
            migrationConfig: {
              ...state.migrationConfig,
              objects: newObjects,
              updatedAt: new Date().toISOString(),
            },
          };
        }),
      
      reorderObjects: (fromIndex, toIndex) =>
        set((state) => {
          const newObjects = [...state.migrationConfig.objects];
          const [removed] = newObjects.splice(fromIndex, 1);
          newObjects.splice(toIndex, 0, removed);
          newObjects.forEach((obj, index) => {
            obj.order = index + 1;
          });
          return {
            migrationConfig: {
              ...state.migrationConfig,
              objects: newObjects,
              updatedAt: new Date().toISOString(),
            },
          };
        }),
      
      setFieldsForObject: (objectName, fields) =>
        set((state) => ({
          migrationConfig: {
            ...state.migrationConfig,
            objects: state.migrationConfig.objects.map((obj) =>
              obj.objectApiName === objectName
                ? { ...obj, fields }
                : obj
            ),
            updatedAt: new Date().toISOString(),
          },
        })),
      
      setFieldSelection: (objectName, fieldName, selected) =>
        set((state) => ({
          migrationConfig: {
            ...state.migrationConfig,
            objects: state.migrationConfig.objects.map((obj) =>
              obj.objectApiName === objectName
                ? {
                    ...obj,
                    fields: obj.fields?.map((field) =>
                      field.name === fieldName
                        ? { ...field, selected }
                        : field
                    ),
                  }
                : obj
            ),
            updatedAt: new Date().toISOString(),
          },
        })),
      
      setFilterForObject: (objectName, filter) =>
        set((state) => ({
          migrationConfig: {
            ...state.migrationConfig,
            objects: state.migrationConfig.objects.map((obj) =>
              obj.objectApiName === objectName
                ? { ...obj, filter }
                : obj
            ),
            updatedAt: new Date().toISOString(),
          },
        })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      importConfig: (config) =>
        set({
          migrationConfig: config,
          currentStep: 1,
          error: null,
        }),
      
      exportConfig: () => get().migrationConfig,
      
      resetWizard: () =>
        set({
          currentStep: 1,
          configMode: 'simple',
          migrationConfig: initialConfig,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'sf-migrator-storage',
    }
  )
);
