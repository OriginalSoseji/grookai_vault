import '../env.mjs';

import fs from 'fs';
import path from 'path';
import pg from 'pg';

import { derivePerfectOrderVariantIdentity } from '../identity/perfect_order_variant_identity_rule_v1.mjs';
import { STAMPED_IDENTITY_RULE_V1 } from '../identity/stamped_identity_rule_v1.mjs';
import {
  assertExecuteCanonWriteV1,
} from '../lib/contracts/execute_canon_write_v1.mjs';

const { Client } = pg;

const BRIDGE_VERSION = 'EXTERNAL_DISCOVERY_TO_WAREHOUSE_BRIDGE_V1';
const BRIDGE_SOURCE = 'external_discovery_bridge_v1';
const FOUNDER_EMAIL = 'ccabrl@gmail.com';
const STANDARD_BRIDGE_MATCH_STATUS = 'UNMATCHED';
const STANDARD_BRIDGE_BUCKET = 'CLEAN_CANON_CANDIDATE';
const RETROACTIVE_SET_MAPPING_REASON = 'set_mapping_missing';

const PRODUCT_NAME_PATTERN =
  /\b(booster box|box|pack|collection|bundle|deck|case|tin|etb|accessory|sleeve|binder|code card)\b/i;

function printUsage() {
  console.log(
    `Usage: node backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs --set-id=<external-set-id> [--source-candidate-id=<uuid> ...] [--stamped-batch-file=<path>] [--apply]`,
  );
}

function parseArgs(argv) {
  let setId = null;
  let apply = false;
  let stampedBatchFile = null;
  const sourceCandidateIds = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--apply') {
      apply = true;
      continue;
    }

    if (value === '--help' || value === '-h') {
      printUsage();
      process.exit(0);
    }

    if (value.startsWith('--set-id=')) {
      setId = value.slice('--set-id='.length).trim() || null;
      continue;
    }

    if (value === '--set-id') {
      setId = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (value.startsWith('--source-candidate-id=')) {
      const candidateId = value.slice('--source-candidate-id='.length).trim();
      if (candidateId) {
        sourceCandidateIds.push(candidateId);
      }
      continue;
    }

    if (value === '--source-candidate-id') {
      const candidateId = argv[index + 1]?.trim() || null;
      if (candidateId) {
        sourceCandidateIds.push(candidateId);
      }
      index += 1;
      continue;
    }

    if (value.startsWith('--stamped-batch-file=')) {
      stampedBatchFile = value.slice('--stamped-batch-file='.length).trim() || null;
      continue;
    }

    if (value === '--stamped-batch-file') {
      stampedBatchFile = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    throw new Error(`unknown_argument:${value}`);
  }

  if (!setId) {
    throw new Error('missing_required_argument:--set-id');
  }

  return {
    setId,
    apply,
    stampedBatchFile,
    sourceCandidateIds: [...new Set(sourceCandidateIds)],
  };
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return digits.length > 0 ? digits : null;
}

