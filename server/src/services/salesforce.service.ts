import jsforce, { Connection } from 'jsforce';
import { OrgConfig, AuthTokens } from '../types';
import logger from '../utils/logger';

export interface SalesforceOrgInfo {
  orgId: string;
  instanceUrl: string;
  organizationName: string;
  userFullName: string;
  userEmail: string;
  userType: string;
}

export interface SObjectInfo {
  name: string;
  label: string;
  custom: boolean;
  keyPrefix?: string | null;
  recordCount?: number;
}

export interface FieldInfo {
  name: string;
  label: string;
  type: string;
  length?: number;
  isCustom: boolean;
  isCreatable: boolean;
  isUpdatable: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  nillable: boolean;
  defaultValue?: any;
}

export interface QueryResult<T> {
  records: T[];
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
}

/**
 * Salesforce Service - Handles all Salesforce API interactions
 */
class SalesforceService {
  private connections: Map<string, Connection> = new Map();
  private tokens: Map<string, AuthTokens> = new Map();

  /**
   * Create a connection using OAuth tokens
   */
  async connectWithOAuth(orgId: string, tokens: AuthTokens): Promise<Connection> {
    try {
      const conn = new jsforce.Connection({
        instanceUrl: tokens.instanceUrl,
        accessToken: tokens.accessToken,
      });

      // Verify connection by getting user info
      const userInfo = await conn.identity();
      
      this.connections.set(orgId, conn);
      this.tokens.set(orgId, tokens);
      
      logger.info(`Connected to Salesforce org: ${orgId}`);
      return conn;
    } catch (error: any) {
      logger.error(`Failed to connect to org ${orgId}:`, error);
      throw new Error(`Salesforce connection failed: ${error.message}`);
    }
  }

  /**
   * Create a connection using username/password/auth token
   */
  async connectWithCredentials(
    orgId: string,
    config: OrgConfig
  ): Promise<Connection> {
    try {
      let conn: Connection;

      if (config.authToken) {
        // Connect with auth token
        conn = new jsforce.Connection({
          instanceUrl: config.loginUrl || 'https://login.salesforce.com',
          accessToken: config.authToken,
        });
      } else if (config.username && config.password) {
        // Connect with username/password
        conn = new jsforce.Connection({
          loginUrl: config.loginUrl || 'https://login.salesforce.com',
        });

        await conn.login(config.username, config.password + (config.securityToken || ''));
      } else {
        throw new Error('Invalid credentials: provide either authToken or username/password');
      }

      const userInfo = await conn.identity();
      
      this.connections.set(orgId, conn);
      
      logger.info(`Connected to Salesforce org: ${orgId} (${userInfo.username})`);
      return conn;
    } catch (error: any) {
      logger.error(`Failed to connect to org ${orgId}:`, error);
      throw new Error(`Salesforce connection failed: ${error.message}`);
    }
  }

  /**
   * Get connection for an org
   */
  getConnection(orgId: string): Connection | null {
    return this.connections.get(orgId) || null;
  }

  /**
   * Disconnect from an org
   */
  disconnect(orgId: string): void {
    const conn = this.connections.get(orgId);
    if (conn) {
      conn.logout().catch(err => logger.warn(`Logout failed for ${orgId}:`, err));
      this.connections.delete(orgId);
      this.tokens.delete(orgId);
      logger.info(`Disconnected from org: ${orgId}`);
    }
  }

  /**
   * Get organization information
   */
  async getOrgInfo(orgId: string): Promise<SalesforceOrgInfo> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const identity = await conn.identity();
      const orgInfo = await conn.query<any>(
        "SELECT Id, Name, OrganizationType FROM Organization LIMIT 1"
      );

