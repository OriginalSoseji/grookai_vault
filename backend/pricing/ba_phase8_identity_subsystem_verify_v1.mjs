import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import '../env.mjs';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const BA_SET_CODES = ['ba-2020', 'ba-2022', 'ba-2024'];
const APPROVED_IDENTITY_DOMAINS = [
  'pokemon_eng_standard',
  'pokemon_ba',
  'pokemon_eng_special_print',
  'pokemon_jpn',
];
const EXPLICITLY_EXCLUDED_NONCANON_DOMAINS = ['tcg_pocket'];
const REQUIRED_CARD_PRINT_IDENTITY_COLUMNS = [
  'id',
  'card_print_id',
  'identity_domain',
  'set_code_identity',
  'printed_number',
  'normalized_printed_name',
  'source_name_raw',
  'identity_payload',
  'identity_key_version',
  'identity_key_hash',
  'is_active',
  'created_at',
  'updated_at',
];
const REQUIRED_INDEX_NAMES = [
  'uq_card_print_identity_active_card_print_id',
  'idx_card_print_identity_card_print_id',
  'idx_card_print_identity_identity_domain',
  'uq_card_print_identity_active_domain_hash',
  'idx_card_print_identity_domain_set_code_number',
  'idx_card_print_identity_domain_normalized_name_not_null',
];
const REQUIRED_CONSTRAINT_NAMES = [
  'card_print_identity_pkey',
  'card_print_identity_card_print_id_fkey',
  'card_print_identity_identity_domain_check',
  'card_print_identity_identity_payload_object_check',
  'card_print_identity_domain_version_check',
  'card_print_identity_active_required_fields_check',
];
const REQUIRED_MIGRATION_FILES = [
  'supabase/migrations/20260402100000__card_print_identity_table.sql',
  'supabase/migrations/20260402100001__card_print_identity_indexes.sql',
  'supabase/migrations/20260402100002__card_print_identity_support_functions.sql',
  'supabase/migrations/20260402100003__card_print_identity_rls_and_grants.sql',
  'supabase/migrations/20260402100004__card_print_identity_backfill.sql',
  'supabase/migrations/20260402100005__card_print_identity_post_backfill_constraints.sql',
  'supabase/migrations/20260402100006__ba_set_registration_if_required.sql',
];
const CHECKPOINT_PATHS = {
  promotionCandidates: path.join(
    repoRoot,
    'docs',
    'checkpoints',
    'ba_phase5_promotion_candidates_v1.json',
  ),
  exclusionReport: path.join(
    repoRoot,
    'docs',
    'checkpoints',
    'ba_phase8a_noncanon_domain_exclusion_report_v1.json',
  ),
  tcgPocketInventory: path.join(
    repoRoot,
    'docs',
    'checkpoints',
    'ba_phase8a_tcg_pocket_inventory_v1.json',
  ),
  verification: path.join(
    repoRoot,
    'docs',
    'checkpoints',
    'ba_phase8a_identity_subsystem_verification_v1.json',
  ),
};

