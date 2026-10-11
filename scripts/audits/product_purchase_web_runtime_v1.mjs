// Fresh synthetic browser-to-API purchase proof. Retain every consumed fixture.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import net from 'node:net';
import {randomUUID, createHash} from 'node:crypto';
import {execFileSync, spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {confirmedPurchaseReceipt} from '../../apps/web/src/lib/sales/salesPurchase.mjs';

const root='C:/gv_product_buy_20261007',base='C:/grookai_vault_operator_artifacts/product_buy_20261007';
const lab=base+'/full-432-v1',project='product-buy-full-432-v1-20261007';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,2);
const read=p=>JSON.parse(fs.readFileSync(p)),hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(read(base+'/CHECKPOINT.json').sourceFrozen,false);
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(replay.status,'passed');assert.equal(replay.migrations,432);assert.equal(freeze.project,project);
assert.ok(replay.fullReplay&&replay.noOpPush&&!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const[name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest,name);
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:33281');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);
assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const port of[33280,33281])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const port=33451,origin='http://127.0.0.1:'+port;
await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(resolve));});
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33280/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,432);
const out=base+'/web-runtime-'+Date.now();fs.mkdirSync(out);const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2));
const web=createRequire(root+'/apps/web/package.json'),{createServerClient}=web('@supabase/ssr'),{chromium,expect}=web('@playwright/test');
const auth={persistSession:false,autoRefreshToken:false},admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth});
const fixture={project,email:randomUUID()+'@purchase-browser.invalid',password:randomUUID()+'Aa9!',set:randomUUID(),card:randomUUID(),printing:randomUUID(),owner:null};
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots'];
const canon=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const retained={};for(const table of tables)retained[table]=await q(`select to_jsonb(t) row from ${table} t`);
const flags=(await q('select (select enabled from vendor_purchase_control) purchase,(select enabled from vendor_sales_cart_control) cart,(select enabled from vendor_receipt_cloud_control) cloud,(select capture_enabled from vendor_cost_evidence_control) capture,(select edit_enabled from vendor_cost_evidence_control) edit'))[0];
assert.deepEqual(flags,{purchase:false,cart:false,cloud:false,capture:false,edit:false});
save('intent.private.json',{at:new Date().toISOString(),consumed:true,fixture,flags,retained,productionWrites:0});
const env={};for(const[k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
assert.equal(fs.readdirSync(root+'/apps/web').some(name=>name.startsWith('.env')),false);
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,
    NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SALES_PURCHASE_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,NODE_USE_SYSTEM_CA:'1'});
