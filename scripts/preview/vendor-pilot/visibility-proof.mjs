import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {out,verified,query} from './ops.mjs';
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url)),{createServerClient}=require('@supabase/ssr');
const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');
const site=process.argv[2];assert.match(site??'',/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/);
const origin='https://grookai-vendor-preview.vercel.app',accounts=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json'))),key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='anon').api_key;
const auths=await Promise.all(accounts.map(async a=>{const jar=new Map(),client=createServerClient(`https://${p.id}.supabase.co`,key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))}});assert.equal((await client.auth.signInWithPassword(a)).error,null);return{client,jar};}));
const [owner,expired,other]=auths;
async function request(route,{auth=owner,body,requestOrigin=origin}={}){const r=await fetch(site+route,{method:body?'POST':'GET',headers:{...(auth?{cookie:[...auth.jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...(body?{Origin:requestOrigin,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});const text=await r.text();let data;try{data=JSON.parse(text);}catch{}console.log((body?'POST ':'GET ')+route+' '+r.status);return{status:r.status,data,text,headers:r.headers};}
const passes=[];const pass=name=>{passes.push(name);fs.writeFileSync(path.join(out,'visibility-proof.json'),JSON.stringify({at:new Date().toISOString(),site,target:p.id,passed:passes},null,2));console.log('PASS '+name);};
const ids=JSON.parse(fs.readFileSync(path.join(out,'preorders-fixture.private.json'))).ids;
const ownerRoute='/api/stores/owner';const before=(await request(ownerRoute)).data,profile=before.profile;assert.ok(profile?.slug);assert.equal(before.capabilities.store_web,true);assert.equal(before.store.web_published,false);
const visibility={action:'visibility',slug:profile.slug,display_name:profile.display_name,public_profile_enabled:true,vault_sharing_enabled:true};
assert.equal((await request(ownerRoute,{auth:null,body:visibility})).status,401);
assert.equal((await request(ownerRoute,{auth:expired,body:visibility})).status,403);
assert.equal((await request(ownerRoute,{body:visibility,requestOrigin:'https://invalid.example'})).status,403);
assert.equal((await request(ownerRoute,{body:{...visibility,public_profile_enabled:'true'}})).status,400);
const fixture=JSON.parse(fs.readFileSync(path.join(out,'inventory-proof-fixture.private.json'))),inventoryRoute='/api/stores/owner/inventory';
const settings={action:'save',id:fixture.copy.id,condition:'LP',intent:'sell',mode:'asking',amount:'27.50',currency:'USD',selected:true,sections:[]};
try{
 let r=await request(ownerRoute,{body:visibility});assert.equal(r.status,200,r.text);
 let state=(await request(ownerRoute)).data;assert.equal(state.profile.public_profile_enabled,true);assert.equal(state.profile.vault_sharing_enabled,true);assert.equal(state.store.web_published,false);assert.equal(state.store.app_published,false);
 assert.equal((await request('/api/stores/'+state.store.slug,{auth:null})).status,404);
 pass('profile and Vault sharing save in the workspace; no store publication is implied by privacy changes');
 assert.equal((await request(inventoryRoute,{body:settings})).status,200);
 r=await request(ownerRoute,{body:{action:'publish',surface:'web',publish:true}});assert.equal(r.status,200,r.text);
 r=await request('/api/stores/'+state.store.slug,{auth:null});assert.equal(r.status,200,r.text);assert.ok(r.data.items.some(i=>i.id===fixture.copy.id));assert.ok(!r.data.items.some(i=>ids.includes(i.id)));assert.match(r.headers.get('cache-control'),/no-store/);
 assert.equal((await request(ownerRoute,{body:{...visibility,public_profile_enabled:false,vault_sharing_enabled:false}})).status,200);
 assert.equal((await request('/api/stores/'+state.store.slug,{auth:null})).status,404);
 pass('explicit web publication exposes only selected eligible inventory; private preorder drafts stay absent; disabling profile immediately hides the public store');
}finally{
 assert.equal((await request(ownerRoute,{body:{action:'publish',surface:'web',publish:false}})).status,200);
 assert.equal((await request(inventoryRoute,{body:{...settings,intent:'hold',selected:false}})).status,200);
 assert.equal((await request(ownerRoute,{body:{action:'visibility',...profile}})).status,200);
}
for(const [path,body] of [['/api/vendor-billing/owner',{action:'checkout',plan:'store_web'}],['/api/vendor-payments/owner',{action:'onboarding'}],['/api/vendor-orders/checkout',{orderId:accounts[0].id}]])assert.equal((await request(path,{body})).status,503);
const counts=(await query('select (select count(*) from vendor_orders)::int as orders,(select count(*) from vendor_billing_accounts)::int as billing,(select count(*) from vendor_seller_accounts)::int as sellers,(select count(*) from web_events)::int as telemetry;'))[0];assert.deepEqual(counts,{orders:0,billing:0,sellers:0,telemetry:0});
pass('synthetic profile/privacy, hold and unpublication restored; payment endpoints and telemetry remain off');
for(const auth of auths)await auth.client.auth.signOut({scope:'local'});
