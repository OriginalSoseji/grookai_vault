// Compiled pages + actual local Auth/PostgREST. Order states are synthetic seeded
// projection fixtures, NOT proof of provider settlement (covered separately).
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {root,fixture,project,hash,guard,sql} from '../schema/vendor_checkout_runtime_v1.mjs';
import {readOrderHistory,readOrder} from '../../apps/web/src/lib/orders/orderHistory.ts';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
import {proveAcquisitionUi} from '../../tests/helpers/vendorOrderAcquisitionUiProof.mjs';
assert.equal(process.argv.length,2);const runtime=guard({full:true});
assert.equal(sql('select count(*) from vendor_orders;'),'0');
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js'),{chromium,expect}=require('@playwright/test');
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:20021');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'20022');
const api=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}),admin=api(cfg.SECRET_KEY),anon=api(cfg.PUBLISHABLE_KEY);
const db=new Client({connectionString:cfg.DB_URL,statement_timeout:15000}),web=path.join(root,'apps/web'),base='http://127.0.0.1:20040';
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),dir=path.join(fixture,`order-ui-${stamp}`),output=path.join(root,'docs/audits/vendor_order_ui_v1');fs.mkdirSync(dir);fs.mkdirSync(output,{recursive:true});
const checks=[],errors=[],sockets=new Set(),users=[],stores=[],sellers=[],products=[],photoPaths=[],orders=[],reservations=[],signalIds=[];let browser,server,relay,failure,connected=false;
const ok=async p=>{const r=await p;assert.equal(r.error,null,r.error?.message);return r.data;};
async function seedStore(owner,n){
 const store=randomUUID(),seller=randomUUID(),product=randomUUID();stores.push(store);sellers.push(seller);products.push(product);
 await db.query("insert into vendor_stores(id,owner_id,slug,display_name) values($1,$2,$3,'Order UI fixture')",[store,owner,`orders-${Date.now()}-${n}`]);
 await db.query(`insert into vendor_seller_accounts(id,owner_id,store_id,stripe_account_id,livemode,controller,connected_account_id,creation_started_at,state)
 values($1,$2,$3,'acct_uiPlatform',false,'{"feesPayer":"account","paymentLosses":"stripe","requirementCollection":"stripe","dashboard":"full"}',$4,now(),'bound')`,[seller,owner,store,`acct_uiSeller${n}`]);
 await db.query("insert into vendor_store_custom_products(id,store_id,title,asking_price_amount,available_quantity) values($1,$2,'Current title must not replace snapshot',77,100)",[product,store]);
 return {store,seller,product,owner};
}
async function seedOrder(s,buyer,n,{paid=false,review=false,state='payment_pending',title=`Snapshot collectible ${n}`}={}){
 const id=randomUUID(),reservation=randomUUID();orders.push(id);reservations.push(reservation);
 const offer={schema:'VENDOR_STOCK_OFFER_V1',kind:'custom',product_id:s.product,version:1,title,unit_amount:12.34,currency:'USD'};
 const at=new Date(Date.UTC(2026,8,19,12,0,n)).toISOString();
 await db.query(`insert into vendor_stock_reservations(id,buyer_id,owner_id,store_id,seller_id,product_id,quantity,offer,state,created_at,expires_at,payment_started_at,released_at,release_reason)
 values($1,$2,$3,$4,$5,$6,2,$7,$8,$9::timestamptz,$9::timestamptz+interval '120 seconds',$9,case when $8='released' then $9::timestamptz end,case when $8='released' then 'provider_unpaid' end)`,[reservation,buyer,s.owner,s.store,s.seller,s.product,offer,state,at]);
 await db.query(`insert into vendor_orders(id,reservation_id,buyer_id,owner_id,seller,offer,quantity,unit_amount_minor,shipping_amount_minor,tax_amount_minor,currency,quote_reference,fulfillment,created_at,paid,review_reasons)
 values($1,$2,$3,$4,'{"private":"acct_PRIVATE"}',$5,2,1234,0,0,'usd',$6,'pickup',$7,$8,$9)`,[id,reservation,buyer,s.owner,offer,randomUUID(),at,paid,review?['PRIVATE_REVIEW_REASON']:[]]);
 return id;
}
async function login(context,user,destination){
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+destination);await page.waitForURL(/\/login\?next=/);
 assert.equal(new URL(page.url()).searchParams.get('next'),destination);
 await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(base+destination,{timeout:30000});return page;
}
async function context(){const c=await browser.newContext({viewport:{width:1440,height:1000}});await c.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());return c;}
try{
 for(const where of [root,web])for(const name of ['.env','.env.local','.env.production','.env.production.local']){const file=path.join(where,name);if(fs.existsSync(file))assert.ok(where===root&&name==='.env'&&fs.readFileSync(file,'utf8').split(/\r?\n/).every(line=>/^\s*(?:(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=\s*)?$/.test(line)),`Uninspected environment ${name}`);}
 await db.connect();connected=true;
 for(let n=0;n<4;n++){const email=`order-ui-${n}@fixture.invalid`,password=randomUUID()+randomUUID(),id=(await ok(admin.auth.admin.createUser({email,password,email_confirm:true}))).user.id,client=api(cfg.PUBLISHABLE_KEY);users.push({id,email,password,client});await ok(client.auth.signInWithPassword({email,password}));}
 const [seller,buyer,other,acquisitionBuyer]=users,s=await seedStore(seller.id,1),foreignStore=await seedStore(other.id,2);
 for(let n=0;n<21;n++)await seedOrder(s,buyer.id,n);
 const pending=orders[20],paid=await seedOrder(s,buyer.id,21,{paid:true,state:'consumed',title:'Recorded paid collectible'}),review=await seedOrder(s,buyer.id,22,{paid:true,review:true,state:'released',title:'Late payment review collectible'}),closed=await seedOrder(s,buyer.id,23,{state:'released',title:'Unpaid released collectible'});
 const foreign=await seedOrder(foreignStore,seller.id,24,{title:'FOREIGN_PRIVATE_COLLECTIBLE'});
 assert.equal(await readOrder(other.client,pending),null);assert.equal(await readOrder(buyer.client,foreign),null);assert.ok((await anon.rpc('vendor_order_status_v1',{p_order_id:pending})).error);
 for(const client of [anon,buyer.client,seller.client])for(const table of ['vendor_orders','vendor_order_attempts','vendor_order_observations','vendor_order_signals'])assert.ok((await client.from(table).select('*').limit(1)).error);
 const first=await readOrderHistory(buyer.client,()=>admin,'buyer',{status:'all',after:''}),second=await readOrderHistory(buyer.client,()=>admin,'buyer',{status:'all',after:first.next});assert.equal(first.items.length,20);assert.equal(second.items.length,4);assert.equal(second.next,null);assert.equal(new Set([...first.items,...second.items].map(o=>o.id)).size,24);assert.ok(first.items.every(o=>o.id!==foreign));
 assert.equal((await readOrderHistory(seller.client,()=>admin,'seller',{status:'review',after:''})).items[0].id,review);
 assert.equal((await readOrderHistory(buyer.client,()=>admin,'buyer',{status:'paid',after:''})).items.length,2);
 checks.push('actual Auth and participant RPC isolation; base tables denied; server-scoped lists; keyset pagination and status filters');
 // All acquisition flags are already off; explicitly grant then revoke the owner
 // package to prove history remains readable across a real downgrade.
 await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor','{\"store_app\":true,\"store_web\":true}')",[seller.id]);
 assert.equal((await readOrder(seller.client,paid)).paid,true);await db.query('delete from user_entitlements where user_id=$1',[seller.id]);
 assert.equal((await readOrder(seller.client,paid)).paid,true);assert.equal((await readOrder(buyer.client,paid)).paid,true);
 checks.push('retained records readable with rollout disabled, unpublished stores, no sharing and after package revocation');
 const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
 Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:base,NEXT_PUBLIC_SITE_URL:base,GVVI_REFERRAL_COOKIE_SECRET:'isolated-order-browser-key-at-least-32',NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 relay=net.createServer(socket=>{const upstream=net.connect(20021,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});await new Promise((r,j)=>{relay.once('error',j);relay.listen(15439,'127.0.0.1',r);});
 const fd=fs.openSync(path.join(dir,'build.log'),'wx');try{const child=spawn('npm.cmd',['run','build'],{cwd:web,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});assert.equal(await new Promise((r,j)=>{child.once('error',j);child.once('exit',r);}),0,'Inspect local build log');}finally{fs.closeSync(fd);}console.log('PASS compiled local build');
 const out=fs.openSync(path.join(dir,'server.log'),'wx');server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','20040'],{cwd:web,env,windowsHide:true,stdio:['ignore',out,out]});fs.closeSync(out);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Server exited');try{if((await fetch(base+'/api/vendor-payments/owner')).status===401)break;}catch{}if(n===59)throw new Error('Readiness timeout');await new Promise(r=>setTimeout(r,1000));}
 browser=await chromium.launch({headless:true});const bc=await context(),page=await login(bc,buyer,`/account/orders/${pending}?checkout=returned`);
 // Actual compiled routes with no provider configuration or activation. The
 // enabled transport has separate Request/Response + real database proof.
 const post=(lane,data,headers={})=>bc.request.post(base+'/api/vendor-orders/'+lane,{data,headers});
 assert.equal((await post('checkout',{orderId:pending},{origin:base})).status(),503);
 assert.equal((await post('checkout',{orderId:pending,buyerId:buyer.id},{origin:base})).status(),400);
 assert.equal((await post('checkout',{orderId:pending},{origin:'https://evil.invalid'})).status(),403);
 assert.equal((await post('webhook',{paid:true})).status(),503);
 assert.equal((await post('reconcile',{orderId:pending})).status(),401);
 const anonymous=await context();assert.equal((await anonymous.request.post(base+'/api/vendor-orders/checkout',{data:{orderId:pending},headers:{origin:base}})).status(),401);await anonymous.close();
 for(const lane of ['checkout','webhook','reconcile'])assert.equal((await bc.request.get(base+'/api/vendor-orders/'+lane)).status(),405);
 checks.push('compiled checkout/events/reconcile routes fail closed; actual cookie Auth, forged body/origin/operator denial and GET rejection');
 await expect(page.getByRole('heading',{name:'Payment confirmation pending',exact:true})).toBeVisible();await expect(page.getByText(/returning here does not confirm payment/)).toBeVisible();
 assert.equal((await readOrder(buyer.client,pending)).paid,false);checks.push('real sign-in preserves checkout return; query never marks order paid');
 const response=await bc.request.get(base+`/account/orders/${pending}?paid=true&checkout=success`);assert.match(response.headers()['cache-control'],/private.*no-store/);assert.equal(response.headers()['referrer-policy'],'no-referrer');assert.match(response.headers()['x-robots-tag'],/noindex/);const html=await response.text();assert.doesNotMatch(html,/acct_PRIVATE|PRIVATE_REVIEW_REASON|FOREIGN_PRIVATE_COLLECTIBLE|Current title must not replace snapshot/);assert.match(html,/Payment confirmation pending/);
 await page.goto(base+'/account/orders');await expect(page.getByRole('list',{name:'Orders'}).locator(':scope > li')).toHaveCount(20);await page.getByRole('link',{name:'Older orders',exact:true}).click();await expect(page.getByRole('list',{name:'Orders'}).locator(':scope > li')).toHaveCount(4);
 await page.goto(base+'/account/orders?status=review');await expect(page.getByRole('list',{name:'Orders'}).locator(':scope > li')).toHaveCount(1);await page.getByRole('link',{name:'Late payment review collectible'}).click();await expect(page.getByRole('heading',{name:'Needs review',exact:true})).toBeVisible();await expect(page.getByText('A payment was recorded for this order.')).toBeVisible();
 await page.screenshot({path:path.join(dir,'desktop-order-review.png'),fullPage:true});checks.push('compiled buyer pagination/filter/review pages and private redacted uncached response');
 await page.goto(base+`/account/orders/${paid}`);await expect(page.getByRole('heading',{name:'Payment received',exact:true})).toBeVisible();await expect(page.getByText(/does not confirm shipment, pickup or seller payout/)).toBeVisible();await page.screenshot({path:path.join(dir,'desktop-order-paid.png'),fullPage:true});
 await page.goto(base+`/account/orders/${closed}`);await expect(page.getByRole('heading',{name:'Payment not completed',exact:true})).toBeVisible();
 await page.goto(base+`/account/orders/${foreign}`);await expect(page.getByRole('heading',{name:'Order unavailable',exact:true})).toBeVisible();assert.doesNotMatch(await page.content(),/FOREIGN_PRIVATE_COLLECTIBLE/);
 await page.goto(base+`/account/orders/${randomUUID()}`);await expect(page.getByRole('heading',{name:'Order unavailable',exact:true})).toBeVisible();
 await page.goto(base+'/account/orders?owner_id='+seller.id);await expect(page.getByRole('alert').filter({hasText:'Order filters are invalid.'})).toBeVisible();checks.push('paid/released states and unknown/foreign/forged filter boundaries');
 const sc=await context(),sp=await login(sc,seller,'/account/store/orders');await expect(sp.getByRole('heading',{name:'Store orders',exact:true})).toBeVisible();await expect(sp.getByRole('list',{name:'Orders'}).locator(':scope > li')).toHaveCount(20);assert.doesNotMatch(await sp.content(),/FOREIGN_PRIVATE_COLLECTIBLE/);await sp.screenshot({path:path.join(dir,'desktop-store-orders.png'),fullPage:true});
 await sp.getByLabel('Payment filter').selectOption('paid');await sp.getByRole('button',{name:'Apply filter'}).click();await expect(sp.getByRole('list',{name:'Orders'}).locator(':scope > li')).toHaveCount(2);
 await sp.setViewportSize({width:390,height:844});assert.ok(await sp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await sp.screenshot({path:path.join(dir,'mobile-store-orders.png'),fullPage:true});
 await page.goto(base+`/account/orders/${review}`);await expect(page.getByRole('heading',{name:'Needs review',exact:true})).toBeVisible();await expect(page.getByText('A payment was recorded for this order.')).toBeVisible();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:path.join(dir,'mobile-order-review.png'),fullPage:true});
 await sp.goto(base+'/account/store');await expect(sp.getByRole('link',{name:'Store orders',exact:true})).toBeVisible();checks.push('seller workspace retained after downgrade, independent account roles, desktop/mobile layouts and navigation');
 // Restart only our compiled server, not the database, with isolated synthetic
 // event/operator configuration. No attempts are bound, so sweep has no provider
 // resources to read; Node network guard still rejects all external transport.
 server.kill();await new Promise(r=>server.once('exit',r));
 const Stripe=require('stripe'),key=['sk','test','compiledSyntheticOnly'].join('_'),secret=['whsec','compiledSyntheticOrderSecret'].join('_'),operatorToken=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');
 const enabledEnv={...env,STRIPE_SECRET_KEY:key,STRIPE_ACCOUNT_ID:'acct_uiPlatform',STRIPE_PAYMENTS_MODE:'test',STRIPE_ORDER_WEBHOOK_SECRET:secret,GROOKAI_VENDOR_ORDER_EVENTS_ENABLED:'true',GROOKAI_VENDOR_ORDER_RECONCILIATION_ENABLED:'true',GROOKAI_VENDOR_ORDER_RECONCILE_TOKEN:operatorToken,GROOKAI_VENDOR_ORDER_ACQUISITION_ENABLED:'true',GROOKAI_VENDOR_ORDER_QUOTE_POLICY:'local-synthetic-pickup-v1',GROOKAI_VENDOR_ORDER_QUOTE_SECRET:'a'.repeat(64),GROOKAI_VENDOR_ORDER_CHECKOUT_ENABLED:'true'};
 const enabledLog=fs.openSync(path.join(dir,'server-events.log'),'wx');server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','20040'],{cwd:web,env:enabledEnv,windowsHide:true,stdio:['ignore',enabledLog,enabledLog]});fs.closeSync(enabledLog);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Event server exited');try{if((await fetch(base+'/api/vendor-payments/owner')).status===401)break;}catch{}if(n===59)throw new Error('Event server readiness timeout');await new Promise(r=>setTimeout(r,1000));}
 const signer=new Stripe(key,{apiVersion:STRIPE_BILLING_API_VERSION}),eventId='evt_'+randomUUID().replaceAll('-',''),now=Math.floor(Date.now()/1000);signalIds.push(eventId);
 const event={object:'event',id:eventId,account:'acct_uiSeller1',livemode:false,api_version:STRIPE_BILLING_API_VERSION,created:now,type:'checkout.session.completed',data:{object:{object:'checkout.session',id:'cs_test_uiSynthetic',livemode:false,mode:'payment',metadata:{grookai_order_id:pending}}}};
 const raw=JSON.stringify(event),signature=signer.webhooks.generateTestHeaderString({payload:raw,secret,timestamp:now});
 const deliver=body=>fetch(base+'/api/vendor-orders/webhook',{method:'POST',headers:{'stripe-signature':signature},body});
 await Promise.all([deliver(raw),deliver(raw)]).then(rs=>rs.forEach(r=>assert.equal(r.status,200)));
 assert.equal((await deliver(raw+' ')).status,400);assert.equal((await db.query('select count(*) n from vendor_order_signals where event_id=$1',[eventId])).rows[0].n,'1');
 assert.equal((await readOrder(buyer.client,pending)).paid,false);
 const operator=await fetch(base+'/api/vendor-orders/reconcile',{method:'POST',headers:{authorization:`Bearer ${operatorToken}`},body:'{}'});assert.equal(operator.status,200);assert.deepEqual(await operator.json(),{succeeded:[],failed:[],next:null,complete:true,budgetExhausted:false});
 assert.equal((await fetch(base+'/api/vendor-orders/reconcile',{method:'POST',body:'{}'})).status,401);
 checks.push('compiled enabled notification route verifies raw signature and retains concurrent duplicates once; tampering rejected, metadata cannot mark paid; operator-authenticated empty sweep with acquisition off');
 await proveAcquisitionUi({db,context,login,sp,buyer:acquisitionBuyer,s,base,expect,dir,products,photoPaths,orders,reservations,checks});
 assert.deepEqual(errors,[]);
}catch(e){failure=e;}finally{
 if(browser)await browser.close();if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}for(const socket of sockets)socket.destroy();if(relay)relay.close();
 if(connected){await db.query('begin');await db.query('set local session_replication_role=replica');await db.query('delete from vendor_order_signals where event_id=any($1::text[])',[signalIds]);await db.query('delete from vendor_order_attempts where order_id=any($1::uuid[])',[orders]);for(const [table,column,ids] of [['vendor_orders','id',orders],['vendor_stock_reservations','store_id',stores],['vendor_store_custom_product_events','product_id',products],['vendor_store_custom_products','id',products],['vendor_seller_accounts','id',sellers],['vendor_stores','id',stores]])await db.query(`delete from ${table} where ${column}=any($1::uuid[])`,[ids]);await db.query("delete from storage.objects where bucket_id='vendor-store-media' and name=any($1::text[])",[photoPaths]);await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');await db.query('commit');for(const user of users)await ok(admin.auth.admin.deleteUser(user.id));await db.end();}
 assert.deepEqual(guard({full:true}),runtime);assert.equal(sql('select count(*) from vendor_orders;'),'0');
 const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,errors,failure:failure?.stack,providerRequests:0,productionWrites:0,sharedResets:0,orderStates:'synthetic seeded projections; no payment simulation claimed',auth:'real local Supabase',fixturesRemoved:true,migrationsUnchanged:403,runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),screenshots:fs.readdirSync(dir).filter(n=>n.endsWith('.png')).map(n=>({name:n,sha256:hash(fs.readFileSync(path.join(dir,n)))}))};fs.writeFileSync(path.join(output,`ui-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}if(failure)throw failure;
