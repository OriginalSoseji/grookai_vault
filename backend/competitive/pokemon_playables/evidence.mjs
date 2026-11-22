import { admittedSourceUrl, assert, boundedArray, collectorNumber, DAY_MS, digest, httpsUrl, mapUnique, normalize, reviewValid, safeId, sha256, SHA256, text, timestamp } from './common.mjs';
import { normalizeLimitlessCapture } from './adapters/limitless_v1.mjs';
import {readScopedLegalityReceipt,validateScopedLegalitySource} from './legality_reference_reader_v1.mjs';
import {normalizeReviewedEventSubmission} from './adapters/reviewed_event_submission_v1.mjs';
import {normalizePublishedDecklists,validatePublishedDecklistSource} from './adapters/published_decklists_v1.mjs';
import {normalizeDecklistTextSubmission} from './adapters/decklist_text_v1.mjs';
import {normalizeLimitlessPublishedDecklists} from './adapters/limitless_published_decklists_v1.mjs';

export const EVENT_EXPORT_VERSION = 'pokemon_playables_event_export:v1';
const KINDS = ['tournament', 'gameplay', 'legality', 'source_permission'];

export function prepareEvidence(input, policy, asOf, purpose = 'shadow') {
  assert(input?.version === 'pokemon_playables_input:v1', 'INPUT_VERSION');
  const sources = mapUnique(boundedArray(input.sources, 100), 'id', 'DUPLICATE_SOURCE');
  for (const source of sources.values()) {
    safeId(source.id);
    assert(['authorized_export', 'direct_submission', 'documented_api', 'permitted_public_document'].includes(source.access_method), 'SOURCE_ACCESS_METHOD');
    assert(source.allow_ingest === true && reviewValid(source.review, asOf, policy), 'SOURCE_NOT_ADMITTED');
    assert(Number.isInteger(source.retention_days) && source.retention_days > 0 && source.retention_days <= 30, 'SOURCE_RETENTION');
    boundedArray(source.allowed_kinds, 4).forEach(kind => assert(KINDS.includes(kind), 'SOURCE_KIND'));
    const origins=boundedArray(source.allowed_origins,20,'SOURCE_ORIGINS_REQUIRED');
    assert(origins.length>0&&new Set(origins).size===origins.length&&origins.every(origin=>new URL(httpsUrl(origin)).origin===origin),'SOURCE_ORIGINS_REQUIRED');
    validateScopedLegalitySource(source);
    if(['pokemon_published_decklists_v1','pokemon_published_decklist_text_v1','pokemon_limitless_published_decklists_v1'].includes(source.adapter))validatePublishedDecklistSource(source,policy,asOf);
    text(source.permission_reference, 'SOURCE_PERMISSION_REFERENCE_REQUIRED', 2000);
    text(source.attribution?.label, 'SOURCE_ATTRIBUTION_REQUIRED');
    httpsUrl(source.attribution?.url);
    if (purpose === 'public') assert(source.allow_derived_publication === true, 'SOURCE_PUBLICATION_NOT_ADMITTED');
  }
  const receipts = new Map();
  for (const receipt of boundedArray(input.receipts, 20000)) {
    const source = sources.get(receipt.source_id);
    assert(source && source.allowed_kinds.includes(receipt.kind), 'RECEIPT_SOURCE_OR_KIND_NOT_ADMITTED');
    safeId(receipt.id);
    assert(!receipts.has(receipt.id), 'DUPLICATE_RECEIPT');
    assert(typeof receipt.body_text === 'string' && Buffer.byteLength(receipt.body_text) <= policy.maximum_receipt_bytes, 'RECEIPT_SIZE');
    assert(SHA256.test(receipt.body_sha256) && sha256(receipt.body_text) === receipt.body_sha256, 'RECEIPT_HASH_MISMATCH');
    assert(timestamp(receipt.observed_at) <= asOf, 'FUTURE_RECEIPT');
    if(receipt.retain_until!==undefined)assert(timestamp(receipt.retain_until)>timestamp(receipt.observed_at),'RECEIPT_RETENTION_BOUND');
    admittedSourceUrl(source,receipt.url);
    readScopedLegalityReceipt(receipt,source,{asOf:new Date(asOf).toISOString()});
    receipts.set(receipt.id, receipt);
  }
  const requireEvidence = (refs, kind) => {
    boundedArray(refs, 100, 'EVIDENCE_REFS_REQUIRED');
    assert(refs.length > 0, 'EVIDENCE_REFS_REQUIRED');
    return refs.map(ref => {
      const receipt = receipts.get(ref);
      assert(receipt?.kind === kind, 'EVIDENCE_KIND_OR_REF_MISMATCH');
      assert(asOf < timestamp(receipt.observed_at) + sources.get(receipt.source_id).retention_days * DAY_MS, 'EVIDENCE_RETENTION_EXPIRED');
      if(receipt.retain_until!==undefined)assert(asOf<timestamp(receipt.retain_until),'EVIDENCE_RETENTION_EXPIRED');
      return receipt;
    });
  };
  return { sources, receipts, requireEvidence };
}

