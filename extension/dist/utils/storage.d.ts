export interface StorageKeys {
    migrationCount: number;
    salesforceAccessToken: string;
    salesforceRefreshToken: string;
    salesforceInstanceUrl: string;
    sfMigratorStorage: any;
}
/**
 * Get data from Chrome storage
 */
export declare function getFromStorage<T extends keyof StorageKeys>(keys: T[]): Promise<Pick<StorageKeys, T>>;
/**
 * Set data in Chrome storage
 */
export declare function setInStorage<T extends keyof StorageKeys>(data: Partial<Record<T, StorageKeys[T]>>): Promise<void>;
/**
 * Remove data from Chrome storage
 */
export declare function removeFromStorage(keys: (keyof StorageKeys)[]): Promise<void>;
/**
 * Clear all extension storage
 */
export declare function clearStorage(): Promise<void>;
/**
 * Encrypt sensitive data before storing
 * Note: This is a basic implementation. For production, use a proper encryption library.
 */
export declare function encryptData(data: string, key: string): Promise<string>;
/**
 * Decrypt sensitive data from storage
 */
export declare function decryptData(encryptedData: string, key: string): Promise<string>;
/**
 * Securely store Salesforce credentials
 */
export declare function storeCredentials(credentials: {
    accessToken: string;
    refreshToken?: string;
    instanceUrl: string;
}): Promise<void>;
/**
 * Retrieve Salesforce credentials
 */
export declare function getCredentials(): Promise<{
    accessToken: string;
    refreshToken: string;
    instanceUrl: string;
} | null>;
/**
 * Clear Salesforce credentials
 */
export declare function clearCredentials(): Promise<void>;
//# sourceMappingURL=storage.d.ts.map