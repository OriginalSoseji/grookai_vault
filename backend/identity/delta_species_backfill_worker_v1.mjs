import '../env.mjs';

import pg from 'pg';

const { Client } = pg;

const WORKER_NAME = 'delta_species_backfill_worker_v1';
const MODIFIER = 'delta_species';
const CEL25_TARGET_ID = 'b4a42612-945d-419f-a4f4-c64ae5c26d6b';
const CEL25_SOURCE_ID = 'f7c22698-daa3-4412-84ef-436fb1fe130f';

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseArgs(argv) {
  const opts = {
    mode: 'dry-run',
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      opts.mode = 'dry-run';
      continue;
    }

    if (arg === '--apply') {
      opts.mode = 'apply';
    }
  }

  return opts;
}

async function queryOne(client, text, params = []) {
  const result = await client.query(text, params);
  return result.rows[0] ?? null;
}

async function queryRows(client, text, params = []) {
  const result = await client.query(text, params);
  return result.rows;
}

async function loadColumnStatus(client) {
  return queryOne(
    client,
    `
      select count(*)::int as row_count
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'card_prints'
        and column_name = 'printed_identity_modifier'
    `,
  );
}

async function loadGvIdChecksum(client) {
  return queryOne(
    client,
    `
      select md5(string_agg(id::text || ':' || coalesce(gv_id, ''), '|' order by id)) as checksum
      from public.card_prints
      where gv_id is not null
    `,
  );
}

async function loadFkOrphanCounts(client) {
  return queryOne(
    client,
    `
      select json_build_object(
        'card_print_identity', (select count(*)::int from public.card_print_identity where card_print_id not in (select id from public.card_prints)),
        'card_print_traits', (select count(*)::int from public.card_print_traits where card_print_id not in (select id from public.card_prints)),
        'card_printings', (select count(*)::int from public.card_printings where card_print_id not in (select id from public.card_prints)),
        'external_mappings', (select count(*)::int from public.external_mappings where card_print_id not in (select id from public.card_prints)),
        'vault_items', (select count(*)::int from public.vault_items where card_id not in (select id from public.card_prints))
      ) as counts
    `,
  );
}

async function loadUniquenessViolations(client) {
  return queryRows(
    client,
    `
      select
        set_id::text as set_id,
        number_plain,
        printed_identity_modifier,
        variant_key,
        count(*)::int as row_count
      from public.card_prints
      where set_id is not null
        and number_plain is not null
      group by set_id, number_plain, printed_identity_modifier, variant_key
      having count(*) > 1
      order by row_count desc, set_id, number_plain, printed_identity_modifier, variant_key
    `,
  );
}

async function loadCandidateRows(client) {
  return queryRows(
    client,
    `
      select
        id,
        set_code,
        name,
        number,
        number_plain,
        variant_key,
        gv_id,
        case
          when name like '%δ%' then 'delta_symbol'
          when lower(name) like '%delta species%' then 'delta_species_text'
          else 'other'
        end as proof_signal
      from public.card_prints
      where printed_identity_modifier is null
        and (
          name like '%δ%'
          or lower(name) like '%delta species%'
        )
      order by set_code nulls last, number_plain nulls last, id
    `,
  );
}

