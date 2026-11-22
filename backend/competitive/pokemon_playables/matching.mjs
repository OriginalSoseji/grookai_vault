import { assert, boundedArray, collectorNumber, digest, normalize, reviewValid, safeId, SHA256, text, timestamp, uniqueSorted, UUID } from './common.mjs';
import { aliasKey, deduplicateEvents, normalizeEventExport, prepareEvidence } from './evidence.mjs';
import { validatePolicy } from './policy.mjs';
import { tcgdexGameplayProposal } from './cohort.mjs';
import { runPrivateReview } from './review_worker.mjs';
import { catalogSourceNameMatches } from '../../catalog/catalog_source_name_binding_v1.mjs';
import { enabledProfileSources,readTcgdexProfileReceipts } from './tcgdex_profile_receipt_v1.mjs';
import {readTcgdexSetReceipt} from './tcgdex_set_receipt_v1.mjs';

const providerId = value => { assert(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,99}$/.test(value), 'MATCHING_PROVIDER_IDENTIFIER'); return value; };

export function prepareMatchingInput(input, policy, asOf) {
  validatePolicy(policy);
  const at = timestamp(asOf), evidence = prepareEvidence(input, policy, at, 'shadow'), config = input.matching;
  assert(config && evidence.sources.has(config.set_source_id), 'MATCHING_SET_SOURCE_REQUIRED');
  const ruleset = input.ruleset;
  assert(ruleset?.game === 'pokemon' && ruleset.format === 'standard' && ruleset.platform === 'paper' &&
    reviewValid(ruleset.review, at, policy) && timestamp(ruleset.effective_from) <= at && at < timestamp(ruleset.effective_until), 'MATCHING_RULESET_REVIEW_REQUIRED');
  evidence.requireEvidence(ruleset.evidence_refs, 'legality');
  const setIds = new Set(), sets = [], codes = new Map();
  for (const ref of boundedArray(config.set_receipt_ids, 100)) {
    const receipt = evidence.requireEvidence([ref], 'gameplay')[0];
    assert(receipt.source_id === config.set_source_id, 'MATCHING_SET_SOURCE_MISMATCH');
    const decoded=readTcgdexSetReceipt(receipt,evidence.sources.get(receipt.source_id)),body=decoded.set;
    providerId(body.id); text(body.name);
    assert(!setIds.has(body.id), 'MATCHING_DUPLICATE_PROVIDER_SET'); setIds.add(body.id);
    const cards = boundedArray(body.cards, 2000), seen = new Set();
    for (const card of cards) {
      providerId(card.id); text(card.name); text(card.localId);
      assert(card.id === `${body.id}-${card.localId}` && !seen.has(card.id), 'MATCHING_SET_CARD_COORDINATES'); seen.add(card.id);
    }
    const labels = [body.id, body.tcgOnline, typeof body.abbreviation === 'string' ? body.abbreviation : body.abbreviation?.official]
      .filter(value => value !== undefined && value !== null && value !== '').map(value => normalize(text(value)));
    const entry = { id: body.id, name: body.name, cards, receipt_id: receipt.id, receipt_hash: digest(receipt), labels: uniqueSorted(labels),
      ...(decoded.provenance.kind==='tcgdex_repository_set_v1'?{coverage:decoded.coverage,complete_set_inventory:false,provenance:decoded.provenance}:{}) };
    sets.push(entry);
    for (const label of entry.labels) {
      if (!codes.has(label)) codes.set(label, []);
      codes.get(label).push(entry);
    }
  }
  assert(sets.length > 0, 'MATCHING_SET_RECEIPTS_REQUIRED');
  const exported = [...evidence.receipts.values()].filter(receipt => receipt.kind === 'tournament')
    .flatMap(receipt => normalizeEventExport(receipt, evidence.sources.get(receipt.source_id), policy, at));
  const deduped = deduplicateEvents(exported);
  const events = deduped.events.filter(event => event.status === 'complete' && event.game === 'pokemon' && event.format === 'standard' &&
    !event.online && event.ruleset_id === ruleset.id && timestamp(event.played_at) <= at && at < timestamp(event.expires_at));
  const coordinates = new Map();
  for (const event of events) for (const deck of event.decks) {
    const seen = new Set();
    for (const card of deck.cards) {
      const key = aliasKey(card); if (seen.has(key)) continue; seen.add(key);
      if (!coordinates.has(key)) coordinates.set(key, { ...card, deck_occurrences: 0 });
      coordinates.get(key).deck_occurrences++;
    }
  }
  const rows = [...coordinates.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, card]) => {
    const candidates = codes.get(normalize(card.set)) ?? [];
    const numbered = candidates.length === 1 ? candidates[0].cards.filter(row => collectorNumber(row.localId) === collectorNumber(card.number)) : [];
    const named = numbered.filter(row => normalize(row.name) === normalize(card.name));
    const reason = candidates.length === 0 ? 'SOURCE_SET_UNRESOLVED' : candidates.length > 1 ? 'AMBIGUOUS_SET_ABBREVIATION'
      : numbered.length === 0 ? (candidates[0].coverage==='reviewed_subset'?'SOURCE_CARD_OUTSIDE_REVIEWED_SUBSET':'SOURCE_CARD_NOT_FOUND') : named.length === 0 ? 'SOURCE_CARD_NAME_CONFLICT'
      : named.length > 1 ? 'AMBIGUOUS_SOURCE_CARD' : null;
    return { alias_key: key, source_id: card.source_id, set: card.set, number: card.number, name: card.name,
      deck_occurrences: card.deck_occurrences, provider_set_ids: candidates.map(set => set.id).sort(),
      provider_card_id: reason ? null : named[0].id, source_reason: reason,
      source_card_candidates: numbered.map(card => ({ provider_card_id: card.id, number: card.localId, name: card.name })),
      evidence_refs: candidates.map(set => set.receipt_id).sort() };
  });
  const ids = uniqueSorted(rows.flatMap(row => [row.provider_card_id, ...row.source_card_candidates.map(card => card.provider_card_id)]).filter(Boolean));
  assert(ids.length <= 500, 'MATCHING_COHORT_BOUND');
  return { evidence, events, held_events: deduped.held, sets, rows, provider_card_ids: ids };
}

