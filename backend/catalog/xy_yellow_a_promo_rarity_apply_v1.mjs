import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {createRequire} from 'node:module';import {fileURLToPath,pathToFileURL} from 'node:url';import {isDeepStrictEqual} from 'node:util';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {captureXyPromoProtectedState} from './xy_promo_protected_state_v1.mjs';
import {captureYellowASourceProof} from './xy_yellow_a_promo_source_proof_v1.mjs';
import {evaluateXySuffixCandidate} from '../../docs/audits/xy_yellow_a_promo_review_20261119/xy_suffix_rarity_candidate_20261119.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),dir=path.join(root,'docs/audits/xy_yellow_a_promo_review_20261119');
const require=createRequire(import.meta.url),{Client}=require('pg'),dotenv=require('dotenv'),{createClient}=require('@supabase/supabase-js');
const EXEC='catalog_xy_yellow_a_promo_rarity_apply_v1',SOURCE='grookai_catalog_xy_yellow_a_promo_rarity_v1',PROJECT='ycdxbpibncqcchqiihfz';
const PLAN='6d6277151ca1384f6bcd3bb9d607f8a348e85b892aaa752dfeb74a56f5aa19e5';
const IDS=['2928d70e-b3ff-4c8e-914f-a361cff27396','46b9dcd9-3f90-4770-890e-6817eed4d388'],NUMBERS=['XY200a','XY67a'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),json=x=>JSON.stringify(x);
const files=['backend/catalog/xy_yellow_a_promo_rarity_apply_v1.mjs','backend/catalog/xy_yellow_a_promo_source_proof_v1.mjs',
 'backend/catalog/xy_promo_protected_state_v1.mjs','backend/pokemon/tcgplayer_catalog_rarity_v1.mjs',
 'docs/audits/xy_yellow_a_promo_review_20261119/xy_suffix_rarity_candidate_20261119.mjs',
 'backend/lib/contracts/contract_scope_v1.mjs','backend/lib/contracts/execute_canon_write_v1.mjs','backend/lib/contracts/run_post_write_proofs_v1.mjs'];
