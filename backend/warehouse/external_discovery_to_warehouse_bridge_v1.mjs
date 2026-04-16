import '../env.mjs';

import pg from 'pg';

import { derivePerfectOrderVariantIdentity } from '../identity/perfect_order_variant_identity_rule_v1.mjs';

const { Client } = pg;

const BRIDGE_VERSION = 'EXTERNAL_DISCOVERY_TO_WAREHOUSE_BRIDGE_V1';
const BRIDGE_SOURCE = 'external_discovery_bridge_v1';
const SUPPORTED_SET_ID = 'me03-perfect-order-pokemon';
const FOUNDER_EMAIL = 'ccabrl@gmail.com';

const PRODUCT_NAME_PATTERN =
  /\b(booster box|box|pack|collection|bundle|deck|case|tin|etb|accessory|sleeve|binder|code card)\b/i;

function printUsage() {
  console.log(`Usage: node backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs --set-id=<external-set-id> [--apply]`);
}

function parseArgs(argv) {
  let setId = null;
  let apply = false;

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

    throw new Error(`unknown_argument:${value}`);
  }

  if (!setId) {
    throw new Error('missing_required_argument:--set-id');
  }

  return { setId, apply };
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

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function uniqueSortedStrings(values) {
  return [...new Set(values.map((value) => normalizeTextOrNull(value)).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function inferCanonicalSetCode(setId) {
  if (setId === SUPPORTED_SET_ID) {
    return 'me03';
  }

  return null;
}

function inferCanonicalSetName(sourcePayload) {
  const setName = normalizeTextOrNull(sourcePayload?.set_name);
  if (!setName) {
    return null;
  }

  return setName.replace(/^ME03:\s*/i, '').trim();
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

function extractVariantIdentity(row) {
  return derivePerfectOrderVariantIdentity({
    sourceSetId: row.set_id,
    numberPlain: row.normalized_number_plain,
    normalizedNameKey: row.normalized_name,
    rawRarity: extractRarity(row),
    upstreamId: row.upstream_id ?? row.payload?._external_id ?? row.raw_payload?._external_id ?? null,
  });
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

function buildClaimedIdentityPayload(row, variantIdentity, canonicalSetCode, canonicalSetName) {
  const rarity = extractRarity(row);
  const baseName = extractBaseName(row);
  const printedNumber = extractPrintedNumber(row);
  const numberPlain = normalizeNumberPlain(row.normalized_number_plain);

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
      normalized_number_plain: normalizeNumberPlain(row.normalized_number_plain),
      classification_reason: extractClassificationReason(row),
    },
  };
}

function buildReferenceHintsPayload(row, variantIdentity, canonicalSetCode, canonicalSetName) {
  const sourcePayload = row.raw_payload ?? row.payload ?? {};
  const rarity = extractRarity(row);
  const baseName = extractBaseName(row);
  const printedNumber = extractPrintedNumber(row);
  const numberPlain = normalizeNumberPlain(row.normalized_number_plain);
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
    normalized_number_plain: normalizeNumberPlain(row.normalized_number_plain),
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

function buildNotes(row, variantIdentity, canonicalSetName) {
  const baseName = extractBaseName(row) ?? 'Unknown Card';
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

async function fetchDiscoveryCandidates(client, setId) {
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
      edc.payload,
      edc.created_at,
      ri.payload as raw_payload
    from public.external_discovery_candidates edc
    left join public.raw_imports ri
      on ri.id = edc.raw_import_id
    where edc.set_id = $1
    order by
      case
        when edc.normalized_number_plain ~ '^[0-9]+$' then lpad(edc.normalized_number_plain, 8, '0')
        else edc.normalized_number_plain
      end nulls last,
      edc.name_raw asc,
      edc.id asc
  `;

  const result = await client.query(sql, [setId]);
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

function evaluateRows(rows, setId) {
  const canonicalSetCode = inferCanonicalSetCode(setId);
  const canonicalSetName = inferCanonicalSetName(rows[0]?.raw_payload ?? rows[0]?.payload ?? {}) ?? 'Perfect Order';
  const eligibleRows = [];
  const blockedRows = [];
  let productRowsExcluded = 0;
  let collisionRowsWithVariantIdentity = 0;
  let collisionGroupsResolved = 0;
  let unlabeledCollisionRows = 0;
  const resolvedCollisionGroups = new Set();

  for (const row of rows) {
    if (isLikelyProductRow(row)) {
      productRowsExcluded += 1;
      continue;
    }

    const baseName = extractBaseName(row);
    const printedNumber = extractPrintedNumber(row);
    const numberPlain = normalizeNumberPlain(row.normalized_number_plain);

    if (!baseName || !printedNumber || !numberPlain || !canonicalSetCode) {
      blockedRows.push({
        source_candidate_id: row.id,
        reason: 'missing_minimum_identity_shape',
        name: baseName,
        number: printedNumber,
      });
      continue;
    }

    const variantIdentity = extractVariantIdentity(row);
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

    const claimedIdentityPayload = buildClaimedIdentityPayload(row, variantIdentity, canonicalSetCode, canonicalSetName);
    const referenceHintsPayload = buildReferenceHintsPayload(row, variantIdentity, canonicalSetCode, canonicalSetName);

    eligibleRows.push({
      row,
      canonical_set_code: canonicalSetCode,
      canonical_set_name: canonicalSetName,
      variant_identity: variantIdentity,
      claimed_identity_payload: claimedIdentityPayload,
      reference_hints_payload: referenceHintsPayload,
      notes: buildNotes(row, variantIdentity, canonicalSetName),
      tcgplayer_id: normalizeTextOrNull(row.tcgplayer_id ?? row.payload?.tcgplayerId ?? row.raw_payload?.tcgplayerId),
    });
  }

  collisionGroupsResolved = resolvedCollisionGroups.size;

  return {
    canonicalSetCode,
    canonicalSetName,
    eligibleRows,
    blockedRows,
    productRowsExcluded,
    collisionRowsWithVariantIdentity,
    collisionGroupsResolved,
    unlabeledCollisionRows,
  };
}

async function insertCandidate(client, founderUserId, candidate) {
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

  const candidateResult = await client.query(insertCandidateSql, [
    founderUserId,
    candidate.notes,
    candidate.tcgplayer_id,
    JSON.stringify(candidate.claimed_identity_payload),
    JSON.stringify(candidate.reference_hints_payload),
  ]);

  const candidateId = candidateResult.rows[0]?.id;
  if (!candidateId) {
    throw new Error(`bridge_insert_failed:${candidate.row.id}`);
  }

  await client.query(insertEventSql, [
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

  return candidateId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.setId !== SUPPORTED_SET_ID) {
    throw new Error(`unsupported_set_id_for_bridge_v1:${args.setId}`);
  }

  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();

  try {
    const founderUserId = await fetchFounderUserId(client);
    if (!founderUserId) {
      throw new Error(`founder_user_missing:${FOUNDER_EMAIL}`);
    }

    const [rawLaneStats, discoveryRows, existingBridgeCandidates] = await Promise.all([
      fetchRawLaneStats(client, args.setId),
      fetchDiscoveryCandidates(client, args.setId),
      fetchExistingBridgeCandidates(client, args.setId),
    ]);

    const evaluation = evaluateRows(discoveryRows, args.setId);
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
      canonical_set_code_hint: evaluation.canonicalSetCode,
      dry_run: !args.apply,
      candidates_read: discoveryRows.length,
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
