import { normalizeTcgdexDetailsV1 } from '../../catalog/pokemon_gameplay_details_normalize_v1.mjs';
import { assert, boundedArray, collectorNumber, digest, normalize, reviewValid, safeId, SHA256, text, timestamp, uniqueSorted, UUID } from './common.mjs';
import { aliasKey, deduplicateEvents, normalizeEventExport, prepareEvidence } from './evidence.mjs';
import { validatePolicy } from './policy.mjs';
import { catalogSourceNameMatches } from '../../catalog/catalog_source_name_binding_v1.mjs';
import {enabledProfileSources,readTcgdexProfileReceipts} from './tcgdex_profile_receipt_v1.mjs';

const PRESENTATION = new Set(['id', 'localId', 'set', 'illustrator', 'image', 'rarity', 'variants', 'variants_detailed',
  'pricing', 'updated', 'description', 'dexId', 'legal', 'regulationMark', 'thirdParty', 'boosters']);
const BASIC_ENERGY_NAMES=new Set(['Grass','Fire','Water','Lightning','Psychic','Fighting','Darkness','Metal'].map(type=>`Basic ${type} Energy`));

// This is an exact source-profile comparison, not a claim of gameplay authority.
// Omitted and explicit empty fields remain different. Unrecognized fields are
// retained, so newly introduced mechanics cannot disappear through a whitelist.
export function tcgdexGameplayProposal(card) {
  assert(card && typeof card === 'object' && !Array.isArray(card), 'COHORT_PROFILE_OBJECT');
  assert(['Pokemon', 'Trainer', 'Energy'].includes(card.category), 'COHORT_PROFILE_CATEGORY');
  text(card.name); text(card.id); text(card.localId); text(card.set?.id);
  assert(card.id === `${card.set.id}-${card.localId}`, 'COHORT_PROFILE_COORDINATES');
  normalizeTcgdexDetailsV1(card); // Reuse the existing source-shape authority.
  const basicEnergyWithoutEffect=card.category==='Energy'&&card.energyType==='Normal'&&BASIC_ENERGY_NAMES.has(card.name)&&!Object.hasOwn(card,'effect');
  if (card.category === 'Pokemon') {
    assert(Number.isInteger(card.hp) && card.hp > 0 && card.hp <= 1000 && typeof card.stage === 'string' &&
      Array.isArray(card.types) && card.types.length > 0 &&
      ((Array.isArray(card.attacks) && card.attacks.length > 0) || (Array.isArray(card.abilities) && card.abilities.length > 0)), 'COHORT_PROFILE_INCOMPLETE');
  } else {
    assert((basicEnergyWithoutEffect || typeof card.effect === 'string' && card.effect.trim()) &&
      typeof card[card.category === 'Trainer' ? 'trainerType' : 'energyType'] === 'string', 'COHORT_PROFILE_INCOMPLETE');
  }
  const mechanics = Object.fromEntries(Object.entries(card).filter(([key]) => !PRESENTATION.has(key)));
  return { fingerprint_version: 'tcgdex_exact_gameplay_proposal:v1', fingerprint: digest(mechanics), mechanics,
    warnings: ['SOURCE_PROFILE_COMPARISON_REQUIRES_GAMEPLAY_REVIEW', 'INDEPENDENT_LEGALITY_NOT_ESTABLISHED',
      ...(basicEnergyWithoutEffect?['BASIC_ENERGY_SOURCE_EFFECT_ABSENT']:[]),
      ...(!Object.hasOwn(card, 'rules') ? ['SOURCE_RULES_FIELD_ABSENT'] : [])] };
}