export const aliasKey = card => `${safeId(card.source_id)}|${normalize(text(card.set))}|${collectorNumber(text(card.number))}|${normalize(text(card.name))}`;

export function normalizeEventExport(receipt, source, policy, asOf = timestamp(receipt.observed_at)) {
  let payload;
  try { payload = JSON.parse(receipt.body_text); } catch { assert(false, 'EVENT_EXPORT_JSON'); }
  if (source.adapter === 'limitless_event_v1') payload = normalizeLimitlessCapture(payload, policy, asOf);
  if(source.adapter==='pokemon_reviewed_event_submission_v1')payload=normalizeReviewedEventSubmission(payload,receipt,source,policy,asOf);
  const publishedDecklists=['pokemon_published_decklists_v1','pokemon_published_decklist_text_v1','pokemon_limitless_published_decklists_v1'].includes(source.adapter);
  if(source.adapter==='pokemon_published_decklists_v1')payload=normalizePublishedDecklists(payload,receipt,source,policy,asOf);
  if(source.adapter==='pokemon_published_decklist_text_v1')payload=normalizeDecklistTextSubmission(payload,receipt,source,policy,asOf);
  if(source.adapter==='pokemon_limitless_published_decklists_v1')payload=normalizeLimitlessPublishedDecklists(payload,receipt,source,policy,asOf);
  assert(payload?.version === EVENT_EXPORT_VERSION, 'EVENT_EXPORT_VERSION');
  const exportedEvents = boundedArray(payload.events, policy.maximum_events);
  const receiptExpires = Math.min(timestamp(receipt.observed_at) + source.retention_days * DAY_MS,receipt.retain_until===undefined?Infinity:timestamp(receipt.retain_until),
    ...exportedEvents.map(event => timestamp(event.played_at) + policy.window_days * DAY_MS));
  return exportedEvents.map(event => {
    safeId(event.event_key);
    safeId(event.source_event_id);
    assert(Number.isInteger(event.revision) && event.revision >= 0, 'EVENT_REVISION');
    assert(['complete', 'ongoing', 'canceled', 'withdrawn', 'unverified'].includes(event.status), 'EVENT_STATUS');
    text(event.ruleset_id);
    timestamp(event.played_at);
    assert(typeof event.online === 'boolean', 'EVENT_ONLINE_UNKNOWN');
    assert(event.participant_count === null || Number.isInteger(event.participant_count) && event.participant_count >= 0, 'EVENT_PARTICIPANT_COUNT');
    const decks = boundedArray(event.decks, policy.maximum_decks_per_event).map(deck => {
      safeId(deck.entry_key);
      assert(deck.placing === null || Number.isInteger(deck.placing) && deck.placing > 0, 'DECK_PLACING');
      assert(deck.top_cut === null || typeof deck.top_cut === 'boolean', 'DECK_TOP_CUT_VALUE');
      assert(deck.played_matches === null || Number.isInteger(deck.played_matches) && deck.played_matches >= 0, 'DECK_PARTICIPATION_VALUE');
      const cards = boundedArray(deck.cards, 60).map(card => {
        assert(Number.isInteger(card.quantity) && card.quantity > 0 && card.quantity <= 60, 'DECK_QUANTITY');
        assert(['pokemon', 'trainer', 'energy'].includes(card.section), 'DECK_SECTION');
        const normalized = { source_id: source.id, set: normalize(text(card.set)), number: collectorNumber(text(card.number)), name: text(card.name), quantity: card.quantity, section: card.section };
        aliasKey(normalized);
        return normalized;
      });
      // Entry IDs are event-scoped only. Player names/handles from providers are not copied into normalized results.
      return { entry_key: deck.entry_key, placing: deck.placing, played_matches: deck.played_matches, top_cut: deck.top_cut, cards };
    });
    mapUnique(decks, 'entry_key', 'DUPLICATE_EVENT_ENTRY');
    return {
      event_key: event.event_key, source_event_id: event.source_event_id, source_id: source.id,
      revision: event.revision, observed_at: receipt.observed_at, receipt_refs: [receipt.id],
      status: event.status, game: event.game, format: event.format, ruleset_id: event.ruleset_id,
      played_at: event.played_at, online: event.online, participant_count: event.participant_count,
      population: event.population, decks,
      ...(publishedDecklists?{evidence_basis:event.evidence_basis,region:event.region}:{}),
      expires_at: new Date(receiptExpires).toISOString(),
      ...(event.review_valid_until!==undefined?{review_valid_until:new Date(timestamp(event.review_valid_until)).toISOString()}:{}),
    };
  });
}

