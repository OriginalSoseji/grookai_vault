/**
 * CONTRACT_RUNTIME_ENFORCEMENT_GUARD
 * This file previously bypassed canon runtime.
 * Direct canon writes are now forbidden.
 * Any write must go through execute_canon_write_v1 or be blocked.
 */

import '../env.mjs';

import pg from 'pg';

import {
  IDENTITY_RESOLUTION_STATES,
  resolveIdentityResolutionV1,
} from '../identity/identity_resolution_v1.mjs';

const { Pool } = pg;

const WORKER_NAME = 'staging_reconciliation_v1';
const RUNTIME_SAFE_ENV_FLAG = 'ENABLE_STAGING_RECONCILIATION_RUNTIME_SAFE';
const RUNTIME_DISABLED_ERROR =
  'RUNTIME_ENFORCEMENT: staging_reconciliation_v1 is disabled until fully runtime-compliant.';
const RUNTIME_BLOCKED_WRITE_ERROR =
  'RUNTIME_ENFORCEMENT: staging_reconciliation_v1 direct canon mutation is blocked. Route through execute_canon_write_v1 or refactor.';

const BLOCKING_RESOLUTIONS = new Set([
  IDENTITY_RESOLUTION_STATES.MAP_ALIAS,
  IDENTITY_RESOLUTION_STATES.BLOCK_REVIEW_REQUIRED,
  IDENTITY_RESOLUTION_STATES.BLOCK_AMBIGUOUS,
]);
const EXECUTABLE_RESOLUTIONS = new Set([
  IDENTITY_RESOLUTION_STATES.PROMOTE_NEW,
  IDENTITY_RESOLUTION_STATES.PROMOTE_VARIANT,
  IDENTITY_RESOLUTION_STATES.ATTACH_PRINTING,
]);

export const DIRECT_WRITE_CALLS = [
  'insertReconciliationEvent @ original lines 199-228',
  'invalidateCurrentStaging @ original lines 239-281',
  'requeueCandidateForReview @ original lines 284-302',
];

export const WRITE_INTENT_CLASSIFICATION = {
  executeAliasMappingWithinTransaction: 'alias_mapping_related',
  insertReconciliationEvent: 'reconciliation_event_log',
  invalidateCurrentStaging: 'staging_state_mutation',
  requeueCandidateForReview: 'candidate_state_mutation',
};

function log(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), worker: WORKER_NAME, event, ...payload }));
}

function parseArgs(argv) {
  const opts = {
    limit: 100,
    candidateId: null,
    dryRun: true,
    apply: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      opts.dryRun = true;
      opts.apply = false;
      continue;
    }
    if (arg === '--apply') {
      opts.apply = true;
      opts.dryRun = false;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        opts.limit = parsed;
      }
      continue;
    }
    if (arg.startsWith('--candidate-id=')) {
      const value = arg.slice('--candidate-id='.length).trim();
      if (value) {
        opts.candidateId = value;
      }
    }
  }

  return opts;
}

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function getLatestEventPackage(events, key) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const metadata = asRecord(events[index]?.metadata);
    const value = asRecord(metadata?.[key]);
    if (!value) continue;
    return {
      event_type: events[index].event_type,
      created_at: events[index].created_at,
      value,
    };
  }
  return null;
}

function buildInvalidReason(identityResolution) {
  return `invalid_after_identity_resolution:${normalizeTextOrNull(identityResolution) ?? 'UNKNOWN'}`;
}

function isRuntimeSafeEnabled() {
  return process.env[RUNTIME_SAFE_ENV_FLAG] === 'true';
}

function createRuntimeEnforcementError(message, details = {}) {
  const error = new Error(message);
  error.name = 'RuntimeEnforcementError';
  Object.assign(error, details);
  return error;
}

export function assertStagingReconciliationRuntimeEnabled() {
  if (!isRuntimeSafeEnabled()) {
    throw createRuntimeEnforcementError(RUNTIME_DISABLED_ERROR, {
      worker: WORKER_NAME,
      env_flag: RUNTIME_SAFE_ENV_FLAG,
    });
  }
}

export function assertDirectMutationBlockedV1(intentName, details = {}) {
  const classification = WRITE_INTENT_CLASSIFICATION[intentName] ?? 'other';
  throw createRuntimeEnforcementError(
    `${RUNTIME_BLOCKED_WRITE_ERROR} intent=${intentName} classification=${classification}`,
    {
      worker: WORKER_NAME,
      intent_name: intentName,
      classification,
      ...details,
    },
  );
}

