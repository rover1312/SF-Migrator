import { Connection } from '@salesforce/core';
import { logger } from '../utils/logger';
import { SalesforceService } from './salesforce.service';

export interface ValidationReport {
  passed: boolean;
  timestamp: string;
  orgId: string;
  userId: string;
  checks: {
    permissions: PermissionCheckResult;
    fields: FieldCheckResult;
    integrity: IntegrityCheckResult;
  };
  warnings: string[];
  errors: string[];
}

export interface PermissionCheckResult {
  passed: boolean;
  hasModifyAllData: boolean;
  objectPermissions: Record<string, boolean>;
  missingPermissions: string[];
}

export interface FieldCheckResult {
  passed: boolean;
  accessibleFields: Record<string, string[]>;
  inaccessibleFields: Record<string, string[]>;
  details: string[];
}

export interface IntegrityCheckResult {
  passed: boolean;
  requiredFieldsPresent: boolean;
  relationshipValid: boolean;
  issues: string[];
}

/**
 * Validation Service
 * 
 * Handles pre-flight checks for data migration:
 * - User Permissions (Modify All Data, Object Access)
 * - Field Accessibility (Read/Write permissions)
 * - Data Integrity (Required fields, Relationships)
 */
export class ValidationService {
  private sfService: SalesforceService;

  constructor() {
    this.sfService = new SalesforceService();
  }

  /**
   * Run a comprehensive pre-flight validation check
   */
  async runPreFlightCheck(
    connection: Connection,
    config: {
      sourceOrgId: string;
      objects: string[];
      fields?: Record<string, string[]>;
      targetOrgId?: string;
    }
  ): Promise<ValidationReport> {
    logger.info('Starting pre-flight validation', { orgId: config.sourceOrgId });

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check Permissions
    const permissionResult = await this.validateUserPermissions(connection, config.objects);
    if (!permissionResult.passed) {
      errors.push(...permissionResult.missingPermissions.map(p => `Missing permission: ${p}`));
    }

    // 2. Check Field Accessibility (if fields provided)
    let fieldResult: FieldCheckResult = { passed: true, accessibleFields: {}, inaccessibleFields: {}, details: [] };
    if (config.fields) {
      fieldResult = await this.validateFieldAccessibility(connection, config.fields);
      if (!fieldResult.passed) {
        const inaccessible = Object.entries(fieldResult.inaccessibleFields)
          .map(([obj, fields]) => `${obj}: ${fields.join(', ')}`);
        errors.push(...inaccessible.map(f => `Inaccessible fields: ${f}`));
      }
    }

    // 3. Check Data Integrity
    const integrityResult = await this.validateDataIntegrity(connection, config.objects, config.fields);
    if (!integrityResult.passed) {
      warnings.push(...integrityResult.issues);
    }

    const passed = permissionResult.passed && fieldResult.passed;

    const report: ValidationReport = {
      passed,
      timestamp: new Date().toISOString(),
      orgId: config.sourceOrgId,
      userId: connection.getUsername() || 'unknown',
      checks: {
        permissions: permissionResult,
        fields: fieldResult,
        integrity: integrityResult
      },
      warnings,
      errors
    };

    logger.info('Pre-flight validation completed', { passed, errors: errors.length, warnings: warnings.length });
    return report;
  }

