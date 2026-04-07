import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { normalizeCardNameV1 } from './normalizeCardNameV1.mjs';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'REMAINING_IDENTITY_SURFACE_GLOBAL_AUDIT_V2';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'remaining_identity_surface_global_audit_v2.json',
);
const MARKDOWN_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'REMAINING_IDENTITY_SURFACE_GLOBAL_AUDIT_V2.md',
);

const COMPANION_LANES = Object.freeze({
  'swsh4.5': { code: 'swsh45sv', lane_type: 'family' },
  swsh9: { code: 'swsh9tg', lane_type: 'family' },
  swsh10: { code: 'swsh10tg', lane_type: 'family' },
  swsh11: { code: 'swsh11tg', lane_type: 'family' },
  swsh12: { code: 'swsh12tg', lane_type: 'family' },
  exu: { code: 'ex10', lane_type: 'alias' },
  hgssp: { code: 'hsp', lane_type: 'alias' },
});

const EXACT_TOKEN_CONTRACTS = Object.freeze({
  smp: /^SM[0-9]+$/i,
  ecard3: /^(?:[0-9]+|H[0-9]+)$/i,
  col1: /^(?:[0-9]+|SL[0-9]+)$/i,
});

const SYMBOLIC_PREFIXES = new Set([
  'SYMBOLIC',
  'SM',
  'XY',
  'BW',
  'SWSH',
  'SVP',
  'HGSS',
  'PROMO',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
]);

