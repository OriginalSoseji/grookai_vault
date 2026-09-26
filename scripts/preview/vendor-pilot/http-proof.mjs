import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {randomBytes,createHash} from 'node:crypto';
import {out,verified,query} from './ops.mjs';
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url)),{createServerClient}=require('@supabase/ssr');
const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');const origin='https://grookai-vendor-preview.vercel.app';
const accounts=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json'))),key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='anon').api_key;
const resumed=process.argv[2]==='payments';
const receipts=resumed?JSON.parse(fs.readFileSync(path.join(out,'http-proof.json'))).passed:[];const pass=name=>{receipts.push(name);console.log('PASS '+name);fs.writeFileSync(path.join(out,'http-proof.json'),JSON.stringify({at:new Date().toISOString(),target:p.id,origin,passed:receipts},null,2));};
const login=async account=>{const jar=new Map(),client=createServerClient(`https://${p.id}.supabase.co`,key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))}});const r=await client.auth.signInWithPassword(account);assert.equal(r.error,null);return{client,jar};};
const owner=await login(accounts[2]),other=await login(accounts[0]);
const request=async(route,{auth=owner,body,method=body?'POST':'GET',originHeader=origin}={})=>{
 const r=await fetch(origin+route,{method,redirect:'manual',headers:{...(auth?{cookie:[...auth.jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...(method==='POST'?{Origin:originHeader}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(60000)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{}return {status:r.status,headers:r.headers,text,data};
};
if(!resumed){
assert.equal((await request('/api/stores/owner',{auth:null})).status,401);
assert.equal((await request('/api/vendor-preview/activate',{method:'POST',originHeader:'https://invalid.example'})).status,403);
assert.equal((await request('/api/vendor-preview/activate',{method:'POST'})).status,403);
const invite=randomBytes(32).toString('hex');fs.writeFileSync(path.join(out,'http-invite.private.json'),JSON.stringify({code:invite}),{flag:'wx'});
await query(`insert into vendor_pilot_invites(code_hash,expires_at,max_members) values('${createHash('sha256').update(invite).digest('hex')}',now()+interval '2 days',1);`);
const start=await request('/vendor-preview/start?code='+invite,{auth:null});assert.equal(start.status,307);assert.equal(start.headers.get('location'),origin+'/vendor-preview');assert.match(start.headers.get('set-cookie'),/HttpOnly/i);assert.match(start.headers.get('set-cookie'),/Secure/i);assert.match(start.headers.get('cache-control'),/no-store/);assert.equal(start.headers.get('referrer-policy'),'no-referrer');owner.jar.set('grookai_vendor_pilot',invite);
const activated=await request('/api/vendor-preview/activate',{method:'POST'});assert.equal(activated.status,303,activated.text);assert.equal(activated.headers.get('location'),origin+'/account/store');
pass('external HTTPS, unauthenticated denial, CSRF protection, private invitation cookie and activation redirect');
let state=(await request('/api/stores/owner')).data;assert.equal(state.store,null);
const slug='browser-proof-'+accounts[2].id.slice(0,8);
assert.equal((await request('/api/stores/owner',{body:{action:'save',slug,display_name:'Desktop preview proof',description:'Created through the hosted website API'}})).status,200);
state=(await request('/api/stores/owner')).data;assert.equal(state.store.slug,slug);assert.equal(state.store.app_published,false);assert.equal(state.store.web_published,false);
let r=await request('/api/stores/owner/products',{body:{id:null,version:null,action:'save',data:{title:'Desktop trial collectible',description:'A synthetic item saved through the deployed app.',asking_price_amount:19.95,available_quantity:4}}});assert.equal(r.status,200,r.text);let product=r.data.products[0];assert.equal(product.published,false);
assert.equal((await request('/api/stores/owner/products?id='+product.id)).data.products[0].available_quantity,4);
pass('hosted store creation and custom inventory save persist on fresh reads without implicit publication');
const form=new FormData();form.set('kind','product');form.set('product',product.id);form.set('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO6sAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'proof.png');
r=await request('/api/stores/owner/media',{body:form});assert.equal(r.status,200,r.text);const mediaPath=r.data.path;
r=await request('/api/stores/owner/products',{body:{id:product.id,version:product.version,action:'photos',data:{paths:[mediaPath]}}});assert.equal(r.status,200,r.text);product=r.data.products[0];
const mediaRoute=`/api/stores/owner/media?product=${product.id}&photo=${mediaPath.split('/').pop()}`;
assert.equal((await request(mediaRoute)).status,200);assert.equal((await request(mediaRoute,{auth:other})).status,404);assert.equal((await request(mediaRoute,{auth:null})).status,401);
assert.equal((await request('/api/stores/owner/products',{auth:other,body:{id:product.id,version:product.version,action:'save',data:{title:'Denied'}}})).status,403);
pass('hosted photo upload/attachment works and private media/product edits reject other accounts');
assert.equal((await request('/store/'+slug+'?preview=1')).status,200);
assert.equal((await request('/store/'+slug+'?preview=1',{auth:other})).status,404);
assert.equal((await request('/store/'+slug,{auth:null})).status,404);
assert.equal((await request('/api/stores/owner',{body:{action:'publish',surface:'web',publish:true}})).status,403);
pass('owner preview renders; foreign-owner preview, public store and web publication stay unavailable');
fs.writeFileSync(path.join(out,'http-fixtures.private.json'),JSON.stringify({store:state.store,product,mediaPath},null,2),{flag:'wx'});
}
for(const [route,body] of [['/api/vendor-billing/owner',{action:'checkout',plan:'store_web'}],['/api/vendor-payments/owner',{action:'onboarding'}],['/api/vendor-orders/checkout',{orderId:accounts[2].id}]]){
 const r=await request(route,{method:'POST',body});assert.equal(r.status,503,route+' '+r.status+' '+r.text);assert.ok(!r.headers.get('location'));
}
const financial=await query("select (select count(*) from vendor_orders)::int as orders,(select count(*) from vendor_billing_accounts)::int as billing,(select count(*) from vendor_seller_accounts)::int as sellers,(select count(*) from web_events)::int as telemetry;");
assert.deepEqual(financial[0],{orders:0,billing:0,sellers:0,telemetry:0});pass('direct payment/subscription/seller endpoints disabled; no billing accounts, seller accounts, orders or telemetry');
await owner.client.auth.signOut({scope:'local'});await other.client.auth.signOut({scope:'local'});
