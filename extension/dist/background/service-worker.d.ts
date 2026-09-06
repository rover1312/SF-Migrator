declare function handleOAuthLogin(payload: {
    loginUrl: string;
    clientId: string;
    redirectUri: string;
}): Promise<{
    success: boolean;
    redirectUrl: string | undefined;
    accessToken: string;
    refreshToken: string | null;
    instanceUrl: string | null;
}>;
declare function makeSalesforceRequest(payload: {
    endpoint: string;
    method?: string;
    body?: any;
}): Promise<any>;
//# sourceMappingURL=service-worker.d.ts.map