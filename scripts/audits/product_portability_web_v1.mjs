import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const root='C:/gv_product_portability_20261008',base='C:/grookai_vault_operator_artifacts/product_portability_20261008',origin='http://127.0.0.1:35831';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);const resume=process.argv[3]==='resume';assert.equal(process.argv.length,resume?4:3);
const run=process.argv[2];assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');
const command=(n,a)=>execFileSync(n,a,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:64*1024*1024}),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
command(process.execPath,['scripts/audits/product_portability_fixture_v1.mjs','verify',run]);
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
assert.equal((await owner.auth.signInWithPassword({email:f.users[3].email,password:f.users[3].password})).error,null);
async function authenticate(user){
 if(context)await context.close();context=await browser.newContext({viewport:{width:390,height:900},colorScheme:'light',locale:'en-US'});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if([origin,cfg.API_URL].includes(u.origin)||['data:','blob:'].includes(u.protocol))return route.continue();blocked.push(u.origin);return route.abort('blockedbyclient');});
 let cookies=[];const client=createServerClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{for(const v of values){cookies=cookies.filter(c=>c.name!==v.name);cookies.push(v);}}}});
 const signed=await client.auth.signInWithPassword({email:user.email,password:user.password});assert.equal(signed.error,null);assert.equal(signed.data.user.id,user.id);
 await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:c.options.httpOnly??false,sameSite:'Lax',expires:Math.floor(Date.now()/1000)+(c.options.maxAge??3600)})));
 page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
}
async function picture(name){await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});await page.screenshot({path:out+'/'+name+'.png',fullPage:true,caret:'initial'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');}
const source=fs.readFileSync(run+'/source.private.csv','utf8'),sourceRows=read(run+'/source-rows.private.json');
const history=origin+'/vault/import/history',details=history+'/'+f.sourceSha256;
const groupsEndpoint='**/rest/v1/vault_collection_import_groups_v2*';
const copies=async()=>{const r=await owner.from('vault_item_instances').select('id,card_printing_id,acquisition_cost,condition_label').eq('user_id',f.users[3].id).eq('card_print_id',f.card).order('id');assert.equal(r.error,null);return r.data;};
try{
 server=spawn(process.execPath,[root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','35831'],{cwd:root+'/apps/web',env,stdio:['ignore',fd,fd],windowsHide:true});stopped=new Promise(resolve=>server.once('exit',resolve));
 let ready=false;for(let i=0;i<120&&!ready;i++){assert.equal(server.exitCode,null);try{ready=(await fetch(origin+'/api/navigation/shell',{signal:AbortSignal.timeout(2000)})).status===401;}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,300));}assert.ok(ready,'Server not ready');
 browser=await chromium.launch({headless:true});await authenticate(f.users[3]);
 await page.goto(history);if(resume){assert.equal((await copies()).length,3);await expect(page.getByText('Import 1 · View source rows and review status',{exact:true})).toBeVisible();await picture('existing-history');checks.push('Previously saved source remains reachable before same-file reimport');}else{await expect(page.getByText(/No saved imports yet/)).toBeVisible();await picture('empty-history');checks.push('New authenticated owner sees a truthful empty saved-import state');}
 await page.getByRole('link',{name:'Import original CSV',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Import your collection',exact:true})).toBeVisible();
 await page.locator('#collectr-csv').setInputFiles({name:'synthetic-portability.csv',mimeType:'text/csv',buffer:Buffer.from(source)});
 const saveImport=page.getByRole('button',{name:'Save 3 ready copies and retain review rows',exact:true});
 await expect(saveImport).toBeEnabled();await picture('import-preview');checks.push('Actual importer separates three supported copies from two unresolved original rows');
 let lost=false,originalAttempt;
 const loseResponse=async route=>{const input=route.request().postDataJSON();if(input.operation==='save'&&!lost){originalAttempt=input.attempt;const response=await route.fetch();save('first-save-response.private.json',{status:response.status(),body:await response.json()});assert.equal(response.status(),200);lost=true;await route.abort('failed');}else await route.continue();};
 await page.route('**/api/vault/import',loseResponse);await saveImport.click();
 await expect(page.getByRole('button',{name:'Retry saved import',exact:true})).toBeEnabled();assert.equal(lost,true);
 const added=await copies();assert.equal(added.length,3);assert.equal(added.filter(c=>c.card_printing_id===f.normal&&Number(c.acquisition_cost)===4.25&&c.condition_label==='NM').length,2);assert.equal(added.filter(c=>c.card_printing_id===f.reverse&&Number(c.acquisition_cost)===9&&c.condition_label==='LP').length,1);
 await picture('response-lost');await page.reload();
 const retained=await page.evaluate(id=>JSON.parse(sessionStorage.getItem('vault-import:v2:'+id)),f.users[3].id);
 assert.equal(retained.requestId,originalAttempt.requestId);assert.equal(retained.csvText,source);
 await page.getByRole('button',{name:'Retry saved import',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Import verified',exact:true})).toBeVisible();assert.deepEqual(await copies(),added);
 await picture('verified-import');checks.push('Committed-response loss and reload retry retain the original UUID and exact three copy IDs without duplication');
 await page.getByRole('link',{name:'Review saved import',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Saved import details',exact:true})).toBeVisible();
 await expect(page.getByText('4 source rows · 2 previously reconciled · 2 need review',{exact:true})).toBeVisible();checks.push('Verified success links directly to durable owner-scoped reconciliation');
 for(const[width,height,name]of[[320,820,'narrow-phone'],[390,900,'phone'],[768,1024,'tablet'],[1440,1000,'desktop']]){await page.setViewportSize({width,height});await picture(name);}
 checks.push('Saved source details have no horizontal overflow at 320,390,768,1440 pixels');await page.setViewportSize({width:390,height:900});
 await page.getByRole('button',{name:'All rows (4)',exact:true}).click();
 await page.getByLabel('Search saved source fields',{exact:true}).fill('PSA 10');
 await expect(page.getByText('Showing 1 of 1 matching source rows',{exact:true})).toBeVisible();
 await page.locator('details').filter({hasText:'Source row 4'}).locator('summary').click();await expect(page.getByText('PSA 10',{exact:true})).toBeVisible();await picture('review-grade');
 await page.getByText('Download source and retry options',{exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download saved source JSON',exact:true}).click();const download=await downloadPromise;
 assert.match(download.suggestedFilename(),/^grookai-saved-import-[a-f0-9]{12}\.json$/);await download.saveAs(out+'/source-download.private.json');
 const archive=read(out+'/source-download.private.json');assert.equal(archive.format,'grookai-saved-import-v1');assert.deepEqual(archive.sourceRows,sourceRows);assert.equal(archive.mappings.length,2);assert.deepEqual(archive.reviewIndices,[2,3]);assert.equal(archive.counts.cardCopies,3);assert.equal(archive.counts.addedCopies,3);assert.equal(archive.counts.reusedCopies,0);checks.push('Actual download retains every source row/field, quotes, newline, unsupported grade and unknown column regardless of current filters');
 const cursors=[];const capped=async route=>{const url=new URL(route.request().url());cursors.push(url.searchParams.get('group_key'));url.searchParams.set('limit','1');const response=await route.fetch({url:url.href});await route.fulfill({response});};
 await page.route(groupsEndpoint,capped);await page.goto(details);await expect(page.getByText('4 source rows · 2 previously reconciled · 2 need review',{exact:true})).toBeVisible();assert.equal(cursors.filter(x=>x!==null).length,2);await page.unroute(groupsEndpoint,capped);checks.push('Actual RLS reads traverse capped one-group pages until the empty page');
 const failRead=async route=>{if(route.request().method()!=='GET')return route.fallback();await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic unavailable'})});};
 await page.route(groupsEndpoint,failRead);await page.goto(details);await expect(page.locator('div[role=alert]:has(p)')).toContainText('could not be loaded');await expect(page.getByRole('button',{name:'Download saved source JSON',exact:true})).toHaveCount(0);await picture('read-unavailable');await page.unroute(groupsEndpoint,failRead);await page.getByRole('button',{name:'Retry loading',exact:true}).click();await expect(page.getByText('4 source rows · 2 previously reconciled · 2 need review',{exact:true})).toBeVisible();checks.push('Failed source mapping read shows unavailable without partial counts/download; explicit retry recovers complete details');
 await page.emulateMedia({colorScheme:'dark'});await picture('system-dark-site-light');
 await page.getByRole('button',{name:'Use dark mode',exact:true}).click();await expect(page.locator('html')).toHaveClass(/gv-dark/);await picture('dark-details');
 await page.getByLabel('Search saved source fields',{exact:true}).fill('PSA 10');await expect(page.getByText('Showing 1 of 1 matching source rows',{exact:true})).toBeVisible();await picture('dark-search');
 await page.getByLabel('Search saved source fields',{exact:true}).fill('');await page.getByRole('button',{name:'Use light mode',exact:true}).click();await page.emulateMedia({colorScheme:'light'});
 checks.push('Actual site theme toggle and system-dark/site-light combination preserve readable source fields and typed search');
 await page.getByRole('link',{name:'All saved imports',exact:true}).click();await expect(page.getByText('Import 1 · View source rows and review status',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Show more imports',exact:true}).click();await expect(page.getByRole('button',{name:'Show more imports',exact:true})).toHaveCount(0);await picture('saved-list');checks.push('Saved import remains reachable after route reload; list completes with an empty cursor page');
 const visitor=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});assert.equal((await visitor.auth.signInWithPassword({email:f.users[2].email,password:f.users[2].password})).error,null);
 for(const table of ['vault_collection_import_documents_v2','vault_collection_import_groups_v2']){
  const foreign=await visitor.from(table).select('*').eq('user_id',f.users[3].id).eq('source_sha256',f.sourceSha256);assert.equal(foreign.error,null);assert.deepEqual(foreign.data,[]);
  const denied=await owner.from(table).update({source_sha256:'b'.repeat(64)}).eq('user_id',f.users[3].id).eq('source_sha256',f.sourceSha256);assert.ok(denied.error);
 }
 await visitor.auth.signOut({scope:'local'});checks.push('Actual Auth/RLS hides foreign documents/mappings and denies direct owner rewrites of source history');
 let releaseRead,readArrived;const arrived=new Promise(resolve=>readArrived=resolve),release=new Promise(resolve=>releaseRead=resolve);
 const lateRead=async route=>{if(route.request().method()!=='GET')return route.fallback();const response=await route.fetch();readArrived();await release;await route.fulfill({response}).catch(()=>{});};
 await page.route(groupsEndpoint,lateRead);await page.goto(details);await arrived;
 const account=await context.newPage();await account.goto(origin+'/account');await account.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect.poll(async()=>await page.getByText('Your account changed. Reopen Saved imports to continue.',{exact:true}).isVisible()||new URL(page.url()).pathname==='/login').toBe(true);releaseRead();await page.unroute(groupsEndpoint,lateRead);await expect(page.getByRole('button',{name:'Download saved source JSON',exact:true})).toHaveCount(0);await expect(page.getByText('PSA 10',{exact:true})).toHaveCount(0);await picture('owner-closed');checks.push('Real cross-tab sign-out drops the delayed old-owner group response and unmounts private history');
 await authenticate(f.users[2]);await page.goto(details);await expect(page.locator('div[role=alert]:has(p)')).toContainText('could not be loaded');await expect(page.getByRole('button',{name:'Download saved source JSON',exact:true})).toHaveCount(0);await page.goto(history);await expect(page.getByText(/No saved imports yet/)).toBeVisible();checks.push('Replacement owner cannot reopen the previous source URL and has an independent empty history');
 assert.deepEqual(await copies(),added);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);for(const[name,hash]of Object.entries(hashes))assert.equal(sha(root+'/'+name),hash,name);
 command(process.execPath,['scripts/audits/product_portability_fixture_v1.mjs','verify',run]);
}catch(error){failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:out+'/failure.png',fullPage:true,caret:'initial'}).catch(()=>{});}
finally{if(browser)await browser.close();if(server&&server.exitCode===null)server.kill();if(stopped)await stopped;fs.closeSync(fd);}
save('result.json',{status:failure?'failed':'passed',at:new Date().toISOString(),checks,blocked,errors,failure,productionWrites:0,providerCalls:0});console.log(JSON.stringify({out,status:failure?'failed':'passed',checks:checks.length,failure:failure?.message}));if(failure)process.exitCode=1;
