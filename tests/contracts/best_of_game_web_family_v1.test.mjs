import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
const facts=JSON.parse(fs.readFileSync('docs/catalog/best_of_game_discovery_v1/classification.json'));

function harness({authority=true}={}) {
  const canonicalSet=facts.pairs[0].canonical.set_id,legacySet=facts.pairs[0].legacy.set_id;
  const raw=[...facts.pairs.flatMap(p=>[p.legacy,p.canonical]),...facts.protectedWinnerParents].map((p,i)=>({
    ...p,name:'Retained card '+i,number:String(i+1),number_plain:String(i+1),sets:{identity_model:'standard'},
  }));
  const winners=new Set(facts.protectedWinnerParents.map(p=>p.id));
  const view=raw.map(row=>authority&&winners.has(row.id)?{...row,set_id:canonicalSet,set_code:'bp'}:row);
  const calls=[];
  const client={
    async rpc(name,args){assert.equal(name,'resolve_visible_set_references_v1');calls.push({rpc:name,args});
      if(args.game_code_in!=='pokemon')return {data:[],error:null};
      return {data:[authority||args.code_in==='bp'?{id:canonicalSet,code:'bp'}:{id:legacySet,code:'bog'}],error:null};},
    from(table){calls.push({table});let rows=table==='card_prints'?raw:table==='v_card_prints_set_family_discovery_v1'?view:table==='sets'?[
      {id:canonicalSet,code:'bp',name:'Best of Game',game:'pokemon'},{id:legacySet,code:'bog',name:'Best of Game',game:'pokemon'},
    ]:null;assert(rows,'Unexpected/private table '+table);rows=[...rows];let head=false,cap=Infinity;
      const query={select(_columns,options={}){head=Boolean(options.head);return query;},
        in(column,ids){calls.push({table,column,ids:[...ids]});rows=rows.filter(row=>ids.includes(row[column]));return query;},
        not(column,operator,value){assert.equal(operator,'is');assert.equal(value,null);rows=rows.filter(row=>row[column]!=null);return query;},
        eq(column,value){rows=rows.filter(row=>row[column]===value);return query;},
        gt(column,value){rows=rows.filter(row=>row[column]>value);return query;},
        order(column){rows.sort((a,b)=>String(a[column]).localeCompare(String(b[column])));return query;},
        limit(n){cap=n;return query;},range(start,end){rows=rows.slice(start,end+1);return query;},
        then(resolve,reject){return Promise.resolve({data:head?null:rows.slice(0,cap),count:rows.length,error:null}).then(resolve,reject);},
      };return query;},
  };
  const printings=facts.pairs.flatMap(p=>[
    {id:p.retainedCanonicalChild.id,card_print_id:p.canonical.id,printing_gv_id:p.retainedCanonicalChild.printing_gv_id,finish_key:'normal',finish_label:'Normal'},
    {id:p.retainedLegacyChild.id,card_print_id:p.legacy.id,printing_gv_id:p.retainedLegacyChild.printing_gv_id,finish_key:'normal',finish_label:'Normal'},
  ]);
  const mocks={
    'server-only':{},react:{cache:fn=>fn},
    '@/lib/supabase/server':{createServerComponentClient:async()=>client},
    '@/lib/supabase/publicServer':{createPublicServerClient:()=>client},
    '@/lib/supabase/admin':{createServerAdminClient:()=>{throw Error('Public family reads must not use admin credentials');}},
    '@/lib/publicSets.shared':{resolvePublicSetRouteCode:code=>code.trim().toLowerCase(),normalizePublicSetDisplayName:x=>x,normalizeSetQuery:x=>x,tokenizeSetWords:x=>x.split(' ')},
    '@/lib/catalogPresentation':{getCatalogSetPresentation:row=>row},
    '@/lib/publicSetCanonicalization':{choosePreferredEquivalentSetRow:(a)=>a},
    '@/lib/canon/resolveCardImageFieldsV1':{resolveCardImageFieldsV1:async()=>({})},
    '@/lib/cards/displayDiscriminator':{getCardPrintingFinishLabel:row=>row.finishLabel},
    '@/lib/cards/jungleEditionResolution':{getJungleDiscoveryExclusions:async()=>[]},
    '@/lib/baseSetPrintRunLanes':{getBaseSetPrintRunLaneSpecialVariantKeys:()=>[],getBaseSetPrintRunLanePrintedIdentityModifier:()=>null,getBaseSetPrintRunLaneCardCountAdjustment:()=>0},
    '@/lib/cards/getPublicCardPrintingOptions':{
      getPublicCardPrintingOptions:async(_client,ids)=>printings.filter(p=>ids.includes(p.card_print_id)),
      groupPublicCardPrintingOptionsByCardPrintId:rows=>{const result=new Map();for(const row of rows)result.set(row.card_print_id,[...(result.get(row.card_print_id)??[]),row]);return result;},
    },
  };
  const modules=new Map();
  function load(file){if(modules.has(file))return modules.get(file).exports;const module={exports:{}};modules.set(file,module);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,
      {module,exports:module.exports,Map,Set,Date,Promise,console,require:specifier=>{
        if(Object.hasOwn(mocks,specifier))return mocks[specifier];
        const target=specifier.startsWith('@/')?path.resolve('apps/web/src',specifier.slice(2)):specifier.startsWith('.')?path.resolve(path.dirname(file),specifier):null;
        assert(target,'Unmocked external dependency '+specifier);return target.endsWith('.json')?require(target):load(target+'.ts');
      }});return module.exports;}
  return {calls,raw,cards:load(path.resolve('apps/web/src/lib/publicSets.ts')),stats:load(path.resolve('apps/web/src/lib/publicSetMasterSetStats.ts')).getPublicSetMasterSetStats};
}

