import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1,
  IDENTITY_MAINTENANCE_ENABLE_ENV_V1,
  IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1,
  IDENTITY_MAINTENANCE_ENTRYPOINT_V1,
  IDENTITY_MAINTENANCE_MODE_ENV_V1,
  IDENTITY_MAINTENANCE_TASK_ENV_V1,
  createIdentityMaintenanceGuardedQueryV1,
  getIdentityMaintenanceDryRunV1,
} from '../../backend/identity/identity_maintenance_boundary_v1.mjs';
import { runIdentityMaintenanceV1 } from '../../backend/identity/run_identity_maintenance_v1.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IDENTITY_DIR = path.join(REPO_ROOT, 'backend', 'identity');
const REPRESENTATIVE_SCRIPT_PATH = path.join(IDENTITY_DIR, 'identity_apply_v1.mjs');

function withEnv(updates, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(updates)) {
    previous.set(key, process.env[key]);
    if (value === null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of previous.entries()) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

async function importFresh(filePath, label) {
  return import(`${pathToFileURL(filePath).href}?test=${encodeURIComponent(label)}-${Date.now()}`);
}

async function loadTargetFiles() {
  const entries = await fs.readdir(IDENTITY_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /(apply|repair|migration|replay).*\.mjs$/i.test(entry.name))
    .map((entry) => path.join(IDENTITY_DIR, entry.name))
    .sort();
}

test('identity maintenance script throws without maintenance env', async () => {
  await withEnv(
    {
      [IDENTITY_MAINTENANCE_ENABLE_ENV_V1]: null,
      [IDENTITY_MAINTENANCE_MODE_ENV_V1]: null,
      [IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1]: null,
    },
    async () => {
      await assert.rejects(
        importFresh(REPRESENTATIVE_SCRIPT_PATH, 'missing-env'),
        /RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled\./,
      );
    },
  );
});

test('identity maintenance script throws without explicit mode', async () => {
  await withEnv(
    {
      [IDENTITY_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [IDENTITY_MAINTENANCE_MODE_ENV_V1]: null,
      [IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1]: IDENTITY_MAINTENANCE_ENTRYPOINT_V1,
    },
    async () => {
      await assert.rejects(
        importFresh(REPRESENTATIVE_SCRIPT_PATH, 'missing-explicit-mode'),
        /RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'/,
      );
    },
  );
});

test('identity maintenance script throws without explicit entrypoint marker', async () => {
  await withEnv(
    {
      [IDENTITY_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [IDENTITY_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1]: null,
    },
    async () => {
      await assert.rejects(
        importFresh(REPRESENTATIVE_SCRIPT_PATH, 'missing-entrypoint'),
        /RUNTIME_ENFORCEMENT: identity maintenance scripts must be launched from backend\/identity\/run_identity_maintenance_v1\.mjs/,
      );
    },
  );
});

test('identity maintenance defaults to dry run unless explicitly disabled', async () => {
  await withEnv(
    {
      [IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1]: null,
    },
    async () => {
      assert.equal(getIdentityMaintenanceDryRunV1(), true);
    },
  );

  await withEnv(
    {
      [IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1]: 'false',
    },
    async () => {
      assert.equal(getIdentityMaintenanceDryRunV1(), false);
    },
  );
});

test('guarded public writes are blocked unless explicit maintenance mode is enabled', async () => {
  let originalQueryCalls = 0;
  const guardedQuery = createIdentityMaintenanceGuardedQueryV1(
    'identity_boundary_test',
    async function originalQuery(sql) {
      originalQueryCalls += 1;
      return {
        command: 'UPDATE',
        rowCount: 1,
        rows: [{ sql }],
        fields: [],
      };
    },
  );

  await withEnv(
    {
      [IDENTITY_MAINTENANCE_ENABLE_ENV_V1]: null,
      [IDENTITY_MAINTENANCE_MODE_ENV_V1]: null,
      [IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1]: null,
    },
    async () => {
      await assert.rejects(
        guardedQuery('update public.card_prints set gv_id = $1', ['GV-TEST']),
        /RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled\./,
      );
      assert.equal(originalQueryCalls, 0);
    },
  );
});

test('guarded public writes stay dry-run by default and only write when explicitly enabled', async () => {
  let originalQueryCalls = 0;
  const guardedQuery = createIdentityMaintenanceGuardedQueryV1(
    'identity_boundary_test',
    async function originalQuery(sql) {
      originalQueryCalls += 1;
      return {
        command: 'UPDATE',
        rowCount: 1,
        rows: [{ sql }],
        fields: [],
      };
    },
  );

  await withEnv(
    {
      [IDENTITY_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [IDENTITY_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1]: IDENTITY_MAINTENANCE_ENTRYPOINT_V1,
      [IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1]: null,
    },
    async () => {
      const logged = [];
      const originalConsoleLog = console.log;
      console.log = (...args) => logged.push(args.join(' '));
      try {
        const result = await guardedQuery('update public.card_prints set gv_id = $1', ['GV-TEST']);
        assert.equal(result.rowCount, 0);
        assert.equal(originalQueryCalls, 0);
        assert.match(logged.join('\n'), /\[DRY RUN\] would execute:/);
      } finally {
        console.log = originalConsoleLog;
      }
    },
  );

  await withEnv(
    {
      [IDENTITY_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [IDENTITY_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1]: IDENTITY_MAINTENANCE_ENTRYPOINT_V1,
      [IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1]: 'false',
    },
    async () => {
      const result = await guardedQuery('update public.card_prints set gv_id = $1', ['GV-TEST']);
      assert.equal(result.rowCount, 1);
      assert.equal(originalQueryCalls, 1);
    },
  );
});

test('identity maintenance entrypoint requires explicit task selection', async () => {
  await withEnv(
    {
      [IDENTITY_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [IDENTITY_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [IDENTITY_MAINTENANCE_TASK_ENV_V1]: null,
    },
    async () => {
      await assert.rejects(
        runIdentityMaintenanceV1(),
        /RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_TASK is required\./,
      );
    },
  );
});

test('identity maintenance entrypoint rejects unknown tasks before execution', async () => {
  await withEnv(
    {
      [IDENTITY_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [IDENTITY_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [IDENTITY_MAINTENANCE_TASK_ENV_V1]: 'not-a-real-task',
    },
    async () => {
      await assert.rejects(
        runIdentityMaintenanceV1(),
        /RUNTIME_ENFORCEMENT: unknown identity maintenance task "not-a-real-task"\./,
      );
    },
  );
});

test('all targeted maintenance scripts carry the maintenance-only boundary and env guards', async () => {
  const targetFiles = await loadTargetFiles();

  for (const filePath of targetFiles) {
    const source = await fs.readFile(filePath, 'utf8');
    assert.match(source, /MAINTENANCE-ONLY EXECUTION BOUNDARY/);
    assert.match(source, /ENABLE_IDENTITY_MAINTENANCE_MODE/);
    assert.match(source, /IDENTITY_MAINTENANCE_MODE/);
    assert.match(source, /IDENTITY_MAINTENANCE_DRY_RUN/);
    assert.match(source, /installIdentityMaintenanceBoundaryV1/);
  }
});
