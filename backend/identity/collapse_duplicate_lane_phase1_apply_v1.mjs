import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'collapse_duplicate_lane_phase1_apply_v1.json',
);

const BACKUP_SCHEMA_PATH = path.join(
  process.cwd(),
  'backups',
  'collapse_phase1_preapply_schema.sql',
);

const BACKUP_DATA_PATH = path.join(
  process.cwd(),
  'backups',
  'collapse_phase1_preapply_data.sql',
);

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const BATCH_SIZE = 1000;
const COLLAPSE_MAP_TABLE = 'public.collapse_map_phase1';
const SUPPORTED_REFERENCE_TABLES = new Set([
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
]);

const EXPECTED = {
  strictReadyCollapseMapCount: 7131,
  strictAmbiguousOldCount: 0,
  strictReusedNewCount: 0,
  stillUnmatchedOldCount: 3405,
};

function ensureReportDir() {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
}

function writeReport(report) {
  ensureReportDir();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

function assertBackupExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`BACKUP_MISSING:${filePath}`);
  }
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function queryJsonObject(client, sql) {
  const { rows } = await client.query(sql);
  return rows[0]?.result ?? null;
}

async function buildTempCollapseMapSurface(client) {
  const sql = `
    drop table if exists tmp_collapse_phase1_excluded_sets;
    drop table if exists tmp_collapse_phase1_old_lane;
    drop table if exists tmp_collapse_phase1_canonical_lane;
    drop table if exists tmp_collapse_phase1_candidate_matches;
    drop table if exists tmp_collapse_phase1_old_match_counts;
    drop table if exists tmp_collapse_phase1_new_match_counts;
    drop table if exists tmp_collapse_phase1_ready_map;
    drop table if exists tmp_collapse_phase1_ambiguous_old;
    drop table if exists tmp_collapse_phase1_reused_new;
    drop table if exists tmp_collapse_phase1_digits_name_only;
    drop table if exists tmp_collapse_phase1_unmatched_old;
    drop table if exists tmp_collapse_phase1_batch;

    create temp table tmp_collapse_phase1_excluded_sets (
      set_code_identity text primary key
    ) on commit preserve rows;

    insert into tmp_collapse_phase1_excluded_sets (set_code_identity)
    values ('cel25');

    create temp table tmp_collapse_phase1_old_lane on commit preserve rows as
    select
      cp.id as old_card_print_id,
      cpi.identity_domain,
      cpi.set_code_identity,
      cpi.printed_number,
      cpi.normalized_printed_name,
      cp.name as old_name_raw,
      cp.gv_id as old_gv_id
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = 'pokemon_eng_standard'
      and cp.gv_id is null
      and cpi.set_code_identity is not null
      and cpi.printed_number is not null
      and cpi.normalized_printed_name is not null
      and not exists (
        select 1
        from tmp_collapse_phase1_excluded_sets excluded
        where excluded.set_code_identity = cpi.set_code_identity
      );

    create index tmp_collapse_phase1_old_lane_identity_idx
      on tmp_collapse_phase1_old_lane (set_code_identity, printed_number, normalized_printed_name);

    create temp table tmp_collapse_phase1_canonical_lane on commit preserve rows as
    select
      cp.id as new_card_print_id,
      cp.gv_id,
      cp.set_code as set_code_identity,
      cp.number as printed_number,
      cp.number_plain,
      lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_printed_name,
      cp.name as new_name_raw
    from public.card_prints cp
    where cp.gv_id is not null
      and cp.set_code is not null
      and cp.number is not null
      and cp.name is not null
      and not exists (
        select 1
        from tmp_collapse_phase1_excluded_sets excluded
        where excluded.set_code_identity = cp.set_code
      );

    create index tmp_collapse_phase1_canonical_lane_identity_idx
      on tmp_collapse_phase1_canonical_lane (set_code_identity, printed_number, normalized_printed_name);

    create index tmp_collapse_phase1_canonical_lane_number_plain_idx
      on tmp_collapse_phase1_canonical_lane (set_code_identity, number_plain, normalized_printed_name);

    create temp table tmp_collapse_phase1_candidate_matches on commit preserve rows as
    select
      old_lane.old_card_print_id,
      canonical_lane.new_card_print_id,
      old_lane.identity_domain,
      old_lane.set_code_identity,
      old_lane.printed_number,
      old_lane.normalized_printed_name,
      old_lane.old_name_raw,
      canonical_lane.new_name_raw,
      canonical_lane.gv_id
    from tmp_collapse_phase1_old_lane old_lane
    join tmp_collapse_phase1_canonical_lane canonical_lane
      on canonical_lane.set_code_identity = old_lane.set_code_identity
     and canonical_lane.printed_number = old_lane.printed_number
     and canonical_lane.normalized_printed_name = old_lane.normalized_printed_name;

    create temp table tmp_collapse_phase1_old_match_counts on commit preserve rows as
    select
      old_card_print_id,
      count(*)::int as match_count
    from tmp_collapse_phase1_candidate_matches
    group by old_card_print_id;

    create temp table tmp_collapse_phase1_new_match_counts on commit preserve rows as
    select
      new_card_print_id,
      count(*)::int as match_count
    from tmp_collapse_phase1_candidate_matches
    group by new_card_print_id;

    create temp table tmp_collapse_phase1_ready_map on commit preserve rows as
    select
      candidate.old_card_print_id,
      candidate.new_card_print_id,
      candidate.identity_domain,
      candidate.set_code_identity,
      candidate.printed_number,
      candidate.normalized_printed_name,
      candidate.old_name_raw,
      candidate.new_name_raw,
      candidate.gv_id
    from tmp_collapse_phase1_candidate_matches candidate
    join tmp_collapse_phase1_old_match_counts old_counts
      on old_counts.old_card_print_id = candidate.old_card_print_id
    join tmp_collapse_phase1_new_match_counts new_counts
      on new_counts.new_card_print_id = candidate.new_card_print_id
    where old_counts.match_count = 1
      and new_counts.match_count = 1;

    create unique index tmp_collapse_phase1_ready_map_old_uidx
      on tmp_collapse_phase1_ready_map (old_card_print_id);

    create unique index tmp_collapse_phase1_ready_map_new_uidx
      on tmp_collapse_phase1_ready_map (new_card_print_id);

    create temp table tmp_collapse_phase1_ambiguous_old on commit preserve rows as
    select
      candidate.old_card_print_id,
      candidate.identity_domain,
      candidate.set_code_identity,
      candidate.printed_number,
      candidate.normalized_printed_name,
      count(*)::int as candidate_count
    from tmp_collapse_phase1_candidate_matches candidate
    group by
      candidate.old_card_print_id,
      candidate.identity_domain,
      candidate.set_code_identity,
      candidate.printed_number,
      candidate.normalized_printed_name
    having count(*) > 1;

    create temp table tmp_collapse_phase1_reused_new on commit preserve rows as
    select
      candidate.new_card_print_id,
      candidate.gv_id,
      candidate.set_code_identity,
      candidate.printed_number,
      candidate.normalized_printed_name,
      count(*)::int as candidate_count
    from tmp_collapse_phase1_candidate_matches candidate
    group by
      candidate.new_card_print_id,
      candidate.gv_id,
      candidate.set_code_identity,
      candidate.printed_number,
      candidate.normalized_printed_name
    having count(*) > 1;

    create temp table tmp_collapse_phase1_digits_name_only on commit preserve rows as
    select distinct
      old_lane.old_card_print_id,
      canonical_lane.new_card_print_id,
      old_lane.set_code_identity,
      old_lane.printed_number as old_printed_number,
      canonical_lane.printed_number as canonical_printed_number,
      canonical_lane.number_plain as canonical_number_plain,
      old_lane.normalized_printed_name,
      canonical_lane.gv_id
    from tmp_collapse_phase1_old_lane old_lane
    join tmp_collapse_phase1_canonical_lane canonical_lane
      on canonical_lane.set_code_identity = old_lane.set_code_identity
     and canonical_lane.number_plain = nullif(regexp_replace(old_lane.printed_number, '[^0-9]', '', 'g'), '')
     and canonical_lane.normalized_printed_name = old_lane.normalized_printed_name
    where not exists (
      select 1
      from tmp_collapse_phase1_ready_map ready
      where ready.old_card_print_id = old_lane.old_card_print_id
    );

    create temp table tmp_collapse_phase1_unmatched_old on commit preserve rows as
    select
      old_lane.old_card_print_id,
      old_lane.identity_domain,
      old_lane.set_code_identity,
      old_lane.printed_number,
      old_lane.normalized_printed_name,
      old_lane.old_name_raw
    from tmp_collapse_phase1_old_lane old_lane
    where not exists (
      select 1
      from tmp_collapse_phase1_ready_map ready
      where ready.old_card_print_id = old_lane.old_card_print_id
    );

    create temp table tmp_collapse_phase1_batch (
      old_id uuid primary key,
      new_id uuid not null
    ) on commit preserve rows;
  `;

  await client.query(sql);
}

