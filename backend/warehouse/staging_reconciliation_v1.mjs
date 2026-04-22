import '../env.mjs';

import pg from 'pg';

import {
  IDENTITY_RESOLUTION_STATES,
  resolveIdentityResolutionV1,
} from '../identity/identity_resolution_v1.mjs';
import { executeAliasMappingWithinTransaction } from './promotion_executor_v1.mjs';

const { Pool } = pg;

const WORKER_NAME = 'staging_reconciliation_v1';
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

async function fetchLockedCandidate(client, candidateId) {
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
      for update
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

async function fetchLockedCurrentStaging(client, candidate) {
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
      for update
    `,
    [currentStagingId, candidate.id],
  );
  return rows[0] ?? null;
}

async function insertReconciliationEvent(client, {
  candidateId,
  stagingId = null,
  eventType,
  previousState,
  nextState,
  notes = null,
  metadata = {},
}) {
  await client.query(
    `
      insert into public.canon_warehouse_candidate_events (
        candidate_id,
        staging_id,
        event_type,
        action,
        previous_state,
        next_state,
        actor_user_id,
        actor_type,
        metadata,
        created_at
      )
      values ($1, $2, $3, 'RECONCILE', $4, $5, null, 'SYSTEM', $6::jsonb, now())
    `,
    [
      candidateId,
      stagingId,
      eventType,
      previousState,
      nextState,
      JSON.stringify({
        worker: WORKER_NAME,
        system_note: notes,
        ...metadata,
      }),
    ],
  );
}

async function invalidateCurrentStaging(client, candidate, currentStaging, identityResolution) {
  if (!currentStaging) {
    return { updated: false, stage: null };
  }

  const reason = buildInvalidReason(identityResolution);
  const attemptedAt = new Date().toISOString();
  const nextLastError = normalizeTextOrNull(currentStaging.last_error) === reason
    ? currentStaging.last_error
    : reason;

  const result = await client.query(
    `
      update public.canon_warehouse_promotion_staging
      set
        execution_status = 'FAILED',
        last_error = $3,
        last_attempted_at = $4
      where id = $1
        and candidate_id = $2
        and execution_status <> 'SUCCEEDED'
      returning
        id,
        candidate_id,
        approved_action_type,
        execution_status,
        execution_attempts,
        last_error,
        last_attempted_at,
        executed_at
    `,
    [currentStaging.id, candidate.id, nextLastError, attemptedAt],
  );

  return {
    updated: result.rowCount === 1,
    stage: result.rows[0] ?? {
      ...currentStaging,
      execution_status: 'FAILED',
      last_error: nextLastError,
      last_attempted_at: attemptedAt,
    },
  };
}

async function requeueCandidateForReview(client, candidate, identityResolution) {
  const reviewHoldReason = buildInvalidReason(identityResolution);
  const result = await client.query(
    `
      update public.canon_warehouse_candidates
      set
        state = 'REVIEW_READY',
        current_staging_id = null,
        current_review_hold_reason = $2
      where id = $1
        and state in ('APPROVED_BY_FOUNDER', 'STAGED_FOR_PROMOTION')
      returning id
    `,
    [candidate.id, reviewHoldReason],
  );

  return {
    updated: result.rowCount === 1,
    review_hold_reason: reviewHoldReason,
  };
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
    await connection.query('begin');
    try {
      const candidate = await fetchLockedCandidate(connection, candidateId);
      if (!candidate) {
        await connection.query('rollback');
        return { status: 'skipped', reason: 'candidate_not_found', candidate_id: candidateId };
      }

      let currentStaging = await fetchLockedCurrentStaging(connection, candidate);
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
        await connection.query('rollback');
        return { status: 'skipped', reason: 'identity_resolution_missing', ...summary };
      }

      if (candidate.state === 'PROMOTED' && BLOCKING_RESOLUTIONS.has(identityResolution)) {
        throw new Error(`promoted_candidate_invalid_after_identity_resolution:${candidate.id}:${identityResolution}`);
      }

      if (candidate.state === 'STAGED_FOR_PROMOTION' && !currentStaging) {
        throw new Error(`current_staging_missing:${candidate.id}`);
      }

      if (candidate.state === 'ARCHIVED' && identityResolution === IDENTITY_RESOLUTION_STATES.MAP_ALIAS) {
        await connection.query('rollback');
        return { status: 'skipped', reason: 'alias_already_archived', ...summary };
      }

      if (EXECUTABLE_RESOLUTIONS.has(identityResolution)) {
        await connection.query('rollback');
        return { status: 'skipped', reason: 'identity_resolution_stageable', ...summary };
      }

      if (opts.dryRun) {
        let dryRunReason = 'review_requeue_required';
        if (identityResolution === IDENTITY_RESOLUTION_STATES.MAP_ALIAS) {
          dryRunReason = 'alias_execution_required';
        }
        await connection.query('rollback');
        return {
          status: 'dry_run',
          reason: dryRunReason,
          ...summary,
        };
      }

      let invalidatedStage = null;
      if (candidate.state === 'STAGED_FOR_PROMOTION' && currentStaging) {
        const invalidation = await invalidateCurrentStaging(connection, candidate, currentStaging, identityResolution);
        invalidatedStage = invalidation.updated ? invalidation.stage : null;
        currentStaging = invalidation.stage ?? currentStaging;
      }

      if (identityResolution === IDENTITY_RESOLUTION_STATES.MAP_ALIAS) {
        const aliasResult = await executeAliasMappingWithinTransaction(connection, {
          candidate: {
            ...candidate,
            current_staging_id: currentStaging?.id ?? candidate.current_staging_id,
          },
          identityResolutionPackage: latestIdentityResolutionPackage ?? {
            identity_resolution: identityResolution,
            identity_audit_status: normalizeTextOrNull(candidate.identity_audit_status),
            identity_audit_reason_code: normalizeTextOrNull(candidate.identity_audit_reason_code),
            action_payload: null,
          },
          currentStaging,
        });

        await connection.query('commit');
        return {
          status: 'resolved_alias',
          reason: invalidatedStage ? 'staging_invalidated_and_alias_executed' : 'alias_executed',
          ...summary,
          invalidated_staging_id: invalidatedStage?.id ?? null,
          mapping_id: aliasResult.mapping_id ?? null,
        };
      }

      const requeue = await requeueCandidateForReview(connection, candidate, identityResolution);
      if (!requeue.updated) {
        await connection.query('rollback');
        return {
          status: 'skipped',
          reason: 'candidate_already_review_ready_or_terminal',
          ...summary,
        };
      }

      await insertReconciliationEvent(connection, {
        candidateId: candidate.id,
        stagingId: invalidatedStage?.id ?? currentStaging?.id ?? null,
        eventType: 'WAREHOUSE_STAGING_RECONCILED',
        previousState: candidate.state,
        nextState: 'REVIEW_READY',
        notes: requeue.review_hold_reason,
        metadata: {
          identity_resolution: identityResolution,
          invalidated_staging_id: invalidatedStage?.id ?? null,
        },
      });

      await connection.query('commit');
      return {
        status: 'requeued_review',
        reason: invalidatedStage ? 'staging_invalidated_and_requeued' : 'requeued_after_identity_resolution',
        ...summary,
        invalidated_staging_id: invalidatedStage?.id ?? null,
        review_hold_reason: requeue.review_hold_reason,
      };
    } catch (error) {
      await connection.query('rollback');
      throw error;
    }
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const before = await fetchCurrentStateCounts(pool);
    const candidateIds = opts.candidateId ? [opts.candidateId] : await fetchCandidateIds(pool, opts.limit);

    log('worker_start', {
      mode: opts.apply ? 'apply' : 'dry-run',
      requested_limit: opts.limit,
      candidate_id: opts.candidateId,
      candidate_count: candidateIds.length,
      before,
    });

    const results = [];
    for (const candidateId of candidateIds) {
      try {
        const result = await reconcileCandidate(pool, candidateId, opts);
        results.push(result);
        log('candidate_result', result);
      } catch (error) {
        const result = {
          status: 'failed',
          candidate_id: candidateId,
          reason: error.message,
        };
        results.push(result);
        log('candidate_failed', result);
      }
    }

    const after = await fetchCurrentStateCounts(pool);
    const invalidCurrentStagingCount = await fetchInvalidCurrentStagingCount(pool);
    const blockedRowsRemaining = await fetchBlockedRowsRemaining(pool);

    log('worker_complete', {
      mode: opts.apply ? 'apply' : 'dry-run',
      before,
      after,
      invalid_current_staging_count: invalidCurrentStagingCount,
      blocked_rows_remaining: blockedRowsRemaining,
      results,
    });
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('staging_reconciliation_v1.mjs')) {
  main().catch((error) => {
    log('fatal', { error: error.message });
    process.exit(1);
  });
}
