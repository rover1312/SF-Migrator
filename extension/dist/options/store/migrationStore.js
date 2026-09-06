import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const initialConfig = {
    version: '1.0',
    sourceOrg: null,
    targetOrgs: [],
    objects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};
export const useMigrationStore = create()(persist((set, get) => ({
    currentStep: 1,
    configMode: 'simple',
    migrationConfig: initialConfig,
    isLoading: false,
    error: null,
    setStep: (step) => set({ currentStep: step }),
    setConfigMode: (mode) => set({ configMode: mode }),
    setSourceOrg: (org) => set((state) => ({
        migrationConfig: {
            ...state.migrationConfig,
            sourceOrg: org,
            updatedAt: new Date().toISOString(),
        },
    })),
    addTargetOrg: (org) => set((state) => ({
        migrationConfig: {
            ...state.migrationConfig,
            targetOrgs: [...state.migrationConfig.targetOrgs, org],
            updatedAt: new Date().toISOString(),
        },
    })),
    removeTargetOrg: (orgId) => set((state) => ({
        migrationConfig: {
            ...state.migrationConfig,
            targetOrgs: state.migrationConfig.targetOrgs.filter((org) => org.orgId !== orgId),
            updatedAt: new Date().toISOString(),
        },
    })),
    setDefaultTargetOrg: (orgId) => set((state) => ({
        migrationConfig: {
            ...state.migrationConfig,
            targetOrgs: state.migrationConfig.targetOrgs.map((org) => ({
                ...org,
                isDefault: org.orgId === orgId,
            })),
            updatedAt: new Date().toISOString(),
        },
    })),
    setObjects: (objects) => set((state) => ({
        migrationConfig: {
            ...state.migrationConfig,
            objects,
            updatedAt: new Date().toISOString(),
        },
    })),
    setSelectedObjects: (objectNames) => set((state) => {
        const newObjects = state.migrationConfig.objects.filter((obj) => objectNames.includes(obj.objectApiName));
        return {
            migrationConfig: {
                ...state.migrationConfig,
                objects: newObjects,
                updatedAt: new Date().toISOString(),
            },
        };
    }),
    reorderObjects: (fromIndex, toIndex) => set((state) => {
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
    setFieldsForObject: (objectName, fields) => set((state) => ({
        migrationConfig: {
            ...state.migrationConfig,
            objects: state.migrationConfig.objects.map((obj) => obj.objectApiName === objectName
                ? { ...obj, fields }
                : obj),
            updatedAt: new Date().toISOString(),
        },
    })),
    setFieldSelection: (objectName, fieldName, selected) => set((state) => ({
        migrationConfig: {
            ...state.migrationConfig,
            objects: state.migrationConfig.objects.map((obj) => obj.objectApiName === objectName
                ? {
                    ...obj,
                    fields: obj.fields?.map((field) => field.name === fieldName
                        ? { ...field, selected }
                        : field),
                }
                : obj),
            updatedAt: new Date().toISOString(),
        },
    })),
    setFilterForObject: (objectName, filter) => set((state) => ({
        migrationConfig: {
            ...state.migrationConfig,
            objects: state.migrationConfig.objects.map((obj) => obj.objectApiName === objectName
                ? { ...obj, filter }
                : obj),
            updatedAt: new Date().toISOString(),
        },
    })),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    importConfig: (config) => set({
        migrationConfig: config,
        currentStep: 1,
        error: null,
    }),
    exportConfig: () => get().migrationConfig,
    resetWizard: () => set({
        currentStep: 1,
        configMode: 'simple',
        migrationConfig: initialConfig,
        isLoading: false,
        error: null,
    }),
}), {
    name: 'sf-migrator-storage',
}));
//# sourceMappingURL=migrationStore.js.map