async function loadPreconditionSummary(client) {
  const sql = `
    select json_build_object(
      'strict_old_lane_count', (select count(*)::int from tmp_collapse_phase1_old_lane),
      'strict_ready_collapse_map_count', (select count(*)::int from tmp_collapse_phase1_ready_map),
      'strict_ambiguous_old_count', (select count(*)::int from tmp_collapse_phase1_ambiguous_old),
      'strict_reused_new_count', (select count(*)::int from tmp_collapse_phase1_reused_new),
      'digits_name_only_row_count', (select count(*)::int from tmp_collapse_phase1_digits_name_only),
      'digits_name_only_distinct_old_count', (select count(distinct old_card_print_id)::int from tmp_collapse_phase1_digits_name_only),
      'still_unmatched_old_count', (
        select count(*)::int
        from tmp_collapse_phase1_unmatched_old unmatched
        where not exists (
          select 1
          from tmp_collapse_phase1_digits_name_only near_match
          where near_match.old_card_print_id = unmatched.old_card_print_id
        )
      ),
      'excluded_cel25_count', (
        select count(*)::int
        from public.card_print_identity cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = 'pokemon_eng_standard'
          and cp.gv_id is null
          and cpi.set_code_identity = 'cel25'
      )
    ) as result
  `;

  return queryJsonObject(client, sql);
}

