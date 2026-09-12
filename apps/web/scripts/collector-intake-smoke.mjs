import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { assertCollectorStagingTarget } from '../src/lib/collectorStaging.mjs';

const root = new URL('../../../', import.meta.url);
assert.equal(execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(), 'preview/collector-authenticated-20260910');
const hostedPath=process.env.COLLECTOR_HOSTED_TEST_CONFIG;
if(hostedPath)assert.equal(hostedPath.replaceAll('\\','/'),'C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844/private/browser-config.json');
const hosted=hostedPath?JSON.parse(readFileSync(hostedPath,'utf8')):null;
const status = hosted??JSON.parse(execFileSync('supabase',['status','-o','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assertCollectorStagingTarget(status.API_URL,false,Boolean(hosted));
const artifactRoot = hosted?'C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844':'C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910';
const credentialPath = path.resolve(process.argv[2] ?? '');
assert.ok(credentialPath.toLowerCase().startsWith(path.resolve(artifactRoot).toLowerCase()+path.sep));
const account = JSON.parse(readFileSync(credentialPath,'utf8'));
assert.match(account.email,/^collector-staging-\d+-\d+@example\.invalid$/);
const base=hosted?'https://grookai-collector-staging.vercel.app':'http://127.0.0.1:3167';
assert.equal(account.url,base+'/login');
const out = `${artifactRoot}/intake-smoke-${Date.now()}`;
mkdirSync(out,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}};
const owner=createClient(status.API_URL,status.ANON_KEY,options);
const admin=createClient(status.API_URL,status.SERVICE_ROLE_KEY,options);
const anonymous=createClient(status.API_URL,status.ANON_KEY,options);
const login=await owner.auth.signInWithPassword({email:account.email,password:account.password});
if(login.error) throw login.error;
const userId=login.data.user.id;
const sha=value=>createHash('sha256').update(value).digest('hex');
async function rows(client,table,query=[]) {
  let request=client.from(table).select('*');
  for(const [key,value] of query) request=request.eq(key,value);
  const result=await request.order('id');
  if(result.error) throw result.error;
  return result.data;
}
async function sourceFingerprint() {
  const result={};
  for(const table of ['card_prints','card_printings','sets','vault_item_instances']) {
    const data=await rows(admin,table);
    result[table]={count:data.length,sha256:sha(JSON.stringify(data))};
  }
  assert.equal(result.card_prints.count,326);
  assert.equal(result.card_printings.count,491);
  return result;
}
const before=await sourceFingerprint();
const beforeCandidates=await rows(admin,'canon_warehouse_candidates');
const report={endpoint:status.API_URL,before,evidence:[],errors:[],passed:false,productionWrites:false,schemaChanges:false};
writeFileSync(`${out}/run_plan.json`,JSON.stringify({baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),userId,endpoint:status.API_URL,base,before,reviewState:'RAW',syntheticTransportFixture:true,noCanonicalMutation:true,noPromotion:true},null,2));
const browser=await chromium.launch();
let page;
const post=async(token,payload,raw=false)=>{
  const response=await fetch(status.API_URL+'/functions/v1/warehouse-intake-v1',{
    method:'POST',headers:{apikey:status.ANON_KEY,'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},
    body:raw?payload:JSON.stringify(payload),signal:AbortSignal.timeout(30000),
  });
  return {status:response.status,body:await response.json()};
};
try {
  page=await browser.newPage({viewport:{width:1440,height:1050}});
  if(hosted)await page.context().request.get(base+'/robots.txt',{headers:{'x-vercel-protection-bypass':hosted.BYPASS,'x-vercel-set-bypass-cookie':'true'}});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(base+'/login?next='+encodeURIComponent('/card/GV-PK-MEW-200'));
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/card/GV-PK-MEW-200',{timeout:90000});
  await page.getByRole('link',{name:'Update image',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/submit');
  assert.equal(new URL(page.url()).searchParams.get('card'),'GV-PK-MEW-200');
  const submit=page.getByRole('button',{name:'Submit to warehouse',exact:true});
  await expect(submit).toBeDisabled();
  const fileInput=page.locator('input[type=file]').first();
  await fileInput.setInputFiles({name:'not-image.txt',mimeType:'text/plain',buffer:Buffer.from('invalid fixture')});
  await page.getByText('Upload an image file.',{exact:true}).waitFor();
  await expect(submit).toBeDisabled();
  const reference=await page.request.get(base+'/api/canon/cards/GV-PK-MEW-200/image');
  assert.equal(reference.status(),200);
  const buffer=await reference.body();
  const mimeType=reference.headers()['content-type'].split(';')[0];
  assert.match(mimeType,/^image\//);
  const imageHash=sha(buffer);
  await fileInput.setInputFiles({name:'local-transport-fixture.jpg',mimeType,buffer});
  await page.getByRole('textbox',{name:'Notes',exact:true}).fill('LOCAL TEST ONLY: image intake transport fixture. Existing canonical Blastoise front; not new evidence or an approval request.');
  await expect(submit).toBeEnabled();
  const [response]=await Promise.all([
    page.waitForResponse(r=>r.url().endsWith('/functions/v1/warehouse-intake-v1')&&r.request().method()==='POST'),
    submit.click(),
  ]);
  const responseBody=await response.json();
  report.intakeResponse={status:response.status(),body:responseBody};
  assert.equal(response.status(),200,JSON.stringify(responseBody));
  const candidateId=responseBody.candidate_id;
  assert.match(candidateId,/^[0-9a-f-]{36}$/);
  report.candidateId=candidateId;
  await page.getByText('Submission received. It is now in warehouse review.',{exact:true}).waitFor();
  await expect(submit).toHaveCount(0);
  const candidates=await rows(owner,'canon_warehouse_candidates',[['id',candidateId]]);
  assert.equal(candidates.length,1);
  const candidate=candidates[0];
  assert.equal(candidate.state,'RAW');
  assert.equal(candidate.submitted_by_user_id,userId);
  assert.equal(candidate.submission_intent,'MISSING_IMAGE');
  assert.equal(candidate.reference_hints_payload.card_gv_id,'GV-PK-MEW-200');
  assert.equal(candidate.founder_approved_at,null);
  assert.equal(candidate.promoted_at,null);
  const evidence=await rows(owner,'canon_warehouse_candidate_evidence',[['candidate_id',candidateId]]);
  const events=await rows(owner,'canon_warehouse_candidate_events',[['candidate_id',candidateId]]);
  assert.equal(evidence.length,1); assert.equal(events.length,1);
  assert.equal(evidence[0].created_by_user_id,userId);
  assert.equal(evidence[0].evidence_slot,'front');
  assert.equal(events[0].event_type,'INTAKE_CREATED');
  const imagePath=evidence[0].storage_path;
  assert.ok(imagePath.startsWith(`${userId}/warehouse-submissions/`));
  const stored=await owner.storage.from('user-card-images').download(imagePath);
  if(stored.error) throw stored.error;
  assert.equal(sha(Buffer.from(await stored.data.arrayBuffer())),imageHash);
  writeFileSync(`${out}/saved-review.json`,JSON.stringify({candidate,evidence,events,imageHash},null,2));
  report.evidence.push({workflow:'actual card Update image -> browser upload -> Edge -> atomic RAW candidate/evidence/event -> owner readback',passed:true,imageHash});
  for(const [width,height] of [[1440,1050],[390,844]]) {
    await page.setViewportSize({width,height});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${out}/submission-${width}.png`,fullPage:true});
  }
  const otherAccount={email:`collector-staging-${Date.now()}-8@example.invalid`,password:randomBytes(24).toString('base64url')};
  const created=await admin.auth.admin.createUser({...otherAccount,email_confirm:true});
  if(created.error) throw created.error;
  const other=createClient(status.API_URL,status.ANON_KEY,options);
  const otherLogin=await other.auth.signInWithPassword(otherAccount);
  if(otherLogin.error) throw otherLogin.error;
  for(const table of ['canon_warehouse_candidates','canon_warehouse_candidate_evidence','canon_warehouse_candidate_events']) {
    const key=table==='canon_warehouse_candidates'?'id':'candidate_id';
    assert.equal((await rows(other,table,[[key,candidateId]])).length,0);
    const denied=await anonymous.from(table).select('id').eq(key,candidateId);
    assert.ok(denied.error || denied.data.length===0);
  }
  const deniedImage=await other.storage.from('user-card-images').download(imagePath);
  assert.ok(deniedImage.error);
  const token=login.data.session.access_token;
  const payload={notes:'LOCAL NEGATIVE TEST',submission_intent:'MISSING_IMAGE',intake_channel:'UPLOAD',
    reference_context:{card_gv_id:'GV-PK-MEW-200'},evidence:{images:[{type:'front',storage_path:imagePath}]}};
  const tests=[
    ['anonymous',null,payload,401],
    ['foreign image',otherLogin.data.session.access_token,payload,403],
    ['missing owned image',token,{...payload,evidence:{images:[{type:'front',storage_path:`${userId}/warehouse-submissions/${randomUUID()}/front/absent.jpg`}]}},403],
    ['duplicate slots',token,{...payload,evidence:{images:[...payload.evidence.images,...payload.evidence.images]}},400],
    ['no evidence',token,{...payload,evidence:{}},400],
    ['malformed JSON',token,'{',400],
    ['null JSON',token,'null',400],
  ];
  for(const [name,auth,body,expected] of tests) {
    const result=await post(auth,body,typeof body==='string');
    assert.equal(result.status,expected,`${name}: ${JSON.stringify(result)}`);
    report.evidence.push({workflow:name,...result,passed:true});
  }
  const rpc=await owner.rpc('warehouse_intake_service_v1',{
    p_actor_user_id:created.data.user.id,p_notes:'DENIED TEST',p_tcgplayer_id:null,p_submission_intent:'MISSING_IMAGE',p_intake_channel:'UPLOAD',
    p_identity_snapshot_id:null,p_condition_snapshot_id:null,p_identity_scan_event_id:null,p_images:payload.evidence.images,p_reference_hints_payload:payload.reference_context,
  });
  assert.ok(rpc.error); assert.equal(rpc.error.code,'42501');
  const inserted=await owner.from('canon_warehouse_candidates').insert({submitted_by_user_id:userId,intake_channel:'UPLOAD',submission_type:'USER_SUBMISSION',submission_intent:'MISSING_IMAGE',state:'RAW',notes:'DENIED DIRECT WRITE'});
  assert.ok(inserted.error);
  report.evidence.push({workflow:'other-account/anonymous row and image isolation; direct writer and table insert denied',passed:true});

  // Forward the real request once, wait for its committed success, then lose only
  // the browser response. This is failure injection, not mocked database success.
  let lostResponseCandidateId;
  let dispatches=0;
  await page.goto(base+'/submit?intent=MISSING_IMAGE&card=GV-PK-MEW-200');
  await page.locator('input[type=file]').first().setInputFiles({name:'lost-response-fixture.jpg',mimeType,buffer});
  await page.getByRole('textbox',{name:'Notes',exact:true}).fill('LOCAL TEST ONLY: committed intake with intentionally lost browser response. Do not promote.');
  await page.route('**/functions/v1/warehouse-intake-v1',async route=>{
    if(route.request().method()!=='POST') { await route.continue(); return; }
    dispatches++;
    const committed=await route.fetch({maxRetries:0,maxRedirects:0});
    assert.equal(committed.status(),200);
    lostResponseCandidateId=(await committed.json()).candidate_id;
    await route.abort('failed');
  });
  await page.getByRole('button',{name:'Submit to warehouse',exact:true}).click();
  await page.getByText(/We could not confirm your submission/).waitFor({timeout:30000});
  await page.getByRole('textbox',{name:'Notes',exact:true}).fill('Editing must not erase the unconfirmed submission reference.');
  await page.getByText(/We could not confirm your submission/).waitFor();
  await expect(page.getByRole('button',{name:'Submit to warehouse',exact:true})).toBeDisabled();
  assert.equal(dispatches,1);
  assert.ok(lostResponseCandidateId);
  const preservedEvidence=await rows(owner,'canon_warehouse_candidate_evidence',[['candidate_id',lostResponseCandidateId]]);
  assert.equal(preservedEvidence.length,1);
  const preservedImage=await owner.storage.from('user-card-images').download(preservedEvidence[0].storage_path);
  if(preservedImage.error) throw preservedImage.error;
  assert.equal(sha(Buffer.from(await preservedImage.data.arrayBuffer())),imageHash);
  report.evidence.push({workflow:'committed intake with lost response: evidence retained, one request only, resubmit disabled',passed:true,candidateId:lostResponseCandidateId});
  await page.screenshot({path:`${out}/lost-response.png`,fullPage:true});
  await page.unroute('**/functions/v1/warehouse-intake-v1');
  const afterCandidates=await rows(admin,'canon_warehouse_candidates');
  assert.equal(afterCandidates.length,beforeCandidates.length+2);
  assert.deepEqual(afterCandidates.filter(row=>![candidateId,lostResponseCandidateId].includes(row.id)),beforeCandidates);
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  report.passed=true;
  await other.auth.signOut({scope:'local'});
} catch(error) {
  report.failure=error.stack ?? String(error);
  if(page) await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});
  process.exitCode=1;
} finally {
  try { report.after=await sourceFingerprint(); assert.deepEqual(report.after,before); report.canonicalAndVaultUnchanged=true; }
  catch(error) { report.reconciliationFailure=error.message; report.passed=false; process.exitCode=1; }
  await browser.close();
  await owner.auth.signOut({scope:'local'});
  writeFileSync(`${out}/result.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({out,...report},null,2));
}
