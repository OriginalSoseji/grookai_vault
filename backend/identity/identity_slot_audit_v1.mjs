import '../env.mjs';

import pg from 'pg';

import { normalizeCardNameV1 } from './normalizeCardNameV1.mjs';
import { evaluateVariantCoexistenceV1 } from './variant_coexistence_rule_v1.mjs';
import { getSourceBackedIdentity, normalizeVariantKey } from '../warehouse/source_identity_contract_v1.mjs';

const { Pool } = pg;

export const IDENTITY_SLOT_AUDIT_WORKER_NAME = 'identity_slot_audit_v1';
export const IDENTITY_SLOT_AUDIT_VERSION = 'V1';
export const IDENTITY_AUDIT_STATUSES = Object.freeze({
  NEW_CANONICAL: 'NEW_CANONICAL',
  ALIAS: 'ALIAS',
  VARIANT_IDENTITY: 'VARIANT_IDENTITY',
  PRINTING_ONLY: 'PRINTING_ONLY',
  SLOT_CONFLICT: 'SLOT_CONFLICT',
  AMBIGUOUS: 'AMBIGUOUS',
});

const SAFE_ALIAS_MAP = new Map([
  ['ghastly', 'gastly'],
  ['nidoran f', 'nidoran♀'],
  ['nidoran m', 'nidoran♂'],
]);

const IDENTITY_VARIANT_SIGNAL_MAP = [
  { pattern: /\bspecial illustration rare\b/i, variant_key: 'special_illustration_rare', label: 'Special Illustration Rare' },
  { pattern: /\billustration rare\b/i, variant_key: 'illustration_rare', label: 'Illustration Rare' },
  { pattern: /\bshiny rare\b/i, variant_key: 'shiny_rare', label: 'Shiny Rare' },
  { pattern: /\bfull art\b/i, variant_key: 'full_art', label: 'Full Art' },
  { pattern: /\bhyper rare\b/i, variant_key: 'hyper_rare', label: 'Hyper Rare' },
  { pattern: /\bgold rare\b/i, variant_key: 'gold_rare', label: 'Gold Rare' },
  { pattern: /\bcosmos(?:\s+holo)?\b/i, variant_key: 'cosmos_holo', label: 'Cosmos Holo' },
  { pattern: /\bcracked ice\b/i, variant_key: 'cracked_ice', label: 'Cracked Ice' },
  { pattern: /\bstaff(?:\s+stamp)?\b/i, variant_key: 'staff_stamp', label: 'Staff Stamp' },
  { pattern: /\bprerelease(?:\s+stamp)?\b/i, variant_key: 'prerelease_stamp', label: 'Prerelease Stamp' },
  { pattern: /\bchampionship(?:\s+stamp)?\b/i, variant_key: 'championship_stamp', label: 'Championship Stamp' },
  { pattern: /\bpokemon together\b/i, variant_key: 'pokemon_together_stamp', label: 'Pokemon Together Stamp' },
];

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

export function normalizeWarehouseNumberPlainV1(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const compact = normalized.replace(/[⁄∕]/g, '/').replace(/\s+/g, '');
  const left = compact.includes('/') ? compact.split('/', 1)[0] : compact;
  const digits = left.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return digits.length > 0 ? digits : null;
}

function buildNumberCandidates(value, numberPlain = null) {
  const raw = normalizeTextOrNull(value);
  const rawPlain = normalizeTextOrNull(numberPlain);
  const normalizedPlain = normalizeWarehouseNumberPlainV1(rawPlain ?? raw);
  const paddedFromRaw = rawPlain?.replace(/[^0-9]/g, '') || null;
  const paddedFromValue = raw
    ? (raw.replace(/[⁄∕]/g, '/').replace(/\s+/g, '').split('/', 1)[0] ?? '').replace(/[^0-9]/g, '')
    : null;
  return Array.from(
    new Set(
      [normalizedPlain, paddedFromRaw, paddedFromValue]
        .map((entry) => normalizeTextOrNull(entry))
        .filter(Boolean),
    ),
  );
}