export function buildMatchingReview(input, policy, asOf, bindings) {
  const prepared = prepareMatchingInput(input, policy, asOf), { evidence, events } = prepared;
  const active = bindings.mappings.filter(mapping => mapping.source === 'tcgdex' && mapping.active === true);
  const current = new Map(bindings.catalog.map(card => [card.id, card])), profiles = new Map();
  const profileSources=enabledProfileSources(input.matching);
  if (profileSources.size) for (const receipt of evidence.receipts.values()) {
    if (!profileSources.has(receipt.source_id) || receipt.kind !== 'gameplay') continue;
    evidence.requireEvidence([receipt.id], 'gameplay');
    for(const {card,provenance}of readTcgdexProfileReceipts(receipt,evidence.sources.get(receipt.source_id))){
    providerId(card.id);
    assert(!profiles.has(card.id), 'MATCHING_PROFILE_ORIGIN_OR_DUPLICATE');
    let profileReason = null, fingerprint = null;
    try { fingerprint = tcgdexGameplayProposal(card).fingerprint; }
    catch (error) { if (!error.code && !String(error.message).startsWith('GAMEPLAY_')) throw error; profileReason = error.code ?? 'SOURCE_PROFILE_SHAPE_REVIEW_REQUIRED'; }
    profiles.set(card.id, { receipt_id: receipt.id, card, fingerprint, reason: profileReason,provenance });
    }
  }
  const rows = prepared.rows.map(row => {
    const owners = active.filter(mapping => mapping.external_id === row.provider_card_id), owner = owners[0];
    const parent = owner && current.get(owner.card_print_id), profile = profiles.get(row.provider_card_id);
    const sourceSet = prepared.sets.find(set => set.id === row.provider_set_ids[0]);
    let reason = row.source_reason;
    if (!reason) {
      if (owners.length !== 1) reason = owners.length ? 'AMBIGUOUS_SOURCE_OWNER' : 'MISSING_SOURCE_OWNER';
      else if (active.filter(mapping => mapping.card_print_id === owner.card_print_id).length !== 1) reason = 'MULTIPLE_ACTIVE_PARENT_SOURCE_MAPPINGS';
      else if (!parent || !UUID.test(parent.id) || !UUID.test(parent.identity_id) || !SHA256.test(parent.identity_key_hash) ||
        !parent.identity_active || !parent.identity_consistent || !parent.publicly_visible || parent.identity_domain !== policy.scope.identity_domain) reason = 'CANONICAL_MEMBER_INELIGIBLE';
      else if (normalize(parent.set_code) !== normalize(sourceSet.id) || collectorNumber(parent.number) !== collectorNumber(row.number) ||
        !catalogSourceNameMatches(parent,row.name,owner)) reason = 'SOURCE_CANONICAL_COORDINATE_CONFLICT';
    }
    const profileReason = profile && (normalize(profile.card.name) !== normalize(row.name) || profile.card.set?.id !== sourceSet?.id ||
      collectorNumber(profile.card.localId) !== collectorNumber(row.number)) ? 'PROFILE_COORDINATE_CONFLICT' : profile?.reason;
    return { ...row, reason: reason ?? 'EXACT_SOURCE_BINDING_PROPOSED', review: { status: 'pending' },
      canonical_binding: reason ? null : { card_print_id: parent.id, identity_id: parent.identity_id, identity_key_hash: parent.identity_key_hash,
        mapping_id: String(owner.id), rarity: parent.rarity },
      gameplay_profile: !reason && profile && !profileReason ? { receipt_id: profile.receipt_id, fingerprint: profile.fingerprint, provenance:profile.provenance,review: { status: 'pending' } } : null,
      profile_reason: reason ? 'EXACT_BINDING_REQUIRED' : profileReason ?? (profile ? null : 'GAMEPLAY_PROFILE_REQUIRED') };
  });
  const byAlias = new Map(rows.map(row => [row.alias_key, row])), decks = [];
  for (const event of events) for (const deck of event.decks) {
    const keys = uniqueSorted(deck.cards.map(aliasKey)), unresolved = keys.filter(key => !byAlias.get(key)?.canonical_binding);
    const profileMissing = keys.filter(key => !byAlias.get(key)?.gameplay_profile);
    decks.push({ event_key: event.event_key, entry_key: deck.entry_key,
      card_count: deck.cards.reduce((sum, card) => sum + card.quantity, 0), played_matches: deck.played_matches,
      unresolved_aliases: unresolved, missing_profile_aliases: profileMissing });
  }
  const setSummary = uniqueSorted(rows.map(row => row.set)).map(set => {
    const relevant = rows.filter(row => row.set === set), blockedKeys = new Set(relevant.filter(row => !row.canonical_binding).map(row => row.alias_key));
    return { source_set: set, coordinates: relevant.length, exact_binding_proposals: relevant.filter(row => row.canonical_binding).length,
      missing_gameplay_profiles: relevant.filter(row => row.canonical_binding && !row.gameplay_profile).length,
      decks_blocked: decks.filter(deck => deck.unresolved_aliases.some(key => blockedKeys.has(key))).length,
      reasons: Object.fromEntries(uniqueSorted(relevant.map(row => row.reason)).map(reason => [reason, relevant.filter(row => row.reason === reason).length])) };
  });
  const profileGroups = new Map();
  for (const row of rows.filter(row => row.canonical_binding && !row.gameplay_profile)) {
    if (!profileGroups.has(row.provider_card_id)) profileGroups.set(row.provider_card_id, []);
    profileGroups.get(row.provider_card_id).push(row);
  }
  const acquisitionPlan = [...profileGroups.entries()].map(([id, aliases]) => ({ provider_card_id: id,
    source_id: input.matching.profile_source_id ?? null, url: `https://api.tcgdex.net/v2/en/cards/${id}`,
    deck_occurrences: decks.filter(deck => deck.missing_profile_aliases.some(key => aliases.some(alias => alias.alias_key === key))).length,
    status: 'pending_acquisition', reason: aliases[0].profile_reason }));
  const canonicalRepair = rows.filter(row => row.reason === 'MISSING_SOURCE_OWNER').map(row => {
    const parents = (bindings.unmapped_parent_candidates ?? []).filter(parent => row.provider_set_ids.includes(parent.set_code) &&
      collectorNumber(parent.number) === collectorNumber(row.number) && normalize(parent.name) === normalize(row.name));
    return { ...row, status: 'pending_canonical_pipeline_review', canonical_parent_candidates: parents,
      prior_tcgdex_mappings: (bindings.unmapped_parent_mappings ?? []).filter(mapping => parents.some(parent => parent.id === mapping.card_print_id)),
      restriction: 'NO_COMPETITIVE_MAPPING_WRITE_OR_AUTOMATIC_PARENT_PROMOTION' };
  });
  const nameAliases = rows.filter(row => row.reason === 'SOURCE_CARD_NAME_CONFLICT').map(row => ({
    ...row, status: 'pending_source_name_alias_review',
    canonical_coordinate_candidates: (bindings.unmapped_parent_candidates ?? []).filter(parent =>
      row.provider_set_ids.includes(parent.set_code) && collectorNumber(parent.number) === collectorNumber(row.number)),
    prior_tcgdex_mappings: (bindings.unmapped_parent_mappings ?? []).filter(mapping =>
      (bindings.unmapped_parent_candidates ?? []).some(parent => parent.id === mapping.card_print_id &&
        row.provider_set_ids.includes(parent.set_code) && collectorNumber(parent.number) === collectorNumber(row.number))),
    numbered_owner_candidates: row.source_card_candidates.map(card => {
      const owners = active.filter(mapping => mapping.external_id === card.provider_card_id);
      const parent = owners.length === 1 ? current.get(owners[0].card_print_id) : null;
      return { ...card, canonical_parent: parent ?? null, active_source_owner_count: owners.length };
    }), restriction: 'NUMBER_AGREEMENT_DOES_NOT_APPROVE_A_NAME_ALIAS' }));
  const report = { version: 'pokemon_playables_matching_review:v1', as_of: asOf, purpose: 'private_review_only',
    input_hash: digest(input), policy_hash: digest(policy), bindings_hash: digest(bindings),
    coverage: { completed_events: events.length, published_lists: decks.length, source_coordinates: rows.length,
      exact_source_binding_proposals: rows.filter(row => row.canonical_binding).length,
      source_profile_proposals: rows.filter(row => row.gameplay_profile).length,
      coordinate_resolved_lists: decks.filter(deck => deck.card_count === 60 && deck.played_matches > 0 && deck.unresolved_aliases.length === 0).length,
      profile_complete_lists: decks.filter(deck => deck.card_count === 60 && deck.played_matches > 0 && deck.missing_profile_aliases.length === 0).length,
      reviewed_legal_decks: 0 },
    set_summary: setSummary, coordinate_review_queue: rows, deck_review_queue: decks,
    profile_acquisition_plan: acquisitionPlan.sort((a, b) => b.deck_occurrences - a.deck_occurrences || a.provider_card_id.localeCompare(b.provider_card_id)),
    canonical_repair_queue: canonicalRepair, name_alias_review_queue: nameAliases,
    set_evidence: prepared.sets.map(set => ({ provider_set_id: set.id, source_codes: set.labels, receipt_id: set.receipt_id, receipt_hash: set.receipt_hash })),
    held_events: prepared.held_events,
    blockers: ['EXACT_ALIAS_AND_GAMEPLAY_REVIEW_REQUIRED', 'INDEPENDENT_EXACT_PRINT_LEGALITY_REQUIRED', 'QUALIFICATION_POLICY_CALIBRATION_REQUIRED', 'PUBLIC_SOURCE_ADMISSION_REQUIRED'] };
  return { ...report, report_id: digest(report) };
}

export async function reviewMatching(options) {
  return runPrivateReview({ ...options, purpose: 'matching_review', reportBuilder: buildMatchingReview,
    bindingIds: (input, policy, asOf) => prepareMatchingInput(input, policy, asOf).provider_card_ids,
    localBindings: input => input.matching.bindings });
}
