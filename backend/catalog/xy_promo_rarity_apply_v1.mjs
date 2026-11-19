import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {createRequire} from 'node:module';import {fileURLToPath,pathToFileURL} from 'node:url';import {isDeepStrictEqual} from 'node:util';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {captureXyPromoSourceProof} from './xy_promo_source_proof_v1.mjs';
import {captureXyPromoProtectedState} from './xy_promo_protected_state_v1.mjs';
import {validateXyPromoPlan,classifyXyPromoState,XY_PROMO_PLAN_FINGERPRINT,sha256} from './xy_promo_rarity_apply_policy_v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),dir=path.join(root,'docs/audits/xy_promo_rarity_review_20261118');
const require=createRequire(import.meta.url),{Client}=require('pg'),dotenv=require('dotenv'),{createClient}=require('@supabase/supabase-js');
const EXEC='catalog_xy_promo_rarity_apply_v1',SOURCE='grookai_catalog_xy_promo_rarity_v1',PROJECT='ycdxbpibncqcchqiihfz';
const json=x=>JSON.stringify(x),hash=x=>sha256(json(x));
const writerFiles=['backend/catalog/xy_promo_rarity_apply_v1.mjs','backend/catalog/xy_promo_rarity_apply_policy_v1.mjs',
 'backend/catalog/xy_promo_source_proof_v1.mjs','backend/catalog/xy_promo_protected_state_v1.mjs',
 'backend/pokemon/xy_promo_rarity_candidate_v1.mjs','backend/pokemon/xy_promo_family_review_v1.mjs',
 'backend/pokemon/xy_promo_visual_policy_v1.mjs','backend/pokemon/tcgplayer_catalog_rarity_v1.mjs',
 'backend/lib/contracts/contract_scope_v1.mjs','backend/lib/contracts/execute_canon_write_v1.mjs','backend/lib/contracts/run_post_write_proofs_v1.mjs'];
export function xyWriterFingerprint(){return hash(writerFiles.map(f=>[f,sha256(fs.readFileSync(path.join(root,f)))]));}
function readPackage(){
 const read=f=>fs.readFileSync(path.join(dir,f)),plan=JSON.parse(read('xy-rarity-execution-plan.json'));
 const evidence={snapshotBytes:read('xy-pair-postsync-readback.json'),preflightBytes:read('xy-review-preflight.json'),
  candidateBytes:read('xy-rarity-review-candidates.json'),visualBytes:read('xy-exact-image-review.json'),articles:{},images:{}};
 for(const [n,s] of [['XY177','karen'],['XY198','camerupt']]){
  evidence.articles[n]={receipt:JSON.parse(read(`checklists/${s}-receipt.json`)),bytes:read(`checklists/${s}.html`)};
  evidence.images[n]={productReceipt:JSON.parse(read(`product_images/${n}-receipt.json`)),productBytes:read(`product_images/${n}.jpg`),
   catalogReceipt:JSON.parse(read(`catalog_images/${n}-receipt.json`)),catalogBytes:read(`catalog_images/${n}.webp`)};
 }
 return {plan,evidence,...validateXyPromoPlan(plan,evidence)};
}
async function parents(db,ids,lock=false){return (await db.query(`select to_jsonb(p) row from public.card_prints p where p.id=any($1::uuid[]) order by gv_id ${lock?'for update':''}`,[ids])).rows.map(x=>x.row);}
async function receipts(db){return (await db.query(`select id::text,payload from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2
 and payload->>'_kind'='xy_promo_rarity_receipt' order by id`,[SOURCE,XY_PROMO_PLAN_FINGERPRINT])).rows;}
