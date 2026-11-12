import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const source=fs.readFileSync(new URL('../../app/api/square/artwork/[gvvi]/route.ts',import.meta.url),'utf8');
function route({publicOffer=true,childAsset=false,parentBlocked=false,databaseError=false}={}){
 const reads=[];class Reply extends Response{static json(value,init){return new Reply(JSON.stringify(value),init);}}
 const detail={isVendorOffer:publicOffer,cardPrintId:'parent',cardPrintingId:'child',frontImageUrl:'https://private.invalid/owner-photo'};
 const parent={id:'parent',image_url:'https://assets.tcgdex.net/en/parent/high.webp'},child={id:'child',card_print_id:'parent',printing_gv_id:'GV-CHILD',image_url:childAsset?'https://assets.tcgdex.net/en/child/high.webp':null};
 const admin={from:table=>{const state={table,filters:[]};reads.push(state);const query={select(){return query;},eq(k,v){state.filters.push([k,v]);return query;},async maybeSingle(){return {data:table==='card_prints'?parent:child,error:databaseError?{}:null};}};return query;}};
 const mocks={'next/server':{NextResponse:Reply},'@/lib/vault/getPublicVaultInstanceByGvvi':{getPublicVaultInstanceByGvvi:async()=>detail},
  '@/lib/supabase/admin':{createServerAdminClient:()=>admin},'@/lib/canon/resolveCardImageFieldsV1':{resolveCardImageFieldsV1:async(row)=>({display_image_url:row.image_url??'https://assets.tcgdex.net/en/fallback/high.webp',display_image_kind:parentBlocked&&row.id==='parent'?'blocked':'exact'})}};
 const sandbox={exports:{},require:name=>{if(!mocks[name])throw Error('Unexpected import');return mocks[name];},Response};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return {get:()=>sandbox.exports.GET(new Request('https://example.invalid'),{params:Promise.resolve({gvvi:'GVVI-DEMO0000-000001'})}),reads};
}
test('private copies expose no artwork and never reach administrative canonical reads',async()=>{const h=route({publicOffer:false});assert.equal((await h.get()).status,404);assert.equal(h.reads.length,0);});
test('descriptors use canonical fields only and bind the child to its actual parent',async()=>{const h=route({childAsset:true}),r=await h.get(),data=await r.json();assert.equal(data.url,'https://assets.tcgdex.net/en/child/high.webp');assert.equal(data.kind,'exact');assert.equal(data.printingId,'child');assert.equal(JSON.stringify(data).includes('owner-photo'),false);assert.deepEqual(h.reads[1].filters,[['id','child'],['card_print_id','parent']]);});
test('a child without its own asset cannot upgrade a parent fallback to exact artwork',async()=>{const data=await (await route().get()).json();assert.equal(data.kind,'representative');assert.equal(data.url,'https://assets.tcgdex.net/en/parent/high.webp');});
test('blocked canon is withheld; read outages remain retriable failures rather than missing-image success',async()=>{assert.equal((await route({parentBlocked:true}).get()).status,404);assert.equal((await route({databaseError:true}).get()).status,503);});
