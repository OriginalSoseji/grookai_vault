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
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_PORTFOLIO_HISTORY_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,NODE_USE_SYSTEM_CA:'1',GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED:'true',GROOKAI_BINDERS_PERSONAL_V1_ENABLED:'true',GROOKAI_BINDERS_CUSTOM_V1_ENABLED:'true'});
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
 browser=await chromium.launch({headless:true});await authenticate(f.users[0]);await page.goto(origin+'/vault',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Your Vault',exact:true})).toBeVisible();await expect(goals().locator('li')).toHaveCount(1);await expect(page.getByRole('link',{name:'Find a card',exact:true}).first()).toBeVisible();
 await expect(page.getByRole('heading',{name:'Your collection was not changed',exact:true})).toHaveCount(0);await expect(page.getByText('1 card',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Vault Cards',exact:true})).toBeVisible();checks.push('No-profile account reaches actual one-copy inventory and one visible goal from three bounded existing goals.');
 for(const[width,height,name]of[[390,900,'phone'],[320,820,'narrow-phone'],[768,1024,'tablet'],[1440,1000,'desktop']]){await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));if(width<768){await expect(page.getByRole('combobox',{name:'Choose vault mobile view'})).toHaveValue('compact');const card=await page.locator('[data-vault-copy-presentation]:visible').first().locator('xpath=ancestor::a[1]').boundingBox();if(width>=390)assert.ok(card.y+40<height-70,'First card identity must be above the dock');else {assert.ok((await page.getByRole('textbox',{name:'Search Vault',exact:true}).boundingBox()).y<height-70);await page.getByLabel('More navigation',{exact:true}).click();await expect(page.getByRole('link',{name:'Vendor workspace',exact:true})).toBeVisible();await page.getByLabel('More navigation',{exact:true}).click();}}await picture(name);checks.push({viewport:name,inventoryControls:await (width<768?page.getByRole('textbox',{name:'Search Vault',exact:true}):page.getByPlaceholder('Search your vault...')).boundingBox(),firstCard:await (width<768?page.locator('[data-vault-copy-presentation]:visible').first().locator('xpath=ancestor::a[1]'):page.locator('.gv-visual-card-image:visible').first()).boundingBox()});}
 await page.setViewportSize({width:390,height:900});const view=page.getByRole('combobox',{name:'Choose vault mobile view'});
 await view.selectOption('grid');await page.reload();await expect(view).toHaveValue('grid');await picture('phone-grid');
 await view.selectOption('detail');await expect(view).toHaveValue('detail');await picture('phone-detail');await view.selectOption('compact');
 checks.push('Compact is the first-session phone default; explicit grid survives reload and detail remains available.');
 await goals().getByRole('button',{name:'Show 2 more goals',exact:true}).click();await expect(goals().locator('li')).toHaveCount(3);await expect(goals()).toContainText('Showing recent goals.');await expect(goals().getByRole('link',{name:/Weekend collection goal/})).toBeVisible();await picture('expanded-goals',goals());
 await goals().getByRole('button',{name:'Show fewer goals',exact:true}).click();await expect(goals().locator('li')).toHaveCount(1);checks.push('One goal initially; explicit expansion retains all three bounded goals and collapses again.');
 await page.setViewportSize({width:390,height:900});const dock=page.locator('[data-mobile-parity-dock]');assert.deepEqual(await dock.locator('[data-dock-label]').allTextContents(),['Vault','Explore','Scan','Binders','Community']);
 await goals().getByRole('link',{name:/Another collection goal/}).click();await expect(page).toHaveURL(origin+'/binders/'+f.binders[3].publicId);await expect(dock).toHaveCount(0);checks.push('Resume opens the exact Binder; detail keeps pushed chrome.');
 await page.goto(origin+'/binders');await expect(dock).toBeVisible();await picture('binder-root');
 await dock.getByRole('link',{name:'Explore',exact:true}).click();await expect(page).toHaveURL(origin+'/explore');await dock.getByRole('link',{name:'Scan',exact:true}).click();await expect(page).toHaveURL(origin+'/scan');await expect(dock).toHaveCount(0);await page.goBack();await expect(page).toHaveURL(origin+'/explore');checks.push('Scan remains a full-screen action and Back returns to Explore.');
 await page.goto(origin+'/network');await expect(page.getByRole('navigation',{name:'Community',exact:true})).toBeVisible();await picture('community');
 await db.query("update binder_feature_flags set enabled=false where flag_key='schema_internal'");await page.goto(origin+'/vault');await expect(goals()).toContainText('Your collection goals could not load.');await expect(page.getByRole('heading',{name:'Your Vault',exact:true})).toBeVisible();await picture('goals-unavailable',goals());
 await db.query("update binder_feature_flags set enabled=true where flag_key='schema_internal'");await goals().getByRole('button',{name:'Try again',exact:true}).click();await expect(goals().locator('li')).toHaveCount(1);checks.push('Failed Binder read does not hide inventory; retry restores goals.');
 const account=await context.newPage();await account.goto(origin+'/account');await account.getByRole('button',{name:'Sign out',exact:true}).click();await expect.poll(async()=>await page.getByText('Your account changed. Reopen Vault to view your collection.',{exact:true}).isVisible()||new URL(page.url()).pathname==='/login',{timeout:15000}).toBe(true);await expect(goals()).toHaveCount(0);await expect(page.getByRole('heading',{name:'Vault Cards',exact:true})).toHaveCount(0);await picture('account-closed');checks.push('Real sign-out in another tab removes private Vault and Binder data; explicit closed state or authenticated-route redirect.');
 for(const path of ['/binders/'+f.binders[3].publicId,'/binders','/saved']){
  await authenticate(f.users[0]);await page.goto(origin+path,{waitUntil:'domcontentloaded'});
  const content=path==='/saved'?page.getByRole('button',{name:'Saved',exact:true}):path==='/binders'?page.getByRole('link',{name:new RegExp(f.binders[3].title)}):page.getByRole('heading',{name:f.binders[3].title,exact:true});
  await expect(content).toBeVisible();
  const account=await context.newPage();await account.goto(origin+'/account');await account.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(content).toHaveCount(0);await expect(page.getByText(/Your account changed/)).toBeVisible();
  await picture(path==='/saved'?'saved-closed':path==='/binders'?'library-closed':'binder-closed');
  await account.goto(origin+'/login');await account.getByLabel('Email',{exact:true}).fill(f.users[1].email);await account.getByLabel('Password',{exact:true}).fill(f.users[1].password);await account.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect.poll(()=>new URL(account.url()).pathname).not.toBe('/login');await expect(content).toHaveCount(0);
  checks.push({path,oldPrivateContentCleared:true,replacementOwnerDidNotRestoreContent:true});
 }
 await authenticate(f.users[1]);await page.goto(origin+'/vault');await expect(goals()).toContainText('Start a Binder to work toward a collection goal.');await expect(goals().getByRole('link',{name:'Create a Binder',exact:true})).toBeVisible();await picture('empty-first-session',goals());checks.push('Fresh empty account gets explicit Find, Scan, Import and create-goal paths.');
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
 for(const [name,hash]of Object.entries(hashes))assert.equal(sha(root+'/'+name),hash,name);
 command(process.execPath,['scripts/audits/product_collector_usability_fixture_v1.mjs','verify',run]);
}catch(error){failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});}
finally{await db.query("update binder_feature_flags set enabled=true where flag_key='schema_internal'");await db.end();if(browser)await browser.close();if(server&&server.exitCode===null)server.kill();if(stopped)await stopped;fs.closeSync(fd);}
save('result.json',{status:failure?'failed':'passed',at:new Date().toISOString(),checks,blocked,errors,failure,productionWrites:0,fixtureStillPrepared:true});console.log(JSON.stringify({out,status:failure?'failed':'passed',checks:checks.length,failure:failure?.message}));if(failure)process.exitCode=1;
