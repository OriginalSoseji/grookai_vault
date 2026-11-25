// Dedicated operator entry point. Preparation/readback are server READ ONLY.
// Default writes disabled; a new exact source/plan/three-attempt decision is required.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';import pg from 'pg';import dotenv from 'dotenv';
import {createBackendClient} from '../supabase_backend_client.mjs';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {PROJECT,BUCKET,stampedChildImageManifestV1 as manifest,stampedChildImageIntakeKeysV1} from './stamped_child_image_intake_v1.mjs';
import {VERSION,stampedChildClassificationCodeBindingV1,assertStampedClassificationPlanV1,assertStampedClassificationAuthorityV1,assertStampedClassificationDatabaseV1,prepareStampedClassificationV1,readStampedClassificationStateV1,assertStampedClassificationCommittedStateV1,executeStampedClassificationV1,reserveStampedClassificationDirectoryV1} from './stamped_child_classification_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),artifactRoot='C:/grookai_vault_operator_artifacts',runRoot=artifactRoot+'/stamped_child_classification_runs_v1';
const read=f=>JSON.parse(f.endsWith('.gz')?gunzipSync(fs.readFileSync(f)):fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex');
const safe=s=>String(s).replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,'[id]').slice(0,1200);
async function main(){
 const args=process.argv.slice(2);if(args.length===1&&args[0]==='--help'){console.log('node backend/warehouse/run_stamped_child_classification_v1.mjs --config <private-file>; prepare/readback only without separate exact production approval.');return;}
 assert.equal(args.length,2);assert.equal(args[0],'--config');const configFile=path.resolve(args[1]),config=read(configFile);
 const allowed=new Set(['mode','outDir','plan','authority','runId','rollbackReceipt','committedReceipt','intakePlan','intakeCommittedReceipt','codeFingerprint','databaseEnvFile','caFile','sourceQualification']);
 for(const key of Object.keys(config))assert.ok(allowed.has(key),'Unknown private-config key');
 assert.ok(['prepare','readback','rollback','apply','replay'].includes(config.mode));const writing=!['prepare','readback'].includes(config.mode);
 if(writing){assert.equal(process.env.ENABLE_STAMPED_CHILD_CLASSIFICATION_V1,'true','Classification writes are disabled');assert.equal(process.env.STAMPED_CHILD_CLASSIFICATION_MODE,'EXPLICIT');assert.equal(process.env.GROOKAI_PREFLIGHT_ACK,'1','Use the unchanged mechanical preflight gate');assert.equal(process.platform,'win32');}
 assert.equal(process.version,'v22.23.5');assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED,'0');assert.ok(!process.env.GV_USER_ACCESS_TOKEN);
 const code=stampedChildClassificationCodeBindingV1();assert.equal(code.fingerprint,config.codeFingerprint,'Complete classification producer changed');
 const plan=config.plan?read(config.plan):null,authority=config.authority?read(config.authority):null,rollbackReceipt=config.rollbackReceipt?read(config.rollbackReceipt):null,committedReceipt=config.committedReceipt?read(config.committedReceipt):null;
 if(plan){assertStampedClassificationPlanV1(plan);assert.equal(plan.codeFingerprint,code.fingerprint);}
 const context={environment:'production',mode:config.mode,runId:config.runId,authority,codeFingerprint:code.fingerprint,rollbackReceipt,committedReceipt};
 const out=path.resolve(config.outDir),relative=path.relative(path.resolve(artifactRoot),out);assert.ok(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));
 const inputs=[configFile,config.databaseEnvFile,config.caFile,...[config.plan,config.authority,config.rollbackReceipt,config.committedReceipt,config.intakePlan,config.intakeCommittedReceipt].filter(Boolean)].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
 if(writing){
  assertStampedClassificationAuthorityV1({...context,plan,now:new Date().toISOString()});assert.equal(out,path.resolve(runRoot,config.runId.toLowerCase()),'A named attempt has one fixed output directory');
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  assert.equal(git(['rev-parse','HEAD']),authority.sourceHead);assert.equal(git(['rev-parse','HEAD^{tree}']),authority.sourceTree);assert.equal(git(['status','--porcelain=v1']),'','Use clean, committed qualified source');
  const q=read(config.sourceQualification);assert.equal(sha(fs.readFileSync(config.sourceQualification)),authority.sourceQualificationSha256);assert.equal(q.version,'STAMPED_CHILD_CLASSIFICATION_SOURCE_QUALIFICATION_V1');assert.equal(q.pass,true);
  assert.equal(q.sourceHead,authority.sourceHead);assert.equal(q.sourceTree,authority.sourceTree);assert.equal(q.codeFingerprint,code.fingerprint);for(const key of ['normalCommitPassed','normalPushPassed','hostedPassed','localControllerPassed'])assert.equal(q[key],true,key);
  assert.ok(q.evidence.length>0);inputs.push({file:config.sourceQualification,sha256:authority.sourceQualificationSha256},...q.evidence);
  const decision=read(authority.approvalRecordRef);assert.equal(decision.approved,true);assert.equal(decision.productionClassificationApproved,true);assert.equal(decision.planFingerprint,plan.fingerprint);assert.equal(decision.codeFingerprint,code.fingerprint);assert.equal(hash(decision.scope),hash(plan.proposedEffects));assert.equal(hash(decision.runs),hash(plan.proposedRuns));inputs.push({file:authority.approvalRecordRef,sha256:sha(fs.readFileSync(authority.approvalRecordRef))});
 }
 const owner=dotenv.parse(fs.readFileSync(config.databaseEnvFile));assert.equal(owner.SUPABASE_URL,`https://${PROJECT}.supabase.co`);assert.equal(fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8').match(/^project_id\s*=\s*"([^"]+)"/m)?.[1],PROJECT);
 const u=new URL(owner.SUPABASE_DB_URL);assert.equal(u.pathname,'/postgres');assert.equal(u.port||'5432','5432');assert.ok((u.hostname===`db.${PROJECT}.supabase.co`&&decodeURIComponent(u.username)==='postgres')||(u.hostname==='aws-1-us-east-2.pooler.supabase.com'&&decodeURIComponent(u.username)===`postgres.${PROJECT}`));
 const revalidate=async()=>{for(const pin of inputs)assert.equal(sha(fs.readFileSync(pin.file)),pin.sha256,'Frozen input changed');const fp=stampedChildClassificationCodeBindingV1().fingerprint;assert.equal(fp,code.fingerprint);return fp;};
 await revalidate();assert.equal(fs.existsSync(out),false,'Preserve consumed attempts; no automatic retry');
 const write=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 reserveStampedClassificationDirectoryV1(out,{version:VERSION,mode:config.mode,runId:config.runId??null,projectRef:PROJECT,codeFingerprint:code.fingerprint,planFingerprint:plan?.fingerprint??null,writing,automaticRetry:false,startedAt:new Date().toISOString(),inputPins:inputs});
 const make=readOnly=>new pg.Client({host:u.hostname,port:5432,database:'postgres',user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),ssl:{rejectUnauthorized:true,ca:fs.readFileSync(config.caFile,'utf8')},options:readOnly?'-c default_transaction_read_only=on -c lock_timeout=3000':'',application_name:'stamped_child_classification_v1',connectionTimeoutMillis:15000,statement_timeout:45000,query_timeout:50000});
 let client,audit,receipt;const report={version:VERSION,mode:config.mode,runId:config.runId??null,pass:false,projectRef:PROJECT,codeFingerprint:code.fingerprint,automaticRetry:false,canonicalImageWrites:0,founderApprovalWrites:0,storageWrites:0};
 try{
  client=make(!writing||config.mode==='replay');await client.connect();assertStampedClassificationDatabaseV1(client,'production');
  report.sanity=(await client.query('select(select count(*)::int from public.card_prints)cards,(select count(*)::int from public.sets)sets,(select count(*)::int from public.card_print_traits)traits')).rows[0];assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000,'Environment mismatch — fix before proceeding.');
  if(!writing)assert.equal((await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
  assert.ok(owner.SUPABASE_SECRET_KEY);process.env.SUPABASE_URL=owner.SUPABASE_URL;process.env.SUPABASE_SECRET_KEY=owner.SUPABASE_SECRET_KEY;const sdk=createBackendClient();
  const verifyRawObjects=async()=>{
   await revalidate();for(const t of manifest.targets){const response=await sdk.storage.from(BUCKET).download(stampedChildImageIntakeKeysV1(t).storagePath);assert.ifError(response.error);const bytes=Buffer.from(await response.data.arrayBuffer());assert.equal(bytes.length,t.bytes);assert.equal(sha(bytes),t.originalSha256);}
   return {pass:true,objects:33,storageWrites:0};
  };
  const verifyPublic=async()=>{
   // Use the publishable client for the actual public function, without a user token.
   const {createClient}=await import('@supabase/supabase-js');const anon=createClient(owner.SUPABASE_URL,owner.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   const r=await anon.rpc('get_public_card_printing_options_v1',{p_card_print_ids:manifest.targets.map(x=>x.parentId),p_limit:128,p_offset:0});assert.ifError(r.error);assert.ok(r.data.length<128);
   for(const t of manifest.targets){const row=r.data.find(x=>x.id===t.printingId);assert.ok(row);assert.equal(row.card_print_id,t.parentId);assert.equal(row.printing_gv_id,t.printingGvId);assert.equal(row.finish_key,t.finishKey);assert.equal(row.finish_is_active,true);}return {pass:true,publicOptions:r.data.length};
  };
  await verifyRawObjects();report.publicBefore=await verifyPublic();
  if(config.mode==='prepare'){
   const intakePlan=read(config.intakePlan),intakeReceipt=read(config.intakeCommittedReceipt),prepared=await prepareStampedClassificationV1({client,actor:intakePlan.actor,proposedRuns:['rollback','apply','replay'].map(mode=>({mode,runId:randomUUID()})),codeFingerprint:code.fingerprint,environment:'production',intakePlan,intakeReceipt});
   const bytes=gzipSync(Buffer.from(JSON.stringify(prepared)));fs.writeFileSync(out+'/plan.private.json.gz',bytes,{flag:'wx'});report.planFile=out+'/plan.private.json.gz';report.planSha256=sha(bytes);report.planFingerprint=prepared.fingerprint;report.productionWrites=0;
  }else if(config.mode==='readback'){
   await client.query('begin isolation level repeatable read read only');const state=await readStampedClassificationStateV1(client,plan.actor);
   if(committedReceipt){assert.equal(committedReceipt.committed,true);assertStampedClassificationCommittedStateV1(plan,state);assert.equal(hash(state),hash(committedReceipt.state));}else assert.equal(hash(state),hash(plan.before));
   await client.query('rollback');receipt={pass:true,version:VERSION,mode:'readback',state,productionWrites:0,storageWrites:0};report.productionWrites=0;
  }else{
   audit=make(false);await audit.connect();receipt=await executeStampedClassificationV1({client,auditClient:audit,plan,context,revalidate,verifyRawObjects});
  }
  // Preserve an acknowledged database outcome before separate release readers.
  if(receipt){report.updates=receipt.updates??0;report.inserts=receipt.inserts??0;report.committed=receipt.committed??false;report.rollbackProven=receipt.rollbackProven??false;const bytes=gzipSync(Buffer.from(JSON.stringify(receipt)));fs.writeFileSync(out+'/receipt.private.json.gz',bytes,{flag:'wx'});report.receiptFile=out+'/receipt.private.json.gz';report.receiptSha256=sha(bytes);}
  report.publicAfter=await verifyPublic();await revalidate();
  report.pass=true;
 }catch(error){report.error={code:error.code,message:safe(error.message)};report.committed=receipt?.committed??false;report.commitUncertain=error.commitUncertain??false;report.rollbackUncertain=error.rollbackUncertain??false;report.violationId=error.violationId??null;report.auditPersistenceFailure=error.auditPersistenceFailure??null;report.furtherMutationAllowed=false;process.exitCode=1;}
 finally{await Promise.allSettled([client?.end(),audit?.end()]);report.finishedAt=new Date().toISOString();write('result.json',report);console.log(JSON.stringify(report));}
}
main().catch(error=>{process.exitCode=1;console.error(safe(error.message));});