function normalizeVariantKeyOrNull(value) {
  const normalized = normalizeVariantKey(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

function normalizeLooseNameKey(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[^A-Za-z0-9♀♂]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sameNameOrSafeAlias(left, right) {
  const leftKey = normalizeLooseNameKey(left);
  const rightKey = normalizeLooseNameKey(right);

  if (!leftKey || !rightKey) {
    return { matches: false, alias: false, reason: 'missing_name' };
  }

  if (leftKey === rightKey) {
    return { matches: true, alias: false, reason: 'exact_normalized_name' };
  }

  if (SAFE_ALIAS_MAP.get(leftKey) === rightKey || SAFE_ALIAS_MAP.get(rightKey) === leftKey) {
    return { matches: true, alias: true, reason: 'safe_alias_map' };
  }

  const leftToCanon = normalizeCardNameV1(left, { canonName: right });
  if (leftToCanon.ok && leftToCanon.used_canon_correction) {
    return { matches: true, alias: true, reason: leftToCanon.correction_reason ?? 'safe_name_correction' };
  }

  const rightToCanon = normalizeCardNameV1(right, { canonName: left });
  if (rightToCanon.ok && rightToCanon.used_canon_correction) {
    return { matches: true, alias: true, reason: rightToCanon.correction_reason ?? 'safe_name_correction' };
  }

  return { matches: false, alias: false, reason: 'name_mismatch' };
}

function deriveIdentityVariantSignal(candidate, visibleIdentityHints, candidateVariantIdentity, sourceBackedIdentity) {
  const explicitVariantKey =
    normalizeVariantKeyOrNull(candidateVariantIdentity?.variant_key) ??
    normalizeVariantKeyOrNull(sourceBackedIdentity?.variant_key) ??
    normalizeVariantKeyOrNull(visibleIdentityHints?.variant_key);
  const explicitLabel =
    normalizeTextOrNull(candidateVariantIdentity?.illustration_category) ??
    normalizeTextOrNull(visibleIdentityHints?.illustration_category);

  if (explicitVariantKey) {
    return {
      variant_key: explicitVariantKey,
      label: explicitLabel ?? explicitVariantKey,
      reason: 'explicit_variant_identity',
    };
  }

  const texts = [
    normalizeTextOrNull(candidate?.notes),
    normalizeTextOrNull(visibleIdentityHints?.card_name),
    normalizeTextOrNull(visibleIdentityHints?.rarity_hint),
    normalizeTextOrNull(candidate?.claimed_identity_payload?.rarity),
    normalizeTextOrNull(candidate?.reference_hints_payload?.rarity),
    normalizeTextOrNull(candidate?.reference_hints_payload?.source_card_snapshot?.rarity),
    normalizeTextOrNull(candidate?.reference_hints_payload?.upstream_id),
    normalizeTextOrNull(candidate?.claimed_identity_payload?.upstream_id),
  ].filter(Boolean);

  const combined = texts.join(' ');
  for (const candidateSignal of IDENTITY_VARIANT_SIGNAL_MAP) {
    if (candidateSignal.pattern.test(combined)) {
      return {
        variant_key: candidateSignal.variant_key,
        label: candidateSignal.label,
        reason: 'pattern_match',
      };
    }
  }

  return null;
}

function resolveSlotAuditSetCode(visibleIdentityHints, sourceBackedIdentity) {
  return (
    normalizeLowerOrNull(sourceBackedIdentity?.set_code) ??
    normalizeLowerOrNull(sourceBackedIdentity?.underlying_base_set_code) ??
    normalizeLowerOrNull(visibleIdentityHints?.set_hint)
  );
}

function buildExplanation(status, context) {
  const candidateLabel = `${context.set_code ?? 'unknown-set'} #${context.printed_number ?? context.number_plain ?? 'unknown-number'} ${context.name ?? 'unknown-name'}`;

  switch (status) {
    case IDENTITY_AUDIT_STATUSES.NEW_CANONICAL:
      return `Identity slot audit classified ${candidateLabel} as NEW_CANONICAL because the canonical slot is empty.`;
    case IDENTITY_AUDIT_STATUSES.ALIAS:
      return `Identity slot audit classified ${candidateLabel} as ALIAS because the candidate safely resolves onto an existing canonical row.`;
    case IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY:
      return `Identity slot audit classified ${candidateLabel} as VARIANT_IDENTITY because the candidate carries a deterministic identity-bearing modifier that belongs on card_prints.variant_key.`;
    case IDENTITY_AUDIT_STATUSES.PRINTING_ONLY:
      return `Identity slot audit classified ${candidateLabel} as PRINTING_ONLY because the distinction is finish-only under an existing canonical parent.`;
    case IDENTITY_AUDIT_STATUSES.SLOT_CONFLICT:
      return `Identity slot audit classified ${candidateLabel} as SLOT_CONFLICT because the slot is already occupied by a different canonical identity.`;
    default:
      return `Identity slot audit classified ${candidateLabel} as AMBIGUOUS because the available signals do not safely resolve a canonical route.`;
  }
}

function sanitizeSlotRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id ?? null,
    set_id: row.set_id ?? null,
    set_code: normalizeLowerOrNull(row.set_code),
    name: normalizeTextOrNull(row.name),
    number: normalizeTextOrNull(row.number),
    number_plain: normalizeTextOrNull(row.number_plain),
    normalized_number_plain: normalizeWarehouseNumberPlainV1(row.number_plain ?? row.number),
    variant_key: normalizeVariantKeyOrNull(row.variant_key),
    gv_id: normalizeTextOrNull(row.gv_id),
    tcgplayer_id: normalizeTextOrNull(row.tcgplayer_id),
  }));
}

