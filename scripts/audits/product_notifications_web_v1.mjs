import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const root='C:/gv_product_notifications_20261008',base='C:/grookai_vault_operator_artifacts/product_notifications_20261008',origin='http://127.0.0.1:35791';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);assert.equal(process.argv.length,3);
const run=process.argv[2];assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');
const command=(n,a)=>execFileSync(n,a,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:64*1024*1024}),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
command(process.execPath,['scripts/audits/product_notifications_fixture_v1.mjs','verify',run]);
const out=run+'/web-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const files=command('git',['ls-files','-co','--exclude-standard','apps/web/src','apps/web/next.config.mjs']).trim().split(/\r?\n/),hashes=Object.fromEntries([...new Set(files)].filter(p=>fs.existsSync(root+'/'+p)).map(p=>[p,sha(root+'/'+p)]));save('source-binding.json',{at:new Date().toISOString(),hashes});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir','C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/full-438-v2']));assert.equal(cfg.API_URL,'http://127.0.0.1:35521');
const web=createRequire(root+'/apps/web/package.json'),{createServerClient}=web('@supabase/ssr'),{createClient}=web('@supabase/supabase-js'),{chromium,expect:baseExpect}=web('@playwright/test');
const expect=baseExpect.configure({timeout:20000});
const env={};for(const[k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
assert.equal(fs.readdirSync(root+'/apps/web').some(n=>n.startsWith('.env')),false);
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_PORTFOLIO_HISTORY_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,NODE_USE_SYSTEM_CA:'1'});
let server,stopped,browser,context,page,failure;const checks=[],blocked=[],errors=[];const fd=fs.openSync(out+'/server.private.log','wx');
const owner=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
assert.equal((await owner.auth.signInWithPassword({email:f.users[0].email,password:f.users[0].password})).error,null);
const getRow=async()=>{const r=await owner.from('notification_prefs').select('instant_enabled,daily_pulse_enabled,weekly_enabled,quiet_hours_start,quiet_hours_end,timezone').eq('user_id',f.users[0].id).single();assert.equal(r.error,null);return r.data;};
async function authenticate(user){
 if(context)await context.close();context=await browser.newContext({viewport:{width:390,height:900},colorScheme:'light',locale:'en-US'});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if([origin,cfg.API_URL].includes(u.origin)||['data:','blob:'].includes(u.protocol))return route.continue();blocked.push(u.origin);return route.abort('blockedbyclient');});
 let cookies=[];const client=createServerClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{for(const v of values){cookies=cookies.filter(c=>c.name!==v.name);cookies.push(v);}}}});
 const signed=await client.auth.signInWithPassword({email:user.email,password:user.password});assert.equal(signed.error,null);assert.equal(signed.data.user.id,user.id);
 await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:c.options.httpOnly??false,sameSite:'Lax',expires:Math.floor(Date.now()/1000)+(c.options.maxAge??3600)})));
 page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
}
async function picture(name){await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});await page.screenshot({path:out+'/'+name+'.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');}
const instant=()=>page.getByRole('checkbox',{name:/^Instant updates/}),daily=()=>page.getByRole('checkbox',{name:/^Daily updates/}),quiet=()=>page.getByRole('checkbox',{name:'Pause collection and message updates during quiet hours'});
const settings=()=>page.goto(origin+'/account/notifications',{waitUntil:'domcontentloaded'});
const saved=()=>expect(page.getByText('Notification preferences saved.',{exact:true})).toBeVisible();
try{
 server=spawn(process.execPath,[root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','35791'],{cwd:root+'/apps/web',env,stdio:['ignore',fd,fd],windowsHide:true});stopped=new Promise(resolve=>server.once('exit',resolve));
 let ready=false;for(let i=0;i<100&&!ready;i++){assert.equal(server.exitCode,null);try{ready=(await fetch(origin+'/api/navigation/shell',{signal:AbortSignal.timeout(2000)})).status===401;}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,300));}assert.ok(ready,'Server not ready');
 browser=await chromium.launch({headless:true});await authenticate(f.users[0]);await page.goto(origin+'/account');
 await page.getByRole('link',{name:'Notifications',exact:true}).click();await expect(instant()).toBeVisible();checks.push('No-profile account reaches notification controls through actual Account link');
 for(const[width,height,name]of[[320,820,'narrow-phone'],[390,900,'phone'],[768,1024,'tablet'],[1440,1000,'desktop']]){await page.setViewportSize({width,height});await picture(name);}
 checks.push('Settings have no horizontal overflow at 320,390,768,1440 pixels');await page.setViewportSize({width:390,height:900});
 const initial=await getRow();await instant().click();await saved();assert.deepEqual(await getRow(),{...initial,instant_enabled:!initial.instant_enabled});checks.push('Browser cadence save preserves all other preferences');
 await quiet().check();await page.getByLabel('Quiet hours start',{exact:true}).fill('23:15');await page.getByLabel('Quiet hours end',{exact:true}).fill('23:15');await page.getByRole('button',{name:'Save quiet hours',exact:true}).click();await expect(page.locator('div[role=alert]:has(p)')).toContainText('Choose different start and end times.');
 await page.getByLabel('Quiet hours end',{exact:true}).fill('06:45');await page.getByLabel('Timezone',{exact:true}).fill('Invalid/Zone');await page.getByRole('button',{name:'Save quiet hours',exact:true}).click();await expect(page.locator('div[role=alert]:has(p)')).toContainText('Choose a supported timezone');checks.push('Equal times and unsupported timezone are rejected before writes');
 await page.getByLabel('Timezone',{exact:true}).fill('America/New_York');const beforeDaily=await getRow();await daily().click();await saved();await expect(page.getByLabel('Quiet hours start',{exact:true})).toHaveValue('23:15');await expect(page.getByLabel('Timezone',{exact:true})).toHaveValue('America/New_York');assert.equal((await getRow()).quiet_hours_start,beforeDaily.quiet_hours_start);
 await page.setViewportSize({width:320,height:820});await page.getByLabel('Timezone',{exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Save quiet hours',exact:true})).toBeFocused();await page.getByRole('button',{name:'Save quiet hours',exact:true}).click();await saved();checks.push('At 320px, keyboard moves from timezone to Save and quiet settings remain operable above the dock');const quietRow=await getRow();assert.equal(quietRow.quiet_hours_start,'23:15:00');assert.equal(quietRow.quiet_hours_end,'06:45:00');assert.equal(quietRow.timezone,'America/New_York');await picture('quiet-saved');checks.push('Unsaved quiet draft survives cadence save; explicit Save persists complete pair and timezone');
 const endpoint='**/rest/v1/notification_prefs*';let applied=false;
 const loseReply=async route=>{if(route.request().method()!=='POST')return route.fallback();const response=await route.fetch();assert.equal(response.ok(),true);applied=true;await route.abort('failed');};
 await page.route(endpoint,loseReply);await instant().click();await expect(page.locator('div[role=alert]:has(p)')).toContainText('Could not confirm this change.');assert.equal(applied,true);await expect(daily()).toBeDisabled();await picture('uncertain-save');await page.unroute(endpoint,loseReply);await page.getByRole('button',{name:'Reload settings',exact:true}).click();await expect(instant()).toBeChecked({checked:!quietRow.instant_enabled});await expect(daily()).toBeEnabled();assert.equal((await getRow()).instant_enabled,!quietRow.instant_enabled);checks.push('Lost successful response blocks further edits; reload recovers actual stored value');
 const failRead=route=>route.request().method()==='GET'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic unavailable'})}):route.fallback();
 await page.route(endpoint,failRead);await settings();await expect(page.locator('div[role=alert]:has(p)')).toContainText('Unable to load');await expect(instant()).toHaveCount(0);await picture('read-unavailable');await page.unroute(endpoint,failRead);await page.getByRole('button',{name:'Reload settings',exact:true}).click();await expect(instant()).toBeVisible();checks.push('Failed preference read does not become defaults; retry restores real values');
 await quiet().uncheck();await page.getByRole('button',{name:'Save quiet hours',exact:true}).click();await saved();const disabled=await getRow();assert.equal(disabled.quiet_hours_start,null);assert.equal(disabled.quiet_hours_end,null);assert.equal(disabled.timezone,'America/New_York');checks.push('Quiet disable retains timezone and cadence');
 const legacy=await owner.from('notification_prefs').update({quiet_hours_start:'22:00:00',quiet_hours_end:null}).eq('user_id',f.users[0].id);assert.equal(legacy.error,null);await settings();await expect(page.getByText(/Saved quiet hours are incomplete/)).toBeVisible();await expect(quiet()).not.toBeChecked();await picture('legacy-review');checks.push('Incomplete legacy quiet pair is visibly off and requires review');
 let releaseRead,readArrived;const arrived=new Promise(resolve=>readArrived=resolve),release=new Promise(resolve=>releaseRead=resolve);
 const lateRead=async route=>{if(route.request().method()!=='GET')return route.fallback();const response=await route.fetch();readArrived();await release;await route.fulfill({response}).catch(()=>{});};
 await page.route(endpoint,lateRead);await settings();await arrived;
 const account=await context.newPage();await account.goto(origin+'/account');await account.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect.poll(async()=>await page.getByText('Your account changed. Reopen Notifications to continue.',{exact:true}).isVisible()||new URL(page.url()).pathname==='/login').toBe(true);releaseRead();await page.unroute(endpoint,lateRead);await expect(instant()).toHaveCount(0);await picture('owner-closed');
 await account.goto(origin+'/login');await account.getByLabel('Email',{exact:true}).fill(f.users[1].email);await account.getByLabel('Password',{exact:true}).fill(f.users[1].password);await account.getByRole('button',{name:'Sign in',exact:true}).click();await expect.poll(()=>new URL(account.url()).pathname).not.toBe('/login');await expect(instant()).toHaveCount(0);checks.push('Real cross-tab sign-out and replacement reject delayed old preference response');
 await authenticate(f.users[2]);await settings();await expect(instant()).toBeChecked();await expect(daily()).toBeChecked();await expect(quiet()).not.toBeChecked();await picture('absent-defaults');checks.push('Fresh absent row displays dispatcher defaults without requiring a profile');
 assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);for(const[name,hash]of Object.entries(hashes))assert.equal(sha(root+'/'+name),hash,name);
 command(process.execPath,['scripts/audits/product_notifications_fixture_v1.mjs','verify',run]);
}catch(error){failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});}
finally{if(browser)await browser.close();if(server&&server.exitCode===null)server.kill();if(stopped)await stopped;fs.closeSync(fd);}
save('result.json',{status:failure?'failed':'passed',at:new Date().toISOString(),checks,blocked,errors,failure,productionWrites:0,providerCalls:0});console.log(JSON.stringify({out,status:failure?'failed':'passed',checks:checks.length,failure:failure?.message}));if(failure)process.exitCode=1;
