import {assert, collectorNumber, DAY_MS, digest, mapUnique, normalize, sha256, timestamp} from './common.mjs';
import {aliasKey} from './evidence.mjs';
import {createGameplayReviewTasks} from './gameplay_review_actions_v1.mjs';
import {tcgdexGameplayProposal} from './cohort.mjs';
import {readTcgdexProfileReceipt} from './tcgdex_profile_receipt_v1.mjs';
import {readTcgdexSetReceipt} from './tcgdex_set_receipt_v1.mjs';
import {catalogSourceNameMatches} from '../../catalog/catalog_source_name_binding_v1.mjs';
import {hasCompletedStandings} from './adapters/limitless_v1.mjs';
import {readLimitlessPublishedLists, verifyLimitlessPublishedOriginals} from './adapters/limitless_published_decklists_v1.mjs';

export const STANDARD_USAGE_MECHANICS_VERSION = 'pokemon_standard_usage_mechanics:v2';

export function standardUsageMechanics(card) {
  // TCGdex defines cameoDexIds as additional Pokemon depicted in the artwork.
  // Keep the retained original and legacy profile comparison intact. Only the
  // current usage grouping excludes this known artwork field; unknown fields
  // continue to distinguish profiles.
  const {mechanics} = tcgdexGameplayProposal(card);
  const gameplay = Object.fromEntries(Object.entries(mechanics).filter(([key]) => key !== 'cameoDexIds'));
  return {version: STANDARD_USAGE_MECHANICS_VERSION, mechanics: gameplay,
    fingerprint: digest({version: STANDARD_USAGE_MECHANICS_VERSION, mechanics: gameplay})};
}

function validateUsagePolicy(policy) {
  assert(policy?.version === 'pokemon_current_standard_usage_policy:v1' && policy.window_days === 30 &&
    policy.game === 'pokemon' && policy.format === 'standard' && policy.language === 'en' && policy.platform === 'paper' &&
    policy.date_basis === 'publisher_event_date_with_completed_decklists', 'STANDARD_USAGE_POLICY');
  for (const field of ['minimum_events', 'minimum_lists', 'minimum_card_events', 'minimum_card_lists', 'publication_max_age_hours']) {
    assert(Number.isInteger(policy[field]) && policy[field] > 0, 'STANDARD_USAGE_THRESHOLD');
  }
  assert(policy.minimum_card_events >= 2 && policy.minimum_card_lists >= 2 && policy.publication_max_age_hours <= 24, 'STANDARD_USAGE_SUPPORT');
}

function verifiedIndex(context, bindings, asOf) {
  // Reuse original/profile/fingerprint validation without importing review decisions.
  createGameplayReviewTasks(context, asOf);
  const catalog = mapUnique(bindings.catalog, 'id');
  const receipts = mapUnique(context.receipts, 'id');
  const sources = mapUnique(context.sources, 'id');
  const owners = bindings.mappings.filter(mapping => mapping.source === 'tcgdex' && mapping.active);
  const groups = new Map(), memberGroups = new Map(), aliases = new Map();
  for (const proposal of context.packet.groups) {
    for (const member of proposal.members) {
      const card = catalog.get(member.card_print_id);
      const mappings = owners.filter(mapping => mapping.external_id === member.provider_card_id);
      assert(card && card.identity_id === member.identity_id && card.identity_key_hash === member.identity_key_hash &&
        card.identity_active && card.identity_consistent && card.publicly_visible && card.identity_domain === 'pokemon_eng_standard' &&
        mappings.length === 1 && mappings[0].card_print_id === card.id && String(mappings[0].id) === member.mapping_id &&
        owners.filter(mapping => mapping.card_print_id === card.id).length === 1, 'STANDARD_USAGE_IDENTITY_DRIFT');
      const receipt = receipts.get(member.profile_original.id);
      const {card: profile} = readTcgdexProfileReceipt(receipt, sources.get(receipt.source_id), {providerCardId: member.provider_card_id});
      assert(catalogSourceNameMatches(card, profile.name, mappings[0]) && normalize(card.set_code) === normalize(profile.set.id) &&
        collectorNumber(card.number) === collectorNumber(profile.localId), 'STANDARD_USAGE_COORDINATE_CONFLICT');
      const fingerprint = standardUsageMechanics(profile).fingerprint;
      if (!groups.has(fingerprint)) groups.set(fingerprint, {id: fingerprint, name: profile.name, members: [], decks: new Set(), events: new Set()});
      const group = groups.get(fingerprint);
      assert(!memberGroups.has(card.id), 'STANDARD_USAGE_DUPLICATE_MEMBER');
      group.members.push({card_print_id: card.id, identity_id: card.identity_id, identity_key_hash: card.identity_key_hash,
        provider_card_id: member.provider_card_id, mapping_id: member.mapping_id, gv_id: card.gv_id, name: card.name,
        set_code: card.set_code, number: card.number, rarity: card.rarity ?? profile.rarity ?? null});
      memberGroups.set(card.id, {group, profile});
    }
    for (const alias of proposal.aliases) {
      const target = memberGroups.get(alias.card_print_id);
      const setReceipt = receipts.get(alias.set_original.id);
      const {set} = readTcgdexSetReceipt(setReceipt, sources.get(setReceipt.source_id));
      const labels = [set.id, set.tcgOnline, typeof set.abbreviation === 'string' ? set.abbreviation : set.abbreviation?.official].filter(value => typeof value === 'string').map(normalize);
      assert(target && set.id === target.profile.set.id && labels.includes(normalize(alias.set)) &&
        collectorNumber(alias.number) === collectorNumber(target.profile.localId) && normalize(alias.name) === normalize(target.profile.name) &&
        set.cards.filter(card => card.id === target.profile.id && collectorNumber(card.localId) === collectorNumber(target.profile.localId)).length === 1,
        'STANDARD_USAGE_ALIAS_CONFLICT');
      const key = aliasKey(alias);
      const previous = aliases.get(key);
      assert(!previous || previous.id === target.group.id, 'STANDARD_USAGE_AMBIGUOUS_ALIAS');
      aliases.set(key, target.group);
    }
  }
  return {groups, aliases, sources};
}

