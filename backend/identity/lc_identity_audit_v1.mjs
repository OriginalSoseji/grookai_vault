import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { normalizeCardNameV1 } from './normalizeCardNameV1.mjs';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'LC_IDENTITY_AUDIT_V1';
const TARGET_SET_CODE_IDENTITY = 'lc';
const CONFLICTING_CANONICAL_SET_CODE = 'base6';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'lc_identity_audit_v1.json',
);

const EXPECTED_UNRESOLVED = {
  total: 110,
  numeric: 110,
  non_numeric: 0,
};

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonReport(report) {
  ensureOutputDir(JSON_OUTPUT_PATH);
  fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(report, null, 2));
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) {
    throw new Error(`${code}:${actual}:${expected}`);
  }
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

function unresolvedCte() {
  return `
    with unresolved as (
      select
        cp.id as card_print_id,
        cp.name as unresolved_name,
        cp.set_code as unresolved_parent_set_code,
        cp.variant_key,
        cpi.printed_number,
        cpi.normalized_printed_name
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
    )
  `;
}

function canonicalBase6Cte() {
  return `
    canonical as (
      select
        cp.id as canonical_card_print_id,
        cp.name as canonical_name,
        cp.number,
        lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name,
        cp.gv_id,
        cp.set_code
      from public.card_prints cp
      where cp.set_code = $3
        and cp.gv_id is not null
    )
  `;
}

