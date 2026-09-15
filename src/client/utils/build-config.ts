import type {
  ExtractionSettings,
  FilterRow,
  LoadingStrategy,
  OrgRef,
} from '../store/migrationStore';

export interface ClientMigrationConfig {
  version: 1;
  sourceOrg: { nickname: string; loginUrl: string };
  targetOrgs: { nickname: string; loginUrl: string }[];
  objects: { name: string; label?: string; order: number }[];
  fields: Record<string, string[]>;
  filters: FilterRow[];
  extraction: ExtractionSettings;
  loading: {
    operation: 'insert' | 'update' | 'upsert';
    externalIdField?: string;
    batchSize: number;
    stopOnError: boolean;
  };
  lookups?: Record<string, Record<string, string>>;
}

/** Assemble the server-side MigrationConfig from wizard state. */
export function buildMigrationConfig(args: {
  sourceOrg: OrgRef;
  loadTargets: OrgRef[];
  selectedObjects: string[];
  objectLabels: Record<string, string>;
  selectedFields: Record<string, string[]>;
  filters: FilterRow[];
  extraction: ExtractionSettings;
  strategy: LoadingStrategy;
  lookups: Record<string, Record<string, string>>;
}): ClientMigrationConfig {
  const strategy = args.strategy;
  return {
    version: 1,
    sourceOrg: { nickname: args.sourceOrg.nickname, loginUrl: args.sourceOrg.loginUrl },
    targetOrgs: args.loadTargets.map((o) => ({ nickname: o.nickname, loginUrl: o.loginUrl })),
    objects: args.selectedObjects.map((name, i) => ({
      name,
      label: args.objectLabels[name] ?? name,
      order: i,
    })),
    fields: Object.fromEntries(
      args.selectedObjects.map((name) => [name, args.selectedFields[name] ?? []]),
    ),
    filters: args.filters,
    extraction: args.extraction,
    loading: {
      operation: strategy.operation,
      ...(strategy.operation === 'upsert' && strategy.externalIdField
        ? { externalIdField: strategy.externalIdField }
        : {}),
      batchSize: strategy.batchSize,
      stopOnError: strategy.stopOnError,
    },
    lookups: args.lookups,
  };
}
