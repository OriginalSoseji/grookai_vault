// Real Auth/RLS/RPC and compiled website, fixed empty 184xx synthetic project.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {root,fixture,project,output,hash,guard} from '../schema/custom_import_runtime_v1.mjs';
import {parseCustomProductCsv as parse,normalizeCustomImportRows} from '../../apps/web/src/lib/stores/customProductImport.ts';
import {createCustomImport,readCustomImport} from '../../apps/web/src/lib/stores/customProductImportService.ts';
assert.equal(process.argv.length,2);const runtime=guard({full:true});
const replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js'),{chromium,expect}=require('@playwright/test');
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const config=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(config.API_URL,'http://127.0.0.1:18421');assert.equal(new URL(config.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(config.DB_URL).port,'18422');
const db=new Client({connectionString:config.DB_URL});await db.connect();
const client=key=>createClient(config.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=client(config.SECRET_KEY),anon=client(config.PUBLISHABLE_KEY),ownerClient=client(config.PUBLISHABLE_KEY),otherClient=client(config.PUBLISHABLE_KEY);
const web=path.join(root,'apps/web'),base='http://127.0.0.1:18440',stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
const dir=path.join(fixture,`import-${stamp}`);fs.mkdirSync(dir);
const users=[],checks=[],errors=[],sockets=new Set();let owner,other,browser,server,relay;
const ok=async promise=>{const r=await promise;assert.equal(r.error,null,r.error?.message);return r.data;};
const rows=normalizeCustomImportRows([{title:'Private import plush',available_quantity:2,asking_price_amount:13.25,private_sku:'private-import-sku'},{title:'Draft figure',available_quantity:0}]);
const counts=async()=> (await db.query('select (select count(*) from vendor_store_custom_products)::int products,(select count(*) from vendor_store_custom_product_events)::int events,(select count(*) from vendor_store_custom_imports)::int batches')).rows[0];
try {
 for(const role of ['owner','other']) {
  const email=`custom-import-${role}-${Date.now()}@fixture.invalid`,password=randomUUID()+randomUUID();const data=await ok(admin.auth.admin.createUser({email,password,email_confirm:true}));users.push({id:data.user.id,email,password,slug:`import-${role}-${Date.now()}`});
 }
 [owner,other]=users;fs.writeFileSync(path.join(dir,'fixtures-private.json'),JSON.stringify(users),{flag:'wx'});
 await ok(ownerClient.auth.signInWithPassword({email:owner.email,password:owner.password}));await ok(otherClient.auth.signInWithPassword({email:other.email,password:other.password}));
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 for(const [user,session] of [[owner,ownerClient],[other,otherClient]]) {
  await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor',$2)",[user.id,JSON.stringify({store_app:true,store_web:user===owner})]);
  await db.query("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Import fixture',true,true) on conflict(user_id) do update set slug=excluded.slug,public_profile_enabled=true,vault_sharing_enabled=true",[user.id,user.slug]);
  await ok(session.rpc('vendor_store_save_v1',{p_slug:user.slug,p_display_name:'Import fixture store',p_description:''}));
 }
 const id=randomUUID();assert.ok((await anon.rpc('vendor_store_custom_import_v1',{p_import_id:id,p_rows:rows})).error);
 assert.ok((await ownerClient.from('vendor_store_custom_imports').insert({id,store_id:randomUUID(),request_sha256:'0'.repeat(64),product_ids:[randomUUID()]})).error);
 assert.ok((await ownerClient.from('vendor_store_custom_imports').update({product_ids:[]}).eq('id',id)).error);
 assert.ok((await ownerClient.from('vendor_store_custom_imports').delete().eq('id',id)).error);
 // Hold the real owner advisory lock until both network requests are waiting.
 await db.query('begin');await db.query("select pg_advisory_xact_lock(hashtextextended('vendor-store:'||$1::text,0))",[owner.id]);
 const pending=[createCustomImport(ownerClient,{id,rows}),createCustomImport(ownerClient,{id,rows})];
 try {
  let waiting=0;for(let n=0;n<100;n++){waiting=Number((await db.query("select count(*) n from pg_locks where locktype='advisory' and not granted")).rows[0].n);if(waiting===2)break;await new Promise(r=>setTimeout(r,20));}
  assert.equal(waiting,2,'Both requests must actually contend on the database lock');
 } finally {await db.query('rollback');}
 const race=await Promise.all(pending);assert.deepEqual(race[0],race[1]);assert.deepEqual(await counts(),{products:2,events:4,batches:1});
 const saved=await createCustomImport(ownerClient,{id,rows});assert.deepEqual(saved,race[0]);assert.equal(await readCustomImport(otherClient,id),null);
 await assert.rejects(createCustomImport(ownerClient,{id,rows:[{...rows[0],title:'Changed'}]}),e=>e.status===409);
 const invalids=[[],Array(101).fill(rows[0]),[rows[0],{...rows[1],published:true}],[rows[0],{...rows[1],available_quantity:-1}],[rows[0],{...rows[1],title:'x'.repeat(121)}],[rows[0],{...rows[1],asking_price_amount:1.001}]];
 for(const p_rows of invalids){assert.ok((await ownerClient.rpc('vendor_store_custom_import_v1',{p_import_id:randomUUID(),p_rows})).error);assert.deepEqual(await counts(),{products:2,events:4,batches:1});}
 assert.ok((await ownerClient.rpc('vendor_store_publish_v1',{p_surface:'web',p_publish:true})).error,'Draft-only inventory cannot publish the store');
 assert.equal(await ok(anon.rpc('vendor_store_read_v2',{p_slug:owner.slug,p_surface:'web'})),null);
 assert.equal((await db.query("select count(*) n from vendor_store_custom_products where published or cardinality(photo_paths)>0")).rows[0].n,'0');
 checks.push('real_lock_contention_exactly_once_atomic_rollback_private_drafts');
 await db.query('update user_entitlements set is_active=false where user_id=$1',[owner.id]);
 assert.deepEqual(await readCustomImport(ownerClient,id),saved);assert.deepEqual(await createCustomImport(ownerClient,{id,rows}),saved);
 await assert.rejects(createCustomImport(ownerClient,{id:randomUUID(),rows}),e=>e.status===403);
 await db.query('update user_entitlements set is_active=true where user_id=$1',[owner.id]);
 await db.query('update vendor_store_rollout set custom_enabled=false');
 await assert.rejects(createCustomImport(ownerClient,{id:randomUUID(),rows}),e=>e.status===403);
 await db.query('update vendor_store_rollout set custom_enabled=true');
 const otherReceipt=await createCustomImport(otherClient,{id,rows});assert.notDeepEqual(otherReceipt.productIds,saved.productIds);
 assert.deepEqual((await readCustomImport(otherClient,id)).productIds,otherReceipt.productIds);
 const hundred=await createCustomImport(ownerClient,{id:randomUUID(),rows:Array.from({length:100},(_,n)=>({title:'Boundary '+n,available_quantity:n}))});assert.equal(hundred.productIds.length,100);
 const product=(await ok(ownerClient.rpc('vendor_store_custom_owner_v1',{p_product_id:saved.productIds[0]}))).products[0];
 await ok(ownerClient.rpc('vendor_store_custom_mutate_v1',{p_product_id:product.id,p_expected_version:product.version,p_action:'archive'}));
 assert.deepEqual(await createCustomImport(ownerClient,{id,rows}),saved);assert.ok((await db.query('select archived_at from vendor_store_custom_products where id=$1',[product.id])).rows[0].archived_at);
 checks.push('direct_package_rollout_owner_isolation_retained_receipts_and_100_rows');
 // Compile and exercise the real server action; no intercepted application APIs.
 for(const where of [root,web])for(const name of ['.env','.env.local','.env.production','.env.production.local']) {
  const file=path.join(where,name);if(!fs.existsSync(file))continue;
  assert.ok(where===root&&name==='.env'&&fs.readFileSync(file,'utf8').split(/\r?\n/).every(line=>/^\s*(?:(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=\s*)?$/.test(line)),`Uninspected environment ${name}`);
 }
 const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
 Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:config.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:config.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:base,NEXT_PUBLIC_SITE_URL:base,GVVI_REFERRAL_COOKIE_SECRET:'isolated-custom-import-browser-key-at-least-32',NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 relay=net.createServer(socket=>{const upstream=net.connect(18421,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});
 await new Promise((resolve,reject)=>{relay.once('error',reject);relay.listen(15439,'127.0.0.1',resolve);});
 const fd=fs.openSync(path.join(dir,'build.log'),'wx');
 try {const child=spawn('npm.cmd',['run','build'],{cwd:web,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});assert.equal(await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);}),0,'Inspect private build log');}finally{fs.closeSync(fd);}
 checks.push('compiled_build');console.log('PASS real RPC boundaries and compiled build');
 const serverFd=fs.openSync(path.join(dir,'server.log'),'wx');server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','18440'],{cwd:web,env,windowsHide:true,stdio:['ignore',serverFd,serverFd]});fs.closeSync(serverFd);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Local server exited');try{if((await fetch(base+'/api/stores/owner')).status===401)break;}catch{}if(n===59)throw new Error('Local readiness timeout');await new Promise(r=>setTimeout(r,1000));}
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));

 let batch=randomUUID(),url=base+'/account/store/import/'+batch;
 await page.goto(url);await page.waitForURL(/\/login\?next=/);assert.equal(new URL(page.url()).searchParams.get('next'),'/account/store/import/'+batch);
 await page.getByLabel('Email',{exact:true}).fill(owner.email);await page.getByLabel('Password',{exact:true}).fill(owner.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(url,{timeout:30000});
 await page.goto(base+'/account/store');await page.getByRole('button',{name:'Custom collectibles',exact:true}).click();await page.getByRole('link',{name:'Import custom CSV',exact:true}).click();await page.waitForURL(/\/account\/store\/import\/[0-9a-f-]{36}$/);url=page.url();batch=url.split('/').at(-1);
 assert.equal((await fetch(base+'/api/stores/owner/import?id='+batch)).status,401);
 const csv='title,description,available_quantity,asking_price_amount,private_sku\nBrowser plush,Seller description,3,9.50,private-browser-sku\nBrowser figure,Another description,0,,second-sku';
 const upload=()=>page.getByLabel('Custom product CSV',{exact:true}).setInputFiles({name:'collectibles.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 const before=await counts();await expect(page.getByLabel('Custom product CSV',{exact:true})).toBeEnabled();await upload();await expect(page.getByRole('heading',{name:'2. Review 2 drafts',exact:true})).toBeVisible();assert.deepEqual(await counts(),before);
 await expect(page.getByRole('button',{name:'Create drafts',exact:true})).toBeDisabled();
 await page.screenshot({path:path.join(dir,'preview-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'preview-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.getByRole('checkbox').check();
 // Let the actual server commit, then lose only its response to the browser.
 let finishLoss;const loss=new Promise(resolve=>{finishLoss=resolve;});await page.route('**/api/stores/owner/import',async route=>{try{const response=await route.fetch({timeout:30000});const status=response.status();await route.abort('failed');finishLoss({status});}catch(error){finishLoss({error:error.message.split('\n')[0]});}},{times:1});
 await page.getByRole('button',{name:'Create drafts',exact:true}).click();assert.deepEqual(await loss,{status:200});await expect(page.getByRole('alert').filter({hasText:'Failed to fetch'})).toBeVisible();
 assert.equal((await counts()).products,before.products+2);
 await page.getByRole('button',{name:'Retry this batch',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'2 drafts imported'})).toBeVisible();assert.equal((await counts()).products,before.products+2);
 await page.reload();await expect(page.getByRole('status').filter({hasText:'2 drafts imported'})).toBeVisible();
 await page.screenshot({path:path.join(dir,'receipt-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(dir,'receipt-desktop.png'),fullPage:true});
 await page.getByRole('link',{name:'Edit imported product 1',exact:true}).click();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Browser plush');await expect(page.getByLabel('Private SKU',{exact:true})).toHaveValue('private-browser-sku');
 await page.goto(url);
 const api=base+'/api/stores/owner/import';const crossOrigin=await context.request.post(api,{headers:{origin:'https://foreign.invalid'},data:{id:randomUUID(),rows}});assert.equal(crossOrigin.status(),403);
 const changed=await context.request.post(api,{headers:{origin:base},data:{id:batch,rows:[{title:'Other payload',available_quantity:1}]}});assert.equal(changed.status(),409);
 await db.query('update user_entitlements set is_active=false where user_id=$1',[owner.id]);await page.reload();await expect(page.getByRole('status').filter({hasText:'2 drafts imported'})).toBeVisible();
 const denied=await context.request.post(api,{headers:{origin:base},data:{id:randomUUID(),rows}});assert.equal(denied.status(),403);
 const foreign=await browser.newContext();await foreign.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const foreignPage=await foreign.newPage();await foreignPage.goto(url);await foreignPage.getByLabel('Email',{exact:true}).fill(other.email);await foreignPage.getByLabel('Password',{exact:true}).fill(other.password);await foreignPage.getByRole('button',{name:'Sign in',exact:true}).click();await foreignPage.waitForURL(url,{timeout:30000});await expect(foreignPage.getByRole('list',{name:'Imported drafts'})).toHaveCount(0);assert(!(await foreignPage.content()).includes('private-browser-sku'));const browserReceipt=await readCustomImport(ownerClient,batch);await foreignPage.goto(base+'/account/store?product='+browserReceipt.productIds[0]);await expect(foreignPage.getByRole('alert').filter({hasText:'Product unavailable'})).toBeVisible();assert(!(await foreignPage.content()).includes('private-browser-sku'));
 checks.push('compiled_browser_preview_confirmation_lost_response_retry_reload_edit_link_auth_privacy_downgrade');assert.deepEqual(errors,[]);
} catch(error) {
 fs.writeFileSync(path.join(dir,'failure-private.json'),JSON.stringify({message:error.message,stack:error.stack,checks,errors}),{flag:'wx'});
 const page=browser?.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true}).catch(()=>{});throw error;
} finally {
 if(browser){for(const context of browser.contexts())for(const page of context.pages())await page.unrouteAll({behavior:'wait'});await browser.close();}if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}for(const socket of sockets)socket.destroy();if(relay)relay.close();
 await db.query('rollback');await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');
 for(const user of users){await db.query('delete from vendor_stores where owner_id=$1',[user.id]);await ok(admin.auth.admin.deleteUser(user.id));}
 await db.end();guard({full:true});
}
const sources=['apps/web/src/lib/stores/customProductImport.ts','apps/web/src/lib/stores/customProductImportService.ts','apps/web/src/lib/stores/customProductImportHttp.ts','apps/web/src/app/api/stores/owner/import/route.ts','apps/web/src/components/stores/CustomProductImporter.tsx','apps/web/src/components/stores/StoreManager.tsx','apps/web/src/components/stores/StoreProductManager.tsx','apps/web/src/app/account/store/page.tsx','apps/web/src/app/account/store/import/page.tsx','apps/web/src/app/account/store/import/[batchId]/page.tsx'];
const receipt={at:new Date().toISOString(),status:'passed',project,checks,runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),migrationCount:399,sourceHashes:Object.fromEntries(sources.map(n=>[n,hash(fs.readFileSync(path.join(root,n)))])),realAuth:true,realRpc:true,realBrowser:true,fixturesRemoved:true,productionWrites:0,providerRequests:0};
fs.writeFileSync(path.join(output,`proof-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
