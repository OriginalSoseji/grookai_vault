import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript');
const source=fs.readFileSync(new URL('../../apps/web/src/lib/vault/getOwnerVaultItems.ts',import.meta.url),'utf8');
const row={id:'card:fixture',vault_item_id:'bucket',gv_vi_id:'copy-id',card_id:'card-id',gv_id:'GV-PK-FIXTURE',name:'Owned card',set_code:'fixture',set_name:'Fixture',number:'1',condition_label:'NM',intent:'hold',owned_count:2,raw_count:2,slab_count:0,slab_items:[],copy_items:[],priced_raw_copy_count:0,unpriced_raw_copy_count:2};
function load(profileMode, inventoryFailure=false){
 const module={exports:{}};
 const query={select(){return this;},eq(){return this;},abortSignal(signal){assert.ok(signal instanceof AbortSignal);return this;},maybeSingle(){if(profileMode==='throws')return Promise.reject(new Error('offline profile'));return Promise.resolve(profileMode==='error'?{data:null,error:{message:'profile unavailable'}}:{data:null,error:null});}};
 const imports={
  'server-only':{},
  '@/lib/network/intent':{normalizeVaultIntent:value=>value},
  '@/lib/network/getOwnedCardMessageSummaries':{getOwnedCardMessageSummaries:async()=>[]},
  '@/lib/publicCardImage':{resolveDisplayImageUrl:()=>null},
  '@/lib/supabase/server':{createServerComponentClient:async()=>({from(table){assert.equal(table,'public_profiles');return query;}})},
  '@/lib/vault/getCanonicalVaultCollectorRows':{getCanonicalVaultCollectorRows:async()=>{if(inventoryFailure)throw new Error('inventory unavailable');return[row];}},
 };
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Map,Set,Date,Number,Error,AbortSignal,console,require:name=>{assert.ok(name in imports,name);return imports[name];}});
 return module.exports;
}
for(const mode of ['missing','error','throws'])test(`private inventory remains readable when public profile is ${mode}`,async()=>{
 const result=await load(mode).getOwnerVaultItems('owner');
 assert.equal(result.itemsError,null);assert.equal(result.items.length,1);assert.equal(result.items[0].owned_count,2);assert.equal(result.publicProfileHref,null);assert.equal(result.publicCollectionHref,null);
});
test('actual inventory failures remain explicit',async()=>{
 const result=await load('missing',true).getOwnerVaultItems('owner');assert.equal(result.itemsError,'inventory unavailable');assert.equal(result.items.length,0);
});
