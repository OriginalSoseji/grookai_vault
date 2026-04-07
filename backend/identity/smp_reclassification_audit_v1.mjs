import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { normalizeCardNameV1 } from './normalizeCardNameV1.mjs';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'SMP_RECLASSIFICATION_AUDIT_V1';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const TARGET_SET_CODE_IDENTITY = 'smp';
const CANONICAL_SET_CODE = 'smp';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'smp_reclassification_audit_v1.json',
);

const EXPECTED = {
  total_unresolved: 84,
};

const QUALIFIER_NAME_PATTERNS = [
  /\bstaff\b/i,
  /\bprerelease\b/i,
  /\bstamp(?:ed)?\b/i,
];

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

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
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

function isValidPromoCode(value) {
  return /^SM[0-9]+$/i.test(String(value ?? '').trim());
}

function normalizeDbName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeRepoName(value, canonName = null) {
  const normalized = canonName
    ? normalizeCardNameV1(value, { canonName }).corrected_name
    : normalizeCardNameV1(value).corrected_name;

  if (!normalized) {
    throw new Error(`NAME_NORMALIZATION_FAILED:${String(value ?? 'null')}`);
  }

  return normalized.toLowerCase();
}

function numericPromoSortKey(value) {
  const match = String(value ?? '').match(/[0-9]+/);
  return match ? Number.parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

function deriveCanonicalSmpGvId(row) {
  return buildCardPrintGvIdV1({
    setCode: CANONICAL_SET_CODE,
    printedSetAbbrev: row.printed_set_abbrev,
    number: row.number,
    numberPlain: row.number_plain,
    variantKey: row.variant_key,
  });
}

function deriveUnresolvedSmpGvId(row) {
  return buildCardPrintGvIdV1({
    setCode: TARGET_SET_CODE_IDENTITY,
    printedSetAbbrev: row.printed_set_abbrev,
    number: row.printed_number,
    numberPlain: null,
    variantKey: row.variant_key,
  });
}

const SQL = {
  unresolvedCounts: `
    with unresolved as (
      select
        cp.id,
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
      count(*)::int as total_unresolved,
      count(*) filter (where printed_number ~ '^SM[0-9]+$')::int as valid_promo_code_count,
      count(*) filter (where printed_number !~ '^SM[0-9]+$')::int as invalid_promo_code_count
    from unresolved
  `,
  canonicalSummary: `
    select
      count(*)::int as canonical_smp_total_rows,
      count(*) filter (where gv_id is not null)::int as canonical_smp_non_null_gvid_count
    from public.card_prints
    where set_code = $1
  `,
  canonicalSamples: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
    order by nullif(regexp_replace(cp.number, '^[^0-9]+', ''), '')::int, cp.id
    limit 25
  `,
  unresolvedRows: `
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.variant_key,
      cpi.printed_number,
      cpi.normalized_printed_name,
      s.printed_set_abbrev
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    left join public.sets s
      on s.id = cp.set_id
    where cpi.is_active = true
      and cpi.identity_domain = $1
      and cpi.set_code_identity = $2
      and cp.gv_id is null
    order by nullif(regexp_replace(cpi.printed_number, '^[^0-9]+', ''), '')::int, cp.id
  `,
  canonicalRows: `
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.number,
      cp.number_plain,
      cp.variant_key,
      cp.gv_id,
      cp.set_code,
      s.printed_set_abbrev
    from public.card_prints cp
    left join public.sets s
      on s.id = cp.set_id
    where cp.set_code = $1
      and cp.gv_id is not null
    order by nullif(regexp_replace(cp.number, '^[^0-9]+', ''), '')::int, cp.id
  `,
  liveGvIdCollisions: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.gv_id = any($1::text[])
    order by cp.gv_id, cp.id
  `,
  fkReadinessForIds: `
    with selected_ids as (
      select unnest($1::uuid[]) as card_print_id
    )
    select *
    from (
      select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
        count(*)::int as row_count
      from public.card_print_identity
      where card_print_id in (select card_print_id from selected_ids)
      union all
      select 'card_print_traits', 'card_print_id', count(*)::int
      from public.card_print_traits
      where card_print_id in (select card_print_id from selected_ids)
      union all
      select 'card_printings', 'card_print_id', count(*)::int
      from public.card_printings
      where card_print_id in (select card_print_id from selected_ids)
      union all
      select 'external_mappings', 'card_print_id', count(*)::int
      from public.external_mappings
      where card_print_id in (select card_print_id from selected_ids)
      union all
      select 'vault_items', 'card_id', count(*)::int
      from public.vault_items
      where card_id in (select card_print_id from selected_ids)
    ) readiness
    order by table_name, column_name
  `,
};

function buildCollapseAudit(validRows, canonicalRows) {
  const canonicalByPromo = new Map();

  for (const row of canonicalRows) {
    const promoCode = normalizeTextOrNull(row.number);
    if (!promoCode) {
      continue;
    }

    const bucket = canonicalByPromo.get(promoCode) ?? [];
    bucket.push({
      ...row,
      promo_code: promoCode,
      db_normalized_name: normalizeDbName(row.new_name),
      repo_normalized_name: normalizeRepoName(row.new_name),
    });
    canonicalByPromo.set(promoCode, bucket);
  }

  const rowAudits = [];
  const candidateMatches = [];
  let samePromoSameNameCount = 0;
  let samePromoDifferentNameCount = 0;
  let dbSamePromoSameNameCount = 0;
  let dbSamePromoDifferentNameCount = 0;

  for (const row of validRows) {
    const samePromoCandidates = canonicalByPromo.get(row.printed_number) ?? [];
    const dbNormalizedName =
      normalizeTextOrNull(row.normalized_printed_name) ?? normalizeDbName(row.old_name);
    const dbNameMatches = samePromoCandidates.filter(
      (candidate) => candidate.db_normalized_name === dbNormalizedName,
    );
    const repoNameMatches = samePromoCandidates.filter((candidate) => {
      const correctedOldName = normalizeRepoName(row.old_name, candidate.new_name);
      return correctedOldName === candidate.repo_normalized_name;
    });

    if (dbNameMatches.length > 0) {
      dbSamePromoSameNameCount += 1;
    } else if (samePromoCandidates.length > 0) {
      dbSamePromoDifferentNameCount += 1;
    }

    if (repoNameMatches.length > 0) {
      samePromoSameNameCount += 1;
    } else if (samePromoCandidates.length > 0) {
      samePromoDifferentNameCount += 1;
    }

    rowAudits.push({
      ...row,
      same_promo_candidate_count: samePromoCandidates.length,
      db_same_name_match_count: dbNameMatches.length,
      repo_match_count: repoNameMatches.length,
      matching_candidates: repoNameMatches.map((candidate) => ({
        new_id: candidate.new_id,
        new_name: candidate.new_name,
        number: candidate.number,
        gv_id: candidate.gv_id,
        set_code: candidate.set_code,
        repo_normalized_name: candidate.repo_normalized_name,
      })),
      same_promo_candidates: samePromoCandidates.map((candidate) => ({
        new_id: candidate.new_id,
        new_name: candidate.new_name,
        number: candidate.number,
        gv_id: candidate.gv_id,
        set_code: candidate.set_code,
        db_normalized_name: candidate.db_normalized_name,
        repo_normalized_name: candidate.repo_normalized_name,
      })),
    });

    for (const candidate of repoNameMatches) {
      candidateMatches.push({
        old_id: row.old_id,
        new_id: candidate.new_id,
      });
    }
  }

  const oldMatchCounts = new Map();
  const newMatchCounts = new Map();

  for (const match of candidateMatches) {
    oldMatchCounts.set(match.old_id, normalizeCount(oldMatchCounts.get(match.old_id)) + 1);
    newMatchCounts.set(match.new_id, normalizeCount(newMatchCounts.get(match.new_id)) + 1);
  }

  const collapseMap = rowAudits
    .filter((row) => {
      if (normalizeCount(oldMatchCounts.get(row.old_id)) !== 1) {
        return false;
      }

      const matchedCandidate = row.matching_candidates[0];
      return normalizeCount(newMatchCounts.get(matchedCandidate.new_id)) === 1;
    })
    .map((row) => {
      const matchedCandidate = row.matching_candidates[0];
      return {
        old_id: row.old_id,
        old_name: row.old_name,
        printed_number: row.printed_number,
        variant_key: row.variant_key,
        printed_set_abbrev: row.printed_set_abbrev,
        db_normalized_name:
          normalizeTextOrNull(row.normalized_printed_name) ?? normalizeDbName(row.old_name),
        new_id: matchedCandidate.new_id,
        new_name: matchedCandidate.new_name,
        new_number: matchedCandidate.number,
        new_gv_id: matchedCandidate.gv_id,
        new_set_code: matchedCandidate.set_code,
      };
    });

  const collapseMapByOldId = new Map(collapseMap.map((row) => [row.old_id, row]));
  const unmatchedRows = rowAudits.filter((row) => !collapseMapByOldId.has(row.old_id));

  return {
    row_audits: rowAudits,
    collapse_map: collapseMap,
    unmatched_rows: unmatchedRows,
    summary: {
      collapse_candidate_count: collapseMap.length,
      distinct_old_count: new Set(collapseMap.map((row) => row.old_id)).size,
      distinct_new_count: new Set(collapseMap.map((row) => row.new_id)).size,
      multiple_match_old_count: rowAudits.filter(
        (row) => normalizeCount(oldMatchCounts.get(row.old_id)) > 1,
      ).length,
      reused_new_count: Array.from(newMatchCounts.values()).filter((count) => count > 1).length,
      unmatched_count: unmatchedRows.length,
      same_promo_same_name_count: samePromoSameNameCount,
      same_promo_different_name_count: samePromoDifferentNameCount,
      db_same_promo_same_name_count: dbSamePromoSameNameCount,
      db_same_promo_different_name_count: dbSamePromoDifferentNameCount,
    },
  };
}

function detectQualifierReview(row) {
  if (normalizeTextOrNull(row.variant_key)) {
    return 'variant_key_present';
  }

  const name = normalizeTextOrNull(row.old_name) ?? '';
  for (const pattern of QUALIFIER_NAME_PATTERNS) {
    if (pattern.test(name)) {
      return 'name_contains_variant_marker';
    }
  }

  return null;
}

async function computePromotionAudit(client, rowAudits, collapseMapByOldId) {
  const promotionCandidates = [];
  const blockedCanonicalConflictRows = [];
  const qualifierReviewRows = [];
  const blockedInvalidPromoRows = [];

  for (const row of rowAudits) {
    if (collapseMapByOldId.has(row.old_id)) {
      continue;
    }

    if (!isValidPromoCode(row.printed_number)) {
      blockedInvalidPromoRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: 'invalid_promo_code',
      });
      continue;
    }

    const qualifierReason = detectQualifierReview(row);
    if (qualifierReason) {
      qualifierReviewRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: qualifierReason,
      });
      continue;
    }

    if (row.same_promo_candidate_count > 0) {
      blockedCanonicalConflictRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: 'same_promo_different_name',
        canonical_rows: row.same_promo_candidates,
      });
      continue;
    }

    let proposedGvId;
    try {
      proposedGvId = deriveUnresolvedSmpGvId(row);
    } catch (error) {
      qualifierReviewRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    promotionCandidates.push({
      card_print_id: row.old_id,
      name: row.old_name,
      printed_number: row.printed_number,
      variant_key: row.variant_key,
      printed_set_abbrev: row.printed_set_abbrev,
      proposed_gv_id: proposedGvId,
    });
  }

  const internalGvIdCounts = new Map();
  for (const row of promotionCandidates) {
    internalGvIdCounts.set(
      row.proposed_gv_id,
      normalizeCount(internalGvIdCounts.get(row.proposed_gv_id)) + 1,
    );
  }

  const internalCollisionRows = promotionCandidates.filter(
    (row) => normalizeCount(internalGvIdCounts.get(row.proposed_gv_id)) > 1,
  );
  const proposedGvIds = [...new Set(promotionCandidates.map((row) => row.proposed_gv_id))];
  const liveCollisionRows =
    proposedGvIds.length > 0
      ? await queryRows(client, SQL.liveGvIdCollisions, [proposedGvIds])
      : [];
  const liveCollisionGvIds = new Set(liveCollisionRows.map((row) => row.gv_id));
  const promotionSafeRows = [];

  for (const row of promotionCandidates) {
    if (normalizeCount(internalGvIdCounts.get(row.proposed_gv_id)) > 1) {
      blockedCanonicalConflictRows.push({
        card_print_id: row.card_print_id,
        name: row.name,
        printed_number: row.printed_number,
        blocking_reason: 'promotion_internal_collision',
      });
      continue;
    }

    if (liveCollisionGvIds.has(row.proposed_gv_id)) {
      blockedCanonicalConflictRows.push({
        card_print_id: row.card_print_id,
        name: row.name,
        printed_number: row.printed_number,
        blocking_reason: 'promotion_live_namespace_collision',
      });
      continue;
    }

    promotionSafeRows.push(row);
  }

  return {
    promotion_safe_rows: promotionSafeRows,
    blocked_canonical_conflict_rows: blockedCanonicalConflictRows,
    blocked_invalid_promo_rows: blockedInvalidPromoRows,
    qualifier_review_rows: qualifierReviewRows,
    promotion_candidates: promotionCandidates,
    promotion_summary: {
      promotion_candidate_count: promotionSafeRows.length,
      promotion_internal_collision_count: new Set(
        internalCollisionRows.map((row) => row.proposed_gv_id),
      ).size,
      promotion_live_collision_count: liveCollisionGvIds.size,
      promotion_same_promo_conflict_count: blockedCanonicalConflictRows.length,
    },
    live_collision_rows: liveCollisionRows,
  };
}

