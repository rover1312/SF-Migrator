// API client for communicating with the local server

const SERVER_URL = 'http://localhost:3001/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make a request to the local server API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
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
      data: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * GET request
 */
export async function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 */
export async function put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

// API endpoints helpers

export const api = {
  // Auth endpoints
  auth: {
    connectOrg: (orgConfig: any) => post('/auth/org', orgConfig),
    testConnection: (orgId: string) => get(`/auth/test/${orgId}`),
    disconnectOrg: (orgId: string) => del(`/auth/org/${orgId}`),
  },

  // Objects endpoints
  objects: {
    list: (sourceOrgId: string) => get(`/objects/list?sourceOrgId=${sourceOrgId}`),
    describe: (objectName: string, sourceOrgId: string) => 
      get(`/objects/describe/${objectName}?sourceOrgId=${sourceOrgId}`),
  },

  // Fields endpoints
  fields: {
    describe: (objectNames: string[], sourceOrgId: string) =>
      post('/fields/describe', { objectNames, sourceOrgId }),
  },

  // Extraction endpoints
  extract: {
    start: (config: any) => post('/extract/start', config),
    status: (extractionId: string) => get(`/extract/status/${extractionId}`),
    cancel: (extractionId: string) => post(`/extract/cancel/${extractionId}`),
  },

  // Validation endpoints
  validate: {
    permissions: (config: any) => post('/validate/permissions', config),
    targetOrg: (targetOrgId: string, objects: string[]) =>
      post('/validate/target', { targetOrgId, objects }),
  },

  // Loading endpoints
  load: {
    start: (config: any) => post('/load/start', config),
    status: (loadId: string) => get(`/load/status/${loadId}`),
    cancel: (loadId: string) => post(`/load/cancel/${loadId}`),
  },

  // Config endpoints
  config: {
    export: () => get('/config/export'),
    import: (config: any) => post('/config/import', config),
    save: (config: any) => post('/config/save', config),
    list: () => get('/config/list'),
    delete: (configId: string) => del(`/config/${configId}`),
  },
};

export default api;
