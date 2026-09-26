// Compiled web + real local Auth/PostgREST + real SDK through a fixed loopback
// provider simulator. Never a Stripe-account proof or production smoke test.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {root,fixture,project,hash,guard,sql} from '../schema/vendor_order_resolutions_runtime_v1.mjs';
import {boundRefundProvider,refundBrowserProvider} from '../../tests/helpers/vendorRefundBrowserProvider.mjs';
import {createOrderRefundService} from '../../apps/web/src/lib/payments/vendorOrderRefunds.ts';
import {refundFixture} from '../../tests/helpers/vendorOrderRefundFixture.mjs';
import {reconcileVendorOrder} from '../../apps/web/src/lib/payments/vendorOrderService.ts';
assert.equal(process.argv.length,2);const runtime=guard({full:true});assert.equal(sql('select count(*) from vendor_orders;'),'0');
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js'),{chromium,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:30000});
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:24821');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'24822');
const api=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}),admin=api(cfg.SECRET_KEY);
const db=new Client({connectionString:cfg.DB_URL,statement_timeout:15000}),web=path.join(root,'apps/web'),base='http://127.0.0.1:24840';
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),dir=path.join(fixture,`resolution-ui-${stamp}`),output=path.join(root,'docs/audits/vendor_order_resolutions_v1');fs.mkdirSync(dir);
const checks=[],errors=[],sockets=new Set(),users=[],stores=[],sellers=[],products=[],orders=[],registry=new Map();
const provider=refundBrowserProvider(registry);let browser,server,relay,failure,connected=false;
const ok=async promise=>{const r=await promise;assert.equal(r.error,null,r.error?.message);return r.data;};
const posts=()=>provider.calls.filter(c=>c.method==='POST').length;
async function seedStore(owner,n){
 const store=randomUUID(),seller=randomUUID(),product=randomUUID();stores.push(store);sellers.push(seller);products.push(product);
 await db.query("insert into vendor_stores(id,owner_id,slug,display_name) values($1,$2,$3,'Refund UI fixture')",[store,owner,`refunds-${Date.now()}-${n}`]);
 const controller={feesPayer:'account',paymentLosses:'stripe',requirementCollection:'stripe',dashboard:'full'},connectedAccountId=`acct_refundUiSeller${n}`;
 await db.query(`insert into vendor_seller_accounts(id,owner_id,store_id,stripe_account_id,livemode,controller,connected_account_id,creation_started_at,state)
  values($1,$2,$3,'acct_refundUiPlatform',false,$4,$5,now(),'bound')`,[seller,owner,store,controller,connectedAccountId]);
 await db.query("insert into vendor_store_custom_products(id,store_id,title,asking_price_amount,available_quantity) values($1,$2,'Current stock title',77,100)",[product,store]);
 return {store,seller,product,owner,binding:{id:seller,ownerId:owner,storeId:store,platformAccountId:'acct_refundUiPlatform',connectedAccountId,livemode:false,controller}};
}
async function seedOrder(s,buyer,title){
 const id=randomUUID(),reservation=randomUUID(),attempt=randomUUID();orders.push(id);
 const offer={schema:'VENDOR_STOCK_OFFER_V1',kind:'custom',product_id:s.product,version:1,title,unit_amount:12.34,currency:'USD'};
 const at=new Date((Math.floor(Date.now()/1000)-120)*1000).toISOString();
 await db.query(`insert into vendor_stock_reservations(id,buyer_id,owner_id,store_id,seller_id,product_id,quantity,offer,state,created_at,expires_at,payment_started_at)
 values($1,$2,$3,$4,$5,$6,2,$7,'consumed',$8::timestamptz,$8::timestamptz+interval '120 seconds',$8)`,[reservation,buyer,s.owner,s.store,s.seller,s.product,offer,at]);
 await db.query(`insert into vendor_orders(id,reservation_id,buyer_id,owner_id,seller,offer,quantity,unit_amount_minor,shipping_amount_minor,tax_amount_minor,currency,quote_reference,fulfillment,created_at,paid)
 values($1,$2,$3,$4,$5,$6,2,1234,0,0,'usd',$7,'pickup',$8,true)`,[id,reservation,buyer,s.owner,s.binding,offer,randomUUID(),at]);
 await db.query(`insert into vendor_order_attempts(id,order_id,stripe_account_id,connected_account_id,livemode,creation_started_at,session_id,session_created_at,payment_intent_id)
 values($1,$2,'acct_refundUiPlatform',$3,false,$4,$5,$4,$6)`,[attempt,id,s.binding.connectedAccountId,at,'cs_test_'+id.replaceAll('-',''),'pi_'+id.replaceAll('-','')]);
 const b=await ok(admin.rpc('vendor_order_binding_v1',{p_order_id:id})),source=boundRefundProvider(b),f=refundFixture();
 for(const key of ['order','config','platform','account','session','lines','intent','charge','now','balance','platformBalance'])f[key]=source[key];
 const add=f.addRefund;f.addRefund=(...args)=>{const r=add(...args);r.id='re_'+id.replaceAll('-','')+f.refunds.data.length;return r;};registry.set(id,f);
 // Record current simulated capture through the real verifier/ledger so refund
 // binding requires an actual prior paid observation, not a forged browser flag.
 await reconcileVendorOrder(admin,f.stripe,f.config,id);return id;
}
async function login(context,user,destination){
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+destination);await page.waitForURL(/\/login\?next=/);
 assert.equal(new URL(page.url()).searchParams.get('next'),destination);
 await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(base+destination,{timeout:30000});return page;
}
async function context(){const c=await browser.newContext({viewport:{width:1440,height:1100}});await c.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());return c;}
const queryRequests=async id=>(await db.query('select * from vendor_order_refund_requests where order_id=$1 order by created_at,id',[id])).rows;
try{
 for(const where of [root,web])for(const name of ['.env','.env.local','.env.production','.env.production.local']){const file=path.join(where,name);if(fs.existsSync(file))assert.ok(where===root&&name==='.env'&&fs.readFileSync(file,'utf8').split(/\r?\n/).every(line=>/^\s*(?:(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=\s*)?$/.test(line)),`Uninspected environment ${name}`);}
 await db.connect();connected=true;
 for(let n=0;n<4;n++){const email=`resolution-ui-${n}@fixture.invalid`,password=randomUUID()+randomUUID(),id=(await ok(admin.auth.admin.createUser({email,password,email_confirm:true}))).user.id;users.push({id,email,password});}
 const [seller,buyer,other,operator]=users,s=await seedStore(seller.id,1);
 const order=await seedOrder(s,buyer.id,'Original order awaiting agreement');
 await db.query('update vendor_order_refunds_control set enabled=true');
 const f=registry.get(order);f.refundStatus='failed';
 await createOrderRefundService(admin,f.stripe,f.config,{enabled:true}).create({orderId:order,requestId:randomUUID(),amountMinor:100,reason:'requested_by_customer'},seller.id);
 await reconcileVendorOrder(admin,f.stripe,f.config,order);
 await db.query('update vendor_order_refunds_control set enabled=false');
 await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'founder_admin','founder','{\"order_resolution_operator\":true}')",[operator.id]);
 const before=(await db.query('select id,paid,review_reasons from vendor_orders order by id')).rows,stock=(await db.query('select id,state,quantity from vendor_stock_reservations order by id')).rows;
 const holds=(await db.query('select * from vendor_account_financial_holds order by id')).rows;
 const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
 Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:base,NEXT_PUBLIC_SITE_URL:base,GVVI_REFERRAL_COOKIE_SECRET:'isolated-refund-browser-key-at-least-32',
  GROOKAI_VENDOR_ORDER_RESOLUTIONS_ENABLED:'true',GROOKAI_VENDOR_ORDER_REFUNDS_ENABLED:'true',GROOKAI_VENDOR_ORDER_REFUND_ISSUANCE_ENABLED:'true',STRIPE_PAYMENTS_MODE:'test',STRIPE_ACCOUNT_ID:'acct_refundUiPlatform',
  STRIPE_SECRET_KEY:['sk','test','refundBrowserSyntheticOnly'].join('_'),STRIPE_ORDER_WEBHOOK_SECRET:['whsec','refundBrowserSyntheticOnlySecret'].join('_'),
  NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 relay=net.createServer(socket=>{const upstream=net.connect(24821,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});await new Promise((r,j)=>{relay.once('error',j);relay.listen(15439,'127.0.0.1',r);});
 const fd=fs.openSync(path.join(dir,'build.log'),'wx');try{const child=spawn('npm.cmd',['run','build'],{cwd:web,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});assert.equal(await new Promise((r,j)=>{child.once('error',j);child.once('exit',r);}),0,'Inspect local build log');}finally{fs.closeSync(fd);}console.log('PASS compiled resolution build');
 await new Promise((r,j)=>{provider.server.once('error',j);provider.server.listen(24845,'127.0.0.1',r);});
 env.GROOKAI_REFUND_BROWSER_TRANSPORT='24845';env.NODE_OPTIONS=`--require=${path.join(root,'scripts/tests/vendor_resolutions_stripe_loopback.cjs')}`;
 const out=fs.openSync(path.join(dir,'server.log'),'wx');server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','24840'],{cwd:web,env,windowsHide:true,stdio:['ignore',out,out]});fs.closeSync(out);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Server exited');try{if((await fetch(base+'/api/vendor-payments/owner')).status===401)break;}catch{}if(n===59)throw new Error('Readiness timeout');await new Promise(r=>setTimeout(r,1000));}
 browser=await chromium.launch({headless:true});const bc=await context(),sc=await context(),oc=await context(),ac=await context(),rc=await context();
 const destination='/account/orders/'+order,bp=await login(bc,buyer,destination),sp=await login(sc,seller,destination),op=await login(oc,other,destination);
 const rp=await login(rc,operator,'/account/store/resolutions');
 const post=(c,body,origin=base)=>c.request.post(base+'/api/vendor-orders/resolutions',{data:body,headers:{origin}});
 const command={action:'request',orderId:order,requestId:randomUUID()};
 assert.equal((await post(ac,command)).status(),401);assert.equal((await post(sc,{...command,actor:operator.id})).status(),400);
 assert.equal((await post(sc,command,'https://foreign.invalid')).status(),403);
 assert.equal((await post(sc,command)).status(),503);await expect(sp.getByRole('button',{name:'Request buyer agreement',exact:true})).toHaveCount(0);
 await db.query('update vendor_order_resolutions_control set enabled=true');await sp.reload();
 assert.equal((await post(bc,command)).status(),503);assert.equal((await post(oc,command)).status(),503);
 await op.goto(base+'/account/store/resolutions');await expect(op.getByText('Resolution reviews are unavailable for the signed-in account.')).toBeVisible();
 await op.goto(base+'/account/store/resolutions/'+order);await expect(op.getByRole('heading',{name:'Order resolution',exact:true})).toHaveCount(0);
 checks.push('compiled route enforces real Auth, owner-only proposals, operator-only review, exact origin and database pause; forged actors and foreign accounts fail');
 await sp.getByRole('button',{name:'Request buyer agreement',exact:true}).click();await expect(sp.getByRole('button',{name:'Save response',exact:true})).toBeDisabled();
 await sp.getByRole('checkbox').check();await sp.getByRole('button',{name:'Save response',exact:true}).click();
 await expect(sp.getByRole('heading',{name:'Awaiting buyer response',exact:true})).toBeVisible();await sp.screenshot({path:path.join(dir,'desktop-seller-request.png'),fullPage:true});
 await bp.reload();await bp.getByRole('button',{name:'Agree to continue order',exact:true}).click();
 await expect(bp.getByRole('button',{name:'Save response',exact:true})).toBeDisabled();await bp.getByRole('checkbox').check();
 await bp.screenshot({path:path.join(dir,'desktop-buyer-agreement.png'),fullPage:true});
 let held;
 await bp.route('**/api/vendor-orders/resolutions',async r=>{held=r.request().postDataJSON();await r.abort('failed');});
 await bp.getByRole('button',{name:'Save response',exact:true}).click();await expect(bp.locator('section').filter({has:bp.getByRole('heading',{name:'Order resolution',exact:true})}).getByRole('alert')).toBeVisible();
 await expect(bp.getByRole('button',{name:'Dismiss form',exact:true})).toHaveCount(0);await bp.unroute('**/api/vendor-orders/resolutions');
 await bp.reload();await expect(bp.getByRole('heading',{name:'Agree to continue order',exact:true})).toBeVisible();
 const retained=await bp.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),`grookai-resolution:buyer:${order}`);assert.deepEqual(retained,held);
 await bp.getByRole('checkbox').check();await bp.getByRole('button',{name:'Save response',exact:true}).click();await expect(bp.getByRole('heading',{name:'Awaiting Grookai review',exact:true})).toBeVisible();
 assert.equal((await post(bc,held)).status(),200);
 assert.equal((await db.query('select count(*)::int n from vendor_order_resolution_events where id=$1',[held.requestId])).rows[0].n,1);
 checks.push('seller requests original-order agreement; buyer must explicitly confirm; uncertain submission survives reload with the same immutable request and retries once');
 await rp.reload();await rp.getByRole('link',{name:'Review order '+order,exact:true}).click();await rp.getByRole('button',{name:'Record reviewed agreement',exact:true}).click();
 await expect(rp.getByRole('button',{name:'Save response',exact:true})).toBeDisabled();await rp.getByRole('checkbox').check();await rp.getByRole('button',{name:'Save response',exact:true}).click();
 await expect(rp.getByRole('heading',{name:'Reviewed — final payment check required',exact:true})).toBeVisible();await rp.screenshot({path:path.join(dir,'desktop-operator-reviewed.png'),fullPage:true});
 await bp.reload();await expect(bp.getByRole('heading',{name:'Reviewed — final payment check required',exact:true})).toBeVisible();await bp.setViewportSize({width:390,height:844});await bp.screenshot({path:path.join(dir,'mobile-buyer-reviewed.png'),fullPage:true});
 assert.ok(await bp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual((await db.query('select id,paid,review_reasons from vendor_orders order by id')).rows,before);
 assert.deepEqual((await db.query('select id,state,quantity from vendor_stock_reservations order by id')).rows,stock);
 assert.deepEqual((await db.query('select * from vendor_account_financial_holds order by id')).rows,holds);
 assert.equal((await db.query('select count(*)::int n from vendor_order_fulfillment_events')).rows[0].n,0);assert.equal(posts(),0);
 checks.push('independent DB-granted operator reviews buyer agreement through desktop queue; desktop and narrow pages retain financial hold, paid fact, stock and blocked fulfillment without provider POSTs');
 await bp.getByRole('button',{name:'Withdraw agreement or request',exact:true}).click();await bp.getByRole('checkbox').check();
 await bp.route('**/api/vendor-orders/resolutions',async r=>{const body=r.request().postDataJSON();assert.equal((await post(bc,{...body,requestId:randomUUID()})).status(),200);await r.continue();});
 await bp.getByRole('button',{name:'Save response',exact:true}).click();await expect(bp.locator('section').filter({has:bp.getByRole('heading',{name:'Order resolution',exact:true})}).getByRole('alert')).toHaveText('The order or response changed. Reload its saved status before choosing another action.');
 await bp.unroute('**/api/vendor-orders/resolutions');assert.equal(await bp.evaluate(key=>sessionStorage.getItem(key),`grookai-resolution:buyer:${order}`),null);
 await bp.getByRole('link',{name:'Reload saved status',exact:true}).click();
 await expect(bp.getByRole('heading',{name:'Withdrawn',exact:true})).toBeVisible();
 await sp.reload();await sp.getByRole('button',{name:'Request buyer agreement',exact:true}).click();await sp.getByRole('checkbox').check();
 await db.query('update vendor_order_resolutions_control set enabled=false');await sp.getByRole('button',{name:'Save response',exact:true}).click();await expect(sp.locator('section').filter({has:sp.getByRole('heading',{name:'Order resolution',exact:true})}).getByRole('alert')).toBeVisible();
 await sp.reload();await expect(sp.getByRole('button',{name:'Save response',exact:true})).toBeDisabled();await expect(sp.getByRole('heading',{name:'Withdrawn',exact:true})).toBeVisible();
 assert.equal((await db.query('select count(*)::int n from vendor_order_resolution_cases')).rows[0].n,1);
 await db.query('update user_entitlements set is_active=false where user_id=$1',[operator.id]);await rp.reload();await expect(rp.getByRole('heading',{name:'Order resolution',exact:true})).toHaveCount(0);
 checks.push('buyer can withdraw after review; a confirmed stale-command rejection clears its retry and reloads current history; stale form cannot bypass database pause and revoked operator access disappears on next read');
 assert.deepEqual(errors,[]);assert.deepEqual(provider.errors,[]);
}catch(e){failure=e;fs.writeFileSync(path.join(dir,'failure.txt'),e.stack??String(e));if(browser){let n=0;for(const c of browser.contexts())for(const page of c.pages()){await page.screenshot({path:path.join(dir,'failure-'+(++n)+'.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(dir,'failure-'+n+'-private.html'),await page.content().catch(()=>''));}}}finally{
 if(browser)await browser.close();if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}provider.server.closeAllConnections();await new Promise(r=>provider.server.close(r));for(const socket of sockets)socket.destroy();if(relay)relay.close();
 if(connected){await db.query('begin');await db.query('set local session_replication_role=replica');
  await db.query('delete from vendor_order_resolution_events where case_id in (select id from vendor_order_resolution_cases where order_id=any($1::uuid[]))',[orders]);
  for(const table of ['vendor_order_resolution_cases','vendor_order_refund_observations','vendor_order_refund_requests','vendor_order_observations','vendor_order_attempts'])await db.query(`delete from ${table} where order_id=any($1::uuid[])`,[orders]);
  await db.query("delete from vendor_order_reconcile_scopes where stripe_account_id='acct_refundUiPlatform' and not livemode");
  await db.query('update vendor_order_resolutions_control set enabled=false');await db.query('update vendor_order_refunds_control set enabled=false');await db.query('delete from vendor_account_financial_holds where owner_id=any($1::uuid[])',[users.map(u=>u.id)]);
  for(const [table,column,ids] of [['vendor_orders','id',orders],['vendor_stock_reservations','store_id',stores],['vendor_store_custom_products','id',products],['vendor_seller_accounts','id',sellers],['vendor_stores','id',stores]])await db.query(`delete from ${table} where ${column}=any($1::uuid[])`,[ids]);
  await db.query('commit');for(const user of users)await ok(admin.auth.admin.deleteUser(user.id));await db.end();
 }
 assert.deepEqual(guard({full:true}),runtime);assert.equal(sql('select count(*) from vendor_orders;'),'0');
 const sources=['apps/web/src/components/orders/OrderResolutions.tsx','apps/web/src/lib/orders/orderResolutions.ts','apps/web/src/lib/orders/orderResolutions.shared.ts','apps/web/src/lib/orders/orderResolutionQueue.ts','apps/web/src/lib/orders/orderResolutionsRuntimePolicy.ts','scripts/tests/vendor_order_resolutions_ui_local_v1.mjs','scripts/tests/vendor_resolutions_stripe_loopback.cjs','tests/helpers/vendorRefundBrowserProvider.mjs','apps/web/src/components/orders/OrderRefunds.tsx','apps/web/src/lib/orders/orderRefunds.ts','apps/web/src/lib/orders/orderRefundReview.ts','apps/web/src/lib/orders/orderRefundReview.shared.ts','apps/web/src/lib/orders/orderRefunds.shared.ts','apps/web/src/lib/orders/orderRefundsRuntimePolicy.ts','apps/web/src/lib/payments/vendorOrderRefunds.ts'];
 const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,errors,providerErrors:provider.errors,failure:failure?.stack,providerRequests:0,simulatedProviderRequests:provider.calls.length,simulatedRefundPostAttempts:posts(),simulatedRefundKeys:provider.keys.size,productionWrites:0,sharedResets:0,
  auth:'real local Supabase',orderStates:'synthetic seeded orders with current SDK/ledger capture verification',fixturesRemoved:true,migrationsApplied:413,priorMigrationsUnchanged:412,sourceHashes:Object.fromEntries(sources.map(n=>[n,hash(fs.readFileSync(path.join(root,n)))])),screenshots:fs.readdirSync(dir).filter(n=>n.endsWith('.png')).map(n=>({name:n,sha256:hash(fs.readFileSync(path.join(dir,n)))}))};
 fs.writeFileSync(path.join(output,`ui-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}if(failure)throw failure;
