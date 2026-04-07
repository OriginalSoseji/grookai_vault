import '../env.mjs';

import pg from 'pg';
import { buildCardPrintGvIdV1 } from './buildCardPrintGvIdV1.mjs';

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
  if (conflictingRow) {
    return {
      id: row.id,
      status: 'blocked',
      reason: 'gv_id_collision',
      planned_gv_id: plannedGvId,
      namespace_decision: namespaceDecision,
      conflicting_card_print_id: conflictingRow.id,
    };
  }

  if (!apply) {
    return {
      id: row.id,
      status: 'dry_run',
      planned_gv_id: plannedGvId,
      namespace_decision: namespaceDecision,
    };
  }

  const updateResult = await client.query(
    `
      update public.card_prints
      set gv_id = $2
      where id = $1
        and gv_id is null
      returning id, gv_id
    `,
    [row.id, plannedGvId],
  );

  if (!updateResult.rows[0]) {
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
