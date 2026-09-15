/** Import/export of migration configuration (JSON/YAML). */
export class ConfigService {
  validate(_config: unknown): { valid: boolean; errors: string[] } {
    // TODO: JSON Schema + Ajv validation (CHECKLIST §3)
    return { valid: true, errors: [] };
  }
}

export const configService = new ConfigService();
