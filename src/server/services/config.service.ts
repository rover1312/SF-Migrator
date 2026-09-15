import Ajv from 'ajv';
import yaml from 'js-yaml';
import schema from '../config/migration.schema.json';
import type { MigrationConfig } from '../types';

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
  config?: MigrationConfig;
}

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(schema);

/** Import/export + validation of migration configuration (JSON/YAML). */
export class ConfigService {
  /** Validate unknown input against the schema plus business rules. */
  validate(data: unknown): ValidationOutcome {
    const errors: string[] = [];
    if (!validateSchema(data)) {
      for (const err of validateSchema.errors ?? []) {
        errors.push(`${err.instancePath || '/'} ${err.message}`);
      }
      return { valid: false, errors };
    }
    errors.push(...this.checkBusinessRules(data as unknown as MigrationConfig));
    const valid = errors.length === 0;
    return { valid, errors, config: valid ? (data as unknown as MigrationConfig) : undefined };
  }

  /** Business rules that JSON Schema alone cannot express. */
  checkBusinessRules(config: MigrationConfig): string[] {
    const errors: string[] = [];
    const nicknames = new Set<string>([config.sourceOrg.nickname]);
    for (const target of config.targetOrgs) {
      if (nicknames.has(target.nickname)) {
        errors.push(
          `target org nickname "${target.nickname}" duplicates the source or another target (source != target)`,
        );
      }
      nicknames.add(target.nickname);
    }

    const objectNames = config.objects.map((o) => o.name);
    if (new Set(objectNames).size !== objectNames.length) {
      errors.push('objects contains duplicate names');
    }
    const orders = [...config.objects.map((o) => o.order)].sort((a, b) => a - b);
    orders.forEach((order, i) => {
      if (order !== i) errors.push(`objects order must be contiguous starting at 0 (got ${order})`);
    });

    for (const [objectName, fields] of Object.entries(config.fields)) {
      if (!objectNames.includes(objectName)) {
        errors.push(`fields key "${objectName}" is not a selected object`);
      }
      if (new Set(fields).size !== fields.length) {
        errors.push(`fields for "${objectName}" contains duplicates`);
      }
    }
    for (const objectName of objectNames) {
      if (!config.fields[objectName]) {
        errors.push(`selected object "${objectName}" has no fields entry`);
      }
    }

    for (const filter of config.filters) {
      if (!objectNames.includes(filter.objectName)) {
        errors.push(`filter targets unselected object "${filter.objectName}"`);
      }
    }

    if (config.loading.operation === 'upsert' && !config.loading.externalIdField) {
      errors.push('loading.externalIdField is required for upsert');
    }

    const orderIndex = new Map(config.objects.map((o) => [o.name, o.order]));
    for (const [child, mappings] of Object.entries(config.lookups ?? {})) {
      if (!objectNames.includes(child)) {
        errors.push(`lookups key "${child}" is not a selected object`);
        continue;
      }
      for (const [field, parent] of Object.entries(mappings)) {
        if (!(config.fields[child] ?? []).includes(field)) {
          errors.push(`lookup field "${child}.${field}" is not a selected field`);
        }
        if (!objectNames.includes(parent)) {
          errors.push(`lookup "${child}.${field}" references unselected object "${parent}"`);
        } else if ((orderIndex.get(parent) ?? 0) >= (orderIndex.get(child) ?? 0)) {
          errors.push(`lookup "${child}.${field}" requires "${parent}" earlier in load order`);
        }
      }
    }
    return errors;
  }

  /** Serialize a validated config to JSON or YAML text. */
  exportText(
    config: MigrationConfig,
    format: 'json' | 'yaml',
  ): { content: string; filename: string } {
    const outcome = this.validate(config);
    if (!outcome.valid) {
      throw new Error(`Cannot export invalid config: ${outcome.errors.join('; ')}`);
    }
    return format === 'yaml'
      ? { content: yaml.dump(config), filename: 'migration-config.yaml' }
      : { content: JSON.stringify(config, null, 2), filename: 'migration-config.json' };
  }

  /** Parse an uploaded file (by extension) and validate it. Throws on failure. */
  parseFileContent(text: string, filename: string): MigrationConfig {
    let data: unknown;
    try {
      data = /\.ya?ml$/i.test(filename) ? yaml.load(text) : JSON.parse(text);
    } catch (err) {
      throw new Error(`Cannot parse ${filename}: ${(err as Error).message}`);
    }
    const outcome = this.validate(data);
    if (!outcome.valid || !outcome.config) {
      throw new Error(`Invalid config in ${filename}: ${outcome.errors.join('; ')}`);
    }
    return outcome.config;
  }
}

export const configService = new ConfigService();
