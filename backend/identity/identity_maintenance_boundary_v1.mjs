import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

export const IDENTITY_MAINTENANCE_ENTRYPOINT_V1 = 'backend/identity/run_identity_maintenance_v1.mjs';
export const IDENTITY_MAINTENANCE_ENABLE_ENV_V1 = 'ENABLE_IDENTITY_MAINTENANCE_MODE';
export const IDENTITY_MAINTENANCE_MODE_ENV_V1 = 'IDENTITY_MAINTENANCE_MODE';
export const IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1 = 'IDENTITY_MAINTENANCE_DRY_RUN';
export const IDENTITY_MAINTENANCE_TASK_ENV_V1 = 'IDENTITY_MAINTENANCE_TASK';
export const IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1 = 'IDENTITY_MAINTENANCE_ENTRYPOINT';

const PATCHED_QUERY_SYMBOL = Symbol.for('grookai.identityMaintenanceBoundary.queryPatched');

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

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

export function getIdentityMaintenanceDryRunV1() {
  return process.env[IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1] !== 'false';
}

export function assertMaintenanceWriteAllowed() {
  if (process.env[IDENTITY_MAINTENANCE_ENABLE_ENV_V1] !== 'true') {
    throw new Error(
      'RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled. Set ENABLE_IDENTITY_MAINTENANCE_MODE=true for explicit use.',
    );
  }
  if (process.env[IDENTITY_MAINTENANCE_MODE_ENV_V1] !== 'EXPLICIT') {
    throw new Error(
      "RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'",
    );
  }
  if (process.env[IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1] !== IDENTITY_MAINTENANCE_ENTRYPOINT_V1) {
    throw new Error(
      `RUNTIME_ENFORCEMENT: identity maintenance scripts must be launched via ${IDENTITY_MAINTENANCE_ENTRYPOINT_V1}.`,
    );
  }
}

export function isPublicMutationQueryV1(sql) {
  return /\b(insert\s+into|update|delete\s+from|alter\s+table|truncate\s+table|drop\s+table|create\s+table)\s+public\./i.test(
    String(sql ?? ''),
  );
}

export function createIdentityMaintenanceGuardedQueryV1(scriptName, originalQuery) {
  return async function guardedIdentityMaintenanceQuery(...args) {
    const sql = inferQueryText(args);

    if (isPublicMutationQueryV1(sql)) {
      assertMaintenanceWriteAllowed();

      if (getIdentityMaintenanceDryRunV1()) {
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
  prototype.query = createIdentityMaintenanceGuardedQueryV1(scriptName, originalQuery);
  prototype[PATCHED_QUERY_SYMBOL] = true;
}

export function installIdentityMaintenanceBoundaryV1(scriptUrl) {
  const scriptPath = fileURLToPath(scriptUrl);
  const scriptName = path.basename(scriptPath);

  patchQueryPrototype(pg.Client?.prototype, scriptName);
  patchQueryPrototype(pg.Pool?.prototype, scriptName);

  return {
    DRY_RUN: getIdentityMaintenanceDryRunV1(),
    assertMaintenanceWriteAllowed,
  };
}
