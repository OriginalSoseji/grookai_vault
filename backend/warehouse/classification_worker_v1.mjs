import '../env.mjs';

import pg from 'pg';

import {
  VERSION_FINISH_DECISIONS,
  interpretVersionVsFinish,
} from '../printing/version_finish_interpreter_v1.mjs';
import {
  buildSourceBackedInterpreterPackage,
  buildSourceBackedMetadataExtractionPackages,
  getSourceBackedIdentity,
} from './source_identity_contract_v1.mjs';

const { Pool } = pg;

const WORKER_NAME = 'classification_worker_v1';
const MIN_RESOLVER_CONFIDENCE_FOR_CLASSIFICATION = 0.70;
const PROCESSING_EVENT_TYPES = new Set([
  'NORMALIZATION_COMPLETE',
  'NORMALIZATION_PARTIAL',
  'NORMALIZATION_BLOCKED',
  'CLASSIFICATION_COMPLETE',
  'CLASSIFICATION_PARTIAL',
  'CLASSIFICATION_BLOCKED',
  'WAREHOUSE_REVIEW_READY',
]);

// Reuse map:
// - identity_scan_event_results: upstream machine hints + prior deterministic candidate suggestions
// - search_card_prints_v1: existing deterministic print resolver/search boundary
// - version_finish_interpreter_v1: bounded ROW / CHILD / BLOCKED finish interpretation
// - card_printings: deterministic child lookup once a parent card_print is resolved
// - identity_snapshots / condition_snapshots: evidence envelopes only, not canon authority
// Candidate row = current summary surface for review queues.
// Event metadata = append-only detailed history of normalized/classification packages.

function log(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), worker: WORKER_NAME, event, ...payload }));
}

function parseArgs(argv) {
  const opts = {
    limit: 25,
    candidateId: null,
    dryRun: true,
    apply: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      opts.dryRun = true;
      opts.apply = false;
      continue;
    }
    if (arg === '--apply') {
      opts.apply = true;
      opts.dryRun = false;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(value) && value > 0) {
        opts.limit = value;
      }
      continue;
    }
    if (arg.startsWith('--candidate-id=')) {
      const value = arg.slice('--candidate-id='.length).trim();
      if (value) {
        opts.candidateId = value;
      }
    }
  }

  return opts;
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const digits = normalized.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : null;
}

function normalizePrintedNumber(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized.replace(/\s+/g, '');
}

function clampZeroOne(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => normalizeTextOrNull(value))
        .filter(Boolean),
    ),
  );
}

function uniqueSortedStrings(values) {
  return uniqueStrings(values).sort((left, right) => left.localeCompare(right));
}

function parseJsonSafe(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }
  return value;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? ''),
  );
}

function refForPath(prefix, id, side, path) {
  const normalizedPath = normalizeTextOrNull(path);
  if (!normalizedPath) return null;
  return `${prefix}:${id}:${side}:${normalizedPath}`;
}

function extractSnapshotImagePath(images, side) {
  const payload = parseJsonSafe(images, null);
  if (!payload || typeof payload !== 'object') return null;
  return (
    normalizeTextOrNull(payload?.paths?.[side]) ||
    normalizeTextOrNull(payload?.[side]?.path) ||
    normalizeTextOrNull(payload?.[side])
  );
}

function extractScalarString(payload, ...paths) {
  for (const path of paths) {
    let current = payload;
    let found = true;
    for (const key of path) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        found = false;
        break;
      }
      current = current[key];
    }
    if (!found) continue;
    const normalized = normalizeTextOrNull(current);
    if (normalized) return normalized;
  }
  return null;
}

