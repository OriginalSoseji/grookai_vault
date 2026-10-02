// Actual Auth, Next, HTTP and Postgres, only in the fixed receipt-cloud lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {createReceipt,emptyBook,parseBackup} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const root='C:/gv_vendor_receipt_cloud_20261002',fixture='C:/grookai_vault_operator_artifacts/vendor_receipt_cloud_20261002/full-415-v3';
const req=createRequire(root+'/package.json'),web=createRequire(root+'/apps/web/package.json');
const {Client}=req('pg'),{createClient}=web('@supabase/supabase-js'),{chromium,expect}=web('@playwright/test');
assert.equal(process.cwd().replaceAll('\\','/'),root);
assert.equal(JSON.parse(fs.readFileSync(fixture+'/replay-result.json')).status,'passed');
const cfg=JSON.parse(fs.readFileSync(root+'/.local/receipt-cloud/runtime.private.json'));
assert.equal(cfg.API_URL,'http://127.0.0.1:64701');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'64700');
const base='http://127.0.0.1:15450',out=root+'/.local/receipt-cloud/web-'+Date.now();fs.mkdirSync(out);
const db=new Client({connectionString:cfg.DB_URL});await db.connect();
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false}}),ids=[],password=randomUUID()+'Aa9!',checks=[];
let browser,app,failure,cleanup=false;const pages=[];
try {
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from vendor_receipt_books')).rows[0].n,0);
 await db.query('update vendor_receipt_cloud_control set enabled=true');
 for(const name of ['owner','other','capacity']){const r=await admin.auth.admin.createUser({email:name+'@receipt-cloud.invalid',password,email_confirm:true});assert.equal(r.error,null);ids.push(r.data.user.id);}
 const fd=fs.openSync(out+'/next.private.log','wx');try{app=spawn(process.execPath,[root+'/.local/receipt-cloud/run.mjs','web'],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 for(let n=0;;n++){assert.equal(app.exitCode,null);try{if((await fetch(base+'/account/store/receipts/cloud',{redirect:'manual'})).status===307)break;}catch{}assert.ok(n<60,'Next not ready');await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({headless:true});const errors=[];
 async function signIn(name){const c=await browser.newContext({viewport:{width:1440,height:1000}});await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const p=await c.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/account/store/receipts/cloud');await p.waitForURL(/\/login\?next=/);assert.equal(new URL(p.url()).searchParams.get('next'),'/account/store/receipts/cloud');await p.getByLabel('Email',{exact:true}).fill(name+'@receipt-cloud.invalid');await p.getByLabel('Password',{exact:true}).fill(password);await p.getByRole('button',{name:'Sign in',exact:true}).click();try{await expect(p.getByRole('heading',{name:'Account receipt desk',exact:true})).toBeVisible({timeout:30000});}catch(e){fs.writeFileSync(out+'/load-failure.txt',await p.locator('body').innerText());fs.writeFileSync(out+'/browser-errors.json',JSON.stringify(errors));throw e;}return {c,p};}
 const one=await signIn('owner'),stale=await signIn('owner'),other=await signIn('other');
 const anonymousClient=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false}});assert.ok((await anonymousClient.rpc('vendor_receipt_book_read_v1')).error);
 async function fill(p,description){await p.getByLabel('Store / seller name').fill('Synthetic cloud store');await p.getByLabel('Item / card',{exact:true}).fill(description);await p.getByLabel('Unit price (USD)',{exact:true}).fill('12.34');await p.getByLabel('Name',{exact:true}).fill('Synthetic customer');await p.getByLabel('Private customer notes').fill('PRIVATE_CLOUD_NOTE');await p.getByLabel('I received this payment and the sale is complete.').check();}
 await fill(stale.p,'Stale device draft');await fill(one.p,'First cloud sale');
 await one.p.getByRole('button',{name:'Save sale & create receipt'}).click();await expect(one.p.getByText('Sale saved to your account',{exact:true})).toBeVisible();await expect(one.p.locator('dd.rd-total')).toHaveText('$12.34');
 const actual=(await db.query('select revision,book from vendor_receipt_books where owner_id=$1',[ids[0]])).rows[0];assert.equal(Number(actual.revision),1);assert.equal(actual.book.receipts.length,1);assert.equal(actual.book.customers[0].notes,'PRIVATE_CLOUD_NOTE');
 const two=await signIn('owner');await expect(two.p.locator('[data-open]')).toHaveCount(1);await two.p.locator('[data-open]').click();await expect(two.p.locator('dd.rd-total')).toHaveText('$12.34');
 await other.p.reload();await expect(other.p.locator('[data-open]')).toHaveCount(0);await expect(other.p.getByText('PRIVATE_CLOUD_NOTE',{exact:true})).toHaveCount(0);
 checks.push('real authenticated save survives a fresh browser context; another account and anonymous cannot read it; SDK uses authenticated RPC');
 await stale.p.getByRole('button',{name:'Save sale & create receipt'}).click();await expect(stale.p.locator('[data-status][role=alert]')).toContainText('Another device',{timeout:30000});await expect(stale.p.getByLabel('Item / card',{exact:true})).toHaveValue('Stale device draft');
 assert.equal(Number((await db.query('select revision from vendor_receipt_books where owner_id=$1',[ids[0]])).rows[0].revision),1);
 checks.push('stale tab save receives conflict and retains entered draft without replacing newer account data');
 // Direct RPC with actual user JWT: no API-only validation dependency.
 const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false}});assert.equal((await client.auth.signInWithPassword({email:'owner@receipt-cloud.invalid',password})).error,null);
 const altered=structuredClone(actual.book);altered.receipts[0].receipt.note='Changed original';const rejected=await client.rpc('vendor_receipt_book_save_v1',{p_revision:1,p_request_id:randomUUID(),p_book:altered});assert.equal(rejected.error?.code,'22023');
 assert.ok((await client.from('vendor_receipt_books').select('*')).error);checks.push('actual authenticated direct RPC rejects receipt rewrite; direct base-table reads denied');

 await one.p.getByRole('button',{name:'New sale',exact:true}).click();await fill(one.p,'Recovered after lost reply');
 let dropReply=true;await one.c.route('**/rest/v1/rpc/vendor_receipt_book_save_v1',async route=>{if(dropReply&&route.request().method()==='POST'){dropReply=false;await route.fetch();await route.abort();}else await route.continue();});
 await one.p.getByRole('button',{name:'Save sale & create receipt'}).click();await expect(one.p.locator('[data-status][role=alert]')).toContainText('Retry');
 assert.equal(Number((await db.query('select revision from vendor_receipt_books where owner_id=$1',[ids[0]])).rows[0].revision),2);
 await expect(one.p.getByLabel('Item / card',{exact:true})).toHaveValue('Recovered after lost reply');await one.p.getByRole('button',{name:'Save sale & create receipt'}).click();await expect(one.p.getByText('Sale saved to your account',{exact:true})).toBeVisible();
 const recovered=(await db.query("select revision,jsonb_array_length(book->'receipts') as n from vendor_receipt_books where owner_id=$1",[ids[0]])).rows[0];assert.equal(Number(recovered.revision),2);assert.equal(recovered.n,2);
 checks.push('browser loses a successful PUT reply, retains its draft and safely retries the same receipt exactly once');
 await one.p.screenshot({path:out+'/desktop.png',fullPage:true});await one.p.setViewportSize({width:390,height:844});await one.p.screenshot({path:out+'/mobile.png',fullPage:true});assert.equal(await one.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);

 await two.p.goto(base+'/account/store/receipts');await expect(two.p.getByRole('heading',{name:'Receipt desk',exact:true})).toBeVisible();await fill(two.p,'Device-only sale');await two.p.getByRole('button',{name:'Save sale & create receipt'}).click();await expect(two.p.getByText('Sale saved on this device',{exact:true})).toBeVisible();
 const download=two.p.waitForEvent('download');await two.p.getByRole('button',{name:'Back up records',exact:true}).click();const backup=await download;const backupPath=out+'/device-backup.json';await backup.saveAs(backupPath);
 assert.equal(Number((await db.query('select revision from vendor_receipt_books where owner_id=$1',[ids[0]])).rows[0].revision),2);
 await other.p.locator('[data-import]').setInputFiles(backupPath);await expect(other.p.locator('[data-status]')).toContainText('Backup saved to your account');await other.p.reload();await expect(other.p.locator('[data-open]')).toHaveCount(1);
 await one.p.locator('[data-import]').setInputFiles(backupPath);await expect(one.p.locator('[data-status][role=alert]')).toContainText('empty receipt book');assert.equal(Number((await db.query('select revision from vendor_receipt_books where owner_id=$1',[ids[0]])).rows[0].revision),2);
 checks.push('device-only desk still saves locally; explicit backup import persists in an empty account and refuses to overwrite an existing book');
 const capacity=await signIn('capacity'),large=emptyBook();large.storeName='Capacity fixture';
 for(let i=0;i<10000;i++){
  const id=randomUUID(),customer={name:'Synthetic',email:'',phone:'',wants:'',notes:''},createdAt='2026-10-02T00:00:00.000Z';
  large.customers.push({id,...customer,updatedAt:createdAt});
  large.receipts.push({receipt:createReceipt({storeName:'Capacity fixture',customer,confirmed:true,method:'Cash',items:[{description:'Synthetic card',quantity:'1',price:'1'}],discount:'0',tax:'0',note:''},randomUUID(),createdAt),customerId:id});
 }
 large.receipts.pop();const timings=[],capacityPath=out+'/capacity-backup.json';fs.writeFileSync(capacityPath,JSON.stringify(large));
 let capacityStart=performance.now();await capacity.p.locator('[data-import]').setInputFiles(capacityPath);await expect(capacity.p.locator('[data-status]')).toContainText('Backup saved to your account',{timeout:20000});timings.push(Math.round(performance.now()-capacityStart));
 await capacity.p.getByLabel('Existing customer').selectOption(large.customers[0].id);await fill(capacity.p,'Tenthousandth receipt');capacityStart=performance.now();await capacity.p.getByRole('button',{name:'Save sale & create receipt'}).click();await expect(capacity.p.getByText('Sale saved to your account',{exact:true})).toBeVisible({timeout:20000});timings.push(Math.round(performance.now()-capacityStart));
 const capacityActual=(await db.query("select revision,jsonb_array_length(book->'receipts') as receipts,jsonb_array_length(book->'customers') as customers from vendor_receipt_books where owner_id=$1",[ids[2]])).rows[0];assert.equal(capacityActual.receipts,10000);assert.equal(capacityActual.customers,10000);assert.equal(Number(capacityActual.revision),2);
 fs.writeFileSync(out+'/capacity.json',JSON.stringify({...capacityActual,uiTimings:timings}));
 const capacityDownload=capacity.p.waitForEvent('download');await capacity.p.getByRole('button',{name:'Back up records',exact:true}).click();const downloadedCapacity=await capacityDownload,capacityExport=out+'/capacity-export.json';await downloadedCapacity.saveAs(capacityExport);
 assert.ok(fs.statSync(capacityExport).size<=10000000);const roundtrip=parseBackup(fs.readFileSync(capacityExport,'utf8'));assert.equal(roundtrip.receipts.length,10000);assert.equal(roundtrip.customers.length,10000);
 const persistedCapacity=(await db.query('select book from vendor_receipt_books where owner_id=$1',[ids[2]])).rows[0].book;assert.deepEqual(roundtrip,parseBackup(JSON.stringify(persistedCapacity)));
 checks.push('actual browser SDK imports 9999 then saves 10000 receipts and 10000 customers within 20 seconds each');
 checks.push('downloaded 10000-receipt backup remains within the import limit and round-trips every receipt and customer');
 await db.query('update vendor_receipt_cloud_control set enabled=false');assert.equal((await client.rpc('vendor_receipt_book_read_v1')).error?.code,'55000');assert.equal((await db.query('select count(*)::int n from vendor_receipt_books')).rows[0].n,3);
 checks.push('disable switch blocks reads while retaining receipts; desktop/mobile render without script errors');
 for(const table of ['vault_item_instances','vendor_orders'])assert.equal((await db.query('select count(*)::int n from '+table)).rows[0].n,0);
}catch(e){failure=e;for(let i=0;i<pages.length;i++)try{fs.writeFileSync(out+'/failure-page-'+i+'.txt',await pages[i].locator('body').innerText());}catch{}}finally{
 await browser?.close();if(app&&app.exitCode===null)execFileSync('taskkill',['/PID',String(app.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
 await db.query('update vendor_receipt_cloud_control set enabled=false');
 for(const id of ids){const result=await admin.auth.admin.deleteUser(id);if(result.error)failure??=result.error;}
 cleanup=(await db.query('select (select count(*) from auth.users)+(select count(*) from vendor_receipt_books) as n')).rows[0].n==='0';await db.end();
}
const sourceFiles=['apps/web/next.config.mjs','apps/web/src/lib/collectorStaging.mjs','apps/web/src/lib/collectorRelease.mjs','apps/web/src/lib/stores/storeProductionTarget.mjs','apps/web/src/app/account/store/receipts/page.tsx','apps/web/src/app/account/store/receipts/cloud/page.tsx','supabase/migrations/20261002220000_vendor_receipt_cloud_v1.sql','apps/web/src/lib/receipts/receiptCloud.mjs','apps/web/src/lib/receipts/receiptBook.mjs','apps/web/src/lib/receipts/receiptDesk.mjs','apps/web/src/components/receipts/CloudReceiptDesk.tsx'];
const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',checks,cleanup,actualAuth:true,actualNext:true,crossDevice:checks.some(c=>c.startsWith('real authenticated')),productionWrites:0,sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(fs.readFileSync(root+'/'+p)).digest('hex')])),error:failure?.stack};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({...receipt,out}));if(failure)process.exitCode=1;
