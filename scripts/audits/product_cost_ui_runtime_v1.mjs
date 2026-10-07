// Real local Auth, Next route, owner page, immutable request recovery and DB readback.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import net from 'node:net';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
const root='C:/gv_product_cost_ui_20261007',base='C:/grookai_vault_operator_artifacts/product_cost_ui_20261007';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,2);
const lab='C:/grookai_vault_operator_artifacts/product_economics_20261007/full-431-v2',project='product-cost-full-431-v2-20261007';
const origin='http://127.0.0.1:33210',port=33210;
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
const tables=['auth.users','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.vendor_receipt_books','public.vendor_sale_cost_snapshots','public.card_events','public.pricing_watch'];
async function retained(){const result={};for(const table of tables)result[table]=(await q(`select md5(coalesce(string_agg(row_to_json(t)::text,E'\n' order by row_to_json(t)::text),'')) digest,count(*)::int n from ${table} t`))[0];return result;}
const before=await retained();
const env={};for(const[k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COPY_COST_LOCAL_TEST:'true',GROOKAI_VISUAL_TEST_MODE:'1',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,GV_COPY_COST_V1:'1'});
assert.equal(fs.readdirSync(root+'/apps/web').some(n=>n.startsWith('.env')),false);
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(base,{recursive:true});const out=base+'/runtime-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2));
save('before.json',{project,before,flags});
const log=fs.openSync(out+'/server.log','wx');let server,stopped;
function start(enabled){server=spawn(process.execPath,['--use-system-ca',root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'/apps/web',env:{...env,GV_COPY_COST_V1:enabled?'1':'0'},stdio:['ignore',log,log],windowsHide:true});stopped=new Promise(resolve=>server.once('exit',resolve));}
async function stop(){if(server && server.exitCode===null)server.kill();if(stopped)await stopped;}
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),users=[],copies=[];
let browser,page,failure=null,cleanup=false;const checks=[];
async function api(user,params={},body,headers={}){const response=await fetch(origin+'/api/vault/cost?'+new URLSearchParams(params),{headers:{Connection:'close',...(user?{Authorization:'Bearer '+user.token}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{}),...headers},...(body?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000),redirect:'error'});assert.match(response.headers.get('cache-control')??'',/no-store/);return {status:response.status,body:await response.json()};}
async function ready(){for(let n=0;n<60;n++){assert.equal(server.exitCode,null);try{if((await api(null)).status===401)return;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}throw Error('Local cost server not ready');}
const request=(owner,copy,amount,currency,expectedAmount='12.00',expectedCurrency=null)=>({ownerId:owner.id,instanceId:copy,requestId:randomUUID(),amount,currency,expectedAmount,expectedCurrency});
try {
 start(true);await ready();
 for(let i=0;i<2;i++){
  const email=randomUUID()+'@cost-ui.invalid',password=randomUUID()+'Aa1!';const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);
  const user={id:made.data.user.id,cookies:[]};users.push(user);
  const client=createServerClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{cookies:{getAll:()=>user.cookies,setAll:values=>{for(const c of values){user.cookies=user.cookies.filter(x=>x.name!==c.name);user.cookies.push(c);}}}});
  const signed=await client.auth.signInWithPassword({email,password});assert.equal(signed.error,null);user.token=signed.data.session.access_token;
 }
 const card=(await q('select id,gv_id from card_prints order by id limit 1'))[0];assert.ok(card);
 for(const user of users){const id=randomUUID(),anchor=randomUUID(),gvvi='GVVI-COSTUI-'+randomUUID().toUpperCase();
  await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Private cost UI fixture',$4)",[anchor,user.id,card.id,card.gv_id]);
  await q('insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id,acquisition_cost,acquisition_currency) values($1,$2,$3,$4,$5,12.00,null)',[id,user.id,card.id,anchor,gvvi]);copies.push({id,gvvi});
 }
 save('fixtures.json',{owners:users.map(u=>u.id),copies,project});
 const owner=users[0],other=users[1],copy=copies[0];
 assert.equal((await api(owner,{owner:other.id,instanceId:copy.id})).status,409);
 assert.equal((await api(other,{owner:other.id,instanceId:copy.id})).status,404);
 const initial=await api(owner,{owner:owner.id,instanceId:copy.id});assert.equal(initial.status,200);assert.equal(initial.body.copy.cost.currency,null);assert.equal(initial.body.editEnabled,false);
 const first=request(owner,copy.id,'0.00','CAD',initial.body.copy.cost.amount);
 const disabled=await api(owner,{},first);assert.equal(disabled.status,403);assert.equal(disabled.body.definitive,true);
 await q('update vendor_cost_evidence_control set edit_enabled=true');
 assert.equal((await api(owner,{},first,{Origin:'https://untrusted.invalid'})).status,403);
 assert.equal((await api(other,{},first)).status,409);
 assert.equal((await api(owner,{}, {...first,amount:'1.001'})).status,400);
 checks.push('real API authenticates, scopes owner reads, rejects origin/account mismatch, validates decimal and respects database switch');
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies(owner.cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,sameSite:'Lax'})));page=await context.newPage();
 await page.goto(origin+'/vault/gvvi/'+copy.gvvi,{waitUntil:'domcontentloaded'});
 const cost=page.getByRole('region',{name:'Private cost'});await expect(cost.getByLabel('Cost amount',{exact:true})).toBeEnabled();
 await expect(cost.getByLabel('Currency',{exact:true})).toHaveValue('');
 await cost.getByLabel('Cost amount',{exact:true}).fill('0');await cost.getByLabel('Currency',{exact:true}).fill('CAD');
 let sent;
 await page.route('**/api/vault/cost',async route=>{if(route.request().method()==='POST'){sent=route.request().postDataJSON();const response=await route.fetch();assert.equal(response.status(),200);await route.abort();}else await route.continue();});
 await cost.getByRole('button',{name:'Save cost',exact:true}).click();await expect(cost.getByRole('button',{name:'Retry same save'})).toBeEnabled();
 assert.ok(sent);assert.deepEqual((await q('select acquisition_cost::text amount,acquisition_currency currency from vault_item_instances where id=$1',[copy.id]))[0],{amount:'0.00',currency:'CAD'});
 await page.unroute('**/api/vault/cost');await page.reload();await expect(cost.getByText('Cost saved.',{exact:true})).toBeVisible();
 assert.equal((await q('select count(*)::int n from vault_copy_cost_requests where owner_id=$1',[owner.id]))[0].n,1);
 assert.equal((await api(other,{owner:other.id,requestId:sent.requestId})).body.result,null);
 await page.screenshot({path:out+'/private-cost-phone.png',fullPage:true});
 checks.push('actual owner page saves known zero CAD; dropped successful response recovers after reload with one request and exact DB readback');
 const stale=request(owner,copy.id,'3.00','USD');const conflict=await api(owner,{},stale);assert.equal(conflict.status,409);assert.equal(conflict.body.definitive,true);assert.equal(conflict.body.conflict,true);
 const retry=await api(owner,{},sent);assert.equal(retry.status,200);assert.equal(retry.body.result.requestId,sent.requestId);
 const changed=await api(owner,{}, {...sent,amount:'1.00'});assert.equal(changed.status,503);assert.notEqual(changed.body.definitive,true);
 await q('update vault_item_instances set archived_at=now() where id=$1',[copy.id]);
 const archived=await api(owner,{},request(owner,copy.id,'3.00','USD','0.00','CAD'));assert.equal(archived.status,409);assert.equal(archived.body.definitive,true);
 await q('update vendor_cost_evidence_control set edit_enabled=false');
 assert.equal((await api(owner,{owner:owner.id,requestId:sent.requestId})).body.result.cost.minor,'0');
 checks.push('stale pair and archived writes conflict; changed UUID payload remains unresolved; exact retry and recovery survive database switch-off');
 await browser.close();browser=null;await stop();start(false);await ready();
 assert.equal((await api(owner,{owner:owner.id,instanceId:copy.id})).status,404);
 assert.equal((await api(owner,{owner:owner.id,requestId:sent.requestId})).body.result.cost.minor,'0');
 assert.equal((await api(owner,{},sent)).status,404);
 checks.push('real server feature-off hides new cost reads/writes while allowing original request recovery');
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};save('failure.json',failure);if(page&&browser)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});}
finally {
 if(browser)await browser.close();await stop();fs.closeSync(log);
 try {
  // Only this run's synthetic rows: bypass append-only event deletion for local cleanup.
  const ids=users.map(user=>user.id);
  await q('begin');
  try {
   await q('set local session_replication_role=replica');
   await q('delete from card_events where actor_user_id=any($1::uuid[]) or subject_user_id=any($1::uuid[])',[ids]);
   await q('delete from vault_item_instances where user_id=any($1::uuid[])',[ids]);
   await q('delete from vault_items where user_id=any($1::uuid[])',[ids]);
   await q('commit');
  }catch(error){await q('rollback');throw error;}
  for(const user of users){const result=await admin.auth.admin.deleteUser(user.id);assert.equal(result.error,null);}
  await q('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[flags.edit_enabled,flags.capture_enabled]);
  const after=await retained();save('retention.json',{before,after});assert.deepEqual(after,before);cleanup=true;
 }catch(error){save('cleanup-failure.json',{message:error.message});failure??={name:error.name,message:'Fixture cleanup: '+error.message,stack:error.stack};}
 finally{await q('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[flags.edit_enabled,flags.capture_enabled]);}
 await db.end();
}
save('receipt.json',{at:new Date().toISOString(),status:failure?'failed':'passed',checks,failure,cleanup,project,origin,productionRequests:0,reset:false});
console.log(JSON.stringify({out,status:failure?'failed':'passed',checks,cleanup,failure}));if(failure)process.exitCode=1;
