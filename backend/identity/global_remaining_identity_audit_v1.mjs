import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'GLOBAL_REMAINING_IDENTITY_AUDIT_V1';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'global_remaining_identity_audit_v1.json',
);

const CLASS_ACTIONS = {
  'CLASS A — DUPLICATE COLLAPSE': 'collapse',
  'CLASS B — NUMERIC PROMOTION': 'promote',
  'CLASS C — FAMILY REALIGNMENT': 'realign',
  'CLASS D — MIXED COLLAPSE': 'split + collapse',
  'CLASS E — PROMO / PREFIX SYSTEM': 'new pattern contract needed',
  'CLASS F — BLOCKED': 'fix identity first',
};

const CLASS_ORDER = [
  'CLASS A — DUPLICATE COLLAPSE',
  'CLASS B — NUMERIC PROMOTION',
  'CLASS C — FAMILY REALIGNMENT',
  'CLASS D — MIXED COLLAPSE',
  'CLASS E — PROMO / PREFIX SYSTEM',
  'CLASS F — BLOCKED',
];

const EXECUTION_PRIORITY = {
  'CLASS A — DUPLICATE COLLAPSE': 1,
  'CLASS D — MIXED COLLAPSE': 2,
  'CLASS C — FAMILY REALIGNMENT': 3,
  'CLASS B — NUMERIC PROMOTION': 4,
  'CLASS E — PROMO / PREFIX SYSTEM': 5,
  'CLASS F — BLOCKED': 6,
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

function arrayFromCounts(map) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));
}