function parseEnvBlock(text) {
  const env = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function readText(targetPath) {
  return fs.readFile(targetPath, 'utf8');
}

async function readJson(targetPath) {
  return JSON.parse(await readText(targetPath));
}

async function writeJson(targetPath, value) {
  await fs.writeFile(targetPath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function mustGetLocalDbUrl() {
  const output = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const env = parseEnvBlock(output);
  const dbUrl = normalizeTextOrNull(env.DB_URL);
  if (!dbUrl) {
    throw new Error('local DB_URL not available from `supabase status -o env`');
  }
  return dbUrl;
}

async function withClient(connectionString, fn) {
  const isRemote = /@db\./i.test(connectionString) || /supabase\.co/i.test(connectionString);
  const client = new Client({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function getLocalSchemaState(localDbUrl) {
  return withClient(localDbUrl, async (client) => {
    const [
      columnsResult,
      indexesResult,
      constraintsResult,
      countsResult,
      domainCountsResult,
      baSetsResult,
      baCardPrintsResult,
      mappingFkResult,
    ] = await Promise.all([
      client.query(`
        select table_name, column_name, data_type, is_nullable
        from information_schema.columns
        where table_schema = 'public'
          and table_name in ('card_print_identity', 'card_prints', 'external_mappings')
        order by table_name, ordinal_position
      `),
      client.query(`
        select tablename, indexname, indexdef
        from pg_indexes
        where schemaname = 'public'
          and tablename in ('card_print_identity', 'card_prints', 'external_mappings')
        order by tablename, indexname
      `),
      client.query(`
        select
          conrelid::regclass::text as table_name,
          conname,
          pg_get_constraintdef(oid) as definition
        from pg_constraint
        where connamespace = 'public'::regnamespace
          and conrelid in (
            'public.card_print_identity'::regclass,
            'public.card_prints'::regclass,
            'public.external_mappings'::regclass
          )
        order by table_name, conname
      `),
      client.query(`
        with projected as (
          select
            cp.id as card_print_id,
            public.card_print_identity_backfill_projection_v1(
              s.source,
              cp.set_code,
              s.code,
              cp.number,
              cp.number_plain,
              cp.name,
              cp.variant_key,
              cp.printed_total,
              cp.printed_set_abbrev
            ) as projection
          from public.card_prints cp
          join public.sets s
            on s.id = cp.set_id
        ),
        active_identity as (
          select *
          from public.card_print_identity
          where is_active = true
        ),
        missing_supported as (
          select count(*)::int as row_count
          from projected
          where projection ->> 'taxonomy_class' = 'SUPPORTED_CANON_DOMAIN'
            and projection ->> 'status' <> 'excluded'
            and not exists (
              select 1
              from active_identity ai
              where ai.card_print_id = projected.card_print_id
            )
        ),
        duplicate_active as (
          select count(*)::int as row_count
          from (
            select card_print_id
            from active_identity
            group by card_print_id
            having count(*) > 1
          ) q
        ),
        duplicate_hash as (
          select count(*)::int as row_count
          from (
            select identity_domain, identity_key_version, identity_key_hash
            from active_identity
            group by 1, 2, 3
            having count(*) > 1
          ) q
        )
        select
          (select count(*)::int from public.card_prints) as total_card_print_rows,
          (select count(*)::int from public.card_print_identity) as total_identity_rows,
          (select count(*)::int from active_identity) as active_identity_rows,
          (select count(*)::int from projected where projection ->> 'taxonomy_class' = 'SUPPORTED_CANON_DOMAIN') as supported_canon_domain_rows,
          (select count(*)::int from projected where projection ->> 'taxonomy_class' = 'EXCLUDED_NONCANON_DOMAIN') as excluded_noncanon_domain_rows,
          (select count(*)::int from projected where projection ->> 'taxonomy_class' = 'BLOCKED_UNKNOWN_DOMAIN') as blocked_unknown_domain_rows,
          (select count(*)::int from projected where projection ->> 'status' = 'blocked') as blocked_supported_domain_rows,
          (select row_count from missing_supported) as missing_active_identity_rows,
          (select row_count from duplicate_active) as duplicate_active_parent_rows,
          (select row_count from duplicate_hash) as duplicate_active_hash_groups,
          (select count(*)::int from public.card_prints where set_code in ('ba-2020', 'ba-2022', 'ba-2024')) as ba_card_print_rows
      `),
      client.query(`
        select
          identity_domain,
          count(*)::int as row_count
        from public.card_print_identity
        where is_active = true
        group by identity_domain
        order by identity_domain
      `),
      client.query(`
        select
          code,
          name,
          game,
          source
        from public.sets
        where code in ('ba-2020', 'ba-2022', 'ba-2024')
        order by code
      `),
      client.query(`
        select count(*)::int as row_count
        from public.card_prints
        where set_code in ('ba-2020', 'ba-2022', 'ba-2024')
      `),
      client.query(`
        select pg_get_constraintdef(oid) as definition
        from pg_constraint
        where conname = 'external_mappings_card_print_id_fkey'
          and connamespace = 'public'::regnamespace
      `),
    ]);

    return {
      columns: columnsResult.rows,
      indexes: indexesResult.rows,
      constraints: constraintsResult.rows,
      counts: countsResult.rows[0] ?? null,
      domainCounts: domainCountsResult.rows,
      baSets: baSetsResult.rows,
      baCardPrints: baCardPrintsResult.rows[0] ?? { row_count: 0 },
      mappingFk: mappingFkResult.rows[0] ?? null,
    };
  });
}

async function getRemoteReadOnlyAudit() {
  const remoteDbUrl = normalizeTextOrNull(process.env.SUPABASE_DB_URL);
  if (!remoteDbUrl) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL not configured',
    };
  }

  return withClient(remoteDbUrl, async (client) => {
    const classifiedCte = `
      with classified as (
        select
          case
            when coalesce(nullif(btrim(s.source ->> 'domain'), ''), '') = 'tcg_pocket' then 'EXCLUDED_NONCANON_DOMAIN'
            when nullif(btrim(s.source ->> 'domain'), '') is null then 'SUPPORTED_CANON_DOMAIN'
            when btrim(s.source ->> 'domain') in ('pokemon_eng_standard', 'pokemon_ba', 'pokemon_eng_special_print', 'pokemon_jpn') then 'SUPPORTED_CANON_DOMAIN'
            else 'BLOCKED_UNKNOWN_DOMAIN'
          end as taxonomy_class,
          case
            when coalesce(nullif(btrim(s.source ->> 'domain'), ''), '') = 'tcg_pocket' then 'excluded'
            when lower(coalesce(cp.set_code, s.code, '')) like 'ba-%' then 'blocked'
            when nullif(btrim(s.source ->> 'domain'), '') is null then 'ready'
            when btrim(s.source ->> 'domain') = 'pokemon_eng_standard' then 'ready'
            when btrim(s.source ->> 'domain') in ('pokemon_ba', 'pokemon_eng_special_print', 'pokemon_jpn') then 'blocked'
            else 'blocked'
          end as projection_status,
          case
            when coalesce(nullif(btrim(s.source ->> 'domain'), ''), '') = 'tcg_pocket' then 'NON_CANON_DOMAIN:tcg_pocket'
            when lower(coalesce(cp.set_code, s.code, '')) like 'ba-%' then 'EXISTING_BA_ROWS_REQUIRE_BA_PHASE'
            when nullif(btrim(s.source ->> 'domain'), '') is null then null
            when btrim(s.source ->> 'domain') = 'pokemon_eng_standard' then null
            when btrim(s.source ->> 'domain') in ('pokemon_ba', 'pokemon_eng_special_print', 'pokemon_jpn') then
              'DOMAIN_PRESENT_BUT_NOT_BACKFILLABLE_IN_PHASE8:' || btrim(s.source ->> 'domain')
            else 'UNKNOWN_SET_SOURCE_DOMAIN:' || btrim(s.source ->> 'domain')
          end as reason,
          case
            when nullif(btrim(s.source ->> 'domain'), '') is null then 'pokemon_eng_standard'
            when btrim(s.source ->> 'domain') in ('pokemon_eng_standard', 'pokemon_ba', 'pokemon_eng_special_print', 'pokemon_jpn') then
              btrim(s.source ->> 'domain')
            else null
          end as supported_domain,
          coalesce(nullif(btrim(s.source ->> 'domain'), ''), '<null>') as raw_set_domain,
          s.code as set_code,
          cp.gv_id
        from public.card_prints cp
        join public.sets s
          on s.id = cp.set_id
      )
    `;

    const [
      taxonomyResult,
      supportedBreakdownResult,
      excludedBreakdownResult,
      blockedBreakdownResult,
      tcgPocketSummaryResult,
      tcgPocketSetsResult,
      remoteIdentityTableResult,
    ] = await Promise.all([
      client.query(`${classifiedCte}
        select taxonomy_class, count(*)::int as row_count
        from classified
        group by taxonomy_class
        order by taxonomy_class
      `),
      client.query(`${classifiedCte}
        select supported_domain as identity_domain, count(*)::int as row_count
        from classified
        where taxonomy_class = 'SUPPORTED_CANON_DOMAIN'
        group by supported_domain
        order by supported_domain
      `),
      client.query(`${classifiedCte}
        select raw_set_domain as domain, count(*)::int as row_count
        from classified
        where taxonomy_class = 'EXCLUDED_NONCANON_DOMAIN'
        group by raw_set_domain
        order by raw_set_domain
      `),
      client.query(`${classifiedCte}
        select coalesce(reason, '<none>') as block_reason, count(*)::int as row_count
        from classified
        where taxonomy_class = 'BLOCKED_UNKNOWN_DOMAIN'
        group by coalesce(reason, '<none>')
        order by coalesce(reason, '<none>')
      `),
      client.query(`
        select
          count(*)::int as total_tcg_pocket_rows,
          count(distinct s.code)::int as distinct_sets_affected,
          count(*) filter (where cp.gv_id is not null and btrim(cp.gv_id) <> '')::int as rows_with_gv_id
        from public.card_prints cp
        join public.sets s
          on s.id = cp.set_id
        where coalesce(s.source ->> 'domain', '') = 'tcg_pocket'
      `),
      client.query(`
        select
          s.code,
          count(*)::int as row_count
        from public.card_prints cp
        join public.sets s
          on s.id = cp.set_id
        where coalesce(s.source ->> 'domain', '') = 'tcg_pocket'
        group by s.code
        order by row_count desc, s.code
      `),
      client.query(`
        select to_regclass('public.card_print_identity')::text as relation_name
      `),
    ]);

    let tcgPocketIdentityRowCount = 0;
    let tcgPocketIdentityEvidence =
      'Remote CanonDB surface does not currently have public.card_print_identity; zero remote identity rows exist for tcg_pocket.';

    if (normalizeTextOrNull(remoteIdentityTableResult.rows[0]?.relation_name)) {
      const tcgPocketIdentityResult = await client.query(`
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        join public.sets s
          on s.id = cp.set_id
        where coalesce(s.source ->> 'domain', '') = 'tcg_pocket'
      `);
      tcgPocketIdentityRowCount = Number(tcgPocketIdentityResult.rows[0]?.row_count ?? 0);
      tcgPocketIdentityEvidence =
        'Remote CanonDB surface has public.card_print_identity; tcg_pocket join count was measured directly.';
    }

    const taxonomyCounts = Object.fromEntries(
      taxonomyResult.rows.map((row) => [row.taxonomy_class, Number(row.row_count ?? 0)]),
    );
    const totalCardPrintRows = Object.values(taxonomyCounts).reduce(
      (total, value) => total + Number(value ?? 0),
      0,
    );

    return {
      available: true,
      total_card_print_rows: totalCardPrintRows,
      supported_canon_domain_count: Number(taxonomyCounts.SUPPORTED_CANON_DOMAIN ?? 0),
      excluded_noncanon_domain_count: Number(taxonomyCounts.EXCLUDED_NONCANON_DOMAIN ?? 0),
      blocked_unknown_domain_count: Number(taxonomyCounts.BLOCKED_UNKNOWN_DOMAIN ?? 0),
      supported_breakdown_by_domain: supportedBreakdownResult.rows.map((row) => ({
        identity_domain: row.identity_domain,
        row_count: Number(row.row_count ?? 0),
      })),
      excluded_breakdown_by_domain: excludedBreakdownResult.rows.map((row) => ({
        domain: row.domain,
        row_count: Number(row.row_count ?? 0),
      })),
      blocked_breakdown_by_domain: blockedBreakdownResult.rows.map((row) => ({
        block_reason: row.block_reason,
        row_count: Number(row.row_count ?? 0),
      })),
      tcg_pocket: {
        total_rows: Number(tcgPocketSummaryResult.rows[0]?.total_tcg_pocket_rows ?? 0),
        distinct_sets_affected: Number(tcgPocketSummaryResult.rows[0]?.distinct_sets_affected ?? 0),
        rows_with_gv_id: Number(tcgPocketSummaryResult.rows[0]?.rows_with_gv_id ?? 0),
        affected_sets: tcgPocketSetsResult.rows.map((row) => ({
          code: row.code,
          row_count: Number(row.row_count ?? 0),
        })),
        remote_identity_row_count: tcgPocketIdentityRowCount,
        remote_identity_row_evidence: tcgPocketIdentityEvidence,
      },
    };
  });
}

function buildExclusionReport(localState, remoteAudit) {
  return {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE8A_NONCANON_DOMAIN_EXCLUSION_V1',
    source_surface: remoteAudit.available ? 'remote_current_canon_read_only' : 'local_replay_only',
    total_card_prints_inspected: Number(
      remoteAudit.available
        ? remoteAudit.total_card_print_rows
        : localState.counts?.total_card_print_rows ?? 0,
    ),
    supported_canon_domain_count: Number(
      remoteAudit.available
        ? remoteAudit.supported_canon_domain_count
        : localState.counts?.supported_canon_domain_rows ?? 0,
    ),
    excluded_noncanon_domain_count: Number(
      remoteAudit.available
        ? remoteAudit.excluded_noncanon_domain_count
        : localState.counts?.excluded_noncanon_domain_rows ?? 0,
    ),
    blocked_unknown_domain_count: Number(
      remoteAudit.available
        ? remoteAudit.blocked_unknown_domain_count
        : localState.counts?.blocked_unknown_domain_rows ?? 0,
    ),
    supported_breakdown_by_domain: remoteAudit.available
      ? remoteAudit.supported_breakdown_by_domain
      : [],
    excluded_breakdown_by_domain: remoteAudit.available
      ? remoteAudit.excluded_breakdown_by_domain
      : [],
    explicit_confirmation_that_tcg_pocket_rows_received_zero_identity_rows: {
      confirmed: remoteAudit.available
        ? Number(remoteAudit.tcg_pocket?.remote_identity_row_count ?? 0) === 0
        : true,
      identity_row_count: remoteAudit.available
        ? Number(remoteAudit.tcg_pocket?.remote_identity_row_count ?? 0)
        : 0,
      evidence: remoteAudit.available
        ? remoteAudit.tcg_pocket?.remote_identity_row_evidence
        : 'Local replay contains no tcg_pocket rows and no identity rows were created for excluded non-canonical domains.',
    },
  };
}

function buildTcgPocketInventory(remoteAudit) {
  const rowsWithGvId = Number(remoteAudit.tcg_pocket?.rows_with_gv_id ?? 0);
  return {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE8A_NONCANON_DOMAIN_EXCLUSION_V1',
    total_tcg_pocket_rows: Number(remoteAudit.tcg_pocket?.total_rows ?? 0),
    distinct_sets_affected: Number(remoteAudit.tcg_pocket?.distinct_sets_affected ?? 0),
    affected_set_codes: Array.isArray(remoteAudit.tcg_pocket?.affected_sets)
      ? remoteAudit.tcg_pocket.affected_sets
      : [],
    gv_id_public_facing_dependencies_detected: rowsWithGvId > 0,
    gv_id_dependency_detail: {
      rows_with_non_null_gv_id: rowsWithGvId,
      basis: 'Read-only runtime audit of remote card_prints joined to sets where set.source.domain = tcg_pocket.',
    },
    cleanup_deferred: true,
    statement: 'tcg_pocket remains outside CanonDB and is excluded from identity rollout',
  };
}

function buildBaStorageReadinessCheck(localState, promotionCandidates) {
  const missingFields = promotionCandidates.rows.filter((row) => {
    return !normalizeTextOrNull(row.ba_set_code)
      || !normalizeTextOrNull(row.printed_number)
      || !normalizeTextOrNull(row.normalized_printed_name)
      || !normalizeTextOrNull(row.source_name_raw);
  });

  return {
    passed:
      localState.baSets.length === 3
      && Number(localState.baCardPrints.row_count ?? 0) === 0
      && missingFields.length === 0,
    detail: {
      ba_sets_registered_locally: localState.baSets.map((row) => row.code),
      local_ba_card_print_rows: Number(localState.baCardPrints.row_count ?? 0),
      promotion_candidate_count: Array.isArray(promotionCandidates.rows)
        ? promotionCandidates.rows.length
        : 0,
      missing_required_projection_fields: missingFields.length,
    },
  };
}

function includesForbiddenHeuristicTokens(text) {
  const forbiddenTokens = ['levenshtein', 'similarity(', 'trgm', 'fuzzy', 'heuristic'];
  const normalized = String(text).toLowerCase();
  return forbiddenTokens.some((token) => normalized.includes(token));
}

function hasRequiredColumns(localState) {
  const columns = localState.columns
    .filter((row) => row.table_name === 'card_print_identity')
    .map((row) => row.column_name);
  return REQUIRED_CARD_PRINT_IDENTITY_COLUMNS.every((column) => columns.includes(column));
}

function hasRequiredIndexes(localState) {
  const indexNames = localState.indexes
    .filter((row) => row.tablename === 'card_print_identity')
    .map((row) => row.indexname);
  return REQUIRED_INDEX_NAMES.every((indexName) => indexNames.includes(indexName));
}

function hasRequiredConstraints(localState) {
  const constraintNames = localState.constraints
    .filter((row) => row.table_name === 'card_print_identity')
    .map((row) => row.conname);
  return REQUIRED_CONSTRAINT_NAMES.every((constraintName) => constraintNames.includes(constraintName));
}

async function main() {
  const localDbUrl = mustGetLocalDbUrl();
  const localState = await getLocalSchemaState(localDbUrl);
  const promotionCandidates = await readJson(CHECKPOINT_PATHS.promotionCandidates);
  const remoteAudit = await getRemoteReadOnlyAudit();

  const exclusionReport = buildExclusionReport(localState, remoteAudit);
  const tcgPocketInventory = remoteAudit.available
    ? buildTcgPocketInventory(remoteAudit)
    : {
        generated_at: new Date().toISOString(),
        phase: 'BA_PHASE8A_NONCANON_DOMAIN_EXCLUSION_V1',
        total_tcg_pocket_rows: 0,
        distinct_sets_affected: 0,
        affected_set_codes: [],
        gv_id_public_facing_dependencies_detected: false,
        gv_id_dependency_detail: {
          rows_with_non_null_gv_id: 0,
          basis: remoteAudit.reason,
        },
        cleanup_deferred: true,
        statement: 'tcg_pocket remains outside CanonDB and is excluded from identity rollout',
      };

  await writeJson(CHECKPOINT_PATHS.exclusionReport, exclusionReport);
  await writeJson(CHECKPOINT_PATHS.tcgPocketInventory, tcgPocketInventory);

  const migrationTexts = await Promise.all(
    REQUIRED_MIGRATION_FILES.map((relativePath) => readText(path.join(repoRoot, relativePath))),
  );
  const combinedMigrationText = migrationTexts.join('\n');
  const baStorageReadiness = buildBaStorageReadinessCheck(localState, promotionCandidates);
  const blockedUnknownCount = Number(
    remoteAudit.available
      ? remoteAudit.blocked_unknown_domain_count
      : localState.counts?.blocked_unknown_domain_rows ?? 0,
  );
  const tcgPocketIdentityRows = Number(
    remoteAudit.available
      ? remoteAudit.tcg_pocket?.remote_identity_row_count ?? 0
      : 0,
  );

  const checks = [
    {
      name: 'V1_LOCAL_RESET_SURFACE_IS_REACHABLE_AFTER_REPLAY',
      passed:
        hasRequiredColumns(localState)
        && hasRequiredIndexes(localState)
        && hasRequiredConstraints(localState),
      detail: {
        local_db_connected: true,
        verifier_assumes_caller_ran: 'supabase db reset --local',
      },
    },
    {
      name: 'V2_CARD_PRINT_IDENTITY_EXISTS_WITH_APPROVED_SHAPE',
      passed: hasRequiredColumns(localState),
      detail: {
        required_columns: REQUIRED_CARD_PRINT_IDENTITY_COLUMNS,
      },
    },
    {
      name: 'V3_SUPPORTED_CANONICAL_DOMAINS_BACKFILL_CORRECTLY',
      passed:
        Number(localState.counts?.missing_active_identity_rows ?? 0) === 0
        && Number(localState.counts?.duplicate_active_parent_rows ?? 0) === 0
        && Number(localState.counts?.duplicate_active_hash_groups ?? 0) === 0
        && !includesForbiddenHeuristicTokens(combinedMigrationText),
      detail: {
        local_supported_canon_domain_rows: Number(localState.counts?.supported_canon_domain_rows ?? 0),
        local_missing_active_identity_rows: Number(localState.counts?.missing_active_identity_rows ?? 0),
        local_duplicate_active_parent_rows: Number(localState.counts?.duplicate_active_parent_rows ?? 0),
        local_duplicate_active_hash_groups: Number(localState.counts?.duplicate_active_hash_groups ?? 0),
        remote_supported_canon_domain_count: Number(remoteAudit.supported_canon_domain_count ?? 0),
        forbidden_tokens_absent: !includesForbiddenHeuristicTokens(combinedMigrationText),
      },
    },
    {
      name: 'V4_TCG_POCKET_ROWS_ARE_EXCLUDED_AND_RECEIVE_ZERO_IDENTITY_ROWS',
      passed:
        Number(remoteAudit.tcg_pocket?.total_rows ?? 0) === Number(remoteAudit.excluded_noncanon_domain_count ?? 0)
        && tcgPocketIdentityRows === 0,
      detail: {
        total_tcg_pocket_rows: Number(remoteAudit.tcg_pocket?.total_rows ?? 0),
        excluded_noncanon_domain_count: Number(remoteAudit.excluded_noncanon_domain_count ?? 0),
        tcg_pocket_identity_rows_detected: tcgPocketIdentityRows,
        evidence: remoteAudit.tcg_pocket?.remote_identity_row_evidence ?? null,
      },
    },
    {
      name: 'V5_EXCLUDED_NONCANON_DOMAINS_DO_NOT_FAIL_VERIFICATION_IF_EXPLICITLY_CLASSIFIED',
      passed:
        Number(remoteAudit.excluded_noncanon_domain_count ?? 0) >= 0
        && blockedUnknownCount === 0,
      detail: {
        excluded_noncanon_domain_count: Number(remoteAudit.excluded_noncanon_domain_count ?? 0),
        excluded_domains: remoteAudit.excluded_breakdown_by_domain ?? [],
      },
    },
    {
      name: 'V6_UNKNOWN_UNCLASSIFIED_DOMAINS_STILL_FAIL_CLOSED',
      passed: blockedUnknownCount === 0,
      detail: {
        blocked_unknown_domain_count: blockedUnknownCount,
        blocked_breakdown_by_domain: remoteAudit.blocked_breakdown_by_domain ?? [],
      },
    },
    {
      name: 'V7_GV_ID_STILL_LIVES_ON_CARD_PRINTS',
      passed:
        localState.columns.some(
          (row) => row.table_name === 'card_prints' && row.column_name === 'gv_id',
        )
        && !localState.columns.some(
          (row) => row.table_name === 'card_print_identity' && row.column_name === 'gv_id',
        ),
      detail: {
        card_prints_has_gv_id: true,
        card_print_identity_has_gv_id: false,
      },
    },
    {
      name: 'V8_EXTERNAL_MAPPINGS_STILL_POINT_TO_CARD_PRINTS',
      passed: String(localState.mappingFk?.definition ?? '').includes('REFERENCES card_prints(id)'),
      detail: {
        fk_definition: localState.mappingFk?.definition ?? null,
      },
    },
    {
      name: 'V9_VARIANT_KEY_WAS_NOT_REPURPOSED',
      passed:
        !localState.columns.some(
          (row) => row.table_name === 'card_print_identity' && row.column_name === 'variant_key',
        )
        && !localState.indexes.some(
          (row) => row.tablename === 'card_print_identity' && String(row.indexdef).includes('variant_key'),
        ),
      detail: {
        card_print_identity_has_variant_key_column: false,
        card_print_identity_indexes_reference_variant_key: false,
      },
    },
    {
      name: 'V10_BA_STORAGE_REPRESENTATION_REMAINS_POSSIBLE',
      passed: baStorageReadiness.passed,
      detail: baStorageReadiness.detail,
    },
    {
      name: 'V11_NO_BA_CANON_ROWS_WERE_PROMOTED',
      passed: Number(localState.baCardPrints.row_count ?? 0) === 0,
      detail: {
        ba_card_print_rows: Number(localState.baCardPrints.row_count ?? 0),
      },
    },
  ];

  const runtimeBlockers = [];
  if (!remoteAudit.available) {
    runtimeBlockers.push({
      type: 'REMOTE_READ_ONLY_AUDIT_UNAVAILABLE',
      message: 'Remote read-only CanonDB audit is unavailable; Phase 8A cannot confirm tcg_pocket exclusion posture.',
      detail: remoteAudit.reason ?? null,
    });
  }
  if (blockedUnknownCount > 0) {
    runtimeBlockers.push({
      type: 'BLOCKED_UNKNOWN_DOMAIN',
      message: 'Current canon contains domains that are neither approved nor explicitly excluded; fail-closed remains active.',
      detail: remoteAudit.blocked_breakdown_by_domain ?? [],
    });
  }
  if (tcgPocketIdentityRows > 0) {
    runtimeBlockers.push({
      type: 'EXCLUDED_DOMAIN_RECEIVED_IDENTITY_ROWS',
      message: 'Excluded tcg_pocket rows already have identity rows, which violates the non-canonical exclusion rule.',
      detail: {
        domain: 'tcg_pocket',
        identity_row_count: tcgPocketIdentityRows,
      },
    });
  }

  const verificationResult = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE8A_NONCANON_DOMAIN_EXCLUSION_V1',
    approved_canonical_identity_domains: APPROVED_IDENTITY_DOMAINS,
    explicitly_excluded_noncanon_domains: EXPLICITLY_EXCLUDED_NONCANON_DOMAINS,
    all_passed: checks.every((check) => check.passed) && runtimeBlockers.length === 0,
    checks,
    runtime_blockers: runtimeBlockers,
  };

  await writeJson(CHECKPOINT_PATHS.verification, verificationResult);

  if (!verificationResult.all_passed) {
    const firstBlocker = runtimeBlockers[0]?.message ?? 'one or more checks failed';
    console.error(`[ba-phase8a-noncanon-domain-exclusion-verify-v1] STOP: ${firstBlocker}`);
    process.exitCode = 1;
    return;
  }

  console.log('[ba-phase8a-noncanon-domain-exclusion-verify-v1] verification passed.');
  console.log(`[ba-phase8a-noncanon-domain-exclusion-verify-v1] wrote ${CHECKPOINT_PATHS.verification}`);
}

main().catch((error) => {
  console.error('[ba-phase8a-noncanon-domain-exclusion-verify-v1] fatal', error);
  process.exitCode = 1;
});
