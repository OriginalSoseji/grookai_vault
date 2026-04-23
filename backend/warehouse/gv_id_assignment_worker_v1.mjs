import '../env.mjs';

import pg from 'pg';
import { buildCardPrintGvIdV1 } from './buildCardPrintGvIdV1.mjs';
import {
  assertExecuteCanonWriteV1,
} from '../lib/contracts/execute_canon_write_v1.mjs';

const { Pool } = pg;
const WORKER_NAME = 'gv_id_assignment_worker_v1';

function log(event, payload = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    worker: WORKER_NAME,
    event,
    ...payload,
  }));
}

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseArgs(argv) {
  const opts = {
    cardPrintId: null,
    limit: 25,
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
    if (arg.startsWith('--card-print-id=')) {
      opts.cardPrintId = normalizeTextOrNull(arg.slice('--card-print-id='.length));
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        opts.limit = parsed;
      }
    }
  }

  return opts;
}

async function fetchTargetRows(client, opts) {
  const params = [];
  let whereClause = `where cp.gv_id is null`;

  if (opts.cardPrintId) {
    params.push(opts.cardPrintId);
    whereClause += ` and cp.id = $${params.length}`;
  }

  params.push(opts.limit);

  const sql = `
    select
      cp.id,
      cp.gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.variant_key,
      s.printed_set_abbrev
    from public.card_prints cp
    left join public.sets s
      on s.id = cp.set_id
    ${whereClause}
    order by cp.created_at asc, cp.id asc
    limit $${params.length}
  `;

  const { rows } = await client.query(sql, params);
  return rows;
}

async function findConflictingRow(client, gvId, cardPrintId) {
  const sql = `
    select id, gv_id
    from public.card_prints
    where gv_id = $1
      and id <> $2
    limit 1
  `;
  const { rows } = await client.query(sql, [gvId, cardPrintId]);
  return rows[0] ?? null;
}

