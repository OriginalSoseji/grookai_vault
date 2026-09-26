// Fixed production private-cache staging. Never changes catalog, users, grants,
// schema, publication or payment flags. Resumes only its own hash-bound journal.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import {root,fixture,hash} from '../schema/storefront_production_lab_v1.mjs';
import {MAX_FEATURE_BYTES} from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
assert.equal(process.argv.length,2);
const target='ycdxbpibncqcchqiihfz',origin=`https://${target}.supabase.co`,bucket='vendor-scan-features-v29';
const dir=path.join(fixture,'production-features-v1'),planBytes=fs.readFileSync(path.join(dir,'plan.private.json')),plan=JSON.parse(planBytes);
const publicPlan=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/storefront_production_20260926/feature-plan.json')));
assert.equal(plan.target,target);assert.equal(plan.bucket,bucket);assert.equal(plan.public,false);assert.equal(hash(planBytes),publicPlan.planSha256);
assert.equal(plan.objects.length,19621);assert.equal(plan.bytes,8478139239);
const auditDir=path.join(root,'docs/audits/storefront_production_20260926');
const checks=fs.readdirSync(auditDir).filter(n=>/^shipcheck-.*\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(path.join(auditDir,n))));
assert.ok(checks.some(r=>r.status==='passed'&&Date.now()-Date.parse(r.at)<7200000),'Normal repository shipcheck must pass before staging');
const replay=JSON.parse(fs.readFileSync(path.join(auditDir,'full-chain-419.json')));assert.equal(replay.status,'passed');assert.equal(replay.migrations,419);
const token=execFileSync('pwsh',['-NoProfile','-File','C:/gv_store_billing_20260919/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();assert.match(token,/^sbp_/);
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const projectResponse=await fetch(`https://api.supabase.com/v1/projects/${target}`,{headers});assert.ok(projectResponse.ok);assert.equal((await projectResponse.json()).id,target);
const keyResponse=await fetch(`https://api.supabase.com/v1/projects/${target}/api-keys?reveal=true`,{headers});assert.ok(keyResponse.ok);const keys=await keyResponse.json();
const require=createRequire(path.join(root,'apps/web/package.json')),{createClient}=require('@supabase/supabase-js');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);assert.equal(url.origin,origin);
  for(let attempt=0;;attempt++){
    try{
      const response=await fetch(input,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(45000)});
      if(![429,502,503,504].includes(response.status)||attempt===4)return response;
      await response.body?.cancel();
    }catch(error){if(attempt===4)throw error;}
    await delay(500*2**attempt);
  }
}}};
const secret=keys.find(r=>r.type==='secret'&&r.api_key?.startsWith('sb_secret_'))?.api_key;
const publishable=keys.find(r=>r.type==='publishable'&&r.api_key?.startsWith('sb_publishable_'))?.api_key;
assert.ok(secret&&publishable,'Modern production API keys required');
const admin=createClient(origin,secret,options),anon=createClient(origin,publishable,options);
const ok=r=>{assert.ok(!r.error,r.error?.message);return r.data;};
const intent=path.join(dir,'upload-intent.json'),journal=path.join(dir,'verified.jsonl');
const assertBucket=b=>{assert.equal(b.id,bucket);assert.equal(b.public,false);assert.equal(Number(b.file_size_limit),MAX_FEATURE_BYTES);assert.deepEqual(b.allowed_mime_types,['application/octet-stream']);};
if(!fs.existsSync(intent)){
  // Recheck fresh absence; no adopting or altering an existing production bucket.
  const response=await fetch(`https://api.supabase.com/v1/projects/${target}/database/query`,{method:'POST',headers,body:JSON.stringify({query:`begin read only;select count(*) n from storage.buckets where id='${bucket}';rollback;`})});assert.ok(response.ok);assert.equal(Number((await response.json())[0].n),0);
  fs.writeFileSync(intent,JSON.stringify({at:new Date().toISOString(),target,bucket,planSha256:hash(planBytes),scriptSha256:hash(fs.readFileSync(new URL(import.meta.url)))}),{flag:'wx'});
  ok(await admin.storage.createBucket(bucket,{public:false,fileSizeLimit:MAX_FEATURE_BYTES,allowedMimeTypes:['application/octet-stream']}));
}else{
  const prior=JSON.parse(fs.readFileSync(intent));assert.equal(prior.target,target);assert.equal(prior.planSha256,hash(planBytes));
  const currentHash=hash(fs.readFileSync(new URL(import.meta.url)));
  if(prior.scriptSha256!==currentHash){
    const oldHash='1275bf7e242d09eb4fd0baf45a6e9785a082fb8fbf619798c025a99de1fbccc6';
    assert.equal(prior.scriptSha256,oldHash);
    assert.equal(hash(fs.readFileSync(path.join(dir,'uploader-v1-before-key-fix.mjs'))),oldHash);
    const v2Hash='7d35a7ec9cf6fbcd7d7233982744b8568b628ac061466ae2235fd913d8958993';
    assert.equal(hash(fs.readFileSync(path.join(dir,'uploader-v2-before-key-reveal.mjs'))),v2Hash);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'modern-key-recovery-v2.json'))).scriptSha256,v2Hash);
    const v3Hash='c4dff72cae611313b0b964ef7477c2a97a7f304e0f9eae238cf4a36289781383';
    assert.equal(hash(fs.readFileSync(path.join(dir,'uploader-v3-before-retry.mjs'))),v3Hash);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'modern-key-recovery-v3.json'))).scriptSha256,v3Hash);
    const recovery={target,bucket,planSha256:hash(planBytes),originalScriptSha256:oldHash,priorScriptSha256:v3Hash,scriptSha256:currentHash,reason:'Resume after transient 502 with bounded idempotent retries and sixteen independent hash-verified transfers'};
    const recoveryPath=path.join(dir,'upload-recovery-v4.json');
    if(fs.existsSync(recoveryPath))assert.deepEqual(JSON.parse(fs.readFileSync(recoveryPath)),recovery);
    else fs.writeFileSync(recoveryPath,JSON.stringify(recovery,null,2),{flag:'wx'});
  }
}
assertBucket(ok(await admin.storage.getBucket(bucket)));
const known=new Map();
if(fs.existsSync(journal))for(const line of fs.readFileSync(journal,'utf8').trim().split('\n').filter(Boolean)){const r=JSON.parse(line);assert.ok(!known.has(r.path));known.set(r.path,r);}
for(const r of known.values()){const expected=plan.objects.find(p=>p.path===r.path);assert.ok(expected);assert.equal(r.sha256,expected.sha256);assert.equal(r.bytes,expected.bytes);}
const allowed=['C:/gv_store_billing_20260919/.local/integration/vendor-scan-runtime-v28/regression2/features','C:/gv_store_billing_20260919/.local/integration/vendor-scan-runtime-v29/windows-generated/features'].map(p=>fs.realpathSync(p).toLowerCase()+path.sep);
let cursor=0,completed=known.size;
async function upload(row){
  const source=fs.realpathSync(row.source);assert.ok(allowed.some(p=>source.toLowerCase().startsWith(p)));assert.equal(row.path,`v29/${row.sha256}.gz`);
  const bytes=fs.readFileSync(source);assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);
  const result=await admin.storage.from(bucket).upload(row.path,bytes,{contentType:'application/octet-stream',upsert:false});
  if(result.error)assert.ok([400,409].includes(Number(result.error.statusCode))&&/already exists|Duplicate/i.test(result.error.message),'Private upload failed; retained journal allows a bounded resume');
  const blob=ok(await admin.storage.from(bucket).download(row.path));assert.equal(blob.size,row.bytes);assert.equal(hash(Buffer.from(await blob.arrayBuffer())),row.sha256);
  fs.appendFileSync(journal,JSON.stringify({path:row.path,sha256:row.sha256,bytes:row.bytes})+'\n');known.set(row.path,row);completed++;
  if(completed%500===0)console.log(JSON.stringify({verified:completed,total:plan.objects.length}));
}
if(!known.size)await upload(plan.objects[0]);
if(!fs.existsSync(path.join(dir,'anonymous-boundary.json'))){
  const positive=await anon.from('card_prints').select('id').eq('id','0003593d-5fc1-4f51-a5fa-4211e946c257').limit(1);assert.ok(!positive.error&&positive.data.length,'Anonymous catalog positive control must succeed');
  for(const result of [await anon.storage.from(bucket).download(plan.objects[0].path),await anon.storage.from(bucket).createSignedUrl(plan.objects[0].path,30)])assert.ok(result.error,'Anonymous private-cache access must be denied');
  const list=await anon.storage.from(bucket).list('v29',{limit:1});assert.ok(list.error||!list.data.length);
  const publicResponse=await fetch(`${origin}/storage/v1/object/public/${bucket}/${plan.objects[0].path}`,{redirect:'error',signal:AbortSignal.timeout(15000)});assert.ok([400,401,403,404].includes(publicResponse.status));await publicResponse.body?.cancel();
  fs.writeFileSync(path.join(dir,'anonymous-boundary.json'),JSON.stringify({at:new Date().toISOString(),publicControl:true,readDenied:true,signDenied:true,listHidden:true,publicUrlStatus:publicResponse.status}),{flag:'wx'});
}
assert.ok(fs.existsSync(path.join(dir,'anonymous-boundary.json')),'First-object boundary must be proved before bulk upload');
const pending=plan.objects.filter(row=>!known.has(row.path));
await Promise.all(Array.from({length:16},async()=>{while(cursor<pending.length){const row=pending[cursor++];await upload(row);}}));
assert.equal(known.size,plan.objects.length);assertBucket(ok(await admin.storage.getBucket(bucket)));
const report={at:new Date().toISOString(),target,bucket,objects:known.size,references:plan.references,bytes:plan.bytes,allHashesReadBack:true,private:true,planSha256:hash(planBytes),journalSha256:hash(fs.readFileSync(journal)),servingEnabled:false,catalogMutations:0,ownershipMutations:0,entitlementChanges:0,schemaChanges:0,paymentChanges:0};
fs.writeFileSync(path.join(auditDir,'feature-staging.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