export function buildCurrentStandardUsage(input, policy, {asOf} = {}) {
  validateUsagePolicy(policy);
  assert(input?.version === 'pokemon_current_standard_usage_input:v1', 'STANDARD_USAGE_INPUT');
  const at = timestamp(asOf), context = input.context;
  assert(at < timestamp(context.retain_until), 'STANDARD_USAGE_EXPIRED_INPUT');
  const index = verifiedIndex(context, input.current_bindings, asOf);
  const eventIds = new Set(), seenEvents = new Map(), evidence = [], exclusions = [];
  let lists = 0, mappedLines = 0, totalLines = 0;
  let validUntil = Math.min(timestamp(context.retain_until), at + policy.publication_max_age_hours * 3_600_000);
  const eventReceipts = context.receipts.filter(receipt => receipt.kind === 'tournament')
    .sort((a, b) => timestamp(b.observed_at) - timestamp(a.observed_at) || a.id.localeCompare(b.id));
  for (const receipt of eventReceipts) {
    assert(sha256(receipt.body_text) === receipt.body_sha256, 'STANDARD_USAGE_ORIGINAL_CHANGED');
    const capture = JSON.parse(receipt.body_text);
    verifyLimitlessPublishedOriginals(capture, index.sources.get(receipt.source_id), at);
    const details = JSON.parse(capture.originals.details.receipt.body_text);
    const eventKey = `${new URL(receipt.url).origin}|${capture.event_id}`;
    const published = readLimitlessPublishedLists(capture, {maximum_decks_per_event: 10000});
    const signature = digest({details, decks: published.decks});
    const previous = seenEvents.get(eventKey);
    if (previous) {
      assert(previous.observed_at !== receipt.observed_at || previous.signature === signature, 'STANDARD_USAGE_CONFLICTING_EVENT');
      continue;
    }
    seenEvents.set(eventKey, {observed_at: receipt.observed_at, signature});
    if (details.id !== capture.event_id || details.game !== 'PTCG' || details.format !== 'STANDARD' || details.isOnline !== false ||
      details.isPublic !== true || details.multideck || details.bannedCards?.length || details.specialRules?.length ||
      !hasCompletedStandings(capture.originals.standings_page.receipt.body_text)) {
      exclusions.push({event_id: capture.event_id, reason: 'PUBLISHED_PHYSICAL_STANDARD_REQUIRED'}); continue;
    }
    const date = timestamp(details.date);
    if (!(at - policy.window_days * DAY_MS < date && date <= at)) {
      exclusions.push({event_id: capture.event_id, reason: 'OUTSIDE_CURRENT_WINDOW'}); continue;
    }
    if (timestamp(capture.retain_until) <= at) {
      exclusions.push({event_id: capture.event_id, reason: 'ORIGINAL_EXPIRED'}); continue;
    }
    let eventLists = 0;
    for (const deck of published.decks) {
      if (deck.cards.reduce((sum, card) => sum + card.quantity, 0) !== 60) continue;
      const used = new Set();
      for (const line of deck.cards) {
        totalLines++;
        const group = index.aliases.get(aliasKey({...line, source_id: receipt.source_id}));
        if (group) { used.add(group.id); mappedLines++; }
      }
      if (!used.size) continue;
      const deckKey = `${eventKey}|${deck.entry_key}`;
      for (const id of used) { index.groups.get(id).decks.add(deckKey); index.groups.get(id).events.add(eventKey); }
      eventLists++; lists++;
    }
    if (eventLists) {
      eventIds.add(eventKey);
      validUntil = Math.min(validUntil, date + policy.window_days * DAY_MS, timestamp(capture.retain_until));
      evidence.push({event_id: capture.event_id, event_date: details.date, date_basis: policy.date_basis,
        lists: eventLists, participant_count: details.players ?? null, population: 'published_lists',
        receipt_id: receipt.id, body_sha256: receipt.body_sha256, url: receipt.url});
    }
  }
  const sufficient = eventIds.size >= policy.minimum_events && lists >= policy.minimum_lists;
  const rows = [...index.groups.values()].flatMap(group => {
    const playable = sufficient && group.events.size >= policy.minimum_card_events && group.decks.size >= policy.minimum_card_lists;
    return group.members.map(member => ({...member, gameplay_id: group.id, playable,
      support: {events: group.events.size, lists: group.decks.size},
      reason: playable ? 'REPEATED_CURRENT_STANDARD_DECKLIST_INCLUSION' : 'INSUFFICIENT_CURRENT_SUPPORT'}));
  }).sort((a, b) => Number(b.playable) - Number(a.playable) || b.support.lists - a.support.lists || a.card_print_id.localeCompare(b.card_print_id));
  const result = {version: 'pokemon_current_standard_usage:v1', as_of: asOf, valid_until: new Date(validUntil).toISOString(),
    mechanics_version: STANDARD_USAGE_MECHANICS_VERSION,
    definition: policy.definition, date_basis: policy.date_basis, policy_hash: digest(policy),
    state: sufficient ? 'ready' : 'insufficient_evidence', rows,
    coverage: {events: eventIds.size, lists, mapped_card_lines: mappedLines, total_card_lines: totalLines,
      mapping_ratio: totalLines ? mappedLines / totalLines : null, catalog_members: rows.length,
      gameplay_groups: index.groups.size, qualified_members: rows.filter(row => row.playable).length},
    source_attribution: {label: 'Published Standard decklists from Limitless; TCGdex metadata', url: 'https://play.limitlesstcg.com'},
    evidence, exclusions};
  return {...result, snapshot_id: digest(result)};
}

