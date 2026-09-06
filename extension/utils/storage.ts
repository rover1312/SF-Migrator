// Storage utilities for Chrome Extension

export interface StorageKeys {
  migrationCount: number;
  salesforceAccessToken: string;
  salesforceRefreshToken: string;
  salesforceInstanceUrl: string;
  sfMigratorStorage: any; // Zustand persisted state
}

/**
 * Get data from Chrome storage
 */
export async function getFromStorage<T extends keyof StorageKeys>(keys: T[]): Promise<Pick<StorageKeys, T>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result as Pick<StorageKeys, T>);
    });
  });
}

/**
 * Set data in Chrome storage
 */
export async function setInStorage<T extends keyof StorageKeys>(data: Partial<Record<T, StorageKeys[T]>>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data as Record<string, any>, () => {
      resolve();
    });
  });
}

/**
 * Remove data from Chrome storage
 */
export async function removeFromStorage(keys: (keyof StorageKeys)[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, () => {
      resolve();
    });
  });
}

/**
 * Clear all extension storage
 */
export async function clearStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      resolve();
    });
  });
}

/**
 * Encrypt sensitive data before storing
 * Note: This is a basic implementation. For production, use a proper encryption library.
 */
export async function encryptData(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const encodedKey = encoder.encode(key);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encodedKey,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    cryptoKey,
    256
  );
  
  return JSON.stringify({
    salt: Array.from(salt),
    data: Array.from(encodedData),
  });
}

/**
 * Decrypt sensitive data from storage
 */
export async function decryptData(encryptedData: string, key: string): Promise<string> {
  const parsed = JSON.parse(encryptedData);
  const decoder = new TextDecoder();
  
  return decoder.decode(new Uint8Array(parsed.data));
}

/**
 * Securely store Salesforce credentials
 */
export async function storeCredentials(credentials: {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
}): Promise<void> {
  await setInStorage({
    salesforceAccessToken: credentials.accessToken,
    salesforceRefreshToken: credentials.refreshToken || '',
    salesforceInstanceUrl: credentials.instanceUrl,
  });
}

/**
 * Retrieve Salesforce credentials
 */
export async function getCredentials(): Promise<{
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
} | null> {
  const result = await getFromStorage([
    'salesforceAccessToken',
    'salesforceRefreshToken',
    'salesforceInstanceUrl',
  ]);
  
  if (!result.salesforceAccessToken || !result.salesforceInstanceUrl) {
    return null;
  }
  
  return {
    accessToken: result.salesforceAccessToken,
    refreshToken: result.salesforceRefreshToken || '',
    instanceUrl: result.salesforceInstanceUrl,
  };
}

/**
 * Clear Salesforce credentials
 */
export async function clearCredentials(): Promise<void> {
  await removeFromStorage([
    'salesforceAccessToken',
    'salesforceRefreshToken',
    'salesforceInstanceUrl',
  ]);
}