function resolveInputPath(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }
  return path.isAbsolute(normalized) ? normalized : path.join(process.cwd(), normalized);
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function uniqueSortedStrings(values) {
  return [...new Set(values.map((value) => normalizeTextOrNull(value)).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function loadStampedBatchLookup(batchFilePath) {
  const resolvedPath = resolveInputPath(batchFilePath);
  if (!resolvedPath) {
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  const bySourceCandidateId = new Map();

  for (const rawRow of rows) {
    const row = asRecord(rawRow);
    if (!row) {
      continue;
    }

    const liveSourceCandidateId = normalizeTextOrNull(row.pre_intake_audit?.live_source_candidate_id);
    if (!liveSourceCandidateId) {
      continue;
    }

    bySourceCandidateId.set(liveSourceCandidateId, {
      batch_index: Number(row.batch_index ?? 0),
      source_external_id: normalizeTextOrNull(row.source_external_id),
      source_set_id: normalizeTextOrNull(row.source_set_id),
      name: normalizeTextOrNull(row.name),
      candidate_name: normalizeTextOrNull(row.candidate_name),
      printed_number: normalizeTextOrNull(row.printed_number),
      number_plain: normalizeNumberPlain(row.number_plain),
      proposed_variant_key: normalizeTextOrNull(row.proposed_variant_key),
      governing_rule_source: normalizeTextOrNull(row.governing_rule_source),
      stamp_label: normalizeTextOrNull(row.stamp_label),
      canonical_queue_key: normalizeTextOrNull(row.canonical_queue_key),
      effective_routed_set_code: normalizeTextOrNull(row.effective_routed_set_code),
      effective_routed_set_name: normalizeTextOrNull(row.effective_routed_set_name),
      effective_identity_space: normalizeTextOrNull(row.effective_identity_space),
      underlying_base_proof_summary: asRecord(row.underlying_base_proof_summary) ?? null,
      target_base_resolution: asRecord(row.target_base_resolution) ?? null,
      pre_intake_audit: asRecord(row.pre_intake_audit) ?? null,
    });
  }

  return {
    resolvedPath,
    bySourceCandidateId,
  };
}

function isLikelyProductRow(row) {
  const values = [
    row.name_raw,
    row.payload?.name,
    row.raw_payload?.name,
    row.payload?.set_name,
    row.raw_payload?.set_name,
  ]
    .map((value) => normalizeTextOrNull(value))
    .filter(Boolean)
    .join(' ');

  return PRODUCT_NAME_PATTERN.test(values);
}

function shouldBypassProductRowExclusion(stampedBatchEntry) {
  return Boolean(
    stampedBatchEntry &&
      normalizeTextOrNull(stampedBatchEntry.governing_rule_source) &&
      normalizeTextOrNull(stampedBatchEntry.stamp_label) &&
      normalizeTextOrNull(stampedBatchEntry.effective_routed_set_code) &&
      asRecord(stampedBatchEntry.target_base_resolution),
  );
}

function extractClassificationReason(row) {
  return (
    normalizeTextOrNull(row.payload?._grookai_ingestion_v1?.classification_reason) ??
    normalizeTextOrNull(row.payload?.classification?.classification_reason) ??
    normalizeTextOrNull(row.raw_payload?._grookai_ingestion_v1?.classification_reason)
  );
}

function extractBaseName(row) {
  return (
    normalizeTextOrNull(row.normalized_name) ??
    normalizeTextOrNull(row.payload?.name) ??
    normalizeTextOrNull(row.raw_payload?.name) ??
    normalizeTextOrNull(row.name_raw?.replace(/\s+-\s+\d.*$/, ''))
  );
}

function extractPrintedNumber(row) {
  return (
    normalizeTextOrNull(row.number_raw) ??
    normalizeTextOrNull(row.payload?.number) ??
    normalizeTextOrNull(row.raw_payload?.number)
  );
}

function extractRarity(row) {
  return (
    normalizeTextOrNull(row.payload?.rarity) ??
    normalizeTextOrNull(row.raw_payload?.rarity)
  );
}

function extractBaseNameForBridge(row, stampedBatchEntry = null) {
  return normalizeTextOrNull(stampedBatchEntry?.name) ?? extractBaseName(row);
}

function extractNumberPlainForBridge(row, stampedBatchEntry = null) {
  return (
    normalizeNumberPlain(stampedBatchEntry?.number_plain) ??
    normalizeNumberPlain(row.normalized_number_plain) ??
    normalizeNumberPlain(extractPrintedNumber(row))
  );
}

function extractVariantIdentity(row) {
  return derivePerfectOrderVariantIdentity({
    sourceSetId: row.set_id,
    numberPlain: row.normalized_number_plain,
    normalizedNameKey: row.normalized_name,
    rawRarity: extractRarity(row),
    upstreamId: row.upstream_id ?? row.payload?._external_id ?? row.raw_payload?._external_id ?? null,
  });
}

function buildStampedVariantIdentity(row, stampedBatchEntry) {
  const proposedVariantKey = normalizeTextOrNull(stampedBatchEntry?.proposed_variant_key);
  if (!proposedVariantKey) {
    return null;
  }

  return {
    rule: normalizeTextOrNull(stampedBatchEntry?.governing_rule_source) ?? STAMPED_IDENTITY_RULE_V1,
    applies: true,
    status: 'RESOLVED_STAMPED_IDENTITY',
    collision_group_key: normalizeTextOrNull(stampedBatchEntry?.canonical_queue_key),
    collision_resolution_reason: 'resolved_by_stamped_identity_rule_v1_batch',
    variant_key: proposedVariantKey,
    illustration_category: null,
    stamp_label: normalizeTextOrNull(stampedBatchEntry?.stamp_label),
    source_evidence: {
      source_set_id: normalizeTextOrNull(stampedBatchEntry?.source_set_id) ?? normalizeTextOrNull(row.set_id),
      source_external_id: normalizeTextOrNull(stampedBatchEntry?.source_external_id) ?? normalizeTextOrNull(row.upstream_id),
      canonical_queue_key: normalizeTextOrNull(stampedBatchEntry?.canonical_queue_key),
      batch_index: Number(stampedBatchEntry?.batch_index ?? 0) || null,
      underlying_base_proof_summary: stampedBatchEntry?.underlying_base_proof_summary ?? null,
      pre_intake_audit: stampedBatchEntry?.pre_intake_audit ?? null,
    },
  };
}

function isCleanUnmatchedBridgeCandidate(row) {
  return (
    normalizeTextOrNull(row.match_status) === STANDARD_BRIDGE_MATCH_STATUS &&
    normalizeTextOrNull(row.candidate_bucket) === STANDARD_BRIDGE_BUCKET &&
    !normalizeTextOrNull(row.card_print_id)
  );
}

function isRetroactiveSetMappedBridgeCandidate(row) {
  return (
    normalizeTextOrNull(row.match_status) === 'AMBIGUOUS' &&
    extractClassificationReason(row) === RETROACTIVE_SET_MAPPING_REASON &&
    !normalizeTextOrNull(row.card_print_id)
  );
}

function getBridgeScope(row, stampedBatchEntry = null) {
  if (stampedBatchEntry) {
    return {
      in_scope: true,
      reason: 'stamped_ready_batch_scope',
    };
  }

  if (isCleanUnmatchedBridgeCandidate(row)) {
    return {
      in_scope: true,
      reason: 'clean_unmatched_candidate',
    };
  }

  if (isRetroactiveSetMappedBridgeCandidate(row)) {
    return {
      in_scope: true,
      reason: 'retroactive_set_mapping_candidate',
    };
  }

  return {
    in_scope: false,
    reason: 'outside_bridge_scope',
  };
}

function buildVariantSummary(sourcePayload) {
  const variants = Array.isArray(sourcePayload?.variants) ? sourcePayload.variants : [];

  return {
    variant_count: variants.length,
    printing_labels: uniqueSortedStrings(variants.map((variant) => variant?.printing)),
    condition_labels: uniqueSortedStrings(variants.map((variant) => variant?.condition)),
    language_labels: uniqueSortedStrings(variants.map((variant) => variant?.language)),
  };
}

function buildClaimedIdentityPayload(row, variantIdentity, canonicalSetCode, canonicalSetName, stampedBatchEntry = null) {
  const rarity = extractRarity(row);
  const baseName = extractBaseNameForBridge(row, stampedBatchEntry);
  const printedNumber = extractPrintedNumber(row);
  const numberPlain = extractNumberPlainForBridge(row, stampedBatchEntry);

  return {
    bridge_source: BRIDGE_SOURCE,
    bridge_version: BRIDGE_VERSION,
    source_candidate_id: row.id,
    source_table: 'external_discovery_candidates',
    source_set_id: row.set_id,
    source_raw_import_id: row.raw_import_id,
    upstream_id: row.upstream_id,
    external_source: row.source,
    set_hint: canonicalSetCode,
    set_code: canonicalSetCode,
    set_name: canonicalSetName,
    card_name: baseName,
    name: baseName,
    printed_number: printedNumber,
    number: printedNumber,
    number_plain: numberPlain,
    rarity_hint: rarity,
    rarity,
    variant_key: normalizeTextOrNull(variantIdentity?.variant_key),
    illustration_category: normalizeTextOrNull(variantIdentity?.illustration_category),
    variant_identity_rule: normalizeTextOrNull(variantIdentity?.rule),
    variant_identity_status: normalizeTextOrNull(variantIdentity?.status),
    collision_group_key: normalizeTextOrNull(variantIdentity?.collision_group_key),
    collision_resolution_reason: normalizeTextOrNull(variantIdentity?.collision_resolution_reason),
    variant_identity: variantIdentity ?? null,
    source_evidence: {
      normalized_name: normalizeTextOrNull(row.normalized_name),
      normalized_number_plain: extractNumberPlainForBridge(row, stampedBatchEntry),
      classification_reason: extractClassificationReason(row),
      stamp_label: normalizeTextOrNull(variantIdentity?.stamp_label),
    },
  };
}

function buildReferenceHintsPayload(row, variantIdentity, canonicalSetCode, canonicalSetName, stampedBatchEntry = null) {
  const sourcePayload = row.raw_payload ?? row.payload ?? {};
  const rarity = extractRarity(row);
  const baseName = extractBaseNameForBridge(row, stampedBatchEntry);
  const printedNumber = extractPrintedNumber(row);
  const numberPlain = extractNumberPlainForBridge(row, stampedBatchEntry);
  const variantSummary = buildVariantSummary(sourcePayload);

  return {
    bridge_source: BRIDGE_SOURCE,
    bridge_version: BRIDGE_VERSION,
    source_candidate_id: row.id,
    source_table: 'external_discovery_candidates',
    source_set_id: row.set_id,
    source_raw_import_id: row.raw_import_id,
    upstream_id: row.upstream_id,
    external_source: row.source,
    set_hint: canonicalSetCode,
    set_code: canonicalSetCode,
    set_name: canonicalSetName,
    card_name: baseName,
    name: baseName,
    printed_number: printedNumber,
    number: printedNumber,
    number_plain: numberPlain,
    rarity_hint: rarity,
    rarity,
    tcgplayer_id: normalizeTextOrNull(row.tcgplayer_id ?? sourcePayload.tcgplayerId),
    normalized_name: normalizeTextOrNull(row.normalized_name),
    normalized_number_left: normalizeTextOrNull(row.normalized_number_left),
    normalized_number_plain: extractNumberPlainForBridge(row, stampedBatchEntry),
    normalized_printed_total: normalizeNumberPlain(row.normalized_printed_total),
    has_slash_number: row.has_slash_number === true,
    has_alpha_suffix_number: row.has_alpha_suffix_number === true,
    has_parenthetical_modifier: row.has_parenthetical_modifier === true,
    match_status: normalizeTextOrNull(row.match_status),
    candidate_bucket: normalizeTextOrNull(row.candidate_bucket),
    classifier_version: normalizeTextOrNull(row.classifier_version),
    original_classification_reason: extractClassificationReason(row),
    variant_key: normalizeTextOrNull(variantIdentity?.variant_key),
    illustration_category: normalizeTextOrNull(variantIdentity?.illustration_category),
    variant_identity_rule: normalizeTextOrNull(variantIdentity?.rule),
    variant_identity_status: normalizeTextOrNull(variantIdentity?.status),
    collision_group_key: normalizeTextOrNull(variantIdentity?.collision_group_key),
    collision_resolution_reason: normalizeTextOrNull(variantIdentity?.collision_resolution_reason),
    variant_identity: variantIdentity ?? null,
    stamp_label: normalizeTextOrNull(variantIdentity?.stamp_label),
    source_card_snapshot: {
      external_id: normalizeTextOrNull(sourcePayload._external_id ?? row.upstream_id),
      set_external_id: normalizeTextOrNull(sourcePayload._set_external_id ?? row.set_id),
      set_name: normalizeTextOrNull(sourcePayload.set_name),
      name: normalizeTextOrNull(sourcePayload.name),
      number: normalizeTextOrNull(sourcePayload.number),
      rarity: normalizeTextOrNull(sourcePayload.rarity),
      tcgplayer_id: normalizeTextOrNull(sourcePayload.tcgplayerId),
      variant_summary: variantSummary,
    },
    stamped_identity_evidence: stampedBatchEntry
      ? {
          canonical_queue_key: normalizeTextOrNull(stampedBatchEntry.canonical_queue_key),
          batch_index: Number(stampedBatchEntry.batch_index ?? 0) || null,
          underlying_base_proof_summary: stampedBatchEntry.underlying_base_proof_summary ?? null,
          pre_intake_audit: stampedBatchEntry.pre_intake_audit ?? null,
        }
      : null,
    provenance: {
      bridge_source: BRIDGE_SOURCE,
      bridge_version: BRIDGE_VERSION,
      source_candidate_id: row.id,
      source_table: 'external_discovery_candidates',
      source_set_id: row.set_id,
      source_raw_import_id: row.raw_import_id,
    },
  };
}

function buildNotes(row, variantIdentity, canonicalSetName, stampedBatchEntry = null) {
  const baseName = extractBaseNameForBridge(row, stampedBatchEntry) ?? 'Unknown Card';
  const printedNumber = extractPrintedNumber(row) ?? 'unknown-number';
  const classificationReason = extractClassificationReason(row) ?? 'unknown';
  const suffix = variantIdentity?.illustration_category ? ` [${variantIdentity.illustration_category}]` : '';

  return [
    `External discovery bridge v1 candidate for ${canonicalSetName ?? 'unknown-set'}: ${baseName} ${printedNumber}${suffix}.`,
    `Source candidate ${row.id} from external_discovery_candidates (${row.set_id}).`,
    `Original discovery classification: ${classificationReason}.`,
  ].join(' ');
}

async function fetchFounderUserId(client) {
  const sql = `
    select id
    from auth.users
    where lower(email) = lower($1)
    limit 1
  `;
  const result = await client.query(sql, [FOUNDER_EMAIL]);
  return result.rows[0]?.id ?? null;
}

async function fetchSetContext(client, setId) {
  const candidateCountSql = `
    select count(*)::int as candidate_row_count
    from public.external_discovery_candidates
    where source = 'justtcg'
      and set_id = $1
  `;
  const candidateCountResult = await client.query(candidateCountSql, [setId]);
  const candidateRowCount = Number(candidateCountResult.rows[0]?.candidate_row_count ?? 0);

  if (candidateRowCount === 0) {
    throw new Error(`bridge_set_missing_from_external_discovery_candidates:${setId}`);
  }

  const mappingSql = `
    select
      s.id as canonical_set_id,
      s.code as canonical_set_code,
      s.name as canonical_set_name
    from public.justtcg_set_mappings jsm
    join public.sets s
      on s.id = jsm.grookai_set_id
    where jsm.active is true
      and jsm.justtcg_set_id = $1
    order by s.code asc
  `;
  const mappingResult = await client.query(mappingSql, [setId]);

  if (mappingResult.rows.length === 1) {
    return {
      sourceSetId: setId,
      candidateRowCount,
      canonicalSetId: mappingResult.rows[0].canonical_set_id,
      canonicalSetCode: mappingResult.rows[0].canonical_set_code,
      canonicalSetName: mappingResult.rows[0].canonical_set_name,
      rowLevelRoutingRequired: false,
    };
  }

  return {
    sourceSetId: setId,
    candidateRowCount,
    canonicalSetId: null,
    canonicalSetCode: null,
    canonicalSetName: null,
    rowLevelRoutingRequired: true,
  };
}

async function fetchRawLaneStats(client, setId) {
  const sql = `
    select count(*)::int as raw_card_rows
    from public.raw_imports
    where source = 'justtcg'
      and payload->>'_kind' = 'card'
      and payload->>'set' = $1
  `;
  const result = await client.query(sql, [setId]);
  return {
    raw_card_rows: Number(result.rows[0]?.raw_card_rows ?? 0),
  };
}

async function fetchDiscoveryCandidates(client, setId, sourceCandidateIds = []) {
  const hasSourceCandidateScope = Array.isArray(sourceCandidateIds) && sourceCandidateIds.length > 0;
  const sql = `
    select
      edc.id,
      edc.source,
      edc.raw_import_id,
      edc.upstream_id,
      edc.tcgplayer_id,
      edc.set_id,
      edc.name_raw,
      edc.number_raw,
      edc.normalized_name,
      edc.normalized_number_left,
      edc.normalized_number_plain,
      edc.normalized_printed_total,
      edc.has_slash_number,
      edc.has_alpha_suffix_number,
      edc.has_parenthetical_modifier,
      edc.match_status,
      edc.candidate_bucket,
      edc.classifier_version,
      edc.resolved_set_code,
      edc.card_print_id,
      edc.payload,
      edc.created_at,
      ri.payload as raw_payload
    from public.external_discovery_candidates edc
    left join public.raw_imports ri
      on ri.id = edc.raw_import_id
    where edc.set_id = $1
      and ($2::uuid[] is null or edc.id = any($2::uuid[]))
    order by
      case
        when edc.normalized_number_plain ~ '^[0-9]+$' then lpad(edc.normalized_number_plain, 8, '0')
        else edc.normalized_number_plain
      end nulls last,
      edc.name_raw asc,
      edc.id asc
  `;

  const result = await client.query(sql, [setId, hasSourceCandidateScope ? sourceCandidateIds : null]);
  return result.rows.map((row) => ({
    ...row,
    payload: asRecord(row.payload) ?? {},
    raw_payload: asRecord(row.raw_payload) ?? asRecord(row.payload) ?? {},
  }));
}

async function fetchExistingBridgeCandidates(client, setId) {
  const sql = `
    select
      id,
      state,
      reference_hints_payload->>'source_candidate_id' as source_candidate_id
    from public.canon_warehouse_candidates
    where reference_hints_payload->>'bridge_source' = $1
      and reference_hints_payload->>'source_set_id' = $2
  `;

  const result = await client.query(sql, [BRIDGE_SOURCE, setId]);
  return new Map(
    result.rows
      .map((row) => [normalizeTextOrNull(row.source_candidate_id), { id: row.id, state: row.state }])
      .filter(([sourceCandidateId]) => Boolean(sourceCandidateId)),
  );
}

function resolveEffectiveSetContext(setContext, stampedBatchEntry = null) {
  const targetBaseResolution = asRecord(stampedBatchEntry?.target_base_resolution);
  const baseProof = asRecord(stampedBatchEntry?.underlying_base_proof_summary);
  const effectiveSetCode =
    normalizeTextOrNull(stampedBatchEntry?.effective_routed_set_code) ??
    normalizeTextOrNull(targetBaseResolution?.target_set_code) ??
    normalizeTextOrNull(baseProof?.live_base_set_code) ??
    normalizeTextOrNull(setContext?.canonicalSetCode);
  const effectiveSetName =
    normalizeTextOrNull(stampedBatchEntry?.effective_routed_set_name) ??
    normalizeTextOrNull(targetBaseResolution?.target_set_name) ??
    normalizeTextOrNull(setContext?.canonicalSetName);

  return {
    canonicalSetCode: effectiveSetCode,
    canonicalSetName: effectiveSetName,
  };
}

function evaluateRows(rows, setContext, stampedBatchLookup = null) {
  const canonicalSetCode = setContext.canonicalSetCode;
  const canonicalSetName = setContext.canonicalSetName;
  const eligibleRows = [];
  const blockedRows = [];
  let scopedRowsRead = 0;
  let outsideBridgeScopeRows = 0;
  let productRowsExcluded = 0;
  let collisionRowsWithVariantIdentity = 0;
  let collisionGroupsResolved = 0;
  let unlabeledCollisionRows = 0;
  const resolvedCollisionGroups = new Set();

  for (const row of rows) {
    const stampedBatchEntry = stampedBatchLookup?.bySourceCandidateId?.get(normalizeTextOrNull(row.id)) ?? null;
    const bridgeScope = getBridgeScope(row, stampedBatchEntry);
    if (!bridgeScope.in_scope) {
      outsideBridgeScopeRows += 1;
      continue;
    }

    scopedRowsRead += 1;

    if (isLikelyProductRow(row) && !shouldBypassProductRowExclusion(stampedBatchEntry)) {
      productRowsExcluded += 1;
      continue;
    }

    const effectiveSetContext = resolveEffectiveSetContext(setContext, stampedBatchEntry);

    const baseName = extractBaseNameForBridge(row, stampedBatchEntry);
    const printedNumber = extractPrintedNumber(row);
    const numberPlain = extractNumberPlainForBridge(row, stampedBatchEntry);

    if (!baseName || !printedNumber || !numberPlain || !effectiveSetContext.canonicalSetCode) {
      blockedRows.push({
        source_candidate_id: row.id,
        reason: 'missing_minimum_identity_shape',
        name: baseName,
        number: printedNumber,
      });
      continue;
    }

    const variantIdentity = stampedBatchEntry
      ? buildStampedVariantIdentity(row, stampedBatchEntry)
      : extractVariantIdentity(row);
    if (variantIdentity?.status === 'BLOCKED_UNLABELED_COLLISION') {
      unlabeledCollisionRows += 1;
      blockedRows.push({
        source_candidate_id: row.id,
        reason: 'unlabeled_collision_group',
        name: baseName,
        number: printedNumber,
        collision_group_key: variantIdentity.collision_group_key,
      });
      continue;
    }

    if (variantIdentity?.status === 'RESOLVED_BY_VARIANT_KEY') {
      collisionRowsWithVariantIdentity += 1;
      if (normalizeTextOrNull(variantIdentity.collision_group_key)) {
        resolvedCollisionGroups.add(variantIdentity.collision_group_key);
      }
    }

    const claimedIdentityPayload = buildClaimedIdentityPayload(
      row,
      variantIdentity,
      effectiveSetContext.canonicalSetCode,
      effectiveSetContext.canonicalSetName,
      stampedBatchEntry,
    );
    const referenceHintsPayload = buildReferenceHintsPayload(
      row,
      variantIdentity,
      effectiveSetContext.canonicalSetCode,
      effectiveSetContext.canonicalSetName,
      stampedBatchEntry,
    );

    eligibleRows.push({
      row,
      bridge_scope_reason: bridgeScope.reason,
      canonical_set_code: effectiveSetContext.canonicalSetCode,
      canonical_set_name: effectiveSetContext.canonicalSetName,
      stamped_batch_entry: stampedBatchEntry,
      variant_identity: variantIdentity,
      claimed_identity_payload: claimedIdentityPayload,
      reference_hints_payload: referenceHintsPayload,
      notes: buildNotes(row, variantIdentity, effectiveSetContext.canonicalSetName, stampedBatchEntry),
      tcgplayer_id: normalizeTextOrNull(row.tcgplayer_id ?? row.payload?.tcgplayerId ?? row.raw_payload?.tcgplayerId),
    });
  }

  collisionGroupsResolved = resolvedCollisionGroups.size;

  return {
    canonicalSetCode,
    canonicalSetName,
    scopedRowsRead,
    outsideBridgeScopeRows,
    eligibleRows,
    blockedRows,
    productRowsExcluded,
    collisionRowsWithVariantIdentity,
    collisionGroupsResolved,
    unlabeledCollisionRows,
  };
}

async function insertCandidate(client, founderUserId, candidate) {
  const payloadSnapshot = {
    founder_user_id: founderUserId,
    source_candidate_id: candidate.row?.id ?? null,
    source_set_id: candidate.row?.set_id ?? null,
    bridge_scope_reason: candidate.bridge_scope_reason ?? null,
    canonical_set_code: candidate.canonical_set_code ?? null,
    canonical_set_name: candidate.canonical_set_name ?? null,
    claimed_identity_payload: candidate.claimed_identity_payload ?? null,
    reference_hints_payload: candidate.reference_hints_payload ?? null,
  };

  const insertCandidateSql = `
    insert into public.canon_warehouse_candidates (
      submitted_by_user_id,
      intake_channel,
      submission_type,
      notes,
      tcgplayer_id,
      submission_intent,
      state,
      claimed_identity_payload,
      reference_hints_payload
    )
    values (
      $1,
      'MANUAL',
      'EXTERNAL_DISCOVERY_BRIDGE_V1',
      $2,
      $3,
      'MISSING_CARD',
      'RAW',
      $4::jsonb,
      $5::jsonb
    )
    returning id
  `;

  const insertEventSql = `
    insert into public.canon_warehouse_candidate_events (
      candidate_id,
      event_type,
      action,
      previous_state,
      next_state,
      actor_user_id,
      actor_type,
      metadata
    )
    values (
      $1,
      'EXTERNAL_DISCOVERY_BRIDGED_TO_WAREHOUSE_V1',
      'BRIDGE',
      null,
      'RAW',
      $2,
      'SYSTEM',
      $3::jsonb
    )
  `;

  let candidateId = null;
  await assertExecuteCanonWriteV1({
    execution_name: 'external_discovery_to_warehouse_bridge_v1',
    payload_snapshot,
    write_target: client,
    audit_target: client,
    ledger_target: client,
    transaction_control: 'external',
    actor_type: 'system_worker',
    actor_id: founderUserId,
    source_worker: BRIDGE_VERSION,
    source_system: 'warehouse',
    contract_assertions: [
      {
        ok: Boolean(founderUserId),
        contract_name: 'GROOKAI_GUARDRAILS',
        violation_type: 'missing_founder_user_id',
        reason: 'Bridge execution requires founder user id.',
      },
      {
        ok: Boolean(candidate.claimed_identity_payload),
        contract_name: 'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
        violation_type: 'missing_claimed_identity_payload',
        reason: `Bridge candidate ${candidate.row?.id ?? 'unknown'} is missing claimed identity payload.`,
      },
      {
        ok: Boolean(candidate.reference_hints_payload),
        contract_name: 'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
        violation_type: 'missing_reference_hints_payload',
        reason: `Bridge candidate ${candidate.row?.id ?? 'unknown'} is missing reference hints payload.`,
      },
      {
        ok: Boolean(candidate.row?.id),
        contract_name: 'EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1',
        violation_type: 'missing_source_candidate_id',
        reason: 'Bridge candidate requires source candidate id.',
      },
    ],
    proofs: [
      {
        name: 'warehouse_candidate_inserted',
        contract_name: 'EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1',
        violation_type: 'post_write_candidate_missing',
        query: `
          select state
          from public.canon_warehouse_candidates
          where id = $1
          limit 1
        `,
        params: [candidateId],
        evaluate(result) {
          const state = normalizeTextOrNull(result.rows[0]?.state);
          return {
            ok: state === 'RAW',
            reason: `Bridge candidate ${candidateId} expected RAW state after insert, found ${state ?? 'null'}.`,
          };
        },
      },
      {
        name: 'warehouse_bridge_event_inserted',
        contract_name: 'INGESTION_PIPELINE_CONTRACT_V1',
        violation_type: 'post_write_bridge_event_missing',
        query: `
          select count(*)::int as event_count
          from public.canon_warehouse_candidate_events
          where candidate_id = $1
            and event_type = 'EXTERNAL_DISCOVERY_BRIDGED_TO_WAREHOUSE_V1'
        `,
        params: [candidateId],
        evaluate(result) {
          const eventCount = Number(result.rows[0]?.event_count ?? 0);
          return {
            ok: eventCount >= 1,
            reason: `Bridge candidate ${candidateId} is missing EXTERNAL_DISCOVERY_BRIDGED_TO_WAREHOUSE_V1 event.`,
          };
        },
      },
    ],
    async write(connection) {
      const candidateResult = await connection.query(insertCandidateSql, [
        founderUserId,
        candidate.notes,
        candidate.tcgplayer_id,
        JSON.stringify(candidate.claimed_identity_payload),
        JSON.stringify(candidate.reference_hints_payload),
      ]);

      candidateId = candidateResult.rows[0]?.id ?? null;
      if (!candidateId) {
        throw new Error(`bridge_insert_failed:${candidate.row.id}`);
      }
      payloadSnapshot.candidate_id = candidateId;

      await connection.query(insertEventSql, [
        candidateId,
        founderUserId,
        JSON.stringify({
          bridge_source: BRIDGE_SOURCE,
          bridge_version: BRIDGE_VERSION,
          source_candidate_id: candidate.row.id,
          source_table: 'external_discovery_candidates',
          source_set_id: candidate.row.set_id,
          source_raw_import_id: candidate.row.raw_import_id,
          upstream_id: candidate.row.upstream_id,
          variant_identity: candidate.variant_identity ?? null,
        }),
      ]);
    },
  });

  return candidateId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const stampedBatchLookup = loadStampedBatchLookup(args.stampedBatchFile);
    const founderUserId = await fetchFounderUserId(client);
    if (!founderUserId) {
      throw new Error(`founder_user_missing:${FOUNDER_EMAIL}`);
    }

    const [setContext, rawLaneStats, discoveryRows, existingBridgeCandidates] = await Promise.all([
      fetchSetContext(client, args.setId),
      fetchRawLaneStats(client, args.setId),
      fetchDiscoveryCandidates(client, args.setId, args.sourceCandidateIds),
      fetchExistingBridgeCandidates(client, args.setId),
    ]);

    const evaluation = evaluateRows(discoveryRows, setContext, stampedBatchLookup);
    const upstreamProductRowsExcluded = Math.max(rawLaneStats.raw_card_rows - discoveryRows.length, 0);
    const bridgeableRows = [];
    const existingRows = [];
    const existingNonRawBlocked = [];

    for (const candidate of evaluation.eligibleRows) {
      const existing = existingBridgeCandidates.get(candidate.row.id);
      if (!existing) {
        bridgeableRows.push(candidate);
        continue;
      }

      if (existing.state !== 'RAW') {
        existingNonRawBlocked.push({
          source_candidate_id: candidate.row.id,
          warehouse_candidate_id: existing.id,
          state: existing.state,
        });
        continue;
      }

      existingRows.push({
        source_candidate_id: candidate.row.id,
        warehouse_candidate_id: existing.id,
        state: existing.state,
      });
    }

    const summary = {
      bridge_version: BRIDGE_VERSION,
      bridge_source: BRIDGE_SOURCE,
      set_id: args.setId,
      stamped_batch_file: stampedBatchLookup?.resolvedPath ?? null,
      source_candidate_scope_count: args.sourceCandidateIds.length,
      source_rows_read: discoveryRows.length,
      set_candidate_rows_found: setContext.candidateRowCount,
      canonical_set_code_hint: evaluation.canonicalSetCode,
      canonical_set_name_hint: evaluation.canonicalSetName,
      row_level_routing_required: setContext.rowLevelRoutingRequired === true,
      dry_run: !args.apply,
      candidates_read: evaluation.scopedRowsRead,
      outside_bridge_scope_rows: evaluation.outsideBridgeScopeRows,
      eligible: evaluation.eligibleRows.length,
      blocked: evaluation.blockedRows.length + existingNonRawBlocked.length,
      collision_rows: evaluation.collisionRowsWithVariantIdentity + evaluation.unlabeledCollisionRows,
      candidates_eligible: evaluation.eligibleRows.length,
      candidates_blocked: evaluation.blockedRows.length + existingNonRawBlocked.length,
      candidates_bridged: args.apply ? 0 : bridgeableRows.length,
      candidates_already_present: existingRows.length,
      product_rows_excluded: evaluation.productRowsExcluded + upstreamProductRowsExcluded,
      bridge_scope_product_rows_excluded: evaluation.productRowsExcluded,
      upstream_product_rows_excluded: upstreamProductRowsExcluded,
      collision_rows_with_variant_identity: evaluation.collisionRowsWithVariantIdentity,
      collision_groups_resolved: evaluation.collisionGroupsResolved,
      unlabeled_collision_rows: evaluation.unlabeledCollisionRows,
      existing_non_raw_blocked: existingNonRawBlocked.length,
      blocked_examples: [...evaluation.blockedRows, ...existingNonRawBlocked].slice(0, 10),
    };

    if (!args.apply) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    if (summary.candidates_blocked > 0) {
      throw new Error(`bridge_apply_blocked:${summary.candidates_blocked}`);
    }

    await client.query('begin');
    let inserted = 0;
    for (const candidate of bridgeableRows) {
      await insertCandidate(client, founderUserId, candidate);
      inserted += 1;
    }
    await client.query('commit');

    summary.candidates_bridged = inserted;
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // no-op
    }
    throw error;
  } finally {
    await client.end();
  }
}

await main();
