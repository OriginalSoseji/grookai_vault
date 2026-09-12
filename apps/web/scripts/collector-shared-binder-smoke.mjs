import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { assertCollectorStagingTarget } from '../src/lib/collectorStaging.mjs';

const root=new URL('../../../',import.meta.url);
assert.equal(execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),'preview/collector-authenticated-20260910');
const local=JSON.parse(execFileSync('supabase',['status','-o','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assertCollectorStagingTarget(local.API_URL);
assert.equal(local.API_URL,'http://127.0.0.1:54321');
const base='http://127.0.0.1:3167';
const artifacts='C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910';
const credentialPath=path.resolve(process.argv[2]??'');
assert.ok(credentialPath.toLowerCase().startsWith(path.resolve(artifacts).toLowerCase()+path.sep));
const account=JSON.parse(readFileSync(credentialPath,'utf8'));
assert.match(account.email,/^collector-staging-\d+-\d+@example\.invalid$/);
assert.equal(account.url,base+'/login');
const out=`${artifacts}/shared-binder-${Date.now()}`;
mkdirSync(out,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(local.API_URL,local.SECRET_KEY,options);
async function read(table,filters=[],columns='*') {
  let query=admin.from(table).select(columns);
  for(const [key,value] of filters) query=query.eq(key,value);
  const result=await query.order(table==='binder_feature_flags'?'flag_key':'id');
  if(result.error) throw result.error;
  return result.data;
}
const flagsBefore=await read('binder_feature_flags');
assert.equal(flagsBefore.find(f=>f.flag_key==='shared').enabled,false,'Do not take over an already-enabled shared test');
const originals={};
for(const table of ['card_prints','card_printings','sets','vault_item_instances']) originals[table]=await read(table);
assert.equal(originals.card_prints.length,326);
assert.equal(originals.card_printings.length,491);
const digest=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const report={endpoint:local.API_URL,steps:[],pageErrors:[],passed:false,productionWrites:false,schemaChanges:false};
const secrets=[account.password];
const sanitize=value=>secrets.reduce((result,secret)=>result.replaceAll(secret,'[redacted]'),String(value))
  .replace(/\/binder-invites\/[A-Za-z0-9_-]{20,256}/g,'/binder-invites/[redacted]');
writeFileSync(`${out}/run_plan.json`,JSON.stringify({branch:'preview/collector-authenticated-20260910',baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),endpoint:local.API_URL,flagsBefore,enableOnly:'shared',restoreFlags:true,noExternalNotifications:true},null,2));
const browser=await chromium.launch();
const pages=[];
let fixtureCopy;
let binderId;
async function loginPage(credentials,next='/binders') {
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  const page=await context.newPage(); pages.push(page);
  page.on('pageerror',error=>report.pageErrors.push(sanitize(error.message)));
  await page.goto(base+'/login?next='+encodeURIComponent(next));
  await page.locator('input[type=email]').fill(credentials.email);
  await page.locator('input[type=password]').fill(credentials.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL(url=>url.pathname===next,{timeout:60000});
  await page.waitForLoadState('networkidle');
  return page;
}
try {
  const change=await admin.from('binder_feature_flags').update({enabled:true}).eq('flag_key','shared').eq('enabled',false).select('flag_key');
  if(change.error) throw change.error;
  assert.equal(change.data.length,1);
  const owner={email:`collector-staging-${Date.now()}-9@example.invalid`,password:randomBytes(24).toString('base64url')};
  secrets.push(owner.password);
  const createdOwner=await admin.auth.admin.createUser({...owner,email_confirm:true});
  if(createdOwner.error) throw createdOwner.error;
  report.syntheticOwnerId=createdOwner.data.user.id;
  const ownerPage=await loginPage(owner,'/binders/new');
  const title=`Local shared Binder ${Date.now()}`;
  await ownerPage.locator('input[name=title]').fill(title);
  await ownerPage.locator('input[name=targetKind][value=custom]').check();
  await ownerPage.getByPlaceholder('Pikachu Base Set 58 or reverse holo').fill('Blastoise');
  await ownerPage.locator('li').filter({hasText:'#200'}).getByRole('button',{name:'Add Blastoise ex to checklist',exact:true}).click();
  await ownerPage.locator('input[name=customChecklistConfirmation]').check();
  await ownerPage.getByRole('button',{name:'Create Binder',exact:true}).click();
  await ownerPage.waitForURL(/\/binders\/[0-9a-f-]{36}/,{timeout:60000});
  await ownerPage.waitForLoadState('networkidle');
  const binderUrl=ownerPage.url();
  const binders=await read('binders',[['title',title]]);
  assert.equal(binders.length,1);
  binderId=binders[0].id; report.binderId=binderId; report.binderUrl=binderUrl;
  const publicId=new URL(binderUrl).pathname.split('/').pop();
  await ownerPage.getByRole('link',{name:'Settings',exact:true}).click();
  await ownerPage.locator('form').filter({has:ownerPage.locator('input[name=binderAction][value=update_policy]')}).locator('select').selectOption('family');
  await ownerPage.getByRole('button',{name:'Save sharing settings',exact:true}).click();
  await ownerPage.getByText('Binder sharing settings saved.',{exact:true}).waitFor();
  const shared=(await read('binders',[['id',binderId]]))[0];
  assert.equal(shared.read_access,'private'); assert.equal(shared.join_policy,'invite_only');
  assert.equal(shared.contribution_policy,'members_direct');
  report.steps.push({step:'browser creates private custom Binder and saves family-sharing policy',passed:true});
  await ownerPage.getByRole('button',{name:'Create one-use invitation',exact:true}).click();
  const secretInput=ownerPage.getByRole('textbox',{name:'New secret Binder link',exact:true});
  await secretInput.waitFor();
  const invitation=await secretInput.inputValue(); secrets.push(invitation,new URL(invitation).pathname.split('/').pop());
  assert.equal(new URL(invitation).origin,base,'Invitation must stay on local preview, never production');
  const participants=[];
  for(let i=0;i<2;i++) {
    const credentials={email:`collector-staging-${Date.now()}-${i+6}@example.invalid`,password:randomBytes(24).toString('base64url')};
    secrets.push(credentials.password);
    const created=await admin.auth.admin.createUser({...credentials,email_confirm:true});
    if(created.error) throw created.error;
    const client=createClient(local.API_URL,local.ANON_KEY,options);
    const signed=await client.auth.signInWithPassword(credentials);
    if(signed.error) throw signed.error;
    participants.push({...credentials,id:created.data.user.id,client});
  }
  const member=participants[0], outsider=participants[1];
  const memberPage=await loginPage(member);
  const outsiderPage=await loginPage(outsider);
  const assertUnavailable=async(page,client)=>{
    await page.goto(binderUrl,{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'Binder unavailable',exact:true}).waitFor();
    await expect(page.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
    if(client) {
      const denied=await client.rpc('binder_detail_v1',{p_public_id:publicId});
      assert.ok(denied.error || denied.data?.ok===false);
    }
  };
  await assertUnavailable(outsiderPage,outsider.client);
  const preview=await member.client.rpc('binder_invitation_preview_v1',{p_token:new URL(invitation).pathname.split('/').pop()});
  report.previewReadback={errorCode:preview.error?.code??null,state:preview.data?.state??null,role:preview.data?.maximum_role??null};
  assert.equal(preview.error,null);
  assert.equal(preview.data.state,'active');
  await memberPage.goto(invitation,{waitUntil:'networkidle'});
  assert.equal(new URL(memberPage.url()).origin,base,'Handoff must preserve the login-cookie origin');
  report.invitationReviewText=sanitize(await memberPage.locator('main').innerText());
  assert.equal(new URL(memberPage.url()).pathname,'/binder-invites/review');
  assert.ok(!(await memberPage.content()).includes(new URL(invitation).pathname.split('/').pop()));
  const handoff=(await memberPage.context().cookies()).find(c=>c.name==='gv_binder_invite_handoff_v1');
  assert.ok(handoff?.httpOnly);
  const [acceptedResponse]=await Promise.all([
    memberPage.waitForResponse(r=>r.url().endsWith('/binder-invites/respond')&&r.request().method()==='POST'),
    memberPage.getByRole('button',{name:'Accept invitation',exact:true}).click(),
  ]);
  report.acceptResponse={status:acceptedResponse.status(),location:acceptedResponse.headers().location??null};
  const acceptanceHeaders=await acceptedResponse.request().allHeaders();
  report.acceptRequest={origin:acceptanceHeaders.origin??null,fetchSite:acceptanceHeaders['sec-fetch-site']??null,contentType:acceptanceHeaders['content-type']??null};
  assert.equal(acceptedResponse.status(),303,JSON.stringify(report.acceptRequest));
  await memberPage.waitForLoadState('networkidle');
  report.afterAcceptText=sanitize(await memberPage.locator('main').innerText());
  await memberPage.waitForURL(url=>url.pathname===new URL(binderUrl).pathname,{timeout:30000});
  await memberPage.getByRole('heading',{name:title,exact:true}).waitFor();
  assert.equal((await read('binder_contributions',[['binder_id',binderId]])).length,0);
  report.steps.push({step:'explicit acceptance through token-free HttpOnly handoff; no auto-contribution',passed:true});
  await outsiderPage.goto(invitation);
  await expect(outsiderPage.getByRole('button',{name:'Accept invitation',exact:true})).toHaveCount(0);
  await assertUnavailable(outsiderPage,outsider.client);
  report.steps.push({step:'one-use invitation replay and outsider Binder access denied',passed:true});

  await memberPage.goto(base+'/card/GV-PK-MEW-200');
  await memberPage.locator('select[name=condition]').selectOption('LP');
  await memberPage.locator('input[name=quantity]').fill('1');
  const printing=await memberPage.locator('.gv-detail-finish-field select').inputValue();
  await memberPage.getByRole('button',{name:'Add to Vault',exact:true}).click();
  await expect.poll(async()=> (await read('vault_item_instances',[['user_id',member.id]])).length).toBe(1);
  fixtureCopy=(await read('vault_item_instances',[['user_id',member.id]]))[0];
  assert.equal(fixtureCopy.card_printing_id,printing); assert.equal(fixtureCopy.condition_label,'LP');
  report.fixtureCopyId=fixtureCopy.id;
  await memberPage.goto(binderUrl);
  await memberPage.getByRole('link',{name:'Choose eligible copies',exact:true}).click();
  await memberPage.getByRole('button',{name:'Add your copy',exact:true}).click();
  await expect.poll(async()=> (await read('binder_contributions',[['binder_id',binderId],['state','active']])).length).toBe(1);
  const active=(await read('binder_contributions',[['binder_id',binderId],['state','active']]))[0];
  assert.equal(active.vault_item_instance_id,fixtureCopy.id); assert.equal(active.contributor_user_id,member.id);
  await ownerPage.goto(binderUrl);
  await expect(ownerPage.getByText('Blastoise ex',{exact:true}).first()).toBeVisible();
  await memberPage.goto(binderUrl);
  await memberPage.getByRole('heading',{name:title,exact:true}).waitFor();
  await memberPage.getByRole('button',{name:'Remove contribution',exact:true}).waitFor();
  await memberPage.waitForLoadState('networkidle');
  for(const [width,height] of [[1440,1050],[390,844]]) {
    await memberPage.setViewportSize({width,height});
    await expect(memberPage.getByRole('button',{name:'Remove contribution',exact:true})).toBeVisible();
    await expect.poll(()=>memberPage.locator('main img').evaluateAll(images=>images.filter(image=>image.complete&&image.naturalWidth>0).length)).toBeGreaterThan(0);
    assert.ok(await memberPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await memberPage.screenshot({path:`${out}/member-checklist-${width}.png`,fullPage:true});
  }
  report.steps.push({step:'member selects own exact LP copy; contribution persists and owner sees checklist',passed:true});
  const foreign=await outsider.client.rpc('binder_contribution_add_v1',{p_public_id:publicId,p_vault_item_instance_id:fixtureCopy.id,p_idempotency_key:randomBytes(16).toString('hex'),p_source:'manual'});
  assert.ok(foreign.error || foreign.data?.ok===false);
  await memberPage.getByRole('button',{name:'Remove contribution',exact:true}).click();
  await expect.poll(async()=> (await read('binder_contributions',[['binder_id',binderId],['state','active']])).length).toBe(0);
  assert.deepEqual((await read('vault_item_instances',[['id',fixtureCopy.id]]))[0],fixtureCopy);
  await memberPage.goto(binderUrl+'?tab=settings');
  await expect(memberPage.getByRole('button',{name:'Create one-use invitation',exact:true})).toHaveCount(0);
  await expect(memberPage.getByRole('button',{name:'Save sharing settings',exact:true})).toHaveCount(0);
  await memberPage.getByRole('button',{name:'Leave Binder',exact:true}).click();
  await memberPage.waitForLoadState('networkidle');
  await assertUnavailable(memberPage,member.client);
  assert.deepEqual((await read('vault_item_instances',[['id',fixtureCopy.id]]))[0],fixtureCopy);
  report.steps.push({step:'withdrawal and departure preserve Vault copy; former member loses access; no management controls',passed:true});
  const anonymous=await browser.newPage(); pages.push(anonymous);
  await assertUnavailable(anonymous);
  assert.equal(report.pageErrors.length,0,JSON.stringify(report.pageErrors));
  report.passed=true;
} catch(error) {
  report.failure=sanitize(error.stack??error);
  report.lastMainText=await pages.at(-1)?.locator('main').innerText().then(sanitize).catch(()=>null);
  process.exitCode=1;
} finally {
  try {
    const restored=await admin.from('binder_feature_flags').update({enabled:false}).eq('flag_key','shared');
    if(restored.error) throw restored.error;
    const flagsAfter=await read('binder_feature_flags');
    // updated_at is operational bookkeeping; every enablement value must match.
    assert.deepEqual(flagsAfter.map(f=>[f.flag_key,f.enabled]),flagsBefore.map(f=>[f.flag_key,f.enabled]));
    report.flagsRestored=true;
    for(const table of ['card_prints','card_printings','sets','vault_item_instances']) {
      const after=await read(table);
      const expected=fixtureCopy&&table==='vault_item_instances'?[...originals[table],fixtureCopy].sort((a,b)=>a.id.localeCompare(b.id)):originals[table];
      assert.deepEqual(after,expected,`${table} changed outside the explicit test-copy creation`);
      report[`${table}Readback`]={rows:after.length,sha256:digest(after)};
    }
    if(binderId) report.contributions=await read('binder_contributions',[['binder_id',binderId]],'id,state,vault_item_instance_id,contributor_user_id');
    report.sourceAndOwnershipReconciled=true;
  } catch(error) { report.reconciliationFailure=sanitize(error.message);report.passed=false;process.exitCode=1; }
  await browser.close();
  writeFileSync(`${out}/result.json`,sanitize(JSON.stringify(report,null,2)));
  console.log(sanitize(JSON.stringify({out,...report},null,2)));
}
