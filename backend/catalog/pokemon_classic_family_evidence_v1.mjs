import assert from 'node:assert/strict';
import { DECKS, sha256, identityNameKey } from './pokemon_classic_identity_evidence_v1.mjs';
import { parseClassicPriceDex } from './pokemon_classic_finish_evidence_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_FAMILY_EVIDENCE_V1';
const text = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&eacute;/g, 'é').replace(/&nbsp;/g, ' ').trim();
const slug = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Called only after original identity and finish source replay. No network or DB.
export function qualifyClassicFamilies({ identity, sources, checklists, photographs, species, observation }) {
  const b = sources.find(s => s.key === 'bulbapedia');
  assert.ok(b); assert.equal(sha256(b.bytes), b.sha256);
  const html = b.bytes.toString(), start = html.indexOf('id="English_decks"');
  const end = html.indexOf('id="Japanese_.26_Traditional_Chinese_decks"', start);
  assert.ok(start >= 0 && end > start);
  const section = html.slice(start, end), heads = [...section.matchAll(/<big><b>([\s\S]*?)<\/b><\/big>/g)], rows = [];
  assert.equal(heads.length, 3);
  for (let i = 0; i < heads.length; i++) {
    const deck = DECKS.find(d => d.title === text(heads[i][1])); assert.ok(deck);
    const part = section.slice(heads[i].index, heads[i + 1]?.index ?? section.length);
    const typeRows = [...part.matchAll(/<tr>\s*<td[^>]*>(\d{3})\/034\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>(\d+)×\s*<\/td><\/tr>/g)];
    assert.equal(typeRows.length, 34);
    const checklist = checklists.find(s => s.key === 'pricedex-' + deck.printed_code.toLowerCase());
    parseClassicPriceDex(checklist, deck);
    const data = JSON.parse(checklist.bytes.toString().match(/id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)[1]).props.pageProps.initialCards;
    for (const m of typeRows) {
      const number = m[1], matches = identity.joins.filter(r => r.deck_code === deck.printed_code && r.number === number);
      assert.equal(matches.length, 1); const card = matches[0];
      const metadata = data.filter(r => String(r.number).padStart(3, '0') === number); assert.equal(metadata.length, 1);
      const raw = metadata[0]; assert.equal(identityNameKey(raw.name), identityNameKey(card.card_name));
      const typeText = text(m[3]), icons = [...m[3].matchAll(/<img\b[^>]*alt="([^"]+)"/g)].map(m => m[1]);
      let domain, subtype = null;
      if (typeText === 'E') domain = 'energy';
      else if (['I', 'T [Item]'].includes(typeText)) { domain = 'trainer'; subtype = 'item'; }
      else if (['Su', 'T [Su]'].includes(typeText)) { domain = 'trainer'; subtype = 'supporter'; }
      else if (['PT', 'T [T]'].includes(typeText)) { domain = 'trainer'; subtype = 'pokemon-tool'; }
      else if (typeText === 'T [St]') { domain = 'trainer'; subtype = 'stadium'; }
      else if (typeText === '' && icons.length === 1 && ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Colorless', 'Darkness', 'Metal'].includes(icons[0])) domain = 'pokemon';
      assert.ok(domain, 'exact_source_type_unclassified');
      const metadataDomain = ({ 'Pokémon': 'pokemon', Trainer: 'trainer', Energy: 'energy' })[raw.supertype]; assert.ok(metadataDomain);
      let adjudication = null;
      if (domain !== metadataDomain) {
        // One frozen, physically observed source error. Never a generic override.
        assert.equal(deck.printed_code + number, 'CLV032', 'unreviewed_source_domain_conflict');
        assert.equal(domain, 'energy'); assert.equal(metadataDomain, 'trainer');
        assert.equal(card.card_name, 'Double Colorless Energy');
        assert.equal(observation.actor_type, 'automated_agent'); assert.equal(observation.human_signature, null);
        assert.equal(observation.method, 'direct_original_resolution_image_inspection');
        assert.equal(observation.deck_code, 'CLV'); assert.equal(observation.number, '032'); assert.equal(observation.printed_total, '034');
        assert.equal(observation.proposed_domain, 'energy'); assert.equal(observation.proposed_card_type, 'special-energy');
        assert.equal(observation.source_conflict_retained, true);
        assert.ok(Number.isFinite(Date.parse(observation.at)));
        assert.equal(observation.image_sha256, 'b7f022cf6930a8a6c674008a6e6247fd053fe419a4e6f6eb3a8a1abf4c28cd3e');
        const photo = photographs.find(p => sha256(p.bytes) === observation.image_sha256);
        assert.ok(photo, 'physical_adjudication_original_required'); assert.equal(photo.url, observation.image_url);
        assert.equal(observation.raw_source_conflict.bulbapedia.source_sha256, b.sha256);
        assert.equal(observation.raw_source_conflict.bulbapedia.exact_row_sha256, sha256(m[0]));
        assert.equal(observation.raw_source_conflict.pricedex.source_sha256, checklist.sha256);
        assert.equal(observation.raw_source_conflict.pricedex.domain, metadataDomain);
        adjudication = { policy: VERSION, status: 'physical_category_precedence', observation, metadata_domain: metadataDomain };
        subtype = 'special-energy';
      }
      let speciesMatch = null;
      if (domain === 'pokemon') {
        assert.equal(raw.nationalPokedexNumbers.length, 1); assert.equal(raw.pokemonNames.length, 1);
        const matches = species.filter(s => s.national_dex_number === raw.nationalPokedexNumbers[0] && identityNameKey(s.display_name) === identityNameKey(raw.pokemonNames[0]));
        assert.equal(matches.length, 1, 'unique_exact_species_required'); speciesMatch = matches[0];
      }
      rows.push({ set_key: deck.set_key, deck_code: deck.printed_code, number, card_name: card.card_name,
        card_domain: domain, card_type: subtype ?? domain,
        family_key: speciesMatch ? `species:${speciesMatch.id}` : `${domain}:${slug(card.card_name)}`,
        species: speciesMatch, family_status: speciesMatch ? 'resolved_species' : 'resolved_non_species_identity',
        source_evidence: { bulbapedia_sha256: b.sha256, exact_type_row_sha256: sha256(m[0]),
          pricedex_sha256: checklist.sha256, type_text: typeText, type_icons: icons, raw_metadata: raw }, adjudication });
    }
  }
  assert.equal(rows.length, 102); assert.equal(new Set(rows.map(r => r.set_key + r.number)).size, 102);
  assert.deepEqual(rows.reduce((c, r) => (c[r.card_domain] = (c[r.card_domain] ?? 0) + 1, c), {}), { pokemon: 51, trainer: 42, energy: 9 });
  assert.equal(rows.filter(r => r.adjudication).length, 1);
  return { version: VERSION, actor_type: 'automated_agent', human_signature: null, identity_fingerprint: identity.fingerprint, rows };
}
