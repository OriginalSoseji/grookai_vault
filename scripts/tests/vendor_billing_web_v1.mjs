// Compiled Next website, real isolated Auth/PostgREST, no provider networking.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import net from 'node:net';import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {root,fixture,project,hash,guardRuntime} from './vendor_billing_runtime_v1.mjs';
assert.equal(process.argv.length,2);const runtime=guardRuntime();
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js'),{chromium,expect}=require('@playwright/test');
const config=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(config.API_URL,'http://127.0.0.1:17621');assert.ok(config.PUBLISHABLE_KEY?.startsWith('sb_publishable_'));assert.ok(config.SECRET_KEY?.startsWith('sb_secret_'));
const web=path.join(root,'apps/web'),base='http://127.0.0.1:17640',sockets=new Set(),checks=[],errors=[];
for(const dir of [root,web])for(const name of ['.env','.env.local','.env.production','.env.production.local']){
 const file=path.join(dir,name);if(!fs.existsSync(file))continue;
 // The tracked root .env contains only these two empty placeholders.
 assert.ok(dir===root&&name==='.env'&&fs.readFileSync(file,'utf8').split(/\r?\n/).every(line=>/^\s*(?:(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=\s*)?$/.test(line)),`Private env requires inspection before this runner: ${name}`);
}
const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:config.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:config.SECRET_KEY,
 NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',
 SITE_URL:base,NEXT_PUBLIC_SITE_URL:base,GVVI_REFERRAL_COOKIE_SECRET:'isolated-billing-browser-proof-key-at-least-32',
 GROOKAI_VENDOR_BILLING_ENABLED:'true',GROOKAI_VENDOR_CHECKOUT_ENABLED:'true',STRIPE_BILLING_MODE:'test',
 STRIPE_SECRET_KEY:['sk','test','localFixtureNeverProvider'].join('_'),STRIPE_BILLING_WEBHOOK_SECRET:['whsec','localFixtureNeverProvider'].join('_'),
 STRIPE_ACCOUNT_ID:'acct_localbrowser',STRIPE_STORE_APP_PRICE_ID:'price_localapp',STRIPE_STORE_WEB_PRICE_ID:'price_localweb',STRIPE_VENDOR_PORTAL_CONFIGURATION_ID:'bpc_localbrowser',
 NODE_PATH:'C:/gv_store_release_20260919/node_modules',NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
const relay=net.createServer(socket=>{const upstream=net.connect(17621,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
let server,browser,owner;const admin=createClient(config.API_URL,config.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const run=async(command,args,log)=>{const fd=fs.openSync(path.join(fixture,log),'wx');try{const child=spawn(command,args,{cwd:web,env,shell:command.endsWith('.cmd'),windowsHide:true,stdio:['ignore',fd,fd]});const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});assert.equal(code,0,`Inspect private ${log}`);}finally{fs.closeSync(fd);}};
try{
 await new Promise((resolve,reject)=>{relay.once('error',reject);relay.listen(15439,'127.0.0.1',resolve);});
 await run('npm.cmd',['run','build'],`web-build-${stamp}.log`);console.log('PASS compiled website build');checks.push('compiled_website_build');
 const fd=fs.openSync(path.join(fixture,`web-server-${stamp}.log`),'wx');
 server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','17640'],{cwd:web,env,windowsHide:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Local website exited');try{if((await fetch(base+'/api/vendor-billing/owner')).status===401)break;}catch{}if(n===59)throw new Error('Website readiness timeout');await new Promise(r=>setTimeout(r,1000));}
 const email='billing-browser@fixture.invalid',password=randomUUID()+randomUUID();
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);owner=created.data.user.id;
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1050}});
 await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/account/store/billing');await page.waitForURL(/\/login\?next=/);assert.ok(new URL(page.url()).searchParams.get('next')==='/account/store/billing');
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.waitForURL(base+'/account/store/billing',{timeout:30000});await expect(page.getByRole('heading',{name:'Store subscription',exact:true})).toBeVisible();
 await expect(page.getByText('Test billing — use Stripe test payment details only.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Choose App store',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Choose App + web store',exact:true})).toBeDisabled();
 const actual=await context.request.get(base+'/api/vendor-billing/owner');assert.equal(actual.status(),200);assert.match(actual.headers()['cache-control'],/no-store/);const actualStatus=await actual.json();assert.equal(actualStatus.access.store_app,false);assert.equal(actualStatus.appAvailable,false);
 checks.push('real_browser_auth_return_and_private_status');
 const blocked=await context.request.post(base+'/api/vendor-billing/owner',{headers:{origin:base},data:{action:'checkout',plan:'store_web'}});assert.equal(blocked.status(),503);
 const forged=await context.request.post(base+'/api/vendor-billing/owner',{headers:{origin:base},data:{action:'checkout',plan:'store_web',ownerId:randomUUID()}});assert.equal(forged.status(),400);
 assert.equal((await context.request.post(base+'/api/vendor-billing/owner',{headers:{origin:'https://forged.invalid'},data:{action:'refresh'}})).status(),403);
 checks.push('compiled_routes_enforce_rollout_origin_and_exact_body');
 await page.getByRole('button',{name:'Check payment',exact:true}).click();await expect(page.getByText('Subscription status refreshed.',{exact:true})).toBeVisible();
 await page.screenshot({path:path.join(fixture,'billing-real-status.png'),fullPage:true});
 // UI-only scenarios below are clearly synthetic DTOs. Real orchestration is
 // proven separately by vendor_billing_api_v1.mjs; this never reaches Stripe.
 let view={...actualStatus,appAvailable:true,webAvailable:true},posts=[];
 await context.route('**/api/vendor-billing/owner',async route=>{const request=route.request();if(request.method()==='GET')return route.fulfill({json:view});const body=request.postDataJSON();posts.push(body);if(body.action==='checkout')return route.fulfill({json:{url:null,state:'pending'}});return route.fulfill({json:{status:view}});});
 await page.reload();const app=page.getByRole('button',{name:'Choose App store',exact:true}),both=page.getByRole('button',{name:'Choose App + web store',exact:true});await expect(app).toBeEnabled();await expect(both).toBeEnabled();
 await both.click();await expect(page.getByText('Payment verification is pending. Use Check payment to refresh access.',{exact:true})).toBeVisible();assert.deepEqual(posts.at(-1),{action:'checkout',plan:'store_web'});
 checks.push('synthetic_ui_package_choice_pending_payment');
 view={...view,pendingPlan:'store_web',checkoutState:'open'};await page.reload();await expect(page.getByRole('button',{name:'Resume checkout',exact:true})).toBeEnabled();await expect(app).toBeDisabled();
 await page.screenshot({path:path.join(fixture,'billing-desktop-packages.png'),fullPage:true});checks.push('synthetic_ui_resume_same_package_only');
 view={...view,recoveryRequired:true};await page.reload();await expect(page.getByRole('button',{name:'Resume checkout',exact:true})).toBeDisabled();await expect(page.getByText('Your earlier checkout needs review before another attempt. Contact Grookai support.',{exact:true})).toBeVisible();
 view={...view,recoveryRequired:false,pendingPlan:null,checkoutState:null,hasSubscription:true,canManagePayment:true,subscriptionStatus:'active',plan:'store_web',paidThrough:new Date(Date.now()+3600000).toISOString(),cancelAtPeriodEnd:true,access:{store_app:false,store_web:false},eligibilityIssue:'suspended'};
 await page.goto(base+'/account/store/billing?checkout=returned');await expect(page.getByText('Subscription status refreshed.',{exact:true})).toBeVisible();assert.deepEqual(posts.at(-1),{action:'refresh'});await expect(page.getByRole('button',{name:'Manage billing & receipts',exact:true})).toBeEnabled();await expect(app).toBeDisabled();
 checks.push('synthetic_ui_recovery_suspension_payment_management_return');
 view={...view,closeoutPending:true,canManagePayment:false};await page.reload();await expect(page.getByText('Your account closure is being processed. Contact Grookai support for billing assistance.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Check payment',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Manage billing & receipts',exact:true})).toHaveCount(0);await expect(app).toBeDisabled();
 checks.push('synthetic_ui_closeout_freeze_and_support_destination');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(fixture,'billing-mobile-status.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));checks.push('responsive_no_horizontal_overflow');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks}));
}finally{
 if(browser)await browser.close();if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}
 for(const socket of sockets)socket.destroy();relay.close();
 if(owner){assert.match(owner,/^[0-9a-f-]{36}$/);const {sql}=await import('./vendor_billing_runtime_v1.mjs');sql(`delete from public.vendor_billing_accounts where owner_id='${owner}';`);const result=await admin.auth.admin.deleteUser(owner);assert.equal(result.error,null);}
 guardRuntime();
}
const receipt={at:new Date().toISOString(),status:'passed',project,migrationSha256:runtime.sourceHashes['20260919080000_vendor_stripe_billing_v1.sql'],runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),checks,providerRequests:0,realBrowserAuth:true,syntheticUiScenarios:true,fixturesRemoved:true,productionWrites:0};
fs.writeFileSync(path.join(root,'docs/audits/vendor_stripe_billing_schema_v1',`web-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});
