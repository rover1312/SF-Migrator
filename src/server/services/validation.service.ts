import fs from 'node:fs/promises';
import path from 'node:path';
import type { MigrationConfig } from '../types';
import { config } from '../utils/config';
import { configService } from './config.service';
import { salesforceService } from './salesforce.service';

export interface FieldCheck {
  object: string;
  field: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export interface ValidationReport {
  targetOrgId: string;
  operation: string;
  checkedAt: string;
  checks: FieldCheck[];
  passed: number;
  failed: number;
  warnings: number;
  canProceed: boolean;
}

/**
 * Pre-load permission checks. Every selected field must be writable for the
 * planned operation; `Id` is never inserted (warn); missing objects fail.
 * Blocking failures set canProceed=false. Report is persisted to data/logs/.
 */
export class ValidationService {
  async validateTarget(
    targetOrgId: string,
    migrationConfig: MigrationConfig,
    operation: 'insert' | 'update' | 'upsert' = migrationConfig.loading.operation,
  ): Promise<ValidationReport> {
    const outcome = configService.validate(migrationConfig);
    if (!outcome.valid || !outcome.config) {
      throw new Error(`Invalid migration config: ${outcome.errors.join('; ')}`);
    }
    const migration = outcome.config;
    const checks: FieldCheck[] = [];
    const ordered = [...migration.objects].sort((a, b) => a.order - b.order);

    for (const obj of ordered) {
      const fields = migration.fields[obj.name] ?? [];
      let permissions: { field: string; allowed: boolean; reason?: string }[];
      try {
        permissions = await salesforceService.checkFieldPermissions(
          targetOrgId,
          obj.name,
          fields,
          operation,
        );
      } catch {
        for (const field of fields) {
          checks.push({
            object: obj.name,
            field,
            status: 'fail',
            message: `object ${obj.name} is not accessible on target`,
          });
        }
        continue;
      }
      for (const field of fields) {
        if (field === 'Id') {
          checks.push({
            object: obj.name,
            field,
            status: 'warn',
            message: 'source Ids are traced as __source_id, never inserted',
          });
          continue;
        }
        const perm = permissions.find((p) => p.field === field);
        if (!perm || perm.allowed) {
          checks.push({ object: obj.name, field, status: 'pass', message: 'writable on target' });
        } else {
          checks.push({
            object: obj.name,
            field,
            status: 'fail',
            message: perm.reason ?? 'denied',
          });
        }
      }
    }

    const report: ValidationReport = {
      targetOrgId,
      operation,
      checkedAt: new Date().toISOString(),
      checks,
      passed: checks.filter((c) => c.status === 'pass').length,
      failed: checks.filter((c) => c.status === 'fail').length,
      warnings: checks.filter((c) => c.status === 'warn').length,
      canProceed: !checks.some((c) => c.status === 'fail'),
    };
    await fs.mkdir(config.logsDir, { recursive: true });
    await fs.writeFile(
      path.join(config.logsDir, `validation-${targetOrgId}-${Date.now()}.json`),
      JSON.stringify(report, null, 2),
    );
    return report;
  }
}

export const validationService = new ValidationService();