function extractScalarNumber(payload, ...paths) {
  for (const path of paths) {
    let current = payload;
    let found = true;
    for (const key of path) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        found = false;
        break;
      }
      current = current[key];
    }
    if (!found) continue;
    if (typeof current === 'number' && Number.isFinite(current)) return current;
    if (typeof current === 'string') {
      const parsed = Number(current);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pushUnique(list, value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return;
  if (!list.includes(normalized)) {
    list.push(normalized);
  }
}

function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

function extractCandidateIdentityHints(candidate) {
  const claimed = asRecord(candidate?.claimed_identity_payload);
  const reference = asRecord(candidate?.reference_hints_payload);

  return {
    card_name:
      normalizeTextOrNull(claimed?.card_name) ??
      normalizeTextOrNull(claimed?.name) ??
      normalizeTextOrNull(reference?.card_name) ??
      normalizeTextOrNull(reference?.name),
    printed_number:
      normalizeTextOrNull(claimed?.printed_number) ??
      normalizeTextOrNull(claimed?.number) ??
      normalizeTextOrNull(reference?.printed_number) ??
      normalizeTextOrNull(reference?.number),
    set_hint:
      normalizeTextOrNull(claimed?.set_hint) ??
      normalizeTextOrNull(claimed?.set_code) ??
      normalizeTextOrNull(reference?.set_hint) ??
      normalizeTextOrNull(reference?.set_code),
    rarity_hint:
      normalizeTextOrNull(claimed?.rarity_hint) ??
      normalizeTextOrNull(claimed?.rarity) ??
      normalizeTextOrNull(reference?.rarity_hint) ??
      normalizeTextOrNull(reference?.rarity),
  };
}

function extractCandidateVariantIdentity(candidate) {
  const claimed = asRecord(candidate?.claimed_identity_payload);
  const reference = asRecord(candidate?.reference_hints_payload);
  const claimedVariant = asRecord(claimed?.variant_identity);
  const referenceVariant = asRecord(reference?.variant_identity);
  const source = claimedVariant ?? referenceVariant;

  const rule =
    normalizeTextOrNull(source?.rule) ??
    normalizeTextOrNull(claimed?.variant_identity_rule) ??
    normalizeTextOrNull(reference?.variant_identity_rule);
  const status =
    normalizeTextOrNull(source?.status) ??
    normalizeTextOrNull(claimed?.variant_identity_status) ??
    normalizeTextOrNull(reference?.variant_identity_status);
  const variantKey =
    normalizeTextOrNull(source?.variant_key) ??
    normalizeTextOrNull(claimed?.variant_key) ??
    normalizeTextOrNull(reference?.variant_key);
  const illustrationCategory =
    normalizeTextOrNull(source?.illustration_category) ??
    normalizeTextOrNull(claimed?.illustration_category) ??
    normalizeTextOrNull(reference?.illustration_category);
  const collisionGroupKey =
    normalizeTextOrNull(source?.collision_group_key) ??
    normalizeTextOrNull(claimed?.collision_group_key) ??
    normalizeTextOrNull(reference?.collision_group_key);
  const collisionResolutionReason =
    normalizeTextOrNull(source?.collision_resolution_reason) ??
    normalizeTextOrNull(claimed?.collision_resolution_reason) ??
    normalizeTextOrNull(reference?.collision_resolution_reason);
  const sourceEvidence = asRecord(source?.source_evidence);

  if (!rule && !status && !variantKey && !illustrationCategory && !collisionGroupKey) {
    return null;
  }

  return {
    rule,
    status,
    variant_key: variantKey,
    illustration_category: illustrationCategory,
    collision_group_key: collisionGroupKey,
    collision_resolution_reason: collisionResolutionReason,
    source_evidence: sourceEvidence,
  };
}

function buildSourceSummary(evidenceRows, derived) {
  const evidenceKinds = uniqueSortedStrings(evidenceRows.map((row) => row.evidence_kind));
  return {
    has_front_image: !!derived.primaryFrontImageRef,
    has_back_image: !!derived.secondaryBackImageRef,
    has_identity_snapshot: derived.identitySnapshots.length > 0,
    has_condition_snapshot: derived.conditionSnapshots.length > 0,
    has_identity_scan_event: derived.scanEvents.length > 0,
    has_identity_scan_results: derived.latestScanResults.length > 0,
    has_source_backed_identity: derived.sourceBackedIdentity?.is_complete === true,
    source_type: derived.sourceBackedIdentity?.source_type ?? null,
    bridge_source: derived.sourceBackedIdentity?.bridge_source ?? null,
    evidence_kinds: evidenceKinds,
  };
}

function chooseNormalizationStatus(sourceSummary, unresolvedFields, blockingReasons) {
  if (blockingReasons.length > 0) {
    return 'NORMALIZATION_BLOCKED';
  }

  const strongIdentitySurface =
    sourceSummary.has_source_backed_identity ||
    sourceSummary.has_front_image ||
    sourceSummary.has_identity_snapshot ||
    sourceSummary.has_condition_snapshot ||
    sourceSummary.has_identity_scan_results;

  if (!strongIdentitySurface) {
    return 'NORMALIZATION_BLOCKED';
  }

  if (unresolvedFields.length === 0) {
    return 'NORMALIZED_READY';
  }

  return 'NORMALIZED_PARTIAL';
}

function chooseSourceStrength(sourceSummary, bestHintConfidence, exactReferenceStrength) {
  if (exactReferenceStrength === true || sourceSummary.has_identity_scan_results || bestHintConfidence !== null) {
    return 'STRONG';
  }
  if (sourceSummary.has_identity_snapshot || sourceSummary.has_condition_snapshot || sourceSummary.has_identity_scan_event) {
    return 'MODERATE';
  }
  return 'WEAK';
}

function deriveFinishSignals(candidate, normalizedHints) {
  const noteText = normalizeTextOrNull(candidate.notes)?.toLowerCase() ?? '';
  const nameText = normalizeTextOrNull(normalizedHints?.card_name)?.toLowerCase() ?? '';
  const combined = [noteText, nameText].filter(Boolean).join(' ');

  if (!combined) {
    return {
      finishHint: null,
      differentIssuedVersion: null,
      finishOnly: null,
      representableFinish: null,
    };
  }

  if (combined.includes('master ball')) {
    return {
      finishHint: 'masterball',
      differentIssuedVersion: false,
      finishOnly: true,
      representableFinish: true,
    };
  }

  if (combined.includes('poke ball') || combined.includes('pokeball')) {
    return {
      finishHint: 'pokeball',
      differentIssuedVersion: false,
      finishOnly: true,
      representableFinish: true,
    };
  }

  if (combined.includes('reverse')) {
    return {
      finishHint: 'reverse',
      differentIssuedVersion: false,
      finishOnly: true,
      representableFinish: true,
    };
  }

  if (combined.includes('holo')) {
    return {
      finishHint: 'holo',
      differentIssuedVersion: false,
      finishOnly: true,
      representableFinish: true,
    };
  }

  if (
    combined.includes('1st edition') ||
    combined.includes('first edition') ||
    combined.includes('unlimited') ||
    combined.includes('staff') ||
    combined.includes('prerelease') ||
    combined.includes('league')
  ) {
    return {
      finishHint: null,
      differentIssuedVersion: true,
      finishOnly: false,
      representableFinish: false,
    };
  }

  if (combined.includes('pattern') || combined.includes('special')) {
    return {
      finishHint: null,
      differentIssuedVersion: false,
      finishOnly: false,
      representableFinish: false,
    };
  }

  return {
    finishHint: null,
    differentIssuedVersion: null,
    finishOnly: null,
    representableFinish: null,
  };
}

function summarizeConditionScanQuality(snapshot) {
  const scanQuality = parseJsonSafe(snapshot?.scan_quality, {});
  const confidence =
    typeof snapshot?.confidence === 'number' && Number.isFinite(snapshot.confidence)
      ? snapshot.confidence
      : null;

  return {
    ok: scanQuality?.ok === true,
    analysis_status: normalizeTextOrNull(scanQuality?.analysis_status),
    failure_reason: normalizeTextOrNull(scanQuality?.failure_reason),
    confidence,
  };
}

function buildUnresolvedFields(visibleIdentityHints, sourceSummary) {
  const unresolved = [];

  if (!sourceSummary.has_source_backed_identity) {
    if (!sourceSummary.has_front_image) pushUnique(unresolved, 'front_image');
    if (!sourceSummary.has_back_image) pushUnique(unresolved, 'back_image');
  }

  if (!normalizeTextOrNull(visibleIdentityHints.card_name)) pushUnique(unresolved, 'card_name');
  if (!normalizeTextOrNull(visibleIdentityHints.printed_number)) pushUnique(unresolved, 'printed_number');
  if (!normalizeTextOrNull(visibleIdentityHints.set_hint)) pushUnique(unresolved, 'set_hint');
  if (!normalizeTextOrNull(visibleIdentityHints.finish_hint)) pushUnique(unresolved, 'finish_hint');
  if (!normalizeTextOrNull(visibleIdentityHints.rarity_hint)) pushUnique(unresolved, 'rarity_hint');
  if (!normalizeTextOrNull(visibleIdentityHints.supertype_hint)) pushUnique(unresolved, 'supertype_hint');
  if (!Array.isArray(visibleIdentityHints.subtype_hints) || visibleIdentityHints.subtype_hints.length === 0) {
    pushUnique(unresolved, 'subtype_hints');
  }
  if (!normalizeTextOrNull(visibleIdentityHints.language_hint)) pushUnique(unresolved, 'language_hint');

  return unresolved;
}

function isReviewableCandidate(candidate, sourceSummary) {
  return !!(
    sourceSummary.has_front_image ||
    sourceSummary.has_back_image ||
    sourceSummary.has_identity_snapshot ||
    sourceSummary.has_condition_snapshot ||
    sourceSummary.has_identity_scan_results ||
    normalizeTextOrNull(candidate.tcgplayer_id)
  );
}

async function fetchRawCandidateIds(client, limit) {
  const sql = `
    select id
    from public.canon_warehouse_candidates
    where state = 'RAW'
    order by created_at asc, id asc
    limit $1
  `;
  const { rows } = await client.query(sql, [limit]);
  return rows.map((row) => row.id);
}

async function fetchCandidate(client, candidateId) {
  const sql = `
    select
      id,
      submitted_by_user_id,
      intake_channel,
      submission_type,
      notes,
      tcgplayer_id,
      submission_intent,
      state,
      claimed_identity_payload,
      reference_hints_payload,
      current_review_hold_reason,
      interpreter_decision,
      interpreter_reason_code,
      interpreter_explanation,
      interpreter_resolved_finish_key,
      needs_promotion_review,
      proposed_action_type,
      created_at,
      updated_at
    from public.canon_warehouse_candidates
    where id = $1
    limit 1
  `;
  const { rows } = await client.query(sql, [candidateId]);
  return rows[0] ?? null;
}

async function fetchEvidenceRows(client, candidateId) {
  const sql = `
    select
      id,
      candidate_id,
      evidence_kind,
      evidence_slot,
      identity_snapshot_id,
      condition_snapshot_id,
      identity_scan_event_id,
      storage_path,
      metadata_payload,
      created_by_user_id,
      created_at
    from public.canon_warehouse_candidate_evidence
    where candidate_id = $1
    order by created_at asc, id asc
  `;
  const { rows } = await client.query(sql, [candidateId]);
  return rows;
}

async function fetchCandidateEvents(client, candidateId) {
  const sql = `
    select
      id,
      event_type,
      action,
      previous_state,
      next_state,
      metadata,
      created_at
    from public.canon_warehouse_candidate_events
    where candidate_id = $1
    order by created_at asc, id asc
  `;
  const { rows } = await client.query(sql, [candidateId]);
  return rows;
}

async function fetchIdentitySnapshots(client, ids) {
  if (!ids.length) return [];
  const sql = `
    select id, images, scan_quality, created_at
    from public.identity_snapshots
    where id = any($1::uuid[])
  `;
  const { rows } = await client.query(sql, [ids]);
  return rows;
}

async function fetchConditionSnapshots(client, ids) {
  if (!ids.length) return [];
  const sql = `
    select id, images, scan_quality, measurements, confidence, card_print_id, created_at
    from public.condition_snapshots
    where id = any($1::uuid[])
  `;
  const { rows } = await client.query(sql, [ids]);
  return rows;
}

async function fetchScanEvents(client, directEventIds, identitySnapshotIds, conditionSnapshotIds) {
  const conditions = [];
  const params = [];

  if (directEventIds.length) {
    params.push(directEventIds);
    conditions.push(`id = any($${params.length}::uuid[])`);
  }
  if (identitySnapshotIds.length) {
    params.push(identitySnapshotIds);
    conditions.push(`identity_snapshot_id = any($${params.length}::uuid[])`);
  }
  if (conditionSnapshotIds.length) {
    params.push(conditionSnapshotIds);
    conditions.push(`snapshot_id = any($${params.length}::uuid[])`);
  }

  if (!conditions.length) return [];

  const sql = `
    select
      id,
      user_id,
      snapshot_id,
      identity_snapshot_id,
      source_table,
      status,
      signals,
      candidates,
      analysis_version,
      error,
      created_at
    from public.identity_scan_events
    where ${conditions.join(' or ')}
    order by created_at desc, id desc
  `;

  const { rows } = await client.query(sql, params);
  return rows;
}

async function fetchLatestScanResults(client, scanEventIds) {
  if (!scanEventIds.length) return [];
  const sql = `
    select distinct on (identity_scan_event_id)
      id,
      identity_scan_event_id,
      status,
      signals,
      candidates,
      error,
      analysis_version,
      created_at
    from public.identity_scan_event_results
    where identity_scan_event_id = any($1::uuid[])
    order by identity_scan_event_id, created_at desc, id desc
  `;
  const { rows } = await client.query(sql, [scanEventIds]);
  return rows;
}

async function fetchCardPrintsByIds(client, ids) {
  if (!ids.length) return [];
  const sql = `
    select
      id,
      name,
      set_code,
      number,
      number_plain,
      variant_key,
      rarity,
      coalesce(image_url, image_alt_url) as image_url,
      tcgplayer_id,
      print_identity_key
    from public.card_prints
    where id = any($1::uuid[])
  `;
  const { rows } = await client.query(sql, [ids]);
  return rows;
}

async function fetchCardPrintingByParentAndFinish(client, cardPrintId, finishKey) {
  if (!cardPrintId || !finishKey) return null;
  const sql = `
    select id, card_print_id, finish_key
    from public.card_printings
    where card_print_id = $1
      and finish_key = $2
    limit 1
  `;
  const { rows } = await client.query(sql, [cardPrintId, finishKey]);
  return rows[0] ?? null;
}

async function resolveCardPrintByTcgplayerId(client, tcgplayerId) {
  const normalized = normalizeTextOrNull(tcgplayerId);
  if (!normalized) {
    return { path: null, rows: [] };
  }

  const directSql = `
    select
      id,
      name,
      set_code,
      number,
      number_plain,
      variant_key,
      rarity,
      coalesce(image_url, image_alt_url) as image_url,
      tcgplayer_id,
      print_identity_key
    from public.card_prints
    where tcgplayer_id = $1
    limit 2
  `;
  const directResult = await client.query(directSql, [normalized]);
  if (directResult.rows.length > 0) {
    return {
      path: 'public.card_prints.tcgplayer_id_exact',
      rows: directResult.rows,
    };
  }

  const mappingSql = `
    select
      cp.id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.variant_key,
      cp.rarity,
      coalesce(cp.image_url, cp.image_alt_url) as image_url,
      cp.tcgplayer_id,
      cp.print_identity_key
    from public.external_mappings em
    join public.card_prints cp on cp.id = em.card_print_id
    where em.source = 'tcgplayer'
      and em.external_id = $1
      and coalesce(em.active, true) = true
    limit 2
  `;
  const mappingResult = await client.query(mappingSql, [normalized]);
  return {
    path: mappingResult.rows.length > 0 ? 'public.external_mappings.tcgplayer_exact' : null,
    rows: mappingResult.rows,
  };
}

async function resolveCardPrintBySearch(client, hints) {
  const name = normalizeTextOrNull(hints.card_name);
  const setCode = normalizeLowerOrNull(hints.set_hint);
  const printedNumber = normalizeTextOrNull(hints.printed_number_plain ?? hints.printed_number);

  if (!name && !setCode && !printedNumber) {
    return { path: null, rows: [] };
  }

  const sql = `
    select
      id,
      name,
      set_code,
      number,
      number_digits as number_plain,
      rarity,
      image_url,
      null::text as print_identity_key,
      null::text as variant_key
    from public.search_card_prints_v1($1, $2, $3, $4, $5)
  `;
  const { rows } = await client.query(sql, [name, setCode, printedNumber, 10, 0]);
  return {
    path: rows.length > 0 ? 'public.search_card_prints_v1' : null,
    rows: rows.map((row) => ({
      id: row.id ?? row.card_print_id ?? null,
      name: row.name ?? null,
      set_code: row.set_code ?? null,
      number: row.number ?? null,
      number_plain: row.number_plain ?? normalizeNumberPlain(row.number),
      rarity: row.rarity ?? null,
      image_url: row.image_url ?? null,
      print_identity_key: row.print_identity_key ?? null,
      variant_key: row.variant_key ?? null,
    })),
  };
}

function collectResolverCandidatesFromScanResults(scanResults) {
  const deduped = new Map();

  for (const result of scanResults) {
    const candidates = Array.isArray(result.candidates) ? result.candidates : [];
    for (const rawCandidate of candidates) {
      const cardPrintId = rawCandidate?.card_print_id ?? rawCandidate?.id ?? null;
      if (!isUuid(cardPrintId)) continue;
      if (deduped.has(cardPrintId)) continue;
      deduped.set(cardPrintId, {
        id: cardPrintId,
        name: normalizeTextOrNull(rawCandidate?.name),
        set_code: normalizeTextOrNull(rawCandidate?.set_code),
        number: normalizeTextOrNull(rawCandidate?.number),
        number_plain: normalizeTextOrNull(rawCandidate?.number_plain),
        rarity: normalizeTextOrNull(rawCandidate?.rarity),
        image_url: normalizeTextOrNull(rawCandidate?.image_url),
        print_identity_key: normalizeTextOrNull(rawCandidate?.print_identity_key),
        variant_key: normalizeTextOrNull(rawCandidate?.variant_key),
        printed_set_abbrev: normalizeTextOrNull(rawCandidate?.printed_set_abbrev),
      });
    }
  }

  return Array.from(deduped.values());
}

function chooseBestScanHint(scanResults) {
  const hints = [];

  for (const result of scanResults) {
    const signals = parseJsonSafe(result.signals, {});
    const aiHint = signals?.ai ?? signals?.grookai_vision ?? null;
    if (!aiHint || typeof aiHint !== 'object') continue;

    const name = extractScalarString(aiHint, ['name'], ['name', 'text']);
    const printedNumber = extractScalarString(
      aiHint,
      ['collector_number'],
      ['number_raw'],
      ['number'],
      ['number', 'text'],
    );
    const printedTotal = extractScalarNumber(aiHint, ['printed_total'], ['collector_printed_total']);
    const hp = extractScalarNumber(aiHint, ['hp']);
    const confidence = clampZeroOne(
      extractScalarNumber(aiHint, ['confidence'], ['confidence_0_1'], ['number_confidence_0_1']),
    );

    hints.push({
      result_id: result.id,
      event_id: result.identity_scan_event_id,
      name,
      printed_number: printedNumber,
      printed_total: printedTotal,
      hp,
      confidence,
      analysis_version: normalizeTextOrNull(result.analysis_version),
    });
  }

  if (!hints.length) return null;

  hints.sort((left, right) => {
    const leftConfidence = left.confidence ?? -1;
    const rightConfidence = right.confidence ?? -1;
    if (leftConfidence !== rightConfidence) {
      return rightConfidence - leftConfidence;
    }
    return String(right.result_id).localeCompare(String(left.result_id));
  });

  return hints[0];
}

function selectSetHint(resolverCandidates, exactMatch) {
  if (exactMatch?.set_code) return exactMatch.set_code;
  const uniqueSetCodes = uniqueSortedStrings(resolverCandidates.map((row) => row.set_code));
  return uniqueSetCodes.length === 1 ? uniqueSetCodes[0] : null;
}

function selectSetSymbolHint(resolverCandidates) {
  const abbreviations = uniqueSortedStrings(resolverCandidates.map((row) => row.printed_set_abbrev));
  return abbreviations.length === 1 ? abbreviations[0] : null;
}

function selectRarityHint(exactMatch, resolverCandidates) {
  if (exactMatch?.rarity) return exactMatch.rarity;
  const rarities = uniqueSortedStrings(resolverCandidates.map((row) => row.rarity));
  return rarities.length === 1 ? rarities[0] : null;
}

function deriveImageQualitySummary(sourceSummary, bestScanHint, identitySnapshots, conditionSnapshots) {
  const frontReadable = bestScanHint
    ? !!(bestScanHint.name || bestScanHint.printed_number)
    : null;

  const qualitySignals = [];
  for (const snapshot of identitySnapshots) {
    const scanQuality = parseJsonSafe(snapshot.scan_quality, {});
    pushUnique(qualitySignals, scanQuality?.analysis_status);
    if (scanQuality?.ok === true) {
      pushUnique(qualitySignals, 'ok');
    }
  }
  for (const snapshot of conditionSnapshots) {
    const summary = summarizeConditionScanQuality(snapshot);
    pushUnique(qualitySignals, summary.analysis_status);
    if (summary.ok) {
      pushUnique(qualitySignals, 'ok');
    }
  }

  return {
    front_readable: frontReadable,
    back_present: sourceSummary.has_back_image,
    card_plane_quality: null,
    crop_quality: null,
    readability: frontReadable === true ? 'readable' : qualitySignals.length > 0 ? qualitySignals[0] : null,
  };
}

function shouldProcessCandidate(candidate, evidenceRows, events, force) {
  if (force) {
    return { shouldProcess: true, reason: 'forced_candidate' };
  }

  const latestProcessingEvent = [...events]
    .filter((event) => PROCESSING_EVENT_TYPES.has(event.event_type))
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0];

  if (!latestProcessingEvent) {
    return { shouldProcess: true, reason: 'no_prior_processing' };
  }

  const latestEvidenceAt = evidenceRows
    .map((row) => new Date(row.created_at).getTime())
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0];

  const latestProcessingAt = new Date(latestProcessingEvent.created_at).getTime();

  if (Number.isFinite(latestEvidenceAt) && latestEvidenceAt > latestProcessingAt) {
    return { shouldProcess: true, reason: 'new_evidence_since_last_processing' };
  }

  return { shouldProcess: false, reason: 'already_processed_without_new_evidence' };
}