function buildBlockedApplyError({ candidate, currentStaging, identityResolution }) {
  const intentNames = [];

  if (candidate?.state === 'STAGED_FOR_PROMOTION' && currentStaging) {
    intentNames.push('invalidateCurrentStaging');
  }

  if (identityResolution === IDENTITY_RESOLUTION_STATES.MAP_ALIAS) {
    intentNames.push('executeAliasMappingWithinTransaction');
  } else {
    intentNames.push('requeueCandidateForReview', 'insertReconciliationEvent');
  }

  const uniqueIntentNames = [...new Set(intentNames)];

  return createRuntimeEnforcementError(
    `${RUNTIME_BLOCKED_WRITE_ERROR} candidate_id=${candidate?.id ?? 'unknown'} intents=${uniqueIntentNames.join(',')}`,
    {
      worker: WORKER_NAME,
      candidate_id: candidate?.id ?? null,
      identity_resolution: identityResolution,
      intent_names: uniqueIntentNames,
      intent_classifications: uniqueIntentNames.map((intentName) => ({
        intent_name: intentName,
        classification: WRITE_INTENT_CLASSIFICATION[intentName] ?? 'other',
      })),
    },
  );
}

async function fetchCandidateIds(client, limit) {
  const { rows } = await client.query(
    `
      select id
      from public.canon_warehouse_candidates
      order by created_at asc, id asc
      limit $1
    `,
    [limit],
  );
  return rows.map((row) => row.id);
}

async function fetchCurrentStateCounts(client) {
  const candidateCounts = await client.query(
    `
      select state, count(*)::int as count
      from public.canon_warehouse_candidates
      group by state
      order by state
    `,
  );
  const stagingCounts = await client.query(
    `
      select count(*)::int as total_staging_rows
      from public.canon_warehouse_promotion_staging
    `,
  );
  return {
    candidate_state_counts: candidateCounts.rows,
    total_staging_rows: stagingCounts.rows[0]?.total_staging_rows ?? 0,
  };
}

async function fetchCandidate(client, candidateId) {
  const { rows } = await client.query(
    `
      select
        id,
        state,
        current_staging_id,
        current_review_hold_reason,
        founder_approved_by_user_id,
        founder_approved_at,
        identity_audit_status,
        identity_audit_reason_code,
        identity_resolution,
        claimed_identity_payload,
        reference_hints_payload
      from public.canon_warehouse_candidates
      where id = $1
    `,
    [candidateId],
  );
  return rows[0] ?? null;
}

async function fetchCandidateEvents(client, candidateId) {
  const { rows } = await client.query(
    `
      select
        id,
        event_type,
        action,
        previous_state,
        next_state,
        metadata,
        created_at
      from public.canon_warehouse_candidate_events
      where candidate_id = $1
      order by created_at asc, id asc
    `,
    [candidateId],
  );
  return rows;
}

async function fetchCurrentStaging(client, candidate) {
  const currentStagingId = normalizeTextOrNull(candidate?.current_staging_id);
  if (!currentStagingId) {
    return null;
  }

  const { rows } = await client.query(
    `
      select
        id,
        candidate_id,
        approved_action_type,
        execution_status,
        execution_attempts,
        last_error,
        last_attempted_at,
        executed_at
      from public.canon_warehouse_promotion_staging
      where id = $1
        and candidate_id = $2
    `,
    [currentStagingId, candidate.id],
  );
  return rows[0] ?? null;
}

export async function insertReconciliationEvent() {
  assertDirectMutationBlockedV1('insertReconciliationEvent');
}

export async function invalidateCurrentStaging() {
  assertDirectMutationBlockedV1('invalidateCurrentStaging');
}

export async function requeueCandidateForReview() {
  assertDirectMutationBlockedV1('requeueCandidateForReview');
}

function summarizeCandidate(candidate, currentStaging) {
  return {
    candidate_id: candidate.id,
    state: candidate.state,
    identity_audit_status: normalizeTextOrNull(candidate.identity_audit_status),
    identity_resolution: normalizeTextOrNull(candidate.identity_resolution),
    current_staging_id: normalizeTextOrNull(candidate.current_staging_id),
    current_staging_status: normalizeTextOrNull(currentStaging?.execution_status),
  };
}

