import test from 'node:test';
import assert from 'node:assert/strict';
import {planCollectrSealedIdentities, sealedSourceSetKey, validateSealedCatalogEvidence} from '../../supabase/functions/vault-import-collection-v2/sealed_identity.ts';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const variant = (overrides={}) => ({variantId:id(1),familyId:id(2),name:'Example Booster Box',game:'pokemon',packageForm:'booster_box',language:'en',region:null,edition:null,wave:null,identityFingerprint:'a'.repeat(64),releaseId:id(3),releaseState:'frozen',memberMappingId:id(4),mappingId:id(4),mappingVariantId:id(1),mappingStatus:'exact_reviewed',reviewDecision:'confirmed_sealed',promotionAuthorized:true,sourceName:'Example Booster Box',sourceSet:'Example',...overrides});
const catalog = (variants=[variant()]) => ({releases:[{game:'pokemon',releaseId:id(3),state:'frozen',expectedMembers:variants.filter(v=>v.memberMappingId).length}],variants});
const row = (overrides={}) => ({Category:'Pokemon',Set:'Example','Product Name':'Example Booster Box','Card Number':'',Grade:'Ungraded',Variance:'Normal',Quantity:'2',Watchlist:'false','Card Condition':'Near Mint','Average Cost Paid':'$37.50','Date Added':'2026-09-30',Notes:'Original\r\nnotes, "quoted"',...overrides});
const csv = rows => {
  const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))], q=s=>`"${s.replaceAll('"','""')}"`;
  return [headers,...rows.map(r=>headers.map(h=>r[h]??''))].map(a=>a.map(q).join(',')).join('\r\n');
};
const run=(r=row(),c=catalog())=>planCollectrSealedIdentities(csv([r]),c).rows[0];

test('full name and released exact mapping yield an identity-only result retaining every field',()=>{
  const source=row(), evidence=catalog(), before=structuredClone(evidence), p=planCollectrSealedIdentities(csv([source]),evidence);
  assert.equal(p.exactIdentityRows,1);assert.equal(p.exactIdentitySourceQuantity,2);assert.equal(p.saveEligibleCopies,0);
  assert.equal(p.rows[0].saveEligible,false);assert.equal(p.rows[0].status,'exact_identity');
  assert.deepEqual(p.rows[0].source,source);assert.deepEqual(evidence,before);
  p.rows[0].candidates[0].name='not catalog';assert.deepEqual(evidence,before);
});
test('case, whitespace and canonical NFC are formatting only',()=>{
  assert.equal(run(row({'Product Name':'  EXAMPLE   BOOSTER BOX '})).status,'exact_identity');
  assert.equal(run(row({'Product Name':'Poke\u0301mon Box'}),catalog([variant({name:'Pokémon Box',sourceName:'Pokémon Box'})])).status,'exact_identity');
});
for(const [label,change,status] of [
  ['numbered card',{'Card Number':'12'},'card_path'],['unknown game',{Category:'Riftbound'},'unsupported_game'],
  ['missing game',{Category:''},'unsupported_game'],['different game',{Category:'Magic: The Gathering'},'missing_identity'],
  ['grade',{Grade:'PSA 10'},'grade_review'],['watchlist',{Watchlist:'true'},'watchlist_review'],
  ['unknown watchlist',{Watchlist:'maybe'},'watchlist_review'],['foil',{Variance:'Foil'},'finish_review'],
  ['zero',{Quantity:'0'},'invalid_quantity'],['negative',{Quantity:'-1'},'invalid_quantity'],
  ['fraction',{Quantity:'2.5'},'invalid_quantity'],['huge',{Quantity:'50001'},'invalid_quantity'],
  ['blank name',{'Product Name':''},'missing_identity'],['blank set',{Set:''},'missing_identity'],
  ['another set',{Set:'Another'},'set_review'],['case is a different package',{'Product Name':'Example Booster Box Case'},'missing_identity'],
  ['single card missing number',{'Product Name':'Pikachu'},'missing_identity'],
  ['multi-card set',{'Product Name':'Pikachu V-Union [Set of 4]'},'missing_identity'],
  ['exclusive qualifier',{'Product Name':'Example Booster Box (Exclusive)'},'missing_identity'],
  ['artwork qualifier',{'Product Name':'Example Booster Box [Blue]'},'missing_identity'],
])test(label,()=>assert.equal(run(row(change)).status,status));