async function buildCandidateArtifacts(client, candidateId) {
  const candidate = await fetchCandidate(client, candidateId);
  if (!candidate) {
    throw new Error(`candidate_not_found:${candidateId}`);
  }

  const evidenceRows = await fetchEvidenceRows(client, candidateId);
  const events = await fetchCandidateEvents(client, candidateId);

  const identitySnapshotIds = uniqueStrings(
    evidenceRows.map((row) => row.identity_snapshot_id).filter((value) => isUuid(value)),
  );
  const conditionSnapshotIds = uniqueStrings(
    evidenceRows.map((row) => row.condition_snapshot_id).filter((value) => isUuid(value)),
  );
  const directScanEventIds = uniqueStrings(
    evidenceRows.map((row) => row.identity_scan_event_id).filter((value) => isUuid(value)),
  );

  const [identitySnapshots, conditionSnapshots] = await Promise.all([
    fetchIdentitySnapshots(client, identitySnapshotIds),
    fetchConditionSnapshots(client, conditionSnapshotIds),
  ]);

  const scanEvents = await fetchScanEvents(
    client,
    directScanEventIds,
    identitySnapshotIds,
    conditionSnapshotIds,
  );
  const latestScanResults = await fetchLatestScanResults(
    client,
    uniqueStrings(scanEvents.map((row) => row.id).filter((value) => isUuid(value))),
  );

  return {
    candidate,
    evidenceRows,
    events,
    identitySnapshots,
    conditionSnapshots,
    scanEvents,
    latestScanResults,
  };
}

