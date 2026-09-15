import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../utils/config';

/**
 * Local org registry. Stores connection metadata and OAuth tokens in
 * `data/configs/orgs.json`. Passwords and security tokens are NEVER stored —
 * they are used once at login and discarded.
 */
export interface StoredOrg {
  orgId: string;
  nickname: string;
  loginUrl: string;
  instanceUrl?: string;
  username?: string;
  sfOrgId?: string;
  accessToken?: string;
  refreshToken?: string;
  connectedAt?: string;
}

export class OrgStore {
  constructor(private baseDir: string = config.configsDir) {}

  private filePath(): string {
    return path.join(this.baseDir, 'orgs.json');
  }

  async loadAll(): Promise<StoredOrg[]> {
    try {
      const raw = await fs.readFile(this.filePath(), 'utf-8');
      const parsed = JSON.parse(raw) as StoredOrg[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  async save(org: StoredOrg): Promise<StoredOrg> {
    const orgs = (await this.loadAll()).filter((o) => o.orgId !== org.orgId);
    orgs.push(org);
    await this.writeAll(orgs);
    return org;
  }

  async get(orgId: string): Promise<StoredOrg | undefined> {
    return (await this.loadAll()).find((o) => o.orgId === orgId);
  }

  async remove(orgId: string): Promise<boolean> {
    const orgs = await this.loadAll();
    const kept = orgs.filter((o) => o.orgId !== orgId);
    if (kept.length === orgs.length) return false;
    await this.writeAll(kept);
    return true;
  }

  private async writeAll(orgs: StoredOrg[]): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const tmp = `${this.filePath()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(orgs, null, 2), 'utf-8');
    await fs.rename(tmp, this.filePath());
  }
}

export const orgStore = new OrgStore();