async function loadAlreadyBackfilledCount(client) {
  return queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_prints
      where printed_identity_modifier = $1
    `,
    [MODIFIER],
  );
}

async function loadCel25Status(client) {
  return queryOne(
    client,
    `
      select json_build_object(
        'target_modeled_count',
        (
          select count(*)::int
          from public.card_prints
          where id = $1
            and printed_identity_modifier = $3
            and variant_key = 'cc'
            and gv_id = 'GV-PK-CEL-93CC'
        ),
        'source_still_unresolved_count',
        (
          select count(*)::int
          from public.card_prints
          where id = $2
            and gv_id is null
        )
      ) as status
    `,
    [CEL25_TARGET_ID, CEL25_SOURCE_ID, MODIFIER],
  );
}

function assertColumnExists(columnStatus) {
  if ((columnStatus?.row_count ?? 0) !== 1) {
    throw new Error(`PRINTED_IDENTITY_MODIFIER_COLUMN_MISSING:${columnStatus?.row_count ?? 0}`);
  }
}

function assertFkIntegrity(orphanCounts) {
  const counts = orphanCounts?.counts ?? {};
  const offenders = Object.entries(counts).filter(([, value]) => Number(value) !== 0);
  if (offenders.length > 0) {
    throw new Error(`FK_INTEGRITY_FAILURE:${JSON.stringify(offenders)}`);
  }
}

function assertNoUniquenessViolations(violations) {
  if (violations.length > 0) {
    throw new Error(`UNIQUENESS_VIOLATIONS:${JSON.stringify(violations)}`);
  }
}

async function applyBackfill(client) {
  return client.query(
    `
      update public.card_prints
      set printed_identity_modifier = $1
      where printed_identity_modifier is null
        and (
          name like '%δ%'
          or lower(name) like '%delta species%'
        )
    `,
    [MODIFIER],
  );
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const opts = parseArgs(process.argv.slice(2));
  const report = {
    worker: WORKER_NAME,
    mode: opts.mode,
    generated_at: new Date().toISOString(),
    modifier: MODIFIER,
    column_status: null,
    gv_id_checksum_before: null,
    gv_id_checksum_after: null,
    delta_rows_already_set_before: 0,
    candidate_row_count: 0,
    candidate_rows_sample: [],
    rows_updated: 0,
    delta_rows_after: 0,
    uniqueness_violations: [],
    fk_orphan_counts: null,
    cel25_status: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `${WORKER_NAME}:${opts.mode}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    report.column_status = await loadColumnStatus(client);
    assertColumnExists(report.column_status);

    report.gv_id_checksum_before = await loadGvIdChecksum(client);
    const alreadySet = await loadAlreadyBackfilledCount(client);
    report.delta_rows_already_set_before = alreadySet?.row_count ?? 0;

    const candidateRows = await loadCandidateRows(client);
    report.candidate_row_count = candidateRows.length;
    report.candidate_rows_sample = candidateRows.slice(0, 10);

    if (opts.mode === 'apply') {
      const updateResult = await applyBackfill(client);
      report.rows_updated = updateResult.rowCount ?? 0;
      if (report.rows_updated !== report.candidate_row_count) {
        throw new Error(`UPDATED_ROW_COUNT_DRIFT:${report.rows_updated}:${report.candidate_row_count}`);
      }
    }

    const deltaRowsAfter = await loadAlreadyBackfilledCount(client);
    report.delta_rows_after = deltaRowsAfter?.row_count ?? 0;

    if (opts.mode === 'apply') {
      const expectedAfter = report.delta_rows_already_set_before + report.rows_updated;
      if (report.delta_rows_after !== expectedAfter) {
        throw new Error(`DELTA_ROWS_AFTER_DRIFT:${report.delta_rows_after}:${expectedAfter}`);
      }
    }

    report.uniqueness_violations = await loadUniquenessViolations(client);
    assertNoUniquenessViolations(report.uniqueness_violations);

    report.gv_id_checksum_after = await loadGvIdChecksum(client);
    if (report.gv_id_checksum_before?.checksum !== report.gv_id_checksum_after?.checksum) {
      throw new Error('GV_ID_CHECKSUM_CHANGED');
    }

    report.fk_orphan_counts = await loadFkOrphanCounts(client);
    assertFkIntegrity(report.fk_orphan_counts);

    report.cel25_status = await loadCel25Status(client);

    report.status = opts.mode === 'apply' ? 'apply_passed' : 'dry_run_passed';
    console.log(JSON.stringify(report, null, 2));

    if (opts.mode === 'apply') {
      await client.query('commit');
    } else {
      await client.query('rollback');
    }
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original failure.
    }

    report.status = 'failed';
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    console.error(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
