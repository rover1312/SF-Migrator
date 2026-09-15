import { Connection } from 'jsforce';
import logger from '../utils/logger.js';

/**
 * Thin wrapper around jsforce connections.
 * One connection per orgId, kept in memory for the local session.
 */
export class SalesforceService {
  private connections = new Map<string, Connection>();

  async connectWithCredentials(
    orgId: string,
    args: { loginUrl: string; username: string; password: string; securityToken?: string },
  ): Promise<Connection> {
    const conn = new Connection({ loginUrl: args.loginUrl });
    await conn.login(args.username, args.password + (args.securityToken ?? ''));
    this.connections.set(orgId, conn);
    logger.info(`Connected org ${orgId}`);
    return conn;
  }

  getConnection(orgId: string): Connection | undefined {
    return this.connections.get(orgId);
  }

  async describeObjects(orgId: string): Promise<{ name: string; label: string; custom: boolean }[]> {
    const conn = this.getConnection(orgId);
    if (!conn) throw new Error(`No connection for org: ${orgId}`);
    const global = await conn.describeGlobal();
    return global.sobjects.map((s) => ({ name: s.name, label: s.label, custom: s.custom }));
  }

  disconnect(orgId: string): void {
    this.connections.get(orgId)?.logout().catch((err) => logger.warn(`Logout failed: ${err}`));
    this.connections.delete(orgId);
  }
}

export const salesforceService = new SalesforceService();
