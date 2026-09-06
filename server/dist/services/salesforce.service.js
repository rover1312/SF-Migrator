"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesforceService = exports.salesforceService = void 0;
const jsforce_1 = __importDefault(require("jsforce"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Salesforce Service - Handles all Salesforce API interactions
 */
class SalesforceService {
    constructor() {
        this.connections = new Map();
        this.tokens = new Map();
    }
    /**
     * Create a connection using OAuth tokens
     */
    async connectWithOAuth(orgId, tokens) {
        try {
            const conn = new jsforce_1.default.Connection({
                instanceUrl: tokens.instanceUrl,
                accessToken: tokens.accessToken,
            });
            // Verify connection by getting user info
            const userInfo = await conn.identity();
            this.connections.set(orgId, conn);
            this.tokens.set(orgId, tokens);
            logger_1.default.info(`Connected to Salesforce org: ${orgId}`);
            return conn;
        }
        catch (error) {
            logger_1.default.error(`Failed to connect to org ${orgId}:`, error);
            throw new Error(`Salesforce connection failed: ${error.message}`);
        }
    }
    /**
     * Create a connection using username/password/auth token
     */
    async connectWithCredentials(orgId, config) {
        try {
            let conn;
            if (config.authToken) {
                // Connect with auth token
                conn = new jsforce_1.default.Connection({
                    instanceUrl: config.loginUrl || 'https://login.salesforce.com',
                    accessToken: config.authToken,
                });
            }
            else if (config.username && config.password) {
                // Connect with username/password
                conn = new jsforce_1.default.Connection({
                    loginUrl: config.loginUrl || 'https://login.salesforce.com',
                });
                await conn.login(config.username, config.password + (config.securityToken || ''));
            }
            else {
                throw new Error('Invalid credentials: provide either authToken or username/password');
            }
            const userInfo = await conn.identity();
            this.connections.set(orgId, conn);
            logger_1.default.info(`Connected to Salesforce org: ${orgId} (${userInfo.username})`);
            return conn;
        }
        catch (error) {
            logger_1.default.error(`Failed to connect to org ${orgId}:`, error);
            throw new Error(`Salesforce connection failed: ${error.message}`);
        }
    }
    /**
     * Get connection for an org
     */
    getConnection(orgId) {
        return this.connections.get(orgId) || null;
    }
    /**
     * Disconnect from an org
     */
    disconnect(orgId) {
        const conn = this.connections.get(orgId);
        if (conn) {
            conn.logout().catch(err => logger_1.default.warn(`Logout failed for ${orgId}:`, err));
            this.connections.delete(orgId);
            this.tokens.delete(orgId);
            logger_1.default.info(`Disconnected from org: ${orgId}`);
        }
    }
    /**
     * Get organization information
     */
    async getOrgInfo(orgId) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const identity = await conn.identity();
            const orgInfo = await conn.query("SELECT Id, Name, OrganizationType FROM Organization LIMIT 1");
            return {
                orgId: identity.organization_id,
                instanceUrl: conn.instanceUrl,
                organizationName: orgInfo.records[0]?.Name || 'Unknown',
                userFullName: identity.full_name || 'Unknown',
                userEmail: identity.email,
                userType: identity.user_type,
            };
        }
        catch (error) {
            logger_1.default.error(`Failed to get org info for ${orgId}:`, error);
            throw new Error(`Failed to retrieve org information: ${error.message}`);
        }
    }
    /**
     * List all SObjects available in the org
     */
    async listSObjects(orgId) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const describeGlobal = await conn.describeGlobal();
            const sobjects = [];
            for (const sobj of describeGlobal.sobjects) {
                // Get detailed description for each object
                const desc = await conn.sobject(sobj.name).describe();
                sobjects.push({
                    name: sobj.name,
                    label: sobj.label,
                    custom: sobj.custom,
                    keyPrefix: desc.keyPrefix || undefined,
                    recordCount: desc.recordCount,
                });
            }
            logger_1.default.info(`Retrieved ${sobjects.length} SObjects from org ${orgId}`);
            return sobjects;
        }
        catch (error) {
            logger_1.default.error(`Failed to list SObjects for org ${orgId}:`, error);
            throw new Error(`Failed to retrieve SObjects: ${error.message}`);
        }
    }
    /**
     * Get field metadata for a specific SObject
     */
    async getFieldMetadata(orgId, objectName) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const describe = await conn.sobject(objectName).describe();
            const fields = describe.fields.map(field => ({
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
            logger_1.default.info(`Retrieved ${fields.length} fields for ${objectName} in org ${orgId}`);
            return fields;
        }
        catch (error) {
            logger_1.default.error(`Failed to get field metadata for ${objectName}:`, error);
            throw new Error(`Failed to retrieve field metadata: ${error.message}`);
        }
    }
    /**
     * Execute a SOQL query
     */
    async query(orgId, soql) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const result = await conn.query(soql);
            return {
                records: result.records,
                totalSize: result.totalSize,
                done: result.done,
                nextRecordsUrl: result.nextRecordsUrl,
            };
        }
        catch (error) {
            logger_1.default.error(`Query failed for org ${orgId}: ${soql}`, error);
            throw new Error(`SOQL query failed: ${error.message}`);
        }
    }
    /**
     * Query all records (handling pagination)
     */
    async queryAll(orgId, soql) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const allRecords = [];
            let result = await conn.query(soql);
            allRecords.push(...result.records);
            while (!result.done) {
                result = await conn.queryMore(result.nextRecordsUrl);
                allRecords.push(...result.records);
            }
            logger_1.default.info(`Retrieved ${allRecords.length} records from org ${orgId}`);
            return allRecords;
        }
        catch (error) {
            logger_1.default.error(`Query all failed for org ${orgId}: ${soql}`, error);
            throw new Error(`Failed to retrieve all records: ${error.message}`);
        }
    }
    /**
     * Query more records (pagination)
     */
    async queryMore(nextUrl, orgId) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const result = await conn.queryMore(nextUrl);
            return {
                records: result.records,
                totalSize: result.totalSize,
                done: result.done,
                nextRecordsUrl: result.nextRecordsUrl,
            };
        }
        catch (error) {
            logger_1.default.error(`QueryMore failed for org ${orgId}`, error);
            throw new Error(`Failed to retrieve more records: ${error.message}`);
        }
    }
    /**
     * Insert records into Salesforce
     */
    async insertRecords(orgId, objectName, records) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const results = await conn.sobject(objectName).create(records);
            const resultArray = Array.isArray(results) ? results : [results];
            logger_1.default.info(`Inserted ${resultArray.length} records into ${objectName} in org ${orgId}`);
            return resultArray.map((r) => ({
                id: r.id || '',
                success: r.success,
                errors: r.errors?.map((e) => e.message) || [],
            }));
        }
        catch (error) {
            logger_1.default.error(`Insert failed for ${objectName} in org ${orgId}:`, error);
            throw new Error(`Failed to insert records: ${error.message}`);
        }
    }
    /**
     * Update records in Salesforce
     */
    async updateRecords(orgId, objectName, records) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const results = await conn.sobject(objectName).update(records);
            const resultArray = Array.isArray(results) ? results : [results];
            logger_1.default.info(`Updated ${resultArray.length} records in ${objectName} in org ${orgId}`);
            return resultArray.map((r) => ({
                id: r.id || '',
                success: r.success,
                errors: r.errors?.map((e) => e.message) || [],
            }));
        }
        catch (error) {
            logger_1.default.error(`Update failed for ${objectName} in org ${orgId}:`, error);
            throw new Error(`Failed to update records: ${error.message}`);
        }
    }
    /**
     * Upsert records in Salesforce
     */
    async upsertRecords(orgId, objectName, records, externalIdField) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const results = await Promise.all(records.map(async (record) => {
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
                    id: result.id || '',
                    success: result.success,
                    errors: result.errors?.map((e) => e.message) || [],
                };
            }));
            logger_1.default.info(`Upserted ${results.length} records into ${objectName} in org ${orgId}`);
            return results;
        }
        catch (error) {
            logger_1.default.error(`Upsert failed for ${objectName} in org ${orgId}:`, error);
            throw new Error(`Failed to upsert records: ${error.message}`);
        }
    }
    /**
     * Delete records from Salesforce
     */
    async deleteRecords(orgId, objectName, recordIds) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const results = await conn.sobject(objectName).destroy(recordIds);
            const resultArray = Array.isArray(results) ? results : [results];
            logger_1.default.info(`Deleted ${resultArray.length} records from ${objectName} in org ${orgId}`);
            return resultArray.map((r) => ({
                id: r.id || '',
                success: r.success,
                errors: r.errors?.map((e) => e.message) || [],
            }));
        }
        catch (error) {
            logger_1.default.error(`Delete failed for ${objectName} in org ${orgId}:`, error);
            throw new Error(`Failed to delete records: ${error.message}`);
        }
    }
    /**
     * Check field-level permissions for a user
     */
    async checkFieldPermissions(orgId, objectName, fieldNames) {
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
        }
        catch (error) {
            logger_1.default.error(`Permission check failed for ${objectName}:`, error);
            throw new Error(`Failed to check field permissions: ${error.message}`);
        }
    }
    /**
     * Get current user's profile and permissions
     */
    async getCurrentUserPermissions(orgId) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            const userInfo = await conn.identity();
            // Query user's profile
            const userQuery = await conn.query(`SELECT Id, Name, Profile.Name, UserType, IsActive 
         FROM User 
         WHERE Id = '${conn.userInfo?.id || ''}' 
         LIMIT 1`);
            return {
                userId: conn.userInfo?.id || '',
                username: userInfo.username,
                fullName: userInfo.full_name || 'Unknown',
                email: userInfo.email,
                profileName: userQuery.records[0]?.Profile?.Name || 'Unknown',
                userType: userQuery.records[0]?.UserType || 'Standard',
                isActive: userQuery.records[0]?.IsActive || false,
            };
        }
        catch (error) {
            logger_1.default.error(`Failed to get user permissions for org ${orgId}:`, error);
            throw new Error(`Failed to retrieve user permissions: ${error.message}`);
        }
    }
    /**
     * Refresh access token
     */
    async refreshToken(orgId, refreshToken) {
        const conn = this.getConnection(orgId);
        if (!conn) {
            throw new Error(`No connection found for org: ${orgId}`);
        }
        try {
            // Note: jsforce doesn't have built-in token refresh, 
            // this would need to be implemented based on your OAuth flow
            logger_1.default.warn(`Token refresh not implemented for org ${orgId}`);
            throw new Error('Token refresh requires OAuth client configuration');
        }
        catch (error) {
            logger_1.default.error(`Token refresh failed for org ${orgId}:`, error);
            throw new Error(`Failed to refresh token: ${error.message}`);
        }
    }
    /**
     * Test connection validity
     */
    async testConnection(orgId) {
        try {
            await this.getOrgInfo(orgId);
            return true;
        }
        catch (error) {
            logger_1.default.warn(`Connection test failed for org ${orgId}:`, error.message);
            return false;
        }
    }
    /**
     * Clear all connections
     */
    clearAllConnections() {
        const orgIds = Array.from(this.connections.keys());
        orgIds.forEach(orgId => this.disconnect(orgId));
        logger_1.default.info('Cleared all Salesforce connections');
    }
}
exports.SalesforceService = SalesforceService;
// Export singleton instance and class
exports.salesforceService = new SalesforceService();
exports.default = exports.salesforceService;
//# sourceMappingURL=salesforce.service.js.map