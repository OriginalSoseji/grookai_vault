import test from 'node:test';
import assert from 'node:assert/strict';
import {planCollectrSealedIdentities} from '../../supabase/functions/vault-import-collection-v2/sealed_identity.ts';
import {resolveSealedTargets} from '../../supabase/functions/vault-import-collection-v2/sealed_targets.ts';
import {combineSealedPreview} from '../../apps/web/src/lib/import/collectionPreviewV3.ts';
import {createImportHandlerV3} from '../../supabase/functions/vault-import-collection-v2/handler_v3.ts';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const cases=[
  ['mtg','Universes Beyond: FINAL FANTASY','Universes Beyond: FINAL FANTASY - Collector Booster Display','FINAL FANTASY - Collector Booster Display','display'],
  ['mtg','Universes Beyond: FINAL FANTASY','Universes Beyond: FINAL FANTASY - Gift Bundle','FINAL FANTASY - Gift Bundle','bundle'],
  ['mtg','Universes Beyond: FINAL FANTASY','Universes Beyond: FINAL FANTASY - Starter Kit','FINAL FANTASY - Starter Kit','kit'],
  ['pokemon','Prismatic Evolutions','Prismatic Evolutions Super Premium Collection','Prismatic Evolutions Super-Premium Collection','collection'],
  ['pokemon','Temporal Forces','Temporal Forces Elite Trainer Box [Iron Leaves]','Temporal Forces Elite Trainer Box [Iron Leaves ex]','kit','SV05: Temporal Forces'],
  ['pokemon','Miscellaneous Cards & Products','Blooming Waters Premium Collection','Blooming Waters Premium Collection','collection','SV: Scarlet & Violet 151'],
  ['pokemon','Silver Tempest','League Battle Deck [Mew VMAX]','League Battle Deck [Mew VMAX]','deck','SWSH08: Fusion Strike'],
];
function fixture([game,set,source,name,packageForm,sourceSet]) {
  const row={Category:game,Set:set,'Product Name':source,'Card Number':'',Quantity:'2',Grade:'Ungraded',Variance:'Normal',Watchlist:'false','Average Cost Paid':'34.9900',Notes:'original notes','Portfolio Name':'Example'};
  const variant={variantId:id(1),familyId:id(2),name,game,packageForm,language:'en',region:null,edition:null,wave:null,identityFingerprint:'a'.repeat(64),releaseId:id(3),releaseState:'frozen',memberMappingId:id(4),mappingId:id(4),mappingVariantId:id(1),mappingStatus:'exact_reviewed',reviewDecision:'confirmed_sealed',promotionAuthorized:true,sourceName:name,sourceSet:game==='mtg'?'FINAL FANTASY':'SV: Prismatic Evolutions'};
  if (sourceSet) variant.sourceSet=sourceSet;
  const catalog={releases:[{game,releaseId:id(3),state:'frozen',expectedMembers:1}],variants:[variant]};
  return {row,variant,catalog};
}
const csv=row=>[Object.keys(row),Object.values(row)].map(values=>values.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
const planned=f=>planCollectrSealedIdentities(csv(f.row),f.catalog).rows[0];
const selected=[{sourceIndices:[0],sealedVariantId:id(1)}];

for(const entry of cases) {
  test('full label resolves through website and server without changing source: '+entry[2],async()=>{
    const f=fixture(entry),before=structuredClone(f),csvText=csv(f.row),p=planned(f);
    assert.equal(p.status,'exact_identity');assert.deepEqual(p.source,f.row);assert.equal(p.saveEligible,false);
    const cards={ownerId:id(51),sourceRows:1,readyRows:0,readyCopies:0,reviewRows:1,rows:[{sourceIndices:[0],source:f.row,sourceRecords:[f.row],quantity:null,reason:'review',selection:null,matchedName:null,finish:null}]};
    const preview=combineSealedPreview(cards,csvText,f.catalog,true,'USD');
    assert.equal(preview.readyCopies,2);assert.equal(preview.reviewRows,0);
    assert.deepEqual(preview.rows[0].sealedSelection,selected[0]);assert.deepEqual(preview.rows[0].source,f.row);
    const targets=resolveSealedTargets(csvText,f.catalog,selected,'USD');
    assert.equal(targets[0].acquisitionCost,34.99);assert.equal(targets[0].acquisitionCurrency,'USD');
    assert.equal(targets[0].sealState,'unknown');assert.equal(targets[0].packageCondition,'unknown');
    let saved;const calls=[];
    const handler=createImportHandlerV3({requireUser:async()=>({userId:id(51),sb:{rpc:async name=>{calls.push(name);return{data:name==='get_collection_import_receipt_v3'?null:f.catalog,error:null};}}}),createServiceRoleClient:()=>({rpc:async(name,args)=>{
      calls.push(name);saved=args;return{error:null,data:{success:true,version:3,requestId:args.p_request_id,sourceSha256:args.p_source_sha256,sourceRows:1,reviewRows:0,importedCards:0,importedSealed:2,importedEntries:1,targets:[],sealedTargets:[{objectKind:'sealed',...selected[0],instanceIds:[id(60),id(61)]}]}};
    }})});
    const response=await handler(new Request('http://local.test/import',{method:'POST',body:JSON.stringify({ownerUserId:id(51),requestId:id(50),csvText,targets:[],sealedTargets:selected,sealedAcquisitionCurrency:'USD'})}));
    assert.equal(response.status,200);assert.deepEqual(saved.p_source_rows,[f.row]);assert.deepEqual(saved.p_sealed_targets,targets);
    assert.deepEqual(calls,['get_collection_import_receipt_v3','get_collection_import_sealed_catalog_v3','admin_import_vault_collection_v3']);
    assert.deepEqual(f,before);
    assert.equal(combineSealedPreview(cards,csvText,f.catalog,false,'USD').readyCopies,0);
    assert.equal(combineSealedPreview(cards,csvText,f.catalog,true,null).readyCopies,0);
    assert.equal(resolveSealedTargets(csv({...f.row,'Average Cost Paid':'4.9980'}),f.catalog,selected,'USD')[0].acquisitionCost,4.998);
    assert.throws(()=>resolveSealedTargets(csv({...f.row,'Average Cost Paid':'4.99801'}),f.catalog,selected,'USD'),/invalid_import_cost/);
  });
  test('extra qualifiers, wrong sets and wrong games remain held: '+entry[2],()=>{
    for(const suffix of [' Case',' Master Case',' (Japanese)',' (JP)',' (Retail)',' (Exclusive)',' [Set of 4]',' (Collector\'s Edition)']) {
      const f=fixture(entry);f.row['Product Name']+=suffix;assert.equal(planned(f).status,'missing_identity');
      assert.throws(()=>resolveSealedTargets(csv(f.row),f.catalog,selected,'USD'),/identity_requires_review/);
    }
    const scopeOnly=entry[2]===entry[3];
    const wrongSet=fixture(entry);wrongSet.row.Set='Another set';assert.equal(planned(wrongSet).status,scopeOnly?'set_review':'missing_identity');
    const wrongGame=fixture(entry);wrongGame.row.Category=entry[0]==='mtg'?'Pokemon':'mtg';assert.equal(planned(wrongGame).status,'missing_identity');
    const wrongForm=fixture(entry);wrongForm.variant.packageForm='case';assert.equal(planned(wrongForm).status,scopeOnly?'set_review':'missing_identity');
    const wrongLanguage=fixture(entry);wrongLanguage.variant.language='ja';assert.equal(planned(wrongLanguage).status,'language_review');
    const wrongCatalogSet=fixture(entry);wrongCatalogSet.variant.sourceSet='Another set';assert.equal(planned(wrongCatalogSet).status,'set_review');
    for(const dimension of ['region','edition','wave']) {const f=fixture(entry);f.variant[dimension]='special';assert.equal(planned(f).status,'variant_review');}
  });
}

test('alias does not hide exact-name ambiguity or prefer a release',()=>{
  const f=fixture(cases[0]);
  f.catalog.variants.push({...f.variant,variantId:id(5),mappingId:id(6),memberMappingId:id(6),mappingVariantId:id(5),name:f.row['Product Name'],sourceName:f.row['Product Name']});
  f.catalog.releases[0].expectedMembers=2;assert.equal(planned(f).status,'ambiguous_identity');
  assert.throws(()=>resolveSealedTargets(csv(f.row),f.catalog,selected,'USD'),/identity_requires_review/);
});
test('unreleased alias stays unreleased; invalid mapping fails the complete plan',()=>{
  const f=fixture(cases[0]);f.catalog.releases[0].expectedMembers=0;
  for(const k of ['memberMappingId','mappingId','mappingVariantId','mappingStatus','reviewDecision','promotionAuthorized','sourceName','sourceSet'])f.variant[k]=null;
  assert.equal(planned(f).status,'unreleased_identity');
  const invalid=fixture(cases[0]);invalid.variant.reviewDecision='pending';assert.throws(()=>planned(invalid),/invalid_sealed_mapping/);
});
test('aliases do not rewrite other product names or broaden punctuation matching',()=>{
  const f=fixture(cases[0]);f.row['Product Name']='Universes Beyond: FINAL FANTASY - Play Booster Display';
  f.variant.name=f.variant.sourceName='FINAL FANTASY - Play Booster Display';assert.equal(planned(f).status,'missing_identity');
  const p=fixture(cases[3]);p.row['Product Name']='Prismatic Evolutions SuperPremium Collection';assert.equal(planned(p).status,'missing_identity');
});

for (const entry of cases.slice(5)) {
  test('product scope exceptions retain mapping, release and ambiguity gates: '+entry[2],()=>{
    const missing=fixture(entry);missing.catalog.releases[0].expectedMembers=0;
    for(const k of ['memberMappingId','mappingId','mappingVariantId','mappingStatus','reviewDecision','promotionAuthorized','sourceName','sourceSet'])missing.variant[k]=null;
    assert.equal(planned(missing).status,'unreleased_identity');
    const duplicate=fixture(entry);duplicate.catalog.variants.push({...duplicate.variant,variantId:id(5),mappingId:id(6),memberMappingId:id(6),mappingVariantId:id(5),sourceSet:entry[1]});duplicate.catalog.releases[0].expectedMembers=2;
    assert.equal(planned(duplicate).status,'ambiguous_identity');
    assert.throws(()=>resolveSealedTargets(csv(duplicate.row),duplicate.catalog,selected,'USD'),/identity_requires_review/);
    for(const field of ['name','sourceName']) {const other=fixture(entry);other.variant[field]='Different product';other.variant[field==='name'?'sourceName':'name']='Different product';assert.equal(planned(other).status,'missing_identity');}
    const group=fixture(entry);group.variant.sourceSet=entry[5]+' (Japanese)';assert.equal(planned(group).status,'set_review');
  });
}

test('product scope exceptions do not transfer between products or erase ETB artwork',()=>{
  const bloom=fixture(cases[5]);bloom.row['Product Name']=bloom.variant.name=bloom.variant.sourceName='151: Alakazam ex Collection';assert.equal(planned(bloom).status,'set_review');
  const mew=fixture(cases[6]);mew.row['Product Name']=mew.variant.name=mew.variant.sourceName='League Battle Deck [Inteleon VMAX]';assert.equal(planned(mew).status,'set_review');
  for(const label of ['Temporal Forces Elite Trainer Box','Temporal Forces Elite Trainer Box [Walking Wake]','Temporal Forces Pokemon Center Elite Trainer Box (Exclusive) [Iron Leaves]']) {const f=fixture(cases[4]);f.row['Product Name']=label;assert.equal(planned(f).status,'missing_identity');}
});