export function yellowAWriterFingerprint(){return hash(json(files.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))])));}
function packageData(){
 const read=f=>fs.readFileSync(path.join(dir,f)),plan=JSON.parse(read('xy-suffix-rarity-execution-plan-20261119.json')),{fingerprint_sha256,...body}=plan;
 const snapshotBytes=read('xy-suffix-rarity-frozen-20261119.json'),snapshot=JSON.parse(snapshotBytes),prior=JSON.parse(read('xy-suffix-rarity-review-packet-20261119.json'));
 const {fingerprint_sha256:priorFingerprint,...priorBody}=prior,evidence={};
 if(fingerprint_sha256!==PLAN||hash(json(body))!==PLAN||plan.status!=='FROZEN_GUARDED_PACKAGE'||plan.target!==PROJECT||
  !isDeepStrictEqual(plan.scope,{table:'card_prints',field:'rarity',count:2})||plan.snapshot_sha256!==hash(snapshotBytes)||
  prior.status!=='REVIEW_ONLY_NO_WRITER'||priorFingerprint!==hash(json(priorBody))||plan.review_fingerprint!==priorFingerprint||prior.snapshot_sha256!==hash(snapshotBytes)||
  plan.rows?.length!==2||snapshot.parents?.length!==2)throw Error('YELLOW_A_PACKAGE_MISMATCH');
 for(let i=0;i<2;i++){
  const n=NUMBERS[i],row=plan.rows[i],p=snapshot.parents.find(x=>x.number===n),entry=prior.records.find(r=>r.number===n);
  const e=evidence[n]={catalog:read(`xy-remaining-image-review-20261119/${n}.webp`),product:read(`xy-remaining-image-review-20261119/${n}-product.jpg`),
   article:read(`xy-remaining-checklists-20261119/${n}.html`),articleReceipt:JSON.parse(read(`xy-remaining-checklists-20261119/${n}-receipt.json`)),
   catalogReceipt:JSON.parse(read(`xy-remaining-image-review-20261119/${n}-receipt.json`)),productReceipt:JSON.parse(read(`xy-remaining-image-review-20261119/${n}-product-receipt.json`))};
  const review=evaluateXySuffixCandidate(snapshot,n,e),product=snapshot.products.find(x=>x.row.product_id===row?.unmapped_product_id)?.row;
  if(review.status!=='review_candidate_only'||!p||row.id!==IDS[i]||row.id!==p.id||row.gv_id!==p.gv_id||row.number!==n||row.before!=='Common'||row.after!=='Promo'||
   row.identity_key_hash!==review.identity_key_hash||row.protected_trait_id!==review.protected_trait_id||row.unmapped_product_id!==review.unmapped_product_id||
   row.catalog_image_sha256!==hash(e.catalog)||row.product_image_sha256!==hash(e.product)||row.article_sha256!==hash(e.article)||
   e.catalogReceipt.sha256!==hash(e.catalog)||e.catalogReceipt.storage_path!==p.image_path||e.productReceipt.sha256!==hash(e.product)||e.productReceipt.url!==product?.image_url||
   !entry||Object.entries(review).some(([k,v])=>!isDeepStrictEqual(entry[k],v)))throw Error('YELLOW_A_EVIDENCE_MISMATCH');
 }
 if(new Set(plan.rows.map(r=>r.id)).size!==2)throw Error('YELLOW_A_DUPLICATE_TARGET');
 return {plan,snapshot,evidence};
}
async function parents(db,lock=false){return (await db.query(`select to_jsonb(p) row from public.card_prints p where id=any($1::uuid[]) order by gv_id ${lock?'for update':''}`,[IDS])).rows.map(x=>x.row);}
async function receipts(db){return (await db.query(`select id::text,payload from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'_kind'='xy_yellow_a_promo_rarity_receipt' order by id`,[SOURCE,PLAN])).rows;}
function classify(snapshot,current,receipt){
 if(current.length!==2)throw Error('YELLOW_A_PARENT_COUNT');let pending=0,applied=0;
 for(const expected of snapshot.parents){const actual=current.find(p=>p.id===expected.id);if(isDeepStrictEqual(actual,expected))pending++;
  else if(isDeepStrictEqual(actual,{...expected,rarity:'Promo'}))applied++;else throw Error('YELLOW_A_PARENT_DRIFT');}
 if(pending===2&&!receipt)return 'pending';if(applied===2&&receipt)return 'already_applied';throw Error('YELLOW_A_PARTIAL_OR_MISSING_RECEIPT');
}
function snapshots(source,evidence){
 const out=[...source.products.map(x=>({key:'product:'+x.row.product_id,object:x})),...source.groups.map(x=>({key:'group:'+x.row.group_id,object:x}))];
 for(const n of NUMBERS){const e=evidence[n];out.push({key:'checklist:'+n,object:{receipt:e.articleReceipt,body_base64:e.article.toString('base64')}},
  {key:'catalog-image:'+n,object:{receipt:e.catalogReceipt,body_base64:e.catalog.toString('base64')}},
  {key:'product-image:'+n,object:{receipt:e.productReceipt,body_base64:e.product.toString('base64')}});}
 return out;
}
export async function verifyYellowASnapshots(db,receipt,expected){
 const refs=receipt.payload.source_receipts;
 if(!Array.isArray(refs)||refs.length!==9||new Set(refs.map(r=>r.id)).size!==9||new Set(refs.map(r=>r.key)).size!==9)throw Error('YELLOW_A_RECEIPT_REFS');
 const rows=(await db.query('select id::text,payload from public.raw_imports where source=$1 and id=any($2::bigint[])',[SOURCE,refs.map(r=>r.id)])).rows;
 const map=new Map(expected.map(x=>[x.key,x.object]));if(rows.length!==9||map.size!==9)throw Error('YELLOW_A_SNAPSHOTS_MISSING');
 for(const row of rows){const ref=refs.find(r=>r.id===row.id),p=row.payload;
  if(!ref||ref.key!==p.key||p._kind!=='xy_yellow_a_source_snapshot'||p.package_fingerprint!==PLAN||p.run_id!==receipt.payload.run_id||
   !map.has(p.key)||!isDeepStrictEqual(p.snapshot,map.get(p.key)))throw Error('YELLOW_A_SNAPSHOT_DRIFT');}
}
async function verifyImages(config,snapshot,evidence){
 if(!config.SUPABASE_SECRET_KEY)throw Error('YELLOW_A_STORAGE_CREDENTIAL_REQUIRED');
 const storage=createClient(config.SUPABASE_URL,config.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
 for(const p of snapshot.parents){const e=evidence[p.number],{data,error}=await storage.from('user-card-images').download(p.image_path);
  if(error||!data||hash(Buffer.from(await data.arrayBuffer()))!==hash(e.catalog))throw Error('YELLOW_A_CATALOG_IMAGE_DRIFT');
  const response=await fetch(e.productReceipt.url,{headers:{'user-agent':'GrookaiCatalogReview/1.0'},signal:AbortSignal.timeout(15000)});
  if(!response.ok||response.url!==e.productReceipt.final_url||hash(Buffer.from(await response.arrayBuffer()))!==hash(e.product))throw Error('YELLOW_A_PRODUCT_IMAGE_DRIFT');}
}
export async function runYellowAPromoRarity({mode='inspect',approval=null}={}){
 if(!['inspect','rollback-proof','apply','verify'].includes(mode))throw Error('INVALID_MODE');
 const mutating=['rollback-proof','apply'].includes(mode);if(mutating&&approval!=='PROCEED')throw Error('PROCEED_REQUIRED');
 const {plan,snapshot,evidence}=packageData(),config=dotenv.parse(fs.readFileSync(path.join(root,'.env.local'))),u=new URL(config.SUPABASE_DB_URL);
 if(new URL(config.SUPABASE_URL).hostname!==PROJECT+'.supabase.co'||!fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8').includes(PROJECT)||
  !`${u.hostname} ${decodeURIComponent(u.username)}`.includes(PROJECT))throw Error('ENVIRONMENT_MISMATCH');
 console.log(`REMOTE ${mutating?'GUARDED '+mode.toUpperCase():'READ ONLY'}: ${config.SUPABASE_URL}`);
 const settings={connectionString:config.SUPABASE_DB_URL,connectionTimeoutMillis:10000,application_name:EXEC},db=new Client(settings),ledger=new Client(settings);
 const runId=crypto.randomUUID(),writer=yellowAWriterFingerprint(),report={version:'XY_YELLOW_A_PROMO_RARITY_APPLY_V1',run_id:runId,mode,
  package_fingerprint:PLAN,writer_fingerprint:writer,started_at:new Date().toISOString(),status:'started',stages:[]};
 const reportPath=path.join(dir,`yellow-a-run-${runId}.json`),save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 const stage=name=>{report.stages.push({name,at:new Date().toISOString()});save();};let tx=false,logged=false,commitStarted=false,committed=false;
 try{
  await db.connect();await ledger.connect();
  if(mutating){await ledger.query(`insert into admin.import_runs(id,kind,scope,status,started_at) values($1,$2,$3::jsonb,'running',$4)`,[runId,EXEC,json({package_fingerprint:PLAN,mode,writer_fingerprint:writer}),report.started_at]);logged=true;}
  await db.query(`begin isolation level serializable ${mutating?'read write':'read only'}`);tx=true;
  await db.query("set local statement_timeout='60s'");await db.query("set local lock_timeout='5s'");if(mutating)await db.query('select pg_advisory_xact_lock(hashtext($1))',[EXEC]);
  report.sanity=(await db.query(`select (select count(*)::int from public.card_prints) parents,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`)).rows[0];
  if(report.sanity.parents<40000||report.sanity.sets<150||report.sanity.traits<5000)throw Error('ENVIRONMENT_COUNT_GATE');
  const triggers=(await db.query(`select tgrelid::regclass::text relation,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid in('public.card_prints'::regclass,'public.raw_imports'::regclass) and not tgisinternal order by tgrelid,tgname`)).rows;
  if(triggers.length!==1||triggers[0].relation!=='card_prints'||!triggers[0].definition.includes('UPDATE OF set_id, set_identity_model'))throw Error('YELLOW_A_TRIGGER_DRIFT');
  const before=await parents(db,mutating),existing=await receipts(db);if(existing.length>1)throw Error('YELLOW_A_DUPLICATE_RECEIPT');
  report.state=classify(snapshot,before,existing.length===1);
  const source=await captureYellowASourceProof(db,snapshot,evidence,{lock:mutating}),sourceDigest=hash(json(source)),staged=snapshots(source,evidence);
  await verifyImages(config,snapshot,evidence);stage('frozen_sources_and_images_verified');
  if(report.state==='already_applied'||mode==='verify'){
   if(report.state!=='already_applied'||!isDeepStrictEqual(existing[0].payload.changes,plan.rows))throw Error('YELLOW_A_RECEIPT_MISMATCH');
   await verifyYellowASnapshots(db,existing[0],staged);report.status='verified_already_applied';report.receipt_id=existing[0].id;await db.query('rollback');tx=false;
  }else if(mode==='inspect'){report.status='preflight_passed';await db.query('rollback');tx=false;}
  else{
   if(mode==='apply'){const proof=JSON.parse(fs.readFileSync(path.join(dir,`yellow-a-rollback-proof-${PLAN}-${writer}.json`)));
    if(proof.status!=='rollback_proof_passed'||proof.package_fingerprint!==PLAN||proof.writer_fingerprint!==writer)throw Error('YELLOW_A_ROLLBACK_PROOF_STALE');}
   const preimage=hash(json(before));report.protected_before=await captureXyPromoProtectedState(db,IDS);
   await assertExecuteCanonWriteV1({execution_name:EXEC,write_target:db,audit_target:db,ledger_target:ledger,transaction_control:'external',
    payload_snapshot:{package_fingerprint:PLAN,mode},actor_type:'system_worker',source_worker:EXEC,source_system:'catalog_metadata',
    contract_assertions:[{ok:report.state==='pending',contract_name:'NO_ASSUMPTION_RULE',reason:'Two exact Yellow A image and source-reviewed rarity corrections'}],
    write:async()=>{
     const refs=(await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes)
      select $1,jsonb_build_object('_kind','xy_yellow_a_source_snapshot','package_fingerprint',$2::text,'run_id',$3::text,'key',x.key,'snapshot',x.object),
       'normalized',now(),'Preserved unowned provider product/group JSONB and exact image/checklist bytes; no mapping changes'
      from jsonb_to_recordset($4::jsonb) x(key text,object jsonb) returning id::text,payload->>'key' key`,[SOURCE,PLAN,runId,json(staged)])).rows;
     if(refs.length!==9)throw Error('YELLOW_A_RAW_STAGE_COUNT');
     const changed=await db.query(`update public.card_prints set rarity='Promo' where id=any($1::uuid[]) and rarity='Common' returning id`,[IDS]);
     if(changed.rowCount!==2)throw Error('YELLOW_A_WRITE_COUNT');classify(snapshot,await parents(db),true);
     const payload={_kind:'xy_yellow_a_promo_rarity_receipt',package_fingerprint:PLAN,writer_fingerprint:writer,run_id:runId,
      changes:plan.rows,source_receipts:refs,preimage_hash:preimage,source_digest:sourceDigest};
     report.receipt_id=(await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes) values($1,$2::jsonb,'normalized',now(),$3) returning id::text`,
      [SOURCE,json(payload),'Two exact Yellow A parent rarity corrections; conflicting traits and mapping absence preserved'])).rows[0].id;
    },proofs:[{name:'yellow_a_protected_state',contract_name:'IDENTITY_CONTRACT_SUITE_V1',run:async()=>{
     const after=await captureXyPromoProtectedState(db,IDS),sourceAfter=await captureYellowASourceProof(db,snapshot,evidence);
     await verifyImages(config,snapshot,evidence);
     return {ok:isDeepStrictEqual(report.protected_before,after)&&hash(json(sourceAfter))===sourceDigest,reason:'Only two exact Yellow A parent rarity fields may change'};
    }}]});
   stage('write_and_proofs_passed');
   if(mode==='rollback-proof'){
    await db.query('rollback');tx=false;await db.query('begin isolation level serializable read only');tx=true;
    const restored=await parents(db);if(hash(json(restored))!==preimage||classify(snapshot,restored,false)!=='pending'||(await receipts(db)).length)throw Error('YELLOW_A_ROLLBACK_FAILED');
    if((await db.query(`select id from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2`,[SOURCE,PLAN])).rowCount)throw Error('YELLOW_A_RAW_ROLLBACK_FAILED');
    if(!isDeepStrictEqual(await captureXyPromoProtectedState(db,IDS),report.protected_before)||hash(json(await captureYellowASourceProof(db,snapshot,evidence)))!==sourceDigest)throw Error('YELLOW_A_PROTECTED_ROLLBACK_FAILED');
    await db.query('rollback');tx=false;report.status='rollback_proof_passed';
   }else{
    commitStarted=true;await db.query('commit');tx=false;committed=true;await db.query('begin isolation level serializable read only');tx=true;
    const durable=await receipts(db),after=await parents(db);classify(snapshot,after,true);
    if(durable.length!==1||durable[0].id!==report.receipt_id||!isDeepStrictEqual(durable[0].payload.changes,plan.rows))throw Error('YELLOW_A_DURABLE_RECEIPT_FAILED');
    await verifyYellowASnapshots(db,durable[0],staged);await db.query('rollback');tx=false;report.status='applied_and_verified';
   }
  }
  report.finished_at=new Date().toISOString();if(logged)await ledger.query(`update admin.import_runs set status='success',finished_at=now(),scope=$2::jsonb where id=$1`,[runId,json({package_fingerprint:PLAN,mode,writer_fingerprint:writer,status:report.status})]);
  stage(report.status);if(report.status==='rollback_proof_passed')fs.writeFileSync(path.join(dir,`yellow-a-rollback-proof-${PLAN}-${writer}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
 }catch(error){
  if(tx)await db.query('rollback').catch(()=>{});report.status=committed?'committed_readback_failed':commitStarted?'commit_outcome_unknown_requires_readback':'failed_rolled_back';
  report.error={code:error.code??'YELLOW_A_FAILED',message:String(error.message??error).replace(config.SUPABASE_DB_URL,'[redacted]')};report.finished_at=new Date().toISOString();
  if(logged)await ledger.query(`update admin.import_runs set status='error',finished_at=now(),error=$2,scope=$3::jsonb where id=$1`,[runId,report.error.message,json({package_fingerprint:PLAN,mode,status:report.status})]).catch(()=>{});
  save();throw Error(report.status+': '+report.error.message);
 }finally{await db.end().catch(()=>{});await ledger.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
 runYellowAPromoRarity({mode:args.includes('--mode')?value('--mode'):'inspect',approval:args.includes('--approval')?value('--approval'):null})
  .then(r=>console.log(json({status:r.status,run_id:r.run_id,receipt_id:r.receipt_id??null}))).catch(error=>{console.error(error.message);process.exitCode=1;});}
