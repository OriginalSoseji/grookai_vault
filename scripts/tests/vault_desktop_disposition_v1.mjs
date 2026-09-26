// Actual Auth/RLS/RPC and compiled desktop actions in the isolated 180xx project.
// Synthetic fixtures only; no resets, remote targets or payment transport.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {root,fixture,project,hash,guard} from '../schema/store_index_reconcile_v1.mjs';
import {dispositionParams,recordOwnerDisposition,readOwnerDisposition} from '../../apps/web/src/lib/vault/vaultDisposition.ts';
import {readDispositionHistory,EMPTY_HISTORY_FILTERS,HISTORY_LIMIT} from '../../apps/web/src/lib/vault/vaultDispositionHistory.ts';
assert.equal(process.argv.length,2);
const runtime=guard({full:true});
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js'),{chromium,expect}=require('@playwright/test');
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const config=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(config.API_URL,'http://127.0.0.1:18021');assert.equal(new URL(config.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(config.DB_URL).port,'18022');
const db=new Client({connectionString:config.DB_URL});await db.connect();
const client=key=>createClient(config.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=client(config.SECRET_KEY),anon=client(config.PUBLISHABLE_KEY),ownerClient=client(config.PUBLISHABLE_KEY),otherClient=client(config.PUBLISHABLE_KEY);
const web=path.join(root,'apps/web'),base='http://127.0.0.1:18040',stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
const dir=path.join(fixture,`desktop-disposition-${stamp}`);fs.mkdirSync(dir);
const users=[],copies=[],checks=[],errors=[],sockets=new Set();
const ids={set:randomUUID(),parent:randomUUID(),printing:randomUUID(),legacy:randomUUID()};
const runId=Date.now(),slug=`disposition-${runId}`;
const input=id=>({instanceId:id,type:'sale',salePrice:'13.25',counterparty:'Private fixture buyer',tradeReceived:'',cashDirection:'none',cashAmount:''});
const ok=async promise=>{const r=await promise;assert.equal(r.error,null,r.error?.message);return r.data;};
const publicStore=()=>ok(anon.rpc('vendor_store_read_v2',{p_slug:slug,p_surface:'web'}));
let browser,server,relay,owner,other,createdCatalog=false;
try {
 for(const role of ['owner','other']) {
   const email=`disposition-${role}-${runId}@fixture.invalid`,password=randomUUID()+randomUUID();
   const data=await ok(admin.auth.admin.createUser({email,password,email_confirm:true}));
   users.push({id:data.user.id,email,password});
 }
 [owner,other]=users;
 fs.writeFileSync(path.join(dir,'fixtures-private.json'),JSON.stringify({users,ids,runId}),{flag:'wx'});
 await ok(ownerClient.auth.signInWithPassword({email:owner.email,password:owner.password}));
 await ok(otherClient.auth.signInWithPassword({email:other.email,password:other.password}));
 await db.query("update vendor_store_rollout set app_enabled=true,web_enabled=true");
 await db.query("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Disposition fixture',true,true) on conflict(user_id) do update set slug=excluded.slug,public_profile_enabled=true,vault_sharing_enabled=true",[owner.id,slug]);
 await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor','{\"store_app\":true,\"store_web\":true}')",[owner.id]);
 await db.query('begin');
 try {
  await db.query("insert into sets(id,code,name,game) values($1,$2,'Disposition fixture set','pokemon')",[ids.set,slug]);
  await db.query("insert into card_prints(id,game_id,set_id,name,number,set_code,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Disposition fixture card','001',$3,$4,'missing')",[ids.parent,ids.set,slug,`GV-PK-D${runId}-001`]);
  await db.query("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,'normal',$3)",[ids.printing,ids.parent,`GV-PK-D${runId}-001-NORMAL`]);
  await db.query("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Disposition fixture card',$4)",[ids.legacy,owner.id,ids.parent,`GV-PK-D${runId}-001`]);
  for(let n=0;n<8;n++) {
   const row={id:randomUUID(),gvvi:`GVVI-D${runId}-${String(n+1).padStart(6,'0')}`};copies.push(row);
   await db.query("insert into vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,pricing_mode,asking_price_amount,asking_price_currency,condition_label) values($1,$2,$3,$4,$5,$6,'sell','asking',25,'USD','NM')",[row.id,owner.id,ids.parent,ids.printing,ids.legacy,row.gvvi]);
  }
  await db.query('commit');createdCatalog=true;
 } catch(error) {await db.query('rollback');throw error;}
 await ok(ownerClient.rpc('vendor_store_save_v1',{p_slug:slug,p_display_name:'Disposition fixture shop',p_description:''}));
 for(const copy of copies)await ok(ownerClient.rpc('vendor_store_select_item_v1',{p_instance_id:copy.id,p_selected:true}));
 await ok(ownerClient.rpc('vendor_store_publish_v1',{p_surface:'web',p_publish:true}));
 assert.equal((await publicStore()).items.length,8);
 const copy=copies[0],submission=input(copy.id);
 assert.ok((await anon.rpc('vault_record_exact_instance_disposition_v2',dispositionParams(submission))).error);
 assert.ok((await otherClient.rpc('vault_record_exact_instance_disposition_v2',dispositionParams(submission))).error);
 await assert.rejects(recordOwnerDisposition(otherClient,owner.id,submission,admin));
 assert.equal(await readOwnerDisposition(otherClient,owner.id,copy.id),null);
 checks.push('anonymous_foreign_owner_and_forged_actor_blocked');
 const race=await Promise.all([recordOwnerDisposition(ownerClient,owner.id,submission,admin),recordOwnerDisposition(ownerClient,owner.id,submission,admin)]);
 assert.equal(race[0].id,race[1].id);assert.equal(race[0].salePrice,13.25);
 assert.equal((await db.query('select count(*) n from vault_item_instance_dispositions where vault_item_instance_id=$1',[copy.id])).rows[0].n,'1');
 assert.equal((await db.query('select asking_price_amount from vault_item_instance_dispositions where vault_item_instance_id=$1',[copy.id])).rows[0].asking_price_amount,'25');
 assert.equal((await recordOwnerDisposition(ownerClient,owner.id,submission,admin)).id,race[0].id);
 await assert.rejects(recordOwnerDisposition(ownerClient,owner.id,{...submission,salePrice:'14.25'},admin));
 const publicAfter=await publicStore();assert.equal(publicAfter.items.length,7);assert(!publicAfter.items.some(x=>x.id===copy.id));assert(!JSON.stringify(publicAfter).includes(submission.counterparty));
 checks.push('concurrent_retry_once_actual_price_distinct_and_public_removal');
 for(const [n,direction] of ['none','paid','received'].entries()) {
   const receipt=await recordOwnerDisposition(ownerClient,owner.id,{...input(copies[n+1].id),type:'trade',salePrice:'',tradeReceived:'Two fixture cards',cashDirection:direction,cashAmount:direction==='none'?'':'4.50'},admin);
   assert.equal(receipt.salePrice,null);assert.equal(receipt.cashDirection,direction==='none'?null:direction);
 }
 checks.push('real_trade_no_cash_paid_and_received');
 // History-only synthetic rows share a microsecond timestamp to exercise the
 // stable second sort key. Actual mutation proof above uses the real V2 RPC.
 for(let n=0;n<33;n++) {
   const instance=randomUUID(),gvvi=`GVVI-H${runId}-${String(n+1).padStart(6,'0')}`;
   await db.query("insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id,archived_at) values($1,$2,$3,$4,$5,now())",[instance,owner.id,ids.parent,ids.legacy,gvvi]);
   await db.query("insert into vault_item_instance_dispositions(user_id,vault_item_instance_id,card_print_id,gv_vi_id,disposition_type,sale_price_amount,sale_price_currency,counterparty_label,created_at) values($1,$2,$3,$4,'sale',1.25,'USD',$5,'2026-01-01T12:00:00.123456+00:00')",[owner.id,instance,ids.parent,gvvi,n===0?'Literal %_ buyer':'History fixture partner']);
 }
 const firstHistory=await readDispositionHistory(ownerClient,EMPTY_HISTORY_FILTERS);assert.equal(firstHistory.items.length,HISTORY_LIMIT);assert.ok(firstHistory.next);
 const secondHistory=await readDispositionHistory(ownerClient,{...EMPTY_HISTORY_FILTERS,after:firstHistory.next});assert.equal(secondHistory.items.length,7);assert.equal(secondHistory.next,null);
 const actualHistory=[...firstHistory.items,...secondHistory.items].map(x=>x.id);
 const expectedHistory=(await db.query('select id from vault_item_instance_dispositions where user_id=$1 order by created_at desc,id desc',[owner.id])).rows.map(x=>x.id);
 assert.deepEqual(actualHistory,expectedHistory);assert.equal(new Set(actualHistory).size,37);
 assert.equal((await readDispositionHistory(otherClient,{...EMPTY_HISTORY_FILTERS,after:firstHistory.next})).items.length,0);
 assert.equal((await readDispositionHistory(ownerClient,{...EMPTY_HISTORY_FILTERS,field:'counterparty',query:'%_'})).items.length,1);
 assert.equal((await readDispositionHistory(ownerClient,{...EMPTY_HISTORY_FILTERS,type:'trade'})).items.length,3);
 await assert.rejects(readDispositionHistory(anon,EMPTY_HISTORY_FILTERS));checks.push('real_history_cursor_ties_literal_search_filters_and_owner_isolation');
 // Compile and exercise the real server action; no intercepted application APIs.
 for(const where of [root,web])for(const name of ['.env','.env.local','.env.production','.env.production.local']) {
  const file=path.join(where,name);if(!fs.existsSync(file))continue;
  assert.ok(where===root&&name==='.env'&&fs.readFileSync(file,'utf8').split(/\r?\n/).every(line=>/^\s*(?:(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=\s*)?$/.test(line)),`Uninspected environment ${name}`);
 }
 const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
 Object.assign(env,{SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:config.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:config.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:base,NEXT_PUBLIC_SITE_URL:base,GVVI_REFERRAL_COOKIE_SECRET:'isolated-disposition-browser-key-at-least-32',NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 relay=net.createServer(socket=>{const upstream=net.connect(18021,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});
 await new Promise((resolve,reject)=>{relay.once('error',reject);relay.listen(15439,'127.0.0.1',resolve);});
 const fd=fs.openSync(path.join(dir,'build.log'),'wx');
 try {const child=spawn('npm.cmd',['run','build'],{cwd:web,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});assert.equal(await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);}),0,'Inspect private build log');}finally{fs.closeSync(fd);}
 checks.push('compiled_build');console.log('PASS real RPC boundaries and compiled build');
 const serverFd=fs.openSync(path.join(dir,'server.log'),'wx');server=spawn(process.execPath,[path.join(web,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','18040'],{cwd:web,env,windowsHide:true,stdio:['ignore',serverFd,serverFd]});fs.closeSync(serverFd);
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Local server exited');try{if((await fetch(base+'/api/stores/owner')).status===401)break;}catch{}if(n===59)throw new Error('Local readiness timeout');await new Promise(r=>setTimeout(r,1000));}
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const target=copies[4],url=base+'/vault/gvvi/'+target.gvvi;
 await page.goto(url);await page.waitForURL(/\/login\?next=/);assert.equal(new URL(page.url()).searchParams.get('next'),'/vault/gvvi/'+target.gvvi);
 await page.getByLabel('Email',{exact:true}).fill(owner.email);await page.getByLabel('Password',{exact:true}).fill(owner.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(url,{timeout:30000});
 const panel=page.getByRole('region',{name:'Record a sale or trade',exact:true});await expect(panel).toBeVisible();
 await expect(panel.getByLabel('Actual sale price (USD)',{exact:true})).toHaveValue('');
 await panel.getByLabel('Actual sale price (USD)',{exact:true}).fill('17.75');await panel.getByLabel('Buyer or trade partner (optional)',{exact:true}).fill('Desktop private buyer');
 await panel.getByRole('button',{name:'Review transaction',exact:true}).click();
 assert.equal((await db.query('select archived_at from vault_item_instances where id=$1',[target.id])).rows[0].archived_at,null);
 await panel.getByRole('button',{name:'Back to details',exact:true}).click();await expect(panel.getByLabel('Actual sale price (USD)',{exact:true})).toHaveValue('17.75');
 await panel.getByRole('button',{name:'Review transaction',exact:true}).click();await page.screenshot({path:path.join(dir,'desktop-review.png'),fullPage:true});
 await panel.getByRole('button',{name:'Record sale',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Sale recorded.'})).toBeVisible({timeout:30000});
 await page.reload();await expect(page.getByRole('heading',{name:'Sale / trade receipt',exact:true})).toBeVisible();await expect(page.getByText('Desktop private buyer',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Private history link',exact:true})).toBeVisible();await expect(page.getByText('You can only assign cards you own.',{exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Physical card QR',exact:true})).toHaveCount(0);
 assert(!(await publicStore()).items.some(x=>x.id===target.id));
 assert.equal((await fetch(base+'/gvvi/'+target.gvvi)).status,404);
 await page.screenshot({path:path.join(dir,'desktop-receipt.png'),fullPage:true});checks.push('real_browser_auth_confirmation_cancel_sale_and_persistent_receipt');
 await page.goto(base+'/vault/gvvi/'+copies[5].gvvi);const trade=page.getByRole('region',{name:'Record a sale or trade',exact:true});
 await trade.getByLabel('Transaction',{exact:true}).selectOption('trade');await trade.getByLabel('What you received in trade',{exact:true}).fill('One binder');await trade.getByLabel('Trade cash',{exact:true}).selectOption('paid');await trade.getByLabel('Cash amount (USD)',{exact:true}).fill('6.25');await trade.getByRole('button',{name:'Review transaction',exact:true}).click();await trade.getByRole('button',{name:'Record trade',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Trade recorded.'})).toBeVisible({timeout:30000});
 await page.reload();await expect(page.getByRole('status').filter({hasText:'Trade recorded.'})).toBeVisible();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'mobile-receipt.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));checks.push('real_browser_trade_cash_paid_and_mobile_layout');
 const foreign=await browser.newContext();await foreign.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const foreignPage=await foreign.newPage();await foreignPage.goto(url);await foreignPage.getByLabel('Email',{exact:true}).fill(other.email);await foreignPage.getByLabel('Password',{exact:true}).fill(other.password);await foreignPage.getByRole('button',{name:'Sign in',exact:true}).click();await foreignPage.waitForURL(url,{timeout:30000});await foreignPage.reload();await expect(foreignPage.getByRole('heading',{name:'That destination is not available',exact:true})).toBeVisible();await expect(foreignPage.getByText('Desktop private buyer',{exact:true})).toHaveCount(0);assert(!(await foreignPage.content()).includes('Desktop private buyer'));await foreignPage.screenshot({path:path.join(dir,'foreign-unavailable.png'),fullPage:true});checks.push('foreign_browser_receipt_hidden');
 const sibling=(await db.query('select archived_at,asking_price_amount,condition_label from vault_item_instances where id=$1',[copies[7].id])).rows[0];assert.equal(sibling.archived_at,null);assert.equal(sibling.asking_price_amount,'25');assert.equal(sibling.condition_label,'NM');checks.push('sibling_copy_unchanged');
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('link',{name:'View transaction history',exact:true}).click();await page.waitForURL(base+'/vault/transactions');
 const receiptRows=()=>page.getByRole('list',{name:'Transaction receipts'}).getByRole('listitem');
 await expect(receiptRows()).toHaveCount(30);await page.getByRole('link',{name:'Older receipts',exact:true}).click();await expect(receiptRows()).toHaveCount(9);
 await page.getByRole('link',{name:'Newest matching receipts',exact:true}).click();await expect(receiptRows()).toHaveCount(30);
 await page.getByRole('combobox',{name:'Transaction type',exact:true}).selectOption('trade');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(receiptRows()).toHaveCount(4);
 await page.getByRole('combobox',{name:'Transaction type',exact:true}).selectOption('all');await page.getByRole('combobox',{name:'Search by',exact:true}).selectOption('counterparty');await page.getByLabel('Search receipts',{exact:true}).fill('%_');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(receiptRows()).toHaveCount(1);await expect(page.getByText('Partner: Literal %_ buyer',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Clear filters',exact:true}).click();await page.waitForURL(base+'/vault/transactions');await expect(page.getByRole('combobox',{name:'Search by',exact:true})).toHaveValue('gvvi');await expect(page.getByLabel('Search receipts',{exact:true})).toHaveValue('');await expect(page.getByRole('combobox',{name:'Transaction type',exact:true})).toHaveValue('all');await page.getByLabel('Search receipts',{exact:true}).fill(target.gvvi);await page.getByRole('button',{name:'Search',exact:true}).click();await expect(receiptRows()).toHaveCount(1);await receiptRows().getByRole('link',{name:target.gvvi,exact:true}).click();await expect(page.getByRole('heading',{name:'Sale / trade receipt',exact:true})).toBeVisible();
 await page.goto(base+'/account/store');await page.getByRole('link',{name:'Transaction history',exact:true}).click();await page.waitForURL(base+'/vault/transactions');
 await db.query('update user_entitlements set is_active=false where user_id=$1',[owner.id]);await page.reload();await expect(receiptRows()).toHaveCount(30);
 await page.screenshot({path:path.join(dir,'history-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'history-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));assert.ok(await page.locator('main form').evaluate(form=>[...form.querySelectorAll('input,select,button,a')].every(control=>{const r=control.getBoundingClientRect(),f=form.getBoundingClientRect();return r.left>=f.left&&r.right<=f.right&&r.right<=window.innerWidth;})),'History controls must stay inside the mobile form');
 await foreignPage.goto(base+'/vault/transactions');await expect(foreignPage.getByRole('heading',{name:'No matching receipts',exact:true})).toBeVisible();assert(!(await foreignPage.content()).includes('Desktop private buyer'));
 await page.goto(base+'/vault/transactions?after=invalid');await expect(page.getByRole('alert').filter({hasText:'history page link is invalid'})).toBeVisible();await expect(page.getByRole('list',{name:'Transaction receipts'})).toHaveCount(0);
 const signedOut=await browser.newContext();await signedOut.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const loginPage=await signedOut.newPage();await loginPage.goto(base+'/vault/transactions?q=Private&field=counterparty&type=sale');await loginPage.waitForURL(/\/login\?next=/);assert.equal(new URL(loginPage.url()).searchParams.get('next'),'/vault/transactions?q=Private&field=counterparty&type=sale');
 checks.push('compiled_history_navigation_search_pagination_downgrade_auth_and_mobile');
 assert.deepEqual(errors,[]);
} catch(error) {
 fs.writeFileSync(path.join(dir,'failure-private.json'),JSON.stringify({message:error.message,stack:error.stack,checks}),{flag:'wx'});
 const failedPage=browser?.contexts()[0]?.pages()[0];
 if(failedPage)await failedPage.screenshot({path:path.join(dir,'failure.png'),fullPage:true}).catch(()=>{});
 throw error;
} finally {
 if(browser)await browser.close();if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}for(const socket of sockets)socket.destroy();if(relay)relay.close();
 await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');
 for(const user of users)await db.query('delete from vault_item_instance_dispositions where user_id=$1',[user.id]);
 for(const user of users){await db.query('delete from vendor_store_items where store_id in (select id from vendor_stores where owner_id=$1)',[user.id]);await db.query('delete from vendor_stores where owner_id=$1',[user.id]);}
 if(createdCatalog) {
  // Preserve synthetic audit evidence, then remove only this fixture's events.
  // Append-only enforcement stays enabled for every application assertion above.
  const events=await db.query('select * from card_events where card_print_id=$1',[ids.parent]);
  fs.writeFileSync(path.join(dir,'events-private.json'),JSON.stringify(events.rows),{flag:'wx'});
  await db.query('begin');
  try {await db.query('set local session_replication_role=replica');await db.query('delete from card_events where card_print_id=$1',[ids.parent]);await db.query('commit');}
  catch(error){await db.query('rollback');throw error;}
 }
 if(createdCatalog){await db.query('delete from vault_item_instances where legacy_vault_item_id=$1',[ids.legacy]);await db.query('delete from vault_items where id=$1',[ids.legacy]);await db.query('delete from card_printings where id=$1',[ids.printing]);await db.query('delete from pricing_watch where card_print_id=$1',[ids.parent]);await db.query('delete from card_prints where id=$1',[ids.parent]);await db.query('delete from sets where id=$1',[ids.set]);}
 for(const user of users)await ok(admin.auth.admin.deleteUser(user.id));await db.end();guard({full:true});
}
const out=path.join(root,'docs/audits/vendor_desktop_disposition_v1');fs.mkdirSync(out,{recursive:true});
const receipt={at:new Date().toISOString(),status:'passed',project,checks,runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),migrationCount:runtime.applied,realAuth:true,realRpc:true,realBrowser:true,sourceHashes:Object.fromEntries(['apps/web/src/lib/vault/vaultDisposition.ts','apps/web/src/lib/vault/recordVaultDispositionAction.ts','apps/web/src/lib/vault/getVaultInstanceByGvvi.ts','apps/web/src/components/vault/VaultDispositionCard.tsx','apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx','apps/web/src/lib/vault/vaultDispositionHistory.ts','apps/web/src/app/vault/transactions/page.tsx','apps/web/src/components/stores/StoreManager.tsx','apps/web/src/components/vault/VaultCollectionView.tsx'].map(name=>[name,hash(fs.readFileSync(path.join(root,name)))])),fixturesRemoved:true,productionWrites:0,providerRequests:0};
fs.writeFileSync(path.join(out,`proof-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
