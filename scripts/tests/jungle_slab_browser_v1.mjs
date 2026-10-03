// Real Next server actions and browser UI, local Auth/PostgREST and synthetic PSA.
// The standard fixture staging origin is a temporary loopback relay to fixed53201.
import fs from 'node:fs';import assert from 'node:assert/strict';import net from 'node:net';import http from 'node:http';
import {execFileSync,spawn} from 'node:child_process';import {createRequire} from 'node:module';import {randomBytes} from 'node:crypto';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
const root='C:/gv_jungle_edition_20261001',base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const fixture=base+'/full-422-v25',project='jungle-edition-full-422-v25-20261001',web='http://127.0.0.1:53260';
const out=base+'/slab-browser-v1/attempt-'+Date.now();
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
const proof=JSON.parse(fs.readFileSync(base+'/slab-committed-v1/receipt.json'));assert.equal(proof.status,'passed');assert.equal(proof.project,project);
const users=JSON.parse(fs.readFileSync(base+'/slab-committed-v1/users.private.json'));assert.equal(users.length,2);
const require=createRequire(root+'/apps/web/package.json'),{chromium,expect:baseExpect}=require('@playwright/test'),{createClient}=require('@supabase/supabase-js'),{createServerClient}=require('@supabase/ssr');
const expect=baseExpect.configure({timeout:30000});
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:2*1024*1024});
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const status=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:20000}));assert.equal(status.API_URL,'http://127.0.0.1:53201');
for(const port of [53260,53261,54361])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:20000}).trim();
assert.equal(sql("select count(*)||':'||current_setting('max_worker_processes') from supabase_migrations.schema_migrations"),'422:0');
const admin=createClient(status.API_URL,localSupabaseStatusSecret(status),{auth:{persistSession:false,autoRefreshToken:false}});
const count=()=>Number(sql('select count(*) from jungle_slab_intake_receipts_v1'));
const before=count();
const certSeed=Number(String(Date.now()).slice(-7));
const goodCert='000'+String(certSeed).padStart(7,'0'),wrongCert='000'+String(certSeed+1).padStart(7,'0'),missingCert='000'+String(certSeed+2).padStart(7,'0');
fs.mkdirSync(out,{recursive:true});const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
fs.copyFileSync(new URL(import.meta.url),out+'/test-source.mjs',fs.constants.COPYFILE_EXCL);
save('intent.json',{at:new Date().toISOString(),project,localOnly:true,syntheticPsa:true,receiptsBefore:before,consumed:true,productionWrites:0});
const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
for(const dir of [root,root+'/apps/web'])for(const name of ['.env','.env.local','.env.development','.env.development.local']){const p=dir+'/'+name;if(fs.existsSync(p))for(const m of fs.readFileSync(p,'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))env[m[1]]='';}
const psaToken=randomBytes(24).toString('hex');
Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:54361',SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(status),NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54361',NEXT_PUBLIC_SUPABASE_ANON_KEY:status.ANON_KEY,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB:'true',GROOKAI_COLLECTOR_RELEASE_V1:'false',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:web,NEXT_PUBLIC_SITE_URL:web,JUNGLE_SLAB_INTAKE_ENABLED:'true',JUNGLE_SLAB_INTAKE_SECRET:randomBytes(48).toString('hex'),PSA_API_BASE_URL:'http://127.0.0.1:53261',PSA_API_TOKEN:psaToken,NODE_OPTIONS:'--require='+root+'/scripts/tests/vendor_storefront_network_guard.cjs'});
const sockets=new Set(),tests=[],requests=[];
const relay=net.createServer(s=>{const t=net.connect(53201,'127.0.0.1');sockets.add(s);sockets.add(t);s.pipe(t).pipe(s);s.on('error',()=>t.destroy());t.on('error',()=>s.destroy());s.on('close',()=>{sockets.delete(s);t.destroy();});t.on('close',()=>{sockets.delete(t);s.destroy();});});
const provider=http.createServer((req,res)=>{
 if(req.headers.authorization!=='bearer '+psaToken){res.writeHead(401).end();return;}
 const cert=req.url?.match(/^\/cert\/GetByCertNumber\/(\d+)$/)?.[1];if(!cert||![goodCert,wrongCert,missingCert].includes(cert)){res.writeHead(404).end();return;}
 requests.push(cert);if(cert===missingCert){res.writeHead(404).end();return;}
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({PSACert:{CertNumber:cert,Year:'1999',Brand:'POKEMON JUNGLE',Category:'TCG CARDS',CardNumber:'1',Subject:'Clefable',Variety:cert===wrongCert?'UNLIMITED HOLO':'1ST EDITION HOLO',CardGrade:'MINT 9',GradeDescription:'MINT 9',IsPSADNA:false,IsDualCert:false,ItemStatus:null}}));
});
let child,browser;const pass=name=>{tests.push(name);console.log(JSON.stringify({passed:tests.length,last:name}));};
async function authenticatedContext(user){
 let cookies=[];const auth=createServerClient('http://127.0.0.1:54361',status.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:v=>{cookies=v;}}});
 const login=await auth.auth.signInWithPassword({email:user.email,password:user.password});assert.ifError(login.error);assert.equal(login.data.user.id,user.id);
 const context=await browser.newContext({viewport:{width:1280,height:1000}});await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:web,httpOnly:false,secure:false,sameSite:'Lax'})));
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());return context;
}
try{
 await new Promise((r,j)=>{relay.once('error',j);relay.listen(54361,'127.0.0.1',r);});await new Promise((r,j)=>{provider.once('error',j);provider.listen(53261,'127.0.0.1',r);});
 const fd=fs.openSync(out+'/next.private.log','wx');child=spawn(process.execPath,[root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','53260'],{cwd:root+'/apps/web',env,windowsHide:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);
 let ready=false;for(let i=0;i<100;i++){assert.equal(child.exitCode,null,'Next exited');try{const r=await fetch(web+'/login',{signal:AbortSignal.timeout(3000)});if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'Next did not become ready');
 browser=await chromium.launch({headless:true});const anonymous=await browser.newContext();const anonPage=await anonymous.newPage();const card='/card/GV-PK-JU-1-FIRST-EDITION';await anonPage.goto(web+card);await expect(anonPage.locator('summary').filter({hasText:'Add Jungle PSA slab'})).toHaveCount(0);pass('Anonymous card view cannot expose slab intake');
 const owner=await authenticatedContext(users[0]),other=await authenticatedContext(users[1]);const page=await owner.newPage();await page.goto(web+card);await page.locator('summary').filter({hasText:'Add Jungle PSA slab'}).click();
 const panel=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Add Jungle PSA slab'})});
 await expect(panel.getByLabel('Edition and finish')).toHaveValue('');await expect(panel.getByRole('button',{name:'Verify with PSA'})).toBeDisabled();pass('Signed-in UI requires an explicit edition selection');
 async function prepare(cert,grade='9'){await panel.getByLabel('Edition and finish').selectOption(proof.ids.firstChild);await panel.getByLabel('PSA grade').selectOption(grade);await panel.getByLabel('Certificate number',{exact:true}).fill(cert);await panel.getByLabel('Confirm certificate number',{exact:true}).fill(cert);await panel.getByRole('button',{name:'Verify with PSA'}).click();}
 await prepare(wrongCert);await expect(panel.getByRole('status')).toContainText('PSA could not confirm');assert.equal(count(),before);pass('Wrong provider edition rejects without a database write');
 await prepare(missingCert);await expect(panel.getByRole('status')).toContainText('PSA could not confirm');assert.equal(count(),before);pass('Provider lookup failure rejects without a database write');
 await prepare(goodCert,'8');await expect(panel.getByRole('status')).toContainText('grade does not match');assert.equal(count(),before);pass('Provider grade mismatch rejects without a database write');
 await prepare(goodCert);await expect(panel.getByRole('button',{name:'Save to Vault',exact:true})).toBeDisabled();assert.equal(count(),before);pass('Successful real server preparation writes nothing and requires ownership confirmation');
 await panel.getByRole('checkbox').check();let captured,dropped=false;
 await page.route('**/card/**',async route=>{
  const req=route.request();if(!dropped&&req.method()==='POST'&&req.headers()['next-action']){
   const body=req.postData();let parsed;try{parsed=JSON.parse(body);}catch{}
   if(Array.isArray(parsed)&&typeof parsed[0]==='string'&&parsed[1]===true){captured={action:req.headers()['next-action'],body,token:parsed[0]};const response=await route.fetch();assert.equal(response.status(),200);await response.body();dropped=true;await route.abort('failed');return;}
  }await route.continue();
 });
 await panel.getByRole('button',{name:'Save to Vault',exact:true}).click();await expect(panel.getByRole('status')).toContainText('response was interrupted');assert.equal(dropped,true);assert.equal(count(),before+1);pass('Browser loses committed server-action response while original save remains committed');
 const rowsBefore=await admin.from('vault_item_instances').select('id,user_id,gv_vi_id,card_printing_id,slab_cert_id,legacy_vault_item_id').eq('user_id',users[0].id).order('id');assert.ifError(rowsBefore.error);
 await page.screenshot({path:out+'/retry-after-response-loss.png',fullPage:true});
 const send=(context,body)=>context.request.post(web+card,{headers:{'Next-Action':captured.action,Origin:web,'Content-Type':'text/plain;charset=UTF-8'},data:body});
 for(const [name,context,body,expected]of [
  ['anonymous token replay',anonymous,captured.body,'could not be confirmed'],
  ['cross-owner token replay',other,captured.body,'could not be confirmed'],
  ['missing ownership confirmation',owner,JSON.stringify([captured.token,false]),'Confirm that you own'],
  ['tampered ticket',owner,JSON.stringify([captured.token.slice(0,-2)+'xx',true]),'could not be confirmed'],
 ]){const r=await send(context,body);assert.equal(r.status(),200);assert.ok((await r.text()).includes(expected));assert.equal(count(),before+1);pass(name+' rejects through actual server action');}
 await panel.getByRole('button',{name:'Save to Vault',exact:true}).click();await expect(panel.getByRole('status')).toContainText('Slab added to your Vault.');assert.equal(count(),before+1);
 const rowsAfter=await admin.from('vault_item_instances').select('id,user_id,gv_vi_id,card_printing_id,slab_cert_id,legacy_vault_item_id').eq('user_id',users[0].id).order('id');assert.ifError(rowsAfter.error);assert.deepEqual(rowsAfter.data,rowsBefore.data);pass('In-page retry recovers the exact same instance and allocation');
 await expect(page.getByText('Cert '+goodCert,{exact:true})).toBeVisible();pass('Refreshed card view shows the newly saved certificate in Your copies');
 await page.screenshot({path:out+'/save-confirmed.png',fullPage:true});
 save('receipt.json',{at:new Date().toISOString(),status:'passed',project,checks:tests.length,tests,providerRequests:requests,syntheticPsa:true,realAuth:true,realNextServerActions:true,realBrowser:true,receiptsBefore:before,receiptsAfter:count(),productionWrites:0,hostedActivation:false});console.log(JSON.stringify({status:'passed',checks:tests.length,out}));
}catch(e){save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack});throw e;}finally{
 if(browser)await browser.close();if(child?.exitCode===null)execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
 for(const s of sockets)s.destroy();relay.close();provider.closeAllConnections();provider.close();
}
