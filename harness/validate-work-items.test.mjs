import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');
const validator = path.join(root, 'harness/validate-work-items.mjs');

test('WI-GH-002 no puede pasar a W-READY hasta cerrar WI-GH-001', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tjc-gh-wi-dependency-'));
  try {
    fs.mkdirSync(path.join(directory, 'harness/contract-sync/inbox'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'spec/features'), { recursive: true });
    for (const file of ['spec/backlog.md', 'spec/operational-cases.md', 'harness/state.json']) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(directory, file));
    }
    for (const feature of ['001-service-bootstrap', '002-repository-access']) {
      fs.cpSync(path.join(root, 'spec/features', feature), path.join(directory, 'spec/features', feature), { recursive: true });
    }
    const registry = JSON.parse(fs.readFileSync(path.join(root, 'harness/work-items.json'), 'utf8'));
    registry.workItems.find((item) => item.id === 'WI-GH-002').status = 'W-READY';
    fs.writeFileSync(path.join(directory, 'harness/work-items.json'), JSON.stringify(registry));
    const taskPath = path.join(directory, 'spec/features/002-repository-access/tasks.md');
    fs.writeFileSync(taskPath, fs.readFileSync(taskPath, 'utf8').replace('T-BACKLOGGED', 'T-READY'));

    const result = spawnSync(process.execPath, [validator], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /WI-GH-002 cannot be selectable or active before dependency WI-GH-001 is W-DONE/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