async function reconcileCandidate(pool, candidateId, opts) {
  const connection = await pool.connect();
  try {
    const candidate = await fetchCandidate(connection, candidateId);
    if (!candidate) {
      return { status: 'skipped', reason: 'candidate_not_found', candidate_id: candidateId };
    }

    const currentStaging = await fetchCurrentStaging(connection, candidate);
    const eventRows = await fetchCandidateEvents(connection, candidateId);
    const latestClassificationPackage = getLatestEventPackage(eventRows, 'classification_package')?.value ?? null;
    const latestIdentityAuditPackage = getLatestEventPackage(eventRows, 'identity_audit_package')?.value ?? null;
    const latestIdentityResolutionPackage =
      asRecord(latestClassificationPackage?.identity_resolution_package) ??
      (latestIdentityAuditPackage || latestClassificationPackage
        ? resolveIdentityResolutionV1({
            candidate,
            classificationPackage: latestClassificationPackage,
            identityAuditPackage: latestIdentityAuditPackage,
          })
        : null);
    const identityResolution =
      normalizeTextOrNull(candidate.identity_resolution) ??
      normalizeTextOrNull(latestIdentityResolutionPackage?.identity_resolution) ??
      normalizeTextOrNull(latestClassificationPackage?.identity_resolution);
    const summary = summarizeCandidate(candidate, currentStaging);

    if (!identityResolution) {
      return { status: 'skipped', reason: 'identity_resolution_missing', ...summary };
    }

    if (candidate.state === 'PROMOTED' && BLOCKING_RESOLUTIONS.has(identityResolution)) {
      throw new Error(`promoted_candidate_invalid_after_identity_resolution:${candidate.id}:${identityResolution}`);
    }

    if (candidate.state === 'STAGED_FOR_PROMOTION' && !currentStaging) {
      throw new Error(`current_staging_missing:${candidate.id}`);
    }

    if (candidate.state === 'ARCHIVED' && identityResolution === IDENTITY_RESOLUTION_STATES.MAP_ALIAS) {
      return { status: 'skipped', reason: 'alias_already_archived', ...summary };
    }

    if (EXECUTABLE_RESOLUTIONS.has(identityResolution)) {
      return { status: 'skipped', reason: 'identity_resolution_stageable', ...summary };
    }

    if (opts.dryRun) {
      return {
        status: 'dry_run',
        reason:
          identityResolution === IDENTITY_RESOLUTION_STATES.MAP_ALIAS
            ? 'alias_execution_required'
            : 'review_requeue_required',
        ...summary,
      };
    }

    throw buildBlockedApplyError({
      candidate,
      currentStaging,
      identityResolution,
    });
  } finally {
    connection.release();
  }
}

async function fetchInvalidCurrentStagingCount(client) {
  const { rows } = await client.query(
    `
      select count(*)::int as count
      from public.canon_warehouse_promotion_staging s
      join public.canon_warehouse_candidates c
        on c.current_staging_id = s.id
      where c.state = 'STAGED_FOR_PROMOTION'
        and coalesce(c.identity_resolution, '') not in ('PROMOTE_NEW', 'PROMOTE_VARIANT', 'ATTACH_PRINTING')
    `,
  );
  return rows[0]?.count ?? 0;
}

async function fetchBlockedRowsRemaining(client) {
  const { rows } = await client.query(
    `
      select count(*)::int as count
      from public.canon_warehouse_candidates
      where identity_resolution in ('BLOCK_REVIEW_REQUIRED', 'BLOCK_AMBIGUOUS')
    `,
  );
  return rows[0]?.count ?? 0;
}

function normalizeRunOptions(input = {}) {
  const limitValue = Number(input.limit);
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.trunc(limitValue) : 100;
  const candidateId = normalizeTextOrNull(input.candidateId);
  const apply = Boolean(input.apply) || input.dryRun === false;
  const dryRun = apply ? false : true;

  return {
    limit,
    candidateId,
    dryRun,
    apply,
    emitLogs: input.emitLogs !== false,
  };
}

export async function runStagingReconciliationV1(input = {}) {
  assertStagingReconciliationRuntimeEnabled();

  const opts = normalizeRunOptions(input);
  if (opts.apply) {
    throw createRuntimeEnforcementError(
      `${RUNTIME_BLOCKED_WRITE_ERROR} enablement_flag_present=true worker_mode=apply`,
      {
        worker: WORKER_NAME,
        env_flag: RUNTIME_SAFE_ENV_FLAG,
      },
    );
  }

  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const before = await fetchCurrentStateCounts(pool);
    const candidateIds = opts.candidateId ? [opts.candidateId] : await fetchCandidateIds(pool, opts.limit);

    if (opts.emitLogs) {
      log('worker_start', {
        mode: opts.apply ? 'apply' : 'dry-run',
        requested_limit: opts.limit,
        candidate_id: opts.candidateId,
        candidate_count: candidateIds.length,
        before,
      });
    }

    const results = [];
    for (const candidateId of candidateIds) {
      try {
        const result = await reconcileCandidate(pool, candidateId, opts);
        results.push(result);
        if (opts.emitLogs) {
          log('candidate_result', result);
        }
      } catch (error) {
        const result = {
          status: 'failed',
          candidate_id: candidateId,
          reason: error.message,
        };
        results.push(result);
        if (opts.emitLogs) {
          log('candidate_failed', result);
        }
      }
    }

    const after = await fetchCurrentStateCounts(pool);
    const invalidCurrentStagingCount = await fetchInvalidCurrentStagingCount(pool);
    const blockedRowsRemaining = await fetchBlockedRowsRemaining(pool);

    const summary = {
      mode: opts.apply ? 'apply' : 'dry-run',
      before,
      after,
      invalid_current_staging_count: invalidCurrentStagingCount,
      blocked_rows_remaining: blockedRowsRemaining,
      results,
    };

    if (opts.emitLogs) {
      log('worker_complete', summary);
    }

    return summary;
  } finally {
    await pool.end();
  }
}

export const runStagingReconciliation = runStagingReconciliationV1;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await runStagingReconciliationV1(opts);
}

if (process.argv[1] && process.argv[1].includes('staging_reconciliation_v1.mjs')) {
  main().catch((error) => {
    log('fatal', { error: error.message });
    process.exit(1);
  });
}