function assertPreconditions(summary) {
  if (Number(summary?.strict_ready_collapse_map_count ?? -1) !== EXPECTED.strictReadyCollapseMapCount) {
    throw new Error(
      `PRECONDITION_FAILED:STRICT_READY_COLLAPSE_MAP_COUNT:${summary?.strict_ready_collapse_map_count ?? 'null'}`,
    );
  }

  if (Number(summary?.strict_ambiguous_old_count ?? -1) !== EXPECTED.strictAmbiguousOldCount) {
    throw new Error(
      `PRECONDITION_FAILED:STRICT_AMBIGUOUS_OLD_COUNT:${summary?.strict_ambiguous_old_count ?? 'null'}`,
    );
  }

  if (Number(summary?.strict_reused_new_count ?? -1) !== EXPECTED.strictReusedNewCount) {
    throw new Error(
      `PRECONDITION_FAILED:STRICT_REUSED_NEW_COUNT:${summary?.strict_reused_new_count ?? 'null'}`,
    );
  }

  if (Number(summary?.still_unmatched_old_count ?? -1) !== EXPECTED.stillUnmatchedOldCount) {
    throw new Error(
      `PRECONDITION_FAILED:STILL_UNMATCHED_OLD_COUNT:${summary?.still_unmatched_old_count ?? 'null'}`,
    );
  }
}