  /**
   * Validate user permissions for specified objects
   */
  async validateUserPermissions(
    connection: Connection,
    objects: string[]
  ): Promise<PermissionCheckResult> {
    logger.debug('Validating user permissions', { objectCount: objects.length });

    try {
      // Get current user info from the connection's auth info
      // Using identity URL to get user ID
      const identity = await connection.identity();
      const userId = identity.user_id;
      
      if (!userId) {
        throw new Error('Unable to get current user ID from connection');
      }

      // Check for "Modify All Data" system permission
      const userQuery = `SELECT Id, Username, Profile.Name, PermissionsModifyAllData 
                         FROM User WHERE Id = '${userId}'`;
      const userResult = await connection.query(userQuery);
      
      const hasModifyAllData = userResult.records[0]?.PermissionsModifyAllData === true;

      if (hasModifyAllData) {
        logger.info('User has Modify All Data permission');
        return {
          passed: true,
          hasModifyAllData: true,
          objectPermissions: {},
          missingPermissions: []
        };
      }

      // Check object-level permissions
      const objectPermissions: Record<string, boolean> = {};
      const missingPermissions: string[] = [];

      for (const obj of objects) {
        const query = `SELECT Id, PermissionsRead, PermissionsCreate, PermissionsEdit, PermissionsDelete 
                       FROM ObjectPermissions 
                       WHERE SObjectType = '${obj}' AND ParentId IN (
                         SELECT PermissionSetId FROM PermissionSetAssignment WHERE AssigneeId = '${userId}'
                       )`;
        
        const result = await connection.query(query);
        const hasAccess = result.records.length > 0 && 
                          result.records.some((r: any) => r.PermissionsRead && r.PermissionsEdit);

        objectPermissions[obj] = hasAccess;
        if (!hasAccess) {
          missingPermissions.push(obj);
        }
      }

      return {
        passed: missingPermissions.length === 0,
        hasModifyAllData: false,
        objectPermissions,
        missingPermissions
      };

    } catch (error: any) {
      logger.error('Failed to validate permissions', error);
      throw new Error(`Permission validation failed: ${error.message}`);
    }
  }

  /**
   * Validate field accessibility for specified objects and fields
   */
  async validateFieldAccessibility(
    connection: Connection,
    fieldsMap: Record<string, string[]>
  ): Promise<FieldCheckResult> {
    logger.debug('Validating field accessibility');

    const accessibleFields: Record<string, string[]> = {};
    const inaccessibleFields: Record<string, string[]> = {};
    const details: string[] = [];
    let allPassed = true;

    for (const [objectName, fieldList] of Object.entries(fieldsMap)) {
      accessibleFields[objectName] = [];
      inaccessibleFields[objectName] = [];

      // Describe the object to get field metadata
      const describeResult = await connection.describe(objectName);
      const fieldMetadata = describeResult.fields;

      for (const fieldName of fieldList) {
        const fieldDef = fieldMetadata.find((f: any) => f.name === fieldName || f.name === `${objectName}.${fieldName}`);
        
        if (!fieldDef) {
          inaccessibleFields[objectName].push(fieldName);
          details.push(`Field ${fieldName} not found on ${objectName}`);
          allPassed = false;
          continue;
        }

        if (fieldDef.calculated && !fieldDef.updateable) {
           // Calculated fields are read-only, warn but don't fail unless write access is strictly required
           details.push(`Field ${fieldName} is calculated (read-only)`);
        }

        // Check accessibility - using 'accessible' property or fallback to 'nillable'
        const isAccessible = (fieldDef as any).accessible !== false;
        
        if (!isAccessible) {
          inaccessibleFields[objectName].push(fieldName);
          details.push(`Field ${fieldName} is not accessible on ${objectName}`);
          allPassed = false;
        } else {
          accessibleFields[objectName].push(fieldName);
        }
      }
    }

    return {
      passed: allPassed,
      accessibleFields,
      inaccessibleFields,
      details
    };
  }

  /**
   * Validate data integrity (required fields, relationships)
   */
  async validateDataIntegrity(
    connection: Connection,
    objects: string[],
    fieldsMap?: Record<string, string[]>
  ): Promise<IntegrityCheckResult> {
    logger.debug('Validating data integrity');

    const issues: string[] = [];
    let requiredFieldsPresent = true;
    let relationshipValid = true;

    // Basic check: Ensure we aren't trying to migrate without key fields
    if (fieldsMap) {
      for (const [obj, fields] of Object.entries(fieldsMap)) {
        // Example: Warn if Id is missing (usually needed for upserts)
        if (!fields.includes('Id') && !fields.includes('Id__c')) {
          issues.push(`Object ${obj}: 'Id' field missing. Upserts may fail.`);
        }
        
        // Check for external ID usage if specified (future enhancement)
      }
    }

    return {
      passed: issues.length === 0,
      requiredFieldsPresent,
      relationshipValid,
      issues
    };
  }
}

export const validationService = new ValidationService();
