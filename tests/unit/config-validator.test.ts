import { configService } from '../../src/server/services/config.service';
import type { MigrationConfig } from '../../src/server/types';

function baseConfig(): MigrationConfig {
  return {
    version: 1,
    sourceOrg: { nickname: 'prod', loginUrl: 'https://login.salesforce.com' },
    targetOrgs: [{ nickname: 'sandbox', loginUrl: 'https://test.salesforce.com' }],
    objects: [{ name: 'Account', order: 0 }],
    fields: { Account: ['Id', 'Name'] },
    filters: [],
    extraction: { format: 'csv', batchSize: 1000 },
    loading: { operation: 'insert', batchSize: 200, stopOnError: false },
  };
}

describe('config validator', () => {
  it('accepts a valid config', () => {
    const outcome = configService.validate(baseConfig());
    expect(outcome.valid).toBe(true);
    expect(outcome.errors).toEqual([]);
  });

  it('rejects schema violations', () => {
    const outcome = configService.validate({ version: 1 });
    expect(outcome.valid).toBe(false);
    expect(outcome.errors.length).toBeGreaterThan(0);
  });

  it('rejects a target that duplicates the source nickname', () => {
    const config = baseConfig();
    config.targetOrgs = [{ nickname: 'prod', loginUrl: 'https://test.salesforce.com' }];
    const outcome = configService.validate(config);
    expect(outcome.valid).toBe(false);
    expect(outcome.errors.join(' ')).toMatch(/duplicates/);
  });

  it('rejects upsert without an external ID field', () => {
    const config = baseConfig();
    config.loading.operation = 'upsert';
    const outcome = configService.validate(config);
    expect(outcome.valid).toBe(false);
    expect(outcome.errors.join(' ')).toMatch(/externalIdField/);
  });

  it('rejects filters on unselected objects', () => {
    const config = baseConfig();
    config.filters = [{ objectName: 'Contact', field: 'Name', operator: '=', value: 'x' }];
    const outcome = configService.validate(config);
    expect(outcome.valid).toBe(false);
    expect(outcome.errors.join(' ')).toMatch(/unselected/);
  });

  it('round-trips JSON and YAML export/import', () => {
    const config = baseConfig();
    for (const format of ['json', 'yaml'] as const) {
      const { content, filename } = configService.exportText(config, format);
      expect(configService.parseFileContent(content, filename)).toEqual(config);
    }
  });

  it('reports parse errors with the filename', () => {
    expect(() => configService.parseFileContent('{nope', 'bad.json')).toThrow(/bad\.json/);
  });

  it('accepts lookups whose parents load first', () => {
    const config = baseConfig();
    config.objects = [
      { name: 'Account', order: 0 },
      { name: 'Contact', order: 1 },
    ];
    config.fields = { Account: ['Name'], Contact: ['LastName', 'AccountId'] };
    config.lookups = { Contact: { AccountId: 'Account' } };
    expect(configService.validate(config).valid).toBe(true);
  });

  it('rejects lookups with wrong order or unknown parents', () => {
    const config = baseConfig();
    config.objects = [
      { name: 'Account', order: 1 },
      { name: 'Contact', order: 0 },
    ];
    config.fields = { Account: ['Name'], Contact: ['LastName', 'AccountId'] };
    config.lookups = { Contact: { AccountId: 'Account' } };
    expect(configService.validate(config).errors.join(' ')).toMatch(/earlier in load order/);

    const unknown = baseConfig();
    unknown.objects = [{ name: 'Contact', order: 0 }];
    unknown.fields = { Contact: ['LastName', 'AccountId'] };
    unknown.lookups = { Contact: { AccountId: 'Account' } };
    expect(configService.validate(unknown).errors.join(' ')).toMatch(/unselected object/);
  });
});