async function assignOne(client, row, apply) {
  let namespaceDecision = null;
  const plannedGvId = buildCardPrintGvIdV1({
    setCode: row.set_code,
    printedSetAbbrev: row.printed_set_abbrev,
    number: row.number,
    numberPlain: row.number_plain,
    variantKey: row.variant_key,
    onNamespaceDecision(decision) {
      namespaceDecision = decision;
    },
  });

  const conflictingRow = await findConflictingRow(client, plannedGvId, row.id);
  if (conflictingRow && !apply) {
    return {
      id: row.id,
      status: 'blocked',
      reason: 'gv_id_collision',
      planned_gv_id: plannedGvId,
      namespace_decision: namespaceDecision,
      conflicting_card_print_id: conflictingRow.id,
    };
  }

  const payloadSnapshot = {
    card_print_id: row.id,
    set_code: row.set_code,
    printed_set_abbrev: row.printed_set_abbrev,
    number: row.number,
    number_plain: row.number_plain,
    variant_key: row.variant_key,
    planned_gv_id: plannedGvId,
    namespace_decision: namespaceDecision,
    apply,
  };

  if (!apply) {
    return {
      id: row.id,
      status: 'dry_run',
      planned_gv_id: plannedGvId,
      namespace_decision: namespaceDecision,
    };
  }

  let updateResult = null;
  await assertExecuteCanonWriteV1({
    execution_name: 'gv_id_assignment_worker_v1',
    payload_snapshot: payloadSnapshot,
    write_target: client,
    audit_target: client,
    ledger_target: client,
    transaction_control: 'none',
    actor_type: 'system_worker',
    source_worker: WORKER_NAME,
    source_system: 'warehouse',
    contract_assertions: [
      {
        ok: Boolean(row.id),
        contract_name: 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
        violation_type: 'missing_card_print_id',
        reason: 'gv_id_assignment_worker_v1 requires a target card_print id.',
      },
      {
        ok: typeof plannedGvId === 'string' && plannedGvId.startsWith('GV-'),
        contract_name: 'GV_ID_ASSIGNMENT_V1',
        violation_type: 'invalid_gv_id_shape',
        reason: `gv_id_assignment_worker_v1 produced invalid gv_id ${plannedGvId}.`,
      },
      {
        ok: !conflictingRow,
        contract_name: 'GV_ID_ASSIGNMENT_V1',
        violation_type: 'gv_id_collision',
        reason: `gv_id ${plannedGvId} is already owned by ${conflictingRow?.id ?? 'another row'}.`,
      },
    ],
    proofs: [
      {
        name: 'gv_id_round_trip',
        contract_name: 'GV_ID_ASSIGNMENT_V1',
        violation_type: 'post_write_gv_id_missing',
        query: `
          select gv_id
          from public.card_prints
          where id = $1
          limit 1
        `,
        params: [row.id],
        evaluate(result) {
          const actualGvId = normalizeTextOrNull(result.rows[0]?.gv_id);
          return {
            ok: actualGvId === plannedGvId,
            reason: `gv_id_assignment_worker_v1 expected ${plannedGvId} on ${row.id}, found ${actualGvId ?? 'null'}.`,
          };
        },
      },
      {
        name: 'gv_id_uniqueness',
        contract_name: 'GV_ID_ASSIGNMENT_V1',
        violation_type: 'post_write_gv_id_duplicate',
        query: `
          select count(*)::int as duplicate_count
          from public.card_prints
          where gv_id = $1
        `,
        params: [plannedGvId],
        evaluate(result) {
          const duplicateCount = Number(result.rows[0]?.duplicate_count ?? 0);
          return {
            ok: duplicateCount === 1,
            reason: `gv_id_assignment_worker_v1 expected one owner for ${plannedGvId}, found ${duplicateCount}.`,
          };
        },
      },
    ],
    async write(connection) {
      updateResult = await connection.query(
        `
          update public.card_prints
          set gv_id = $2
          where id = $1
            and gv_id is null
          returning id, gv_id
        `,
        [row.id, plannedGvId],
      );
    },
  });

  if (!updateResult?.rows[0]) {
    const { rows } = await client.query(
      `select id, gv_id from public.card_prints where id = $1 limit 1`,
      [row.id],
    );
    const current = rows[0] ?? null;
    if (current?.gv_id === plannedGvId) {
      return {
        id: row.id,
        status: 'skipped',
        reason: 'already_assigned',
        gv_id: current.gv_id,
        namespace_decision: namespaceDecision,
      };
    }

    return {
      id: row.id,
      status: 'blocked',
      reason: 'assignment_update_failed',
      planned_gv_id: plannedGvId,
      namespace_decision: namespaceDecision,
    };
  }

  return {
    id: row.id,
    status: 'applied',
    gv_id: updateResult.rows[0].gv_id,
    namespace_decision: namespaceDecision,
  };
}

export async function runGvIdAssignmentWorkerV1(input = {}) {
  const opts = {
    cardPrintId: normalizeTextOrNull(input.cardPrintId),
    limit:
      Number.isFinite(Number(input.limit)) && Number(input.limit) > 0
        ? Math.trunc(Number(input.limit))
        : 25,
    dryRun: input.apply ? false : input.dryRun === false ? false : true,
    apply: Boolean(input.apply),
  };

  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const client = await pool.connect();
    try {
      const rows = await fetchTargetRows(client, opts);
      log('worker_start', {
        mode: opts.apply ? 'apply' : 'dry-run',
        card_print_id: opts.cardPrintId,
        row_count: rows.length,
        limit: opts.limit,
      });

      const results = [];
      for (const row of rows) {
        const result = await assignOne(client, row, opts.apply);
        results.push(result);
      }

      const summary = {
        mode: opts.apply ? 'apply' : 'dry-run',
        card_print_id: opts.cardPrintId,
        processed: results.length,
        results,
      };

      log('worker_complete', summary);
      return summary;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await runGvIdAssignmentWorkerV1(opts);
}

if (process.argv[1] && process.argv[1].includes('gv_id_assignment_worker_v1.mjs')) {
  main().catch((error) => {
    log('fatal', { error: error.message });
    process.exit(1);
  });
}
