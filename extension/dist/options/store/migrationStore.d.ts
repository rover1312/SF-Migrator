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
    currentStep: number;
    configMode: 'simple' | 'upload';
    migrationConfig: MigrationConfig;
    isLoading: boolean;
    error: string | null;
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
export declare const useMigrationStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<MigrationState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<MigrationState, MigrationState>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: MigrationState) => void) => () => void;
        onFinishHydration: (fn: (state: MigrationState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<MigrationState, MigrationState>>;
    };
}>;
export {};
//# sourceMappingURL=migrationStore.d.ts.map