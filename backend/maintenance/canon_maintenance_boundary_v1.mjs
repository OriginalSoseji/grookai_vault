import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

export const CANON_MAINTENANCE_ENTRYPOINT_V1 = 'backend/maintenance/run_canon_maintenance_v1.mjs';
export const CANON_MAINTENANCE_ENABLE_ENV_V1 = 'ENABLE_CANON_MAINTENANCE_MODE';
export const CANON_MAINTENANCE_MODE_ENV_V1 = 'CANON_MAINTENANCE_MODE';
export const CANON_MAINTENANCE_DRY_RUN_ENV_V1 = 'CANON_MAINTENANCE_DRY_RUN';
export const CANON_MAINTENANCE_TASK_ENV_V1 = 'CANON_MAINTENANCE_TASK';
export const CANON_MAINTENANCE_ENTRYPOINT_ENV_V1 = 'CANON_MAINTENANCE_ENTRYPOINT';

const PATCHED_QUERY_SYMBOL = Symbol.for('grookai.canonMaintenanceBoundary.queryPatched');

function inferQueryText(args) {
  const queryCandidate = args[0];
  if (typeof queryCandidate === 'string') {
    return queryCandidate;
  }
  if (queryCandidate && typeof queryCandidate.text === 'string') {
    return queryCandidate.text;
  }
  return '';
}

function inferQueryCommand(sql) {
  const normalized = String(sql ?? '').trim().toLowerCase();
  if (normalized.includes('insert into public.')) return 'INSERT';
  if (normalized.includes('update public.')) return 'UPDATE';
  if (normalized.includes('delete from public.')) return 'DELETE';
  if (normalized.includes('alter table public.')) return 'ALTER';
  if (normalized.includes('truncate table public.')) return 'TRUNCATE';
  if (normalized.includes('drop table public.')) return 'DROP';
  if (normalized.includes('create table public.')) return 'CREATE';
  return 'UNKNOWN';
}

function summarizeSql(sql) {
  return String(sql ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

export function getCanonMaintenanceDryRun() {
  return process.env[CANON_MAINTENANCE_DRY_RUN_ENV_V1] !== 'false';
}

export function assertCanonMaintenanceAllowed() {
  if (process.env[CANON_MAINTENANCE_ENABLE_ENV_V1] !== 'true') {
    throw new Error(
      'RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.',
    );
  }

  if (process.env[CANON_MAINTENANCE_MODE_ENV_V1] !== 'EXPLICIT') {
    throw new Error(
      "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
    );
  }

  if (process.env[CANON_MAINTENANCE_ENTRYPOINT_ENV_V1] !== CANON_MAINTENANCE_ENTRYPOINT_V1) {
    throw new Error(
      `RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from ${CANON_MAINTENANCE_ENTRYPOINT_V1}.`,
    );
  }
}

export function assertCanonMaintenanceWriteAllowed() {
  assertCanonMaintenanceAllowed();
}

export function isPublicMutationQueryV1(sql) {
  return /\b(insert\s+into|update|delete\s+from|alter\s+table|truncate\s+table|drop\s+table|create\s+table)\s+public\./i.test(
    String(sql ?? ''),
  );
}

export function createCanonMaintenanceGuardedQueryV1(scriptName, originalQuery) {
  return async function guardedCanonMaintenanceQuery(...args) {
    const sql = inferQueryText(args);

    if (isPublicMutationQueryV1(sql)) {
      assertCanonMaintenanceWriteAllowed();

      if (getCanonMaintenanceDryRun()) {
        console.log(
          `[DRY RUN] would execute: ${scriptName} :: ${inferQueryCommand(sql)} :: ${summarizeSql(sql)}`,
        );
        return {
          command: inferQueryCommand(sql),
          rowCount: 0,
          rows: [],
          fields: [],
        };
      }
    }

    return originalQuery.apply(this, args);
  };
}

function patchQueryPrototype(prototype, scriptName) {
  if (!prototype || typeof prototype.query !== 'function' || prototype[PATCHED_QUERY_SYMBOL]) {
    return;
  }

  const originalQuery = prototype.query;
  prototype.query = createCanonMaintenanceGuardedQueryV1(scriptName, originalQuery);
  prototype[PATCHED_QUERY_SYMBOL] = true;
}

export function installCanonMaintenanceBoundaryV1(scriptUrl) {
  const scriptPath = fileURLToPath(scriptUrl);
  const scriptName = path.basename(scriptPath);

  patchQueryPrototype(pg.Client?.prototype, scriptName);
  patchQueryPrototype(pg.Pool?.prototype, scriptName);

  return {
    DRY_RUN: getCanonMaintenanceDryRun(),
    assertCanonMaintenanceWriteAllowed,
  };
}
