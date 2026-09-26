// Compiled web + real local Auth/PostgREST + real SDK through a fixed loopback
// provider simulator. Never a Stripe-account proof or production smoke test.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {root,fixture,project,hash,guard,sql} from '../schema/vendor_order_notifications_runtime_v2.mjs';
import {boundRefundProvider,refundBrowserProvider} from '../../tests/helpers/vendorRefundBrowserProvider.mjs';
import {reconcileVendorOrder} from '../../apps/web/src/lib/payments/vendorOrderService.ts';
assert.equal(process.argv.length,2);const runtime=guard({full:true});assert.equal(sql('select count(*) from vendor_orders;'),'0');
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js'),{chromium,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:30000});
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:24021');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'24022');
const api=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}),admin=api(cfg.SECRET_KEY);
const db=new Client({connectionString:cfg.DB_URL,statement_timeout:15000}),web=path.join(root,'apps/web'),base='http://127.0.0.1:24040';
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),dir=path.join(fixture,`refund-ui-${stamp}`),output=path.join(root,'docs/audits/vendor_order_refund_review_v1');fs.mkdirSync(dir);
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
 const b=await ok(admin.rpc('vendor_order_binding_v1',{p_order_id:id})),f=boundRefundProvider(b);registry.set(id,f);
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
 for(let n=0;n<3;n++){const email=`refund-ui-${n}@fixture.invalid`,password=randomUUID()+randomUUID(),id=(await ok(admin.auth.admin.createUser({email,password,email_confirm:true}))).user.id;users.push({id,email,password});}
 const [seller,buyer,other]=users,s=await seedStore(seller.id,1);
 const partial=await seedOrder(s,buyer.id,'Partial refund fixture'),lost=await seedOrder(s,buyer.id,'Interrupted refund fixture'),paused=await seedOrder(s,buyer.id,'Paused refund fixture');
 const before=(await db.query('select id,paid from vendor_orders order by id')).rows,stock=(await db.query('select id,state,quantity from vendor_stock_reservations order by id')).rows;
 const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
 Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:base,NEXT_PUBLIC_SITE_URL:base,GVVI_REFERRAL_COOKIE_SECRET:'isolated-refund-browser-key-at-least-32',
  GROOKAI_VENDOR_ORDER_REFUNDS_ENABLED:'true',GROOKAI_VENDOR_ORDER_REFUND_ISSUANCE_ENABLED:'true',STRIPE_PAYMENTS_MODE:'test',STRIPE_ACCOUNT_ID:'acct_refundUiPlatform',
  STRIPE_SECRET_KEY:['sk','test','refundBrowserSyntheticOnly'].join('_'),STRIPE_ORDER_WEBHOOK_SECRET:['whsec','refundBrowserSyntheticOnlySecret'].join('_'),
  NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 relay=net.createServer(socket=>{const upstream=net.connect(24021,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});await new Promise((r,j)=>{relay.once('error',j);relay.listen(15439,'127.0.0.1',r);});
 const fd=fs.openSync(path.join(dir,'build.log'),'wx');try{const child=spawn('npm.cmd',['run','build'],{cwd:web,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});assert.equal(await new Promise((r,j)=>{child.once('error',j);child.once('exit',r);}),0,'Inspect local build log');}finally{fs.closeSync(fd);}console.log('PASS compiled refund build');
 await new Promise((r,j)=>{provider.server.once('error',j);provider.server.listen(24045,'127.0.0.1',r);});
 env.GROOKAI_REFUND_BROWSER_TRANSPORT='24045';env.NODE_OPTIONS=`--require=${path.join(root,'scripts/tests/vendor_refund_review_stripe_loopback.cjs')}`;
 const out=fs.openSync(path.join(dir,'server.log'),'wx');server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','24040'],{cwd:web,env,windowsHide:true,stdio:['ignore',out,out]});fs.closeSync(out);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Server exited');try{if((await fetch(base+'/api/vendor-payments/owner')).status===401)break;}catch{}if(n===59)throw new Error('Readiness timeout');await new Promise(r=>setTimeout(r,1000));}
 browser=await chromium.launch({headless:true});const bc=await context(),sc=await context(),oc=await context(),ac=await context();
 const bp=await login(bc,buyer,'/account/orders/'+partial),sp=await login(sc,seller,'/account/orders/'+partial);await login(oc,other,'/account/orders/'+partial);
 const command={action:'create',orderId:partial,requestId:randomUUID(),amountMinor:1000,reason:'requested_by_customer'};
 const post=(c,body,origin=base)=>c.request.post(base+'/api/vendor-orders/refunds',{data:body,headers:{origin}});
 assert.equal((await post(sc,command)).status(),503);assert.equal(posts(),0);await expect(sp.getByRole('button',{name:'Prepare a refund',exact:true})).toHaveCount(0);
 for(const [c,expected] of [[bc,503],[oc,503],[ac,401]])assert.equal((await post(c,command)).status(),expected);
 assert.equal((await post(sc,{...command,owner:seller.id})).status(),400);assert.equal((await post(sc,command,'https://foreign.invalid')).status(),403);assert.equal(posts(),0);
 checks.push('compiled refund route uses actual cookie Auth; anonymous/buyer/foreign/forged origin and owner are denied; database control blocks provider creation');
 await db.query('update vendor_order_refunds_control set enabled=true');await sp.reload();await bp.reload();
 await expect(bp.getByRole('button',{name:'Prepare a refund',exact:true})).toHaveCount(0);
 await sp.getByRole('button',{name:'Prepare a refund',exact:true}).click();await sp.getByLabel('Refund amount (USD)',{exact:true}).fill('10.00');
  await expect(sp.getByRole('button',{name:'Confirm refund',exact:true})).toBeDisabled();await sp.getByRole('checkbox').check();
  for(const invalid of ['0','1.001','24.69']){await sp.getByLabel('Refund amount (USD)',{exact:true}).fill(invalid);await expect(sp.getByRole('button',{name:'Confirm refund',exact:true})).toBeDisabled();}
  await sp.getByLabel('Refund amount (USD)',{exact:true}).fill('10.00');
 await sp.screenshot({path:path.join(dir,'desktop-confirm-partial-refund.png'),fullPage:true});
 await sp.getByRole('button',{name:'Confirm refund',exact:true}).click();await expect(sp.getByRole('region',{name:'Order refunds'}).getByText('$10.00 · Refund sent',{exact:true})).toBeVisible();
 let rows=await queryRequests(partial);assert.equal(rows.length,1);assert.equal(rows[0].status,'succeeded');assert.equal(rows[0].amount_minor,'1000');assert.equal(posts(),1);
 const retry={...command,requestId:rows[0].id};assert.equal((await post(sc,retry)).status(),200);assert.equal(posts(),1);
  await bp.reload();await expect(bp.getByRole('region',{name:'Order refunds'}).locator('dl dd').first()).toHaveText('$10.00');
  await expect(bp.getByRole('heading',{name:'Partially refunded',exact:true})).toBeVisible();
 await expect(bp.getByRole('button',{name:'Check refund status',exact:true})).toHaveCount(0);
 checks.push('desktop confirmation issues one partial refund through compiled API, real SDK simulator and SQL; same request retries GET-only; buyer sees verified totals without controls');
 await sp.getByRole('button',{name:'Prepare a refund',exact:true}).click();await expect(sp.getByLabel('Refund amount (USD)',{exact:true})).toHaveValue('14.68');
 await sp.getByRole('checkbox').check();await sp.getByRole('button',{name:'Confirm refund',exact:true}).click();
  await expect(sp.getByRole('region',{name:'Order refunds'}).locator('dl dd').first()).toHaveText('$24.68');assert.equal((await queryRequests(partial)).length,2);assert.equal(posts(),2);
  await expect(sp.getByRole('button',{name:'Prepare a refund',exact:true})).toHaveCount(0);await expect(sp.getByText('No refundable amount is currently available.',{exact:true})).toBeVisible();
  await bp.reload();await bp.setViewportSize({width:390,height:844});await expect(bp.getByRole('region',{name:'Order refunds'}).locator('dl dd').first()).toHaveText('$24.68');assert.ok(await bp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await expect(bp.getByRole('heading',{name:'Fully refunded',exact:true})).toBeVisible();
 await bp.screenshot({path:path.join(dir,'mobile-buyer-full-refund.png'),fullPage:true});
 checks.push('remaining refundable amount is freshly calculated; full balance refund is persisted and displayed to buyer at mobile width without horizontal overflow');
 await sp.goto(base+'/account/orders/'+lost);await sp.getByRole('button',{name:'Prepare a refund',exact:true}).click();await sp.getByLabel('Refund amount (USD)',{exact:true}).fill('5.00');await sp.getByRole('checkbox').check();provider.loseNextResponse();
 await sp.getByRole('button',{name:'Confirm refund',exact:true}).click();await expect(sp.getByRole('region',{name:'Order refunds'}).getByRole('alert')).toBeVisible({timeout:30000});
 rows=await queryRequests(lost);assert.equal(rows.length,1);assert.equal(rows[0].status,'unbound');assert.equal(registry.get(lost).refunds.data.length,1);
 const saved=await sp.evaluate(id=>JSON.parse(sessionStorage.getItem('grookai-refund:'+id)),lost);assert.equal(saved.requestId,rows[0].id);const posted=posts();
 await sp.reload();await sp.getByRole('button',{name:'Resume same refund request',exact:true}).click();await expect(sp.getByLabel('Refund amount (USD)',{exact:true})).toHaveValue('5.00');await expect(sp.getByLabel('Refund amount (USD)',{exact:true})).toBeDisabled();
 // Expire only this synthetic lease; avoid a two-minute wall-clock wait.
 await db.query("update vendor_order_refund_requests set lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[rows[0].id]);
 await db.query('update vendor_order_refunds_control set enabled=false');
 await sp.getByRole('button',{name:'Check this request',exact:true}).click();await expect(sp.getByRole('region',{name:'Order refunds'}).getByText('$5.00 · Refund sent',{exact:true})).toBeVisible();
 assert.equal(posts(),posted);assert.equal((await queryRequests(lost))[0].id,rows[0].id);assert.equal((await queryRequests(lost))[0].status,'succeeded');
 assert.equal(await sp.evaluate(id=>sessionStorage.getItem('grookai-refund:'+id),lost),null);
 checks.push('lost provider response retains one command despite SDK retries; reload resumes same immutable request; current GET evidence recovers with issuance disabled and no additional POST');
 // Review is read-only, including with issuance/store/package flags disabled.
 const reviewAction={action:'review',orderId:lost},providerReads=provider.calls.length;
 for(const [c,status] of [[bc,503],[oc,503],[ac,401]])assert.equal((await post(c,reviewAction)).status(),status);
 assert.equal((await post(sc,{...reviewAction,permitsFulfillment:true})).status(),400);
 assert.equal((await post(sc,reviewAction,'https://foreign.invalid')).status(),403);
 assert.equal(provider.calls.length,providerReads);
 await expect(bp.getByRole('button',{name:'Review refund outcome',exact:true})).toHaveCount(0);
 const lf=registry.get(lost);lf.refunds.data[0].status='failed';lf.charge.amount_refunded=0;lf.charge.refunded=false;
 assert.equal((await post(sc,{action:'refresh',orderId:lost,requestId:rows[0].id})).status(),200);
 await sp.reload();
 const history=async()=>({requests:await queryRequests(lost),holds:(await db.query('select * from vendor_account_financial_holds order by owner_id,reason,reference_id')).rows,
  observations:(await db.query('select * from vendor_order_refund_observations where order_id=$1 order by evidence_hash',[lost])).rows});
 const retained=await history(),postCount=posts();
 const rr=await post(sc,reviewAction),reviewDto=await rr.json();assert.equal(rr.status(),200);
 assert.equal(rr.headers()['cache-control'],'private, no-store');assert.equal(reviewDto.decision,'operator_review_required');
 assert.equal(reviewDto.permitsFulfillment,false);assert.equal(reviewDto.clearsFinancialHolds,false);
 assert.doesNotMatch(JSON.stringify(reviewDto),/acct_|pi_|ch_|lease|requestId|reasons/);
 await sp.getByRole('button',{name:'Review refund outcome',exact:true}).click();
 const panel=sp.getByRole('region',{name:'Refund outcome review'});
 await expect(panel.getByRole('heading',{name:'Refund outcome needs Grookai review',exact:true})).toBeVisible();
 await expect(panel.getByText('Financial holds remain in place. This review does not approve shipping, pickup, or another refund.',{exact:true})).toBeVisible();
 await expect(panel.locator('dl dd').nth(2)).toHaveText('$5.00');
 await sp.screenshot({path:path.join(dir,'desktop-failed-refund-review.png'),fullPage:true});
 await sp.setViewportSize({width:390,height:844});assert.ok(await sp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await sp.screenshot({path:path.join(dir,'mobile-failed-refund-review.png'),fullPage:true});await sp.setViewportSize({width:1440,height:1100});
 assert.deepEqual(await history(),retained);assert.equal(posts(),postCount);
 checks.push('compiled owner-only outcome review verifies failed refund with issuance disabled; private response and desktop/mobile panel disclose no provider identity and leave all requests, observations, holds and fulfillment unchanged');
 // A new check replaces the old snapshot, even when the response fails validation.
 await sp.route('**/api/vendor-orders/refunds',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...reviewDto,permitsFulfillment:true})}),{times:1});
 await sp.getByRole('button',{name:'Review refund outcome',exact:true}).click();
 await expect(sp.getByText('Refund review could not be loaded. Try reviewing again.',{exact:true})).toBeVisible();await expect(panel).toHaveCount(0);
 lf.refunds.data[0].status='pending';
 await sp.getByRole('button',{name:'Review refund outcome',exact:true}).click();
 await expect(panel.getByRole('heading',{name:'Refund needs further attention',exact:true})).toBeVisible();
 await expect(panel.getByText('A refund is still processing or needs attention.',{exact:true})).toBeVisible();
 await expect(panel.locator('dl dd').nth(1)).toHaveText('$5.00');assert.deepEqual(await history(),retained);
 await sp.screenshot({path:path.join(dir,'desktop-pending-refund-review.png'),fullPage:true});assert.equal(posts(),postCount);
 checks.push('new review drops the previous snapshot, rejects a forged fulfillment flag, then displays current pending evidence without overwriting retained failed history or making another refund');
 await db.query('update vendor_order_refunds_control set enabled=true');await sp.goto(base+'/account/orders/'+paused);await sp.getByRole('button',{name:'Prepare a refund',exact:true}).click();await sp.getByRole('checkbox').check();
 await db.query('update vendor_order_refunds_control set enabled=false');await sp.getByRole('button',{name:'Confirm refund',exact:true}).click();await expect(sp.getByRole('region',{name:'Order refunds'}).getByRole('alert')).toBeVisible();
 assert.equal(posts(),posted);assert.equal((await queryRequests(paused)).length,0);
 assert.deepEqual((await db.query('select id,paid from vendor_orders order by id')).rows,before);assert.deepEqual((await db.query('select id,state,quantity from vendor_stock_reservations order by id')).rows,stock);
 await sp.screenshot({path:path.join(dir,'desktop-paused-refund.png'),fullPage:true});
 checks.push('stale enabled browser form cannot bypass database pause; refund flow never changes paid fact, stock state or quantity; all store/acquisition/package controls remain absent or off');
 assert.deepEqual(errors,[]);assert.deepEqual(provider.errors,[]);
}catch(e){failure=e;if(browser){let n=0;for(const c of browser.contexts())for(const page of c.pages()){await page.screenshot({path:path.join(dir,'failure-'+(++n)+'.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(dir,'failure-'+n+'-private.html'),await page.content().catch(()=>''));}}}finally{
 if(browser)await browser.close();if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}provider.server.closeAllConnections();await new Promise(r=>provider.server.close(r));for(const socket of sockets)socket.destroy();if(relay)relay.close();
 if(connected){await db.query('begin');await db.query('set local session_replication_role=replica');
  for(const table of ['vendor_order_refund_observations','vendor_order_refund_requests','vendor_order_observations','vendor_order_attempts'])await db.query(`delete from ${table} where order_id=any($1::uuid[])`,[orders]);
  await db.query('update vendor_order_refunds_control set enabled=false');await db.query('delete from vendor_account_financial_holds where owner_id=any($1::uuid[])',[users.map(u=>u.id)]);
  for(const [table,column,ids] of [['vendor_orders','id',orders],['vendor_stock_reservations','store_id',stores],['vendor_store_custom_products','id',products],['vendor_seller_accounts','id',sellers],['vendor_stores','id',stores]])await db.query(`delete from ${table} where ${column}=any($1::uuid[])`,[ids]);
  await db.query('commit');for(const user of users)await ok(admin.auth.admin.deleteUser(user.id));await db.end();
 }
 assert.deepEqual(guard({full:true}),runtime);assert.equal(sql('select count(*) from vendor_orders;'),'0');
 const sources=['scripts/tests/vendor_order_refund_review_ui_local_v1.mjs','scripts/tests/vendor_refund_review_stripe_loopback.cjs','tests/helpers/vendorRefundBrowserProvider.mjs','apps/web/src/components/orders/OrderRefunds.tsx','apps/web/src/lib/orders/orderRefunds.ts','apps/web/src/lib/orders/orderRefundReview.ts','apps/web/src/lib/orders/orderRefundReview.shared.ts','apps/web/src/lib/orders/orderRefunds.shared.ts','apps/web/src/lib/orders/orderRefundsRuntimePolicy.ts','apps/web/src/lib/payments/vendorOrderRefunds.ts'];
 const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,errors,providerErrors:provider.errors,failure:failure?.stack,providerRequests:0,simulatedProviderRequests:provider.calls.length,simulatedRefundPostAttempts:posts(),simulatedRefundKeys:provider.keys.size,productionWrites:0,sharedResets:0,
  auth:'real local Supabase',orderStates:'synthetic seeded orders with current SDK/ledger capture verification',fixturesRemoved:true,migrationsApplied:412,priorMigrationsUnchanged:412,sourceHashes:Object.fromEntries(sources.map(n=>[n,hash(fs.readFileSync(path.join(root,n)))])),screenshots:fs.readdirSync(dir).filter(n=>n.endsWith('.png')).map(n=>({name:n,sha256:hash(fs.readFileSync(path.join(dir,n)))}))};
 fs.writeFileSync(path.join(output,`ui-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}if(failure)throw failure;
