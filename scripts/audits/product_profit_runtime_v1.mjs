// Real local Auth, immutable sale snapshots, Reports recovery and retained DB readback.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import net from 'node:net';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
const root='C:/gv_product_profit_20261007',base='C:/grookai_vault_operator_artifacts/product_profit_20261007';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,2);
const lab='C:/grookai_vault_operator_artifacts/product_economics_20261007/full-431-v2',project='product-cost-full-431-v2-20261007';
const origin='http://127.0.0.1:33230',port=33230;
const req=createRequire(root+'/package.json'),web=createRequire(root+'/apps/web/package.json');
const {Client}=req('pg'),{createClient}=web('@supabase/supabase-js'),{createServerClient}=web('@supabase/ssr'),{chromium,expect}=web('@playwright/test');
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(replay.status,'passed');assert.equal(replay.project,project);assert.equal(replay.migrations,431);assert.equal(freeze.project,project);
assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);
for(const[name,digest]of Object.entries(freeze.sourceHashes)){assert.equal(sha(root+'/supabase/migrations/'+name),digest);assert.equal(sha(lab+'/supabase/migrations/'+name),digest);}
const docker=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const container=docker('inspect','supabase_db_'+project)[0];assert.ok(container.State.Running);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(docker('network','inspect',project)[0].Internal,true);
const relay=docker('inspect',project+'-relay')[0];for(const port of [33060,33061])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',lab],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));assert.equal(cfg.API_URL,'http://127.0.0.1:33061');
const db=new Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33060/postgres'});await db.connect();
const q=async(s,args=[])=>(await db.query(s,args)).rows;
assert.equal((await q("select current_setting('max_worker_processes') n"))[0].n,'0');assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n,431);
const flags=(await q('select edit_enabled,capture_enabled from vendor_cost_evidence_control'))[0];assert.deepEqual(flags,{edit_enabled:false,capture_enabled:false});
const salesFlags=(await q("select json_build_object('cloud',(select enabled from vendor_receipt_cloud_control),'cart',(select enabled from vendor_sales_cart_control),'trade',(select enabled from vendor_sales_trade_control),'payments',(select enabled from vendor_sales_payment_control)) flags"))[0].flags;assert.ok(Object.values(salesFlags).every(value=>value===false));
const tables=['public.sets','public.card_prints','public.vault_owners','public.vendor_sales_cart_receipts','public.vault_item_instance_dispositions','auth.users','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.vendor_receipt_books','public.vendor_sale_cost_snapshots','public.card_events','public.pricing_watch'];
async function retained(){const result={};for(const table of tables)result[table]=(await q(`select md5(coalesce(string_agg(row_to_json(t)::text,E'\n' order by row_to_json(t)::text),'')) digest,count(*)::int n from ${table} t`))[0];return result;}
const before=await retained();
const env={};for(const[k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COPY_COST_LOCAL_TEST:'true',GROOKAI_VISUAL_TEST_MODE:'1',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,GV_VENDOR_PROFIT_V1:'1'});
assert.equal(fs.readdirSync(root+'/apps/web').some(n=>n.startsWith('.env')),false);
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(base,{recursive:true});const out=base+'/runtime-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2));
save('before.json',{project,before,flags,salesFlags});
const log=fs.openSync(out+'/server.log','wx');let server,stopped;
function start(enabled){server=spawn(process.execPath,['--use-system-ca',root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'/apps/web',env:{...env,GV_VENDOR_PROFIT_V1:enabled?'1':'0'},stdio:['ignore',log,log],windowsHide:true});stopped=new Promise(resolve=>server.once('exit',resolve));}
async function stop(){if(server && server.exitCode===null)server.kill();if(stopped)await stopped;}
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),users=[],copies=[];
const set=randomUUID(),card=randomUUID(),oldSale=randomUUID(),sale=randomUUID();
let browser,page,failure=null,cleanup=false;const checks=[];
async function api(user,ids=[],owner=user?.id){
 const params=new URLSearchParams(owner?{owner}:{});for(const id of ids)params.append('id',id);
 const response=await fetch(origin+'/api/sales/costs?'+params,{headers:{Connection:'close',...(user?{Authorization:'Bearer '+user.token}:{})},signal:AbortSignal.timeout(90000),redirect:'error'});
 assert.match(response.headers.get('cache-control')??'',/no-store/);return {status:response.status,body:await response.json()};
}
async function book(user,owner=user.id){const response=await fetch(origin+'/api/sales/desk?action=book&owner='+owner,{headers:{Connection:'close',Authorization:'Bearer '+user.token},signal:AbortSignal.timeout(90000),redirect:'error'});return{status:response.status,body:await response.json()};}
async function ready(){for(let n=0;n<60;n++){assert.equal(server.exitCode,null);try{if((await api(null)).status===401)return;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}throw Error('Local profit server not ready');}
async function rpc(user,name,args){const result=await user.client.rpc(name,args);assert.equal(result.error,null,JSON.stringify(result.error));return result.data;}
const line=(instanceId,unitMinor,quantity=1)=>({instanceId,description:'Synthetic report item',quantity,unitMinor});
const cart=(version,items,extra={})=>({version,storeName:'Synthetic profit shop',items,method:'Cash',taxMinor:0,note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''},...extra});
try {
 start(true);await ready();
 for(let index=0;index<2;index++){
  const email=randomUUID()+'@profit.invalid',password=randomUUID()+'Aa1!',made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);
  const user={id:made.data.user.id,cookies:[]};users.push(user);save('fixtures.json',{owners:users.map(u=>u.id),set,card,copies,oldSale,sale,project});
  user.client=createServerClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{cookies:{getAll:()=>user.cookies,setAll:values=>{for(const cookie of values){user.cookies=user.cookies.filter(c=>c.name!==cookie.name);user.cookies.push(cookie);}}}});
  const signed=await user.client.auth.signInWithPassword({email,password});assert.equal(signed.error,null);user.token=signed.data.session.access_token;
 }
 const [owner,other]=users;
 await q("insert into sets(id,code,name,game) values($1,$2,'Private profit fixture','pokemon')",[set,set]);
 await q("insert into card_prints(id,game_id,set_id,name,number,gv_id) values($1,(select id from games where code='pokemon'),$2,'Private profit fixture','1',$3)",[card,set,'GV-PK-PROFIT-'+card]);
 for(const [amount,currency]of [[12,'USD'],[3,'CAD']]){
  const id=randomUUID(),anchor=randomUUID(),gvvi='GVVI-PROFIT-'+randomUUID().toUpperCase();
  await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Private profit fixture',$4)",[anchor,owner.id,card,'GV-PK-PROFIT-'+card]);
  await q('insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id,acquisition_cost,acquisition_currency) values($1,$2,$3,$4,$5,$6,$7)',[id,owner.id,card,anchor,gvvi,amount,currency]);copies.push(id);
 }
 save('fixtures.json',{owners:users.map(u=>u.id),set,card,copies,oldSale,sale,project});
 await q('update vendor_receipt_cloud_control set enabled=true;update vendor_sales_cart_control set enabled=true;update vendor_sales_trade_control set enabled=true;update vendor_sales_payment_control set enabled=true');
 await rpc(owner,'vendor_sales_cart_complete_v1',{p_request_id:oldSale,p_cart:cart(1,[line(null,1000)])});
 await q('update vendor_cost_evidence_control set capture_enabled=true');
 const payload=cart(3,[line(copies[0],2000),line(copies[1],500),line(null,250,2)],{method:'Split payment',taxMinor:100,
  trades:[{description:'Incoming quick trade',quantity:1,valueMinor:500,rateBps:10000,cardId:null,printingId:null,condition:null,addToVault:false}],
  payments:[{method:'Cash',amountMinor:1000,tenderedMinor:1000},{method:'Card (external terminal)',amountMinor:1600,tenderedMinor:1600}]});
 const sold=await rpc(owner,'vendor_sales_cart_complete_v3',{p_request_id:sale,p_cart:payload});assert.equal(sold.subtotalMinor,3000);assert.equal(sold.totalMinor,3100);assert.equal(sold.tradeIn.balanceMinor,2600);
 assert.equal((await api(owner,[],owner.id)).status,400);assert.equal((await api(owner,['bad'])).status,400);assert.equal((await api(owner,[sale,sale])).status,400);assert.equal((await api(owner,Array.from({length:101},()=>randomUUID()))).status,400);
 assert.equal((await api(owner,[sale],other.id)).status,409);assert.deepEqual((await api(other,[sale,oldSale])).body.snapshots,[]);
 assert.equal((await book(owner,other.id)).status,409);
 const initial=await api(owner,[sale,oldSale]);assert.equal(initial.status,200);assert.equal(initial.body.ownerId,owner.id);assert.equal(initial.body.snapshots.length,1);
 const recorded=await book(owner);assert.equal(recorded.status,200);assert.equal(recorded.body.ownerId,owner.id);
 const {salesProfit}=await import('../../apps/web/src/lib/sales/salesProfit.mjs');
 const profit=salesProfit(recorded.body.book.receipts.map(entry=>entry.receipt),initial.body.snapshots);
 assert.equal(profit.itemSalesMinor,'4000');assert.equal(profit.knownSalesMinor,'2000');assert.equal(profit.knownCostMinor,'1200');assert.equal(profit.knownProfitMinor,'800');assert.equal(profit.unknownSalesMinor,'2000');assert.equal(profit.knownLines,1);assert.equal(profit.totalLines,4);assert.equal(profit.totalUnits,'5');
 assert.deepEqual(profit.reasons.map(row=>row.reason),['foreign_currency','missing_snapshot','unlinked']);
 save('report.json',profit);checks.push('real authenticated API validates bounded IDs and owner scope; v1 old/manual and v3 mixed stock/trade/split receipts reconcile with immutable cost coverage');
 // Synthetic historical alteration proves the report never substitutes today's copy cost.
 await q('update vault_item_instances set acquisition_cost=9999,acquisition_currency=\'USD\' where id=$1',[copies[0]]);
 assert.deepEqual((await api(owner,[sale,oldSale])).body.snapshots,initial.body.snapshots);
 await q('update vendor_cost_evidence_control set capture_enabled=false');
 const priorRead=await retained();
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies(owner.cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,sameSite:'Lax'})));page=await context.newPage();
 const methods=[];page.on('request',request=>{if(request.url().startsWith(origin+'/api/sales/'))methods.push(request.method());});
 await page.goto(origin+'/account/store/reports',{waitUntil:'domcontentloaded'});
 const panel=page.getByRole('region',{name:'Private profit and cost coverage'});
 await expect(panel.getByText('$8.00',{exact:true})).toBeVisible();await expect(panel.getByText('1 of 4 item lines covered',{exact:true})).toBeVisible();
 await panel.getByText('Why some sales are excluded',{exact:true}).click();for(const label of ['Cost recorded in another currency','No cost recorded at sale','Item not linked to an exact copy'])await expect(panel.getByText(label,{exact:true})).toBeVisible();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:out+'/profit-phone.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:out+'/profit-desktop.png',fullPage:true});
 await page.getByText('Filter dates, receipts or payment method',{exact:true}).click();await page.getByLabel('Payment method',{exact:true}).selectOption('Split payment');
 await expect(panel.getByText('1 of 3 item lines covered',{exact:true})).toBeVisible();await expect(panel.getByText('$8.00',{exact:true})).toBeVisible();
 assert.ok(methods.length>=2 && methods.every(method=>method==='GET'));
 assert.deepEqual(await retained(),priorRead);checks.push('actual Reports route shows $8 covered profit, four-line coverage and exact exclusions on phone/desktop; split-method filtering agrees, GET-only browsing leaves all retained tables unchanged');
 await page.route('**/api/sales/costs?**',route=>route.fulfill({status:503,json:{error:'Injected local read failure'}}));
 await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(panel.getByRole('alert')).toBeVisible();await expect(panel.getByText('$8.00',{exact:true})).toHaveCount(0);
 await page.unroute('**/api/sales/costs?**');await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(panel.getByText('$8.00',{exact:true})).toBeVisible();
 checks.push('temporary API failure hides cost metrics without becoming zero/missing cost; Refresh recovers the same immutable values');
 await browser.close();browser=null;await stop();start(false);await ready();assert.equal((await api(owner,[sale])).status,404);
 browser=await chromium.launch();const hidden=await browser.newContext();await hidden.addCookies(owner.cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,sameSite:'Lax'})));page=await hidden.newPage();
 await page.goto(origin+'/account/store/reports',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'Sales dashboard',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Private profit and cost coverage'})).toHaveCount(0);
 checks.push('server flag off hides the private panel and denies its API while existing Reports remain available');
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};save('failure.json',failure);if(page&&browser)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});}
finally {
 if(browser)await browser.close();await stop();fs.closeSync(log);
 try {
  const ids=users.map(user=>user.id);await q('begin');
  try{
   await q('set local session_replication_role=replica');
   await q('delete from card_events where actor_user_id=any($1::uuid[]) or subject_user_id=any($1::uuid[])',[ids]);
   await q('delete from vault_item_instance_dispositions where user_id=any($1::uuid[])',[ids]);
   await q('delete from vault_item_instances where user_id=any($1::uuid[])',[ids]);await q('delete from vault_items where user_id=any($1::uuid[])',[ids]);
   await q('delete from pricing_watch where card_print_id=$1',[card]);await q('delete from card_prints where id=$1',[card]);await q('delete from sets where id=$1',[set]);await q('commit');
  }catch(error){await q('rollback');throw error;}
  for(const user of users){const result=await admin.auth.admin.deleteUser(user.id);assert.equal(result.error,null);}
  const after=await retained();save('retention.json',{before,after});assert.deepEqual(after,before);cleanup=true;
 }catch(error){save('cleanup-failure.json',{message:error.message});failure??={name:error.name,message:'Fixture cleanup: '+error.message,stack:error.stack};}
 finally{
  await q('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[flags.edit_enabled,flags.capture_enabled]);
  for(const [key,table]of [['cloud','vendor_receipt_cloud_control'],['cart','vendor_sales_cart_control'],['trade','vendor_sales_trade_control'],['payments','vendor_sales_payment_control']])await q(`update ${table} set enabled=$1`,[salesFlags[key]]);
  await db.end();
 }
}
save('receipt.json',{at:new Date().toISOString(),status:failure?'failed':'passed',checks,failure,cleanup,project,origin,productionRequests:0,reset:false});
console.log(JSON.stringify({out,status:failure?'failed':'passed',checks,cleanup,failure}));if(failure)process.exitCode=1;
