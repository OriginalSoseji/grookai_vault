// Dedicated maintenance entry point. Default writes disabled; no normal runtime or pricing dispatch.
// Writes require ENABLE_STAMPED_CHILD_IMAGE_INTAKE_V1=true, STAMPED_CHILD_IMAGE_INTAKE_MODE=EXPLICIT,
// GROOKAI_PREFLIGHT_ACK=1, clean qualified source and a separate exact four-attempt owner decision.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import{fileURLToPath}from'node:url';import{execFileSync}from'node:child_process';
import{gzipSync,gunzipSync}from'node:zlib';import{Client}from'pg';import dotenv from'dotenv';
import{createBackendClient}from'../supabase_backend_client.mjs';
import{printingManifestHash as hash}from'../catalog/printing_completeness_gate_v1.mjs';
import{PROJECT,VERSION,stampedChildImageManifestV1 as manifest,assertStampedChildImagePlanV1,assertStampedImageOriginalV1}from'./stamped_child_image_intake_v1.mjs';
import{stampedChildImageIntakeCodeBindingV1}from'./stamped_child_image_intake_code_binding_v1.mjs';
import{assertStampedIntakeAuthorityV1,assertStampedIntakeDatabaseV1,assertStampedIntakeProtectedStateV1,assertStampedIntakeWrittenRowsV1,readStampedIntakeRowsV1,executeStampedIntakeTransactionV1,stageStampedIntakeRawObjectsV1,verifyStampedIntakeRawObjectsV1}from'./stamped_child_image_intake_execution_v1.mjs';
import{createStampedChildImageStorageAdapterV1}from'./stamped_child_image_storage_adapter_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),artifactRoot='C:/grookai_vault_operator_artifacts',runRoot=artifactRoot+'/stamped_child_image_intake_runs_v1';
const read=file=>JSON.parse(file.endsWith('.gz')?gunzipSync(fs.readFileSync(file)):fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--help'){console.log('node backend/warehouse/run_stamped_child_image_intake_v1.mjs --config <private-file>; default writes disabled; readback is server-enforced read-only.');return;}
  assert.equal(args.length,2,'Only --config <private-file> is accepted');assert.equal(args[0],'--config');
  const configFile=path.resolve(args[1]),config=read(configFile);
  const allowed=new Set(['mode','outDir','plan','authority','runId','storageReceipt','rollbackReceipt','committedReceipt','codeFingerprint','databaseEnvFile','caFile','imageFiles','sourceQualification']);
  for(const key of Object.keys(config))assert.ok(allowed.has(key),'Unknown private-config field: '+key);
  assert.ok(['stage_raw','rollback','apply','replay','readback'].includes(config.mode));
  const writing=config.mode!=='readback';
  if(writing){assert.equal(process.env.ENABLE_STAMPED_CHILD_IMAGE_INTAKE_V1,'true','Source intake writes are disabled');assert.equal(process.env.STAMPED_CHILD_IMAGE_INTAKE_MODE,'EXPLICIT');assert.equal(process.env.GROOKAI_PREFLIGHT_ACK,'1','Use the unchanged mechanical preflight gate');assert.equal(process.platform,'win32','Production writes belong to the Windows operator entry point');}
  assert.equal(process.version,'v22.23.5');assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED,'0');assert.ok(!process.env.GV_USER_ACCESS_TOKEN,'Source intake must not use a user-token override');
  const plan=read(config.plan);assertStampedChildImagePlanV1(plan);assert.equal(plan.codeFingerprint,config.codeFingerprint);
  assert.equal(stampedChildImageIntakeCodeBindingV1().fingerprint,config.codeFingerprint,'Complete source changed');
  const authority=writing?read(config.authority):null,storageReceipt=config.storageReceipt?read(config.storageReceipt):null,rollbackReceipt=config.rollbackReceipt?read(config.rollbackReceipt):null,committedReceipt=config.committedReceipt?read(config.committedReceipt):null;
  let qualificationPins=[];
  const context={environment:'production',mode:config.mode,runId:config.runId,authority,codeFingerprint:config.codeFingerprint,storageReceipt,rollbackReceipt,committedReceipt};
  const out=path.resolve(config.outDir),relative=path.relative(artifactRoot,out);assert.ok(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));
  if(writing){
    assertStampedIntakeAuthorityV1({...context,plan,now:new Date().toISOString()});
    assert.equal(out,path.resolve(runRoot,config.runId.toLowerCase()),'A named attempt has one fixed output directory');
    const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
    assert.equal(git(['rev-parse','HEAD']),authority.sourceHead);assert.equal(git(['rev-parse','HEAD^{tree}']),authority.sourceTree);assert.equal(git(['status','--porcelain=v1']),'','Use clean, committed, qualified source');
    const qualification=read(config.sourceQualification);assert.equal(sha(fs.readFileSync(config.sourceQualification)),authority.sourceQualificationSha256);
    assert.equal(qualification.version,'STAMPED_CHILD_IMAGE_SOURCE_QUALIFICATION_V1');assert.equal(qualification.pass,true);assert.equal(qualification.sourceHead,authority.sourceHead);assert.equal(qualification.sourceTree,authority.sourceTree);assert.equal(qualification.codeFingerprint,config.codeFingerprint);
    for(const key of['normalCommitPassed','normalPushPassed','hostedPassed'])assert.equal(qualification[key],true,key);
    assert.ok(qualification.evidence.length>0);for(const pin of qualification.evidence)assert.equal(sha(fs.readFileSync(pin.file)),pin.sha256);qualificationPins=qualification.evidence;
    const decision=read(authority.approvalRecordRef);assert.equal(decision.approved,true);assert.equal(decision.productionIntakeApproved,true);assert.equal(decision.planFingerprint,plan.fingerprint);assert.equal(decision.codeFingerprint,config.codeFingerprint);
    assert.equal(hash(decision.scope),hash(plan.proposedEffects));assert.equal(hash(decision.runs),hash(plan.proposedRuns));
  }
  assert.equal(fs.existsSync(out),false,'Preserve the consumed attempt; do not retry');
  const owner=dotenv.parse(fs.readFileSync(config.databaseEnvFile));assert.equal(owner.SUPABASE_URL,`https://${PROJECT}.supabase.co`);
  assert.equal(fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8').match(/^project_id\s*=\s*"([^"]+)"/m)?.[1],PROJECT);
  const u=new URL(owner.SUPABASE_DB_URL);assert.equal(u.pathname,'/postgres');assert.equal(u.port||'5432','5432');assert.ok((u.hostname===`db.${PROJECT}.supabase.co`&&decodeURIComponent(u.username)==='postgres')||(u.hostname==='aws-1-us-east-2.pooler.supabase.com'&&decodeURIComponent(u.username)===`postgres.${PROJECT}`));
  const inputs=[configFile,config.plan,config.databaseEnvFile,config.caFile,...[config.authority,authority?.approvalRecordRef,config.sourceQualification,config.storageReceipt,config.rollbackReceipt,config.committedReceipt].filter(Boolean)].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
  inputs.push(...qualificationPins);
  const originals={};if(config.mode==='stage_raw'){
    assert.deepEqual(Object.keys(config.imageFiles).sort(),manifest.targets.map(t=>t.printingId).sort());
    for(const target of manifest.targets){const file=config.imageFiles[target.printingId],bytes=fs.readFileSync(file);assertStampedImageOriginalV1(target,bytes);originals[target.printingId]=bytes;inputs.push({file,sha256:sha(bytes)});}
  }
  const revalidate=async()=>{for(const pin of inputs)assert.equal(sha(fs.readFileSync(pin.file)),pin.sha256,'Frozen input changed');const fp=stampedChildImageIntakeCodeBindingV1().fingerprint;assert.equal(fp,config.codeFingerprint);return fp;};
  fs.mkdirSync(out,{recursive:true});const write=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  write('intent.json',{version:VERSION,mode:config.mode,runId:config.runId??null,projectRef:PROJECT,codeFingerprint:config.codeFingerprint,planFingerprint:plan.fingerprint,writing,automaticRetry:false,startedAt:new Date().toISOString(),inputPins:inputs});
  const make=readOnly=>new Client({host:u.hostname,port:5432,database:'postgres',user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),ssl:{rejectUnauthorized:true,ca:fs.readFileSync(config.caFile,'utf8')},options:readOnly?'-c default_transaction_read_only=on':'',application_name:'stamped_child_image_intake_v1',connectionTimeoutMillis:15000,statement_timeout:45000,query_timeout:50000});
  let client,audit;const report={version:VERSION,mode:config.mode,runId:config.runId??null,pass:false,projectRef:PROJECT,codeFingerprint:config.codeFingerprint,planFingerprint:plan.fingerprint,automaticRetry:false};
  try{
    client=make(!writing);await client.connect();assertStampedIntakeDatabaseV1(client,'production');
    report.sanity=(await client.query('select(select count(*)::int from public.card_prints)cards,(select count(*)::int from public.sets)sets,(select count(*)::int from public.card_print_traits)traits')).rows[0];assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000,'Environment mismatch — fix before proceeding.');
    const storage=()=>{assert.ok(owner.SUPABASE_SECRET_KEY,'The canonical backend service secret is required');process.env.SUPABASE_URL=owner.SUPABASE_URL;process.env.SUPABASE_SECRET_KEY=owner.SUPABASE_SECRET_KEY;return createStampedChildImageStorageAdapterV1(createBackendClient(),{plan,context,revalidate});};
    let receipt;
    if(!writing){
      await client.query('begin isolation level repeatable read read only');assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only,'on');await assertStampedIntakeProtectedStateV1(client,plan);const rows=await readStampedIntakeRowsV1(client,plan);
      const count=Object.values(rows).reduce((sum,values)=>sum+values.length,0);if(count){assertStampedIntakeWrittenRowsV1(rows,plan);if(committedReceipt)assert.equal(hash(rows),hash(committedReceipt.writeRows));await verifyStampedIntakeRawObjectsV1({plan,storage:storage()});}
      await client.query('rollback');receipt={...report,pass:true,currentState:count?'exact':'before',observedIntakeRows:count,productionWrites:0,storageWrites:0,serverEnforcedReadOnly:true};
    }else{
      audit=make(false);await audit.connect();assertStampedIntakeDatabaseV1(audit,'production');
      const adapter=storage();
      if(config.mode==='stage_raw')receipt=await stageStampedIntakeRawObjectsV1({plan,context,storage:adapter,guardClient:client,auditClient:audit,revalidate,originals});
      else receipt=await executeStampedIntakeTransactionV1({client,auditClient:audit,plan,context,revalidate,verifyStoredObjects:()=>verifyStampedIntakeRawObjectsV1({plan,storage:adapter})});
    }
    await revalidate();const bytes=gzipSync(Buffer.from(JSON.stringify(receipt)));fs.writeFileSync(out+'/receipt.private.json.gz',bytes,{flag:'wx'});
    Object.assign(report,{pass:true,receiptFile:out+'/receipt.private.json.gz',receiptSha256:sha(bytes),inserts:receipt.inserts??0,rawObjectsUploaded:config.mode==='stage_raw'?receipt.objects:0,currentState:receipt.currentState??null,committed:receipt.committed??false,rollbackProven:receipt.rollbackProven??false,canonicalImageWrites:0,founderApprovalWrites:0});
  }catch(error){
    Object.assign(report,{error:{code:error.code,message:String(error.message).slice(0,1200)},commitUncertain:error.commitUncertain??false,rollbackUncertain:error.rollbackUncertain??false,confirmedRawObjects:error.confirmedRawObjects??null,rawStorageOutcomeRequiresDiagnosis:error.rawStorageOutcomeRequiresDiagnosis??false,audit:error.audit??null,auditPersistenceFailure:error.auditPersistenceFailure??null,furtherMutationAllowed:false});process.exitCode=1;
  }finally{await Promise.allSettled([client?.end(),audit?.end()]);report.finishedAt=new Date().toISOString();write('result.json',report);console.log(JSON.stringify(report));}
}
main().catch(error=>{process.exitCode=1;console.error(String(error.message).slice(0,1200));});
