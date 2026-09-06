// Storage utilities for Chrome Extension
/**
 * Get data from Chrome storage
 */
export async function getFromStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
            resolve(result);
        });
    });
}
/**
 * Set data in Chrome storage
 */
export async function setInStorage(data) {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, () => {
            resolve();
        });
    });
}
/**
 * Remove data from Chrome storage
 */
export async function removeFromStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.remove(keys, () => {
            resolve();
        });
    });
}
/**
 * Clear all extension storage
 */
export async function clearStorage() {
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
export async function encryptData(data, key) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const encodedKey = encoder.encode(key);
    const cryptoKey = await crypto.subtle.importKey('raw', encodedKey, { name: 'PBKDF2' }, false, ['deriveBits']);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100000;
    const derivedBits = await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
    }, cryptoKey, 256);
    return JSON.stringify({
        salt: Array.from(salt),
        data: Array.from(encodedData),
    });
}
/**
 * Decrypt sensitive data from storage
 */
export async function decryptData(encryptedData, key) {
    const parsed = JSON.parse(encryptedData);
    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(parsed.data));
}
/**
 * Securely store Salesforce credentials
 */
export async function storeCredentials(credentials) {
    await setInStorage({
        salesforceAccessToken: credentials.accessToken,
        salesforceRefreshToken: credentials.refreshToken || '',
        salesforceInstanceUrl: credentials.instanceUrl,
    });
}
/**
 * Retrieve Salesforce credentials
 */
export async function getCredentials() {
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
export async function clearCredentials() {
    await removeFromStorage([
        'salesforceAccessToken',
        'salesforceRefreshToken',
        'salesforceInstanceUrl',
    ]);
}
//# sourceMappingURL=storage.js.map