function objectFromCounts(map) {
  return Object.fromEntries(
    [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  );
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

function detectCandidateFamilySets(setCode, canonicalSetCodes) {
  const normalizedSetCode = normalizeSetCodeForPattern(setCode);
  const candidates = new Set();

  for (const code of canonicalSetCodes) {
    if (code === setCode) {
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

function summarizeCollisionTargets(rows) {
  const counts = new Map();

  for (const row of rows) {
    const key = row.live_set_code ?? '__NULL__';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function classifySet(metrics) {
  const riskFlags = [];
  const blockedReasons = [];

  if (!metrics.printed_set_abbrev_present) {
    riskFlags.push('printed_set_abbrev_missing');
    blockedReasons.push('printed_set_abbrev missing');
  }
  if (metrics.printed_set_abbrev_inconsistent) {
    riskFlags.push('printed_set_abbrev_inconsistent');
    blockedReasons.push('printed_set_abbrev inconsistent');
  }
  if (!metrics.printed_total_present) {
    riskFlags.push('printed_total_missing');
  }
  if (metrics.printed_total_inconsistent) {
    riskFlags.push('printed_total_inconsistent');
  }
  if (metrics.gv_id_derivation_error_count > 0) {
    riskFlags.push('gv_id_derivation_error');
    blockedReasons.push('gv_id derivation error');
  }
  if (metrics.numeric_multiple_match_count > 0) {
    riskFlags.push('numeric_multiple_match');
    blockedReasons.push('numeric collapse multiple-match ambiguity');
  }
  if (metrics.family_multiple_match_count > 0) {
    riskFlags.push('family_multiple_match');
    blockedReasons.push('family collapse multiple-match ambiguity');
  }
  if (metrics.base_exact_number_different_name_count > 0) {
    riskFlags.push('base_exact_number_different_name');
    blockedReasons.push('base exact-number different-name overlap');
  }
  if (metrics.family_exact_number_different_name_count > 0) {
    riskFlags.push('family_exact_number_different_name');
    blockedReasons.push('family exact-number different-name overlap');
  }
  if (
    metrics.proposed_gv_id_collision_set_codes.length > 0 &&
    metrics.proposed_gv_id_collision_set_codes.includes('__NULL__')
  ) {
    riskFlags.push('gv_id_collision_target_set_null');
    blockedReasons.push('gv_id collision target set_code is null');
  }

  const numericOnly = metrics.non_numeric_unresolved === 0;
  const nonNumericOnly = metrics.numeric_unresolved === 0 && metrics.non_numeric_unresolved > 0;
  const hardBlocked = blockedReasons.length > 0;

  const clearNumericCollapse =
    metrics.numeric_unresolved > 0 &&
    metrics.numeric_duplicate_collapse_ready_count === metrics.numeric_unresolved &&
    metrics.numeric_multiple_match_count === 0 &&
    metrics.base_exact_number_different_name_count === 0;

  const clearNumericPromotion =
    numericOnly &&
    metrics.numeric_unresolved > 0 &&
    metrics.numeric_with_canonical_match_count === 0 &&
    metrics.numeric_duplicate_collapse_ready_count === 0 &&
    metrics.numeric_multiple_match_count === 0 &&
    metrics.base_exact_number_different_name_count === 0 &&
    metrics.proposed_gv_id_live_collision_count === 0;

  const clearFamilyLane =
    metrics.non_numeric_unresolved > 0 &&
    metrics.family_overlap_count === metrics.non_numeric_unresolved &&
    metrics.family_unmatched_count === 0 &&
    metrics.family_multiple_match_count === 0 &&
    metrics.family_exact_number_different_name_count === 0;

  const aliasCollisionRealignment =
    numericOnly &&
    metrics.canonical_base_count === 0 &&
    metrics.proposed_gv_id_live_collision_count === metrics.total_unresolved &&
    metrics.proposed_gv_id_collision_set_codes.length === 1 &&
    metrics.proposed_gv_id_collision_set_codes[0] !== '__NULL__';

  if (hardBlocked) {
    return {
      classification: 'CLASS F — BLOCKED',
      recommended_action: CLASS_ACTIONS['CLASS F — BLOCKED'],
      blocked_reason: blockedReasons.join('; '),
      risk_flags: [...new Set(riskFlags)].sort(),
    };
  }

  if (aliasCollisionRealignment) {
    return {
      classification: 'CLASS C — FAMILY REALIGNMENT',
      recommended_action: CLASS_ACTIONS['CLASS C — FAMILY REALIGNMENT'],
      blocked_reason: null,
      risk_flags: [...new Set(riskFlags)].sort(),
    };
  }

  if (nonNumericOnly && clearFamilyLane) {
    return {
      classification: 'CLASS C — FAMILY REALIGNMENT',
      recommended_action: CLASS_ACTIONS['CLASS C — FAMILY REALIGNMENT'],
      blocked_reason: null,
      risk_flags: [...new Set(riskFlags)].sort(),
    };
  }

  if (
    metrics.numeric_unresolved > 0 &&
    metrics.non_numeric_unresolved > 0 &&
    clearNumericCollapse &&
    clearFamilyLane
  ) {
    return {
      classification: 'CLASS D — MIXED COLLAPSE',
      recommended_action: CLASS_ACTIONS['CLASS D — MIXED COLLAPSE'],
      blocked_reason: null,
      risk_flags: [...new Set(riskFlags)].sort(),
    };
  }

  if (numericOnly && clearNumericCollapse) {
    return {
      classification: 'CLASS A — DUPLICATE COLLAPSE',
      recommended_action: CLASS_ACTIONS['CLASS A — DUPLICATE COLLAPSE'],
      blocked_reason: null,
      risk_flags: [...new Set(riskFlags)].sort(),
    };
  }

  if (clearNumericPromotion) {
    return {
      classification: 'CLASS B — NUMERIC PROMOTION',
      recommended_action: CLASS_ACTIONS['CLASS B — NUMERIC PROMOTION'],
      blocked_reason: null,
      risk_flags: [...new Set(riskFlags)].sort(),
    };
  }

  if (metrics.non_numeric_unresolved > 0) {
    return {
      classification: 'CLASS E — PROMO / PREFIX SYSTEM',
      recommended_action: CLASS_ACTIONS['CLASS E — PROMO / PREFIX SYSTEM'],
      blocked_reason: null,
      risk_flags: [...new Set(riskFlags)].sort(),
    };
  }

  return {
    classification: 'CLASS F — BLOCKED',
    recommended_action: CLASS_ACTIONS['CLASS F — BLOCKED'],
    blocked_reason: 'numeric surface does not fit current collapse or promotion contracts',
    risk_flags: [...new Set(riskFlags)].sort(),
  };
}

function buildSetMetrics({
  setCodeIdentity,
  rows,
  canonicalRows,
  canonicalSetCodes,
  liveRowsByGvId,
}) {
  const baseRows = canonicalRows.filter((row) => row.set_code === setCodeIdentity);
  const numericRows = rows.filter((row) => row.is_numeric);
  const nonNumericRows = rows.filter((row) => !row.is_numeric);
  const familyCandidateSets = detectCandidateFamilySets(setCodeIdentity, canonicalSetCodes);

  let baseOverlapCount = 0;
  let numericBaseStrictOverlapCount = 0;
  let numericWithCanonicalMatchCount = 0;
  let numericWithoutCanonicalMatchCount = 0;
  let numericDuplicateCollapseReadyCount = 0;
  let numericMultipleMatchCount = 0;
  let baseExactNumberDifferentNameCount = 0;
  let familyOverlapCount = 0;
  let familyMultipleMatchCount = 0;
  let familyUnmatchedCount = 0;
  let familyExactNumberDifferentNameCount = 0;

  const familySetCounts = new Map();
  const prefixCounts = new Map();
  const prefixSummaries = new Map();
  const sampleCollisionRows = [];
  let missingPrintedSetAbbrevCount = 0;
  let gvIdDerivationErrorCount = 0;
  let proposedGvIdLiveCollisionCount = 0;

  for (const row of rows) {
    const baseExactMatches = baseRows.filter(
      (canonicalRow) => canonicalRow.number === row.printed_number,
    );
    const baseExactSameNameMatches = baseExactMatches.filter(
      (canonicalRow) => canonicalRow.normalized_name === row.normalized_name,
    );

    if (baseExactSameNameMatches.length > 0) {
      baseOverlapCount += 1;
      if (row.is_numeric) {
        numericBaseStrictOverlapCount += 1;
      }
    } else if (baseExactMatches.length > 0) {
      baseExactNumberDifferentNameCount += 1;
    }

    if (row.is_numeric) {
      if (baseExactMatches.length > 0) {
        numericWithCanonicalMatchCount += 1;
      } else {
        numericWithoutCanonicalMatchCount += 1;
      }

      const numericCollapseTargets = baseRows.filter(
        (canonicalRow) =>
          canonicalRow.normalized_digits === row.normalized_digits &&
          canonicalRow.normalized_name === row.normalized_name,
      );

      if (numericCollapseTargets.length === 1) {
        numericDuplicateCollapseReadyCount += 1;
      } else if (numericCollapseTargets.length > 1) {
        numericMultipleMatchCount += 1;
      }
    } else {
      const prefix = row.prefix;
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);

      const prefixSummary = prefixSummaries.get(prefix) ?? {
        prefix,
        count: 0,
        canonical_match_count: 0,
        family_unmatched_count: 0,
        family_set_codes: new Set(),
      };
      prefixSummary.count += 1;

      const familyExactMatches = canonicalRows.filter(
        (canonicalRow) =>
          canonicalRow.set_code !== setCodeIdentity &&
          canonicalRow.number === row.printed_number &&
          canonicalRow.normalized_name === row.normalized_name,
      );
      const familyDifferentNameMatches = canonicalRows.filter(
        (canonicalRow) =>
          canonicalRow.set_code !== setCodeIdentity &&
          canonicalRow.number === row.printed_number &&
          canonicalRow.normalized_name !== row.normalized_name,
      );

      if (familyExactMatches.length > 0) {
        familyOverlapCount += 1;
        prefixSummary.canonical_match_count += 1;

        const distinctSetCodes = new Set(familyExactMatches.map((match) => match.set_code));
        for (const familySetCode of distinctSetCodes) {
          familySetCounts.set(familySetCode, (familySetCounts.get(familySetCode) ?? 0) + 1);
          prefixSummary.family_set_codes.add(familySetCode);
        }

        if (familyExactMatches.length > 1) {
          familyMultipleMatchCount += 1;
        }
      } else if (familyDifferentNameMatches.length > 0) {
        familyExactNumberDifferentNameCount += 1;
        prefixSummary.family_unmatched_count += 1;
        familyUnmatchedCount += 1;
      } else {
        prefixSummary.family_unmatched_count += 1;
        familyUnmatchedCount += 1;
      }

      prefixSummaries.set(prefix, prefixSummary);
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
      proposedGvIdLiveCollisionCount += 1;
      if (sampleCollisionRows.length < 5) {
        sampleCollisionRows.push({
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

  const printedSetAbbrevValues = [...new Set(rows.map((row) => row.printed_set_abbrev).filter(Boolean))].sort();
  const printedTotalValues = [...new Set(rows.map((row) => row.printed_total).filter((value) => value != null))].sort(
    (a, b) => Number(a) - Number(b),
  );

  const collisionRows = [];
  for (const row of rows) {
    if (!row.printed_set_abbrev) {
      continue;
    }
    try {
      const proposedGvId = buildCardPrintGvIdV1({
        printedSetAbbrev: row.printed_set_abbrev,
        number: row.printed_number,
        variantKey: row.variant_key,
      });
      const collisionTarget = liveRowsByGvId.get(proposedGvId) ?? null;
      if (collisionTarget) {
        collisionRows.push({
          live_set_code: collisionTarget.set_code ?? '__NULL__',
        });
      }
    } catch {
      // Counted above; no additional handling required here.
    }
  }

  const collisionSetCounts = summarizeCollisionTargets(collisionRows);
  const canonicalFamilySetsDetected = [...familySetCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([setCode]) => setCode);

  const prefixPatternBreakdown = [...prefixSummaries.values()]
    .map((summary) => ({
      prefix: summary.prefix,
      count: summary.count,
      canonical_match_count: summary.canonical_match_count,
      family_unmatched_count: summary.family_unmatched_count,
      canonical_family_sets: [...summary.family_set_codes].sort(),
    }))
    .sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix));

  const metrics = {
    set_code_identity: setCodeIdentity,
    total_unresolved: rows.length,
    numeric_unresolved: numericRows.length,
    non_numeric_unresolved: nonNumericRows.length,
    canonical_base_count: baseRows.length,
    base_overlap_count: baseOverlapCount,
    numeric_base_strict_overlap_count: numericBaseStrictOverlapCount,
    base_exact_number_different_name_count: baseExactNumberDifferentNameCount,
    canonical_family_sets_detected: canonicalFamilySetsDetected,
    canonical_family_candidate_sets: familyCandidateSets,
    family_overlap_count: familyOverlapCount,
    family_multiple_match_count: familyMultipleMatchCount,
    family_unmatched_count: familyUnmatchedCount,
    family_exact_number_different_name_count: familyExactNumberDifferentNameCount,
    numeric_duplicate_collapse_ready_count: numericDuplicateCollapseReadyCount,
    numeric_with_canonical_match_count: numericWithCanonicalMatchCount,
    numeric_without_canonical_match_count: numericWithoutCanonicalMatchCount,
    numeric_multiple_match_count: numericMultipleMatchCount,
    family_patterns: prefixPatternBreakdown,
    prefix_count_by_code: objectFromCounts(prefixCounts),
    canonical_family_match_count_by_set: objectFromCounts(familySetCounts),
    printed_set_abbrev_present: printedSetAbbrevValues.length > 0,
    printed_set_abbrev_inconsistent: printedSetAbbrevValues.length > 1,
    printed_set_abbrev_values: printedSetAbbrevValues,
    printed_total_present: printedTotalValues.length > 0,
    printed_total_inconsistent: printedTotalValues.length > 1,
    printed_total_values: printedTotalValues,
    missing_printed_set_abbrev_count: missingPrintedSetAbbrevCount,
    gv_id_derivation_error_count: gvIdDerivationErrorCount,
    proposed_gv_id_live_collision_count: proposedGvIdLiveCollisionCount,
    proposed_gv_id_collision_set_codes: [...collisionSetCounts.keys()].sort(),
    proposed_gv_id_collision_set_code_counts: objectFromCounts(collisionSetCounts),
    sample_gv_id_collisions: sampleCollisionRows,
  };

  return {
    ...metrics,
    ...classifySet(metrics),
  };
}

function buildSummary(perSetClassifications) {
  const classStats = new Map(
    CLASS_ORDER.map((classification) => [
      classification,
      { classification, set_count: 0, row_count: 0, percentage_of_remaining_rows: 0 },
    ]),
  );

  const totalRemainingRows = perSetClassifications.reduce(
    (sum, row) => sum + normalizeCount(row.total_unresolved),
    0,
  );

  for (const row of perSetClassifications) {
    const stats = classStats.get(row.classification);
    stats.set_count += 1;
    stats.row_count += normalizeCount(row.total_unresolved);
  }

  for (const stats of classStats.values()) {
    stats.percentage_of_remaining_rows =
      totalRemainingRows === 0
        ? 0
        : Number(((stats.row_count / totalRemainingRows) * 100).toFixed(2));
  }

  return {
    total_sets: perSetClassifications.length,
    total_remaining_rows: totalRemainingRows,
    class_A_count: classStats.get('CLASS A — DUPLICATE COLLAPSE').set_count,
    class_B_count: classStats.get('CLASS B — NUMERIC PROMOTION').set_count,
    class_C_count: classStats.get('CLASS C — FAMILY REALIGNMENT').set_count,
    class_D_count: classStats.get('CLASS D — MIXED COLLAPSE').set_count,
    class_E_count: classStats.get('CLASS E — PROMO / PREFIX SYSTEM').set_count,
    class_F_count: classStats.get('CLASS F — BLOCKED').set_count,
    class_A_rows: classStats.get('CLASS A — DUPLICATE COLLAPSE').row_count,
    class_B_rows: classStats.get('CLASS B — NUMERIC PROMOTION').row_count,
    class_C_rows: classStats.get('CLASS C — FAMILY REALIGNMENT').row_count,
    class_D_rows: classStats.get('CLASS D — MIXED COLLAPSE').row_count,
    class_E_rows: classStats.get('CLASS E — PROMO / PREFIX SYSTEM').row_count,
    class_F_rows: classStats.get('CLASS F — BLOCKED').row_count,
    class_breakdown: CLASS_ORDER.map((classification) => classStats.get(classification)),
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'global_remaining_identity_audit_v1',
  });

  await client.connect();

  try {
    await client.query('begin read only');

    const unresolvedIdentityDomains = await queryRows(client, SQL.unresolvedIdentityDomains);
    if (unresolvedIdentityDomains.length !== 1) {
      throw new Error(
        `UNRESOLVED_IDENTITY_DOMAIN_DRIFT:${JSON.stringify(unresolvedIdentityDomains)}`,
      );
    }
    if (unresolvedIdentityDomains[0].identity_domain !== TARGET_IDENTITY_DOMAIN) {
      throw new Error(
        `UNEXPECTED_UNRESOLVED_IDENTITY_DOMAIN:${unresolvedIdentityDomains[0].identity_domain}`,
      );
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

    const unresolvedByCardPrintId = new Map();
    for (const row of unresolvedRows) {
      if (!row.set_code_identity) {
        throw new Error(`UNRESOLVED_ROW_MISSING_SET_CODE_IDENTITY:${row.card_print_id}`);
      }

      if (unresolvedByCardPrintId.has(row.card_print_id)) {
        throw new Error(`UNRESOLVED_CARD_PRINT_DUPLICATE_ACTIVE_IDENTITY:${row.card_print_id}`);
      }
      unresolvedByCardPrintId.set(row.card_print_id, row.set_code_identity);

      row.normalized_name = row.normalized_printed_name || normalizeName(row.unresolved_name);
      row.normalized_digits = normalizeDigits(row.printed_number);
      row.is_numeric = /^[0-9]+$/.test(row.printed_number);
      row.prefix = extractPrefix(row.printed_number);
    }

    const liveRowsByGvId = new Map();
    for (const row of canonicalRows) {
      row.normalized_name = normalizeName(row.canonical_name);
      row.normalized_digits = normalizeDigits(row.number);

      if (liveRowsByGvId.has(row.gv_id)) {
        throw new Error(`DUPLICATE_LIVE_GV_ID:${row.gv_id}`);
      }
      liveRowsByGvId.set(row.gv_id, row);
    }

    const canonicalSetCodes = [...new Set(canonicalRows.map((row) => row.set_code).filter(Boolean))].sort();
    const unresolvedRowsBySet = new Map();
    for (const row of unresolvedRows) {
      if (!unresolvedRowsBySet.has(row.set_code_identity)) {
        unresolvedRowsBySet.set(row.set_code_identity, []);
      }
      unresolvedRowsBySet.get(row.set_code_identity).push(row);
    }

    const perSetClassifications = [...unresolvedRowsBySet.entries()]
      .map(([setCodeIdentity, rows]) =>
        buildSetMetrics({
          setCodeIdentity,
          rows,
          canonicalRows,
          canonicalSetCodes,
          liveRowsByGvId,
        }),
      )
      .sort((a, b) => b.total_unresolved - a.total_unresolved || a.set_code_identity.localeCompare(b.set_code_identity));

    const summary = buildSummary(perSetClassifications);
    const executionPriorityOrder = [...perSetClassifications]
      .sort((a, b) => {
        const classDelta = EXECUTION_PRIORITY[a.classification] - EXECUTION_PRIORITY[b.classification];
        if (classDelta !== 0) {
          return classDelta;
        }
        return b.total_unresolved - a.total_unresolved || a.set_code_identity.localeCompare(b.set_code_identity);
      })
      .map((row) => ({
        set_code_identity: row.set_code_identity,
        classification: row.classification,
        recommended_action: row.recommended_action,
        total_unresolved: row.total_unresolved,
      }));

    const report = {
      phase: PHASE,
      generated_at: new Date().toISOString(),
      target_identity_domain: TARGET_IDENTITY_DOMAIN,
      summary,
      unresolved_identity_domains: unresolvedIdentityDomains,
      inventory_summary: inventorySummary,
      per_set: perSetClassifications,
      execution_priority_order: executionPriorityOrder,
      sets_executable_immediately: executionPriorityOrder.filter((row) =>
        ['CLASS A — DUPLICATE COLLAPSE', 'CLASS B — NUMERIC PROMOTION', 'CLASS C — FAMILY REALIGNMENT', 'CLASS D — MIXED COLLAPSE'].includes(row.classification),
      ),
      sets_requiring_new_contracts: perSetClassifications
        .filter((row) => row.classification === 'CLASS E — PROMO / PREFIX SYSTEM')
        .map((row) => row.set_code_identity),
      blocked_sets: perSetClassifications
        .filter((row) => row.classification === 'CLASS F — BLOCKED')
        .map((row) => ({
          set_code_identity: row.set_code_identity,
          blocked_reason: row.blocked_reason,
        })),
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
