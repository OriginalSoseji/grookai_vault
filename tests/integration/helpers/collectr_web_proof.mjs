import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {localSupabaseStatusSecret} from '../../../scripts/lib/local_supabase_cli_status_v1.mjs';
const origin='http://127.0.0.1:58863';

export async function startCollectrWebProof({root,status,runDir}) {
 assert.equal(root.replaceAll('\\','/'),process.env.GV_COLLECTR_WORKSPACE_HTTP_PROOF==='1'||process.env.GV_COLLECTR_ART_HTTP_PROOF==='1'||process.env.GV_COLLECTR_ADVENTURE_HTTP_PROOF==='1'||process.env.GV_COLLECTR_FCA_HTTP_PROOF==='1'||process.env.GV_COLLECTR_REVIEW_HTTP_PROOF==='1'||process.env.GV_COLLECTR_NAMED_FINISH_HTTP_PROOF==='1'?'C:/gv_collectr_adventure_20261001':'C:/gv_collectr_web_v2_20261001');
 assert.equal(status.API_URL,'http://127.0.0.1:58541');
 await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(58863,'127.0.0.1',()=>s.close(resolve));});
 const env={...process.env};
 for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|SECRET|TOKEN|API_KEY|PASSWORD|VERCEL|STRIPE|DOTENV_CONFIG_PATH|NODE_OPTIONS|GROOKAI_COLLECTOR_RELEASE|NEXT_PUBLIC_COLLECTOR|NEXT_PUBLIC_VENDOR|NEXT_PUBLIC_STOREFRONT/.test(key))delete env[key];
 Object.assign(env,{SUPABASE_URL:status.API_URL,SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(status),NEXT_PUBLIC_SUPABASE_URL:status.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY:status.ANON_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COLLECTR_IMPORT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,NODE_USE_SYSTEM_CA:'1'});
 assert.ok(!fs.existsSync(root+'/apps/web/.env.local'));assert.ok(!fs.existsSync(root+'/apps/web/.env'));
 const child=spawn(process.execPath,[root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','58863'],{cwd:root+'/apps/web',env,stdio:['ignore','pipe','pipe'],windowsHide:true});
 const log=fs.createWriteStream(runDir+'/next.private.log',{flags:'wx'});
 child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
 async function stop(){if(child.exitCode===null){execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}log.end();}
 try {
  let ready=false;for(let i=0;i<120;i++){assert.equal(child.exitCode,null,'Next exited before ready');try{const r=await fetch(origin+'/api/vault/import',{method:'POST',headers:{Origin:'https://foreign.invalid'}});if(r.status===403){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
  assert.ok(ready,'Next import endpoint did not start');return{stop};
 }catch(error){await stop();throw error;}
}

export async function proveCollectrBrowser({root,status,runDir,user,csvText}) {
 const require=createRequire(root+'/apps/web/package.json');
 const {chromium}=require('@playwright/test'),{createServerClient}=require('@supabase/ssr');
 let cookies=[];
 const auth=createServerClient(status.API_URL,status.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{cookies=values;}}});
 assert.equal((await auth.auth.setSession(user.session)).error,null);
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,secure:false,sameSite:'Lax'})));
  const page=await context.newPage();
  await page.goto(origin+'/vault/import');
  await page.getByRole('heading',{name:'Import your collection',exact:true}).waitFor();
  await page.locator('#collectr-csv').setInputFiles({name:'synthetic-browser.csv',mimeType:'text/csv',buffer:Buffer.from(csvText)});
  const save=page.getByRole('button',{name:'Save 2 ready copies and retain review rows'});
  await save.waitFor();
  await page.screenshot({path:runDir+'/browser-preview.png',fullPage:true});
  let interrupted=false;
  await page.route('**/api/vault/import',async route=>{
   const body=route.request().postDataJSON();
   if(!interrupted&&body.operation==='save'){
    interrupted=true;const response=await route.fetch();assert.equal(response.status(),200,await response.text());await route.abort('failed');
   }else await route.continue();
  });
  await save.click();await page.getByRole('alert').waitFor();
  assert.ok(interrupted);
  const attempt=await page.evaluate(id=>JSON.parse(sessionStorage.getItem('vault-import:v2:'+id)),user.id);
  assert.ok(attempt.requestId);assert.equal(attempt.csvText,csvText);
  await page.reload();
  await page.getByRole('button',{name:'Retry saved import'}).click();
  await page.getByRole('heading',{name:'Import verified',exact:true}).waitFor();
  await page.getByText('0 copies added. 2 source rows retained for review.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(id=>sessionStorage.getItem('vault-import:v2:'+id),user.id),null);
  await page.screenshot({path:runDir+'/browser-verified.png',fullPage:true});
  await context.close();
 }finally{await browser.close();await auth.auth.signOut({scope:'local'});}
}
