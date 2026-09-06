// API client for communicating with the local server
const SERVER_URL = 'http://localhost:3001/api';
/**
 * Make a request to the local server API
 */
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${SERVER_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error: data.message || `HTTP ${response.status}: ${response.statusText}`,
            };
        }
        return {
            success: true,
            data: data,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}
/**
 * GET request
 */
export async function get(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
}
/**
 * POST request
 */
export async function post(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
/**
 * PUT request
 */
export async function put(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}
/**
 * DELETE request
 */
export async function del(endpoint) {
    return apiRequest(endpoint, { method: 'DELETE' });
}
// API endpoints helpers
export const api = {
    // Auth endpoints
    auth: {
        connectOrg: (orgConfig) => post('/auth/org', orgConfig),
        testConnection: (orgId) => get(`/auth/test/${orgId}`),
        disconnectOrg: (orgId) => del(`/auth/org/${orgId}`),
    },
    // Objects endpoints
    objects: {
        list: (sourceOrgId) => get(`/objects/list?sourceOrgId=${sourceOrgId}`),
        describe: (objectName, sourceOrgId) => get(`/objects/describe/${objectName}?sourceOrgId=${sourceOrgId}`),
    },
    // Fields endpoints
    fields: {
        describe: (objectNames, sourceOrgId) => post('/fields/describe', { objectNames, sourceOrgId }),
    },
    // Extraction endpoints
    extract: {
        start: (config) => post('/extract/start', config),
        status: (extractionId) => get(`/extract/status/${extractionId}`),
        cancel: (extractionId) => post(`/extract/cancel/${extractionId}`, {}),
    },
    // Validation endpoints
    validate: {
        permissions: (config) => post('/validate/permissions', config),
        targetOrg: (targetOrgId, objects) => post('/validate/target', { targetOrgId, objects }),
    },
    // Loading endpoints
    load: {
        start: (config) => post('/load/start', config),
        status: (loadId) => get(`/load/status/${loadId}`),
        cancel: (loadId) => post(`/load/cancel/${loadId}`, {}),
    },
    // Config endpoints
    config: {
        export: () => get('/config/export'),
        import: (config) => post('/config/import', config),
        save: (config) => post('/config/save', config),
        list: () => get('/config/list'),
        delete: (configId) => del(`/config/${configId}`),
    },
};
export default api;
//# sourceMappingURL=api-client.js.map