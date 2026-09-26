import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {out,verified,query} from './ops.mjs';
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url)),{createServerClient}=require('@supabase/ssr');
const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');
const origin='https://grookai-vendor-preview.vercel.app';
const target=process.argv[2];assert.match(target??'',/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/);
const accounts=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json'))),key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='anon').api_key;
const file=path.join(out,'inventory-proof-fixture.private.json');
const fixture=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};
const save=()=>fs.writeFileSync(file,JSON.stringify(fixture,null,2));
const receipts=[];const pass=name=>{receipts.push(name);console.log('PASS '+name);fs.writeFileSync(path.join(out,'inventory-proof.json'),JSON.stringify({at:new Date().toISOString(),target:p.id,site:target,passed:receipts},null,2));};
async function login(account){const jar=new Map(),client=createServerClient(`https://${p.id}.supabase.co`,key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))}});assert.equal((await client.auth.signInWithPassword(account)).error,null);return{client,jar};}
const [owner,expired,other]=await Promise.all(accounts.map(login));
async function request(route,{auth=owner,body,originHeader=origin}={}){const r=await fetch(target+route,{method:body?'POST':'GET',headers:{...(auth?{cookie:[...auth.jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...(body?{'Content-Type':'application/json',Origin:originHeader}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});const text=await r.text();let data;try{data=JSON.parse(text);}catch{}return{status:r.status,data,text,headers:r.headers};}
const route='/api/stores/owner/inventory';
assert.equal((await request(route+'?q=Pikachu',{auth:null})).status,401);
assert.equal((await request(route+'?q=Pikachu',{auth:expired})).status,403);
assert.equal((await request(route,{body:{action:'section',name:'Denied'},originHeader:'https://invalid.example'})).status,403);
let r=await request(route+'?q=Pikachu');assert.equal(r.status,200,r.text);assert.match(r.headers.get('cache-control'),/no-store/);assert.ok(r.data.cards.length>0&&r.data.cards.length<=20);
const card=r.data.cards.find(c=>c.printings.length);assert.ok(card);
const wrong=(await request(route+'?q=Bulbasaur')).data.cards.find(c=>c.printings.length);assert.ok(wrong);
assert.equal((await request(route+'?q='+encodeURIComponent('x%,name.not.is.null'))).status,400);
const before=(await owner.client.from('vault_item_instances').select('id').eq('user_id',accounts[0].id).is('archived_at',null)).data.length;
assert.equal((await request(route,{body:{action:'create',card_id:card.id,printing_id:wrong.printings[0].id,condition:'NM'}})).status,400);
assert.equal((await owner.client.from('vault_item_instances').select('id').eq('user_id',accounts[0].id).is('archived_at',null)).data.length,before);
pass('authenticated bounded search; anonymous, expired access, CSRF, malformed queries and wrong-parent printing rejected before create');
if(!fixture.copy){assert.ok(!fixture.createStarted,'Unknown creation outcome: inspect fixture inventory; do not retry');fixture.createStarted=true;save();r=await request(route,{body:{action:'create',card_id:card.id,printing_id:card.printings[0].id,condition:'LP'}});assert.equal(r.status,200,r.text);fixture.copy=r.data;fixture.card=card;save();}
const id=fixture.copy.id;
r=await request(route+'?id='+id);assert.equal(r.status,200,r.text);assert.equal(r.data.condition_label,'LP');assert.equal(r.data.selected,false);
assert.equal((await request(route+'?id='+id,{auth:other})).status,400);
const settings={action:'save',id,condition:'LP',intent:'sell',mode:'asking',amount:'27.50',currency:'USD',selected:false,sections:[]};
assert.equal((await request(route,{auth:other,body:settings})).status,400);
assert.equal((await request(route,{auth:expired,body:settings})).status,403);
assert.equal((await request(route,{body:{...settings,amount:-1}})).status,400);
assert.equal((await request(route,{body:{...settings,sections:[accounts[2].id]}})).status,400);
let state=(await request('/api/stores/owner')).data;
if(!fixture.section){let section=state.sections.find(s=>s.name==='Desktop intake proof');if(!section){r=await request(route,{body:{action:'section',name:'Desktop intake proof'}});assert.equal(r.status,200,r.text);state=(await request('/api/stores/owner')).data;section=state.sections.find(s=>s.name==='Desktop intake proof');}assert.ok(section);fixture.section=section.id;save();}
r=await request(route,{body:{...settings,sections:[fixture.section]}});assert.equal(r.status,200,r.text);
r=await request(route+'?id='+id);assert.equal(r.data.asking_price_amount,27.5);assert.equal(r.data.intent,'sell');assert.ok(r.data.sections.includes(fixture.section));assert.equal(r.data.selected,false);
state=(await request('/api/stores/owner')).data;assert.equal(state.store.app_published,false);assert.equal(state.store.web_published,false);
pass('one copy added; owner can save price, condition, sale status and section; foreign/expired writes denied and store stays unpublished');
// Only the pre-existing synthetic proof account is used for sharing-boundary tests.
let {data:profile,error:profileError}=await owner.client.from('public_profiles').select('slug,display_name,public_profile_enabled,vault_sharing_enabled').eq('user_id',accounts[0].id).maybeSingle();assert.equal(profileError,null);
if(!profile){profile={slug:'intake-proof-'+accounts[0].id.slice(0,8),display_name:'Synthetic desktop intake proof',public_profile_enabled:false,vault_sharing_enabled:false};assert.equal((await owner.client.from('public_profiles').insert({user_id:accounts[0].id,...profile})).error,null);}
if(!fixture.profile){fixture.profile=profile;save();}
try{
 assert.equal((await owner.client.from('public_profiles').update({public_profile_enabled:false,vault_sharing_enabled:false}).eq('user_id',accounts[0].id)).error,null);
 r=await request(route,{body:{...settings,selected:true,sections:[fixture.section]}});assert.equal(r.status,409,r.text);assert.match(r.data.error,/Details saved/);
 assert.equal((await request(route+'?id='+id)).data.selected,false);
 assert.equal((await owner.client.from('public_profiles').update({slug:profile.slug||'intake-proof-'+accounts[0].id.slice(0,8),display_name:profile.display_name||'Intake proof',public_profile_enabled:true,vault_sharing_enabled:true}).eq('user_id',accounts[0].id)).error,null);
 r=await request(route,{body:{...settings,selected:true,sections:[fixture.section]}});assert.equal(r.status,200,r.text);
 r=await request(route+'?id='+id);assert.equal(r.data.selected,true);assert.equal(r.data.asking_price_amount,27.5);
 const count=(await owner.client.from('vault_item_instances').select('id').eq('user_id',accounts[0].id).is('archived_at',null)).data.length;
 assert.equal((await request(route,{body:{...settings,selected:true,sections:[fixture.section]}})).status,200);
 assert.equal((await owner.client.from('vault_item_instances').select('id').eq('user_id',accounts[0].id).is('archived_at',null)).data.length,count);
 r=await request(route,{body:{...settings,intent:'hold',selected:false,sections:[]}});assert.equal(r.status,200,r.text);
 r=await request(route+'?id='+id);assert.equal(r.data.selected,false);assert.equal(r.data.intent,'hold');assert.deepEqual(r.data.sections,[]);
 pass('sharing-disabled listing failure is explicit; same copy recovers after eligibility correction; retry creates no sibling; hold and section removal persist');
}finally{assert.equal((await owner.client.from('public_profiles').update(fixture.profile).eq('user_id',accounts[0].id)).error,null);}
state=(await request('/api/stores/owner')).data;assert.equal(state.store.app_published,false);assert.equal(state.store.web_published,false);
for(const [path,body] of [['/api/vendor-billing/owner',{action:'checkout',plan:'store_web'}],['/api/vendor-payments/owner',{action:'onboarding'}],['/api/vendor-orders/checkout',{orderId:accounts[0].id}]])assert.equal((await request(path,{body})).status,503);
const financial=await query('select (select count(*) from vendor_orders)::int as orders,(select count(*) from vendor_billing_accounts)::int as billing,(select count(*) from vendor_seller_accounts)::int as sellers,(select count(*) from web_events)::int as telemetry;');assert.deepEqual(financial[0],{orders:0,billing:0,sellers:0,telemetry:0});
pass('no implicit publication; billing, payments and telemetry remain disabled');
for(const auth of [owner,expired,other])await auth.client.auth.signOut({scope:'local'});
