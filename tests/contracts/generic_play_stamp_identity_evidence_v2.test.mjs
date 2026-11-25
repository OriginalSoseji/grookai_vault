import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {genericPlayStampEvidenceRegistryV2 as registry,verifyGenericPlayStampSourceBytesV2 as verify,
  capturedGenericPlayStampEvidenceInputV2 as fixture,adjudicateGenericPlayStampEvidenceV2 as decide}
  from '../../backend/identity/generic_play_stamp_identity_evidence_v2.mjs';
const r=registry();
const originalBytes=file=>fs.readFileSync(new URL('../../docs/catalog/generic_play_stamp_identity_evidence_v2/'+file,import.meta.url));
test('all nine exact original stamped image/checklist bundles verify without writes',()=>{
 assert.equal(verify().source_files,14);for(const t of r.targets){const input=fixture(t.product_id),before=structuredClone(input),result=decide(input);assert.equal(result.status,'NEW_CANONICAL_REQUIRED');assert.equal(result.proposed_action,'CREATE_CARD_PRINT');assert.equal(result.canonical_tuple.base_card_print_id,t.base.id);assert.equal(result.canonical_tuple.canonical_number,t.base.number);assert.equal(result.canonical_tuple.variant_key,'play_pokemon_stamp');assert.equal(result.card_printings_action,'NONE');assert.equal(result.production_authority,false);assert.equal(result.hold_cleared,false);assert.deepEqual(input,before);}
});
test('known repeated distribution series never split printed identity or invent completion',()=>{
 const repeated=r.targets.filter(t=>t.known_series_evidence.length>1);assert.equal(repeated.length,3);for(const t of repeated){const result=decide(fixture(t.product_id));assert.equal(result.status,'NEW_CANONICAL_REQUIRED');assert.equal(result.series_creates_separate_identity,false);assert.equal(result.all_series_membership_claimed_complete,false);assert.equal(result.canonical_tuple.name,t.base.name);assert.equal(result.canonical_tuple.set_code,t.base.set_code);}
});
test('missing source and changed image bytes cannot establish identity',()=>{
 for(const t of r.targets){assert.equal(decide(fixture(t.product_id),{readBytes(file){if(file===t.image_file)throw Error('missing image');return originalBytes(file);}}).status,'HOLD');assert.equal(decide(fixture(t.product_id),{readBytes(file){return file===t.image_file?Buffer.from('unrelated image bytes'):originalBytes(file);}}).status,'HOLD');}
});
test('changed metadata and original official checklist bytes are checked independently',()=>{
 for(const changed of['index.json','review.json','sources/series6.original.pdf','sources/series7.original.pdf','sources/series8.original.pdf','sources/series9.original.pdf','sources/series6.independent.json']){const x=fixture(r.targets[0].product_id);assert.equal(decide(x,{readBytes(file){return file===changed?Buffer.from('changed original evidence'):originalBytes(file);}}).status,'HOLD');}
});
test('changed base, active identity, alias and printed observation fail closed',()=>{
 const mutations=[x=>{x.base.id='00000000-0000-4000-8000-000000000000';},x=>{x.base.number='999';},x=>{x.base.variant_key='prize_pack_stamp';},x=>{x.active_base_identities=[];},x=>{x.active_base_identities[0].is_active=false;},x=>{x.active_base_identities[0].identity_key_hash='wrong';},x=>{delete x.approved_base_aliases;},x=>{x.approved_base_aliases.push({active:true,authority_status:'guessed'});},x=>{delete x.existing_generic_stamp_parent_ids;},x=>{x.observation.play_stamp_observed=false;},x=>{x.observation.explicit_series_marker_observed=true;},x=>{x.observation.more_specific_printed_stamp_observed=true;},x=>{x.observation.printed_name='Other card';},x=>{x.observation.printed_number='999/999';},x=>{x.observation.printed_set_mark='SHF';},x=>{x.observation.image_sha256='0'.repeat(64);}];
 for(const t of r.targets)for(const mutate of mutations){const x=fixture(t.product_id);mutate(x);assert.equal(decide(x).status,'HOLD');}
});
test('an existing generic stamped parent requires reconciliation instead of a duplicate',()=>{
 for(const t of r.targets){const x=fixture(t.product_id);x.existing_generic_stamp_parent_ids=['00000000-0000-4000-8000-000000000000'];const result=decide(x);assert.equal(result.status,'EXISTING_CANONICAL_REQUIRES_RECONCILIATION');assert.equal(result.proposed_action,undefined);assert.equal(result.hold_cleared,false);}
});
test('four existing facts, other products and old held programmes cannot enter the nine-target model',()=>{
 for(const product of[...r.excluded_existing_products,1,999999999]){const result=decide({product_id:product,market_price:999999,source_family:'prize-pack-series-cards-pokemon'});assert.equal(result.status,'OUT_OF_SCOPE');assert.equal(result.production_authority,false);assert.equal(result.hold_cleared,false);}assert.equal(r.old98_and32_programmes_remain_held,true);assert.equal(r.original149_never_repeat,true);
});
test('the approved Night Stretcher base alias is exact and never supplies inherited finishes',()=>{
 const t=r.targets.find(t=>t.printed_name==='Night Stretcher');assert.equal(t.approved_base_aliases.length,1);const x=fixture(t.product_id);assert.equal(decide(x).canonical_tuple.canonical_number,t.base.number);x.approved_base_aliases[0].authority_status='unreviewed';assert.equal(decide(x).status,'HOLD');assert.equal(decide(fixture(t.product_id)).card_printings_action,'NONE');
});