async function buildPackages(client, artifact) {
  const {
    candidate,
    evidenceRows,
    identitySnapshots,
    conditionSnapshots,
    scanEvents,
    latestScanResults,
  } = artifact;

  const exactConditionSnapshotCardPrintIds = uniqueStrings(
    conditionSnapshots.map((snapshot) => snapshot.card_print_id).filter((value) => isUuid(value)),
  );
  const conditionSnapshotCardPrints = await fetchCardPrintsByIds(client, exactConditionSnapshotCardPrintIds);

  const directFrontImageRef =
    evidenceRows.find((row) => row.evidence_kind === 'IMAGE' && row.evidence_slot === 'front') ?? null;
  const directBackImageRef =
    evidenceRows.find((row) => row.evidence_kind === 'IMAGE' && row.evidence_slot === 'back') ?? null;
  const identityFrontRef = identitySnapshots
    .map((snapshot) => ({
      snapshotId: snapshot.id,
      path: extractSnapshotImagePath(snapshot.images, 'front'),
    }))
    .find((entry) => !!entry.path) ?? null;
  const identityBackRef = identitySnapshots
    .map((snapshot) => ({
      snapshotId: snapshot.id,
      path: extractSnapshotImagePath(snapshot.images, 'back'),
    }))
    .find((entry) => !!entry.path) ?? null;
  const conditionFrontRef = conditionSnapshots
    .map((snapshot) => ({
      snapshotId: snapshot.id,
      path: extractSnapshotImagePath(snapshot.images, 'front'),
    }))
    .find((entry) => !!entry.path) ?? null;
  const conditionBackRef = conditionSnapshots
    .map((snapshot) => ({
      snapshotId: snapshot.id,
      path: extractSnapshotImagePath(snapshot.images, 'back'),
    }))
    .find((entry) => !!entry.path) ?? null;

  const primaryFrontImageRef =
    refForPath('identity_snapshot', identityFrontRef?.snapshotId, 'front', identityFrontRef?.path) ||
    refForPath('condition_snapshot', conditionFrontRef?.snapshotId, 'front', conditionFrontRef?.path) ||
    refForPath('warehouse_image', directFrontImageRef?.id, 'front', directFrontImageRef?.storage_path);

  const secondaryBackImageRef =
    refForPath('identity_snapshot', identityBackRef?.snapshotId, 'back', identityBackRef?.path) ||
    refForPath('condition_snapshot', conditionBackRef?.snapshotId, 'back', conditionBackRef?.path) ||
    refForPath('warehouse_image', directBackImageRef?.id, 'back', directBackImageRef?.storage_path);

  const normalizedImageRefs = uniqueSortedStrings([
    primaryFrontImageRef,
    secondaryBackImageRef,
    ...identitySnapshots.map((snapshot) => refForPath('identity_snapshot', snapshot.id, 'front', extractSnapshotImagePath(snapshot.images, 'front'))),
    ...identitySnapshots.map((snapshot) => refForPath('identity_snapshot', snapshot.id, 'back', extractSnapshotImagePath(snapshot.images, 'back'))),
    ...conditionSnapshots.map((snapshot) => refForPath('condition_snapshot', snapshot.id, 'front', extractSnapshotImagePath(snapshot.images, 'front'))),
    ...conditionSnapshots.map((snapshot) => refForPath('condition_snapshot', snapshot.id, 'back', extractSnapshotImagePath(snapshot.images, 'back'))),
    ...evidenceRows
      .filter((row) => row.evidence_kind === 'IMAGE')
      .map((row) => refForPath('warehouse_image', row.id, row.evidence_slot ?? 'image', row.storage_path)),
  ]);

  const scanResultResolverCandidates = collectResolverCandidatesFromScanResults(latestScanResults);
  const scanResultCandidatePrintIds = uniqueStrings(
    scanResultResolverCandidates.map((row) => row.id).filter((value) => isUuid(value)),
  );
  const rehydratedScanResultCandidates = await fetchCardPrintsByIds(client, scanResultCandidatePrintIds);

  const bestScanHint = chooseBestScanHint(latestScanResults);
  const scanResolverCandidates = rehydratedScanResultCandidates.length > 0
    ? rehydratedScanResultCandidates
    : scanResultResolverCandidates;

  const exactTcgplayer = await resolveCardPrintByTcgplayerId(client, candidate.tcgplayer_id);
  const exactConditionMatch = conditionSnapshotCardPrints.length === 1 ? conditionSnapshotCardPrints[0] : null;
  const claimedIdentityHints = extractCandidateIdentityHints(candidate);
  const candidateVariantIdentity = extractCandidateVariantIdentity(candidate);
  const sourceBackedIdentity = getSourceBackedIdentity(candidate);

  const provisionalSetHint =
    selectSetHint(scanResolverCandidates, exactConditionMatch ?? exactTcgplayer.rows[0] ?? null) ??
    claimedIdentityHints.set_hint;
  const provisionalRarityHint =
    selectRarityHint(exactConditionMatch ?? exactTcgplayer.rows[0] ?? null, scanResolverCandidates) ??
    claimedIdentityHints.rarity_hint ??
    candidateVariantIdentity?.illustration_category ??
    null;
  const finishSignals = deriveFinishSignals(candidate, { card_name: bestScanHint?.name ?? null });

  const visibleIdentityHints = {
    card_name: bestScanHint?.name ?? claimedIdentityHints.card_name ?? null,
    printed_number: normalizePrintedNumber(bestScanHint?.printed_number ?? claimedIdentityHints.printed_number),
    printed_number_plain: normalizeNumberPlain(bestScanHint?.printed_number ?? claimedIdentityHints.printed_number),
    set_hint: provisionalSetHint,
    set_symbol_hint: selectSetSymbolHint(scanResolverCandidates),
    finish_hint: finishSignals.finishHint,
    rarity_hint: provisionalRarityHint,
    variant_key: candidateVariantIdentity?.variant_key ?? null,
    illustration_category: candidateVariantIdentity?.illustration_category ?? null,
    variant_identity_rule: candidateVariantIdentity?.rule ?? null,
    variant_identity_status: candidateVariantIdentity?.status ?? null,
    supertype_hint: null,
    subtype_hints: [],
    language_hint: null,
  };

  const sourceSummary = buildSourceSummary(evidenceRows, {
    primaryFrontImageRef,
    secondaryBackImageRef,
    identitySnapshots,
    conditionSnapshots,
    scanEvents,
    latestScanResults,
    sourceBackedIdentity,
  });

  const blockingReasons = [];
  if (
    !sourceBackedIdentity.is_complete &&
    !sourceSummary.has_front_image &&
    sourceSummary.has_identity_scan_results === false &&
    sourceSummary.has_identity_snapshot === false &&
    !normalizeTextOrNull(candidate.tcgplayer_id)
  ) {
    pushUnique(blockingReasons, 'no_front_identity_surface');
  }
  if (!sourceBackedIdentity.is_complete && sourceSummary.evidence_kinds.length === 0) {
    pushUnique(blockingReasons, 'no_evidence_rows');
  }
  if (sourceBackedIdentity.variant_missing) {
    pushUnique(blockingReasons, 'variant_key_required_for_collision_group');
  }

  const unresolvedFields = buildUnresolvedFields(visibleIdentityHints, sourceSummary);
  const imageQualitySummary = deriveImageQualitySummary(
    sourceSummary,
    bestScanHint,
    identitySnapshots,
    conditionSnapshots,
  );

  const sourceReferences = {
    evidence_row_ids: evidenceRows.map((row) => row.id),
    identity_snapshot_ids: identitySnapshots.map((row) => row.id),
    condition_snapshot_ids: conditionSnapshots.map((row) => row.id),
    identity_scan_event_ids: scanEvents.map((row) => row.id),
    identity_scan_event_result_ids: latestScanResults.map((row) => row.id),
  };

  const normalizationStatus = chooseNormalizationStatus(sourceSummary, unresolvedFields, blockingReasons);
  const sourceStrength = chooseSourceStrength(
    sourceSummary,
    bestScanHint?.confidence ?? null,
    !!exactConditionMatch || exactTcgplayer.rows.length === 1,
  );

  const normalizedPackage = {
    candidate_id: candidate.id,
    normalization_status: normalizationStatus,
    source_summary: sourceSummary,
    source_strength: sourceStrength,
    evidence_gaps: uniqueSortedStrings(unresolvedFields),
    normalization_confidence: bestScanHint?.confidence ?? null,
    primary_front_image_ref: primaryFrontImageRef ?? null,
    secondary_back_image_ref: secondaryBackImageRef ?? null,
    normalized_image_refs: normalizedImageRefs.length > 0 ? normalizedImageRefs : null,
    visible_identity_hints: visibleIdentityHints,
    image_quality_summary: imageQualitySummary,
    raw_metadata_documentation: {
      extracted_fields: {
        candidate_notes: normalizeTextOrNull(candidate.notes),
        submission_intent: normalizeTextOrNull(candidate.submission_intent),
        intake_channel: normalizeTextOrNull(candidate.intake_channel),
        tcgplayer_id: normalizeTextOrNull(candidate.tcgplayer_id),
        source_references: sourceReferences,
        best_scan_hint: bestScanHint,
        scan_result_candidate_count: scanResolverCandidates.length,
        condition_snapshot_summaries: conditionSnapshots.map((snapshot) => summarizeConditionScanQuality(snapshot)),
      },
      unresolved_fields: uniqueSortedStrings(unresolvedFields),
      blocking_reasons: uniqueSortedStrings(blockingReasons),
    },
  };

  const searchResolution = await resolveCardPrintBySearch(client, visibleIdentityHints);

  const ambiguityNotes = [];
  let resolverPath = null;
  let matchedCardPrint = null;
  let candidateCount = 0;
  let resolverConfidence = null;

  if (exactConditionMatch) {
    matchedCardPrint = exactConditionMatch;
    resolverPath = 'public.condition_snapshots.card_print_id';
    candidateCount = 1;
    resolverConfidence = 1;
  } else if (exactTcgplayer.rows.length === 1) {
    matchedCardPrint = exactTcgplayer.rows[0];
    resolverPath = exactTcgplayer.path;
    candidateCount = 1;
    resolverConfidence = 1;
  } else if (scanResolverCandidates.length === 1) {
    matchedCardPrint = scanResolverCandidates[0];
    resolverPath = 'identity_scan_event_results.candidates';
    candidateCount = 1;
    resolverConfidence = clampZeroOne(bestScanHint?.confidence ?? null);
  } else if (searchResolution.rows.length === 1) {
    matchedCardPrint = searchResolution.rows[0];
    resolverPath = searchResolution.path;
    candidateCount = 1;
    resolverConfidence = null;
  } else {
    candidateCount = Math.max(
      exactTcgplayer.rows.length,
      scanResolverCandidates.length,
      searchResolution.rows.length,
    );
    if (exactTcgplayer.rows.length > 1) {
      pushUnique(ambiguityNotes, 'multiple_tcgplayer_reference_matches');
      resolverPath = exactTcgplayer.path;
    } else if (scanResolverCandidates.length > 1) {
      pushUnique(ambiguityNotes, 'multiple_scan_resolver_candidates');
      resolverPath = 'identity_scan_event_results.candidates';
    } else if (searchResolution.rows.length > 1) {
      pushUnique(ambiguityNotes, 'multiple_search_card_prints_v1_matches');
      resolverPath = searchResolution.path;
    }
  }

  const finishInterpretationInput = {
    source: 'warehouse',
    setCode: normalizeTextOrNull(visibleIdentityHints.set_hint),
    cardNumber: normalizeTextOrNull(visibleIdentityHints.printed_number_plain ?? visibleIdentityHints.printed_number),
    canonicalFinishCandidate: finishSignals.finishHint,
    upstreamCardId: candidate.id,
    upstreamName: visibleIdentityHints.card_name ?? candidate.notes,
    observedPrintings: finishSignals.finishHint ? [finishSignals.finishHint] : [],
    isDifferentIssuedVersion: finishSignals.differentIssuedVersion,
    isFinishOnly: finishSignals.finishOnly,
    isRepresentableFinish: finishSignals.representableFinish,
  };

  const finishInterpretation = interpretVersionVsFinish(finishInterpretationInput);
  let matchedCardPrinting = null;
  if (matchedCardPrint?.id && finishInterpretation.decision === VERSION_FINISH_DECISIONS.CHILD) {
    matchedCardPrinting = await fetchCardPrintingByParentAndFinish(
      client,
      matchedCardPrint.id,
      finishInterpretation.resolvedFinishKey,
    );
  }

  let classificationStatus = 'CLASSIFICATION_BLOCKED';
  let interpreterDecision = 'BLOCKED';
  let interpreterReasonCode = 'INSUFFICIENT_IDENTITY_SIGNAL';
  let interpreterExplanation = 'Blocked warehouse classification because available evidence does not safely identify a canonical path.';
  let proposedActionType = 'BLOCKED_NO_PROMOTION';
  let needsPromotionReview = true;
  let interpreterResolvedFinishKey = null;
  let classificationBasis = 'blocked';
  let currentReviewHoldReason = null;
  const reviewableCandidate = isReviewableCandidate(candidate, sourceSummary);

  const hasIdentityCore =
    !!visibleIdentityHints.card_name ||
    !!visibleIdentityHints.printed_number ||
    !!matchedCardPrint ||
    !!normalizeTextOrNull(candidate.tcgplayer_id);

  if (normalizationStatus === 'NORMALIZATION_BLOCKED') {
    classificationStatus = 'CLASSIFICATION_BLOCKED';
    interpreterReasonCode = 'NORMALIZATION_BLOCKED';
    interpreterExplanation = 'Blocked warehouse classification because normalization did not produce a usable interpretation package.';
    proposedActionType = 'BLOCKED_NO_PROMOTION';
    needsPromotionReview = true;
  } else if (matchedCardPrint && candidate.submission_intent === 'MISSING_IMAGE' && finishInterpretation.decision !== VERSION_FINISH_DECISIONS.CHILD) {
    classificationStatus = 'CLASSIFIED_READY';
    interpreterDecision = 'ROW';
    interpreterReasonCode = 'EXISTING_CARD_IMAGE_ENRICH';
    interpreterExplanation = `Matched existing canonical row ${matchedCardPrint.id} and classified the warehouse candidate as image enrichment evidence for ${matchedCardPrint.set_code ?? 'unknown-set'} #${matchedCardPrint.number ?? 'unknown-number'}.`;
    proposedActionType = 'ENRICH_CANON_IMAGE';
    needsPromotionReview = false;
    classificationBasis = 'resolver_match';
  } else if (finishInterpretation.decision === VERSION_FINISH_DECISIONS.CHILD && matchedCardPrint) {
    classificationStatus = 'CLASSIFIED_READY';
    interpreterDecision = 'CHILD';
    interpreterReasonCode = matchedCardPrinting
      ? 'EXISTING_CHILD_PRINTING_IMAGE_ENRICH'
      : finishInterpretation.reasonCode;
    interpreterExplanation = matchedCardPrinting
      ? `Matched existing child printing ${matchedCardPrinting.id} under ${matchedCardPrint.id} for finish ${finishInterpretation.resolvedFinishKey}.`
      : finishInterpretation.explanation;
    proposedActionType = matchedCardPrinting ? 'ENRICH_CANON_IMAGE' : 'CREATE_CARD_PRINTING';
    needsPromotionReview = false;
    interpreterResolvedFinishKey = finishInterpretation.resolvedFinishKey;
    classificationBasis = 'resolver_match';
  } else if (
    finishInterpretation.decision === VERSION_FINISH_DECISIONS.ROW &&
    (matchedCardPrint || (visibleIdentityHints.card_name && visibleIdentityHints.printed_number))
  ) {
    classificationStatus = 'CLASSIFIED_READY';
    interpreterDecision = 'ROW';
    interpreterReasonCode = finishInterpretation.reasonCode;
    interpreterExplanation = finishInterpretation.explanation;
    proposedActionType = 'CREATE_CARD_PRINT';
    needsPromotionReview = false;
    interpreterResolvedFinishKey = finishInterpretation.resolvedFinishKey;
    classificationBasis = matchedCardPrint ? 'resolver_match' : 'documented_identity';
  } else if (matchedCardPrint) {
    classificationStatus = 'CLASSIFIED_READY';
    interpreterDecision = 'ROW';
    interpreterReasonCode = 'EXISTING_CARD_PRINT_MATCH';
    interpreterExplanation = `Matched existing canonical row ${matchedCardPrint.id} through ${resolverPath ?? 'resolver'} and classified the candidate as row-level existing-card evidence.`;
    proposedActionType = 'ENRICH_CANON_IMAGE';
    needsPromotionReview = false;
    classificationBasis = 'resolver_match';
  } else if (hasIdentityCore && visibleIdentityHints.card_name && visibleIdentityHints.printed_number) {
    classificationStatus = 'CLASSIFIED_READY';
    interpreterDecision = 'ROW';
    interpreterReasonCode = 'NO_EXISTING_CANON_MATCH_CREATE_ROW';
    interpreterExplanation = `No canonical match resolved for documented evidence ${visibleIdentityHints.card_name} ${visibleIdentityHints.printed_number}, so the warehouse candidate is classified as a potential new parent row.`;
    proposedActionType = 'CREATE_CARD_PRINT';
    needsPromotionReview = false;
    classificationBasis = 'documented_identity';
  } else if (hasIdentityCore || candidateCount > 1) {
    classificationStatus = 'CLASSIFIED_PARTIAL';
    interpreterDecision = 'BLOCKED';
    interpreterReasonCode = candidateCount > 1 ? 'AMBIGUOUS_EXISTING_MATCH' : 'REVIEW_REQUIRED_INCOMPLETE_IDENTITY';
    interpreterExplanation =
      candidateCount > 1
        ? 'Classification found multiple plausible canonical matches and cannot safely choose one automatically.'
        : 'Classification documented partial identity evidence but could not derive a safe promotion path automatically.';
    proposedActionType = 'REVIEW_REQUIRED';
    needsPromotionReview = true;
    classificationBasis = 'review_required';
  }

  if (finishInterpretation.decision === VERSION_FINISH_DECISIONS.BLOCKED) {
    if (!sourceBackedIdentity.is_complete) {
      pushUnique(ambiguityNotes, finishInterpretation.reasonCode);
      if (classificationStatus === 'CLASSIFIED_READY' && proposedActionType !== 'ENRICH_CANON_IMAGE') {
        pushUnique(ambiguityNotes, 'finish_interpretation_blocked');
      } else if (classificationStatus !== 'CLASSIFIED_READY') {
        interpreterReasonCode = finishInterpretation.reasonCode;
        interpreterExplanation = finishInterpretation.explanation;
        proposedActionType = 'REVIEW_REQUIRED';
        needsPromotionReview = true;
      }
    }
  }

  const lowConfidenceResolverMatch = !!matchedCardPrint && (
    resolverConfidence === null ||
    resolverConfidence < MIN_RESOLVER_CONFIDENCE_FOR_CLASSIFICATION
  );

  if (classificationBasis === 'resolver_match' && lowConfidenceResolverMatch) {
    classificationStatus = reviewableCandidate ? 'CLASSIFIED_PARTIAL' : 'CLASSIFICATION_BLOCKED';
    interpreterDecision = 'BLOCKED';
    interpreterReasonCode = 'LOW_RESOLVER_CONFIDENCE';
    interpreterExplanation = `Resolver found a possible canonical match via ${resolverPath ?? 'resolver'}, but confidence ${
      resolverConfidence === null ? 'null' : resolverConfidence.toFixed(2)
    } is below threshold ${MIN_RESOLVER_CONFIDENCE_FOR_CLASSIFICATION.toFixed(2)}. Routed candidate to review instead of automatic ROW/CHILD classification.`;
    proposedActionType = 'REVIEW_REQUIRED';
    needsPromotionReview = true;
    interpreterResolvedFinishKey = null;
    currentReviewHoldReason = 'LOW_RESOLVER_CONFIDENCE';
    pushUnique(ambiguityNotes, 'LOW_RESOLVER_CONFIDENCE');
  } else if (classificationStatus !== 'CLASSIFIED_READY') {
    currentReviewHoldReason = `${classificationStatus}:${interpreterReasonCode}`;
  }

  const sourceBackedRequiresFounderReview =
    sourceBackedIdentity.is_bridge_candidate &&
    classificationStatus === 'CLASSIFIED_READY' &&
    proposedActionType === 'CREATE_CARD_PRINT';

  if (
    sourceBackedRequiresFounderReview &&
    !currentReviewHoldReason &&
    ambiguityNotes.length === 0 &&
    !lowConfidenceResolverMatch
  ) {
    currentReviewHoldReason = 'FOUNDER_APPROVAL_REQUIRED';
  }

  const shouldQueueReview =
    classificationStatus === 'CLASSIFIED_READY' ||
    (classificationBasis === 'resolver_match' && lowConfidenceResolverMatch && reviewableCandidate);

  const classificationPackage = {
    candidate_id: candidate.id,
    classification_status: classificationStatus,
    interpreter_decision: interpreterDecision,
    interpreter_reason_code: interpreterReasonCode,
    interpreter_explanation: interpreterExplanation,
    proposed_action_type: proposedActionType,
    resolver_summary: {
      matched_card_print_id: matchedCardPrint?.id ?? null,
      matched_card_printing_id: matchedCardPrinting?.id ?? null,
      resolver_confidence: resolverConfidence,
      resolver_path: resolverPath,
      candidate_count: candidateCount || null,
    },
    metadata_documentation: {
      extracted_fields: {
        submission_intent: candidate.submission_intent,
        tcgplayer_id: normalizeTextOrNull(candidate.tcgplayer_id),
        visible_identity_hints: visibleIdentityHints,
        variant_identity: candidateVariantIdentity,
        claimed_identity_payload: asRecord(candidate.claimed_identity_payload),
        reference_hints_payload: asRecord(candidate.reference_hints_payload),
        source_summary: sourceSummary,
        source_type: sourceBackedIdentity.source_type,
        bridge_source: sourceBackedIdentity.bridge_source,
        normalized_image_refs: normalizedImageRefs,
        exact_condition_snapshot_card_print_id: exactConditionMatch?.id ?? null,
        scan_result_candidate_ids: scanResolverCandidates.map((row) => row.id),
      },
      unresolved_fields: uniqueSortedStrings([
        ...normalizedPackage.evidence_gaps,
        ...((classificationStatus === 'CLASSIFIED_READY' && !lowConfidenceResolverMatch) ? [] : ['canonical_target']),
      ]),
      ambiguity_notes: uniqueSortedStrings(ambiguityNotes),
    },
  };

  const terminalState = normalizationStatus === 'NORMALIZATION_BLOCKED'
    ? 'RAW'
    : shouldQueueReview
      ? 'REVIEW_READY'
      : 'CLASSIFIED';

  const sourceBackedMetadata =
    sourceBackedIdentity.is_bridge_candidate
      ? buildSourceBackedMetadataExtractionPackages({
          candidate,
          evidenceRows,
          scanResults: latestScanResults,
        })
      : null;
  const sourceBackedInterpreterPackage =
    sourceBackedIdentity.is_bridge_candidate
      ? buildSourceBackedInterpreterPackage({
          candidate,
          classificationPackage,
        })
      : null;

  const candidateSummary = {
    state: terminalState,
    interpreter_decision: classificationStatus === 'CLASSIFICATION_BLOCKED' && normalizationStatus === 'NORMALIZATION_BLOCKED'
      ? candidate.interpreter_decision ?? null
      : interpreterDecision,
    interpreter_reason_code: classificationStatus === 'CLASSIFICATION_BLOCKED' && normalizationStatus === 'NORMALIZATION_BLOCKED'
      ? candidate.interpreter_reason_code ?? null
      : interpreterReasonCode,
    interpreter_explanation: classificationStatus === 'CLASSIFICATION_BLOCKED' && normalizationStatus === 'NORMALIZATION_BLOCKED'
      ? candidate.interpreter_explanation ?? null
      : interpreterExplanation,
    interpreter_resolved_finish_key:
      classificationStatus === 'CLASSIFICATION_BLOCKED' && normalizationStatus === 'NORMALIZATION_BLOCKED'
        ? candidate.interpreter_resolved_finish_key ?? null
        : interpreterResolvedFinishKey,
    needs_promotion_review:
      classificationStatus === 'CLASSIFICATION_BLOCKED' && normalizationStatus === 'NORMALIZATION_BLOCKED'
        ? candidate.needs_promotion_review
        : needsPromotionReview,
    proposed_action_type:
      classificationStatus === 'CLASSIFICATION_BLOCKED' && normalizationStatus === 'NORMALIZATION_BLOCKED'
        ? candidate.proposed_action_type ?? null
        : proposedActionType,
    current_review_hold_reason:
      normalizationStatus === 'NORMALIZATION_BLOCKED'
        ? (blockingReasons[0] ?? 'normalization_blocked')
        : currentReviewHoldReason,
  };

  const writePlan = [];
  if (normalizationStatus === 'NORMALIZATION_BLOCKED') {
    writePlan.push({
      type: 'candidate_hold',
      holdReason: blockingReasons[0] ?? 'normalization_blocked',
    });
    writePlan.push({
      type: 'event',
      eventType: 'NORMALIZATION_BLOCKED',
      action: 'BLOCK',
      previousState: 'RAW',
      nextState: 'RAW',
      notes: blockingReasons[0] ?? null,
      metadata: { normalized_package: normalizedPackage, classification_package: null },
    });
  } else {
    writePlan.push({
      type: 'candidate_update',
      state: 'NORMALIZED',
      currentReviewHoldReason: null,
    });
    writePlan.push({
      type: 'event',
      eventType: normalizationStatus === 'NORMALIZED_PARTIAL' ? 'NORMALIZATION_PARTIAL' : 'NORMALIZATION_COMPLETE',
      action: 'NORMALIZE',
      previousState: 'RAW',
      nextState: 'NORMALIZED',
      notes: normalizationStatus === 'NORMALIZED_PARTIAL' ? 'normalization_partial' : null,
      metadata: { normalized_package: normalizedPackage },
    });

    writePlan.push({
      type: 'candidate_update',
      state: 'CLASSIFIED',
      interpreterDecision,
      interpreterReasonCode,
      interpreterExplanation,
      interpreterResolvedFinishKey,
      needsPromotionReview,
      proposedActionType,
      currentReviewHoldReason,
    });
    writePlan.push({
      type: 'event',
      eventType:
        classificationStatus === 'CLASSIFIED_READY'
          ? 'CLASSIFICATION_COMPLETE'
          : classificationStatus === 'CLASSIFIED_PARTIAL'
            ? 'CLASSIFICATION_PARTIAL'
            : 'CLASSIFICATION_BLOCKED',
      action: classificationStatus === 'CLASSIFIED_READY' ? 'CLASSIFY' : 'BLOCK',
      previousState: 'NORMALIZED',
      nextState: 'CLASSIFIED',
      notes: classificationStatus === 'CLASSIFIED_READY' ? null : interpreterReasonCode,
      metadata: {
        normalized_package: normalizedPackage,
        classification_package: classificationPackage,
        raw_extraction_package: sourceBackedMetadata?.rawPackage ?? null,
        normalized_metadata_package: sourceBackedMetadata?.normalizedPackage ?? null,
        interpreter_package: sourceBackedInterpreterPackage,
      },
    });

    if (shouldQueueReview) {
      writePlan.push({
        type: 'candidate_update',
        state: 'REVIEW_READY',
        currentReviewHoldReason,
      });
      writePlan.push({
        type: 'event',
        eventType: 'WAREHOUSE_REVIEW_READY',
        action: 'QUEUE_REVIEW',
        previousState: 'CLASSIFIED',
        nextState: 'REVIEW_READY',
        notes: proposedActionType,
        metadata: {
          normalized_package: normalizedPackage,
          classification_package: classificationPackage,
        },
      });
    }
  }

  return {
    candidate,
    candidateSummary,
    normalizedPackage,
    classificationPackage,
    writePlan,
    latestEvidenceAt: evidenceRows
      .map((row) => row.created_at)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null,
  };
}