for(const code of ['bog','bp'])test(code+' website keeps all thirteen parents and four childless Winners',async()=>{
  const h=harness(),cards=await h.cards.getPublicSetCards(code,0,36,'pokemon');
  assert.deepEqual(cards.map(x=>x.gv_id).sort(),[...facts.pairs.map(p=>p.canonical.gv_id),...facts.protectedWinnerParents.map(p=>p.gv_id)].sort());
  assert.equal(cards.length,13);assert.equal(cards.reduce((n,row)=>n+row.printings.length,0),9);
  for(const winner of facts.protectedWinnerParents){const card=cards.find(row=>row.id===winner.id);assert(card);assert.equal(card.variant_key,winner.variant_key);assert.equal(card.printings.length,0);assert.equal(h.raw.find(row=>row.id===winner.id).set_code,'bog');}
  const detail=await h.cards.getPublicSetByCode(code,'pokemon');assert.equal(detail.card_count,13);
  const stats=await h.stats(code,null,undefined,'pokemon');assert.equal(stats.parentPrintCount,13);assert.equal(stats.variantOptionCount,13);assert.equal(stats.ownedVariantOptionCount,null);
  assert.equal((await h.cards.getPublicSetCards(code,13,36,'pokemon')).length,0);
  assert(h.calls.some(x=>x.table==='v_card_prints_set_family_discovery_v1'));
});

test('missing family authority preserves both raw sets instead of importing Winners into bp',async()=>{
  const h=harness({authority:false});const canonical=await h.cards.getPublicSetCards('bp',0,36,'pokemon'),legacy=await h.cards.getPublicSetCards('bog',0,36,'pokemon');
  assert.equal(canonical.length,9);assert.equal(legacy.length,13);
  assert.deepEqual(canonical.map(row=>row.gv_id).sort(),facts.pairs.map(p=>p.canonical.gv_id).sort());
  assert.deepEqual(legacy.map(row=>row.gv_id).sort(),[...facts.pairs.map(p=>p.legacy.gv_id),...facts.protectedWinnerParents.map(p=>p.gv_id)].sort());
});

test('wrong-game routes cannot reach parent metadata or printing options',async()=>{
  const h=harness();assert.equal((await h.cards.getPublicSetCards('bp',0,36,'mtg')).length,0);assert.equal(await h.cards.getPublicSetByCode('bp','mtg'),null);assert.equal((await h.stats('bp',null,undefined,'mtg')).parentPrintCount,0);assert.equal(h.calls.some(x=>x.table),false);
});