export function buildCohortReview(input, policy, asOf, bindings) {
  validatePolicy(policy);
  const at = timestamp(asOf), evidence = prepareEvidence(input, policy, at, 'shadow');
  const ruleset = input.ruleset;
  assert(ruleset?.game === 'pokemon' && ruleset.format === 'standard' && ruleset.platform === 'paper' &&
    reviewValid(ruleset.review, at, policy) && timestamp(ruleset.effective_from) <= at && at < timestamp(ruleset.effective_until), 'COHORT_RULESET_REVIEW_REQUIRED');
  safeId(ruleset.id); text(ruleset.region); evidence.requireEvidence(ruleset.evidence_refs, 'legality');
  const cohort = input.cohort;
  safeId(cohort?.profile_source_id);
  assert(evidence.sources.get(cohort.profile_source_id)?.allowed_kinds.includes('gameplay'), 'COHORT_PROFILE_SOURCE');
  const providerIds = uniqueSorted(boundedArray(cohort.provider_card_ids, 500));
  assert(providerIds.length && providerIds.every(id => /^[a-zA-Z0-9.]+-[a-zA-Z0-9]+$/.test(id)), 'COHORT_PROVIDER_IDS');
  const setAliases = new Map();
  for (const alias of boundedArray(cohort.set_aliases, 100)) {
    assert(evidence.sources.has(alias.source_id) && reviewValid(alias.review, at, policy), 'COHORT_SET_ALIAS_REVIEW');
    const key = `${safeId(alias.source_id)}|${normalize(text(alias.source_set))}`;
    assert(!setAliases.has(key), 'COHORT_AMBIGUOUS_SET_ALIAS');
    assert(/^[a-zA-Z0-9.]+$/.test(alias.provider_set), 'COHORT_PROVIDER_SET');
    setAliases.set(key, alias.provider_set);
  }
  const profiles = new Map(), heldProfiles = [];
  const profileSources=enabledProfileSources(cohort);
  for (const receipt of evidence.receipts.values()) {
    if (!profileSources.has(receipt.source_id) || receipt.kind !== 'gameplay') continue;
    evidence.requireEvidence([receipt.id], 'gameplay');
    for(const {card,provenance}of readTcgdexProfileReceipts(receipt,evidence.sources.get(receipt.source_id),{jsonCode:'COHORT_PROFILE_JSON',originCode:'COHORT_PROFILE_ORIGIN_OR_ID'})){
    assert(providerIds.includes(card.id), 'COHORT_PROFILE_ORIGIN_OR_ID');
    const proposal = tcgdexGameplayProposal(card);
    assert(!profiles.has(card.id), 'COHORT_DUPLICATE_PROFILE');
    profiles.set(card.id, { card, proposal, receipt_id: receipt.id, receipt_hash: digest(receipt),provenance });
    }
  }
  const current = new Map(bindings.catalog.map(card => [card.id, card]));
  const active = bindings.mappings.filter(mapping => mapping.source === 'tcgdex' && mapping.active === true);
  const members = [], coordinates = new Map();
  for (const id of providerIds) {
    const owners = active.filter(mapping => mapping.external_id === id);
    const owner = owners[0], parent = owner && current.get(owner.card_print_id), profile = profiles.get(id);
    let reason = null;
    if (owners.length !== 1) reason = owners.length ? 'AMBIGUOUS_SOURCE_OWNER' : 'MISSING_SOURCE_OWNER';
    else if (active.filter(mapping => mapping.card_print_id === owner.card_print_id).length !== 1) reason = 'MULTIPLE_ACTIVE_PARENT_SOURCE_MAPPINGS';
    else if (!parent || !UUID.test(parent.id) || !UUID.test(parent.identity_id) || !SHA256.test(parent.identity_key_hash) ||
      !parent.identity_active || !parent.identity_consistent ||
      !parent.publicly_visible || parent.identity_domain !== policy.scope.identity_domain) reason = 'CANONICAL_MEMBER_INELIGIBLE';
    else if (!profile) reason = 'MISSING_GAMEPLAY_PROFILE';
    else if (!catalogSourceNameMatches(parent,profile.card.name,owner) || normalize(parent.set_code) !== normalize(profile.card.set.id) ||
      collectorNumber(parent.number) !== collectorNumber(profile.card.localId)) reason = 'SOURCE_CANONICAL_COORDINATE_CONFLICT';
    if (reason) { heldProfiles.push({ provider_card_id: id, reason }); continue; }
    const member = { provider_card_id: id, card_print_id: parent.id, identity_id: parent.identity_id,
      identity_key_hash: parent.identity_key_hash, mapping_id: String(owner.id), name: parent.name,
      set_code: parent.set_code, number: parent.number, rarity: parent.rarity,
      fingerprint: profile.proposal.fingerprint, fingerprint_version: profile.proposal.fingerprint_version,
      evidence_refs: [profile.receipt_id], receipt_hash: profile.receipt_hash,
      provenance:profile.provenance,
      review: { status: 'pending' }, artwork_review: { status: 'pending' }, warnings: profile.proposal.warnings };
    members.push(member);
    const coordinate = `${normalize(profile.card.set.id)}|${collectorNumber(profile.card.localId)}|${normalize(profile.card.name)}`;
    if (!coordinates.has(coordinate)) coordinates.set(coordinate, []);
    coordinates.get(coordinate).push(member);
  }
  const groups = new Map();
  for (const member of members) {
    if (!groups.has(member.fingerprint)) groups.set(member.fingerprint, []);
    groups.get(member.fingerprint).push(member);
  }
  const allEvents = [...evidence.receipts.values()].filter(receipt => receipt.kind === 'tournament')
    .flatMap(receipt => normalizeEventExport(receipt, evidence.sources.get(receipt.source_id), policy, at));
  const deduped = deduplicateEvents(allEvents), queue = new Map();
  const eventCoverage = [];
  let completeEvents = 0, participants = 0, lists = 0, listsWithPlay = 0, coordinateResolvedLists = 0;
  for (const event of deduped.events) {
    if (event.status !== 'complete' || timestamp(event.played_at) > at || timestamp(event.expires_at) <= at) continue;
    if (event.online || event.game !== 'pokemon' || event.format !== 'standard' || event.ruleset_id !== input.ruleset.id) continue;
    completeEvents++;
    participants += event.participant_count ?? 0;
    eventCoverage.push({ event_key: event.event_key, source_event_id: event.source_event_id, source_id: event.source_id,
      played_at: event.played_at, participant_count: event.participant_count, population: event.population,
      published_lists: event.decks.length, lists_with_opponent_pairing: event.decks.filter(deck => deck.played_matches > 0).length,
      evidence_refs: event.receipt_refs });
    for (const deck of event.decks) {
      lists++; if (deck.played_matches > 0) listsWithPlay++;
      let resolved = true;
      const seenAliases = new Set();
      for (const card of deck.cards) {
        const key = aliasKey(card), providerSet = setAliases.get(`${card.source_id}|${normalize(card.set)}`);
        if (seenAliases.has(key)) continue; seenAliases.add(key);
        const candidates = coordinates.get(`${normalize(providerSet)}|${collectorNumber(card.number)}|${normalize(card.name)}`) ?? [];
        const reason = !providerSet ? 'SET_ALIAS_REVIEW_REQUIRED' : candidates.length === 0 ? 'COHORT_PROFILE_OR_OWNER_REQUIRED'
          : candidates.length > 1 ? 'AMBIGUOUS_COORDINATE' : 'EXACT_ALIAS_REVIEW_REQUIRED';
        if (candidates.length !== 1) resolved = false;
        if (!queue.has(key)) queue.set(key, { source_id: card.source_id, set: card.set, number: card.number, name: card.name,
          reason, candidate_card_print_ids: candidates.map(member => member.card_print_id).sort(), deck_occurrences: 0,
          review: { status: 'pending' } });
        queue.get(key).deck_occurrences++;
      }
      if (resolved) coordinateResolvedLists++;
    }
  }
  const report = { version: 'pokemon_playables_cohort_review:v1', as_of: asOf, purpose: 'private_review_only',
    input_hash: digest(input), bindings_hash: digest(bindings), policy_hash: digest(policy),
    coverage: { completed_events: completeEvents, reported_participants: participants, published_lists: lists, lists_with_opponent_pairing: listsWithPlay,
      coordinate_resolved_lists: coordinateResolvedLists, reviewed_legal_decks: 0 },
    events: eventCoverage,
    candidates: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fingerprint, rows]) => ({
      proposal_id: `tcgdex-${fingerprint}`, status: 'pending_gameplay_review', fingerprint,
      members: rows.sort((a, b) => a.card_print_id.localeCompare(b.card_print_id)) })),
    held_profiles: heldProfiles, held_events: deduped.held,
    alias_review_queue: [...queue.values()].sort((a, b) => aliasKey(a).localeCompare(aliasKey(b))),
    blockers: ['GAMEPLAY_AND_EXACT_ALIAS_REVIEW_REQUIRED', 'INDEPENDENT_EXACT_PRINT_LEGALITY_REQUIRED',
      'ARTWORK_CLASSIFICATION_REQUIRED_FOR_FULL_ART_FILTER', 'QUALIFICATION_POLICY_CALIBRATION_REQUIRED', 'PUBLIC_SOURCE_ADMISSION_REQUIRED'] };
  return { ...report, report_id: digest(report) };
}