export function readCurrentStandardUsage(snapshot, {now, current_bindings} = {}) {
  const {snapshot_id, ...content} = snapshot ?? {};
  const unavailable = state => ({state, rows: [], snapshot_id: snapshot_id ?? null});
  if (content.version !== 'pokemon_current_standard_usage:v1' || digest(content) !== snapshot_id) return unavailable('invalid_snapshot');
  const at = timestamp(now);
  if (at < timestamp(content.as_of) || at >= timestamp(content.valid_until)) return unavailable('stale');
  const catalog = mapUnique(current_bindings.catalog, 'id');
  const mappings = current_bindings.mappings.filter(mapping => mapping.source === 'tcgdex' && mapping.active);
  for (const row of content.rows.filter(row => row.playable)) {
    const card = catalog.get(row.card_print_id);
    const owners = mappings.filter(mapping => mapping.external_id === row.provider_card_id);
    if (!card || !card.identity_active || !card.identity_consistent || !card.publicly_visible || card.identity_domain !== 'pokemon_eng_standard' ||
      card.identity_id !== row.identity_id || card.identity_key_hash !== row.identity_key_hash || owners.length !== 1 ||
      owners[0].card_print_id !== card.id || String(owners[0].id) !== row.mapping_id || mappings.filter(mapping => mapping.card_print_id === card.id).length !== 1) return unavailable('catalog_changed');
  }
  return {state: content.state, rows: content.rows.filter(row => row.playable), snapshot_id,
    as_of: content.as_of, valid_until: content.valid_until, definition: content.definition,
    coverage: content.coverage, source_attribution: content.source_attribution};
}
