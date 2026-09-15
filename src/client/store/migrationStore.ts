import { create } from 'zustand';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'summary';

export interface OrgRef {
  orgId: string;
  nickname: string;
  loginUrl: string;
  connected: boolean;
}

export interface FieldMeta {
  name: string;
  label: string;
  type: string;
  creatable: boolean;
  updateable: boolean;
}

export interface FilterRow {
  objectName: string;
  field: string;
  operator: string;
  value: string;
}

export interface ExtractionSettings {
  format: 'csv' | 'json' | 'both';
  batchSize: number;
}

export interface LoadingStrategy {
  operation: 'insert' | 'update' | 'upsert';
  externalIdField: string;
  batchSize: number;
  stopOnError: boolean;
}

interface MigrationState {
  step: WizardStep;
  setStep: (step: WizardStep) => void;

  sourceOrg: OrgRef | null;
  setSourceOrg: (org: OrgRef | null) => void;

  targetOrgs: OrgRef[];
  addTargetOrg: (org: OrgRef) => void;
  removeTargetOrg: (orgId: string) => void;

  selectedObjects: string[];
  objectLabels: Record<string, string>;
  setObjects: (names: string[], labels: Record<string, string>) => void;
  toggleObject: (name: string, label?: string) => void;

  fieldMeta: Record<string, FieldMeta[]>;
  setFieldMeta: (objectName: string, fields: FieldMeta[]) => void;
  selectedFields: Record<string, string[]>;
  setSelectedFields: (objectName: string, fields: string[]) => void;
  toggleField: (objectName: string, field: string) => void;

  lookups: Record<string, Record<string, string>>;
  setLookup: (objectName: string, field: string, parent: string | null) => void;

  filters: FilterRow[];
  addFilter: (objectName: string) => void;
  updateFilter: (index: number, patch: Partial<FilterRow>) => void;
  removeFilter: (index: number) => void;

  extraction: ExtractionSettings;
  setExtraction: (patch: Partial<ExtractionSettings>) => void;

  loadTargets: string[];
  toggleLoadTarget: (orgId: string) => void;
  strategy: LoadingStrategy;
  setStrategy: (patch: Partial<LoadingStrategy>) => void;

  extractJobId: string | null;
  setExtractJobId: (id: string | null) => void;

  /** Replace the whole wizard state from an imported config file. */
  hydrateFromConfig: (config: {
    sourceOrg: { nickname: string; loginUrl: string };
    targetOrgs: { nickname: string; loginUrl: string }[];
    objects: { name: string; label?: string }[];
    fields: Record<string, string[]>;
    filters: FilterRow[];
    extraction: ExtractionSettings;
    loading: Omit<LoadingStrategy, 'externalIdField'> & { externalIdField?: string };
    lookups?: Record<string, Record<string, string>>;
  }) => void;
}

function prune<T>(record: Record<string, T>, keep: string[]): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => keep.includes(k)));
}

/** Single source of truth for the 10-step wizard. */
export const useMigrationStore = create<MigrationState>((set) => ({
  step: 1,
  setStep: (step) => set({ step }),

  sourceOrg: null,
  setSourceOrg: (sourceOrg) => set({ sourceOrg }),

  targetOrgs: [],
  addTargetOrg: (org) =>
    set((s) => ({ targetOrgs: [...s.targetOrgs.filter((o) => o.orgId !== org.orgId), org] })),
  removeTargetOrg: (orgId) =>
    set((s) => ({
      targetOrgs: s.targetOrgs.filter((o) => o.orgId !== orgId),
      loadTargets: s.loadTargets.filter((id) => id !== orgId),
    })),

  selectedObjects: [],
  objectLabels: {},
  setObjects: (names, labels) =>
    set((s) => ({
      selectedObjects: names,
      objectLabels: labels,
      selectedFields: prune(s.selectedFields, names),
      fieldMeta: prune(s.fieldMeta, names),
      lookups: prune(s.lookups, names),
      filters: s.filters.filter((f) => names.includes(f.objectName)),
    })),
  toggleObject: (name, label) =>
    set((s) => {
      const names = s.selectedObjects.includes(name)
        ? s.selectedObjects.filter((o) => o !== name)
        : [...s.selectedObjects, name];
      return {
        selectedObjects: names,
        objectLabels: label ? { ...s.objectLabels, [name]: label } : s.objectLabels,
        selectedFields: prune(s.selectedFields, names),
        fieldMeta: prune(s.fieldMeta, names),
        lookups: prune(s.lookups, names),
        filters: s.filters.filter((f) => names.includes(f.objectName)),
      };
    }),

  fieldMeta: {},
  setFieldMeta: (objectName, fields) =>
    set((s) => ({ fieldMeta: { ...s.fieldMeta, [objectName]: fields } })),
  selectedFields: {},
  setSelectedFields: (objectName, fields) =>
    set((s) => ({ selectedFields: { ...s.selectedFields, [objectName]: fields } })),
  toggleField: (objectName, field) =>
    set((s) => {
      const current = s.selectedFields[objectName] ?? [];
      return {
        selectedFields: {
          ...s.selectedFields,
          [objectName]: current.includes(field)
            ? current.filter((f) => f !== field)
            : [...current, field],
        },
      };
    }),

  lookups: {},
  setLookup: (objectName, field, parent) =>
    set((s) => {
      const forObject = { ...(s.lookups[objectName] ?? {}) };
      if (parent) forObject[field] = parent;
      else delete forObject[field];
      return { lookups: { ...s.lookups, [objectName]: forObject } };
    }),

  filters: [],
  addFilter: (objectName) =>
    set((s) => ({
      filters: [...s.filters, { objectName, field: '', operator: '=', value: '' }],
    })),
  updateFilter: (index, patch) =>
    set((s) => ({ filters: s.filters.map((f, i) => (i === index ? { ...f, ...patch } : f)) })),
  removeFilter: (index) => set((s) => ({ filters: s.filters.filter((_, i) => i !== index) })),

  extraction: { format: 'csv', batchSize: 5000 },
  setExtraction: (patch) => set((s) => ({ extraction: { ...s.extraction, ...patch } })),

  loadTargets: [],
  toggleLoadTarget: (orgId) =>
    set((s) => ({
      loadTargets: s.loadTargets.includes(orgId)
        ? s.loadTargets.filter((id) => id !== orgId)
        : [...s.loadTargets, orgId],
    })),
  strategy: { operation: 'insert', externalIdField: '', batchSize: 200, stopOnError: false },
  setStrategy: (patch) => set((s) => ({ strategy: { ...s.strategy, ...patch } })),

  extractJobId: null,
  setExtractJobId: (extractJobId) => set({ extractJobId }),

  hydrateFromConfig: (config) =>
    set({
      step: 7,
      selectedObjects: config.objects.map((o) => o.name),
      objectLabels: Object.fromEntries(config.objects.map((o) => [o.name, o.label ?? o.name])),
      selectedFields: config.fields,
      filters: config.filters,
      extraction: config.extraction,
      strategy: {
        operation: config.loading.operation,
        externalIdField: config.loading.externalIdField ?? '',
        batchSize: config.loading.batchSize,
        stopOnError: config.loading.stopOnError,
      },
      lookups: config.lookups ?? {},
      extractJobId: null,
    }),
}));
