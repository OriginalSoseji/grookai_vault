import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertExecuteCanonWriteV1 } from '../lib/contracts/execute_canon_write_v1.mjs';
import { captureXyPromoProtectedState } from './xy_promo_protected_state_v1.mjs';
import { captureXy150SourceProof } from './xy150_promo_source_proof_v1.mjs';
import { evaluateXy150Candidate } from '../../docs/audits/xy150_promo_review_20261119/xy150_candidate_policy_20261119.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root,'docs/audits/xy150_promo_review_20261119');
const require = createRequire(import.meta.url), { Client } = require('pg'), dotenv = require('dotenv'), { createClient } = require('@supabase/supabase-js');
const EXEC = 'catalog_xy150_promo_rarity_apply_v1', SOURCE = 'grookai_catalog_xy150_promo_rarity_v1', PROJECT = 'ycdxbpibncqcchqiihfz';
const PLAN = '328b9ad74f4822494f90a962421c6f47c1321e1c7ffa67f8c86c78355405f3f8';
const ID = '28b773fa-ed21-47b8-a349-1d03f778c045';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), json = value => JSON.stringify(value);
const writerFiles = ['backend/catalog/xy150_promo_rarity_apply_v1.mjs','backend/catalog/xy150_promo_source_proof_v1.mjs',
  'backend/catalog/xy_promo_protected_state_v1.mjs','backend/pokemon/tcgplayer_catalog_rarity_v1.mjs',
  'docs/audits/xy150_promo_review_20261119/xy150_candidate_policy_20261119.mjs',
  'backend/lib/contracts/contract_scope_v1.mjs','backend/lib/contracts/execute_canon_write_v1.mjs','backend/lib/contracts/run_post_write_proofs_v1.mjs'];
export function xy150WriterFingerprint() { return hash(json(writerFiles.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]))); }
function packageData() {
  const read = name => fs.readFileSync(path.join(dir,name));
  const plan = JSON.parse(read('xy150-execution-plan.json')), { fingerprint_sha256,...body } = plan;
  const snapshotBytes = read('xy150-frozen-readback-20261119.json'), snapshot = JSON.parse(snapshotBytes);
  const evidence = { catalog:read('xy-remaining-image-review-20261119/XY150.webp'), product:read('xy-remaining-image-review-20261119/XY150-product.jpg'),
    article:read('xy-remaining-checklists-20261119/XY150.html'), articleReceipt:JSON.parse(read('xy-remaining-checklists-20261119/XY150-receipt.json')),
    catalogReceipt:JSON.parse(read('xy-remaining-image-review-20261119/XY150-receipt.json')),
    productReceipt:JSON.parse(read('xy-remaining-image-review-20261119/XY150-product-receipt.json')) };
  if (fingerprint_sha256 !== PLAN || hash(json(body)) !== PLAN || plan.status !== 'FROZEN_GUARDED_PACKAGE' || plan.target !== PROJECT ||
      !isDeepStrictEqual(plan.scope,{table:'card_prints',field:'rarity',count:1}) || plan.snapshot_sha256 !== hash(snapshotBytes) ||
      plan.article_sha256 !== hash(evidence.article) || plan.catalog_image_sha256 !== hash(evidence.catalog) || plan.product_image_sha256 !== hash(evidence.product) ||
      plan.changes?.length !== 1 || plan.changes[0].id !== ID || plan.changes[0].before !== 'None' || plan.changes[0].after !== 'Promo' ||
      evidence.catalogReceipt.sha256 !== hash(evidence.catalog) || evidence.catalogReceipt.storage_path !== snapshot.parents[0].image_path ||
      evidence.productReceipt.sha256 !== hash(evidence.product) || evidence.productReceipt.url !== snapshot.products[0].row.image_url ||
      evaluateXy150Candidate(snapshot,evidence.catalog,evidence.product,evidence.article,evidence.articleReceipt).status !== 'review_candidate_only') throw Error('XY150_PACKAGE_MISMATCH');
  return {plan,snapshot,evidence};
}
async function parent(db,lock=false) { return (await db.query(`select to_jsonb(p) row from public.card_prints p where id=$1::uuid ${lock?'for update':''}`,[ID])).rows.map(r=>r.row); }
async function receipts(db) { return (await db.query(`select id::text,payload from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'_kind'='xy150_promo_rarity_receipt' order by id`,[SOURCE,PLAN])).rows; }
function classify(frozen,rows,receipt) {
  if (rows.length !== 1) throw Error('XY150_PARENT_COUNT');
  if (isDeepStrictEqual(rows[0],frozen.parents[0]) && !receipt) return 'pending';
  if (isDeepStrictEqual(rows[0],{...frozen.parents[0],rarity:'Promo'}) && receipt) return 'already_applied';
  throw Error('XY150_PARENT_OR_RECEIPT_DRIFT');
}
function snapshots(source,evidence) { return [
  {key:'product:121953',object:source.products[0]}, {key:'group:1451',object:source.groups[0]},
  {key:'checklist:XY150',object:{receipt:evidence.articleReceipt,body_base64:evidence.article.toString('base64')}},
  {key:'catalog-image:XY150',object:{receipt:evidence.catalogReceipt,body_base64:evidence.catalog.toString('base64')}},
  {key:'product-image:XY150',object:{receipt:evidence.productReceipt,body_base64:evidence.product.toString('base64')}} ]; }
