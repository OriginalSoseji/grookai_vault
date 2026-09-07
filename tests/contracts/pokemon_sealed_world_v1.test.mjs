import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPokemonSealedProductV1, pokemonSealedLanguageV1,
  buildPokemonSealedWorldPlanV1, validatePokemonSealedWorldPlanV1 } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { createSealedWorldPolicyV1 } from '../../backend/pricing/sealed_world_policy_v1.mjs';
import { buildMtgSealedWorldPlanV1 } from '../../backend/pricing/mtg_sealed_world_v1.mjs';

const product = (name, extra = {}) => ({ name, category_id: 3, product_id: 123, group_id: 7,
  group_name: 'Example', category_display_name: 'Pokemon', non_sealed_label: 'Single Cards',
  source_active: true, catalog_metadata_status: 'current', payload_hash: 'a'.repeat(64),
  extended_data: [], ...extra });
const price = { product_id: 123, subtype_name_normalized: 'normal', currency: 'USD',
  market_price: 50, low_price: 45, source_price_row_identity: 'tcgplayer:123:normal',
  observed_on: '2026-09-07', payload_hash: 'b'.repeat(64) };
const input = (rows, prices = [price]) => ({ sourceRows: rows, latestPriceRows: prices,
  latestSync: { id: 'sync', status: 'completed', observed_on: '2026-09-07' }, producerCommit: 'c'.repeat(40) });

test('Pokemon ETB, booster box, tin, and case retain package identity', () => {
  for (const [name, form] of [['Elite Trainer Box','kit'],['Booster Box','booster_box'],['Mini Tin','tin'],['Booster Box Case','case']])
    assert.equal(classifyPokemonSealedProductV1(product(name)).candidate_identity.package_form, form);
});
test('blister and collection require positive source contents', () => {
  for (const name of ['Charizard ex Box','Three Pack Blister']) {
    assert.equal(classifyPokemonSealedProductV1(product(name)).classification, 'ambiguous_review');
    assert.equal(classifyPokemonSealedProductV1(product(name,{extended_data:[{name:'CardText',value:'Contains 3 Pokemon TCG booster packs.'}]})).classification, 'sealed_candidate');
  }
});
test('single cards, code cards and custom repacks remain unpromotable', () => {
  for (const row of [product('Pikachu Collection',{extended_data:[{name:'Number',value:'025'}]}), product('Code Card Elite Trainer Box'),product('Custom Repack Booster Box')])
    assert.notEqual(classifyPokemonSealedProductV1(row).classification,'sealed_candidate');
});
test('language stays separate and conflicting markers abstain', () => {
  assert.equal(pokemonSealedLanguageV1(product('Booster Box',{category_id:85})).code,'ja');
  assert.equal(pokemonSealedLanguageV1(product('Korean Booster Box')).code,'ko');
  assert.equal(pokemonSealedLanguageV1(product('Japanese English Booster Box')).code,null);
});
test('valid Pokemon payload has evidence and isolated deterministic identity', () => {
  const plan=buildPokemonSealedWorldPlanV1(input([product('Booster Box')]));
  assert.equal(validatePokemonSealedWorldPlanV1(plan).valid,true);
  assert.equal(plan.payload.families[0].game_key,'pokemon');
  assert.equal(plan.payload.families[0].manufacturer_name,null);
  assert.equal(plan.payload.mappings[0].source_category_id,3);
  assert.equal(plan.payload.members.length,1);
  assert.deepEqual(plan,buildPokemonSealedWorldPlanV1(input([product('Booster Box')])));
});
test('negative price and stale observation cannot enter release', () => {
  for (const patch of [{market_price:-2},{observed_on:'2026-08-01'}]) {
    const plan=buildPokemonSealedWorldPlanV1(input([product('Booster Box')],[{...price,...patch}]));
    assert.equal(plan.payload.members.length,0);
  }
});
test('shared builder preserves existing MTG payload byte-equivalent structure', () => {
  const source=product('Booster Box',{category_id:1,category_display_name:'Magic'});
  const shared=createSealedWorldPolicyV1({gameKey:'mtg',categoryIds:[1],version:'MTG_SEALED_WORLD_V1',manufacturer:'Wizards of the Coast',languages:['en']});
  assert.deepEqual(shared.buildPlan(input([source])),buildMtgSealedWorldPlanV1(input([source])));
});
