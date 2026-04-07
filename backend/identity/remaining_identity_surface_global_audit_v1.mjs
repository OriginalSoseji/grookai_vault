import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'REMAINING_IDENTITY_SURFACE_GLOBAL_AUDIT_V1';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'remaining_identity_surface_global_audit_v1.json',
);

const KNOWN_FAMILY_LANES = {
  swsh4_5: 'swsh45sv',
  swsh9: 'swsh9tg',
  swsh10: 'swsh10tg',
  swsh11: 'swsh11tg',
  swsh12: 'swsh12tg',
};

const CLASS_PRIORITY = {
  DUPLICATE_COLLAPSE: 1,
  MIXED_EXECUTION: 2,
  NUMERIC_PROMOTION: 3,
  FAMILY_REALIGNMENT: 4,
  BLOCKED_UNSUPPORTED_FAMILY: 5,
  BLOCKED_METADATA: 6,
  BLOCKED_SYMBOLIC: 7,
};

const SQL = {
  unresolvedIdentityDomains: `
    select
      cpi.identity_domain,
      count(*)::int as row_count
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cp.gv_id is null
    group by cpi.identity_domain
    order by count(*) desc, cpi.identity_domain
  `,
  unresolvedInventorySummary: `
    select
      cpi.set_code_identity,
      count(*)::int as total_unresolved,
      count(*) filter (where cpi.printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
      count(*) filter (where cpi.printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cp.gv_id is null
    group by cpi.set_code_identity
    order by count(*) desc, cpi.set_code_identity
  `,
  unresolvedSurfaceRows: `
    select
      cp.id as card_print_id,
      cp.name as unresolved_name,
      cp.variant_key,
      cp.set_code as parent_set_code,
      cpi.identity_domain,
      cpi.set_code_identity,
      cpi.printed_number,
      cpi.normalized_printed_name,
      s.printed_set_abbrev,
      s.printed_total
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    left join public.sets s
      on s.id = cp.set_id
    where cpi.is_active = true
      and cp.gv_id is null
    order by cpi.set_code_identity, cpi.printed_number, cp.id
  `,
  canonicalSurfaceRows: `
    select
      cp.id as canonical_card_print_id,
      cp.name as canonical_name,
      cp.set_code,
      cp.number,
      cp.gv_id
    from public.card_prints cp
    where cp.gv_id is not null
    order by cp.set_code, cp.number, cp.id
  `,
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

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeDigits(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  return digits.replace(/^0+/, '') || '0';
}

function extractPrefix(printedNumber) {
  const value = String(printedNumber ?? '');
  if (/^[0-9]+$/.test(value)) {
    return 'NUMERIC';
  }

  const alphaPrefix = value.match(/^[A-Za-z]+/);
  if (alphaPrefix) {
    return alphaPrefix[0].toUpperCase();
  }

  return 'SYMBOLIC';
}

function normalizeSetCodeForPattern(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function toObjectFromCounts(map) {
  return Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function quoteExactMode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

function detectCandidateFamilySets(setCode, canonicalSetCodes) {
  const normalizedSetCode = normalizeSetCodeForPattern(setCode);
  const candidates = new Set();

  const known = KNOWN_FAMILY_LANES[normalizedSetCode];
  if (known && canonicalSetCodes.includes(known)) {
    candidates.add(known);
  }

  for (const code of canonicalSetCodes) {
    if (!code || code === setCode) {
      continue;
    }

    const normalizedCandidate = normalizeSetCodeForPattern(code);
    if (
      code === `${setCode}tg` ||
      code === `${setCode}pt5` ||
      code.startsWith(`${setCode}_`) ||
      code.startsWith(setCode) ||
      (normalizedSetCode !== '' &&
        normalizedCandidate.startsWith(normalizedSetCode) &&
        normalizedCandidate !== normalizedSetCode)
    ) {
      candidates.add(code);
    }
  }

  return [...candidates].sort();
}

function chooseFamilyLane({
  setCodeIdentity,
  nonNumericRows,
  familyExactMatchCounts,
  canonicalSetCodes,
}) {
  if (nonNumericRows.length === 0 || familyExactMatchCounts.size === 0) {
    return null;
  }

  const sorted = [...familyExactMatchCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const [topSetCode, topCount] = sorted[0];
  if (!topSetCode || topCount <= 0) {
    return null;
  }

  if (sorted.length === 1 || topCount > sorted[1][1]) {
    return topSetCode;
  }

  const known = KNOWN_FAMILY_LANES[normalizeSetCodeForPattern(setCodeIdentity)];
  if (known && canonicalSetCodes.includes(known) && familyExactMatchCounts.get(known) === topCount) {
    return known;
  }

  return null;
}

function looksSymbolicSurface(setCodeIdentity, prefixBreakdown) {
  const normalizedSetCode = normalizeSetCodeForPattern(setCodeIdentity);
  if (['xyp', 'smp', 'hgssp', 'exu', 'mep'].includes(normalizedSetCode)) {
    return true;
  }
  if (normalizedSetCode.endsWith('p')) {
    return true;
  }

  const symbolicPrefixes = new Set([
    'SYMBOLIC',
    'SM',
    'XY',
    'BW',
    'SVP',
    'SWSH',
    'HGSS',
    'EX',
    'PROMO',
  ]);
  return prefixBreakdown.some((row) => symbolicPrefixes.has(row.prefix));
}

function buildNextMode(metrics, classification) {
  switch (classification) {
    case 'DUPLICATE_COLLAPSE':
      return `DUPLICATE_COLLAPSE_TO_CANONICAL_${quoteExactMode(metrics.set_code_identity)}`;
    case 'NUMERIC_PROMOTION':
      return `NUMERIC_PROMOTION_FOR_${quoteExactMode(metrics.set_code_identity)}`;
    case 'FAMILY_REALIGNMENT':
      if (metrics.family_lane_code) {
        return `FAMILY_REALIGNMENT_COLLAPSE_TO_${quoteExactMode(metrics.family_lane_code)}`;
      }
      if (metrics.alias_target_set_code) {
        return `FAMILY_REALIGNMENT_COLLAPSE_TO_${quoteExactMode(metrics.alias_target_set_code)}`;
      }
      return `FAMILY_REALIGNMENT_FOR_${quoteExactMode(metrics.set_code_identity)}`;
    case 'MIXED_EXECUTION':
      if (metrics.numeric_promotion_ready_count === metrics.numeric_unresolved) {
        return `NUMERIC_PROMOTION_PLUS_FAMILY_REALIGNMENT_FOR_${quoteExactMode(metrics.set_code_identity)}`;
      }
      return `NUMERIC_COLLAPSE_PLUS_FAMILY_REALIGNMENT_FOR_${quoteExactMode(metrics.set_code_identity)}`;
    case 'BLOCKED_UNSUPPORTED_FAMILY':
      return `NEW_FAMILY_CONTRACT_REQUIRED_FOR_${quoteExactMode(metrics.set_code_identity)}`;
    case 'BLOCKED_SYMBOLIC':
      return `SYMBOLIC_IDENTITY_CONTRACT_REQUIRED_FOR_${quoteExactMode(metrics.set_code_identity)}`;
    default:
      return `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_${quoteExactMode(metrics.set_code_identity)}`;
  }
}

function classifySet(metrics) {
  const numericOnly = metrics.non_numeric_unresolved === 0;
  const nonNumericOnly = metrics.numeric_unresolved === 0 && metrics.non_numeric_unresolved > 0;

  const clearNumericCollapse =
    metrics.numeric_unresolved > 0 &&
    metrics.numeric_duplicate_ready_count === metrics.numeric_unresolved &&
    metrics.numeric_multiple_match_count === 0 &&
    metrics.numeric_unmatched_count === 0 &&
    metrics.base_exact_number_different_name_count === 0;

  const clearFamilyRealignment =
    metrics.non_numeric_unresolved > 0 &&
    metrics.family_lane_code !== null &&
    metrics.family_duplicate_ready_count === metrics.non_numeric_unresolved &&
    metrics.family_multiple_match_count === 0 &&
    metrics.family_unmatched_count === 0 &&
    metrics.family_exact_number_different_name_count === 0;

  const clearNumericPromotion =
    numericOnly &&
    metrics.numeric_unresolved > 0 &&
    metrics.numeric_with_canonical_match_count === 0 &&
    metrics.numeric_duplicate_ready_count === 0 &&
    metrics.numeric_multiple_match_count === 0 &&
    metrics.numeric_unmatched_count === metrics.numeric_unresolved &&
    metrics.printed_set_abbrev_present &&
    !metrics.printed_set_abbrev_inconsistent &&
    metrics.numeric_promotion_collision_count === 0 &&
    metrics.gv_id_derivation_error_count === 0;

  const aliasCollisionRealignment =
    numericOnly &&
    metrics.canonical_base_count === 0 &&
    metrics.proposed_gv_id_collision_count === metrics.total_unresolved &&
    metrics.proposed_gv_id_collision_set_codes.length === 1 &&
    metrics.proposed_gv_id_collision_set_codes[0] !== '__NULL__';

  const mixedExecution =
    metrics.numeric_unresolved > 0 &&
    metrics.non_numeric_unresolved > 0 &&
    clearFamilyRealignment &&
    (clearNumericCollapse || metrics.numeric_promotion_ready_count === metrics.numeric_unresolved);

  if (
    !metrics.printed_set_abbrev_present ||
    metrics.printed_set_abbrev_inconsistent ||
    metrics.gv_id_derivation_error_count > 0 ||
    metrics.numeric_multiple_match_count > 0 ||
    metrics.base_exact_number_different_name_count > 0 ||
    metrics.family_multiple_match_count > 0 ||
    metrics.family_exact_number_different_name_count > 0 ||
    metrics.proposed_gv_id_collision_set_codes.includes('__NULL__')
  ) {
    const reasons = [];
    if (!metrics.printed_set_abbrev_present) reasons.push('printed_set_abbrev missing');
    if (metrics.printed_set_abbrev_inconsistent) reasons.push('printed_set_abbrev inconsistent');
    if (metrics.gv_id_derivation_error_count > 0) reasons.push('gv_id derivation blocked');
    if (metrics.numeric_multiple_match_count > 0) reasons.push('numeric multiple-match ambiguity');
    if (metrics.base_exact_number_different_name_count > 0) reasons.push('base exact-number different-name overlap');
    if (metrics.family_multiple_match_count > 0) reasons.push('family multiple-match ambiguity');
    if (metrics.family_exact_number_different_name_count > 0) reasons.push('family exact-number different-name overlap');
    if (metrics.proposed_gv_id_collision_set_codes.includes('__NULL__')) {
      reasons.push('gv_id collision target set_code is null');
    }
    return {
      classification: 'BLOCKED_METADATA',
      recommended_action: 'repair identity metadata',
      blocked: true,
      block_reason: reasons.join('; '),
    };
  }

  if (mixedExecution) {
    return {
      classification: 'MIXED_EXECUTION',
      recommended_action: 'split execution',
      blocked: false,
      block_reason: null,
    };
  }

  if (aliasCollisionRealignment || (nonNumericOnly && clearFamilyRealignment)) {
    return {
      classification: 'FAMILY_REALIGNMENT',
      recommended_action: 'realign',
      blocked: false,
      block_reason: null,
    };
  }

  if (numericOnly && clearNumericCollapse) {
    return {
      classification: 'DUPLICATE_COLLAPSE',
      recommended_action: 'collapse',
      blocked: false,
      block_reason: null,
    };
  }

  if (clearNumericPromotion) {
    return {
      classification: 'NUMERIC_PROMOTION',
      recommended_action: 'promote',
      blocked: false,
      block_reason: null,
    };
  }

  if (
    metrics.non_numeric_unresolved > 0 &&
    metrics.family_lane_code === null
  ) {
    if (metrics.symbolic_surface) {
      return {
        classification: 'BLOCKED_SYMBOLIC',
        recommended_action: 'new symbolic contract required',
        blocked: true,
        block_reason: `symbolic or promo-style prefixes require dedicated contract: ${metrics.distinct_prefixes.join(', ')}`,
      };
    }

    return {
      classification: 'BLOCKED_UNSUPPORTED_FAMILY',
      recommended_action: 'new family contract required',
      blocked: true,
      block_reason: `unsupported family prefixes without proven family lane: ${metrics.distinct_prefixes.join(', ')}`,
    };
  }

  return {
    classification: 'BLOCKED_METADATA',
    recommended_action: 'repair identity metadata',
    blocked: true,
    block_reason: 'no lawful collapse, promotion, or family realignment contract is currently proven',
  };
}

function buildSetMetrics({
  setCodeIdentity,
  rows,
  canonicalRowsBySet,
  canonicalSetCodes,
  liveRowsByGvId,
}) {
  const baseRows = canonicalRowsBySet.get(setCodeIdentity) ?? [];
  const numericRows = rows.filter((row) => row.is_numeric);
  const nonNumericRows = rows.filter((row) => !row.is_numeric);
  const candidateFamilySets = detectCandidateFamilySets(setCodeIdentity, canonicalSetCodes);

  const familyExactMatchCounts = new Map();
  const prefixCounts = new Map();
  const proposedCollisionSetCounts = new Map();

  let numericWithCanonicalMatchCount = 0;
  let numericWithoutCanonicalMatchCount = 0;
  let numericDuplicateReadyCount = 0;
  let numericMultipleMatchCount = 0;
  let numericUnmatchedCount = 0;
  let baseExactNumberDifferentNameCount = 0;
  let missingPrintedSetAbbrevCount = 0;
  let gvIdDerivationErrorCount = 0;
  let numericPromotionCollisionCount = 0;
  let proposedGvIdCollisionCount = 0;

  const familyRowAudit = [];
  const sampleGvIdCollisions = [];

  for (const row of rows) {
    const exactBaseMatches = baseRows.filter((canonicalRow) => canonicalRow.number === row.printed_number);
    const exactBaseSameNameMatches = exactBaseMatches.filter(
      (canonicalRow) => canonicalRow.normalized_name === row.normalized_name,
    );

    if (row.is_numeric) {
      if (exactBaseMatches.length > 0) {
        numericWithCanonicalMatchCount += 1;
      } else {
        numericWithoutCanonicalMatchCount += 1;
      }
      if (exactBaseMatches.length > 0 && exactBaseSameNameMatches.length === 0) {
        baseExactNumberDifferentNameCount += 1;
      }

      const numericCollapseTargets = baseRows.filter(
        (canonicalRow) =>
          canonicalRow.normalized_digits === row.normalized_digits &&
          canonicalRow.normalized_name === row.normalized_name,
      );

      if (numericCollapseTargets.length === 1) {
        numericDuplicateReadyCount += 1;
      } else if (numericCollapseTargets.length > 1) {
        numericMultipleMatchCount += 1;
      } else {
        numericUnmatchedCount += 1;
      }
    } else {
      prefixCounts.set(row.prefix, (prefixCounts.get(row.prefix) ?? 0) + 1);

      const exactMatchesBySet = new Map();
      const exactNumberDifferentNameBySet = new Map();

      for (const [familySetCode, familyRows] of canonicalRowsBySet.entries()) {
        if (familySetCode === setCodeIdentity) {
          continue;
        }

        const exactFamilyMatches = familyRows.filter(
          (canonicalRow) =>
            canonicalRow.number === row.printed_number &&
            canonicalRow.normalized_name === row.normalized_name,
        );
        if (exactFamilyMatches.length > 0) {
          exactMatchesBySet.set(familySetCode, exactFamilyMatches);
          familyExactMatchCounts.set(familySetCode, (familyExactMatchCounts.get(familySetCode) ?? 0) + 1);
        }

        const diffNameMatches = familyRows.filter(
          (canonicalRow) =>
            canonicalRow.number === row.printed_number &&
            canonicalRow.normalized_name !== row.normalized_name,
        );
        if (diffNameMatches.length > 0) {
          exactNumberDifferentNameBySet.set(familySetCode, diffNameMatches);
        }
      }

      familyRowAudit.push({
        card_print_id: row.card_print_id,
        printed_number: row.printed_number,
        unresolved_name: row.unresolved_name,
        prefix: row.prefix,
        exact_matches_by_set: exactMatchesBySet,
        exact_number_different_name_by_set: exactNumberDifferentNameBySet,
      });
    }

    if (!row.printed_set_abbrev) {
      missingPrintedSetAbbrevCount += 1;
      continue;
    }

    let proposedGvId = null;
    try {
      proposedGvId = buildCardPrintGvIdV1({
        setCode: row.set_code_identity,
        printedSetAbbrev: row.printed_set_abbrev,
        number: row.printed_number,
        variantKey: row.variant_key,
      });
    } catch {
      gvIdDerivationErrorCount += 1;
      continue;
    }

    const collisionTarget = liveRowsByGvId.get(proposedGvId) ?? null;
    if (collisionTarget) {
      const collisionKey = collisionTarget.set_code ?? '__NULL__';
      proposedGvIdCollisionCount += 1;
      proposedCollisionSetCounts.set(collisionKey, (proposedCollisionSetCounts.get(collisionKey) ?? 0) + 1);
      if (row.is_numeric) {
        numericPromotionCollisionCount += 1;
      }
      if (sampleGvIdCollisions.length < 5) {
        sampleGvIdCollisions.push({
          card_print_id: row.card_print_id,
          printed_number: row.printed_number,
          unresolved_name: row.unresolved_name,
          proposed_gv_id: proposedGvId,
          live_set_code: collisionTarget.set_code ?? null,
          live_number: collisionTarget.number,
          live_name: collisionTarget.canonical_name,
        });
      }
    }
  }

  const familyLaneCode = chooseFamilyLane({
    setCodeIdentity,
    nonNumericRows,
    familyExactMatchCounts,
    canonicalSetCodes,
  });

  const familyLaneRows = familyLaneCode ? canonicalRowsBySet.get(familyLaneCode) ?? [] : [];
  let familyDuplicateReadyCount = 0;
  let familyMultipleMatchCount = 0;
  let familyUnmatchedCount = 0;
  let familyExactNumberDifferentNameCount = 0;

  for (const row of familyRowAudit) {
    const exactMatches = familyLaneCode ? row.exact_matches_by_set.get(familyLaneCode) ?? [] : [];
    const diffNameMatches = familyLaneCode
      ? row.exact_number_different_name_by_set.get(familyLaneCode) ?? []
      : [];

    if (exactMatches.length === 1) {
      familyDuplicateReadyCount += 1;
    } else if (exactMatches.length > 1) {
      familyMultipleMatchCount += 1;
    } else {
      familyUnmatchedCount += 1;
      if (diffNameMatches.length > 0) {
        familyExactNumberDifferentNameCount += 1;
      }
    }
  }

  const printedSetAbbrevValues = [...new Set(rows.map((row) => row.printed_set_abbrev).filter(Boolean))].sort();
  const printedTotalValues = [...new Set(rows.map((row) => row.printed_total).filter((value) => value != null))]
    .sort((a, b) => Number(a) - Number(b));

  const distinctPrefixes = [...prefixCounts.keys()].sort();
  const prefixBreakdown = [...prefixCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([prefix, count]) => ({ prefix, count }));

  const metrics = {
    set_code_identity: setCodeIdentity,
    total_unresolved: rows.length,
    numeric_unresolved: numericRows.length,
    non_numeric_unresolved: nonNumericRows.length,
    canonical_base_count: baseRows.length,
    canonical_base_numeric_count: baseRows.filter((row) => /^[0-9]+$/.test(row.number)).length,
    canonical_base_non_numeric_count: baseRows.filter((row) => !/^[0-9]+$/.test(row.number)).length,
    family_lane_code: familyLaneCode,
    family_lane_count: familyLaneRows.length,
    family_lane_matchable_count: familyLaneCode ? normalizeCount(familyExactMatchCounts.get(familyLaneCode)) : 0,
    candidate_family_lane_codes: candidateFamilySets,
    numeric_duplicate_ready_count: numericDuplicateReadyCount,
    numeric_multiple_match_count: numericMultipleMatchCount,
    numeric_unmatched_count: numericUnmatchedCount,
    numeric_with_canonical_match_count: numericWithCanonicalMatchCount,
    numeric_without_canonical_match_count: numericWithoutCanonicalMatchCount,
    family_duplicate_ready_count: familyDuplicateReadyCount,
    family_multiple_match_count: familyMultipleMatchCount,
    family_unmatched_count: familyUnmatchedCount,
    numeric_promotion_ready_count: 0,
    numeric_promotion_collision_count: numericPromotionCollisionCount,
    printed_set_abbrev_present: printedSetAbbrevValues.length > 0,
    printed_set_abbrev_inconsistent: printedSetAbbrevValues.length > 1,
    printed_set_abbrev_values: printedSetAbbrevValues,
    printed_total_present: printedTotalValues.length > 0,
    printed_total_values: printedTotalValues,
    family_realignment_candidate: false,
    family_realignment_collision_count:
      nonNumericRows.length > 0
        ? proposedGvIdCollisionCount - numericPromotionCollisionCount
        : proposedGvIdCollisionCount,
    realignment_note: null,
    alias_realignment_candidate: false,
    alias_target_set_code: null,
    blocked: false,
    block_reason: null,
    base_exact_number_different_name_count: baseExactNumberDifferentNameCount,
    family_exact_number_different_name_count: familyExactNumberDifferentNameCount,
    missing_printed_set_abbrev_count: missingPrintedSetAbbrevCount,
    gv_id_derivation_error_count: gvIdDerivationErrorCount,
    proposed_gv_id_collision_count: proposedGvIdCollisionCount,
    proposed_gv_id_collision_set_codes: [...proposedCollisionSetCounts.keys()].sort(),
    proposed_gv_id_collision_set_code_counts: toObjectFromCounts(proposedCollisionSetCounts),
    distinct_prefixes: distinctPrefixes,
    prefix_breakdown: prefixBreakdown,
    symbolic_surface: looksSymbolicSurface(setCodeIdentity, prefixBreakdown),
    sample_gv_id_collisions: sampleGvIdCollisions,
  };

  metrics.numeric_promotion_ready_count =
    metrics.non_numeric_unresolved === 0 &&
    metrics.numeric_unresolved > 0 &&
    metrics.numeric_with_canonical_match_count === 0 &&
    metrics.numeric_duplicate_ready_count === 0 &&
    metrics.numeric_multiple_match_count === 0 &&
    metrics.numeric_unmatched_count === metrics.numeric_unresolved &&
    metrics.printed_set_abbrev_present &&
    !metrics.printed_set_abbrev_inconsistent &&
    metrics.numeric_promotion_collision_count === 0 &&
    metrics.gv_id_derivation_error_count === 0
      ? metrics.numeric_unresolved
      : 0;

  metrics.family_realignment_candidate =
    metrics.non_numeric_unresolved > 0 &&
    metrics.family_lane_code !== null &&
    metrics.family_duplicate_ready_count === metrics.non_numeric_unresolved &&
    metrics.family_multiple_match_count === 0 &&
    metrics.family_unmatched_count === 0 &&
    metrics.family_exact_number_different_name_count === 0;

  if (
    metrics.non_numeric_unresolved === 0 &&
    metrics.canonical_base_count === 0 &&
    metrics.proposed_gv_id_collision_count === metrics.total_unresolved &&
    metrics.proposed_gv_id_collision_set_codes.length === 1 &&
    metrics.proposed_gv_id_collision_set_codes[0] !== '__NULL__'
  ) {
    metrics.alias_realignment_candidate = true;
    metrics.alias_target_set_code = metrics.proposed_gv_id_collision_set_codes[0];
  }

  if (metrics.family_realignment_candidate) {
    metrics.realignment_note =
      metrics.numeric_unresolved === 0
        ? `non-numeric lane maps cleanly to canonical family lane ${metrics.family_lane_code}`
        : `family lane ${metrics.family_lane_code} is proven, but numeric/base lane still requires separate handling`;
  } else if (metrics.alias_realignment_candidate) {
    metrics.realignment_note = `proposed namespace collides one-to-one with canonical lane ${metrics.alias_target_set_code}`;
  }

  const classification = classifySet(metrics);
  metrics.classification = classification.classification;
  metrics.recommended_action = classification.recommended_action;
  metrics.blocked = classification.blocked;
  metrics.block_reason = classification.block_reason;
  metrics.exact_next_execution_mode = buildNextMode(metrics, classification.classification);

  return metrics;
}

function buildRecommendedOrder(perSet) {
  return [...perSet]
    .sort((a, b) => {
      const priorityDelta = CLASS_PRIORITY[a.classification] - CLASS_PRIORITY[b.classification];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return b.total_unresolved - a.total_unresolved || a.set_code_identity.localeCompare(b.set_code_identity);
    })
    .map((row) => ({
      set_code_identity: row.set_code_identity,
      classification: row.classification,
      total_unresolved: row.total_unresolved,
      exact_next_execution_mode: row.exact_next_execution_mode,
      reason:
        row.classification === 'DUPLICATE_COLLAPSE'
          ? `${row.numeric_duplicate_ready_count} rows are deterministic duplicate-collapse candidates`
          : row.classification === 'MIXED_EXECUTION'
            ? row.numeric_promotion_ready_count === row.numeric_unresolved
              ? `numeric promotion subset and family realignment subset are both proven`
              : `numeric collapse subset and family realignment subset are both proven`
            : row.classification === 'NUMERIC_PROMOTION'
              ? `${row.numeric_unresolved} numeric rows, no canonical base overlap, stable printed_set_abbrev, zero live gv_id collisions`
              : row.classification === 'FAMILY_REALIGNMENT'
                ? row.alias_target_set_code
                  ? `${row.total_unresolved} rows collide one-to-one with canonical namespace owned by ${row.alias_target_set_code}`
                  : `${row.non_numeric_unresolved} non-numeric rows map 1:1 to canonical family lane ${row.family_lane_code}`
                : row.block_reason,
    }));
}

function buildSummary(perSet) {
  const counts = new Map([
    ['DUPLICATE_COLLAPSE', { set_count: 0, row_count: 0 }],
    ['NUMERIC_PROMOTION', { set_count: 0, row_count: 0 }],
    ['FAMILY_REALIGNMENT', { set_count: 0, row_count: 0 }],
    ['MIXED_EXECUTION', { set_count: 0, row_count: 0 }],
    ['BLOCKED_METADATA', { set_count: 0, row_count: 0 }],
    ['BLOCKED_UNSUPPORTED_FAMILY', { set_count: 0, row_count: 0 }],
    ['BLOCKED_SYMBOLIC', { set_count: 0, row_count: 0 }],
  ]);

  const totalRemainingRows = perSet.reduce((sum, row) => sum + row.total_unresolved, 0);
  for (const row of perSet) {
    const bucket = counts.get(row.classification);
    bucket.set_count += 1;
    bucket.row_count += row.total_unresolved;
  }

  return {
    total_sets: perSet.length,
    total_remaining_rows: totalRemainingRows,
    by_class: Object.fromEntries([...counts.entries()].map(([key, value]) => [key, value])),
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'remaining_identity_surface_global_audit_v1',
  });

  await client.connect();

  try {
    await client.query('begin read only');

    const unresolvedIdentityDomains = await queryRows(client, SQL.unresolvedIdentityDomains);
    if (unresolvedIdentityDomains.length !== 1) {
      throw new Error(`UNRESOLVED_IDENTITY_DOMAINS_DRIFT:${JSON.stringify(unresolvedIdentityDomains)}`);
    }
    if (unresolvedIdentityDomains[0].identity_domain !== TARGET_IDENTITY_DOMAIN) {
      throw new Error(`UNEXPECTED_IDENTITY_DOMAIN:${unresolvedIdentityDomains[0].identity_domain}`);
    }

    const inventorySummary = await queryRows(client, SQL.unresolvedInventorySummary);
    const unresolvedRows = await queryRows(client, SQL.unresolvedSurfaceRows);
    const canonicalRows = await queryRows(client, SQL.canonicalSurfaceRows);

    const inventoryTotal = inventorySummary.reduce(
      (sum, row) => sum + normalizeCount(row.total_unresolved),
      0,
    );
    if (inventoryTotal !== unresolvedRows.length) {
      throw new Error(`UNRESOLVED_INVENTORY_COUNT_DRIFT:${inventoryTotal}:${unresolvedRows.length}`);
    }

    const unresolvedRowsBySet = new Map();
    for (const row of unresolvedRows) {
      if (!row.set_code_identity) {
        throw new Error(`UNRESOLVED_ROW_MISSING_SET_CODE_IDENTITY:${row.card_print_id}`);
      }

      row.normalized_name = row.normalized_printed_name || normalizeName(row.unresolved_name);
      row.normalized_digits = normalizeDigits(row.printed_number);
      row.is_numeric = /^[0-9]+$/.test(row.printed_number);
      row.prefix = extractPrefix(row.printed_number);

      if (!unresolvedRowsBySet.has(row.set_code_identity)) {
        unresolvedRowsBySet.set(row.set_code_identity, []);
      }
      unresolvedRowsBySet.get(row.set_code_identity).push(row);
    }

    const canonicalRowsBySet = new Map();
    const liveRowsByGvId = new Map();
    for (const row of canonicalRows) {
      row.normalized_name = normalizeName(row.canonical_name);
      row.normalized_digits = normalizeDigits(row.number);

      if (!canonicalRowsBySet.has(row.set_code)) {
        canonicalRowsBySet.set(row.set_code, []);
      }
      canonicalRowsBySet.get(row.set_code).push(row);

      if (liveRowsByGvId.has(row.gv_id)) {
        throw new Error(`DUPLICATE_LIVE_GV_ID:${row.gv_id}`);
      }
      liveRowsByGvId.set(row.gv_id, row);
    }

    const canonicalSetCodes = [...canonicalRowsBySet.keys()].filter(Boolean).sort();
    const perSet = [...unresolvedRowsBySet.entries()]
      .map(([setCodeIdentity, rows]) =>
        buildSetMetrics({
          setCodeIdentity,
          rows,
          canonicalRowsBySet,
          canonicalSetCodes,
          liveRowsByGvId,
        }),
      )
      .sort((a, b) => b.total_unresolved - a.total_unresolved || a.set_code_identity.localeCompare(b.set_code_identity));

    const summary = buildSummary(perSet);
    const recommendedOrder = buildRecommendedOrder(perSet);
    const nextRecommended = recommendedOrder[0] ?? null;

    const report = {
      phase: PHASE,
      generated_at: new Date().toISOString(),
      target_identity_domain: TARGET_IDENTITY_DOMAIN,
      global_unresolved_set_list: inventorySummary.map((row) => row.set_code_identity),
      per_set_counts: inventorySummary,
      per_set_classification: perSet,
      blocker_list: perSet
        .filter((row) => row.blocked)
        .map((row) => ({
          set_code_identity: row.set_code_identity,
          classification: row.classification,
          block_reason: row.block_reason,
        })),
      recommended_next_set: nextRecommended?.set_code_identity ?? null,
      recommended_next_mode: nextRecommended?.exact_next_execution_mode ?? null,
      recommended_order: recommendedOrder,
      summary,
      current_truths: [
        `identity_domain=${TARGET_IDENTITY_DOMAIN}`,
        `remaining_sets=${summary.total_sets}`,
        `remaining_rows=${summary.total_remaining_rows}`,
        `duplicate_collapse_sets=${summary.by_class.DUPLICATE_COLLAPSE.set_count}`,
        `numeric_promotion_sets=${summary.by_class.NUMERIC_PROMOTION.set_count}`,
        `family_realignment_sets=${summary.by_class.FAMILY_REALIGNMENT.set_count}`,
        `mixed_execution_sets=${summary.by_class.MIXED_EXECUTION.set_count}`,
      ],
      status: 'audit_complete',
    };

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