function stagePayloads(source,evidence){
 const out=[...source.products.map(x=>({key:'product:'+x.row.product_id,object:x})),...source.groups.map(x=>({key:'group:'+x.row.group_id,object:x}))];
 for(const n of ['XY177','XY198']){
  const a=evidence.articles[n],i=evidence.images[n];
  out.push({key:'checklist:'+n,object:{receipt:a.receipt,body_base64:a.bytes.toString('base64')}});
  out.push({key:'product-image:'+n,object:{receipt:i.productReceipt,body_base64:i.productBytes.toString('base64')}});
  out.push({key:'catalog-image:'+n,object:{receipt:i.catalogReceipt,body_base64:i.catalogBytes.toString('base64')}});
 }
 return out;
}
export async function verifyXyStagedSnapshots(db,receipt,expected){
 const refs=receipt.payload.source_receipts;
 if(!Array.isArray(refs)||refs.length!==9||new Set(refs.map(r=>r.id)).size!==9||new Set(refs.map(r=>r.key)).size!==9)throw Error('XY_PROMO_SNAPSHOT_RECEIPT_MISMATCH');
 const rows=(await db.query('select id::text,payload from public.raw_imports where source=$1 and id=any($2::bigint[]) order by id',[SOURCE,refs.map(r=>r.id)])).rows;
 const expectedByKey=new Map(expected.map(x=>[x.key,x.object]));if(rows.length!==9||expectedByKey.size!==9)throw Error('XY_PROMO_SNAPSHOTS_MISSING');
 for(const row of rows){const key=row.payload.key,ref=refs.find(r=>r.id===row.id);
  if(!ref||ref.key!==key||row.payload._kind!=='xy_promo_source_snapshot'||row.payload.package_fingerprint!==XY_PROMO_PLAN_FINGERPRINT||
   row.payload.run_id!==receipt.payload.run_id||!expectedByKey.has(key)||!isDeepStrictEqual(row.payload.snapshot,expectedByKey.get(key)))throw Error('XY_PROMO_SNAPSHOT_DRIFT');}
}
async function verifyLiveImages(config,snapshot,evidence){
 const key=config.SUPABASE_SECRET_KEY??config.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error('XY_PROMO_STORAGE_CREDENTIAL_REQUIRED');
 const storage=createClient(config.SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
 for(const p of snapshot.parents){
  const expected=evidence.images[p.number],{data,error}=await storage.from('user-card-images').download(p.image_path);
  if(error||!data||sha256(Buffer.from(await data.arrayBuffer()))!==expected.catalogReceipt.sha256)throw Error('XY_PROMO_CATALOG_IMAGE_DRIFT');
  const response=await fetch(expected.productReceipt.url,{headers:{'user-agent':'GrookaiCatalogReview/1.0'},signal:AbortSignal.timeout(15000)});
  if(!response.ok||response.url!==expected.productReceipt.final_url||sha256(Buffer.from(await response.arrayBuffer()))!==expected.productReceipt.sha256)
   throw Error('XY_PROMO_PRODUCT_IMAGE_DRIFT');
 }
}
export async function runXyPromoRarity({mode='inspect',approval=null}={}){
 if(!['inspect','rollback-proof','apply','verify'].includes(mode))throw Error('INVALID_MODE');
 const mutating=['rollback-proof','apply'].includes(mode);if(mutating&&approval!=='PROCEED')throw Error('PROCEED_REQUIRED');
 const pkg=readPackage(),{plan,evidence,snapshot}=pkg,ids=snapshot.parents.map(p=>p.id),config=dotenv.parse(fs.readFileSync(path.join(root,'.env.local'))),u=new URL(config.SUPABASE_DB_URL);
 if(new URL(config.SUPABASE_URL).hostname!==PROJECT+'.supabase.co'||!fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8').includes(PROJECT)||!`${u.hostname} ${decodeURIComponent(u.username)}`.includes(PROJECT))throw Error('ENVIRONMENT_MISMATCH');
 console.log(`REMOTE ${mutating?'GUARDED '+mode.toUpperCase():'READ ONLY'}: ${config.SUPABASE_URL}`);
 const settings={connectionString:config.SUPABASE_DB_URL,connectionTimeoutMillis:10000,application_name:EXEC},db=new Client(settings),ledger=new Client(settings);
 const runId=crypto.randomUUID(),writer=xyWriterFingerprint(),report={version:'XY_PROMO_RARITY_APPLY_V1',run_id:runId,mode,
  package_fingerprint:XY_PROMO_PLAN_FINGERPRINT,writer_fingerprint:writer,started_at:new Date().toISOString(),status:'started',stages:[]};
 const reportPath=path.join(dir,`xy-run-${runId}.json`),save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 const stage=name=>{report.stages.push({name,at:new Date().toISOString()});save();};let tx=false,logged=false,commitStarted=false,committed=false;
 try{
  await db.connect();await ledger.connect();
  if(mutating){await ledger.query(`insert into admin.import_runs(id,kind,scope,status,started_at) values($1,$2,$3::jsonb,'running',$4)`,[runId,EXEC,json({package_fingerprint:XY_PROMO_PLAN_FINGERPRINT,mode,writer_fingerprint:writer}),report.started_at]);logged=true;}
  await db.query(`begin isolation level serializable ${mutating?'read write':'read only'}`);tx=true;
  await db.query("set local statement_timeout='60s'");await db.query("set local lock_timeout='5s'");
  if(mutating)await db.query('select pg_advisory_xact_lock(hashtext($1))',[EXEC]);
  report.sanity=(await db.query(`select (select count(*)::int from public.card_prints) parents,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`)).rows[0];
  if(report.sanity.parents<40000||report.sanity.sets<150||report.sanity.traits<5000)throw Error('ENVIRONMENT_COUNT_GATE');
  const triggers=(await db.query(`select tgrelid::regclass::text relation,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid in('public.card_prints'::regclass,'public.raw_imports'::regclass) and not tgisinternal order by tgrelid,tgname`)).rows;
  if(triggers.length!==1||triggers[0].relation!=='card_prints'||!triggers[0].definition.includes('UPDATE OF set_id, set_identity_model'))throw Error('XY_PROMO_TRIGGER_DRIFT');
  const before=await parents(db,ids,mutating),existing=await receipts(db);if(existing.length>1)throw Error('XY_PROMO_DUPLICATE_RECEIPT');
  report.state=classifyXyPromoState(snapshot,before,existing.length===1);
  const source=await captureXyPromoSourceProof(db,snapshot,evidence.articles,{lock:mutating}),sourceDigest=hash(source),staged=stagePayloads(source,evidence);
  await verifyLiveImages(config,snapshot,evidence);stage('frozen_sources_and_images_verified');
  if(report.state==='already_applied'||mode==='verify'){
   if(report.state!=='already_applied'||!isDeepStrictEqual(existing[0].payload.changes,plan.rows))throw Error('XY_PROMO_RECEIPT_MISMATCH');
   await verifyXyStagedSnapshots(db,existing[0],staged);report.status='verified_already_applied';report.receipt_id=existing[0].id;
   await db.query('rollback');tx=false;
  }else if(mode==='inspect'){report.status='preflight_passed';await db.query('rollback');tx=false;}
  else{
   if(mode==='apply'){
    const proof=JSON.parse(fs.readFileSync(path.join(dir,`xy-rollback-proof-${XY_PROMO_PLAN_FINGERPRINT}-${writer}.json`)));
    if(proof.status!=='rollback_proof_passed'||proof.package_fingerprint!==XY_PROMO_PLAN_FINGERPRINT||proof.writer_fingerprint!==writer)throw Error('XY_PROMO_ROLLBACK_PROOF_STALE');
   }
   const preimage=hash(before);report.protected_before=await captureXyPromoProtectedState(db,ids);
   await assertExecuteCanonWriteV1({execution_name:EXEC,write_target:db,audit_target:db,ledger_target:ledger,transaction_control:'external',
    payload_snapshot:{package_fingerprint:XY_PROMO_PLAN_FINGERPRINT,mode},actor_type:'system_worker',source_worker:EXEC,source_system:'catalog_metadata',
    contract_assertions:[{ok:report.state==='pending',contract_name:'NO_ASSUMPTION_RULE',reason:'Two exact card-specific image and source-reviewed rarity corrections'}],
    write:async()=>{
     const refs=(await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes)
      select $1,jsonb_build_object('_kind','xy_promo_source_snapshot','package_fingerprint',$2::text,'run_id',$3::text,'key',x.key,'snapshot',x.object),
       'normalized',now(),'Preserved source product/group JSONB and exact image/checklist bytes; card-specific review only'
      from jsonb_to_recordset($4::jsonb) x(key text,object jsonb) returning id::text,payload->>'key' key`,[SOURCE,XY_PROMO_PLAN_FINGERPRINT,runId,json(staged)])).rows;
     if(refs.length!==9)throw Error('XY_PROMO_RAW_STAGE_COUNT');
     const changed=await db.query(`update public.card_prints set rarity='Promo' where id=any($1::uuid[]) and rarity='Common' returning id`,[ids]);
     if(changed.rowCount!==2)throw Error('XY_PROMO_WRITE_COUNT');classifyXyPromoState(snapshot,await parents(db,ids),true);
     const payload={_kind:'xy_promo_rarity_receipt',package_fingerprint:XY_PROMO_PLAN_FINGERPRINT,writer_fingerprint:writer,run_id:runId,
      changes:plan.rows,source_receipts:refs,preimage_hash:preimage,source_digest:sourceDigest};
     report.receipt_id=(await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes) values($1,$2::jsonb,'normalized',now(),$3) returning id::text`,
      [SOURCE,json(payload),'Two source-reviewed XY parent rarity corrections; conflicting source traits preserved'])).rows[0].id;
    },proofs:[{name:'xy_promo_protected_state',contract_name:'IDENTITY_CONTRACT_SUITE_V1',run:async()=>{
     const after=await captureXyPromoProtectedState(db,ids),sourceAfter=await captureXyPromoSourceProof(db,snapshot,evidence.articles);
     await verifyLiveImages(config,snapshot,evidence);
     return {ok:isDeepStrictEqual(report.protected_before,after)&&hash(sourceAfter)===sourceDigest,reason:'Only two exact parent rarity fields may change'};
    }}]});
   stage('write_and_proofs_passed');
   if(mode==='rollback-proof'){
    await db.query('rollback');tx=false;await db.query('begin isolation level serializable read only');tx=true;
    const restored=await parents(db,ids);if(hash(restored)!==preimage||classifyXyPromoState(snapshot,restored,false)!=='pending'||(await receipts(db)).length)throw Error('XY_PROMO_ROLLBACK_FAILED');
    if((await db.query(`select id from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2`,[SOURCE,XY_PROMO_PLAN_FINGERPRINT])).rowCount)throw Error('XY_PROMO_RAW_ROLLBACK_FAILED');
    if(!isDeepStrictEqual(await captureXyPromoProtectedState(db,ids),report.protected_before)||hash(await captureXyPromoSourceProof(db,snapshot,evidence.articles))!==sourceDigest)throw Error('XY_PROMO_PROTECTED_ROLLBACK_FAILED');
    await db.query('rollback');tx=false;report.status='rollback_proof_passed';
   }else{
    commitStarted=true;await db.query('commit');tx=false;committed=true;await db.query('begin isolation level serializable read only');tx=true;
    const durable=await receipts(db),after=await parents(db,ids);classifyXyPromoState(snapshot,after,true);
    if(durable.length!==1||durable[0].id!==report.receipt_id||!isDeepStrictEqual(durable[0].payload.changes,plan.rows))throw Error('XY_PROMO_DURABLE_RECEIPT_FAILED');
    await verifyXyStagedSnapshots(db,durable[0],staged);await db.query('rollback');tx=false;report.status='applied_and_verified';
   }
  }
  report.finished_at=new Date().toISOString();if(logged)await ledger.query(`update admin.import_runs set status='success',finished_at=now(),scope=$2::jsonb where id=$1`,[runId,json({package_fingerprint:XY_PROMO_PLAN_FINGERPRINT,mode,writer_fingerprint:writer,status:report.status})]);
  stage(report.status);if(report.status==='rollback_proof_passed')fs.writeFileSync(path.join(dir,`xy-rollback-proof-${XY_PROMO_PLAN_FINGERPRINT}-${writer}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
 }catch(error){
  if(tx)await db.query('rollback').catch(()=>{});report.status=committed?'committed_readback_failed':commitStarted?'commit_outcome_unknown_requires_readback':'failed_rolled_back';
  report.error={code:error.code??'XY_PROMO_FAILED',message:String(error.message??error).replace(config.SUPABASE_DB_URL,'[redacted]')};report.finished_at=new Date().toISOString();
  if(logged)await ledger.query(`update admin.import_runs set status='error',finished_at=now(),error=$2,scope=$3::jsonb where id=$1`,[runId,report.error.message,json({package_fingerprint:XY_PROMO_PLAN_FINGERPRINT,mode,status:report.status})]).catch(()=>{});
  save();throw Error(report.status+': '+report.error.message);
 }finally{await db.end().catch(()=>{});await ledger.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),v=k=>args[args.indexOf(k)+1];
 runXyPromoRarity({mode:args.includes('--mode')?v('--mode'):'inspect',approval:args.includes('--approval')?v('--approval'):null})
  .then(r=>console.log(json({status:r.status,run_id:r.run_id,receipt_id:r.receipt_id??null}))).catch(e=>{console.error(e.message);process.exitCode=1;});}