const log=fs.openSync(out+'/server.private.log','wx');let server,stopped,browser,page,token,cookies=[],failure=null,result=null,controlsRestored=false;
const checks=[];
async function api(query={},body=null,authenticated=true){
    const response=await fetch(origin+'/api/sales/desk?'+new URLSearchParams(query),{method:body?'POST':'GET',headers:{Connection:'close',...(authenticated?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000),redirect:'error'});
    assert.match(response.headers.get('cache-control')??'',/private, no-store/);return {status:response.status,body:await response.json()};
}
async function ready(){for(let i=0;i<60;i++){assert.equal(server.exitCode,null);try{if((await api({},null,false)).status===401)return;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}throw Error('Purchase server unavailable');}
try{
    const made=await admin.auth.admin.createUser({email:fixture.email,password:fixture.password,email_confirm:true});assert.equal(made.error,null);fixture.owner=made.data.user.id;save('fixture.private.json',fixture);
    const client=createServerClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{for(const value of values){cookies=cookies.filter(c=>c.name!==value.name);cookies.push(value);}}}});
    const signed=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});assert.equal(signed.error,null);assert.equal(signed.data.user.id,fixture.owner);token=signed.data.session.access_token;
    await q('begin');
    await q("insert into sets(id,code,name,game) values($1,$2,'Browser purchase set','pokemon')",[fixture.set,fixture.set]);
    await q("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,$3,'1',$4,'missing')",[fixture.card,fixture.set,'Browser purchase '+fixture.card.slice(0,8),'GV-PK-BUY-'+fixture.card]);
    await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[fixture.printing,fixture.card,'GV-PK-BUY-'+fixture.card+'-STD']);
    await q('update vendor_purchase_control set enabled=true');await q('update vendor_sales_cart_control set enabled=true');await q('update vendor_receipt_cloud_control set enabled=true');await q('commit');
    server=spawn(process.execPath,['--use-system-ca',root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'/apps/web',env,stdio:['ignore',log,log],windowsHide:true});stopped=new Promise(resolve=>server.once('exit',resolve));await ready();
    const session=await api();assert.equal(session.status,200);assert.equal(session.body.owner,fixture.owner);assert.equal(session.body.purchases,true);
    browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}});await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,sameSite:'Lax'})));
    page=await context.newPage();page.setDefaultTimeout(30000);await page.goto(origin+'/account/store/sales',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'New buy',exact:true}).click();await page.getByText('Store & private note',{exact:true}).click();await page.getByLabel('Store name',{exact:true}).fill('Browser purchase shop');await page.getByLabel('Private purchase note').fill('PRIVATE PURCHASE NOTE');
    await page.getByRole('textbox',{name:'Find incoming card',exact:true}).fill('Browser purchase '+fixture.card.slice(0,8));
    await page.getByRole('button',{name:'Choose printing',exact:true}).click();await page.getByRole('combobox',{name:'Exact printing',exact:true}).selectOption(fixture.printing);await page.getByRole('combobox',{name:'Condition',exact:true}).selectOption('LP');
    await page.getByLabel('Agreed price per item (USD)',{exact:true}).fill('6.50');await page.getByLabel('Add this copy to my Vault when the purchase completes').check();await page.getByRole('button',{name:'Add to purchase',exact:true}).click();
    await expect(page.getByText('Adds one Vault copy on completion',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Adds one Vault copy on completion',{exact:true})).toBeVisible();
    assert.equal((await q('select count(*)::int n from vault_item_instances where user_id=$1',[fixture.owner]))[0].n,0);
    await page.screenshot({path:out+'/held-purchase-phone.png',fullPage:true});checks.push('Actual authenticated catalog, exact printing, condition and held-offer reload create no early inventory');
    let savedRequest,recorded,intercepted=0,interceptionFailure=null,finishInterception;
    const interception=new Promise(resolve=>{finishInterception=resolve;});
    await page.route('**/api/sales/desk?**',async route=>{
        if(route.request().method()!=='POST')return route.continue();
        try{
            const body=route.request().postDataJSON();assert.equal(body.action,'purchase');intercepted++;assert.equal(intercepted,1);
            savedRequest={id:body.id,cart:body.cart};const response=await route.fetch();assert.equal(response.status(),200);recorded=confirmedPurchaseReceipt((await response.json()).result,savedRequest);save('recorded.private.json',{request:savedRequest,receipt:recorded});await route.abort('failed');
        }catch(error){interceptionFailure={name:error.name,message:error.message.split('\n')[0]};await route.abort('failed').catch(()=>{});}
        finally{finishInterception();}
    });
    await page.getByRole('button',{name:'Review purchase',exact:true}).click();await page.getByRole('button',{name:'Exchange completed · Record purchase'}).click();
    let interceptionTimer;try{await Promise.race([interception,new Promise((_,reject)=>{interceptionTimer=setTimeout(()=>reject(Error('Purchase interception did not finish')),90000);})]);}finally{clearTimeout(interceptionTimer);}
    assert.equal(interceptionFailure,null);await expect(page.getByRole('button',{name:'Recover this purchase',exact:true})).toBeVisible();
    assert.ok(recorded);const pending=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).pending,'grookai.sales-desk.v2.'+fixture.owner);assert.deepEqual(pending,savedRequest);
    const copies=await q('select id,acquisition_cost::text amount,acquisition_currency currency from vault_item_instances where user_id=$1',[fixture.owner]);assert.equal(copies.length,1);assert.equal(copies[0].id,recorded.items[0].instanceId);assert.equal(Number(copies[0].amount),6.5);assert.equal(copies[0].currency,'USD');
    await q('begin');await q('update vendor_purchase_control set enabled=false');await q('update vendor_sales_cart_control set enabled=false');await q('update vendor_receipt_cloud_control set enabled=false');await q('commit');
    await page.reload();await expect(page.getByText('Purchase recorded · '+recorded.number,{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'New buy',exact:true})).toBeDisabled();await page.screenshot({path:out+'/recovered-purchase-phone.png',fullPage:true});
    await page.getByRole('button',{name:'Seller view',exact:true}).click();const seller=page.getByRole('dialog',{name:'Seller offer'});await expect(seller).toContainText('You receive $6.50');await expect(seller).not.toContainText('PRIVATE');await seller.screenshot({path:out+'/seller-receipt-phone.png'});await page.getByRole('button',{name:'Close seller view',exact:true}).click();
    const retried=await api({}, {action:'purchase',owner:fixture.owner,...savedRequest});assert.equal(retried.status,200);assert.deepEqual(retried.body.result,recorded);
    const changed=structuredClone(savedRequest);changed.cart.note+=' changed';assert.equal((await api({}, {action:'purchase',owner:fixture.owner,...changed})).status,409);
    const wrongOwner=await api({}, {action:'purchase',owner:randomUUID(),...savedRequest});assert.equal(wrongOwner.status,409);assert.equal(wrongOwner.body.rejected,false);
    assert.equal((await q('select count(*)::int n from vendor_sales_cart_receipts where owner_id=$1',[fixture.owner]))[0].n,1);
    assert.equal((await q('select count(*)::int n from vendor_sale_cost_snapshots where owner_id=$1',[fixture.owner]))[0].n,0);
    checks.push('Real POST commits one receipt/copy with USD6.50 cost; dropped response survives reload and all-new-entry switches off; identical retry is exact and changed/foreign-owner requests reject');
    const account=await context.newPage(),shellReady=account.waitForResponse(response=>new URL(response.url()).pathname==='/api/navigation/shell'&&response.status()===200);
    await account.goto(origin+'/account',{waitUntil:'domcontentloaded'});await shellReady;await account.getByRole('button',{name:'Sign out',exact:true}).click();await account.waitForURL(url=>url.pathname==='/login');
    await expect(page.getByRole('heading',{name:'Your purchase',exact:true})).toHaveCount(0);
    await expect(page.getByText('Purchase recorded · '+recorded.number,{exact:false})).toHaveCount(0);
    assert.equal((await api()).status,401);
    await expect.poll(async()=>page.url().includes('/login')||await page.getByRole('heading',{name:'Reopen your sales desk'}).count()>0||await page.getByText('Sign in required',{exact:true}).count()>0).toBe(true);
    await page.screenshot({path:out+'/purchase-account-closed.png',fullPage:true});checks.push('Actual cross-tab sign-out clears private purchase, invalidates authenticated reads and presents account closure or sign-in; shared seller view omits private note');
    result={owner:fixture.owner,requestId:savedRequest.id,receiptNumber:recorded.number,createdCopies:1,createdReceipts:1,purchaseMinor:650};
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};save('failure.json',failure);if(page)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});}
finally{
    if(browser)await browser.close();if(server&&server.exitCode===null)server.kill();if(stopped)await stopped;fs.closeSync(log);
    try{
        await q('rollback');await q('begin');await q('update vendor_purchase_control set enabled=$1',[flags.purchase]);await q('update vendor_sales_cart_control set enabled=$1',[flags.cart]);await q('update vendor_receipt_cloud_control set enabled=$1',[flags.cloud]);await q('commit');
        const restored=(await q('select (select enabled from vendor_purchase_control) purchase,(select enabled from vendor_sales_cart_control) cart,(select enabled from vendor_receipt_cloud_control) cloud,(select capture_enabled from vendor_cost_evidence_control) capture,(select edit_enabled from vendor_cost_evidence_control) edit'))[0];assert.deepEqual(restored,flags);controlsRestored=true;save('flags-restored.json',restored);
        const preserved={};for(const table of tables){const current=new Set((await q(`select to_jsonb(t) row from ${table} t`)).map(canon));for(const row of retained[table])assert.ok(current.has(canon(row)),'Retained row changed: '+table);preserved[table]=retained[table].length;}save('retained-readback.json',preserved);
    }catch(error){failure??={name:error.name,message:error.message};save('cleanup-failure.json',{message:error.message});}
    await db.end();
}
save('receipt.json',{at:new Date().toISOString(),status:failure?'failed':'passed',checks,result,failure,controlsRestored,origin,productionWrites:0,resetsAfterPopulation:0,fixtureRetained:true});
console.log(JSON.stringify({out,status:failure?'failed':'passed',checks,controlsRestored,result}));if(failure)process.exitCode=1;
