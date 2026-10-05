// Real local Auth and website receipt parity. Synthetic users only; no messages sent.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';import {execFileSync,spawn} from 'node:child_process';import net from 'node:net';
const root='C:/gv_sales_trade_ins_20261003',fixture='C:/grookai_vault_operator_artifacts/sales_trade_ins_20261003/full-427-v2';
const base='http://127.0.0.1:65310',api='http://127.0.0.1:65301';assert.equal(process.cwd().replaceAll('\\','/'),root);
const replay=JSON.parse(fs.readFileSync(fixture+'/replay-result.json'));assert.equal(replay.project,'sales-trade-full-427-v2-20261003');assert.equal(replay.status,'passed');
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',fixture],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const url=new URL(cfg.DB_URL);url.hostname='127.0.0.1';url.port='65300';
const web=createRequire(root+'/apps/web/package.json'),{Client}=createRequire(root+'/package.json')('pg');
const {createClient}=web('@supabase/supabase-js'),{chromium,expect}=web('@playwright/test');
await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(65310,'127.0.0.1',()=>server.close(resolve));});
const out='C:/grookai_vault_operator_artifacts/sales_trade_ins_20261003/web-auth-'+Date.now();fs.mkdirSync(out);
const env={};for(const[key,value]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(key))env[key]=value;
Object.assign(env,{SUPABASE_URL:api,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SALES_TRADE_LOCAL_TEST:'true',GROOKAI_RECEIPT_CLOUD_ENABLED:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:base,NEXT_PUBLIC_SITE_URL:base});
const log=fs.openSync(out+'/server.private.log','wx');
const server=spawn(process.execPath,[root+'/apps/web/node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','65310'],{cwd:root+'/apps/web',env,stdio:['ignore',log,log],windowsHide:true});
const db=new Client({connectionString:url.href});await db.connect();
const admin=createClient(api,cfg.SECRET_KEY,{auth:{persistSession:false}}),ids=[],users=[],checks=[],errors=[];
let failure,browser;
try{
 assert.equal((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,427);
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
 for(let i=0;i<2;i++){
  const user={email:randomUUID()+'@trade-web.invalid',password:randomUUID()+'Aa9!'};
  const result=await admin.auth.admin.createUser({...user,email_confirm:true});assert.equal(result.error,null);ids.push(result.data.user.id);users.push(user);
 }
 await db.query('update vendor_receipt_cloud_control set enabled=true;update vendor_sales_cart_control set enabled=true;update vendor_sales_trade_control set enabled=true');
 const owner=createClient(api,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false}});assert.equal((await owner.auth.signInWithPassword(users[0])).error,null);
 const request=randomUUID(),payload={version:2,storeName:'Synthetic trade shop',method:'Cash',taxMinor:0,note:'',customerId:null,customer:{name:'Synthetic customer',email:'',phone:'',wants:'',notes:''},items:[{instanceId:null,description:'Purchased card',quantity:1,unitMinor:10000}],trades:[{description:'Customer Charizard',quantity:1,valueMinor:10000,rateBps:8000,cardId:null,printingId:null,condition:null,addToVault:false}]};
 const saved=await owner.rpc('vendor_sales_cart_complete_v2',{p_request_id:request,p_cart:payload});assert.equal(saved.error,null);
 const before=(await owner.rpc('vendor_receipt_book_read_v1')).data;
 let ready=false;for(let i=0;i<60;i++){try{ready=(await fetch(base+'/login',{signal:AbortSignal.timeout(2000)})).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500));}assert.equal(ready,true);
 browser=await chromium.launch({headless:true});
 async function pageFor(user){
  const context=await browser.newContext({viewport:{width:1194,height:834},acceptDownloads:true});
  await context.route('**/*',route=>[base,api].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/account/store/receipts/cloud');await page.waitForURL(/\/login\?next=/);
  assert.equal(new URL(page.url()).searchParams.get('next'),'/account/store/receipts/cloud');
  await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL(base+'/account/store/receipts/cloud',{timeout:60000});return {context,page};
 }
 const {page}=await pageFor(users[0]);await expect(page.locator('[data-open]')).toHaveCount(1,{timeout:30000});await page.locator('[data-open]').click();
 await expect(page.locator('dd.rd-total')).toHaveText('$100.00');await expect(page.locator('pre')).toContainText('$100.00 × 80% = $80.00 credit');await expect(page.locator('pre')).toContainText('Payment received: $20.00');
 await page.screenshot({path:out+'/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:out+'/mobile.png',fullPage:true});
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Back up records'}).click();const download=await downloadPromise;await download.saveAs(out+'/synthetic-backup.json');
 assert.deepEqual(JSON.parse(fs.readFileSync(out+'/synthetic-backup.json')).receipts[0].receipt.tradeIn,saved.data.tradeIn);
 await page.reload();await page.locator('[data-open]').click();await expect(page.locator('pre')).toContainText('Payment received: $20.00');
 const other=await pageFor(users[1]);await expect(other.page.getByRole('heading',{name:'Account receipt desk',exact:true})).toBeVisible();await expect(other.page.locator('[data-open]')).toHaveCount(0);await expect(other.page.getByText('Customer Charizard',{exact:true})).toHaveCount(0);
 assert.deepEqual((await owner.rpc('vendor_receipt_book_read_v1')).data,before);assert.deepEqual(errors,[]);
 checks.push('real website authentication preserves safe destination','server-issued trade snapshot renders full deal on desktop/mobile','cloud backup preserves exact trade values','reload preserves receipt','second account sees no first-owner receipts','reads and backup cause no receipt writes');
}catch(error){failure=error;}finally{
 await browser?.close();server.kill();fs.closeSync(log);
 await db.query('delete from auth.users where id=any($1::uuid[])',[ids]);
 await db.query('update vendor_sales_trade_control set enabled=false;update vendor_sales_cart_control set enabled=false;update vendor_receipt_cloud_control set enabled=false');await db.end();
}
const proof={status:failure?'failed':'passed',at:new Date().toISOString(),checks,actualAuth:true,actualWebsite:true,productionWrites:0,out};fs.writeFileSync(out+'/receipt.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
if(failure){fs.writeFileSync(out+'/failure.private.txt',String(failure.stack));throw Error('Website proof failed; inspect '+out);}