const SQL = {
  unresolvedCounts: `
    with unresolved as (
      select cpi.printed_number
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
    )
    select
      count(*)::int as total_unresolved,
      count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
      count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
    from unresolved
  `,
  canonicalLcSnapshot: `
    select
      count(*)::int as canonical_lc_count,
      count(*) filter (where cp.gv_id is not null)::int as canonical_lc_non_null_gvid_count
    from public.card_prints cp
    where cp.set_code = $1
  `,
  canonicalBase6Snapshot: `
    select
      count(*)::int as canonical_base6_count,
      count(*) filter (where cp.gv_id is not null)::int as canonical_base6_non_null_gvid_count
    from public.card_prints cp
    where cp.set_code = $1
  `,
  canonicalLcSamples: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
    order by
      coalesce(nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), ''), '0')::int,
      cp.number,
      cp.id
    limit 25
  `,
  canonicalBase6Samples: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
    order by
      coalesce(nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), ''), '0')::int,
      cp.number,
      cp.id
    limit 25
  `,
  strictOverlapSummary: `
    ${unresolvedCte()},
    ${canonicalBase6Cte()},
    overlap_map as (
      select
        u.card_print_id,
        u.unresolved_name,
        u.printed_number,
        count(*) filter (
          where c.number = u.printed_number
            and c.normalized_name = u.normalized_printed_name
        )::int as same_name_same_number_match_count,
        count(*) filter (
          where c.number = u.printed_number
            and c.normalized_name <> u.normalized_printed_name
        )::int as same_number_different_name_match_count,
        count(*) filter (
          where c.number <> u.printed_number
            and c.normalized_name = u.normalized_printed_name
        )::int as same_name_different_number_match_count,
        count(*) filter (where c.number = u.printed_number)::int as exact_number_match_count
      from unresolved u
      left join canonical c
        on c.number = u.printed_number
        or c.normalized_name = u.normalized_printed_name
      group by
        u.card_print_id,
        u.unresolved_name,
        u.printed_number,
        u.normalized_printed_name
    )
    select
      count(*) filter (where same_name_same_number_match_count > 0)::int as same_name_same_number_overlap_count,
      count(*) filter (
        where same_name_same_number_match_count = 0
          and same_number_different_name_match_count > 0
      )::int as same_number_different_name_count,
      count(*) filter (where same_name_different_number_match_count > 0)::int as same_name_different_number_count,
      count(*) filter (where exact_number_match_count > 1)::int as multiple_canonical_match_count,
      count(*) filter (where exact_number_match_count = 0)::int as zero_canonical_match_count
    from overlap_map
  `,
  strictOverlapRows: `
    ${unresolvedCte()},
    ${canonicalBase6Cte()},
    overlap_map as (
      select
        u.card_print_id,
        u.unresolved_name,
        u.printed_number,
        count(*) filter (
          where c.number = u.printed_number
            and c.normalized_name = u.normalized_printed_name
        )::int as same_name_same_number_match_count,
        count(*) filter (
          where c.number = u.printed_number
            and c.normalized_name <> u.normalized_printed_name
        )::int as same_number_different_name_match_count,
        count(*) filter (
          where c.number <> u.printed_number
            and c.normalized_name = u.normalized_printed_name
        )::int as same_name_different_number_match_count,
        count(*) filter (where c.number = u.printed_number)::int as exact_number_match_count
      from unresolved u
      left join canonical c
        on c.number = u.printed_number
        or c.normalized_name = u.normalized_printed_name
      group by
        u.card_print_id,
        u.unresolved_name,
        u.printed_number,
        u.normalized_printed_name
    )
    select *
    from overlap_map
    where exact_number_match_count > 1
       or exact_number_match_count = 0
       or same_name_same_number_match_count = 0
       or same_name_different_number_match_count > 0
    order by
      coalesce(nullif(regexp_replace(printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
      printed_number,
      card_print_id
  `,
  unresolvedSourceRows: `
    select
      cp.id as card_print_id,
      cp.name,
      cp.set_code as parent_set_code,
      cp.variant_key,
      cpi.printed_number,
      cpi.normalized_printed_name,
      s.code as set_code,
      s.name as set_name,
      s.printed_set_abbrev,
      s.printed_total
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    left join public.sets s
      on s.id = cp.set_id
    where cpi.is_active = true
      and cpi.identity_domain = $1
      and cpi.set_code_identity = $2
      and cp.gv_id is null
    order by
      coalesce(nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
      cpi.printed_number,
      cp.id
  `,
  canonicalBase6AllRows: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
    order by
      coalesce(nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), ''), '0')::int,
      cp.number,
      cp.id
  `,
  liveRowsByGvId: `
    select
      cp.id,
      cp.gv_id,
      cp.set_code,
      cp.number,
      cp.name
    from public.card_prints cp
    where cp.gv_id = any($1::text[])
    order by cp.gv_id, cp.id
  `,
  setMetadata: `
    select
      s.id,
      s.code,
      s.name,
      s.printed_set_abbrev,
      s.printed_total,
      s.source
    from public.sets s
    where s.code in ($1, $2)
       or s.printed_set_abbrev = $3
    order by s.code, s.id
  `,
  rawProvenanceSummary: `
    with unresolved as (
      select
        cp.id as card_print_id,
        cp.name,
        cpi.printed_number
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
    ),
    tcgdex_mapping as (
      select distinct
        u.card_print_id,
        em.external_id
      from unresolved u
      join public.external_mappings em
        on em.card_print_id = u.card_print_id
       and em.source = 'tcgdex'
       and em.active = true
    ),
    tcgdex_raw as (
      select distinct
        tm.card_print_id,
        ri.id as raw_import_id,
        coalesce(
          ri.payload -> 'set' ->> 'id',
          ri.payload ->> '_set_external_id',
          ri.payload ->> 'set_external_id'
        ) as raw_set_id
      from tcgdex_mapping tm
      left join public.raw_imports ri
        on ri.source = 'tcgdex'
       and (
         (ri.payload -> 'card' ->> 'id') = tm.external_id
         or (ri.payload ->> '_external_id') = tm.external_id
       )
    )
    select
      (select count(*)::int from unresolved) as unresolved_count,
      (select count(*)::int from tcgdex_mapping) as unresolved_tcgdex_mapping_count,
      (select count(*)::int from tcgdex_raw where raw_import_id is not null) as unresolved_tcgdex_raw_link_count,
      array_remove(array_agg(distinct tcgdex_raw.raw_set_id), null) as raw_set_ids
    from tcgdex_raw
  `,
  rawProvenanceSamples: `
    with unresolved as (
      select
        cp.id as card_print_id,
        cp.name,
        cpi.printed_number
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
    )
    select
      u.card_print_id,
      u.name,
      u.printed_number,
      em.external_id,
      ri.id as raw_import_id,
      coalesce(ri.payload -> 'card' ->> 'id', ri.payload ->> '_external_id') as raw_card_id,
      coalesce(
        ri.payload -> 'set' ->> 'id',
        ri.payload ->> '_set_external_id',
        ri.payload ->> 'set_external_id'
      ) as raw_set_id,
      coalesce(ri.payload -> 'card' ->> 'localId', ri.payload ->> 'localId') as raw_local_id,
      ri.payload -> 'card' ->> 'name' as raw_name
    from unresolved u
    join public.external_mappings em
      on em.card_print_id = u.card_print_id
     and em.source = 'tcgdex'
     and em.active = true
    left join public.raw_imports ri
      on ri.source = 'tcgdex'
     and (
       (ri.payload -> 'card' ->> 'id') = em.external_id
       or (ri.payload ->> '_external_id') = em.external_id
     )
    order by
      coalesce(nullif(regexp_replace(u.printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
      u.printed_number,
      u.card_print_id
    limit 25
  `,
};

function normalizeNameForRepoProof(value) {
  return normalizeCardNameV1(value).corrected_name?.toLowerCase() ?? null;
}

function buildRepoNormalizedProof(unresolvedRows, canonicalRows) {
  const canonicalByNumber = new Map();

  for (const row of canonicalRows) {
    const bucket = canonicalByNumber.get(row.number) ?? [];
    bucket.push({
      ...row,
      repo_normalized_name: normalizeNameForRepoProof(row.name),
    });
    canonicalByNumber.set(row.number, bucket);
  }

  const proofRows = unresolvedRows.map((row) => {
    const unresolvedRepoName = normalizeNameForRepoProof(row.name);
    const numberMatches = canonicalByNumber.get(row.printed_number) ?? [];
    const repoMatches = numberMatches.filter(
      (candidate) => candidate.repo_normalized_name === unresolvedRepoName,
    );

    return {
      card_print_id: row.card_print_id,
      unresolved_name: row.name,
      printed_number: row.printed_number,
      unresolved_repo_normalized_name: unresolvedRepoName,
      exact_number_match_count: numberMatches.length,
      repo_same_name_same_number_match_count: repoMatches.length,
      canonical_matches: repoMatches.map((candidate) => ({
        canonical_card_print_id: candidate.id,
        canonical_name: candidate.name,
        canonical_number: candidate.number,
        canonical_gv_id: candidate.gv_id,
        canonical_set_code: candidate.set_code,
      })),
    };
  });

  return {
    repo_normalized_same_name_same_number_count: proofRows.filter(
      (row) => row.repo_same_name_same_number_match_count > 0,
    ).length,
    repo_multiple_match_count: proofRows.filter(
      (row) => row.repo_same_name_same_number_match_count > 1,
    ).length,
    repo_zero_match_count: proofRows.filter(
      (row) => row.repo_same_name_same_number_match_count === 0,
    ).length,
    rows_not_proven: proofRows
      .filter((row) => row.repo_same_name_same_number_match_count !== 1)
      .slice(0, 25),
    anomaly_repairs: proofRows.filter(
      (row) => row.repo_same_name_same_number_match_count === 1,
    ).filter((row) => {
      const [candidate] = row.canonical_matches;
      return candidate && row.unresolved_name !== candidate.canonical_name;
    }),
  };
}

function buildProposedGvIdCollisionAudit(sourceRows, liveRows) {
  const liveByGvId = new Map(liveRows.map((row) => [row.gv_id, row]));

  const enrichedRows = sourceRows.map((row) => {
    let proposed_gv_id = null;
    let derivation_error = null;

    try {
      proposed_gv_id = buildCardPrintGvIdV1({
        printedSetAbbrev: row.printed_set_abbrev,
        number: row.printed_number,
        variantKey: row.variant_key,
      });
    } catch (error) {
      derivation_error = error instanceof Error ? error.message : String(error);
    }

    const collisionTarget = proposed_gv_id ? liveByGvId.get(proposed_gv_id) ?? null : null;
    const unresolvedDbNormalizedName = row.normalized_printed_name;
    const collisionDbNormalizedName = collisionTarget
      ? collisionTarget.name.toLowerCase().replace(/\s+/g, ' ').trim()
      : null;

    return {
      card_print_id: row.card_print_id,
      name: row.name,
      printed_number: row.printed_number,
      printed_set_abbrev: row.printed_set_abbrev,
      proposed_gv_id,
      derivation_error,
      collides_with: collisionTarget,
      collision_is_same_name_same_number:
        Boolean(collisionTarget) &&
        collisionTarget.number === row.printed_number &&
        collisionDbNormalizedName === unresolvedDbNormalizedName,
      collision_is_same_number_different_name:
        Boolean(collisionTarget) &&
        collisionTarget.number === row.printed_number &&
        collisionDbNormalizedName !== unresolvedDbNormalizedName,
    };
  });

  const collisionRows = enrichedRows.filter((row) => row.collides_with);
  const collisionBreakdownByTargetSet = collisionRows.reduce((acc, row) => {
    const key = row.collides_with?.set_code ?? '__NULL__';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    missing_printed_set_abbrev_count: enrichedRows.filter((row) => !row.printed_set_abbrev).length,
    derivation_error_count: enrichedRows.filter((row) => row.derivation_error).length,
    proposed_gvid_collision_count: collisionRows.length,
    collision_breakdown_by_target_set: collisionBreakdownByTargetSet,
    collision_same_name_same_number_count: collisionRows.filter(
      (row) => row.collision_is_same_name_same_number,
    ).length,
    collision_same_number_different_name_count: collisionRows.filter(
      (row) => row.collision_is_same_number_different_name,
    ).length,
    collision_samples: collisionRows.slice(0, 25),
  };
}

function buildPrintedAbbrevFindings(setMetadataRows) {
  const lcRow = setMetadataRows.find((row) => row.code === TARGET_SET_CODE_IDENTITY) ?? null;
  const sharedAbbrevSetCodes = setMetadataRows
    .filter((row) => row.printed_set_abbrev === lcRow?.printed_set_abbrev)
    .map((row) => row.code)
    .sort();
  const sharedCanonicalSetCodes = sharedAbbrevSetCodes.filter(
    (code) => code !== TARGET_SET_CODE_IDENTITY,
  );

  return {
    printed_set_abbrev: lcRow?.printed_set_abbrev ?? null,
    printed_set_abbrev_present: Boolean(lcRow?.printed_set_abbrev),
    printed_total: lcRow?.printed_total ?? null,
    printed_total_present: lcRow?.printed_total !== null && lcRow?.printed_total !== undefined,
    shared_abbrev_set_codes: sharedAbbrevSetCodes,
    shared_with_another_live_canonical_set: sharedCanonicalSetCodes.length > 0,
    shared_abbrev_explains_class_c:
      Boolean(lcRow?.printed_set_abbrev) &&
      sharedCanonicalSetCodes.includes(CONFLICTING_CANONICAL_SET_CODE),
    set_metadata_rows: setMetadataRows,
  };
}

function buildRawProvenanceAssessment(summary, samples) {
  const rawSetIds = Array.isArray(summary?.raw_set_ids) ? summary.raw_set_ids : [];
  const uniqueRawSetIds = [...new Set(rawSetIds)].sort();
  const strongEnough =
    normalizeCount(summary?.unresolved_tcgdex_mapping_count) === EXPECTED_UNRESOLVED.total &&
    normalizeCount(summary?.unresolved_tcgdex_raw_link_count) === EXPECTED_UNRESOLVED.total &&
    uniqueRawSetIds.length === 1 &&
    uniqueRawSetIds[0] === TARGET_SET_CODE_IDENTITY;

  return {
    unresolved_tcgdex_mapping_count: normalizeCount(summary?.unresolved_tcgdex_mapping_count),
    unresolved_tcgdex_raw_link_count: normalizeCount(summary?.unresolved_tcgdex_raw_link_count),
    raw_set_ids: uniqueRawSetIds,
    evidence_strength: strongEnough ? 'strong' : 'partial_or_weak',
    supports_alias_family_realign_hypothesis: strongEnough,
    sample_rows: samples,
  };
}

function buildClassification(report) {
  const isFamilyRealignment =
    normalizeCount(report.total_unresolved) === EXPECTED_UNRESOLVED.total &&
    normalizeCount(report.numeric_unresolved) === EXPECTED_UNRESOLVED.numeric &&
    normalizeCount(report.non_numeric_unresolved) === EXPECTED_UNRESOLVED.non_numeric &&
    normalizeCount(report.canonical_surface.canonical_lc_non_null_gvid_count) === 0 &&
    normalizeCount(report.canonical_surface.canonical_base6_non_null_gvid_count) === EXPECTED_UNRESOLVED.total &&
    normalizeCount(report.strict_overlap.same_name_same_number_overlap_count) === 108 &&
    normalizeCount(report.strict_overlap.same_number_different_name_count) === 2 &&
    normalizeCount(report.strict_overlap.multiple_canonical_match_count) === 0 &&
    normalizeCount(report.strict_overlap.zero_canonical_match_count) === 0 &&
    normalizeCount(report.repo_normalized_overlap.repo_normalized_same_name_same_number_count) ===
      EXPECTED_UNRESOLVED.total &&
    normalizeCount(report.repo_normalized_overlap.repo_multiple_match_count) === 0 &&
    normalizeCount(report.repo_normalized_overlap.repo_zero_match_count) === 0 &&
    normalizeCount(report.proposed_gvid_audit.proposed_gvid_collision_count) === EXPECTED_UNRESOLVED.total &&
    Object.keys(report.proposed_gvid_audit.collision_breakdown_by_target_set).length === 1 &&
    report.proposed_gvid_audit.collision_breakdown_by_target_set[CONFLICTING_CANONICAL_SET_CODE] ===
      EXPECTED_UNRESOLVED.total &&
    report.printed_abbrev_validation.shared_abbrev_explains_class_c === true;

  if (!isFamilyRealignment) {
    return {
      final_classification: 'OUTCOME D — BLOCKED',
      next_phase_recommendation:
        'Do not execute apply logic yet. Re-run a narrower lc/base6 alias audit to resolve whichever proof gate failed: canonical occupancy, repo-normalized overlap completeness, or shared LC namespace collision evidence.',
      exact_next_execution_mode: 'BLOCKED_PENDING_LC_BASE6_ALIAS_PROOF',
      confirms_global_class_c: false,
    };
  }

  return {
    final_classification: 'OUTCOME C — FAMILY REALIGNMENT',
    next_phase_recommendation:
      'Set-scoped alias-family realignment for Legendary Collection: collapse the 110 unresolved lc parents onto canonical base6 parents that already own the live GV-PK-LC-* namespace. Preserve canonical base6 rows and existing gv_id values. Do not promote and do not mint new lc gv_id rows.',
    exact_next_execution_mode: 'LC_ALIAS_REALIGNMENT_COLLAPSE_TO_BASE6',
    confirms_global_class_c: true,
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'lc_identity_audit_v1',
  });

  await client.connect();

  try {
    await client.query('begin read only');

    const unresolvedCounts = await queryOne(client, SQL.unresolvedCounts, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    assertEqual(normalizeCount(unresolvedCounts?.total_unresolved), EXPECTED_UNRESOLVED.total, 'UNRESOLVED_TOTAL_DRIFT');
    assertEqual(
      normalizeCount(unresolvedCounts?.numeric_unresolved),
      EXPECTED_UNRESOLVED.numeric,
      'UNRESOLVED_NUMERIC_DRIFT',
    );
    assertEqual(
      normalizeCount(unresolvedCounts?.non_numeric_unresolved),
      EXPECTED_UNRESOLVED.non_numeric,
      'UNRESOLVED_NON_NUMERIC_DRIFT',
    );

    const canonicalLcSnapshot = await queryOne(client, SQL.canonicalLcSnapshot, [
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalBase6Snapshot = await queryOne(client, SQL.canonicalBase6Snapshot, [
      CONFLICTING_CANONICAL_SET_CODE,
    ]);
    const canonicalLcSamples = await queryRows(client, SQL.canonicalLcSamples, [
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalBase6Samples = await queryRows(client, SQL.canonicalBase6Samples, [
      CONFLICTING_CANONICAL_SET_CODE,
    ]);
    const strictOverlapSummary = await queryOne(client, SQL.strictOverlapSummary, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
      CONFLICTING_CANONICAL_SET_CODE,
    ]);
    const strictOverlapRows = await queryRows(client, SQL.strictOverlapRows, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
      CONFLICTING_CANONICAL_SET_CODE,
    ]);
    const unresolvedSourceRows = await queryRows(client, SQL.unresolvedSourceRows, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalBase6AllRows = await queryRows(client, SQL.canonicalBase6AllRows, [
      CONFLICTING_CANONICAL_SET_CODE,
    ]);
    const proposedGvIds = unresolvedSourceRows.flatMap((row) => {
      try {
        return [
          buildCardPrintGvIdV1({
            printedSetAbbrev: row.printed_set_abbrev,
            number: row.printed_number,
            variantKey: row.variant_key,
          }),
        ];
      } catch {
        return [];
      }
    });
    const liveCollisionTargets =
      proposedGvIds.length === 0 ? [] : await queryRows(client, SQL.liveRowsByGvId, [proposedGvIds]);
    const setMetadataRows = await queryRows(client, SQL.setMetadata, [
      TARGET_SET_CODE_IDENTITY,
      CONFLICTING_CANONICAL_SET_CODE,
      'LC',
    ]);
    const rawProvenanceSummary = await queryOne(client, SQL.rawProvenanceSummary, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const rawProvenanceSamples = await queryRows(client, SQL.rawProvenanceSamples, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);

    const repoNormalizedProof = buildRepoNormalizedProof(
      unresolvedSourceRows,
      canonicalBase6AllRows,
    );
    const proposedGvIdAudit = buildProposedGvIdCollisionAudit(
      unresolvedSourceRows,
      liveCollisionTargets,
    );
    const printedAbbrevValidation = buildPrintedAbbrevFindings(setMetadataRows);
    const rawProvenanceEvidence = buildRawProvenanceAssessment(
      rawProvenanceSummary,
      rawProvenanceSamples,
    );

    if (normalizeCount(canonicalLcSnapshot?.canonical_lc_non_null_gvid_count) !== 0) {
      throw new Error(
        `CANONICAL_LC_ALREADY_OCCUPIED:${canonicalLcSnapshot?.canonical_lc_non_null_gvid_count ?? 'null'}`,
      );
    }
    if (normalizeCount(canonicalBase6Snapshot?.canonical_base6_non_null_gvid_count) !== EXPECTED_UNRESOLVED.total) {
      throw new Error(
        `CANONICAL_BASE6_SURFACE_DRIFT:${canonicalBase6Snapshot?.canonical_base6_non_null_gvid_count ?? 'null'}`,
      );
    }
    if (normalizeCount(strictOverlapSummary?.multiple_canonical_match_count) !== 0) {
      throw new Error(
        `MULTIPLE_CANONICAL_MATCHES:${strictOverlapSummary?.multiple_canonical_match_count ?? 'null'}`,
      );
    }
    if (normalizeCount(strictOverlapSummary?.zero_canonical_match_count) !== 0) {
      throw new Error(
        `ZERO_CANONICAL_MATCHES:${strictOverlapSummary?.zero_canonical_match_count ?? 'null'}`,
      );
    }
    if (normalizeCount(repoNormalizedProof.repo_multiple_match_count) !== 0) {
      throw new Error(`REPO_NORMALIZED_MULTIPLE_MATCHES:${repoNormalizedProof.repo_multiple_match_count}`);
    }
    if (normalizeCount(repoNormalizedProof.repo_zero_match_count) !== 0) {
      throw new Error(`REPO_NORMALIZED_ZERO_MATCHES:${repoNormalizedProof.repo_zero_match_count}`);
    }
    if (normalizeCount(proposedGvIdAudit.missing_printed_set_abbrev_count) !== 0) {
      throw new Error(`PRINTED_SET_ABBREV_MISSING:${proposedGvIdAudit.missing_printed_set_abbrev_count}`);
    }
    if (normalizeCount(proposedGvIdAudit.derivation_error_count) !== 0) {
      throw new Error(`PROPOSED_GV_ID_DERIVATION_FAILED:${proposedGvIdAudit.derivation_error_count}`);
    }
    if (
      normalizeCount(proposedGvIdAudit.proposed_gvid_collision_count) !== EXPECTED_UNRESOLVED.total
    ) {
      throw new Error(
        `PROPOSED_GV_ID_COLLISION_DRIFT:${proposedGvIdAudit.proposed_gvid_collision_count}:${EXPECTED_UNRESOLVED.total}`,
      );
    }
    if (printedAbbrevValidation.printed_set_abbrev !== 'LC') {
      throw new Error(`PRINTED_SET_ABBREV_DRIFT:${printedAbbrevValidation.printed_set_abbrev ?? 'null'}:LC`);
    }
    if (!printedAbbrevValidation.shared_abbrev_explains_class_c) {
      throw new Error('PRINTED_SET_ABBREV_SHARED_ALIAS_NOT_PROVEN');
    }

    const report = {
      phase: PHASE,
      generated_at: new Date().toISOString(),
      target_set_code_identity: TARGET_SET_CODE_IDENTITY,
      target_identity_domain: TARGET_IDENTITY_DOMAIN,
      conflicting_canonical_set_code: CONFLICTING_CANONICAL_SET_CODE,
      total_unresolved: normalizeCount(unresolvedCounts?.total_unresolved),
      numeric_unresolved: normalizeCount(unresolvedCounts?.numeric_unresolved),
      non_numeric_unresolved: normalizeCount(unresolvedCounts?.non_numeric_unresolved),
      canonical_base_count: normalizeCount(canonicalBase6Snapshot?.canonical_base6_count),
      canonical_non_null_gvid_count: normalizeCount(
        canonicalBase6Snapshot?.canonical_base6_non_null_gvid_count,
      ),
      same_name_same_number_overlap_count: normalizeCount(
        strictOverlapSummary?.same_name_same_number_overlap_count,
      ),
      same_number_different_name_count: normalizeCount(
        strictOverlapSummary?.same_number_different_name_count,
      ),
      same_name_different_number_count: normalizeCount(
        strictOverlapSummary?.same_name_different_number_count,
      ),
      multiple_canonical_match_count: normalizeCount(
        strictOverlapSummary?.multiple_canonical_match_count,
      ),
      zero_canonical_match_count: normalizeCount(
        strictOverlapSummary?.zero_canonical_match_count,
      ),
      proposed_gvid_collision_count: normalizeCount(
        proposedGvIdAudit.proposed_gvid_collision_count,
      ),
      collision_same_name_same_number_count: normalizeCount(
        proposedGvIdAudit.collision_same_name_same_number_count,
      ),
      collision_same_number_different_name_count: normalizeCount(
        proposedGvIdAudit.collision_same_number_different_name_count,
      ),
      printed_set_abbrev: printedAbbrevValidation.printed_set_abbrev,
      printed_set_abbrev_present: printedAbbrevValidation.printed_set_abbrev_present,
      canonical_surface: {
        ...canonicalLcSnapshot,
        ...canonicalBase6Snapshot,
        canonical_lc_samples: canonicalLcSamples,
        canonical_base6_samples: canonicalBase6Samples,
      },
      strict_overlap: {
        ...strictOverlapSummary,
        anomaly_rows: strictOverlapRows,
      },
      repo_normalized_overlap: repoNormalizedProof,
      proposed_gvid_audit: proposedGvIdAudit,
      printed_abbrev_validation: printedAbbrevValidation,
      raw_provenance_evidence: rawProvenanceEvidence,
      unresolved_source_samples: unresolvedSourceRows.slice(0, 25),
    };

    Object.assign(report, buildClassification(report));
    writeJsonReport(report);
    console.log(JSON.stringify(report, null, 2));
    await client.query('rollback');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