async function loadFkReadinessSnapshot(client, ids) {
  return queryRows(client, SQL.fkReadinessForIds, [ids]);
}

function buildFinalClassificationCounts({
  totalUnresolved,
  collapseSafeCount,
  promotionSafeCount,
  blockedCanonicalConflictCount,
  blockedInvalidPromoCount,
  qualifierReviewCount,
}) {
  const counts = {
    COLLAPSE_SAFE: collapseSafeCount,
    PROMOTION_SAFE: promotionSafeCount,
    BLOCKED_CANONICAL_CONFLICT: blockedCanonicalConflictCount,
    BLOCKED_INVALID_PROMO_CODE: blockedInvalidPromoCount,
    QUALIFIER_REVIEW: qualifierReviewCount,
  };

  const classifiedTotal = Object.values(counts).reduce(
    (sum, value) => sum + normalizeCount(value),
    0,
  );
  assertEqual(classifiedTotal, totalUnresolved, 'FINAL_CLASSIFICATION_TOTAL_DRIFT');
  return counts;
}

function classifyNextPhase(finalClassificationCounts) {
  if (
    normalizeCount(finalClassificationCounts.COLLAPSE_SAFE) > 0 &&
    normalizeCount(finalClassificationCounts.PROMOTION_SAFE) === 0 &&
    normalizeCount(finalClassificationCounts.BLOCKED_CANONICAL_CONFLICT) === 0 &&
    normalizeCount(finalClassificationCounts.BLOCKED_INVALID_PROMO_CODE) === 0 &&
    normalizeCount(finalClassificationCounts.QUALIFIER_REVIEW) === 0
  ) {
    return 'SMP_ALIAS_COLLAPSE_TO_CANONICAL_SMP_V1';
  }

  if (normalizeCount(finalClassificationCounts.COLLAPSE_SAFE) > 0) {
    return 'SMP_SPLIT_EXECUTION_COLLAPSE_AND_BLOCKED_REVIEW_V1';
  }

  if (normalizeCount(finalClassificationCounts.PROMOTION_SAFE) > 0) {
    return 'SMP_PROMOTION_AND_BLOCKED_REVIEW_V1';
  }

  return 'SMP_BLOCKED_REVIEW_V1';
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'smp_reclassification_audit_v1',
  });

  const report = {
    phase: PHASE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    target_set_code_identity: TARGET_SET_CODE_IDENTITY,
    canonical_set_code: CANONICAL_SET_CODE,
    total_unresolved: 0,
    valid_promo_code_count: 0,
    invalid_promo_code_count: 0,
    canonical_smp_target_summary: null,
    canonical_smp_sample_rows: [],
    collapse_safe_subset_results: null,
    collapse_safe_sample_rows: [],
    promotion_safe_subset_results: null,
    promotion_safe_sample_rows: [],
    blocked_conflict_rows: [],
    qualifier_review_rows: [],
    invalid_promo_rows: [],
    namespace_audit_results: null,
    fk_readiness_snapshot: {
      collapse_safe_subset: [],
      promotion_safe_subset: [],
    },
    final_classification_counts: null,
    next_phase_recommendation: null,
    status: 'running',
  };

  await client.connect();

  try {
    const unresolvedCounts = await queryOne(client, SQL.unresolvedCounts, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    report.total_unresolved = normalizeCount(unresolvedCounts?.total_unresolved);
    report.valid_promo_code_count = normalizeCount(unresolvedCounts?.valid_promo_code_count);
    report.invalid_promo_code_count = normalizeCount(unresolvedCounts?.invalid_promo_code_count);

    assertEqual(report.total_unresolved, EXPECTED.total_unresolved, 'UNRESOLVED_TOTAL_DRIFT');

    report.canonical_smp_target_summary = await queryOne(client, SQL.canonicalSummary, [
      CANONICAL_SET_CODE,
    ]);
    report.canonical_smp_sample_rows = await queryRows(client, SQL.canonicalSamples, [
      CANONICAL_SET_CODE,
    ]);

    if (normalizeCount(report.canonical_smp_target_summary?.canonical_smp_non_null_gvid_count) <= 0) {
      throw new Error('CANONICAL_SMP_LANE_MISSING');
    }

    const unresolvedRows = await queryRows(client, SQL.unresolvedRows, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalRows = await queryRows(client, SQL.canonicalRows, [CANONICAL_SET_CODE]);

    const validRows = unresolvedRows.filter((row) => isValidPromoCode(row.printed_number));
    const invalidRows = unresolvedRows
      .filter((row) => !isValidPromoCode(row.printed_number))
      .map((row) => ({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: 'invalid_promo_code',
      }));

    const collapseAudit = buildCollapseAudit(validRows, canonicalRows);
    const collapseMapByOldId = new Map(
      collapseAudit.collapse_map.map((row) => [row.old_id, row]),
    );

    report.collapse_safe_subset_results = collapseAudit.summary;
    report.collapse_safe_sample_rows = collapseAudit.collapse_map.slice(0, 25);

    const promotionAudit = await computePromotionAudit(client, collapseAudit.row_audits, collapseMapByOldId);
    report.promotion_safe_subset_results = promotionAudit.promotion_summary;
    report.promotion_safe_sample_rows = promotionAudit.promotion_safe_rows.slice(0, 25);
    report.blocked_conflict_rows = promotionAudit.blocked_canonical_conflict_rows.slice(0, 25);
    report.qualifier_review_rows = promotionAudit.qualifier_review_rows.slice(0, 25);
    report.invalid_promo_rows = [...invalidRows, ...promotionAudit.blocked_invalid_promo_rows].slice(0, 25);

    const canonicalNamespaceMatchCount = canonicalRows.filter(
      (row) => row.gv_id === deriveCanonicalSmpGvId(row),
    ).length;
    const namespaceConflictCount = collapseAudit.collapse_map.filter(
      (row) =>
        row.new_gv_id !==
        buildCardPrintGvIdV1({
          setCode: CANONICAL_SET_CODE,
          printedSetAbbrev: row.printed_set_abbrev,
          number: row.new_number,
          variantKey: row.variant_key,
        }),
    ).length;

    report.namespace_audit_results = {
      canonical_namespace_match_count: canonicalNamespaceMatchCount,
      namespace_conflict_count: namespaceConflictCount,
      canonical_smp_legacy_namespace_row_count: canonicalRows.length - canonicalNamespaceMatchCount,
    };

    report.fk_readiness_snapshot.collapse_safe_subset = await loadFkReadinessSnapshot(
      client,
      collapseAudit.collapse_map.map((row) => row.old_id),
    );
    report.fk_readiness_snapshot.promotion_safe_subset = await loadFkReadinessSnapshot(
      client,
      promotionAudit.promotion_safe_rows.map((row) => row.card_print_id),
    );

    report.final_classification_counts = buildFinalClassificationCounts({
      totalUnresolved: report.total_unresolved,
      collapseSafeCount: collapseAudit.collapse_map.length,
      promotionSafeCount: promotionAudit.promotion_safe_rows.length,
      blockedCanonicalConflictCount: promotionAudit.blocked_canonical_conflict_rows.length,
      blockedInvalidPromoCount: report.invalid_promo_code_count,
      qualifierReviewCount: promotionAudit.qualifier_review_rows.length,
    });

    report.next_phase_recommendation = classifyNextPhase(report.final_classification_counts);
    report.status = 'completed';

    writeJsonReport({
      phase: report.phase,
      generated_at: report.generated_at,
      total_unresolved: report.total_unresolved,
      valid_promo_code_count: report.valid_promo_code_count,
      invalid_promo_code_count: report.invalid_promo_code_count,
      canonical_smp_total_rows: normalizeCount(
        report.canonical_smp_target_summary?.canonical_smp_total_rows,
      ),
      collapse_candidate_count: normalizeCount(
        report.collapse_safe_subset_results?.collapse_candidate_count,
      ),
      multiple_match_old_count: normalizeCount(
        report.collapse_safe_subset_results?.multiple_match_old_count,
      ),
      reused_new_count: normalizeCount(report.collapse_safe_subset_results?.reused_new_count),
      unmatched_count: normalizeCount(report.collapse_safe_subset_results?.unmatched_count),
      promotion_candidate_count: normalizeCount(
        report.promotion_safe_subset_results?.promotion_candidate_count,
      ),
      promotion_internal_collision_count: normalizeCount(
        report.promotion_safe_subset_results?.promotion_internal_collision_count,
      ),
      promotion_live_collision_count: normalizeCount(
        report.promotion_safe_subset_results?.promotion_live_collision_count,
      ),
      promotion_same_promo_conflict_count: normalizeCount(
        report.promotion_safe_subset_results?.promotion_same_promo_conflict_count,
      ),
      qualifier_review_count: report.qualifier_review_rows.length,
      canonical_namespace_match_count: normalizeCount(
        report.namespace_audit_results?.canonical_namespace_match_count,
      ),
      namespace_conflict_count: normalizeCount(report.namespace_audit_results?.namespace_conflict_count),
      final_classification_counts: report.final_classification_counts,
      next_phase_recommendation: report.next_phase_recommendation,
      canonical_smp_target_summary: report.canonical_smp_target_summary,
      canonical_smp_sample_rows: report.canonical_smp_sample_rows,
      collapse_safe_subset_results: report.collapse_safe_subset_results,
      collapse_safe_sample_rows: report.collapse_safe_sample_rows,
      promotion_safe_subset_results: report.promotion_safe_subset_results,
      promotion_safe_sample_rows: report.promotion_safe_sample_rows,
      blocked_conflict_rows: report.blocked_conflict_rows,
      qualifier_review_rows: report.qualifier_review_rows,
      invalid_promo_rows: report.invalid_promo_rows,
      namespace_audit_results: report.namespace_audit_results,
      fk_readiness_snapshot: report.fk_readiness_snapshot,
      status: report.status,
    });

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.status = 'failed';
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    writeJsonReport(report);
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
