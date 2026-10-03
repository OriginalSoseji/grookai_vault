// Actual Auth/Next/browser proof against the retained, task-owned receipt lab only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
const root='C:/gv_receipt_sale_flow_20261003',base='http://127.0.0.1:15460';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const cfg=JSON.parse(fs.readFileSync(root+'/.local/receipt-sale/runtime.private.json'));
assert.equal(cfg.API_URL,'http://127.0.0.1:64701');
assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'64700');
const req=createRequire(root+'/package.json'),web=createRequire(root+'/apps/web/package.json');
const {Client}=req('pg'),{createClient}=web('@supabase/supabase-js'),{chromium,expect}=web('@playwright/test');
const out=root+'/.local/receipt-sale/web-'+Date.now();fs.mkdirSync(out);
const db=new Client({connectionString:cfg.DB_URL});await db.connect();
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false}});
const ids=[],password=randomUUID()+'Aa9!',set=randomUUID(),card=randomUUID(),legacy=randomUUID(),copy=randomUUID();
const checks=[],errors=[];let browser,app,failure,cleaned=false,sale,oldControl;
function stopApp(){if(app&&app.exitCode===null)execFileSync('taskkill',['/PID',String(app.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});app=null;}
async function startApp(mode='web'){
 const fd=fs.openSync(out+'/'+mode+'.private.log','wx');
 try{app=spawn(process.execPath,[root+'/.local/receipt-sale/run.mjs',mode],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 for(let n=0;;n++){assert.equal(app.exitCode,null);try{if((await fetch(base+'/account/store/receipts',{redirect:'manual'})).status===307)break;}catch{}assert.ok(n<60,'Next not ready');await new Promise(r=>setTimeout(r,500));}
}
try{
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from vendor_orders')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from vendor_receipt_books')).rows[0].n,0);
 oldControl=(await db.query('select enabled from vendor_receipt_cloud_control')).rows[0].enabled;
 await db.query('update vendor_receipt_cloud_control set enabled=true');
 for(const who of ['owner','other']){const r=await admin.auth.admin.createUser({email:who+'@receipt-sale.invalid',password,email_confirm:true});assert.equal(r.error,null);ids.push(r.data.user.id);}
 await db.query("insert into sets(id,code,name,game) values($1,'receipt-sale-fixture','Synthetic receipt sale set','pokemon')",[set]);
 await db.query("insert into card_prints(id,game_id,set_id,name,number,set_code,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Synthetic receipt sale card','001','receipt-sale-fixture','GV-PK-RECEIPTSALE-001','missing')",[card,set]);
 await db.query("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Synthetic receipt sale card','GV-PK-RECEIPTSALE-001')",[legacy,ids[0],card]);
 await db.query("insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id) values($1,$2,$3,$4,'GVVI-RECEIPTSALE-000001')",[copy,ids[0],card,legacy]);
 const ownerClient=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false}});
 assert.equal((await ownerClient.auth.signInWithPassword({email:'owner@receipt-sale.invalid',password})).error,null);
 const recorded=await ownerClient.rpc('vault_record_exact_instance_disposition_v2',{p_instance_id:copy,p_disposition_type:'sale',p_sale_price_amount:12.34,p_sale_price_currency:'USD',p_counterparty_label:'Synthetic buyer',p_trade_received_description:null,p_trade_cash_direction:null,p_trade_cash_amount:null,p_trade_cash_currency:null});
 assert.equal(recorded.error,null);sale=recorded.data.disposition_id;assert.ok(sale);
 const snapshot=async()=>({copy:(await db.query('select to_jsonb(v) data from vault_item_instances v where id=$1',[copy])).rows[0].data,sale:(await db.query('select to_jsonb(d) data from vault_item_instance_dispositions d where id=$1',[sale])).rows[0].data});
 const before=await snapshot();assert.ok(before.copy.archived_at);
 await startApp();browser=await chromium.launch({headless:true});
 async function login(who){const c=await browser.newContext({viewport:{width:1440,height:1000}});await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/account/store/receipts/start?sale='+sale);await p.waitForURL(/\/login\?next=/);assert.equal(new URL(p.url()).searchParams.get('next'),'/account/store/receipts/start?sale='+sale);await p.getByLabel('Email',{exact:true}).fill(who+'@receipt-sale.invalid');await p.getByLabel('Password',{exact:true}).fill(password);await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL(base+'/account/store/receipts/cloud?sale='+sale);return {c,p};}
 const one=await login('owner'),other=await login('other');
 await expect(other.p.getByText('This recorded sale is unavailable for your account.',{exact:true})).toBeVisible();
 assert.ok(!(await other.p.locator('body').innerText()).includes('GVVI-RECEIPTSALE'));
 await expect(one.p.getByLabel('Item / card',{exact:true})).toHaveValue('GVVI-RECEIPTSALE-000001');
 await expect(one.p.getByLabel('Unit price (USD)',{exact:true})).toHaveValue('12.34');
 await expect(one.p.getByLabel('Name',{exact:true})).toHaveValue('Synthetic buyer');
 checks.push('actual sale RPC archives one copy; start/login preserves exact source; owner sees saved price/GVVI/buyer and foreign account sees no sale');
 await one.p.getByLabel('Store / seller name').fill('Synthetic receipt seller');await one.p.getByLabel('Email',{exact:true}).fill('synthetic@buyer.invalid');await one.p.getByLabel('What are they looking for?').fill('Pikachu under $50');await one.p.getByLabel('Private customer notes').fill('PRIVATE_RECEIPT_NOTE');await one.p.getByLabel('I received this payment and the sale is complete.').check();
 await one.p.getByRole('button',{name:'Save sale & create receipt'}).click();await expect(one.p.getByText('Sale saved to your account',{exact:true})).toBeVisible();
 const saved=(await db.query('select revision,book from vendor_receipt_books where owner_id=$1',[ids[0]])).rows[0];assert.equal(Number(saved.revision),1);assert.equal(saved.book.receipts[0].receipt.sourceDispositionId,sale);assert.equal(saved.book.receipts[0].receipt.totalMinor,1234);assert.equal(saved.book.customers[0].notes,'PRIVATE_RECEIPT_NOTE');
 const second=await login('owner');await expect(second.p.locator('dd.rd-total')).toHaveText('$12.34');await expect(second.p.locator('[data-sale]')).toHaveCount(0);await expect(second.p.locator('[data-open]')).toHaveCount(1);
 await second.p.goto(base+'/vault/transactions');await second.p.getByRole('link',{name:'Create or view receipt',exact:true}).click();await expect(second.p.locator('dd.rd-total')).toHaveText('$12.34');
 assert.equal(Number((await db.query('select revision from vendor_receipt_books where owner_id=$1',[ids[0]])).rows[0].revision),1);
 checks.push('receipt/customer save persists; fresh browser and transaction-history link reopen the same receipt without duplicate writes');
 await second.p.screenshot({path:out+'/desktop.png',fullPage:true});await second.p.setViewportSize({width:390,height:844});await second.p.screenshot({path:out+'/mobile.png',fullPage:true});assert.equal(await second.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await second.p.getByRole('button',{name:'New sale',exact:true}).click();await expect(second.p.getByLabel('Item / card',{exact:true})).toHaveValue('');await expect(second.p.getByLabel('Unit price (USD)',{exact:true})).toHaveValue('');
 await second.p.getByLabel('Item / card',{exact:true}).fill('Separate walk-up sale');await second.p.getByLabel('Unit price (USD)',{exact:true}).fill('5.00');await second.p.getByLabel('I received this payment and the sale is complete.').check();await second.p.getByRole('button',{name:'Save sale & create receipt'}).click();await expect(second.p.locator('dd.rd-total')).toHaveText('$5.00');
 const book=(await db.query('select book from vendor_receipt_books where owner_id=$1',[ids[0]])).rows[0].book;assert.equal(book.receipts.length,2);assert.equal(book.receipts.filter(r=>r.receipt.sourceDispositionId===sale).length,1);assert.equal(book.receipts.filter(r=>r.receipt.sourceDispositionId===null).length,1);
 await one.p.goto(base+'/account/store/receipts/cloud?sale='+sale+'&sale='+sale);await expect(one.p.getByText('This recorded-sale link is invalid.',{exact:true})).toBeVisible();
 await one.p.goto(base+'/account/store/receipts/cloud?sale=bad');await expect(one.p.getByText('This recorded-sale link is invalid.',{exact:true})).toBeVisible();
 assert.deepEqual(await snapshot(),before);assert.deepEqual(errors,[]);
 checks.push('New sale clears source identity; malformed links rejected; desktop/mobile render; creating receipts leaves recorded sale and archived copy byte-for-byte unchanged');
 stopApp();await startApp('web-off');
 // Next can stream a page redirect as HTTP200 plus a browser navigation.
 await one.p.goto(base+'/account/store/receipts/start?sale='+sale);await one.p.waitForURL(base+'/account/store/receipts?sale='+sale);await expect(one.p.getByRole('heading',{name:'Receipt desk',exact:true})).toBeVisible();await expect(one.p.getByLabel('Unit price (USD)',{exact:true})).toHaveValue('12.34');
 checks.push('disabled-cloud start falls back to existing authenticated device receipt prefill');
}catch(e){failure=e;}finally{
 await browser?.close();stopApp();
 await db.query('begin');try{
  await db.query('set local session_replication_role=replica');
  await db.query('delete from vault_item_instance_dispositions where vault_item_instance_id=$1',[copy]);await db.query('delete from vault_item_instances where id=$1',[copy]);await db.query('delete from vault_items where id=$1',[legacy]);await db.query('delete from pricing_watch where card_print_id=$1',[card]);await db.query('delete from card_prints where id=$1',[card]);await db.query('delete from sets where id=$1',[set]);
  await db.query('delete from card_events where actor_user_id=any($1::uuid[]) or subject_user_id=any($1::uuid[])',[ids]);await db.query('set local session_replication_role=origin');await db.query('delete from auth.users where id=any($1::uuid[])',[ids]);if(oldControl!==undefined)await db.query('update vendor_receipt_cloud_control set enabled=$1',[oldControl]);await db.query('commit');
 }catch(e){await db.query('rollback');failure??=e;}
 cleaned=(await db.query('select count(*)::int n from auth.users')).rows[0].n===0&&(await db.query('select count(*)::int n from vendor_receipt_books')).rows[0].n===0;await db.end();
}
const paths=execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
paths.push('apps/web/src/lib/receipts/receiptSale.ts','apps/web/src/app/account/store/receipts/start/page.tsx','scripts/receipts/prove_receipt_sale_flow.mjs');
const sourceHashes=Object.fromEntries([...new Set(paths)].map(p=>[p,createHash('sha256').update(fs.readFileSync(root+'/'+p)).digest('hex')]));
const result={at:new Date().toISOString(),status:failure?'failed':'passed',checks,actualAuth:true,actualNext:true,actualPostgres:true,sourceHashes,cleanup:cleaned,productionWrites:0,messagesSent:0,error:failure?.stack,out};fs.writeFileSync(out+'/receipt.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(failure)process.exitCode=1;