function buildAuditPackage({
  candidate,
  visibleIdentityHints,
  candidateVariantIdentity,
  sourceBackedIdentity,
  finishInterpretation,
  matchedCardPrint,
  matchedCardPrinting,
  slotRows,
}) {
  const setCode =
    resolveSlotAuditSetCode(visibleIdentityHints, sourceBackedIdentity);
  const name =
    normalizeTextOrNull(visibleIdentityHints?.card_name) ??
    normalizeTextOrNull(sourceBackedIdentity?.name);
  const printedNumber =
    normalizeTextOrNull(visibleIdentityHints?.printed_number) ??
    normalizeTextOrNull(sourceBackedIdentity?.printed_number);
  const numberPlain =
    normalizeWarehouseNumberPlainV1(visibleIdentityHints?.printed_number_plain) ??
    normalizeWarehouseNumberPlainV1(sourceBackedIdentity?.number_plain) ??
    normalizeWarehouseNumberPlainV1(printedNumber);
  const variantSignal = deriveIdentityVariantSignal(
    candidate,
    visibleIdentityHints,
    candidateVariantIdentity,
    sourceBackedIdentity,
  );
  const normalizedRows = sanitizeSlotRows(slotRows);
  const sameNameRows = [];
  const aliasRows = [];

  for (const row of normalizedRows) {
    const comparison = sameNameOrSafeAlias(name, row.name);
    if (!comparison.matches) continue;
    if (comparison.alias) {
      aliasRows.push({ ...row, alias_reason: comparison.reason });
    } else {
      sameNameRows.push({ ...row, alias_reason: null });
    }
  }

  const matchingRows = [...sameNameRows, ...aliasRows];
  const exactVariantRow = variantSignal?.variant_key
    ? normalizedRows.find((row) => row.variant_key === variantSignal.variant_key) ?? null
    : null;
  const sameNameExactVariantRow = variantSignal?.variant_key
    ? matchingRows.find((row) => row.variant_key === variantSignal.variant_key) ?? null
    : null;
  const variantCoexistence =
    variantSignal?.variant_key
      ? evaluateVariantCoexistenceV1({
        candidate,
        visibleIdentityHints,
        candidateVariantIdentity,
        sourceBackedIdentity,
        normalizedRows,
        matchingRows,
        incomingVariantKey: variantSignal.variant_key,
      })
      : null;

  let identityAuditStatus = IDENTITY_AUDIT_STATUSES.AMBIGUOUS;
  let reasonCode = 'INSUFFICIENT_IDENTITY_FIELDS';
  let routing = {
    proposed_action_type: 'REVIEW_REQUIRED',
    matched_card_print_id: null,
    matched_card_printing_id: null,
    variant_key: variantSignal?.variant_key ?? null,
    finish_key: normalizeTextOrNull(finishInterpretation?.resolvedFinishKey),
  };
  const ambiguityFlags = [];
  const missingFields = [];

  if (!setCode) missingFields.push('set_code');
  if (!name) missingFields.push('name');
  if (!numberPlain) missingFields.push('number_plain');

  if (missingFields.length > 0) {
    identityAuditStatus = IDENTITY_AUDIT_STATUSES.AMBIGUOUS;
    reasonCode = 'MISSING_IDENTITY_FIELDS';
  } else if (finishInterpretation?.decision === 'CHILD') {
    const printingParentId =
      normalizeTextOrNull(matchedCardPrint?.id) ??
      normalizeTextOrNull(matchingRows[0]?.id);
    if (!printingParentId) {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.AMBIGUOUS;
      reasonCode = 'PRINTING_PARENT_UNRESOLVED';
    } else if (matchingRows.length > 1 && !matchedCardPrint?.id) {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.AMBIGUOUS;
      reasonCode = 'MULTIPLE_PRINTING_PARENTS';
      ambiguityFlags.push('multiple_printing_parents');
    } else {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.PRINTING_ONLY;
      reasonCode = matchedCardPrinting?.id ? 'EXISTING_CHILD_PRINTING' : 'FINISH_ONLY_DISTINCTION';
      routing = {
        proposed_action_type: matchedCardPrinting?.id ? 'ENRICH_CANON_IMAGE' : 'CREATE_CARD_PRINTING',
        matched_card_print_id: printingParentId,
        matched_card_printing_id: normalizeTextOrNull(matchedCardPrinting?.id),
        variant_key: normalizeVariantKeyOrNull(matchingRows[0]?.variant_key),
        finish_key: normalizeTextOrNull(finishInterpretation?.resolvedFinishKey),
      };
    }
  } else if (variantSignal?.variant_key) {
    if (sameNameExactVariantRow) {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.ALIAS;
      reasonCode = 'EXACT_VARIANT_ALREADY_CANONICAL';
      routing = {
        proposed_action_type: 'REVIEW_REQUIRED',
        matched_card_print_id: sameNameExactVariantRow.id,
        matched_card_printing_id: null,
        variant_key: variantSignal.variant_key,
        finish_key: null,
      };
    } else if (variantCoexistence?.allowed) {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY;
      reasonCode = variantCoexistence.reason_code ?? 'VARIANT_COEXISTENCE_ALLOWED';
      routing = {
        proposed_action_type: 'CREATE_CARD_PRINT',
        matched_card_print_id: null,
        matched_card_printing_id: null,
        variant_key: variantSignal.variant_key,
        finish_key: null,
      };
    } else if (matchingRows.length > 1) {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.AMBIGUOUS;
      reasonCode = 'MULTIPLE_SAME_NAME_SLOT_ROWS';
      ambiguityFlags.push('multiple_same_name_slot_rows');
    } else if (exactVariantRow && !matchingRows.find((row) => row.id === exactVariantRow.id)) {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.SLOT_CONFLICT;
      reasonCode = 'VARIANT_SLOT_ALREADY_OCCUPIED_BY_DIFFERENT_NAME';
    } else if (normalizedRows.length > 0 && matchingRows.length === 0) {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.SLOT_CONFLICT;
      reasonCode = 'SLOT_OCCUPIED_BY_DIFFERENT_NAME';
    } else {
      identityAuditStatus = IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY;
      reasonCode = normalizedRows.length === 0 ? 'EMPTY_SLOT_VARIANT_IDENTITY' : 'IDENTITY_DELTA_VARIANT_KEY';
      routing = {
        proposed_action_type: 'CREATE_CARD_PRINT',
        matched_card_print_id: null,
        matched_card_printing_id: null,
        variant_key: variantSignal.variant_key,
        finish_key: null,
      };
    }
  } else if (matchingRows.length === 1) {
    identityAuditStatus = IDENTITY_AUDIT_STATUSES.ALIAS;
    reasonCode = aliasRows.some((row) => row.id === matchingRows[0].id) ? 'SAFE_NAME_ALIAS_MATCH' : 'EXISTING_CANONICAL_MATCH';
    routing = {
      proposed_action_type: 'REVIEW_REQUIRED',
      matched_card_print_id: matchingRows[0].id,
      matched_card_printing_id: null,
      variant_key: normalizeVariantKeyOrNull(matchingRows[0].variant_key),
      finish_key: null,
    };
  } else if (matchingRows.length > 1) {
    identityAuditStatus = IDENTITY_AUDIT_STATUSES.AMBIGUOUS;
    reasonCode = 'MULTIPLE_ALIAS_MATCHES';
    ambiguityFlags.push('multiple_alias_matches');
  } else if (normalizedRows.length === 0) {
    identityAuditStatus = IDENTITY_AUDIT_STATUSES.NEW_CANONICAL;
    reasonCode = 'EMPTY_SLOT';
    routing = {
      proposed_action_type: 'CREATE_CARD_PRINT',
      matched_card_print_id: null,
      matched_card_printing_id: null,
      variant_key: null,
      finish_key: null,
    };
  } else {
    identityAuditStatus = IDENTITY_AUDIT_STATUSES.SLOT_CONFLICT;
    reasonCode = 'SLOT_OCCUPIED_BY_DIFFERENT_NAME';
  }

  const candidateIdentity = {
    set_code: setCode,
    name,
    printed_number: printedNumber,
    number_plain: numberPlain,
    normalized_name_key: normalizeLooseNameKey(name),
    variant_key: variantSignal?.variant_key ?? null,
    variant_label: variantSignal?.label ?? null,
  };

  return {
    version: IDENTITY_SLOT_AUDIT_VERSION,
    worker: IDENTITY_SLOT_AUDIT_WORKER_NAME,
    identity_audit_status: identityAuditStatus,
    reason_code: reasonCode,
    explanation: buildExplanation(identityAuditStatus, candidateIdentity),
    candidate_identity: candidateIdentity,
    routing,
    slot_occupancy: {
      slot_count: normalizedRows.length,
      slot_rows: normalizedRows,
      matching_rows: matchingRows,
    },
    variant_signal: variantSignal,
    variant_coexistence: variantCoexistence,
    ambiguity_flags: ambiguityFlags,
    missing_fields: missingFields,
  };
}

