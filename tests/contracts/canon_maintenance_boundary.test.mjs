import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CANON_MAINTENANCE_DRY_RUN_ENV_V1,
  CANON_MAINTENANCE_ENABLE_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_V1,
  CANON_MAINTENANCE_MODE_ENV_V1,
  CANON_MAINTENANCE_TASK_ENV_V1,
  createCanonMaintenanceGuardedQueryV1,
  getCanonMaintenanceDryRun,
} from '../../backend/maintenance/canon_maintenance_boundary_v1.mjs';
import {
  CANON_MAINTENANCE_FILES_V1,
  runCanonMaintenanceV1,
} from '../../backend/maintenance/run_canon_maintenance_v1.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REPRESENTATIVE_SCRIPT_PATH = path.join(REPO_ROOT, 'backend', 'pricing', 'ba_promote_v1.mjs');

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

test('canon maintenance script throws without maintenance env', async () => {
  await withEnv(
    {
      [CANON_MAINTENANCE_ENABLE_ENV_V1]: null,
      [CANON_MAINTENANCE_MODE_ENV_V1]: null,
      [CANON_MAINTENANCE_ENTRYPOINT_ENV_V1]: null,
    },
    async () => {
      await assert.rejects(
        importFresh(REPRESENTATIVE_SCRIPT_PATH, 'missing-env'),
        /RUNTIME_ENFORCEMENT: canon maintenance is disabled\./,
      );
    },
  );
});

test('canon maintenance script throws without explicit mode', async () => {
  await withEnv(
    {
      [CANON_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [CANON_MAINTENANCE_MODE_ENV_V1]: null,
      [CANON_MAINTENANCE_ENTRYPOINT_ENV_V1]: CANON_MAINTENANCE_ENTRYPOINT_V1,
    },
    async () => {
      await assert.rejects(
        importFresh(REPRESENTATIVE_SCRIPT_PATH, 'missing-explicit-mode'),
        /RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'\./,
      );
    },
  );
});

test('canon maintenance script throws without explicit entrypoint marker', async () => {
  await withEnv(
    {
      [CANON_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [CANON_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [CANON_MAINTENANCE_ENTRYPOINT_ENV_V1]: null,
    },
    async () => {
      await assert.rejects(
        importFresh(REPRESENTATIVE_SCRIPT_PATH, 'missing-entrypoint'),
        /RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from backend\/maintenance\/run_canon_maintenance_v1\.mjs\./,
      );
    },
  );
});

test('canon maintenance defaults to dry run unless explicitly disabled', async () => {
  await withEnv(
    {
      [CANON_MAINTENANCE_DRY_RUN_ENV_V1]: null,
    },
    async () => {
      assert.equal(getCanonMaintenanceDryRun(), true);
    },
  );

  await withEnv(
    {
      [CANON_MAINTENANCE_DRY_RUN_ENV_V1]: 'false',
    },
    async () => {
      assert.equal(getCanonMaintenanceDryRun(), false);
    },
  );
});

test('guarded public writes are blocked unless explicit canon maintenance mode is enabled', async () => {
  let originalQueryCalls = 0;
  const guardedQuery = createCanonMaintenanceGuardedQueryV1(
    'canon_boundary_test',
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
      [CANON_MAINTENANCE_ENABLE_ENV_V1]: null,
      [CANON_MAINTENANCE_MODE_ENV_V1]: null,
      [CANON_MAINTENANCE_ENTRYPOINT_ENV_V1]: null,
    },
    async () => {
      await assert.rejects(
        guardedQuery('update public.card_prints set gv_id = $1', ['GV-TEST']),
        /RUNTIME_ENFORCEMENT: canon maintenance is disabled\./,
      );
      assert.equal(originalQueryCalls, 0);
    },
  );
});

test('guarded public writes stay dry-run by default and only write when explicitly enabled', async () => {
  let originalQueryCalls = 0;
  const guardedQuery = createCanonMaintenanceGuardedQueryV1(
    'canon_boundary_test',
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
      [CANON_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [CANON_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [CANON_MAINTENANCE_ENTRYPOINT_ENV_V1]: CANON_MAINTENANCE_ENTRYPOINT_V1,
      [CANON_MAINTENANCE_DRY_RUN_ENV_V1]: null,
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
      [CANON_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [CANON_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [CANON_MAINTENANCE_ENTRYPOINT_ENV_V1]: CANON_MAINTENANCE_ENTRYPOINT_V1,
      [CANON_MAINTENANCE_DRY_RUN_ENV_V1]: 'false',
    },
    async () => {
      const result = await guardedQuery('update public.card_prints set gv_id = $1', ['GV-TEST']);
      assert.equal(result.rowCount, 1);
      assert.equal(originalQueryCalls, 1);
    },
  );
});

test('canon maintenance entrypoint requires explicit task selection', async () => {
  await withEnv(
    {
      [CANON_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [CANON_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [CANON_MAINTENANCE_TASK_ENV_V1]: null,
    },
    async () => {
      await assert.rejects(
        runCanonMaintenanceV1(),
        /RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_TASK is required\./,
      );
    },
  );
});

test('canon maintenance entrypoint rejects unknown tasks before execution', async () => {
  await withEnv(
    {
      [CANON_MAINTENANCE_ENABLE_ENV_V1]: 'true',
      [CANON_MAINTENANCE_MODE_ENV_V1]: 'EXPLICIT',
      [CANON_MAINTENANCE_TASK_ENV_V1]: 'not-a-real-task',
    },
    async () => {
      await assert.rejects(
        runCanonMaintenanceV1(),
        /RUNTIME_ENFORCEMENT: unknown canon maintenance task "not-a-real-task"\./,
      );
    },
  );
});

test('all targeted canon maintenance scripts carry the boundary and env guards', async () => {
  for (const relativePath of CANON_MAINTENANCE_FILES_V1) {
    const source = await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8');
    assert.match(source, /CANON MAINTENANCE-ONLY EXECUTION BOUNDARY/);
    assert.match(source, /ENABLE_CANON_MAINTENANCE_MODE/);
    assert.match(source, /CANON_MAINTENANCE_MODE/);
  }
});