async function ensurePersistentCollapseMap(client) {
  await client.query(`
    create table if not exists ${COLLAPSE_MAP_TABLE} (
      old_id uuid primary key,
      new_id uuid not null
    )
  `);

  const compareSql = `
    select json_build_object(
      'existing_count', (select count(*)::int from ${COLLAPSE_MAP_TABLE}),
      'distinct_old_count', (select count(distinct old_id)::int from ${COLLAPSE_MAP_TABLE}),
      'distinct_new_count', (select count(distinct new_id)::int from ${COLLAPSE_MAP_TABLE}),
      'extra_rows', (
        select count(*)::int
        from (
          select old_id, new_id from ${COLLAPSE_MAP_TABLE}
          except
          select old_card_print_id as old_id, new_card_print_id as new_id
          from tmp_collapse_phase1_ready_map
        ) diff
      ),
      'missing_rows', (
        select count(*)::int
        from (
          select old_card_print_id as old_id, new_card_print_id as new_id
          from tmp_collapse_phase1_ready_map
          except
          select old_id, new_id from ${COLLAPSE_MAP_TABLE}
        ) diff
      )
    ) as result
  `;

  let compare = await queryJsonObject(client, compareSql);

  if (Number(compare?.existing_count ?? 0) === 0) {
    await client.query(`
      insert into ${COLLAPSE_MAP_TABLE} (old_id, new_id)
      select old_card_print_id, new_card_print_id
      from tmp_collapse_phase1_ready_map
      order by old_card_print_id
    `);

    compare = await queryJsonObject(client, compareSql);
  }

  const expectedCount = EXPECTED.strictReadyCollapseMapCount;
  if (
    Number(compare?.existing_count ?? -1) !== expectedCount ||
    Number(compare?.distinct_old_count ?? -1) !== expectedCount ||
    Number(compare?.distinct_new_count ?? -1) !== expectedCount ||
    Number(compare?.extra_rows ?? -1) !== 0 ||
    Number(compare?.missing_rows ?? -1) !== 0
  ) {
    throw new Error(`COLLAPSE_MAP_TABLE_MISMATCH:${JSON.stringify(compare)}`);
  }

  return compare;
}

async function loadCardPrintFkInventory(client) {
  const sql = `
    select distinct
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    join pg_class frel on frel.oid = c.confrelid
    join pg_namespace fn on fn.oid = frel.relnamespace
    join unnest(c.conkey) with ordinality as k(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
    where c.contype = 'f'
      and n.nspname = 'public'
      and fn.nspname = 'public'
      and frel.relname = 'card_prints'
    order by rel.relname, att.attname
  `;

  const { rows } = await client.query(sql);
  return rows;
}

async function loadFkCounts(client, fkInventory, sourceClause) {
  const results = [];

  for (const fk of fkInventory) {
    const sql = `
      select count(*)::int as row_count
      from public.${quoteIdent(fk.table_name)}
      where ${quoteIdent(fk.column_name)} in (${sourceClause})
    `;

    const { rows } = await client.query(sql);
    results.push({
      table_name: fk.table_name,
      column_name: fk.column_name,
      row_count: Number(rows[0]?.row_count ?? 0),
      supported_handler: SUPPORTED_REFERENCE_TABLES.has(`${fk.table_name}.${fk.column_name}`),
    });
  }

  return results;
}

function assertNoUnexpectedReferencedTables(fkCounts) {
  const unexpected = fkCounts.filter((entry) => entry.row_count > 0 && !entry.supported_handler);
  if (unexpected.length > 0) {
    throw new Error(`UNSUPPORTED_REFERENCING_TABLES:${JSON.stringify(unexpected)}`);
  }
}

