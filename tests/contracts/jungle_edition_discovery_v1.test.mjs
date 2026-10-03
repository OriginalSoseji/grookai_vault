import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json'));
test('historical manifest cannot restore an excluded Jungle reference',()=>{
  const {jungleAwareCatalogCount}=harness().reader;
  assert.equal(jungleAwareCatalogCount('base2',83,82),82);
  assert.equal(jungleAwareCatalogCount('base2',83,147),147);
  assert.equal(jungleAwareCatalogCount('other',83,82),83);
});
function harness({error=null, exclusions=[fixture.legacy_card_print_id], ownedEdition=false}={}) {
  const calls=[];
  const parents=[fixture.legacy_card_print_id,...fixture.options.map(x=>x.card_print_id)];
  const client={rpc:async name=>{assert.equal(name,'get_jungle_edition_discovery_exclusions_v1');return {data:exclusions,error};},
    from(table){const query={select(){return query;},in(column,ids){calls.push({table,ids:Array.from(ids)});return query;},not(){return query;},eq(){return query;},is(){return query;},range(){return query;},then(resolve,reject){
      return Promise.resolve({error:null,data:table==='card_prints'?parents.map(id=>({id})):[
        ...Array.from({length:5},()=>({card_print_id:parents[0],card_printing_id:'66666666-6666-4666-8666-666666666666'})),
        ...(ownedEdition?[{card_print_id:parents[1],card_printing_id:fixture.options[0].card_printing_id}]:[]),
      ]}).then(resolve,reject);
    }};return query;}};
  const mocks={
    'server-only':{},
    '@/lib/supabase/admin':{createServerAdminClient:()=>client},
    '@/lib/supabase/publicServer':{createPublicServerClient:()=>client},
    '@/lib/publicSets.shared':{resolvePublicSetRouteCode:code=>code},
    '@/lib/publicSetExactCodes':{resolveVisiblePublicSetReferences:async()=>[{id:'set-jungle'}]},
    '@/lib/baseSetPrintRunLanes':{getBaseSetPrintRunLaneSpecialVariantKeys:()=>[]},
    '@/lib/cards/getPublicCardPrintingOptions':{getPublicCardPrintingOptions:async(_client,ids)=>{
      calls.push({table:'printing-options',ids:Array.from(ids)});
      return fixture.options.filter(o=>ids.includes(o.card_print_id)).map(o=>({id:o.card_printing_id,card_print_id:o.card_print_id}));
    }},
  };
  const cache=new Map();
  function load(file){if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
      {module,exports:module.exports,Error,Set,Map,require:name=>Object.hasOwn(mocks,name)?mocks[name]:load(path.resolve('apps/web/src',name.slice(2)+'.ts'))});return module.exports;}
  return {calls,parents,stats:load(path.resolve('apps/web/src/lib/publicSetMasterSetStats.ts')).getPublicSetMasterSetStats,
    reader:load(path.resolve('apps/web/src/lib/cards/jungleEditionResolution.ts')),client};
}
test('five legacy copies remain unclassified and do not complete either edition',async()=>{
  const h=harness();const result=await h.stats('base2','owner');
  assert.equal(result.parentPrintCount,2);assert.equal(result.variantOptionCount,2);
  assert.equal(result.ownedVariantOptionCount,0);assert.equal(result.unclassifiedOwnedCount,5);
  assert.equal(result.completionPercent,0);
  assert.deepEqual(h.calls.find(c=>c.table==='vault_item_instances').ids,h.parents);
  assert.deepEqual(h.calls.find(c=>c.table==='printing-options').ids,h.parents.slice(1));
});
test('explicit owned edition counts once; five legacy copies stay unresolved',async()=>{
  const result=await harness({ownedEdition:true}).stats('base2','owner');
  assert.equal(result.ownedVariantOptionCount,1);assert.equal(result.completionPercent,50);assert.equal(result.unclassifiedOwnedCount,5);
});
test('public checklist has two options without owner reads',async()=>{
  const h=harness();const result=await h.stats('base2',null);assert.equal(result.variantOptionCount,2);
  assert.equal(result.ownedVariantOptionCount,null);assert.ok(!h.calls.some(c=>c.table==='vault_item_instances'));
});
for(const data of [null,['bad'],[fixture.legacy_card_print_id,fixture.legacy_card_print_id]])test('malformed discovery response cannot silently become a count',async()=>{
  const h=harness({exclusions:data});await assert.rejects(h.stats('base2','owner'),/could not be checked/);
});
test('only exact missing RPC permits pre-migration compatibility',async()=>{
  const h=harness({error:{code:'PGRST202',message:'get_jungle_edition_discovery_exclusions_v1 missing'}});
  assert.equal((await h.reader.getJungleDiscoveryExclusions(h.client)).length,0);
  await assert.rejects(harness({error:{code:'57014',message:'timeout'}}).stats('base2','owner'));
});
