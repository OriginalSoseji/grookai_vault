import fs from 'node:fs';
import { sha256 } from '../common.mjs';

export const AS_OF = '2026-11-12T12:00:00.000Z';
const uuid = value => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;

export function fixture() {
  const policy = JSON.parse(fs.readFileSync(new URL('../policy_v1.json', import.meta.url)));
  policy.reviewers = ['synthetic-fixture-reviewer'];
  const review = () => ({ status: 'approved', reviewed_by: policy.reviewers[0], reviewed_at: '2026-11-12T00:00:00.000Z', valid_until: '2026-12-01T00:00:00.000Z', basis: 'Synthetic test evidence; no real-world qualification or source permission asserted.' });
  const sources = ['fixture-events', 'fixture-rules'].map(id => ({ id, access_method: 'authorized_export', allow_ingest: true,
    allow_derived_publication: true, allowed_origins: ['https://fixtures.example'], retention_days: 30,
    allowed_kinds: id === 'fixture-events' ? ['tournament'] : ['gameplay', 'legality'], review: review(),
    permission_reference: 'Synthetic fixture generated for tests, not third-party data.', attribution: { label: id, url: 'https://fixtures.example' } }));
  const receipt = (id, sourceId, kind, body) => {
    const bodyText = JSON.stringify(body);
    return { id, source_id: sourceId, kind, url: `https://fixtures.example/${id}`, observed_at: '2026-11-12T00:00:00.000Z', body_text: bodyText, body_sha256: sha256(bodyText) };
  };
  const catalog = [1, 2, 3, 4].map((value, index) => ({ id: uuid(value), identity_id: uuid(value + 100), identity_key_hash: sha256(`fixture-${value}`),
    identity_active: true, identity_consistent: true, identity_domain: 'pokemon_eng_standard', publicly_visible: true,
    gv_id: `FIXTURE-NOT-REAL-${value}`, name: ['Fixture Basic Pokemon', 'Fixture Draw Supporter', 'Fixture Draw Supporter', 'Fixture Basic Energy'][index],
    rarity: ['Common', 'Common', 'Ultra Rare', 'Common'][index] }));
  const member = card => ({ card_print_id: card.id, identity_id: card.identity_id, identity_key_hash: card.identity_key_hash, review: review(), evidence_refs: ['gameplay'] });
  const alias = (card, number) => ({ source_id: 'fixture-events', set: 'TEST', number: String(number), name: card.name, card_print_id: card.id });
  const groups = [
    { id: 'basic-pokemon', label: catalog[0].name, section: 'pokemon', basic_energy: false, is_basic_pokemon: true,
      copy_limit_key: catalog[0].name, deck_limit_groups: [], review: review(), evidence_refs: ['gameplay'], members: [member(catalog[0])], aliases: [alias(catalog[0], 1)] },
    { id: 'draw-supporter', label: catalog[1].name, section: 'trainer', basic_energy: false, is_basic_pokemon: false,
      copy_limit_key: catalog[1].name, deck_limit_groups: [], review: review(), evidence_refs: ['gameplay'], members: [member(catalog[1]), member(catalog[2])], aliases: [alias(catalog[1], 2), alias(catalog[2], 102)] },
    { id: 'basic-energy', label: catalog[3].name, section: 'energy', basic_energy: true, is_basic_pokemon: false,
      copy_limit_key: catalog[3].name, deck_limit_groups: [], review: review(), evidence_refs: ['gameplay'], members: [member(catalog[3])], aliases: [alias(catalog[3], 3)] },
  ];
  const ruleset = { id: 'fixture-paper-standard', game: 'pokemon', format: 'standard', platform: 'paper', region: 'synthetic-fixture',
    effective_from: '2026-01-01T00:00:00.000Z', effective_until: '2026-12-01T00:00:00.000Z', compatible_online_rulesets: [], review: review(), evidence_refs: ['legality'] };
  const legality = catalog.map(card => ({ card_print_id: card.id, ruleset_id: ruleset.id, status: 'legal', eligible_printing: true,
    effective_from: ruleset.effective_from, effective_until: ruleset.effective_until, verified_at: '2026-11-12T00:00:00.000Z', review: review(), evidence_refs: ['legality'] }));
  const events = Array.from({ length: 3 }, (_, index) => ({ event_key: `fixture-event-${index}`, source_event_id: `provider-${index}`, revision: 1,
    status: 'complete', game: 'pokemon', format: 'standard', ruleset_id: ruleset.id, played_at: `2026-11-${String(10 - index).padStart(2, '0')}T12:00:00.000Z`,
    online: false, participant_count: 8, population: 'full_field', decks: Array.from({ length: 8 }, (_, deckIndex) => ({ entry_key: `entrant-${deckIndex}`, placing: deckIndex + 1, played_matches: 3, top_cut: deckIndex < 2,
      cards: [
        { set: 'TEST', number: '001', name: catalog[0].name, quantity: 4, section: 'pokemon' },
        { set: 'TEST', number: '002', name: catalog[1].name, quantity: 2, section: 'trainer' },
        { set: 'TEST', number: '102', name: catalog[2].name, quantity: 2, section: 'trainer' },
        { set: 'TEST', number: '003', name: catalog[3].name, quantity: 52, section: 'energy' },
      ] })) }));
  const receipts = [receipt('gameplay', 'fixture-rules', 'gameplay', { synthetic: true, groups: 'Reviewed synthetic equivalence and gameplay metadata.' }),
    receipt('legality', 'fixture-rules', 'legality', { synthetic: true, rules: 'Explicit synthetic legality and printing eligibility.' }),
    ...events.map((event, index) => receipt(`event-${index}`, 'fixture-events', 'tournament', { version: 'pokemon_playables_event_export:v1', events: [event] }))];
  return { policy, input: { version: 'pokemon_playables_input:v1', synthetic: true, sources, ruleset, receipts, groups, legality, catalog } };
}

export function mutateEvent(input, index, mutate) {
  const receipt = input.receipts.filter(row => row.kind === 'tournament')[index];
  const payload = JSON.parse(receipt.body_text);
  mutate(payload.events[0], payload);
  receipt.body_text = JSON.stringify(payload);
  receipt.body_sha256 = sha256(receipt.body_text);
  return receipt;
}