const CLASS_PRIORITY = Object.freeze({
  ALIAS_COLLAPSE: 1,
  DUPLICATE_COLLAPSE: 2,
  NUMERIC_PROMOTION: 3,
  EXACT_TOKEN_PROMOTION: 4,
  FAMILY_REALIGNMENT: 5,
  MIXED_EXECUTION: 6,
  BLOCKED_CONFLICT: 7,
  BLOCKED_UNSUPPORTED_FAMILY: 8,
  BLOCKED_SYMBOLIC: 9,
  BLOCKED_METADATA: 10,
});

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
      cp.number as parent_number,
      cp.number_plain as parent_number_plain,
      cp.variant_key,
      cp.set_code as parent_set_code,
      cpi.identity_domain,
      cpi.set_code_identity,
      cpi.printed_number,
      cpi.normalized_printed_name,
      cpi.identity_key_version,
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
      cp.number_plain,
      cp.variant_key,
      cp.gv_id,
      s.printed_set_abbrev,
      s.printed_total
    from public.card_prints cp
    left join public.sets s
      on s.id = cp.set_id
    where cp.gv_id is not null
    order by cp.set_code, cp.number, cp.id
  `,
};

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeText(filePath, content) {
  ensureOutputDir(filePath);
  fs.writeFileSync(filePath, content);
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

function normalizeRepoName(value, canonName = null) {
  const normalized = canonName
    ? normalizeCardNameV1(value, { canonName }).corrected_name
    : normalizeCardNameV1(value).corrected_name;

  if (!normalized) {
    throw new Error(`NAME_NORMALIZATION_FAILED:${String(value ?? 'null')}`);
  }

  return normalized.toLowerCase();
}

function normalizeDigits(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  return digits.replace(/^0+/, '') || '0';
}

function normalizeSetCodeForMode(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function extractPrefix(printedNumber) {
  const value = String(printedNumber ?? '').trim();
  if (/^[0-9]+$/.test(value)) {
    return 'NUMERIC';
  }

  const alphaPrefix = value.match(/^[A-Za-z]+/);
  if (alphaPrefix) {
    return alphaPrefix[0].toUpperCase();
  }

  return 'SYMBOLIC';
}

function isNumericToken(value) {
  return /^[0-9]+$/.test(String(value ?? '').trim());
}

function isSetExactTokenContract(value) {
  return Object.prototype.hasOwnProperty.call(EXACT_TOKEN_CONTRACTS, value);
}

function isTokenValidForSet(setCodeIdentity, printedNumber) {
  const contract = EXACT_TOKEN_CONTRACTS[setCodeIdentity];
  if (contract) {
    return contract.test(String(printedNumber ?? '').trim());
  }

  return isNumericToken(printedNumber);
}

function looksSymbolicToken(value) {
  const token = String(value ?? '').trim();
  return (
    /^[A-Za-z]+[0-9]+$/.test(token) ||
    /^[0-9]+[A-Za-z]+$/.test(token) ||
    /^[A-Za-z]$/.test(token) ||
    token === '!'
  );
}

function isSymbolicSet(prefixBreakdown, rows) {
  if (prefixBreakdown.some((row) => SYMBOLIC_PREFIXES.has(row.prefix))) {
    return true;
  }

  return rows.some((row) => looksSymbolicToken(row.printed_number));
}

function compareNamesCanonAware(unresolvedName, canonicalName) {
  return normalizeRepoName(unresolvedName, canonicalName) === normalizeRepoName(canonicalName);
}

function deriveProposedGvId(row) {
  return buildCardPrintGvIdV1({
    setCode: row.set_code_identity,
    printedSetAbbrev: row.printed_set_abbrev,
    number: row.printed_number,
    numberPlain: null,
    variantKey: row.variant_key,
  });
}

function deriveCanonicalContractGvId(row) {
  return buildCardPrintGvIdV1({
    setCode: row.set_code,
    printedSetAbbrev: row.printed_set_abbrev,
    number: row.number,
    numberPlain: row.number_plain,
    variantKey: row.variant_key,
  });
}

function detectQualifierReviewReason(row) {
  if (normalizeTextOrNull(row.variant_key)) {
    return 'variant_key_present';
  }

  const name = normalizeTextOrNull(row.unresolved_name) ?? '';
  if (/\bstaff\b/i.test(name)) return 'name_contains_staff';
  if (/\bprerelease\b/i.test(name)) return 'name_contains_prerelease';
  if (/\bstamp(?:ed)?\b/i.test(name)) return 'name_contains_stamp';
  return null;
}

function buildExactTokenAudit(rows, candidateRows) {
  const candidateByToken = new Map();
  for (const candidate of candidateRows) {
    const token = normalizeTextOrNull(candidate.number);
    if (!token) {
      continue;
    }

    const bucket = candidateByToken.get(token) ?? [];
    bucket.push(candidate);
    candidateByToken.set(token, bucket);
  }

  const rowAudits = [];
  const matchedTargets = new Map();
  let readyCount = 0;
  let multipleMatchCount = 0;
  let unmatchedCount = 0;
  let sameTokenSameNameCount = 0;
  let sameTokenDifferentNameCount = 0;

  for (const row of rows) {
    const token = normalizeTextOrNull(row.printed_number);
    const sameTokenRows = token ? candidateByToken.get(token) ?? [] : [];
    const nameMatches = sameTokenRows.filter((candidate) =>
      compareNamesCanonAware(row.unresolved_name, candidate.canonical_name),
    );

    if (sameTokenRows.length > 0 && nameMatches.length === 0) {
      sameTokenDifferentNameCount += 1;
    }
    if (nameMatches.length > 0) {
      sameTokenSameNameCount += 1;
    }

    if (nameMatches.length === 1) {
      readyCount += 1;
      matchedTargets.set(
        nameMatches[0].canonical_card_print_id,
        (matchedTargets.get(nameMatches[0].canonical_card_print_id) ?? 0) + 1,
      );
    } else if (nameMatches.length > 1) {
      multipleMatchCount += 1;
    } else {
      unmatchedCount += 1;
    }

    rowAudits.push({
      card_print_id: row.card_print_id,
      printed_number: row.printed_number,
      unresolved_name: row.unresolved_name,
      same_token_candidate_count: sameTokenRows.length,
      same_token_same_name_match_count: nameMatches.length,
      candidate_target_ids: nameMatches.map((candidate) => candidate.canonical_card_print_id),
      same_token_different_name: sameTokenRows.length > 0 && nameMatches.length === 0,
    });
  }

  return {
    row_audits: rowAudits,
    ready_count: readyCount,
    multiple_match_count: multipleMatchCount,
    unmatched_count: unmatchedCount,
    same_token_same_name_count: sameTokenSameNameCount,
    same_token_different_name_count: sameTokenDifferentNameCount,
    reused_target_count: [...matchedTargets.values()].filter((count) => count > 1).length,
  };
}

function buildNumericAudit(rows, candidateRows) {
  const candidateByDigits = new Map();
  for (const candidate of candidateRows) {
    const digits = normalizeDigits(candidate.number);
    if (!digits) {
      continue;
    }

    const bucket = candidateByDigits.get(digits) ?? [];
    bucket.push(candidate);
    candidateByDigits.set(digits, bucket);
  }

  const rowAudits = [];
  const matchedTargets = new Map();
  let readyCount = 0;
  let multipleMatchCount = 0;
  let unmatchedCount = 0;
  let sameNumberSameNameCount = 0;
  let sameNumberDifferentNameCount = 0;
  let withCanonicalMatchCount = 0;
  let withoutCanonicalMatchCount = 0;

  for (const row of rows) {
    const sameDigitsRows = row.normalized_digits
      ? candidateByDigits.get(row.normalized_digits) ?? []
      : [];
    const nameMatches = sameDigitsRows.filter((candidate) =>
      compareNamesCanonAware(row.unresolved_name, candidate.canonical_name),
    );

    if (sameDigitsRows.length > 0) {
      withCanonicalMatchCount += 1;
    } else {
      withoutCanonicalMatchCount += 1;
    }

    if (sameDigitsRows.length > 0 && nameMatches.length === 0) {
      sameNumberDifferentNameCount += 1;
    }
    if (nameMatches.length > 0) {
      sameNumberSameNameCount += 1;
    }

    if (nameMatches.length === 1) {
      readyCount += 1;
      matchedTargets.set(
        nameMatches[0].canonical_card_print_id,
        (matchedTargets.get(nameMatches[0].canonical_card_print_id) ?? 0) + 1,
      );
    } else if (nameMatches.length > 1) {
      multipleMatchCount += 1;
    } else {
      unmatchedCount += 1;
    }

    rowAudits.push({
      card_print_id: row.card_print_id,
      printed_number: row.printed_number,
      unresolved_name: row.unresolved_name,
      normalized_digits: row.normalized_digits,
      same_number_candidate_count: sameDigitsRows.length,
      same_number_same_name_match_count: nameMatches.length,
      candidate_target_ids: nameMatches.map((candidate) => candidate.canonical_card_print_id),
      same_number_different_name: sameDigitsRows.length > 0 && nameMatches.length === 0,
    });
  }

  return {
    row_audits: rowAudits,
    ready_count: readyCount,
    multiple_match_count: multipleMatchCount,
    unmatched_count: unmatchedCount,
    same_number_same_name_count: sameNumberSameNameCount,
    same_number_different_name_count: sameNumberDifferentNameCount,
    with_canonical_match_count: withCanonicalMatchCount,
    without_canonical_match_count: withoutCanonicalMatchCount,
    reused_target_count: [...matchedTargets.values()].filter((count) => count > 1).length,
  };
}

function buildPromotionAudit({
  rows,
  baseRows,
  liveRowsByGvId,
  companionRows,
}) {
  const rowAudits = [];
  const conflictSamples = [];
  const internalCountByGvId = new Map();
  let deriveErrorCount = 0;
  let qualifierReviewCount = 0;
  let sameTokenConflictCount = 0;
  let liveCollisionCount = 0;
  let promotionReadyCount = 0;

  const baseNumericAudit = buildNumericAudit(rows.filter((row) => row.is_numeric), baseRows);
  const baseExactAudit = buildExactTokenAudit(rows.filter((row) => !row.is_numeric), baseRows);
  const companionExactAudit = companionRows.length > 0 ? buildExactTokenAudit(rows, companionRows) : null;
  const baseNumericById = new Map(baseNumericAudit.row_audits.map((row) => [row.card_print_id, row]));
  const baseExactById = new Map(baseExactAudit.row_audits.map((row) => [row.card_print_id, row]));
  const companionById = new Map((companionExactAudit?.row_audits ?? []).map((row) => [row.card_print_id, row]));

  for (const row of rows) {
    const tokenValid = isTokenValidForSet(row.set_code_identity, row.printed_number);
    const qualifierReason = detectQualifierReviewReason(row);
    const baseNumericRow = baseNumericById.get(row.card_print_id);
    const baseExactRow = baseExactById.get(row.card_print_id);
    const companionRow = companionById.get(row.card_print_id);
    const hasCompanionTarget = companionRow ? companionRow.same_token_same_name_match_count > 0 : false;
    const hasBaseTarget = row.is_numeric
      ? (baseNumericRow?.same_number_same_name_match_count ?? 0) > 0
      : (baseExactRow?.same_token_same_name_match_count ?? 0) > 0;
    const hasSameTokenConflict = row.is_numeric
      ? (baseNumericRow?.same_number_different_name ?? false)
      : (baseExactRow?.same_token_different_name ?? false);

    if (qualifierReason) {
      qualifierReviewCount += 1;
      rowAudits.push({
        card_print_id: row.card_print_id,
        printed_number: row.printed_number,
        unresolved_name: row.unresolved_name,
        promotion_safe: false,
        block_reason: qualifierReason,
        proposed_gv_id: null,
      });
      continue;
    }

    if (!tokenValid) {
      rowAudits.push({
        card_print_id: row.card_print_id,
        printed_number: row.printed_number,
        unresolved_name: row.unresolved_name,
        promotion_safe: false,
        block_reason: 'invalid_token_under_contract',
        proposed_gv_id: null,
      });
      continue;
    }

    if (hasCompanionTarget || hasBaseTarget) {
      rowAudits.push({
        card_print_id: row.card_print_id,
        printed_number: row.printed_number,
        unresolved_name: row.unresolved_name,
        promotion_safe: false,
        block_reason: hasCompanionTarget ? 'companion_lane_target_exists' : 'canonical_target_exists',
        proposed_gv_id: null,
      });
      continue;
    }

    if (hasSameTokenConflict) {
      sameTokenConflictCount += 1;
      rowAudits.push({
        card_print_id: row.card_print_id,
        printed_number: row.printed_number,
        unresolved_name: row.unresolved_name,
        promotion_safe: false,
        block_reason: 'same_token_different_name_conflict',
        proposed_gv_id: null,
      });
      if (conflictSamples.length < 10) {
        conflictSamples.push({
          card_print_id: row.card_print_id,
          printed_number: row.printed_number,
          unresolved_name: row.unresolved_name,
          reason: 'same_token_different_name_conflict',
        });
      }
      continue;
    }

    let proposedGvId = null;
    try {
      proposedGvId = deriveProposedGvId(row);
    } catch (error) {
      deriveErrorCount += 1;
      rowAudits.push({
        card_print_id: row.card_print_id,
        printed_number: row.printed_number,
        unresolved_name: row.unresolved_name,
        promotion_safe: false,
        block_reason: error.message,
        proposed_gv_id: null,
      });
      continue;
    }

    const liveCollision = liveRowsByGvId.get(proposedGvId) ?? null;
    if (liveCollision) {
      liveCollisionCount += 1;
      rowAudits.push({
        card_print_id: row.card_print_id,
        printed_number: row.printed_number,
        unresolved_name: row.unresolved_name,
        promotion_safe: false,
        block_reason: `live_gv_id_collision:${liveCollision.set_code ?? '__NULL__'}`,
        proposed_gv_id: proposedGvId,
      });
      if (conflictSamples.length < 10) {
        conflictSamples.push({
          card_print_id: row.card_print_id,
          printed_number: row.printed_number,
          unresolved_name: row.unresolved_name,
          reason: `live_gv_id_collision:${liveCollision.set_code ?? '__NULL__'}`,
          proposed_gv_id: proposedGvId,
        });
      }
      continue;
    }

    rowAudits.push({
      card_print_id: row.card_print_id,
      printed_number: row.printed_number,
      unresolved_name: row.unresolved_name,
      promotion_safe: true,
      block_reason: null,
      proposed_gv_id: proposedGvId,
    });
    internalCountByGvId.set(proposedGvId, (internalCountByGvId.get(proposedGvId) ?? 0) + 1);
  }

  const internalCollisionIds = new Set(
    [...internalCountByGvId.entries()].filter(([, count]) => count > 1).map(([gvId]) => gvId),
  );
  const internalCollisionCount = internalCollisionIds.size;

  for (const auditRow of rowAudits) {
    if (!auditRow.promotion_safe) {
      continue;
    }

    if (internalCollisionIds.has(auditRow.proposed_gv_id)) {
      auditRow.promotion_safe = false;
      auditRow.block_reason = 'internal_proposed_gv_id_collision';
    } else {
      promotionReadyCount += 1;
    }
  }

  return {
    row_audits: rowAudits,
    promotion_ready_count: promotionReadyCount,
    promotion_internal_collision_count: internalCollisionCount,
    promotion_live_collision_count: liveCollisionCount,
    promotion_same_token_conflict_count: sameTokenConflictCount,
    gv_id_derivation_error_count: deriveErrorCount,
    qualifier_review_count: qualifierReviewCount,
    conflict_samples: conflictSamples,
  };
}

function summarizeReadiness(rowIds) {
  return {
    card_print_identity: rowIds.length,
    card_print_traits: rowIds.length,
    card_printings: rowIds.length,
    external_mappings: rowIds.length,
    vault_items: 0,
  };
}

function chooseClassification(metrics) {
  const allRows = metrics.total_unresolved;
  const exactTokenContract = isSetExactTokenContract(metrics.set_code_identity);
  const hasExecutableSubset =
    metrics.numeric_duplicate_ready_count > 0 ||
    metrics.family_duplicate_ready_count > 0 ||
    metrics.alias_duplicate_ready_count > 0 ||
    metrics.promotion_ready_count > 0;

  if (
    metrics.alias_lane_code &&
    metrics.alias_duplicate_ready_count === allRows &&
    metrics.alias_multiple_match_count === 0 &&
    metrics.alias_unmatched_count === 0 &&
    metrics.alias_same_token_different_name_count === 0
  ) {
    return {
      classification: 'ALIAS_COLLAPSE',
      blocked: false,
      block_reason: null,
    };
  }

  if (
    metrics.non_numeric_unresolved === 0 &&
    metrics.numeric_duplicate_ready_count === metrics.numeric_unresolved &&
    metrics.numeric_multiple_match_count === 0 &&
    metrics.numeric_unmatched_count === 0 &&
    metrics.base_same_number_different_name_count === 0
  ) {
    return {
      classification: 'DUPLICATE_COLLAPSE',
      blocked: false,
      block_reason: null,
    };
  }

  if (
    metrics.promotion_ready_count === allRows &&
    metrics.promotion_internal_collision_count === 0 &&
    metrics.promotion_live_collision_count === 0 &&
    metrics.promotion_same_token_conflict_count === 0 &&
    metrics.gv_id_derivation_error_count === 0 &&
    metrics.qualifier_review_count === 0
  ) {
    return {
      classification: exactTokenContract ? 'EXACT_TOKEN_PROMOTION' : 'NUMERIC_PROMOTION',
      blocked: false,
      block_reason: null,
    };
  }

  if (
    metrics.family_lane_code &&
    metrics.family_duplicate_ready_count === metrics.non_numeric_unresolved &&
    metrics.family_multiple_match_count === 0 &&
    metrics.family_unmatched_count === 0 &&
    metrics.family_same_token_different_name_count === 0 &&
    metrics.numeric_unresolved === 0
  ) {
    return {
      classification: 'FAMILY_REALIGNMENT',
      blocked: false,
      block_reason: null,
    };
  }

  if (hasExecutableSubset) {
    return {
      classification: 'MIXED_EXECUTION',
      blocked: false,
      block_reason: null,
    };
  }

  if (
    metrics.base_same_number_different_name_count > 0 ||
    metrics.base_same_token_different_name_count > 0 ||
    metrics.promotion_same_token_conflict_count > 0 ||
    metrics.promotion_live_collision_count > 0 ||
    metrics.promotion_internal_collision_count > 0 ||
    metrics.namespace_issue
  ) {
    const reasons = [];
    if (metrics.base_same_number_different_name_count > 0) reasons.push('exact-number different-name conflict');
    if (metrics.base_same_token_different_name_count > 0) reasons.push('exact-token different-name conflict');
    if (metrics.promotion_same_token_conflict_count > 0) reasons.push('promotion same-token conflict');
    if (metrics.promotion_live_collision_count > 0) reasons.push('live gv_id collision');
    if (metrics.promotion_internal_collision_count > 0) reasons.push('internal proposed gv_id collision');
    if (metrics.namespace_issue) reasons.push(metrics.namespace_issue_reason);

    return {
      classification: 'BLOCKED_CONFLICT',
      blocked: true,
      block_reason: reasons.join('; '),
    };
  }

  if (
    metrics.non_numeric_unresolved > 0 &&
    (metrics.invalid_token_count > 0 || metrics.symbolic_surface)
  ) {
    return {
      classification: 'BLOCKED_SYMBOLIC',
      blocked: true,
      block_reason:
        metrics.invalid_token_count > 0
          ? `symbolic tokens require dedicated contract or token review: ${metrics.distinct_prefixes.join(', ')}`
          : `symbolic identity requires dedicated contract: ${metrics.distinct_prefixes.join(', ')}`,
    };
  }

  if (metrics.non_numeric_unresolved > 0) {
    return {
      classification: 'BLOCKED_UNSUPPORTED_FAMILY',
      blocked: true,
      block_reason: `unsupported family prefixes without lawful contract: ${metrics.distinct_prefixes.join(', ')}`,
    };
  }

  if (
    metrics.gv_id_derivation_error_count > 0 ||
    metrics.missing_printed_set_abbrev_count > 0 ||
    metrics.printed_set_abbrev_inconsistent
  ) {
    const reasons = [];
    if (metrics.gv_id_derivation_error_count > 0) reasons.push('gv_id derivation blocked');
    if (metrics.missing_printed_set_abbrev_count > 0) reasons.push('printed_set_abbrev missing on source rows');
    if (metrics.printed_set_abbrev_inconsistent) reasons.push('printed_set_abbrev inconsistent');
    return {
      classification: 'BLOCKED_METADATA',
      blocked: true,
      block_reason: reasons.join('; '),
    };
  }

  return {
    classification: 'BLOCKED_CONFLICT',
    blocked: true,
    block_reason: 'no lawful collapse, promotion, or realignment path is currently proven',
  };
}

function buildNextMode(metrics) {
  const setToken = normalizeSetCodeForMode(metrics.set_code_identity);
  switch (metrics.classification) {
    case 'ALIAS_COLLAPSE':
      return `${setToken}_ALIAS_COLLAPSE_TO_${normalizeSetCodeForMode(metrics.alias_lane_code)}`;
    case 'DUPLICATE_COLLAPSE':
      return `DUPLICATE_COLLAPSE_TO_CANONICAL_${setToken}`;
    case 'NUMERIC_PROMOTION':
      return `NUMERIC_PROMOTION_FOR_${setToken}`;
    case 'EXACT_TOKEN_PROMOTION':
      return `EXACT_TOKEN_PROMOTION_FOR_${setToken}`;
    case 'FAMILY_REALIGNMENT':
      return metrics.family_lane_code
        ? `${setToken}_FAMILY_REALIGNMENT_TO_${normalizeSetCodeForMode(metrics.family_lane_code)}`
        : `FAMILY_REALIGNMENT_FOR_${setToken}`;
    case 'MIXED_EXECUTION':
      if (metrics.numeric_duplicate_ready_count > 0 && metrics.non_numeric_unresolved > 0) {
        return `${setToken}_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`;
      }
      if (metrics.alias_duplicate_ready_count > 0) {
        return `${setToken}_PARTIAL_ALIAS_COLLAPSE_PLUS_RESIDUAL_REVIEW`;
      }
      if (metrics.promotion_ready_count > 0) {
        return `${setToken}_PARTIAL_PROMOTION_PLUS_RESIDUAL_REVIEW`;
      }
      return `MIXED_EXECUTION_FOR_${setToken}`;
    case 'BLOCKED_UNSUPPORTED_FAMILY':
      return `NEW_FAMILY_CONTRACT_REQUIRED_FOR_${setToken}`;
    case 'BLOCKED_SYMBOLIC':
      return `SYMBOLIC_IDENTITY_CONTRACT_REQUIRED_FOR_${setToken}`;
    case 'BLOCKED_METADATA':
      return `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_${setToken}`;
    case 'BLOCKED_CONFLICT':
    default:
      return `CONFLICT_RESOLUTION_AUDIT_FOR_${setToken}`;
  }
}

function buildPerSetMetrics({
  setCodeIdentity,
  rows,
  canonicalRowsBySet,
  liveRowsByGvId,
}) {
  const baseRows = canonicalRowsBySet.get(setCodeIdentity) ?? [];
  const companionConfig = COMPANION_LANES[setCodeIdentity] ?? null;
  const companionRows = companionConfig ? canonicalRowsBySet.get(companionConfig.code) ?? [] : [];
  const numericRows = rows.filter((row) => row.is_numeric);
  const nonNumericRows = rows.filter((row) => !row.is_numeric);
  const prefixCounts = new Map();

  for (const row of nonNumericRows) {
    prefixCounts.set(row.prefix, (prefixCounts.get(row.prefix) ?? 0) + 1);
  }

  const numericBaseAudit = buildNumericAudit(numericRows, baseRows);
  const nonNumericBaseAudit = buildExactTokenAudit(nonNumericRows, baseRows);
  const companionAudit = companionRows.length > 0 ? buildExactTokenAudit(rows, companionRows) : null;
  const familyRowsForCompanion = companionConfig?.lane_type === 'family' ? nonNumericRows : [];
  const familyAudit =
    companionConfig?.lane_type === 'family' && companionRows.length > 0
      ? buildExactTokenAudit(familyRowsForCompanion, companionRows)
      : null;
  const promotionAudit = buildPromotionAudit({
    rows,
    baseRows,
    liveRowsByGvId,
    companionRows,
  });

  const validTokenRows = rows.filter((row) => isTokenValidForSet(setCodeIdentity, row.printed_number));
  const invalidTokenCount = rows.length - validTokenRows.length;
  const prefixBreakdown = [...prefixCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([prefix, count]) => ({ prefix, count }));
  const distinctPrefixes = prefixBreakdown.map((row) => row.prefix);
  const printedSetAbbrevValues = [...new Set(rows.map((row) => row.printed_set_abbrev).filter(Boolean))].sort();

  let canonicalNamespaceMatchCount = 0;
  let namespaceConflictCount = 0;
  for (const row of rows) {
    for (const candidate of baseRows) {
      if (normalizeTextOrNull(candidate.number) !== row.printed_number) {
        continue;
      }
      if (!compareNamesCanonAware(row.unresolved_name, candidate.canonical_name)) {
        continue;
      }
      const derivedCanonical = deriveCanonicalContractGvId(candidate);
      if (derivedCanonical === candidate.gv_id) {
        canonicalNamespaceMatchCount += 1;
      } else {
        namespaceConflictCount += 1;
      }
    }
  }

  const namespaceIssue =
    promotionAudit.promotion_ready_count > 0 &&
    baseRows.length > 0 &&
    canonicalNamespaceMatchCount === 0 &&
    namespaceConflictCount === baseRows.length;

  const collapseReadyIds = [
    ...numericBaseAudit.row_audits
      .filter((row) => row.same_number_same_name_match_count === 1)
      .map((row) => row.card_print_id),
    ...nonNumericBaseAudit.row_audits
      .filter((row) => row.same_token_same_name_match_count === 1)
      .map((row) => row.card_print_id),
    ...(familyAudit?.row_audits ?? [])
      .filter((row) => row.same_token_same_name_match_count === 1)
      .map((row) => row.card_print_id),
    ...(companionAudit?.row_audits ?? [])
      .filter((row) => row.same_token_same_name_match_count === 1)
      .map((row) => row.card_print_id),
  ];
  const promotionReadyIds = promotionAudit.row_audits
    .filter((row) => row.promotion_safe)
    .map((row) => row.card_print_id);

  const metrics = {
    set_code_identity: setCodeIdentity,
    total_unresolved: rows.length,
    numeric_unresolved: numericRows.length,
    non_numeric_unresolved: nonNumericRows.length,
    valid_token_count: validTokenRows.length,
    invalid_token_count: invalidTokenCount,
    canonical_base_count: baseRows.length,
    canonical_base_numeric_count: baseRows.filter((row) => isNumericToken(row.number)).length,
    canonical_base_non_numeric_count: baseRows.filter((row) => !isNumericToken(row.number)).length,
    family_or_alias_lane_code: companionConfig?.code ?? null,
    family_or_alias_lane_type: companionConfig?.lane_type ?? null,
    family_or_alias_lane_count: companionRows.length,
    family_or_alias_matchable_count: companionAudit?.ready_count ?? 0,
    family_lane_code: companionConfig?.lane_type === 'family' ? companionConfig.code : null,
    alias_lane_code: companionConfig?.lane_type === 'alias' ? companionConfig.code : null,
    numeric_duplicate_ready_count: numericBaseAudit.ready_count,
    numeric_multiple_match_count: numericBaseAudit.multiple_match_count,
    numeric_unmatched_count: numericBaseAudit.unmatched_count,
    numeric_with_canonical_match_count: numericBaseAudit.with_canonical_match_count,
    numeric_without_canonical_match_count: numericBaseAudit.without_canonical_match_count,
    base_same_number_same_name_count: numericBaseAudit.same_number_same_name_count,
    base_same_number_different_name_count: numericBaseAudit.same_number_different_name_count,
    base_same_token_same_name_count: nonNumericBaseAudit.same_token_same_name_count,
    base_same_token_different_name_count: nonNumericBaseAudit.same_token_different_name_count,
    family_duplicate_ready_count: familyAudit?.ready_count ?? 0,
    family_multiple_match_count: familyAudit?.multiple_match_count ?? 0,
    family_unmatched_count: familyAudit?.unmatched_count ?? familyRowsForCompanion.length,
    family_same_token_different_name_count: familyAudit?.same_token_different_name_count ?? 0,
    alias_duplicate_ready_count: companionConfig?.lane_type === 'alias' ? companionAudit?.ready_count ?? 0 : 0,
    alias_multiple_match_count: companionConfig?.lane_type === 'alias' ? companionAudit?.multiple_match_count ?? 0 : 0,
    alias_unmatched_count: companionConfig?.lane_type === 'alias' ? companionAudit?.unmatched_count ?? rows.length : 0,
    alias_same_token_different_name_count:
      companionConfig?.lane_type === 'alias' ? companionAudit?.same_token_different_name_count ?? 0 : 0,
    promotion_ready_count: promotionAudit.promotion_ready_count,
    promotion_internal_collision_count: promotionAudit.promotion_internal_collision_count,
    promotion_live_collision_count: promotionAudit.promotion_live_collision_count,
    promotion_same_token_conflict_count: promotionAudit.promotion_same_token_conflict_count,
    qualifier_review_count: promotionAudit.qualifier_review_count,
    gv_id_derivation_error_count: promotionAudit.gv_id_derivation_error_count,
    printed_set_abbrev_present: printedSetAbbrevValues.length > 0,
    printed_set_abbrev_inconsistent: printedSetAbbrevValues.length > 1,
    printed_set_abbrev_values: printedSetAbbrevValues,
    missing_printed_set_abbrev_count: rows.filter((row) => !row.printed_set_abbrev).length,
    exact_token_contract_active: isSetExactTokenContract(setCodeIdentity),
    realignment_candidate: false,
    realignment_collision_count: 0,
    realignment_note: null,
    namespace_issue: namespaceIssue,
    namespace_issue_reason: namespaceIssue ? 'namespace migration needed before promotion' : null,
    canonical_namespace_match_count: canonicalNamespaceMatchCount,
    namespace_conflict_count: namespaceConflictCount,
    distinct_prefixes: distinctPrefixes,
    prefix_breakdown: prefixBreakdown,
    symbolic_surface: isSymbolicSet(prefixBreakdown, rows),
    promotion_conflict_samples: promotionAudit.conflict_samples,
    collapse_fk_readiness_summary: summarizeReadiness(collapseReadyIds),
    promotion_fk_readiness_summary: summarizeReadiness(promotionReadyIds),
    sample_promotion_rows: promotionAudit.row_audits
      .filter((row) => row.promotion_safe)
      .slice(0, 5),
  };

  if (
    metrics.family_lane_code &&
    metrics.family_duplicate_ready_count > 0 &&
    metrics.family_duplicate_ready_count === metrics.non_numeric_unresolved &&
    metrics.numeric_unresolved > 0
  ) {
    metrics.realignment_candidate = true;
    metrics.realignment_collision_count = metrics.family_duplicate_ready_count;
    metrics.realignment_note = `family lane ${metrics.family_lane_code} is proven but residual base rows remain`;
  }

  const classification = chooseClassification(metrics);
  metrics.classification = classification.classification;
  metrics.blocked = classification.blocked;
  metrics.block_reason = classification.block_reason;
  metrics.exact_next_execution_mode = buildNextMode(metrics);

  return metrics;
}

function buildSummary(perSet) {
  const byClass = new Map([
    ['ALIAS_COLLAPSE', { set_count: 0, row_count: 0 }],
    ['DUPLICATE_COLLAPSE', { set_count: 0, row_count: 0 }],
    ['NUMERIC_PROMOTION', { set_count: 0, row_count: 0 }],
    ['EXACT_TOKEN_PROMOTION', { set_count: 0, row_count: 0 }],
    ['FAMILY_REALIGNMENT', { set_count: 0, row_count: 0 }],
    ['MIXED_EXECUTION', { set_count: 0, row_count: 0 }],
    ['BLOCKED_METADATA', { set_count: 0, row_count: 0 }],
    ['BLOCKED_UNSUPPORTED_FAMILY', { set_count: 0, row_count: 0 }],
    ['BLOCKED_SYMBOLIC', { set_count: 0, row_count: 0 }],
    ['BLOCKED_CONFLICT', { set_count: 0, row_count: 0 }],
  ]);

  for (const row of perSet) {
    const bucket = byClass.get(row.classification);
    if (!bucket) {
      throw new Error(`UNKNOWN_CLASSIFICATION:${row.classification}`);
    }
    bucket.set_count += 1;
    bucket.row_count += row.total_unresolved;
  }

  return {
    total_sets: perSet.length,
    total_remaining_rows: perSet.reduce((sum, row) => sum + row.total_unresolved, 0),
    by_class: Object.fromEntries(byClass.entries()),
  };
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
    .map((row) => {
      let reason = row.block_reason;
      switch (row.classification) {
        case 'ALIAS_COLLAPSE':
          reason = `${row.alias_duplicate_ready_count} rows map 1:1 to canonical lane ${row.alias_lane_code}`;
          break;
        case 'DUPLICATE_COLLAPSE':
          reason = `${row.numeric_duplicate_ready_count + row.base_same_token_same_name_count} rows already exist canonically in the base lane`;
          break;
        case 'NUMERIC_PROMOTION':
          reason = `${row.promotion_ready_count} numeric rows are deterministic and collision-free under the live builder`;
          break;
        case 'EXACT_TOKEN_PROMOTION':
          reason = `${row.promotion_ready_count} exact-token rows are deterministic and collision-free under the active contract`;
          break;
        case 'FAMILY_REALIGNMENT':
          reason = `${row.family_duplicate_ready_count} rows map 1:1 to proven family lane ${row.family_lane_code}`;
          break;
        case 'MIXED_EXECUTION':
          if (row.numeric_duplicate_ready_count > 0) {
            reason = `${row.numeric_duplicate_ready_count} numeric rows are executable now; residual subset remains blocked`;
          } else if (row.promotion_ready_count > 0) {
            reason = `${row.promotion_ready_count} rows are promotion-safe now; residual subset remains blocked`;
          } else {
            reason = 'set contains more than one subset and needs split execution';
          }
          break;
        default:
          break;
      }

      return {
        set_code_identity: row.set_code_identity,
        classification: row.classification,
        total_unresolved: row.total_unresolved,
        exact_next_execution_mode: row.exact_next_execution_mode,
        reason,
      };
    });
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# REMAINING_IDENTITY_SURFACE_GLOBAL_AUDIT_V2');
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push('This audit replaces the previous global snapshot after multiple execution waves completed across mixed collapse, family realignment, numeric promotion, alias collapse, and namespace migration work.');
  lines.push('');
  lines.push('## Why V1 Is Stale');
  lines.push('');
  lines.push('- `swsh9`, `swsh10`, `swsh11`, and `swsh12` changed materially');
  lines.push('- MCD yearly alias lanes were collapsed');
  lines.push('- `smp`, `ecard3`, and `col1` were reclassified and executed under new contracts');
  lines.push('- `swsh4.5` lost its `SV###` family subset and now only retains numeric blockers');
  lines.push('');
  lines.push('## Current Unresolved Set Inventory');
  lines.push('');
  lines.push('| Set | Total | Numeric | Non-numeric |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const row of report.per_set_counts) {
    lines.push(`| ${row.set_code_identity} | ${row.total_unresolved} | ${row.numeric_unresolved} | ${row.non_numeric_unresolved} |`);
  }
  lines.push('');
  lines.push('## Per-Set Classification Table');
  lines.push('');
  lines.push('| Set | Classification | Next Mode | Notes |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of report.per_set_classification) {
    const note = row.block_reason ?? row.realignment_note ?? '';
    lines.push(`| ${row.set_code_identity} | ${row.classification} | ${row.exact_next_execution_mode} | ${note.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  lines.push('## Blocker Summary');
  lines.push('');
  if (report.blocker_list.length === 0) {
    lines.push('No blocked sets remain.');
  } else {
    for (const blocker of report.blocker_list) {
      lines.push(`- \`${blocker.set_code_identity}\` -> \`${blocker.classification}\`: ${blocker.block_reason}`);
    }
  }
  lines.push('');
  lines.push('## Recommended Execution Order');
  lines.push('');
  for (const row of report.recommended_order) {
    lines.push(`1. \`${row.set_code_identity}\` -> \`${row.exact_next_execution_mode}\`: ${row.reason}`);
  }
  lines.push('');
  lines.push('## Exact Next Recommended Set And Mode');
  lines.push('');
  lines.push(`- Set: \`${report.recommended_next_set}\``);
  lines.push(`- Mode: \`${report.recommended_next_mode}\``);
  lines.push('');
  lines.push('## Current Truths / Invariants Discovered');
  lines.push('');
  for (const truth of report.current_truths) {
    lines.push(`- ${truth}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'remaining_identity_surface_global_audit_v2',
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

      const enriched = {
        ...row,
        is_numeric: isNumericToken(row.printed_number),
        prefix: extractPrefix(row.printed_number),
        normalized_digits: normalizeDigits(row.printed_number),
      };
      if (!unresolvedRowsBySet.has(row.set_code_identity)) {
        unresolvedRowsBySet.set(row.set_code_identity, []);
      }
      unresolvedRowsBySet.get(row.set_code_identity).push(enriched);
    }

    const canonicalRowsBySet = new Map();
    const liveRowsByGvId = new Map();
    for (const row of canonicalRows) {
      if (!canonicalRowsBySet.has(row.set_code)) {
        canonicalRowsBySet.set(row.set_code, []);
      }
      canonicalRowsBySet.get(row.set_code).push(row);

      if (liveRowsByGvId.has(row.gv_id)) {
        throw new Error(`DUPLICATE_LIVE_GV_ID:${row.gv_id}`);
      }
      liveRowsByGvId.set(row.gv_id, row);
    }

    const perSet = [...unresolvedRowsBySet.entries()]
      .map(([setCodeIdentity, rows]) =>
        buildPerSetMetrics({
          setCodeIdentity,
          rows,
          canonicalRowsBySet,
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
        `alias_collapse_sets=${summary.by_class.ALIAS_COLLAPSE.set_count}`,
        `duplicate_collapse_sets=${summary.by_class.DUPLICATE_COLLAPSE.set_count}`,
        `numeric_promotion_sets=${summary.by_class.NUMERIC_PROMOTION.set_count}`,
        `exact_token_promotion_sets=${summary.by_class.EXACT_TOKEN_PROMOTION.set_count}`,
        `mixed_execution_sets=${summary.by_class.MIXED_EXECUTION.set_count}`,
        `blocked_conflict_sets=${summary.by_class.BLOCKED_CONFLICT.set_count}`,
      ],
      status: 'audit_complete',
    };

    writeText(JSON_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    writeText(MARKDOWN_OUTPUT_PATH, buildMarkdown(report));
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