async function loadGlobalCollisionSummary(client) {
  const sql = `
    with collapse_map as (
      select old_id, new_id from ${COLLAPSE_MAP_TABLE}
    )
    select json_build_object(
      'external_mappings_conflicts', (
        select count(*)::int
        from public.external_mappings old_em
        join collapse_map m on m.old_id = old_em.card_print_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      ),
      'card_print_traits_conflicts', (
        select count(*)::int
        from public.card_print_traits old_t
        join collapse_map m on m.old_id = old_t.card_print_id
        join public.card_print_traits new_t
          on new_t.card_print_id = m.new_id
         and new_t.trait_type is not distinct from old_t.trait_type
         and new_t.trait_value is not distinct from old_t.trait_value
         and new_t.source is not distinct from old_t.source
      ),
      'card_printings_finish_key_conflicts', (
        select count(*)::int
        from public.card_printings old_p
        join collapse_map m on m.old_id = old_p.card_print_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
        where old_p.finish_key is not null
      ),
      'card_print_identity_active_target_rows', (
        select count(*)::int
        from public.card_print_identity new_i
        join collapse_map m on m.new_id = new_i.card_print_id
        where new_i.is_active = true
      ),
      'card_print_identity_any_target_rows', (
        select count(*)::int
        from public.card_print_identity new_i
        join collapse_map m on m.new_id = new_i.card_print_id
      )
    ) as result
  `;

  return queryJsonObject(client, sql);
}

async function loadBatchSummary(client) {
  const sql = `
    select json_build_object(
      'batch_size', (select count(*)::int from tmp_collapse_phase1_batch),
      'card_print_identity_rows', (
        select count(*)::int from public.card_print_identity
        where card_print_id in (select old_id from tmp_collapse_phase1_batch)
      ),
      'card_print_traits_rows', (
        select count(*)::int from public.card_print_traits
        where card_print_id in (select old_id from tmp_collapse_phase1_batch)
      ),
      'card_printings_rows', (
        select count(*)::int from public.card_printings
        where card_print_id in (select old_id from tmp_collapse_phase1_batch)
      ),
      'external_mappings_rows', (
        select count(*)::int from public.external_mappings
        where card_print_id in (select old_id from tmp_collapse_phase1_batch)
      ),
      'batch_old_parent_rows', (
        select count(*)::int from public.card_prints
        where id in (select old_id from tmp_collapse_phase1_batch)
      )
    ) as result
  `;

  return queryJsonObject(client, sql);
}

async function loadPostValidation(client, fkInventory) {
  const remainingOldReferences = await loadFkCounts(
    client,
    fkInventory,
    `select old_id from ${COLLAPSE_MAP_TABLE}`,
  );

  const sql = `
    select json_build_object(
      'remaining_old_parent_rows', (
        select count(*)::int
        from public.card_prints
        where id in (select old_id from ${COLLAPSE_MAP_TABLE})
      ),
      'remaining_new_parent_rows', (
        select count(*)::int
        from public.card_prints
        where id in (select new_id from ${COLLAPSE_MAP_TABLE})
      ),
      'active_identity_total_count', (
        select count(*)::int
        from public.card_print_identity
        where is_active = true
      ),
      'active_identity_on_gvid_parents_count', (
        select count(*)::int
        from public.card_print_identity cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = 'pokemon_eng_standard'
          and cp.gv_id is not null
      ),
      'active_identity_on_null_gvid_parents_count', (
        select count(*)::int
        from public.card_print_identity cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = 'pokemon_eng_standard'
          and cp.gv_id is null
      )
    ) as result
  `;

  const summary = await queryJsonObject(client, sql);
  return {
    summary,
    remaining_old_references: remainingOldReferences,
  };
}

async function loadRouteReachabilitySummary(client) {
  const sql = `
    select json_build_object(
      'active_identity_rows', (
        select count(*)::int
        from public.card_print_identity
        where is_active = true
          and identity_domain = 'pokemon_eng_standard'
      ),
      'active_identity_with_gvid_count', (
        select count(*)::int
        from public.card_print_identity cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = 'pokemon_eng_standard'
          and cp.gv_id is not null
      )
    ) as result
  `;

  return queryJsonObject(client, sql);
}

