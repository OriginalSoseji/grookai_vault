// Actual local Auth, Inventory, cost editor and return journey. Never production.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const root='C:/gv_product_cost_review_web_20261007';
const base='C:/grookai_vault_operator_artifacts/product_cost_review_web_20261007';
const lab='C:/grookai_vault_operator_artifacts/product_economics_20261007/full-431-v2';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,3);
const out=path.resolve(process.argv[2]).replaceAll('\\','/');
assert.ok(out.startsWith(base+'/runtime-')&&!out.substring(base.length+1).includes('/'));
const read=p=>JSON.parse(fs.readFileSync(p));
const fixture=read(out+'/fixture.private.json');assert.equal(fixture.state,'prepared');
assert.equal(fixture.project,'product-cost-full-431-v2-20261007');
assert.equal(read('C:/grookai_vault_operator_artifacts/product_cost_review_20261007/CHECKPOINT.json').sourceFrozen,false);
assert.equal(fs.existsSync(out+'/runtime-intent.json'),false,'Consumed runtime cannot be replayed');
const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2));
save('runtime-intent.json',{at:new Date().toISOString(),owner:fixture.owner});
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',lab],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:33061');
const web=createRequire(root+'/apps/web/package.json');
const {createServerClient}=web('@supabase/ssr'),{chromium,expect}=web('@playwright/test');
const port=33250,origin='http://127.0.0.1:'+port;
const env={};for(const[k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
assert.equal(fs.readdirSync(root+'/apps/web').some(n=>n.startsWith('.env')),false);
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COPY_COST_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,NODE_USE_SYSTEM_CA:'1'});
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
let cookies=[];
const client=createServerClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{for(const c of values){cookies=cookies.filter(x=>x.name!==c.name);cookies.push(c);}}}});
const signed=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});assert.equal(signed.error,null);assert.equal(signed.data.user.id,fixture.owner);
let token=signed.data.session.access_token;
const log=fs.openSync(out+'/server.private.log','wx');let server,stopped,browser,page,account,failure=null,cleanup=false;
const checks=[];
function start(enabled){server=spawn(process.execPath,['--use-system-ca',root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'/apps/web',env:{...env,GV_COPY_COST_V1:enabled?'1':'0'},stdio:['ignore',log,log],windowsHide:true});stopped=new Promise(resolve=>server.once('exit',resolve));}
async function stop(){if(server&&server.exitCode===null)server.kill();if(stopped)await stopped;}
async function api(params={},auth=true){const response=await fetch(origin+'/api/vault/cost-review?'+new URLSearchParams(params),{headers:{Connection:'close',...(auth?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(90000),redirect:'error'});assert.match(response.headers.get('cache-control')??'',/private, no-store/);return {status:response.status,body:await response.json()};}
async function ready(){for(let i=0;i<60;i++){assert.equal(server.exitCode,null);try{if((await api({},false)).status===401)return;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}throw Error('Local review server unavailable');}
const region=()=>page.getByRole('region',{name:'Private cost review',exact:true});
const inventory=origin+'/account/store/inventory';
const target=fixture.copies.find(c=>c.kind==='currency');
async function shot(name){
 if(name==='review-editor-phone')await page.getByRole('region',{name:'Private cost',exact:true}).screenshot({path:out+'/'+name+'.png'});
 else await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
}
try {
 start(true);await ready();
 assert.equal((await api({owner:randomUUID(),ids:target.id})).status,409);
 assert.equal((await api({owner:fixture.owner,ids:'invalid'})).status,400);
 assert.equal((await api({owner:fixture.owner,ids:Array.from({length:101},()=>randomUUID()).join(',')})).status,400);
 const {Client}=createRequire(root+'/package.json')('pg');
 const db=new Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33060/postgres?options=-c%20default_transaction_read_only%3Don'});let foreign;
 await db.connect();try{foreign=(await db.query('select id from vault_item_instances where user_id<>$1 limit 1',[fixture.owner])).rows[0]?.id;assert.ok(foreign);}finally{await db.end();}
 const missing=randomUUID();const initial=await api({owner:fixture.owner,ids:fixture.copies.map(c=>c.id).concat(missing,foreign).join(',')});
 assert.equal(initial.status,200);assert.equal(initial.body.ownerId,fixture.owner);assert.equal(initial.body.copies.length,6);assert.equal(initial.body.copies.some(c=>c.instanceId===missing||c.instanceId===foreign),false);
 assert.equal(initial.body.copies.filter(c=>c.cost.status==='known').length,3);
 checks.push('Real GET authenticates, binds owner, bounds batch, excludes unknown copies, returns private no-store evidence');
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,sameSite:'Lax'})));page=await context.newPage();page.setDefaultTimeout(30000);
 await page.goto(inventory+'?review=cost&q='+target.gvvi,{waitUntil:'domcontentloaded'});
 await expect(region().getByText('0 of 1 included copy has a recorded cost and currency.',{exact:true})).toBeVisible();await shot('review-filtered-phone');
 await page.getByLabel('Find your copies').fill('');await page.getByRole('button',{name:'Search',exact:true}).click();
 await expect(region().getByText(/^3 of 6 included/)).toBeVisible();await shot('review-summary-phone');
 await region().getByLabel('Cost state').selectOption('known');await expect(region().getByText('USD 0.00',{exact:true})).toBeVisible();await expect(region().getByText('CAD 3.00',{exact:true})).toBeVisible();
 await page.setViewportSize({width:1440,height:1000});await shot('review-recorded-desktop');await page.setViewportSize({width:390,height:844});
 await region().getByLabel('Cost state').selectOption('missingCurrency');await expect(region().getByText('Recorded amount: 12.00')).toBeVisible();
 await region().getByRole('link',{name:/^Review cost/}).click();
 const cost=page.getByRole('region',{name:'Private cost',exact:true});await expect(cost.getByLabel('Cost amount',{exact:true})).toHaveValue('12.00');await expect(cost.getByLabel('Currency',{exact:true})).toHaveValue('');await shot('review-editor-phone');
 await cost.getByLabel('Currency',{exact:true}).fill('USD');await cost.getByRole('button',{name:'Save cost',exact:true}).click();await expect(cost.getByText('Cost saved.',{exact:true})).toBeVisible();
 const journal=await page.evaluate(key=>new Promise((resolve,reject)=>{const open=indexedDB.open('grookai.private-copy-cost.v1',1);open.onerror=()=>reject(Error('Journal unavailable'));open.onsuccess=()=>{const db=open.result,tx=db.transaction('copies','readonly'),get=tx.objectStore('copies').get(key);get.onsuccess=()=>{const row=get.result;resolve(row?{pending:row.pending,amount:row.amount,currency:row.currency}:null);};get.onerror=()=>reject(Error('Journal read failed'));tx.oncomplete=()=>db.close();};}),fixture.owner+':'+target.id);
 assert.deepEqual(journal,{pending:null,amount:'12.00',currency:'USD'});
 const returnLink=page.getByRole('link',{name:'Back to Inventory',exact:true});assert.equal(new URL(await returnLink.getAttribute('href'),origin).searchParams.get('review'),'cost');await returnLink.click();
 await expect(region().getByText(/^4 of 6 included/)).toBeVisible();await region().getByLabel('Cost state').selectOption('missingCurrency');await expect(region().getByText('No included copies match this filter.')).toBeVisible();await shot('review-repaired-phone');
 checks.push('Actual Inventory filter scopes one copy, clear returns six, zero/CAD remain known; existing editor repairs only explicit currency and returns with fresh 4/6 coverage');
 await page.route('**/api/vault/cost-review?**',route=>route.fulfill({status:503,json:{error:'Injected local read interruption'}}));await region().getByRole('button',{name:'Refresh costs'}).click();await expect(region().getByRole('alert')).toBeVisible();await expect(region().getByText(/^4 of 6 included/)).toHaveCount(0);await shot('review-read-failure-phone');
 await page.unroute('**/api/vault/cost-review?**');await region().getByRole('button',{name:'Try again'}).click();await expect(region().getByText(/^4 of 6 included/)).toBeVisible();
 account=await context.newPage();
 const shellReady=account.waitForResponse(response=>new URL(response.url()).pathname==='/api/navigation/shell'&&response.status()===200);
 await account.goto(origin+'/account',{waitUntil:'domcontentloaded'});await shellReady;
 await account.getByRole('button',{name:'Sign out',exact:true}).click();await account.waitForURL(url=>url.pathname==='/login',{timeout:15000});
 await expect(page.getByRole('heading',{name:'Inventory closed'})).toBeVisible({timeout:15000});await expect(region()).toHaveCount(0);await shot('review-account-closed-phone');
 checks.push('Injected read failure clears private coverage; real retry restores; real sign-out in another tab closes Inventory');
 await browser.close();browser=null;await stop();start(false);await ready();
 assert.equal((await api({owner:fixture.owner,ids:target.id})).status,401);
 const renewed=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});assert.equal(renewed.error,null);assert.equal(renewed.data.user.id,fixture.owner);token=renewed.data.session.access_token;
 assert.equal((await api({owner:fixture.owner,ids:target.id})).status,404);
 checks.push('Real server feature-off denies new private cost-review reads');
 save('browser-response.json',{phase:'cost_review_web_passed',owner:fixture.owner,filteredScope:true,readRecovery:true,flagOff:true,accountClosed:true,initialRecorded:3,finalRecorded:4,includedCopies:6,pendingCount:0,checks});
 execFileSync(process.execPath,['scripts/audits/product_cost_review_web_fixture_v1.mjs','verify',out],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};save('failure.json',failure);if(page&&browser)await shot('failure').catch(()=>{});if(account&&browser){await account.screenshot({path:out+'/failure-account.png',fullPage:true}).catch(()=>{});save('account-diagnostic.json',{url:account.url(),text:await account.locator('body').innerText().catch(()=>''),inventoryUrl:page.url()});}}
finally {
 if(browser)await browser.close();await stop();fs.closeSync(log);
 try{execFileSync(process.execPath,['scripts/audits/product_cost_review_web_fixture_v1.mjs','cleanup',out],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});cleanup=true;}
 catch(error){save('cleanup-failure.json',{message:error.message});failure??={name:error.name,message:'Fixture cleanup failed'};}
}
save('receipt.json',{at:new Date().toISOString(),status:failure?'failed':'passed',checks,failure,cleanup,origin,productionWrites:0});
console.log(JSON.stringify({out,status:failure?'failed':'passed',checks,cleanup,failure}));if(failure)process.exitCode=1;