test('reviewed mapping source name is allowed only with its exact binding',()=>{
  const v=variant({sourceName:'Source Example Booster Box'});
  assert.equal(run(row({'Product Name':v.sourceName}),catalog([v])).status,'exact_identity');
  assert.throws(()=>run(row(),catalog([variant({mappingVariantId:id(8)})])),/invalid_sealed_mapping/);
});
test('catalog-only products remain unreleased',()=>{
  const v=variant({memberMappingId:null,mappingId:null,mappingVariantId:null,mappingStatus:null,reviewDecision:null,promotionAuthorized:null,sourceName:null,sourceSet:null});
  assert.equal(run(row(),catalog([v])).status,'unreleased_identity');
});
test('same name across dimensions requires review; no preferred default',()=>{
  const v2=variant({variantId:id(5),mappingVariantId:id(5),memberMappingId:id(6),mappingId:id(6),region:'US'});
  assert.equal(run(row(),catalog([variant(),v2])).status,'ambiguous_identity');
  for(const dimension of ['region','edition','wave'])assert.equal(run(row(),catalog([variant({[dimension]:'specific'})])).status,'variant_review');
});
test('explicit language never becomes an English product',()=>{
  const name='Example Booster Box (JP)',jp=variant({name,sourceName:name,language:'ja'});
  assert.equal(run(row({'Product Name':name}),catalog([jp])).status,'exact_identity');
  assert.equal(run(row({'Product Name':name}),catalog([({...jp,language:'en'})])).status,'language_review');
  assert.equal(run(row(),catalog([variant({language:'ja'})])).status,'language_review');
  assert.equal(run(row(),catalog([variant({language:null})])).status,'language_review');
  assert.equal(run(row({'Product Name':name}),catalog()).status,'missing_identity');
  const conflict='Example Booster Box (JP) (English)';
  assert.equal(run(row({'Product Name':conflict}),catalog([variant({name:conflict,sourceName:conflict})])).status,'language_review');
});
test('set aliases are explicit and game scoped, never generic prefix removal',()=>{
  assert.equal(sealedSourceSetKey('ME01: Mega Evolution','pokemon'),'mega evolution');
  assert.equal(sealedSourceSetKey('ME01: Mega Evolution','mtg'),'me01: mega evolution');
  assert.equal(sealedSourceSetKey('ME99: Mega Evolution','pokemon'),'me99: mega evolution');
  assert.equal(sealedSourceSetKey('ME01: Mega Evolution (JP)','pokemon'),'me01: mega evolution (jp)');
  assert.equal(sealedSourceSetKey('Base Set (Unlimited)','pokemon'),'base set (unlimited)');
  assert.equal(sealedSourceSetKey('Base Set (1st Edition & Shadowless)','pokemon'),'base set (1st edition & shadowless)');
  assert.equal(run(row({Set:'Mega Evolution'}),catalog([variant({sourceSet:'ME01: Mega Evolution'})])).status,'exact_identity');
  assert.equal(run(row({Set:'Silver Tempest'}),catalog([variant({sourceSet:'SWSH08: Fusion Strike'})])).status,'set_review');
});
test('a reviewed subset retains original indices, duplicates and quantities',()=>{
  const sources=[row(),row({Quantity:'3',Notes:'different'}),row({'Card Number':'1'})];
  const p=planCollectrSealedIdentities(csv(sources),catalog(),[1,0]);
  assert.equal(p.sourceRows,3);assert.equal(p.examinedRows,2);assert.equal(p.exactIdentitySourceQuantity,5);
  assert.deepEqual(p.rows.map(r=>r.sourceIndex),[0,1]);assert.deepEqual(p.rows.map(r=>r.source),sources.slice(0,2));
  for(const indices of [[0,0],[-1],[3],[0.5]])assert.throws(()=>planCollectrSealedIdentities(csv(sources),catalog(),indices),/invalid_review_indices/);
  assert.equal(planCollectrSealedIdentities(csv(sources),catalog(),[]).examinedRows,0);
});
for(const [label,mutate] of [
  ['truncated members',c=>{c.releases[0].expectedMembers=2;}],
  ['duplicate variants',c=>{c.variants.push({...c.variants[0]});c.releases[0].expectedMembers++;}],
  ['duplicate release',c=>c.releases.push({...c.releases[0]})],
  ['draft',c=>{c.releases[0].state='draft';}],
  ['changed release',c=>{c.variants[0].releaseId=id(9);}],
  ['missing mapping',c=>{c.variants[0].mappingId=null;}],
  ['wrong binding',c=>{c.variants[0].mappingVariantId=id(7);}],
  ['unreviewed mapping',c=>{c.variants[0].mappingStatus='candidate';}],
  ['nonsealed review',c=>{c.variants[0].reviewDecision='confirmed_card';}],
  ['no authority',c=>{c.variants[0].promotionAuthorized=false;}],
  ['missing group',c=>{c.variants[0].sourceSet=null;}],
  ['invalid form',c=>{c.variants[0].packageForm='single_card';}],
  ['bad fingerprint',c=>{c.variants[0].identityFingerprint='missing';}],
])test(`fail closed: ${label}`,()=>{const c=catalog();mutate(c);assert.throws(()=>validateSealedCatalogEvidence(c));});