async function prepareBatch(client) {
  await client.query('truncate table tmp_collapse_phase1_batch');

  await client.query(
    `
      insert into tmp_collapse_phase1_batch (old_id, new_id)
      select cm.old_id, cm.new_id
      from ${COLLAPSE_MAP_TABLE} cm
      join public.card_prints cp_old on cp_old.id = cm.old_id
      order by cm.old_id
      limit $1
    `,
    [BATCH_SIZE],
  );

  const { rows } = await client.query(
    `select count(*)::int as batch_size from tmp_collapse_phase1_batch`,
  );

  return Number(rows[0]?.batch_size ?? 0);
}

async function applyBatch(client, fkInventory, batchNumber) {
  await client.query('begin');

  try {
    const batchSize = await prepareBatch(client);
    if (batchSize === 0) {
      await client.query('rollback');
      return null;
    }

    const preCounts = await loadBatchSummary(client);
    const batchFkCounts = await loadFkCounts(
      client,
      fkInventory,
      'select old_id from tmp_collapse_phase1_batch',
    );

    assertNoUnexpectedReferencedTables(batchFkCounts);

    const deletedDuplicatePrintings = await client.query(`
      delete from public.card_printings old_p
      using tmp_collapse_phase1_batch batch
      where old_p.card_print_id = batch.old_id
        and old_p.finish_key is not null
        and exists (
          select 1
          from public.card_printings new_p
          where new_p.card_print_id = batch.new_id
            and new_p.finish_key = old_p.finish_key
        )
    `);

    const updatedPrintings = await client.query(`
      update public.card_printings p
      set card_print_id = batch.new_id
      from tmp_collapse_phase1_batch batch
      where p.card_print_id = batch.old_id
    `);

    const updatedTraits = await client.query(`
      update public.card_print_traits t
      set card_print_id = batch.new_id
      from tmp_collapse_phase1_batch batch
      where t.card_print_id = batch.old_id
    `);

    const updatedExternalMappings = await client.query(`
      update public.external_mappings m
      set card_print_id = batch.new_id
      from tmp_collapse_phase1_batch batch
      where m.card_print_id = batch.old_id
    `);

    const updatedIdentity = await client.query(`
      update public.card_print_identity i
      set card_print_id = batch.new_id
      from tmp_collapse_phase1_batch batch
      where i.card_print_id = batch.old_id
    `);

    const remainingFkRefs = await loadFkCounts(
      client,
      fkInventory,
      'select old_id from tmp_collapse_phase1_batch',
    );

    const nonZeroRemaining = remainingFkRefs.filter((entry) => entry.row_count > 0);
    if (nonZeroRemaining.length > 0) {
      throw new Error(`BATCH_REMAINING_FK_REFERENCES:${JSON.stringify(nonZeroRemaining)}`);
    }

    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using tmp_collapse_phase1_batch batch
      where cp.id = batch.old_id
    `);

    const { rows: parentCheckRows } = await client.query(`
      select count(*)::int as remaining_old_parents
      from public.card_prints
      where id in (select old_id from tmp_collapse_phase1_batch)
    `);

    const remainingOldParents = Number(parentCheckRows[0]?.remaining_old_parents ?? 0);
    if (remainingOldParents !== 0) {
      throw new Error(`BATCH_PARENT_DELETE_FAILED:${remainingOldParents}`);
    }

    await client.query('commit');

    return {
      batch_number: batchNumber,
      batch_size: batchSize,
      pre_counts: preCounts,
      fk_counts_before: batchFkCounts,
      operations: {
        deleted_duplicate_printings: deletedDuplicatePrintings.rowCount ?? 0,
        updated_printings: updatedPrintings.rowCount ?? 0,
        updated_traits: updatedTraits.rowCount ?? 0,
        updated_external_mappings: updatedExternalMappings.rowCount ?? 0,
        updated_identity_rows: updatedIdentity.rowCount ?? 0,
        deleted_parent_rows: deletedParents.rowCount ?? 0,
      },
      remaining_old_fk_references_after_batch: remainingFkRefs,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function run() {
  assertBackupExists(BACKUP_SCHEMA_PATH);
  assertBackupExists(BACKUP_DATA_PATH);

  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: MODE,
    batch_size: BATCH_SIZE,
    backup_gate: {
      schema_dump_path: BACKUP_SCHEMA_PATH,
      schema_dump_exists: true,
      data_dump_path: BACKUP_DATA_PATH,
      data_dump_exists: true,
    },
    preconditions: null,
    collapse_map_table: null,
    fk_inventory_snapshot: null,
    global_collision_summary: null,
    batches: [],
    post_validation: null,
    route_reachability_after_apply: null,
    status: 'running',
    first_failure: null,
  };

  writeReport(report);

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `collapse_duplicate_lane_phase1_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await buildTempCollapseMapSurface(client);

    const preconditions = await loadPreconditionSummary(client);
    report.preconditions = preconditions;
    assertPreconditions(preconditions);
    writeReport(report);

    const collapseMapTable = await ensurePersistentCollapseMap(client);
    report.collapse_map_table = collapseMapTable;
    writeReport(report);

    const fkInventory = await loadCardPrintFkInventory(client);
    const fkCounts = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from ${COLLAPSE_MAP_TABLE}`,
    );
    report.fk_inventory_snapshot = fkCounts;
    assertNoUnexpectedReferencedTables(fkCounts);
    writeReport(report);

    const globalCollisionSummary = await loadGlobalCollisionSummary(client);
    report.global_collision_summary = globalCollisionSummary;

    if (Number(globalCollisionSummary?.external_mappings_conflicts ?? -1) !== 0) {
      throw new Error(
        `PRECONDITION_FAILED:EXTERNAL_MAPPINGS_CONFLICTS:${globalCollisionSummary.external_mappings_conflicts}`,
      );
    }
    if (Number(globalCollisionSummary?.card_print_traits_conflicts ?? -1) !== 0) {
      throw new Error(
        `PRECONDITION_FAILED:CARD_PRINT_TRAITS_CONFLICTS:${globalCollisionSummary.card_print_traits_conflicts}`,
      );
    }
    if (Number(globalCollisionSummary?.card_print_identity_active_target_rows ?? -1) !== 0) {
      throw new Error(
        `PRECONDITION_FAILED:CARD_PRINT_IDENTITY_ACTIVE_TARGET_ROWS:${globalCollisionSummary.card_print_identity_active_target_rows}`,
      );
    }
    if (Number(globalCollisionSummary?.card_print_identity_any_target_rows ?? -1) !== 0) {
      throw new Error(
        `PRECONDITION_FAILED:CARD_PRINT_IDENTITY_ANY_TARGET_ROWS:${globalCollisionSummary.card_print_identity_any_target_rows}`,
      );
    }

    writeReport(report);

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      writeReport(report);
      return;
    }

    let batchNumber = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batchResult = await applyBatch(client, fkInventory, batchNumber);
      if (!batchResult) {
        break;
      }

      report.batches.push(batchResult);
      writeReport(report);
      batchNumber += 1;
    }

    report.post_validation = await loadPostValidation(client, fkInventory);
    report.route_reachability_after_apply = await loadRouteReachabilitySummary(client);

    const lingeringReferences = report.post_validation.remaining_old_references.filter(
      (entry) => entry.row_count > 0,
    );
    if (lingeringReferences.length > 0) {
      throw new Error(`POST_VALIDATION_REMAINING_REFERENCES:${JSON.stringify(lingeringReferences)}`);
    }

    if (Number(report.post_validation.summary?.remaining_old_parent_rows ?? -1) !== 0) {
      throw new Error(
        `POST_VALIDATION_REMAINING_OLD_PARENTS:${report.post_validation.summary.remaining_old_parent_rows}`,
      );
    }

    report.status = 'apply_passed';
    writeReport(report);
  } catch (error) {
    report.status = 'failed';
    report.first_failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    writeReport(report);
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
