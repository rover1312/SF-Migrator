import {
  buildCondition,
  buildCount,
  buildSelect,
  buildWhere,
  escapeIdent,
  escapeLiteral,
} from '../../src/server/utils/soql';

describe('soql builder', () => {
  it('builds a plain select', () => {
    expect(buildSelect({ object: 'Account', fields: ['Id', 'Name'] })).toBe(
      'SELECT Id, Name FROM Account',
    );
  });

  it('adds where, order, and limit', () => {
    expect(
      buildSelect({
        object: 'Contact',
        fields: ['Id'],
        filters: [{ field: 'Name', operator: '=', value: "O'Brien" }],
        orderBy: 'Name',
        limit: 10,
      }),
    ).toBe(`SELECT Id FROM Contact WHERE Name = 'O\\'Brien' ORDER BY Name LIMIT 10`);
  });

  it('handles IN lists with mixed literals', () => {
    expect(buildCondition({ field: 'Amount', operator: 'IN', value: '1, 2, abc' })).toBe(
      "Amount IN (1, 2, 'abc')",
    );
  });

  it('passes through numbers, booleans, and NULL', () => {
    expect(buildCondition({ field: 'Amount', operator: '>', value: '5' })).toBe('Amount > 5');
    expect(buildCondition({ field: 'Active', operator: '=', value: 'true' })).toBe('Active = TRUE');
    expect(buildWhere([])).toBe('');
  });

  it('builds COUNT queries', () => {
    expect(buildCount('Account')).toBe('SELECT COUNT() FROM Account');
  });

  it('rejects injection attempts and bad operators', () => {
    expect(() => escapeIdent('Name; DELETE')).toThrow(/Invalid SOQL identifier/);
    expect(() => buildCondition({ field: 'Name', operator: 'DROP', value: 'x' })).toThrow(
      /Unsupported operator/,
    );
    expect(() => buildSelect({ object: 'Account', fields: [] })).toThrow(/at least one field/);
    expect(escapeLiteral("a'b")).toBe(`'a\\'b'`);
  });
});
