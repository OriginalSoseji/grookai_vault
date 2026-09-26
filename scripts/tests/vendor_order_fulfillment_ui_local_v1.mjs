// Compiled pages + actual local Auth/PostgREST. Order states are synthetic seeded
// projection fixtures, NOT proof of provider settlement (covered separately).
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {root,fixture,project,hash,guard,sql} from '../schema/vendor_order_fulfillment_runtime_v1.mjs';
import {readOrderHistory,readOrder} from '../../apps/web/src/lib/orders/orderHistory.ts';
import {readFulfillment} from '../../apps/web/src/lib/orders/orderFulfillment.ts';
assert.equal(process.argv.length,2);const runtime=guard({full:true});
assert.equal(sql('select count(*) from vendor_orders;'),'0');
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js'),{chromium,expect}=require('@playwright/test');
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:22421');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'22422');
const api=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}),admin=api(cfg.SECRET_KEY),anon=api(cfg.PUBLISHABLE_KEY);
const db=new Client({connectionString:cfg.DB_URL,statement_timeout:15000}),web=path.join(root,'apps/web'),base='http://127.0.0.1:22440';
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),dir=path.join(fixture,`order-ui-${stamp}`),output=path.join(root,'docs/audits/vendor_order_fulfillment_v1');fs.mkdirSync(dir);fs.mkdirSync(output,{recursive:true});
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
async function seedOrder(s,buyer,n,{paid=false,review=false,state='payment_pending',fulfillment='pickup',title=`Snapshot collectible ${n}`}={}){
 const id=randomUUID(),reservation=randomUUID();orders.push(id);reservations.push(reservation);
 const offer={schema:'VENDOR_STOCK_OFFER_V1',kind:'custom',product_id:s.product,version:1,title,unit_amount:12.34,currency:'USD'};
 const at=new Date(Date.UTC(2026,8,19,12,0,n)).toISOString();
 await db.query(`insert into vendor_stock_reservations(id,buyer_id,owner_id,store_id,seller_id,product_id,quantity,offer,state,created_at,expires_at,payment_started_at,released_at,release_reason)
 values($1,$2,$3,$4,$5,$6,2,$7,$8,$9::timestamptz,$9::timestamptz+interval '120 seconds',$9,case when $8='released' then $9::timestamptz end,case when $8='released' then 'provider_unpaid' end)`,[reservation,buyer,s.owner,s.store,s.seller,s.product,offer,state,at]);
 await db.query(`insert into vendor_orders(id,reservation_id,buyer_id,owner_id,seller,offer,quantity,unit_amount_minor,shipping_amount_minor,tax_amount_minor,currency,quote_reference,fulfillment,created_at,paid,review_reasons)
 values($1,$2,$3,$4,'{"private":"acct_PRIVATE"}',$5,2,1234,0,0,'usd',$6,$10,$7,$8,$9)`,[id,reservation,buyer,s.owner,offer,randomUUID(),at,paid,review?['PRIVATE_REVIEW_REASON']:[],fulfillment]);
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

 const [seller,buyer,other]=users,s=await seedStore(seller.id,1),foreignStore=await seedStore(other.id,2);
 const pickup=await seedOrder(s,buyer.id,1,{paid:true,state:'consumed',title:'Pickup fixture collectible'});
 const shipping=await seedOrder(s,buyer.id,2,{paid:true,state:'consumed',fulfillment:'shipping',title:'Shipping fixture collectible'});
 const unpaid=await seedOrder(s,buyer.id,3),review=await seedOrder(s,buyer.id,4,{paid:true,review:true,state:'consumed'});
 const paused=await seedOrder(s,buyer.id,5,{paid:true,state:'consumed',fulfillment:'shipping'});
 const foreign=await seedOrder(foreignStore,seller.id,6);
 assert.equal(await readFulfillment(other.client,pickup),null);assert.equal(await readFulfillment(buyer.client,foreign),null);
 assert.equal((await readFulfillment(seller.client,pickup)).canManage,false);
 const env={GROOKAI_VENDOR_ORDER_FULFILLMENT_ENABLED:'true'};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
 Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:base,NEXT_PUBLIC_SITE_URL:base,GVVI_REFERRAL_COOKIE_SECRET:'isolated-order-browser-key-at-least-32',NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 relay=net.createServer(socket=>{const upstream=net.connect(22421,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});await new Promise((r,j)=>{relay.once('error',j);relay.listen(15439,'127.0.0.1',r);});
 const fd=fs.openSync(path.join(dir,'build.log'),'wx');try{const child=spawn('npm.cmd',['run','build'],{cwd:web,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});assert.equal(await new Promise((r,j)=>{child.once('error',j);child.once('exit',r);}),0,'Inspect local build log');}finally{fs.closeSync(fd);}console.log('PASS compiled local build');
 const out=fs.openSync(path.join(dir,'server.log'),'wx');server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','22440'],{cwd:web,env,windowsHide:true,stdio:['ignore',out,out]});fs.closeSync(out);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Server exited');try{if((await fetch(base+'/api/vendor-payments/owner')).status===401)break;}catch{}if(n===59)throw new Error('Readiness timeout');await new Promise(r=>setTimeout(r,1000));}

 browser=await chromium.launch({headless:true});const bc=await context(),sc=await context(),oc=await context();
 const bp=await login(bc,buyer,'/account/orders/'+pickup),sp=await login(sc,seller,'/account/orders/'+shipping);
 const request={orderId:shipping,requestId:randomUUID(),expectedSequence:0,action:'ship',carrier:'ups',tracking:'1Z SYNTHETIC 001'};
 const post=(c,body,origin=base)=>c.request.post(base+'/api/vendor-orders/fulfillment',{data:body,headers:{origin}});
 assert.equal((await post(sc,request)).status(),503);await expect(sp.getByRole('button',{name:'Record shipment',exact:true})).toHaveCount(0);
 await db.query('update vendor_order_fulfillment_control set enabled=true');await sp.reload();await bp.reload();
 await expect(bp.getByRole('button',{name:'Mark ready for pickup',exact:true})).toHaveCount(0);
 assert.equal((await post(bc,request)).status(),503);assert.equal((await post(sc,{...request,actorId:seller.id})).status(),400);assert.equal((await post(sc,request,'https://evil.invalid')).status(),403);
 assert.equal((await post(oc,request)).status(),401);await login(oc,other,'/account/orders/'+pickup);assert.equal((await post(oc,request)).status(),503);
 checks.push('compiled private routes use real cookie Auth, preserve sign-in destinations, deny buyer/foreign/anonymous/forged origin and identity, and enforce database disablement');
 await sp.getByRole('button',{name:'Record shipment',exact:true}).click();await sp.getByLabel('Carrier',{exact:true}).selectOption('ups');await sp.getByLabel('Tracking number',{exact:true}).fill('1Z SYNTHETIC 001');
 await sp.screenshot({path:path.join(dir,'desktop-record-shipment.png'),fullPage:true});
 let intercepted=0;await sp.route('**/api/vendor-orders/fulfillment',async route=>{const response=await route.fetch();assert.equal(response.status(),200);intercepted++;await route.abort('failed');});
 await sp.getByRole('button',{name:'Confirm update',exact:true}).click();await expect(sp.getByRole('region',{name:'Fulfillment progress'}).getByRole('alert')).toBeVisible();assert.equal(intercepted,1);
 assert.equal((await readFulfillment(seller.client,shipping)).sequence,1);await sp.unroute('**/api/vendor-orders/fulfillment');
 await sp.getByRole('button',{name:'Retry same update',exact:true}).click();await expect(sp.getByText('Shipped',{exact:true})).toBeVisible();assert.equal((await readFulfillment(seller.client,shipping)).sequence,1);
 checks.push('desktop shipping submission uses actual API/SQL; a lost successful response retries the same retained request and cannot append twice');
 await sp.getByRole('button',{name:'Correct tracking',exact:true}).click();await sp.getByLabel('Tracking number',{exact:true}).fill('1Z CORRECTED 002');await sp.getByRole('button',{name:'Confirm update',exact:true}).click();
 await expect(sp.getByRole('button',{name:'Record delivery',exact:true})).toBeVisible();await sp.getByRole('button',{name:'Record delivery',exact:true}).click();await sp.getByRole('button',{name:'Confirm update',exact:true}).click();await expect(sp.getByText('Delivery recorded',{exact:true})).toBeVisible();
 await bp.goto(base+'/account/orders/'+shipping);await expect(bp.getByText('Delivery recorded',{exact:true})).toBeVisible();await expect(bp.getByRole('heading',{name:'Recent seller updates'})).toBeVisible();assert.equal((await readFulfillment(buyer.client,shipping)).events.length,3);
 checks.push('tracking correction retains prior history; seller-recorded delivery and current tracking appear in the buyer private progress view');
 await sp.goto(base+'/account/orders/'+pickup);await sp.getByRole('button',{name:'Mark ready for pickup',exact:true}).click();await sp.getByRole('button',{name:'Confirm update',exact:true}).click();await expect(sp.getByText('Ready for pickup',{exact:true})).toBeVisible();
 await bp.goto(base+'/account/orders/'+pickup);await expect(bp.getByText('Ready for pickup',{exact:true})).toBeVisible();await sp.getByRole('button',{name:'Record pickup completion',exact:true}).click();await sp.getByRole('button',{name:'Confirm update',exact:true}).click();await expect(sp.getByText('Pickup completed',{exact:true})).toBeVisible();await bp.reload();await expect(bp.getByText('Pickup completed',{exact:true})).toBeVisible();
 checks.push('complete seller ready/collected pickup journey is reflected for buyer with publication, acquisition and packages absent');
 for(const id of [unpaid,review]){await sp.goto(base+'/account/orders/'+id);await expect(sp.getByRole('button',{name:'Mark ready for pickup',exact:true})).toHaveCount(0);assert.equal((await post(sc,{...request,orderId:id,requestId:randomUUID(),action:'ready_pickup',carrier:null,tracking:null})).status(),503);}
 await sp.goto(base+'/account/orders/'+paused);await sp.getByRole('button',{name:'Record shipment',exact:true}).click();await sp.getByLabel('Tracking number',{exact:true}).fill('PAUSED 001');await db.query('update vendor_order_fulfillment_control set enabled=false');await sp.getByRole('button',{name:'Confirm update',exact:true}).click();await expect(sp.getByRole('region',{name:'Fulfillment progress'}).getByRole('alert')).toBeVisible();assert.equal((await readFulfillment(seller.client,paused)).sequence,0);
 await bp.goto(base+'/account/orders/'+shipping);await bp.setViewportSize({width:390,height:844});await expect(bp.getByText('Delivery recorded',{exact:true})).toBeVisible();assert.ok(await bp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await bp.screenshot({path:path.join(dir,'mobile-buyer-delivery.png'),fullPage:true});
 await sp.goto(base+'/account/store/orders');await expect(sp.getByRole('heading',{name:'Store orders',exact:true})).toBeVisible();await sp.screenshot({path:path.join(dir,'desktop-store-orders.png'),fullPage:true});
 checks.push('unpaid/review and stale enabled page cannot bypass SQL; retained history survives pause; desktop workspace and mobile buyer layout remain usable');
 assert.deepEqual(errors,[]);
}catch(e){failure=e;if(browser){let n=0;for(const c of browser.contexts())for(const page of c.pages()){await page.screenshot({path:path.join(dir,'failure-'+(++n)+'.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(dir,'failure-'+n+'-private.html'),await page.content().catch(()=>''));}}}finally{
 if(browser)await browser.close();if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}for(const socket of sockets)socket.destroy();if(relay)relay.close();
 if(connected){await db.query('begin');await db.query('set local session_replication_role=replica');await db.query('delete from vendor_order_fulfillment_events where order_id=any($1::uuid[])',[orders]);await db.query('update vendor_order_fulfillment_control set enabled=false');await db.query('delete from vendor_order_signals where event_id=any($1::text[])',[signalIds]);await db.query('delete from vendor_order_cancellations where order_id=any($1::uuid[])',[orders]);await db.query('delete from vendor_order_attempts where order_id=any($1::uuid[])',[orders]);for(const [table,column,ids] of [['vendor_orders','id',orders],['vendor_stock_reservations','store_id',stores],['vendor_store_custom_product_events','product_id',products],['vendor_store_custom_products','id',products],['vendor_seller_accounts','id',sellers],['vendor_stores','id',stores]])await db.query(`delete from ${table} where ${column}=any($1::uuid[])`,[ids]);await db.query("delete from storage.objects where bucket_id='vendor-store-media' and name=any($1::text[])",[photoPaths]);await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');await db.query('commit');for(const user of users)await ok(admin.auth.admin.deleteUser(user.id));await db.end();}
 assert.deepEqual(guard({full:true}),runtime);assert.equal(sql('select count(*) from vendor_orders;'),'0');
 const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,errors,failure:failure?.stack,providerRequests:0,productionWrites:0,sharedResets:0,orderStates:'synthetic seeded projections; no payment simulation claimed',auth:'real local Supabase',fixturesRemoved:true,priorMigrationsUnchanged:406,migrationsApplied:407,runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),screenshots:fs.readdirSync(dir).filter(n=>n.endsWith('.png')).map(n=>({name:n,sha256:hash(fs.readFileSync(path.join(dir,n)))}))};fs.writeFileSync(path.join(output,`ui-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}if(failure)throw failure;
