/**
 * @jest-environment jsdom
 */
import axe from 'axe-core';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../../src/client/App';
import { useMigrationStore } from '../../src/client/store/migrationStore';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

global.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * axe-core audit (full default ruleset) over every wizard screen.
 * Client-side rendered: zustand v4 SSR snapshots initial state, so
 * renderToString would only ever show step 1.
 * Color-contrast can't be measured in jsdom (no layout engine) — it is
 * covered numerically in contrast.test.ts instead.
 */
async function violationsFor(step: number | 'summary'): Promise<string[]> {
  useMigrationStore.setState({ step: step as 1 });
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(App));
  });
  try {
    const results = await axe.run(container, { resultTypes: ['violations'] });
    return results.violations.map(
      (v) => `${v.id} (${v.nodes.length} nodes): ${v.help} [${v.tags.join(',')}]`,
    );
  } finally {
    await act(async () => {
      root?.unmount();
    });
    container.remove();
  }
}

describe('axe accessibility benchmark', () => {
  beforeAll(() => {
    useMigrationStore.setState({
      sourceOrg: {
        orgId: 'src-1',
        nickname: 'prod',
        loginUrl: 'https://login.salesforce.com',
        connected: true,
      },
      targetOrgs: [
        {
          orgId: 'tgt-1',
          nickname: 'sandbox',
          loginUrl: 'https://test.salesforce.com',
          connected: true,
        },
      ],
      selectedObjects: ['Account', 'Contact'],
      objectLabels: { Account: 'Accounts', Contact: 'Contacts' },
      fieldMeta: {
        Account: [
          { name: 'Id', label: 'ID', type: 'id', creatable: false, updateable: false },
          { name: 'Name', label: 'Name', type: 'string', creatable: true, updateable: true },
        ],
        Contact: [
          {
            name: 'LastName',
            label: 'Last Name',
            type: 'string',
            creatable: true,
            updateable: true,
          },
          {
            name: 'AccountId',
            label: 'Account',
            type: 'reference',
            creatable: true,
            updateable: true,
          },
        ],
      },
      selectedFields: { Account: ['Name'], Contact: ['LastName', 'AccountId'] },
      lookups: { Contact: { AccountId: 'Account' } },
      filters: [{ objectName: 'Account', field: 'Name', operator: '=', value: 'Acme' }],
      loadTargets: ['tgt-1'],
      extractJobId: 'extract-1',
    });
  });

  it('has zero violations on every screen', async () => {
    const steps: (number | 'summary')[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'summary'];
    const failures: string[] = [];
    for (const step of steps) {
      const found = await violationsFor(step);
      if (found.length > 0) failures.push(`step ${step}:\n  - ${found.join('\n  - ')}`);
    }
    if (failures.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`\nAXE FAILURES\n${failures.join('\n')}`);
    }
    expect(failures).toEqual([]);
  }, 120000);
});