async function insertWarehouseEvent(client, payload) {
  const sql = `
    insert into public.canon_warehouse_candidate_events (
      candidate_id,
      event_type,
      action,
      previous_state,
      next_state,
      actor_user_id,
      actor_type,
      metadata,
      created_at
    )
    values ($1, $2, $3, $4, $5, null, 'SYSTEM', $6::jsonb, now())
  `;

  await client.query(sql, [
    payload.candidateId,
    payload.eventType,
    payload.action,
    payload.previousState,
    payload.nextState,
    JSON.stringify({
      worker: WORKER_NAME,
      system_note: payload.notes ?? null,
      ...payload.metadata,
    }),
  ]);
}

async function applyWritePlan(pool, buildResult) {
  const connection = await pool.connect();
  try {
    await connection.query('begin');

    const lockSql = `
      select id, state
      from public.canon_warehouse_candidates
      where id = $1
      for update
    `;
    const lockResult = await connection.query(lockSql, [buildResult.candidate.id]);
    const lockedCandidate = lockResult.rows[0] ?? null;
    if (!lockedCandidate) {
      throw new Error(`candidate_not_found:${buildResult.candidate.id}`);
    }
    if (lockedCandidate.state !== 'RAW') {
      throw new Error(`candidate_not_raw:${buildResult.candidate.id}:${lockedCandidate.state}`);
    }

    const evidenceSql = `
      select max(created_at) as latest_evidence_at
      from public.canon_warehouse_candidate_evidence
      where candidate_id = $1
    `;
    const evidenceResult = await connection.query(evidenceSql, [buildResult.candidate.id]);
    const latestEvidenceAt = evidenceResult.rows[0]?.latest_evidence_at ?? null;
    if (
      latestEvidenceAt &&
      buildResult.latestEvidenceAt &&
      new Date(latestEvidenceAt).getTime() !== new Date(buildResult.latestEvidenceAt).getTime()
    ) {
      throw new Error(`candidate_evidence_changed_during_classification:${buildResult.candidate.id}`);
    }

    for (const step of buildResult.writePlan) {
      if (step.type === 'candidate_hold') {
        await connection.query(
          `
            update public.canon_warehouse_candidates
            set current_review_hold_reason = $2
            where id = $1
          `,
          [buildResult.candidate.id, step.holdReason],
        );
        continue;
      }

      if (step.type === 'candidate_update') {
        const nextState = step.state ?? lockedCandidate.state;
        const sql = `
          update public.canon_warehouse_candidates
          set
            state = $2,
            interpreter_decision = coalesce($3, interpreter_decision),
            interpreter_reason_code = coalesce($4, interpreter_reason_code),
            interpreter_explanation = coalesce($5, interpreter_explanation),
            interpreter_resolved_finish_key = case when $6::text is null then interpreter_resolved_finish_key else $6::text end,
            needs_promotion_review = coalesce($7, needs_promotion_review),
            proposed_action_type = case when $8::text is null then proposed_action_type else $8::text end,
            current_review_hold_reason = $9::text
          where id = $1
        `;
        await connection.query(sql, [
          buildResult.candidate.id,
          nextState,
          step.interpreterDecision ?? null,
          step.interpreterReasonCode ?? null,
          step.interpreterExplanation ?? null,
          step.interpreterResolvedFinishKey ?? null,
          typeof step.needsPromotionReview === 'boolean' ? step.needsPromotionReview : null,
          step.proposedActionType ?? null,
          step.currentReviewHoldReason ?? null,
        ]);
        continue;
      }

      if (step.type === 'event') {
        await insertWarehouseEvent(connection, {
          candidateId: buildResult.candidate.id,
          eventType: step.eventType,
          action: step.action,
          previousState: step.previousState,
          nextState: step.nextState,
          notes: step.notes ?? null,
          metadata: step.metadata,
        });
      }
    }

    await connection.query('commit');
  } catch (error) {
    await connection.query('rollback');
    throw error;
  } finally {
    connection.release();
  }
}