export async function fetchSlotOccupantsByIdentityV1(client, { setCode, printedNumber, numberPlain }) {
  const normalizedSetCode = normalizeLowerOrNull(setCode);
  const candidateNumbers = buildNumberCandidates(printedNumber, numberPlain);

  if (!normalizedSetCode || candidateNumbers.length === 0) {
    return [];
  }

  const { rows } = await client.query(
    `
      select
        cp.id,
        cp.set_id,
        cp.set_code,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.variant_key,
        cp.gv_id,
        cp.tcgplayer_id
      from public.card_prints cp
      where lower(cp.set_code) = $1
        and regexp_replace(
          split_part(
            regexp_replace(coalesce(nullif(cp.number_plain, ''), nullif(cp.number, ''), ''), '\\s+', '', 'g'),
            '/',
            1
          ),
          '^0+',
          ''
        ) = any($2::text[])
      order by cp.id asc
    `,
    [normalizedSetCode, candidateNumbers],
  );

  return rows;
}

export async function auditWarehouseCandidateIdentitySlotV1(client, input) {
  const candidate = input?.candidate ?? null;
  const visibleIdentityHints = input?.visibleIdentityHints ?? {};
  const candidateVariantIdentity = input?.candidateVariantIdentity ?? null;
  const sourceBackedIdentity = input?.sourceBackedIdentity ?? getSourceBackedIdentity(candidate);
  const finishInterpretation = input?.finishInterpretation ?? null;
  const matchedCardPrint = input?.matchedCardPrint ?? null;
  const matchedCardPrinting = input?.matchedCardPrinting ?? null;
  const slotRows =
    input?.slotRows ??
    await fetchSlotOccupantsByIdentityV1(client, {
      setCode: resolveSlotAuditSetCode(visibleIdentityHints, sourceBackedIdentity),
      printedNumber: visibleIdentityHints?.printed_number ?? sourceBackedIdentity?.printed_number,
      numberPlain: visibleIdentityHints?.printed_number_plain ?? sourceBackedIdentity?.number_plain,
    });

  return buildAuditPackage({
    candidate,
    visibleIdentityHints,
    candidateVariantIdentity,
    sourceBackedIdentity,
    finishInterpretation,
    matchedCardPrint,
    matchedCardPrinting,
    slotRows,
  });
}