export async function verifyXy150Snapshots(db, receipt, expected) {
  const refs = receipt.payload.source_receipts;
  if (!Array.isArray(refs) || refs.length !== 5 || new Set(refs.map(r=>r.id)).size !== 5 || new Set(refs.map(r=>r.key)).size !== 5) throw Error('XY150_RECEIPT_REFS');
  const records = (await db.query('select id::text,payload from public.raw_imports where source=$1 and id=any($2::bigint[])',[SOURCE,refs.map(r=>r.id)])).rows;
  const map = new Map(expected.map(r=>[r.key,r.object])); if (records.length !== 5 || map.size !== 5) throw Error('XY150_SNAPSHOTS_MISSING');
  for (const record of records) { const ref = refs.find(r=>r.id===record.id), payload = record.payload;
    if (!ref || ref.key !== payload.key || payload._kind !== 'xy150_promo_source_snapshot' || payload.package_fingerprint !== PLAN ||
        payload.run_id !== receipt.payload.run_id || !map.has(payload.key) || !isDeepStrictEqual(payload.snapshot,map.get(payload.key))) throw Error('XY150_SNAPSHOT_DRIFT'); }
}
async function verifyImages(config,snapshot,evidence) {
  if (!config.SUPABASE_SECRET_KEY) throw Error('XY150_STORAGE_CREDENTIAL_REQUIRED');
  const storage = createClient(config.SUPABASE_URL,config.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
  const {data,error} = await storage.from('user-card-images').download(snapshot.parents[0].image_path);
  if (error || !data || hash(Buffer.from(await data.arrayBuffer())) !== hash(evidence.catalog)) throw Error('XY150_CATALOG_IMAGE_DRIFT');
  const response = await fetch(evidence.productReceipt.url,{headers:{'user-agent':'GrookaiCatalogReview/1.0'},signal:AbortSignal.timeout(15000)});
  if (!response.ok || response.url !== evidence.productReceipt.final_url || hash(Buffer.from(await response.arrayBuffer())) !== hash(evidence.product)) throw Error('XY150_PRODUCT_IMAGE_DRIFT');
}
export async function runXy150PromoRarity({ mode='inspect', approval=null }={}) {
  if (!['inspect','rollback-proof','apply','verify'].includes(mode)) throw Error('INVALID_MODE');
  const mutating = ['rollback-proof','apply'].includes(mode); if (mutating && approval !== 'PROCEED') throw Error('PROCEED_REQUIRED');
  const {plan,snapshot,evidence} = packageData(), config = dotenv.parse(fs.readFileSync(path.join(root,'.env.local'))), u = new URL(config.SUPABASE_DB_URL);
  if (new URL(config.SUPABASE_URL).hostname !== PROJECT+'.supabase.co' || !fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8').includes(PROJECT) ||
      !`${u.hostname} ${decodeURIComponent(u.username)}`.includes(PROJECT)) throw Error('ENVIRONMENT_MISMATCH');
  console.log(`REMOTE ${mutating?'GUARDED '+mode.toUpperCase():'READ ONLY'}: ${config.SUPABASE_URL}`);
  const settings = {connectionString:config.SUPABASE_DB_URL,connectionTimeoutMillis:10000,application_name:EXEC};
  const db = new Client(settings), ledger = new Client(settings), runId = crypto.randomUUID(), writer = xy150WriterFingerprint();
  const report = {version:'XY150_PROMO_RARITY_APPLY_V1',run_id:runId,mode,package_fingerprint:PLAN,writer_fingerprint:writer,started_at:new Date().toISOString(),status:'started',stages:[]};
  const reportPath = path.join(dir,`xy150-run-${runId}.json`), save = () => fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  const stage = name => {report.stages.push({name,at:new Date().toISOString()});save();};
  let tx=false,logged=false,commitStarted=false,committed=false;
  try {
    await db.connect(); await ledger.connect();
    if (mutating) {await ledger.query(`insert into admin.import_runs(id,kind,scope,status,started_at) values($1,$2,$3::jsonb,'running',$4)`,[runId,EXEC,json({package_fingerprint:PLAN,mode,writer_fingerprint:writer}),report.started_at]);logged=true;}
    await db.query(`begin isolation level serializable ${mutating?'read write':'read only'}`); tx=true;
    await db.query("set local statement_timeout='60s'"); await db.query("set local lock_timeout='5s'");
    if (mutating) await db.query('select pg_advisory_xact_lock(hashtext($1))',[EXEC]);
    report.sanity = (await db.query(`select (select count(*)::int from public.card_prints) parents,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`)).rows[0];
    if (report.sanity.parents<40000 || report.sanity.sets<150 || report.sanity.traits<5000) throw Error('ENVIRONMENT_COUNT_GATE');
    const triggers = (await db.query(`select tgrelid::regclass::text relation,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid in('public.card_prints'::regclass,'public.raw_imports'::regclass) and not tgisinternal order by tgrelid,tgname`)).rows;
    if (triggers.length!==1 || triggers[0].relation!=='card_prints' || !triggers[0].definition.includes('UPDATE OF set_id, set_identity_model')) throw Error('XY150_TRIGGER_DRIFT');
    const before = await parent(db,mutating), existing = await receipts(db); if (existing.length>1) throw Error('XY150_DUPLICATE_RECEIPT');
    report.state = classify(snapshot,before,existing.length===1);
    const source = await captureXy150SourceProof(db,snapshot,evidence,{lock:mutating}), sourceDigest = hash(json(source)), staged = snapshots(source,evidence);
    await verifyImages(config,snapshot,evidence); stage('frozen_sources_and_images_verified');
    if (report.state==='already_applied' || mode==='verify') {
      if (report.state!=='already_applied' || !isDeepStrictEqual(existing[0].payload.changes,plan.changes)) throw Error('XY150_RECEIPT_MISMATCH');
      await verifyXy150Snapshots(db,existing[0],staged); report.status='verified_already_applied'; report.receipt_id=existing[0].id;
      await db.query('rollback');tx=false;
    } else if (mode==='inspect') {report.status='preflight_passed';await db.query('rollback');tx=false;}
    else {
      if (mode==='apply') {
        const proof = JSON.parse(fs.readFileSync(path.join(dir,`xy150-rollback-proof-${PLAN}-${writer}.json`)));
        if (proof.status!=='rollback_proof_passed' || proof.package_fingerprint!==PLAN || proof.writer_fingerprint!==writer) throw Error('XY150_ROLLBACK_PROOF_STALE');
      }
      const preimage = hash(json(before)); report.protected_before = await captureXyPromoProtectedState(db,[ID]);
      await assertExecuteCanonWriteV1({execution_name:EXEC,write_target:db,audit_target:db,ledger_target:ledger,transaction_control:'external',
        payload_snapshot:{package_fingerprint:PLAN,mode},actor_type:'system_worker',source_worker:EXEC,source_system:'catalog_metadata',
        contract_assertions:[{ok:report.state==='pending',contract_name:'NO_ASSUMPTION_RULE',reason:'One exact image and source-reviewed rarity correction'}],
        write:async()=>{
          const refs = (await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes)
            select $1,jsonb_build_object('_kind','xy150_promo_source_snapshot','package_fingerprint',$2::text,'run_id',$3::text,'key',x.key,'snapshot',x.object),
            'normalized',now(),'Preserved product/group JSONB and exact image/checklist bytes; record-specific review only'
            from jsonb_to_recordset($4::jsonb) x(key text,object jsonb) returning id::text,payload->>'key' key`,[SOURCE,PLAN,runId,json(staged)])).rows;
          if (refs.length!==5) throw Error('XY150_RAW_STAGE_COUNT');
          const changed = await db.query(`update public.card_prints set rarity='Promo' where id=$1::uuid and rarity='None' returning id`,[ID]);
          if (changed.rowCount!==1) throw Error('XY150_WRITE_COUNT'); classify(snapshot,await parent(db),true);
          const payload = {_kind:'xy150_promo_rarity_receipt',package_fingerprint:PLAN,writer_fingerprint:writer,run_id:runId,
            changes:plan.changes,source_receipts:refs,preimage_hash:preimage,source_digest:sourceDigest};
          report.receipt_id = (await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes) values($1,$2::jsonb,'normalized',now(),$3) returning id::text`,[SOURCE,json(payload),'One source-reviewed XY150 parent rarity correction; conflicting source trait preserved'])).rows[0].id;
        }, proofs:[{name:'xy150_protected_state',contract_name:'IDENTITY_CONTRACT_SUITE_V1',run:async()=>{
          const after=await captureXyPromoProtectedState(db,[ID]), sourceAfter=await captureXy150SourceProof(db,snapshot,evidence);
          await verifyImages(config,snapshot,evidence);
          return {ok:isDeepStrictEqual(report.protected_before,after)&&hash(json(sourceAfter))===sourceDigest,reason:'Only the exact XY150 parent rarity may change'};
        }}]});
      stage('write_and_proofs_passed');
      if (mode==='rollback-proof') {
        await db.query('rollback');tx=false;await db.query('begin isolation level serializable read only');tx=true;
        const restored=await parent(db); if (hash(json(restored))!==preimage || classify(snapshot,restored,false)!=='pending' || (await receipts(db)).length) throw Error('XY150_ROLLBACK_FAILED');
        if ((await db.query(`select id from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2`,[SOURCE,PLAN])).rowCount) throw Error('XY150_RAW_ROLLBACK_FAILED');
        if (!isDeepStrictEqual(await captureXyPromoProtectedState(db,[ID]),report.protected_before) || hash(json(await captureXy150SourceProof(db,snapshot,evidence)))!==sourceDigest) throw Error('XY150_PROTECTED_ROLLBACK_FAILED');
        await db.query('rollback');tx=false;report.status='rollback_proof_passed';
      } else {
        commitStarted=true; await db.query('commit');tx=false;committed=true;await db.query('begin isolation level serializable read only');tx=true;
        const durable=await receipts(db),after=await parent(db); classify(snapshot,after,true);
        if (durable.length!==1 || durable[0].id!==report.receipt_id || !isDeepStrictEqual(durable[0].payload.changes,plan.changes)) throw Error('XY150_DURABLE_RECEIPT_FAILED');
        await verifyXy150Snapshots(db,durable[0],staged);await db.query('rollback');tx=false;report.status='applied_and_verified';
      }
    }
    report.finished_at=new Date().toISOString();
    if (logged) await ledger.query(`update admin.import_runs set status='success',finished_at=now(),scope=$2::jsonb where id=$1`,[runId,json({package_fingerprint:PLAN,mode,writer_fingerprint:writer,status:report.status})]);
    stage(report.status); if (report.status==='rollback_proof_passed') fs.writeFileSync(path.join(dir,`xy150-rollback-proof-${PLAN}-${writer}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    return report;
  } catch(error) {
    if(tx) await db.query('rollback').catch(()=>{});
    report.status=committed?'committed_readback_failed':commitStarted?'commit_outcome_unknown_requires_readback':'failed_rolled_back';
    report.error={code:error.code??'XY150_FAILED',message:String(error.message??error).replace(config.SUPABASE_DB_URL,'[redacted]')};report.finished_at=new Date().toISOString();
    if(logged) await ledger.query(`update admin.import_runs set status='error',finished_at=now(),error=$2,scope=$3::jsonb where id=$1`,[runId,report.error.message,json({package_fingerprint:PLAN,mode,status:report.status})]).catch(()=>{});
    save();throw Error(report.status+': '+report.error.message);
  } finally {await db.end().catch(()=>{});await ledger.end().catch(()=>{});}
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), value=key=>args[args.indexOf(key)+1];
  runXy150PromoRarity({mode:args.includes('--mode')?value('--mode'):'inspect',approval:args.includes('--approval')?value('--approval'):null})
    .then(r=>console.log(json({status:r.status,run_id:r.run_id,receipt_id:r.receipt_id??null}))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
