import fs from 'node:fs';
import assert from 'node:assert/strict';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import pg from 'pg';
const root='C:/gv_product_collector_usability_20261008',base='C:/grookai_vault_operator_artifacts/product_collector_usability_20261008',origin='http://127.0.0.1:35691';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,3);
const run=process.argv[2];assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');
const command=(n,a)=>execFileSync(n,a,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:64*1024*1024}),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const out=run+'/web-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const files=command('git',['ls-files','-co','--exclude-standard','apps/web/src','apps/web/next.config.mjs']).trim().split(/\r?\n/),hashes=Object.fromEntries([...new Set(files)].filter(p=>fs.existsSync(root+'/'+p)).map(p=>[p,sha(root+'/'+p)]));save('source-binding.json',{at:new Date().toISOString(),hashes});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir','C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/full-438-v2']));assert.equal(cfg.API_URL,'http://127.0.0.1:35521');
const web=createRequire(root+'/apps/web/package.json'),{createServerClient}=web('@supabase/ssr'),{chromium,expect}=web('@playwright/test');
const env={};for(const[k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
assert.equal(fs.readdirSync(root+'/apps/web').some(n=>n.startsWith('.env')),false);
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_PORTFOLIO_HISTORY_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,NODE_USE_SYSTEM_CA:'1',GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED:'true',GROOKAI_BINDERS_PERSONAL_V1_ENABLED:'true',GROOKAI_BINDERS_CUSTOM_V1_ENABLED:'true',GROOKAI_BINDERS_PUBLIC_V1_ENABLED:'true'});
let server,stopped,browser,context,page,failure;const checks=[],blocked=[],errors=[];const fd=fs.openSync(out+'/server.private.log','wx');
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35520/postgres',connectionTimeoutMillis:10000});await db.connect();
async function authenticate(user){
 if(context)await context.close();context=await browser.newContext({viewport:{width:390,height:900},colorScheme:'light',locale:'en-US'});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if([origin,cfg.API_URL].includes(u.origin)||['data:','blob:'].includes(u.protocol))return route.continue();blocked.push(u.origin);return route.abort('blockedbyclient');});
 let cookies=[];const client=createServerClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{for(const v of values){cookies=cookies.filter(c=>c.name!==v.name);cookies.push(v);}}}});
 const signed=await client.auth.signInWithPassword({email:user.email,password:user.password});assert.equal(signed.error,null);assert.equal(signed.data.user.id,user.id);
 await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:c.options.httpOnly??false,sameSite:'Lax',expires:Math.floor(Date.now()/1000)+(c.options.maxAge??3600)})));
 page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
}
async function picture(name,target){if(target)await target.scrollIntoViewIfNeeded();await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});await page.screenshot({path:out+'/'+name+'.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');}
const goals=()=>page.locator('[data-binder-continuation]');
try{
 await new Promise((resolve,reject)=>{const p=net.createServer();p.once('error',reject);p.listen(35691,'127.0.0.1',()=>p.close(resolve));});
 server=spawn(process.execPath,['--use-system-ca',root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','35691'],{cwd:root+'/apps/web',env,stdio:['ignore',fd,fd],windowsHide:true});stopped=new Promise(resolve=>server.once('exit',resolve));
 let ready=false;for(let i=0;i<100&&!ready;i++){assert.equal(server.exitCode,null);try{ready=(await fetch(origin+'/api/navigation/shell',{signal:AbortSignal.timeout(2000)})).status===401;}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,300));}assert.ok(ready,'Server not ready');
 browser=await chromium.launch({headless:true});
 const collaboration=read(run+'/collaboration-1791508619086/result.json');assert.equal(collaboration.status,'passed');
 await authenticate(f.users[1]);await page.goto(origin+'/binders/'+collaboration.publicId,{waitUntil:'domcontentloaded'});
 const title=page.getByRole('heading',{name:'Public collaboration proof',exact:true});await expect(title).toBeVisible();await picture('public-authenticated');
 await expect(page.getByRole('button',{name:'Add your copy',exact:true})).toHaveCount(0);
 const account=await context.newPage();await account.goto(origin+'/account');await account.getByRole('button',{name:'Sign out',exact:true}).click();await expect(account).toHaveURL(/login/);
 await expect(title).toBeVisible();await expect(page.getByText(/Your account changed/)).toHaveCount(0);await picture('public-after-signout');
 checks.push('Public projection remains readable when a nonmember signs out in another tab.');
 await page.reload();await expect(title).toBeVisible();await picture('public-anonymous');checks.push('A fresh anonymous request reads the same public Binder independently of private owner boundaries.');
 await authenticate(f.users[0]);await page.goto(origin+'/binders',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'Binders',exact:true})).toBeVisible();
 for(const binder of f.binders)await expect(page.getByRole('link',{name:new RegExp(binder.title)})).toBeVisible();await picture('binder-library-loaded');checks.push('The owner-checked Binder library resolves its initial placeholder and displays all four original private goals.');
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
 for(const [name,hash]of Object.entries(hashes))assert.equal(sha(root+'/'+name),hash,name);
 command(process.execPath,['scripts/audits/product_collector_usability_fixture_v1.mjs','verify',run]);
}catch(error){failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});}
finally{await db.query("update binder_feature_flags set enabled=true where flag_key='schema_internal'");await db.end();if(browser)await browser.close();if(server&&server.exitCode===null)server.kill();if(stopped)await stopped;fs.closeSync(fd);}
save('result.json',{status:failure?'failed':'passed',at:new Date().toISOString(),checks,blocked,errors,failure,productionWrites:0,fixtureStillPrepared:true});console.log(JSON.stringify({out,status:failure?'failed':'passed',checks:checks.length,failure:failure?.message}));if(failure)process.exitCode=1;
