import { Connection } from 'jsforce';
import { OrgConfig, AuthTokens } from '../types';
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
declare class SalesforceService {
    private connections;
    private tokens;
    /**
     * Create a connection using OAuth tokens
     */
    connectWithOAuth(orgId: string, tokens: AuthTokens): Promise<Connection>;
    /**
     * Create a connection using username/password/auth token
     */
    connectWithCredentials(orgId: string, config: OrgConfig): Promise<Connection>;
    /**
     * Get connection for an org
     */
    getConnection(orgId: string): Connection | null;
    /**
     * Disconnect from an org
     */
    disconnect(orgId: string): void;
    /**
     * Get organization information
     */
    getOrgInfo(orgId: string): Promise<SalesforceOrgInfo>;
    /**
     * List all SObjects available in the org
     */
    listSObjects(orgId: string): Promise<SObjectInfo[]>;
    /**
     * Get field metadata for a specific SObject
     */
    getFieldMetadata(orgId: string, objectName: string): Promise<FieldInfo[]>;
    /**
     * Execute a SOQL query
     */
    query<T extends Record<string, any>>(orgId: string, soql: string): Promise<QueryResult<T>>;
    /**
     * Query all records (handling pagination)
     */
    queryAll<T extends Record<string, any>>(orgId: string, soql: string): Promise<T[]>;
    /**
     * Query more records (pagination)
     */
    queryMore<T extends Record<string, any>>(nextUrl: string, orgId: string): Promise<QueryResult<T>>;
    /**
     * Insert records into Salesforce
     */
    insertRecords<T extends Record<string, any>>(orgId: string, objectName: string, records: T[]): Promise<{
        id: string;
        success: boolean;
        errors: string[];
    }[]>;
    /**
     * Update records in Salesforce
     */
    updateRecords<T extends Record<string, any> & {
        Id: string;
    }>(orgId: string, objectName: string, records: T[]): Promise<{
        id: string;
        success: boolean;
        errors: string[];
    }[]>;
    /**
     * Upsert records in Salesforce
     */
    upsertRecords<T extends Record<string, any>>(orgId: string, objectName: string, records: T[], externalIdField: string): Promise<{
        id: string;
        success: boolean;
        errors: string[];
    }[]>;
    /**
     * Delete records from Salesforce
     */
    deleteRecords(orgId: string, objectName: string, recordIds: string[]): Promise<{
        id: string;
        success: boolean;
        errors: string[];
    }[]>;
    /**
     * Check field-level permissions for a user
     */
    checkFieldPermissions(orgId: string, objectName: string, fieldNames: string[]): Promise<{
        fieldName: string;
        readable: boolean;
        editable: boolean;
    }[]>;
    /**
     * Get current user's profile and permissions
     */
    getCurrentUserPermissions(orgId: string): Promise<any>;
    /**
     * Refresh access token
     */
    refreshToken(orgId: string, refreshToken: string): Promise<AuthTokens>;
    /**
     * Test connection validity
     */
    testConnection(orgId: string): Promise<boolean>;
    /**
     * Clear all connections
     */
    clearAllConnections(): void;
}
export declare const salesforceService: SalesforceService;
export { SalesforceService };
export default salesforceService;
//# sourceMappingURL=salesforce.service.d.ts.map