async function fetchCandidateById(client, candidateId) {
  const { rows } = await client.query(
    `
      select id, notes, tcgplayer_id, claimed_identity_payload, reference_hints_payload
      from public.canon_warehouse_candidates
      where id = $1
      limit 1
    `,
    [candidateId],
  );
  return rows[0] ?? null;
}

function parseArgs(argv) {
  const opts = {
    candidateId: null,
  };

  for (const arg of argv) {
    if (arg.startsWith('--candidate-id=')) {
      opts.candidateId = normalizeTextOrNull(arg.slice('--candidate-id='.length));
    }
  }

  return opts;
}

async function runCli() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.candidateId) {
    throw new Error('candidate_id_required');
  }
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const connection = await pool.connect();
    try {
      const candidate = await fetchCandidateById(connection, opts.candidateId);
      if (!candidate) {
        throw new Error(`candidate_not_found:${opts.candidateId}`);
      }
      const sourceBackedIdentity = getSourceBackedIdentity(candidate);
      const visibleIdentityHints = {
        card_name: normalizeTextOrNull(candidate?.claimed_identity_payload?.card_name) ??
          normalizeTextOrNull(candidate?.claimed_identity_payload?.name) ??
          normalizeTextOrNull(candidate?.reference_hints_payload?.card_name) ??
          normalizeTextOrNull(candidate?.reference_hints_payload?.name),
        printed_number: normalizeTextOrNull(candidate?.claimed_identity_payload?.printed_number) ??
          normalizeTextOrNull(candidate?.claimed_identity_payload?.number) ??
          normalizeTextOrNull(candidate?.reference_hints_payload?.printed_number) ??
          normalizeTextOrNull(candidate?.reference_hints_payload?.number),
        printed_number_plain: normalizeTextOrNull(candidate?.claimed_identity_payload?.number_plain) ??
          normalizeTextOrNull(candidate?.reference_hints_payload?.number_plain),
        set_hint: normalizeLowerOrNull(candidate?.claimed_identity_payload?.set_code) ??
          normalizeLowerOrNull(candidate?.claimed_identity_payload?.set_hint) ??
          normalizeLowerOrNull(candidate?.reference_hints_payload?.set_code) ??
          normalizeLowerOrNull(candidate?.reference_hints_payload?.set_hint),
        rarity_hint: normalizeTextOrNull(candidate?.claimed_identity_payload?.rarity) ??
          normalizeTextOrNull(candidate?.reference_hints_payload?.rarity),
        variant_key: normalizeVariantKeyOrNull(candidate?.claimed_identity_payload?.variant_key) ??
          normalizeVariantKeyOrNull(candidate?.reference_hints_payload?.variant_key),
      };
      const result = await auditWarehouseCandidateIdentitySlotV1(connection, {
        candidate,
        visibleIdentityHints,
        sourceBackedIdentity,
        candidateVariantIdentity: candidate?.claimed_identity_payload?.variant_identity ??
          candidate?.reference_hints_payload?.variant_identity ??
          null,
      });
      console.log(JSON.stringify(result, null, 2));
    } finally {
      connection.release();
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('identity_slot_audit_v1.mjs')) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
