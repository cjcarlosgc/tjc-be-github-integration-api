import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('harness/contract-sync.mjs');
const tagBySource = { core: 'CORE', console: 'CONSOLE', sandbox: 'SANDBOX', 'github-integration': 'GH' };
const fixtures = [
  ['CS-CORE-20260925-001', 'core'],
  ['CS-CONSOLE-20260925-002', 'console'],
  ['CS-GH-20260925-003', 'github-integration'],
  ['CS-20260923-004', 'core'],
];

function makeEvent(id, source, sourceWorkItem = undefined) {
  return [
    'type: CONTRACT_SYNC', `id: ${id}`, `source: ${source}`,
    ...(sourceWorkItem ? [`sourceWorkItem: ${sourceWorkItem}`] : []),
    'targets: [github-integration]',
    'scopePaths: [spec/contracts/github-integration-contract.md]',
    'breaking: false', 'changed:', '  - Contract fixture.', 'requiredAction:',
    '  - Review the affected API.', 'sourceRevision: test', 'status: C-PENDING', '',
  ].join('\n');
}

function prepareCheckRoot(directory) {
  fs.mkdirSync(path.join(directory, 'harness/contract-sync/inbox'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'harness/contract-sync/outbox'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'harness/work-items.json'), JSON.stringify({
    schemaVersion: 1,
    component: 'GH',
    workItems: [{
      id: 'WI-GH-999', component: 'GH', workItemType: 'PRODUCT', status: 'W-SELECTED',
      storyIds: ['HU02'], taskIds: ['ST-GH-999'], caseIds: [], sprint: 'Test',
      dependsOn: [], contractImpact: true, publishesContract: false,
      specPaths: ['spec/contracts/github-integration-contract.md'],
    }],
  }));
  fs.writeFileSync(path.join(directory, 'harness/state.json'), JSON.stringify({
    planningBaseline: '2026-09-24-core-console-transition',
    activeWorkItem: {
      id: 'WI-GH-999', status: 'W-SELECTED',
      coordination: { pullCheckpoints: [] },
    },
  }));
}

for (const [id, source] of fixtures) {
  test(`import/check reconoce ${id}`, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tjc-gh-contract-sync-'));
    try {
      prepareCheckRoot(directory);
      const externalOutbox = path.join(directory, 'external-outbox');
      fs.mkdirSync(externalOutbox);
      const sourceWorkItem = id.includes('-20260925-') ? `WI-${tagBySource[source]}-001` : undefined;
      fs.writeFileSync(path.join(externalOutbox, `${id}.yaml`), makeEvent(id, source, sourceWorkItem));

      const imported = spawnSync(process.execPath, [script, 'import', '--from', externalOutbox], { cwd: directory, encoding: 'utf8' });
      assert.equal(imported.status, 0, imported.stderr);
      assert.equal(JSON.parse(imported.stdout).imported, 1);
      const checked = spawnSync(process.execPath, [script, 'check', '--checkpoint', 'start', '--work-item', 'WI-GH-999'], { cwd: directory, encoding: 'utf8' });
      assert.equal(checked.status, 2, checked.stderr);
      assert.deepEqual(JSON.parse(checked.stdout).relevantPendingSyncIds, [id]);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

test('import y check rechazan namespace discordante, sourceWorkItem ausente y legacy reciente', () => {
  const invalidEvents = [
    ['CS-CORE-20260925-101', 'console', 'WI-CONSOLE-001', /namespace CORE/],
    ['CS-GH-20260925-102', 'github-integration', undefined, /sourceWorkItem/],
    ['CS-20260925-103', 'core', undefined, /historical data/],
  ];

  for (const [id, source, sourceWorkItem, issue] of invalidEvents) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tjc-gh-contract-sync-invalid-'));
    try {
      prepareCheckRoot(directory);
      const externalOutbox = path.join(directory, 'external-outbox');
      fs.mkdirSync(externalOutbox);
      const body = makeEvent(id, source, sourceWorkItem);
      fs.writeFileSync(path.join(externalOutbox, `${id}.yaml`), body);
      const imported = spawnSync(process.execPath, [script, 'import', '--from', externalOutbox], { cwd: directory, encoding: 'utf8' });
      assert.equal(imported.status, 1);
      assert.match(imported.stderr, issue);

      fs.writeFileSync(path.join(directory, 'harness/contract-sync/inbox', `${id}.yaml`), body);
      const checked = spawnSync(process.execPath, [script, 'check', '--checkpoint', 'start', '--work-item', 'WI-GH-999'], { cwd: directory, encoding: 'utf8' });
      assert.equal(checked.status, 1);
      assert.match(checked.stderr, issue);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

test('publish emite sourceWorkItem y rechaza IDs simples incluso si su fecha parece histórica', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tjc-gh-contract-sync-publish-'));
  try {
    const outbox = path.join(directory, 'harness/contract-sync/outbox');
    fs.mkdirSync(outbox, { recursive: true });
    fs.writeFileSync(path.join(directory, 'harness/work-items.json'), JSON.stringify({
      schemaVersion: 1,
      component: 'GH',
      workItems: [{ id: 'WI-GH-003', component: 'GH', contractImpact: true, publishesContract: true }],
    }));
    const args = ['publish', '--work-item', 'WI-GH-003', '--targets', 'core', '--scope-paths', 'spec/contracts/github-integration-contract.md', '--breaking', 'false', '--changed', 'approved contract change', '--required-action', 'review compatibility', '--source-revision', 'abc123'];
    const published = spawnSync(process.execPath, [script, ...args, '--id', 'CS-GH-20260925-001'], { cwd: directory, encoding: 'utf8' });
    assert.equal(published.status, 0, published.stderr);
    const event = fs.readFileSync(path.join(outbox, 'CS-GH-20260925-001.yaml'), 'utf8');
    assert.match(event, /^source: github-integration$/m);
    assert.match(event, /^sourceWorkItem: WI-GH-003$/m);

    const legacy = spawnSync(process.execPath, [script, ...args, '--id', 'CS-20260924-002'], { cwd: directory, encoding: 'utf8' });
    assert.equal(legacy.status, 1);
    assert.match(legacy.stderr, /must use the GH-namespaced/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