async function processCandidate(pool, candidateId, opts) {
  const connection = await pool.connect();
  try {
    const artifact = await buildCandidateArtifacts(connection, candidateId);

    if (!artifact.candidate) {
      return { status: 'skipped', reason: 'candidate_not_found' };
    }

    if (artifact.candidate.state !== 'RAW') {
      return { status: 'skipped', reason: `candidate_not_raw:${artifact.candidate.state}` };
    }

    const processGate = shouldProcessCandidate(
      artifact.candidate,
      artifact.evidenceRows,
      artifact.events,
      !!opts.candidateId,
    );
    if (!processGate.shouldProcess) {
      return { status: 'skipped', reason: processGate.reason };
    }

    const buildResult = await buildPackages(connection, artifact);

    const summary = {
      candidate_id: candidateId,
      submission_intent: buildResult.candidate.submission_intent,
      normalization_status: buildResult.normalizedPackage.normalization_status,
      classification_status: buildResult.classificationPackage.classification_status,
      interpreter_decision: buildResult.classificationPackage.interpreter_decision,
      interpreter_reason_code: buildResult.classificationPackage.interpreter_reason_code,
      proposed_action_type: buildResult.classificationPackage.proposed_action_type,
      terminal_state: buildResult.candidateSummary.state,
      resolver_path: buildResult.classificationPackage.resolver_summary.resolver_path,
      resolver_confidence: buildResult.classificationPackage.resolver_summary.resolver_confidence,
    };

    if (opts.dryRun) {
      log('dry_run_candidate_plan', {
        ...summary,
        candidate_summary: buildResult.candidateSummary,
        normalized_package: buildResult.normalizedPackage,
        classification_package: buildResult.classificationPackage,
        write_plan: buildResult.writePlan,
      });
      return { status: 'dry_run', summary };
    }

    return { status: 'apply_pending', summary, buildResult };
  } finally {
    connection.release();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const candidateIds = opts.candidateId
      ? [opts.candidateId]
      : await fetchRawCandidateIds(pool, opts.limit);

    log('worker_start', {
      mode: opts.apply ? 'apply' : 'dry-run',
      requested_limit: opts.limit,
      candidate_id: opts.candidateId,
      raw_candidate_count: candidateIds.length,
    });

    const results = [];
    for (const candidateId of candidateIds) {
      try {
        const result = await processCandidate(pool, candidateId, opts);
        if (opts.apply && result.status === 'apply_pending') {
          await applyWritePlan(pool, result.buildResult);
          results.push({ candidateId, status: 'applied', summary: result.summary });
          log('candidate_applied', result.summary);
        } else {
          results.push({ candidateId, ...result });
        }
      } catch (error) {
        results.push({
          candidateId,
          status: 'failed',
          reason: error.message,
        });
        log('candidate_failed', { candidate_id: candidateId, error: error.message });
      }
    }

    log('worker_complete', {
      mode: opts.apply ? 'apply' : 'dry-run',
      processed: results.length,
      results,
    });
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('classification_worker_v1.mjs')) {
  main().catch((error) => {
    log('fatal', { error: error.message });
    process.exit(1);
  });
}
