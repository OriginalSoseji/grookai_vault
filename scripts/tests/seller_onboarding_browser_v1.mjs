// Compiled desktop UI + real local login/disabled API. Enabled UI states are
// explicit browser fixtures; actual service/PostgREST proof has its own runner.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {root,fixture,project,hash,guard} from '../schema/seller_bindings_runtime_v1.mjs';
assert.equal(process.argv.length,2);guard({full:true});
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js'),{chromium,expect}=require('@playwright/test');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));assert.equal(cfg.API_URL,'http://127.0.0.1:18821');
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),web=path.join(root,'apps/web'),base='http://127.0.0.1:18840';
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),dir=path.join(fixture,`onboarding-browser-${stamp}`);fs.mkdirSync(dir);
const checks=[],errors=[],sockets=new Set();let browser,server,relay,owner,failure;
const ok=async p=>{const r=await p;assert.equal(r.error,null,r.error?.message);return r.data;};
try{
 for(const where of [root,web])for(const name of ['.env','.env.local','.env.production','.env.production.local']){const file=path.join(where,name);if(fs.existsSync(file))assert.ok(where===root&&name==='.env'&&fs.readFileSync(file,'utf8').split(/\r?\n/).every(line=>/^\s*(?:(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=\s*)?$/.test(line)),`Uninspected environment ${name}`);}
 const email='seller-browser@fixture.invalid',password=randomUUID()+randomUUID();owner=(await ok(admin.auth.admin.createUser({email,password,email_confirm:true}))).user.id;
 const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
 Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,
  NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:base,NEXT_PUBLIC_SITE_URL:base,
  GVVI_REFERRAL_COOKIE_SECRET:'isolated-seller-browser-key-at-least-32',NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 relay=net.createServer(socket=>{const upstream=net.connect(18821,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});
 await new Promise((resolve,reject)=>{relay.once('error',reject);relay.listen(15439,'127.0.0.1',resolve);});
 const fd=fs.openSync(path.join(dir,'build.log'),'wx');try{const child=spawn('npm.cmd',['run','build'],{cwd:web,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});assert.equal(await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);}),0,'Inspect local build log');}finally{fs.closeSync(fd);}
 console.log('PASS isolated compiled build');checks.push('compiled_build');
 const out=fs.openSync(path.join(dir,'server.log'),'wx');server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','18840'],{cwd:web,env,windowsHide:true,stdio:['ignore',out,out]});fs.closeSync(out);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Local server exited');try{if((await fetch(base+'/api/vendor-payments/owner')).status===401)break;}catch{}if(n===59)throw new Error('Readiness timeout');await new Promise(r=>setTimeout(r,1000));}
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const url=base+'/account/store/payments';
 await page.goto(url);await page.waitForURL(/\/login\?next=/);assert.equal(new URL(page.url()).searchParams.get('next'),'/account/store/payments');
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(url,{timeout:30000});
 await expect(page.getByRole('heading',{name:'Seller payments',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Set up with Stripe'})).toBeDisabled();
 const actual=await context.request.get(base+'/api/vendor-payments/owner');assert.equal(actual.status(),200);assert.equal(actual.headers()['cache-control'],'private, no-store');assert.equal((await actual.json()).enabled,false);checks.push('real_login_destination_and_disabled_private_api');
 let status={enabled:true,onboardingEnabled:true,testMode:true,state:'bound',hasConnectedAccount:true,recoveryRequired:false,readiness:null},refreshes=0,posts=0,fail=false;
 await page.route('**/api/vendor-payments/owner',async route=>{let body=status,code=200;if(route.request().method()==='POST'){posts++;const action=route.request().postDataJSON().action;assert.ok(['refresh','onboarding'].includes(action));if(action==='refresh'){refreshes++;body={status:{...status,readiness:{capabilitiesReady:true,reasons:[],requirements:{currentlyDue:0,pastDue:0,pendingVerification:0,eventuallyDue:0},checkedAt:1800000000}}};}else body={url:'https://evil.invalid/forged'};if(fail){code=503;body={error:'Synthetic provider unavailable.'};}}await route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(body),headers:{'cache-control':'private, no-store'}});});
 await page.goto(url+'?onboarding=returned');await expect(page.getByText('Stripe currently reports payment and payout capabilities as active.')).toBeVisible();assert.equal(refreshes,1);
 await expect(page.getByText('Stripe collects your business, identity and bank information. Seller setup does not enable buyer checkout yet.')).toBeVisible();
 await page.screenshot({path:path.join(dir,'desktop-ready.png'),fullPage:true});checks.push('fixture_return_triggers_fresh_status_without_enabling_checkout');
 fail=true;await page.getByRole('button',{name:'Check Stripe status'}).click();await expect(page.getByRole('alert').filter({hasText:'Synthetic provider unavailable.'})).toBeVisible();await expect(page.getByText('Stripe currently reports payment and payout capabilities as active.')).toHaveCount(0);checks.push('failed_refresh_clears_stale_readiness');
 fail=false;await page.goto(url+'?onboarding=refresh');await expect(page.getByText('Your Stripe setup link expired or was already used. Continue setup to get a new link.')).toBeVisible();const before=posts;
 await page.getByRole('button',{name:'Continue Stripe setup'}).click();await expect(page.getByRole('alert').filter({hasText:'Unexpected seller setup destination.'})).toBeVisible();assert.equal(posts,before+1);assert.equal(new URL(page.url()).origin,base);checks.push('expired_link_explicit_retry_and_unsafe_destination_rejected');
 status={...status,state:'deauthorized',onboardingEnabled:false};await page.reload();await expect(page.getByText('Stripe access was disconnected. Contact Grookai support.')).toBeVisible();await expect(page.getByRole('button',{name:'Continue Stripe setup'})).toBeDisabled();await expect(page.getByRole('button',{name:'Check Stripe status'})).toBeDisabled();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:path.join(dir,'mobile-disconnected.png'),fullPage:true});checks.push('disconnected_controls_disabled_and_mobile_layout');
 assert.deepEqual(errors,[]);
}catch(e){failure=e;}finally{
 if(browser)await browser.close();if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}for(const socket of sockets)socket.destroy();if(relay)relay.close();
 if(owner)await ok(admin.auth.admin.deleteUser(owner));guard({full:true});
 const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,errors,providerRequests:0,enabledUi:'synthetic response fixtures',auth:'real local Supabase',fixturesRemoved:true,
  uiSha256:hash(fs.readFileSync(path.join(web,'src/components/stores/VendorSellerManager.tsx'))),runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),screenshots:fs.readdirSync(dir).filter(n=>n.endsWith('.png')).map(n=>({name:n,sha256:hash(fs.readFileSync(path.join(dir,n)))}))};
 fs.writeFileSync(path.join(root,'docs/audits/vendor_seller_bindings_v1',`onboarding-browser-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}if(failure)throw failure;
