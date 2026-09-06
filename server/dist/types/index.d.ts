/**
 * Shared type definitions for SF-Migrator
 */
export interface OrgConfig {
    orgId: string;
    orgName?: string;
    loginUrl?: string;
    username?: string;
    password?: string;
    securityToken?: string;
    authToken?: string;
    refreshToken?: string;
    instanceUrl?: string;
    isSandbox?: boolean;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    instanceUrl: string;
    orgId: string;
    userId?: string;
    expiresAt?: number;
}
export interface SObjectSelection {
    name: string;
    label: string;
    custom: boolean;
    selected: boolean;
    recordCount?: number;
}
export interface FieldSelection {
    objectName: string;
    fieldName: string;
    label: string;
    type: string;
    length?: number;
    isCustom: boolean;
    selected: boolean;
    readable: boolean;
    editable: boolean;
}
export interface FilterConfig {
    objectName: string;
    filterType: 'all' | 'unprocessed' | 'processed' | 'custom';
    customSoql?: string;
    whereClause?: string;
    limit?: number;
    orderBy?: string;
}
export interface ExtractionConfig {
    sourceOrgId: string;
    objects: SObjectSelection[];
    fields: FieldSelection[];
    filters: FilterConfig[];
    batchSize?: number;
    includeDeleted?: boolean;
}
export interface ExtractionProgress {
    extractionId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    currentObject?: string;
    totalObjects: number;
    completedObjects: number;
    totalRecords: number;
    processedRecords: number;
    successRecords: number;
    errorRecords: number;
    errors: ExtractionError[];
    startedAt?: Date;
    completedAt?: Date;
}
export interface ExtractionError {
    objectName: string;
    recordId?: string;
    errorMessage: string;
    errorCode?: string;
    timestamp: Date;
}
export interface ValidationResult {
    orgId: string;
    objectName: string;
    fieldName: string;
    hasReadPermission: boolean;
    hasWritePermission: boolean;
    fieldType: string;
    fieldLength?: number;
    warnings: string[];
}
export interface ValidationSummary {
    orgId: string;
    orgName?: string;
    totalFields: number;
    validFields: number;
    invalidFields: number;
    validationResults: ValidationResult[];
    canProceed: boolean;
    warnings: string[];
}
export interface LoadConfig {
    targetOrgIds: string[];
    objects: SObjectSelection[];
    fields: FieldSelection[];
    dataPath: string;
    operation: 'insert' | 'update' | 'upsert';
    externalIdField?: string;
    batchSize?: number;
    stopOnError?: boolean;
}
export interface LoadProgress {
    loadId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    targetOrgId: string;
    currentObject?: string;
    totalObjects: number;
    completedObjects: number;
    totalRecords: number;
    processedRecords: number;
    successRecords: number;
    errorRecords: number;
    errors: LoadError[];
    startedAt?: Date;
    completedAt?: Date;
}
export interface LoadError {
    objectName: string;
    recordId?: string;
    errorMessage: string;
    errorCode?: string;
    fields?: Record<string, string>;
    timestamp: Date;
}
export interface MigrationSummary {
    migrationId: string;
    sourceOrgId: string;
    targetOrgIds: string[];
    status: 'completed' | 'partial' | 'failed';
    totalObjects: number;
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    startedAt: Date;
    completedAt?: Date;
    duration: number;
    objectSummaries: ObjectMigrationSummary[];
}
export interface ObjectMigrationSummary {
    objectName: string;
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    targetOrgResults: TargetOrgResult[];
}
export interface TargetOrgResult {
    orgId: string;
    orgName?: string;
    successRecords: number;
    failedRecords: number;
    errors: LoadError[];
}
export interface ConfigExport {
    version: string;
    exportedAt: string;
    sourceOrg: OrgConfig;
    targetOrgs: OrgConfig[];
    objects: SObjectSelection[];
    fields: FieldSelection[];
    filters: FilterConfig[];
    settings: MigrationSettings;
}
export interface MigrationSettings {
    batchSize: number;
    includeDeleted: boolean;
    stopOnError: boolean;
    operation: 'insert' | 'update' | 'upsert';
    externalIdField?: string;
    retryAttempts: number;
    timeout: number;
}
export interface ApiError {
    code: string;
    message: string;
    details?: any;
    stack?: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    message?: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
//# sourceMappingURL=index.d.ts.map