      return {
        orgId: identity.organization_id,
        instanceUrl: conn.instanceUrl,
        organizationName: orgInfo.records[0]?.Name || 'Unknown',
        userFullName: (identity as any).full_name || 'Unknown',
        userEmail: identity.email,
        userType: identity.user_type,
      };
    } catch (error: any) {
      logger.error(`Failed to get org info for ${orgId}:`, error);
      throw new Error(`Failed to retrieve org information: ${error.message}`);
    }
  }

  /**
   * List all SObjects available in the org
   */
  async listSObjects(orgId: string): Promise<SObjectInfo[]> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const describeGlobal = await conn.describeGlobal();
      
      const sobjects: SObjectInfo[] = [];
      
      for (const sobj of describeGlobal.sobjects) {
        // Get detailed description for each object
        const desc = await conn.sobject(sobj.name).describe();
        
        sobjects.push({
          name: sobj.name,
          label: sobj.label,
          custom: sobj.custom,
          keyPrefix: desc.keyPrefix || undefined,
          recordCount: (desc as any).recordCount,
        });
      }

      logger.info(`Retrieved ${sobjects.length} SObjects from org ${orgId}`);
      return sobjects;
    } catch (error: any) {
      logger.error(`Failed to list SObjects for org ${orgId}:`, error);
      throw new Error(`Failed to retrieve SObjects: ${error.message}`);
    }
  }

  /**
   * Get field metadata for a specific SObject
   */
  async getFieldMetadata(orgId: string, objectName: string): Promise<FieldInfo[]> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const describe = await conn.sobject(objectName).describe();
      
      const fields: FieldInfo[] = describe.fields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        length: field.length,
        isCustom: field.custom,
        isCreatable: field.createable,
        isUpdatable: field.updateable,
        isFilterable: field.filterable,
        isSortable: field.sortable,
        nillable: field.nillable,
        defaultValue: field.defaultValue,
      }));

      logger.info(`Retrieved ${fields.length} fields for ${objectName} in org ${orgId}`);
      return fields;
    } catch (error: any) {
      logger.error(`Failed to get field metadata for ${objectName}:`, error);
      throw new Error(`Failed to retrieve field metadata: ${error.message}`);
    }
  }

  /**
   * Execute a SOQL query
   */
  async query<T extends Record<string, any>>(orgId: string, soql: string): Promise<QueryResult<T>> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const result = await conn.query<T>(soql);
      
      return {
        records: result.records,
        totalSize: result.totalSize,
        done: result.done,
        nextRecordsUrl: result.nextRecordsUrl,
      };
    } catch (error: any) {
      logger.error(`Query failed for org ${orgId}: ${soql}`, error);
      throw new Error(`SOQL query failed: ${error.message}`);
    }
  }

  /**
   * Query all records (handling pagination)
   */
  async queryAll<T extends Record<string, any>>(orgId: string, soql: string): Promise<T[]> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const allRecords: T[] = [];
      let result = await conn.query<T>(soql);
      
      allRecords.push(...result.records);
      
      while (!result.done) {
        result = await conn.queryMore<T>(result.nextRecordsUrl!);
        allRecords.push(...result.records);
      }

      logger.info(`Retrieved ${allRecords.length} records from org ${orgId}`);
      return allRecords;
    } catch (error: any) {
      logger.error(`Query all failed for org ${orgId}: ${soql}`, error);
      throw new Error(`Failed to retrieve all records: ${error.message}`);
    }
  }

  /**
   * Insert records into Salesforce
   */
  async insertRecords<T extends Record<string, any>>(
    orgId: string,
    objectName: string,
    records: T[]
  ): Promise<{ id: string; success: boolean; errors: string[] }[]> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const results = await conn.sobject(objectName).create(records);
      const resultArray = Array.isArray(results) ? results : [results];
      
      logger.info(`Inserted ${resultArray.length} records into ${objectName} in org ${orgId}`);
      return resultArray.map((r: any) => ({
        id: r.id || '',
        success: r.success,
        errors: r.errors?.map((e: any) => e.message) || [],
      }));
    } catch (error: any) {
      logger.error(`Insert failed for ${objectName} in org ${orgId}:`, error);
      throw new Error(`Failed to insert records: ${error.message}`);
    }
  }

  /**
   * Update records in Salesforce
   */
  async updateRecords<T extends Record<string, any> & { Id: string }>(
    orgId: string,
    objectName: string,
    records: T[]
  ): Promise<{ id: string; success: boolean; errors: string[] }[]> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const results = await conn.sobject(objectName).update(records);
      const resultArray = Array.isArray(results) ? results : [results];
      
      logger.info(`Updated ${resultArray.length} records in ${objectName} in org ${orgId}`);
      return resultArray.map((r: any) => ({
        id: r.id || '',
        success: r.success,
        errors: r.errors?.map((e: any) => e.message) || [],
      }));
    } catch (error: any) {
      logger.error(`Update failed for ${objectName} in org ${orgId}:`, error);
      throw new Error(`Failed to update records: ${error.message}`);
    }
  }

  /**
   * Upsert records in Salesforce
   */
  async upsertRecords<T extends Record<string, any>>(
    orgId: string,
    objectName: string,
    records: T[],
    externalIdField: string
  ): Promise<{ id: string; success: boolean; errors: string[] }[]> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const results = await Promise.all(
        records.map(async (record: any) => {
          const externalId = record[externalIdField];
          if (!externalId) {
            return {
              id: '',
              success: false,
              errors: [`Missing external ID field: ${externalIdField}`],
            };
          }
          
          const result = await conn.sobject(objectName).upsert(record, externalIdField);
          return {
            id: (result as any).id || '',
            success: (result as any).success,
            errors: (result as any).errors?.map((e: any) => e.message) || [],
          };
        })
      );
      
      logger.info(`Upserted ${results.length} records into ${objectName} in org ${orgId}`);
      return results;
    } catch (error: any) {
      logger.error(`Upsert failed for ${objectName} in org ${orgId}:`, error);
      throw new Error(`Failed to upsert records: ${error.message}`);
    }
  }

  /**
   * Delete records from Salesforce
   */
  async deleteRecords(
    orgId: string,
    objectName: string,
    recordIds: string[]
  ): Promise<{ id: string; success: boolean; errors: string[] }[]> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const results = await conn.sobject(objectName).destroy(recordIds);
      const resultArray = Array.isArray(results) ? results : [results];
      
      logger.info(`Deleted ${resultArray.length} records from ${objectName} in org ${orgId}`);
      return resultArray.map((r: any) => ({
        id: r.id || '',
        success: r.success,
        errors: r.errors?.map((e: any) => e.message) || [],
      }));
    } catch (error: any) {
      logger.error(`Delete failed for ${objectName} in org ${orgId}:`, error);
      throw new Error(`Failed to delete records: ${error.message}`);
    }
  }

  /**
   * Check field-level permissions for a user
   */
  async checkFieldPermissions(
    orgId: string,
    objectName: string,
    fieldNames: string[]
  ): Promise<{ fieldName: string; readable: boolean; editable: boolean }[]> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const describe = await conn.sobject(objectName).describe();
      
      const permissions = fieldNames.map(fieldName => {
        const field = describe.fields.find(f => f.name === fieldName);
        return {
          fieldName,
          readable: field?.createable || field?.updateable || false,
          editable: field?.updateable || false,
        };
      });

      return permissions;
    } catch (error: any) {
      logger.error(`Permission check failed for ${objectName}:`, error);
      throw new Error(`Failed to check field permissions: ${error.message}`);
    }
  }

  /**
   * Get current user's profile and permissions
   */
  async getCurrentUserPermissions(orgId: string): Promise<any> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      const userInfo = await conn.identity();
      
      // Query user's profile
      const userQuery = await conn.query<any>(
        `SELECT Id, Name, Profile.Name, UserType, IsActive 
         FROM User 
         WHERE Id = '${(conn.userInfo as any)?.id || ''}' 
         LIMIT 1`
      );

      return {
        userId: (conn.userInfo as any)?.id || '',
        username: userInfo.username,
        fullName: (userInfo as any).full_name || 'Unknown',
        email: userInfo.email,
        profileName: userQuery.records[0]?.Profile?.Name || 'Unknown',
        userType: userQuery.records[0]?.UserType || 'Standard',
        isActive: userQuery.records[0]?.IsActive || false,
      };
    } catch (error: any) {
      logger.error(`Failed to get user permissions for org ${orgId}:`, error);
      throw new Error(`Failed to retrieve user permissions: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(orgId: string, refreshToken: string): Promise<AuthTokens> {
    const conn = this.getConnection(orgId);
    if (!conn) {
      throw new Error(`No connection found for org: ${orgId}`);
    }

    try {
      // Note: jsforce doesn't have built-in token refresh, 
      // this would need to be implemented based on your OAuth flow
      logger.warn(`Token refresh not implemented for org ${orgId}`);
      throw new Error('Token refresh requires OAuth client configuration');
    } catch (error: any) {
      logger.error(`Token refresh failed for org ${orgId}:`, error);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Test connection validity
   */
  async testConnection(orgId: string): Promise<boolean> {
    try {
      await this.getOrgInfo(orgId);
      return true;
    } catch (error: any) {
      logger.warn(`Connection test failed for org ${orgId}:`, error.message);
      return false;
    }
  }

  /**
   * Clear all connections
   */
  clearAllConnections(): void {
    const orgIds = Array.from(this.connections.keys());
    orgIds.forEach(orgId => this.disconnect(orgId));
    logger.info('Cleared all Salesforce connections');
  }
}

// Export singleton instance
export const salesforceService = new SalesforceService();
export default salesforceService;
