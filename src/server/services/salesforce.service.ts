import { Connection, OAuth2, type QueryResult } from 'jsforce';
import { config } from '../utils/config';
import logger from '../utils/logger';
import { withRetry } from '../utils/retry';
import { buildCount, type FilterInput } from '../utils/soql';

export interface SObjectInfo {
  name: string;
  label: string;
  custom: boolean;
}

export interface FieldPermission {
  name: string;
  label: string;
  type: string;
  custom: boolean;
  readable: boolean;
  creatable: boolean;
  updateable: boolean;
  nillable: boolean;
}

function oauth2Client(): OAuth2 {
  return new OAuth2({
    clientId: config.salesforce.clientId,
    clientSecret: config.salesforce.clientSecret,
    redirectUri: config.salesforce.redirectUri,
  });
}

/**
 * Salesforce access layer (jsforce). Connections live in memory per orgId;
 * tokens persist via OrgStore. All network calls retry transient failures.
 */
export class SalesforceService {
  private connections = new Map<string, Connection>();

  /** Test-only seam: install a fake connection (unit tests). */
  setConnection(orgId: string, conn: Connection): void {
    this.connections.set(orgId, conn);
  }

  requireConnection(orgId: string): Connection {
    const conn = this.connections.get(orgId);
    if (!conn) throw new Error(`No connection for org: ${orgId}`);
    return conn;
  }

  async connectWithCredentials(
    orgId: string,
    args: { loginUrl: string; username: string; password: string; securityToken?: string },
  ): Promise<Connection> {
    const conn = new Connection({ loginUrl: args.loginUrl });
    await withRetry(() => conn.login(args.username, args.password + (args.securityToken ?? '')));
    this.connections.set(orgId, conn);
    logger.info(`Connected org ${orgId}`);
    return conn;
  }

  async connectWithTokens(
    orgId: string,
    tokens: { accessToken: string; instanceUrl: string; refreshToken?: string },
  ): Promise<Connection> {
    const conn = new Connection({
      oauth2: oauth2Client(),
      instanceUrl: tokens.instanceUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    await withRetry(() => conn.identity());
    this.connections.set(orgId, conn);
    logger.info(`Connected org ${orgId} via OAuth tokens`);
    return conn;
  }

  /** Build the Salesforce login URL that starts the OAuth web-server flow. */
  getAuthorizationUrl(loginUrl: string, state: string): string {
    const oauth2 = new OAuth2({
      clientId: config.salesforce.clientId,
      clientSecret: config.salesforce.clientSecret,
      redirectUri: config.salesforce.redirectUri,
      loginUrl,
    });
    return oauth2.getAuthorizationUrl({ scope: 'api refresh_token', state });
  }

  /** Refresh an expired access token. Returns fresh tokens to persist. */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; instanceUrl: string }> {
    const result = await withRetry(() => oauth2Client().refreshToken(refreshToken));
    return { accessToken: result.access_token, instanceUrl: result.instance_url };
  }

  async describeObjects(orgId: string): Promise<SObjectInfo[]> {
    const conn = this.requireConnection(orgId);
    const global = await withRetry(() => conn.describeGlobal());
    return global.sobjects.map((s) => ({ name: s.name, label: s.label, custom: s.custom }));
  }

  async describeFields(orgId: string, objectName: string): Promise<FieldPermission[]> {
    const conn = this.requireConnection(orgId);
    const described = await withRetry(() => conn.sobject(objectName).describe());
    return described.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      custom: f.custom,
      readable: f.createable || f.updateable,
      creatable: f.createable,
      updateable: f.updateable,
      nillable: f.nillable,
    }));
  }

  /** COUNT() for an object with optional equality-style filters. */
  async getRecordCount(
    orgId: string,
    object: string,
    filters: FilterInput[] = [],
  ): Promise<number> {
    const conn = this.requireConnection(orgId);
    const result = await withRetry(
      () =>
        conn.query<{ cnt: number }>(buildCount(object, filters)) as unknown as Promise<
          QueryResult<{ cnt: number }>
        >,
    );
    return result.totalSize;
  }

  /** Run a SOQL query and follow pagination until `done`, streaming pages out. */
  async queryAllPaged<T extends Record<string, unknown>>(
    orgId: string,
    soql: string,
    onPage: (records: T[]) => Promise<void> | void,
  ): Promise<number> {
    const conn = this.requireConnection(orgId);
    const runQuery = (q: string): Promise<QueryResult<T>> =>
      conn.query<T>(q) as unknown as Promise<QueryResult<T>>;
    const runMore = (url: string): Promise<QueryResult<T>> =>
      conn.queryMore<T>(url) as unknown as Promise<QueryResult<T>>;
    let result = await withRetry(() => runQuery(soql));
    let total = 0;
    for (;;) {
      total += result.records.length;
      await onPage(result.records);
      if (result.done || !result.nextRecordsUrl) break;
      const nextUrl = result.nextRecordsUrl;
      result = await withRetry(() => runMore(nextUrl));
    }
    return total;
  }

  /** Check create/update permission per field for a planned load. */
  async checkFieldPermissions(
    orgId: string,
    objectName: string,
    fieldNames: string[],
    operation: 'insert' | 'update' | 'upsert',
  ): Promise<{ field: string; allowed: boolean; reason?: string }[]> {
    const described = await this.describeFields(orgId, objectName);
    const byName = new Map(described.map((f) => [f.name, f]));
    return fieldNames.map((field) => {
      const meta = byName.get(field);
      if (!meta) return { field, allowed: false, reason: 'field does not exist on target' };
      const allowed = operation === 'update' ? meta.updateable : meta.creatable;
      return allowed
        ? { field, allowed: true }
        : {
            field,
            allowed: false,
            reason: `field is not ${operation === 'update' ? 'updateable' : 'creatable'} on target`,
          };
    });
  }

  disconnect(orgId: string): void {
    const conn = this.connections.get(orgId);
    this.connections.delete(orgId);
    if (!conn) return;
    try {
      const result = conn.logout() as unknown;
      Promise.resolve(result).catch((err) => logger.warn(`Logout failed: ${err}`));
    } catch (err) {
      logger.warn(`Logout failed: ${err}`);
    }
  }
}

export const salesforceService = new SalesforceService();
