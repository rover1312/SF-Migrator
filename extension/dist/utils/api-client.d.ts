export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
/**
 * GET request
 */
export declare function get<T>(endpoint: string): Promise<ApiResponse<T>>;
/**
 * POST request
 */
export declare function post<T>(endpoint: string, body: any): Promise<ApiResponse<T>>;
/**
 * PUT request
 */
export declare function put<T>(endpoint: string, body: any): Promise<ApiResponse<T>>;
/**
 * DELETE request
 */
export declare function del<T>(endpoint: string): Promise<ApiResponse<T>>;
export declare const api: {
    auth: {
        connectOrg: (orgConfig: any) => Promise<ApiResponse<unknown>>;
        testConnection: (orgId: string) => Promise<ApiResponse<unknown>>;
        disconnectOrg: (orgId: string) => Promise<ApiResponse<unknown>>;
    };
    objects: {
        list: (sourceOrgId: string) => Promise<ApiResponse<unknown>>;
        describe: (objectName: string, sourceOrgId: string) => Promise<ApiResponse<unknown>>;
    };
    fields: {
        describe: (objectNames: string[], sourceOrgId: string) => Promise<ApiResponse<unknown>>;
    };
    extract: {
        start: (config: any) => Promise<ApiResponse<unknown>>;
        status: (extractionId: string) => Promise<ApiResponse<unknown>>;
        cancel: (extractionId: string) => Promise<ApiResponse<unknown>>;
    };
    validate: {
        permissions: (config: any) => Promise<ApiResponse<unknown>>;
        targetOrg: (targetOrgId: string, objects: string[]) => Promise<ApiResponse<unknown>>;
    };
    load: {
        start: (config: any) => Promise<ApiResponse<unknown>>;
        status: (loadId: string) => Promise<ApiResponse<unknown>>;
        cancel: (loadId: string) => Promise<ApiResponse<unknown>>;
    };
    config: {
        export: () => Promise<ApiResponse<unknown>>;
        import: (config: any) => Promise<ApiResponse<unknown>>;
        save: (config: any) => Promise<ApiResponse<unknown>>;
        list: () => Promise<ApiResponse<unknown>>;
        delete: (configId: string) => Promise<ApiResponse<unknown>>;
    };
};
export default api;
//# sourceMappingURL=api-client.d.ts.map