function eventContent(event) {
  return digest({ status: event.status, game: event.game, format: event.format, ruleset_id: event.ruleset_id,
    ...(event.evidence_basis?{evidence_basis:event.evidence_basis,region:event.region}:{}),
    played_at: event.played_at, online: event.online, participant_count: event.participant_count, population: event.population,
    decks: event.decks.map(deck => ({ ...deck, cards: deck.cards.map(({ source_id, ...card }) => card).sort((a, b) => digest(a).localeCompare(digest(b))) })).sort((a, b) => a.entry_key.localeCompare(b.entry_key)) });
}

export function deduplicateEvents(events) {
  const byEvent = new Map();
  for (const event of events) {
    if (!byEvent.has(event.event_key)) byEvent.set(event.event_key, new Map());
    const sources = byEvent.get(event.event_key);
    if (!sources.has(event.source_id)) sources.set(event.source_id, []);
    sources.get(event.source_id).push(event);
  }
  const accepted = [], held = [];
  for (const [eventKey, sources] of [...byEvent.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const latest = [];
    let conflict = false;
    for (const revisions of sources.values()) {
      revisions.sort((a, b) => b.revision - a.revision || timestamp(b.observed_at) - timestamp(a.observed_at));
      const winner = revisions[0];
      if (revisions.some(event => event.revision === winner.revision && eventContent(event) !== eventContent(winner))) conflict = true;
      latest.push(winner);
    }
    if (new Set(latest.map(eventContent)).size > 1) conflict = true;
    if (conflict) { held.push({ event_key: eventKey, reason: 'EVENT_REVISION_OR_SOURCE_CONFLICT' }); continue; }
    latest.sort((a, b) => a.source_id.localeCompare(b.source_id));
    const selected = latest[0];
    accepted.push({ ...selected, receipt_refs: [...new Set(latest.flatMap(event => event.receipt_refs))].sort(),
      expires_at: new Date(Math.min(...latest.map(event => timestamp(event.expires_at)))).toISOString() });
  }
  return { events: accepted, held };
}
