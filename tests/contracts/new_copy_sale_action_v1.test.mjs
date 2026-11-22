import fs from 'node:fs';import assert from 'node:assert/strict';import test from 'node:test';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(new URL('../../apps/web/src/lib/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const pricing={exports:{}};vm.runInNewContext(compile('vaultInstancePricing.ts'),{module:pricing,exports:pricing.exports,Number,Math,String,Intl});
function fixture({actor='owner',rowOwner='owner',archived=false,focusStatus='ready'}={}){
 const state={id:'copy-1',user_id:rowOwner,archived_at:archived?'2026-11-01':null,gv_vi_id:'GVVI-test',intent:'hold',asking_price_note:'Current note from another device'},writes=[],notifications=[];
 const query=()=>{const filters=[];let patch;const builder={select(){return builder;},eq(key,value){filters.push([key,value]);return builder;},is(key,value){filters.push([key,value]);return builder;},update(value){patch=value;return builder;},async maybeSingle(){if(!filters.every(([key,value])=>state[key]===value))return{data:null,error:null};if(patch){writes.push({patch:JSON.parse(JSON.stringify(patch)),filters});Object.assign(state,patch);}return{data:{...state},error:null};}};return builder;};
 const client={auth:{getUser:async()=>({data:{user:actor?{id:actor}:null}})},from:query};
 const dependencies={
  'next/cache':{revalidatePath(){}},
  '@/lib/supabase/server':{createServerComponentClient:async()=>client},
  '@/lib/vaultInstancePricing':pricing.exports,
  '@/lib/contracts/execute_owner_write_v1':{executeOwnerWriteV1:async({write})=>write({adminClient:client,setMetadata(){}})},
  '@/lib/contracts/owner_write_proofs_v1':{createVaultInstancePricingProofV1:()=>()=>{}},
  '@/lib/contracts/ownershipMutationGuards':{assertVaultIntentProof:async input=>{assert.equal(input.userId,actor);assert.equal(input.instanceId,state.id);assert.equal(state.intent,input.expectedIntent);}},
  '@/lib/square/notifyOfferSaved':{notifySquareOfferSaved:async(...args)=>{notifications.push(args);return focusStatus;}},
 };
 const module={exports:{}};vm.runInNewContext(compile('vault/saveVaultItemInstancePricingAction.ts'),{module,exports:module.exports,require:name=>{assert.ok(name in dependencies,name);return dependencies[name];},Number,String,Math});
 return{call:module.exports.saveVaultItemInstancePricingAction,state,writes,notifications};
}
const sale={instanceId:'copy-1',pricingMode:'asking',askingPriceAmount:'2.00',askingPriceCurrency:'USD',askingPriceNote:'Keep this note',publishForSale:true};
test('explicit sale saves intent and exact USD price together for the authenticated copy, then awaits its Square result',async()=>{
 const f=fixture();const result=await f.call(sale);assert.equal(result.ok,true);assert.equal(result.squareStatus,'ready');assert.equal(f.writes.length,1);assert.deepEqual(f.writes[0].patch,{pricing_mode:'asking',asking_price_amount:2,asking_price_currency:'USD',intent:'sell'});assert.equal(result.askingPriceNote,'Current note from another device');assert.deepEqual(JSON.parse(JSON.stringify(f.notifications)),[['owner','copy-1',{waitForResult:true}]]);
});
test('ordinary pricing never publishes a private copy',async()=>{
 const f=fixture();assert.equal((await f.call({...sale,publishForSale:false})).ok,true);assert.equal(f.state.intent,'hold');assert.ok(!Object.hasOwn(f.writes[0].patch,'intent'));assert.equal(f.notifications[0][2].waitForResult,false);
});
test('forged sale flags, unsupported currencies, invalid amounts and silent rounding are rejected before writing',async()=>{
 for(const change of [{publishForSale:'true'},{pricingMode:'market'},{askingPriceCurrency:'EUR'},{askingPriceAmount:'0'},{askingPriceAmount:'-2'},{askingPriceAmount:'2.001'},{askingPriceAmount:'1e2'},{askingPriceAmount:NaN}]){
  const f=fixture();assert.equal((await f.call({...sale,...change})).ok,false,JSON.stringify(change));assert.equal(f.writes.length,0);assert.equal(f.notifications.length,0);
 }
});
test('foreign, archived, missing and signed-out copies cannot be published',async()=>{
 for(const config of [{rowOwner:'someone-else'},{archived:true},{actor:null}]){const f=fixture(config);assert.equal((await f.call(sale)).ok,false);assert.equal(f.writes.length,0);assert.equal(f.notifications.length,0);}
 const f=fixture();assert.equal((await f.call({...sale,instanceId:'missing-copy'})).ok,false);assert.equal(f.writes.length,0);
});
test('a pending Square result retains the successful sale save without inventing readiness',async()=>{
 const f=fixture({focusStatus:'pending'});const result=await f.call(sale);assert.equal(result.ok,true);assert.equal(result.squareStatus,'pending');assert.equal(f.state.intent,'sell');
});
test('retry updates the same copy without an inventory creation path',async()=>{
 const f=fixture();await f.call(sale);await f.call(sale);assert.equal(f.state.id,'copy-1');assert.equal(f.writes.length,2);assert.deepEqual(f.writes[0].patch,f.writes[1].patch);
});
