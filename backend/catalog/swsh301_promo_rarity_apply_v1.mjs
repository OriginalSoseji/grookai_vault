import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertExecuteCanonWriteV1 } from '../lib/contracts/execute_canon_write_v1.mjs';
import { captureXyPromoProtectedState } from './xy_promo_protected_state_v1.mjs';
import { captureSwsh301SourceProof } from './swsh301_promo_source_proof_v1.mjs';
import { evaluateSwsh301Candidate } from '../../docs/audits/swsh301_promo_rarity_review_20261119/swsh301_rarity_candidate_20261119.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root,'docs/audits/swsh301_promo_rarity_review_20261119');
const require = createRequire(import.meta.url), { Client } = require('pg'), dotenv = require('dotenv'), { createClient } = require('@supabase/supabase-js');
const EXEC = 'catalog_swsh301_promo_rarity_apply_v1', SOURCE = 'grookai_catalog_swsh301_promo_rarity_v1', PROJECT = 'ycdxbpibncqcchqiihfz';
const PLAN = 'c9c72df261c1a075afc27368df068282a8f491d0ca7e0a3d929946980b85bd31';
const ID = 'af831a08-6e93-4e7a-8e8b-1b02d38c9ff1';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), json = value => JSON.stringify(value);
const writerFiles = ['backend/catalog/swsh301_promo_rarity_apply_v1.mjs','backend/catalog/swsh301_promo_source_proof_v1.mjs',
  'backend/catalog/xy_promo_protected_state_v1.mjs','backend/pokemon/tcgplayer_catalog_rarity_v1.mjs',
  'docs/audits/swsh301_promo_rarity_review_20261119/swsh301_rarity_candidate_20261119.mjs',
  'backend/lib/contracts/contract_scope_v1.mjs','backend/lib/contracts/execute_canon_write_v1.mjs','backend/lib/contracts/run_post_write_proofs_v1.mjs'];
export function swsh301WriterFingerprint() { return hash(json(writerFiles.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]))); }
function packageData() {
  const read = name => fs.readFileSync(path.join(dir,name));
  const plan = JSON.parse(read('swsh301-execution-plan-20261119.json')), { fingerprint_sha256,...body } = plan;
  const snapshotBytes = read('swsh301-frozen-readback-v2-20261119.json'), snapshot = JSON.parse(snapshotBytes);
  const evidence = { representative:read('swsh301-source-captures-20261119/representative.jpg'), product:read('swsh301-source-captures-20261119/product.jpg'),
    article:read('swsh301-source-captures-20261119/article.html'), articleReceipt:JSON.parse(read('swsh301-source-captures-20261119/article.html-receipt.json')),
    representativeReceipt:JSON.parse(read('swsh301-source-captures-20261119/representative-receipt.json')),
    productReceipt:JSON.parse(read('swsh301-source-captures-20261119/product.jpg-receipt.json')) };
  if (fingerprint_sha256 !== PLAN || hash(json(body)) !== PLAN || plan.status !== 'FROZEN_GUARDED_PACKAGE' || plan.target !== PROJECT ||
      !isDeepStrictEqual(plan.scope,{table:'card_prints',field:'rarity',count:1}) || plan.snapshot_sha256 !== hash(snapshotBytes) ||
      plan.article_sha256 !== hash(evidence.article) || plan.representative_image_sha256 !== hash(evidence.representative) || plan.product_image_sha256 !== hash(evidence.product) ||
      plan.changes?.length !== 1 || plan.changes[0].id !== ID || plan.changes[0].before !== 'None' || plan.changes[0].after !== 'Promo' ||
      evidence.representativeReceipt.sha256 !== hash(evidence.representative) || evidence.representativeReceipt.image_path !== snapshot.parents[0].image_path ||
      evidence.productReceipt.sha256 !== hash(evidence.product) || evidence.productReceipt.url !== snapshot.products[0].row.image_url ||
      evaluateSwsh301Candidate(snapshot,evidence).status !== 'review_candidate_only') throw Error('SWSH301_PACKAGE_MISMATCH');
  return {plan,snapshot,evidence};
}
async function parent(db,lock=false) { return (await db.query(`select to_jsonb(p) row from public.card_prints p where id=$1::uuid ${lock?'for update':''}`,[ID])).rows.map(r=>r.row); }
async function receipts(db) { return (await db.query(`select id::text,payload from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'_kind'='swsh301_promo_rarity_receipt' order by id`,[SOURCE,PLAN])).rows; }
function classify(frozen,rows,receipt) {
  if (rows.length !== 1) throw Error('SWSH301_PARENT_COUNT');
  if (isDeepStrictEqual(rows[0],frozen.parents[0]) && !receipt) return 'pending';
  if (isDeepStrictEqual(rows[0],{...frozen.parents[0],rarity:'Promo'}) && receipt) return 'already_applied';
  throw Error('SWSH301_PARENT_OR_RECEIPT_DRIFT');
}
function snapshots(source,evidence) { return [
  {key:'product:505996',object:source.products[0]}, {key:'group:2545',object:source.groups[0]},
  {key:'checklist:SWSH301',object:{receipt:evidence.articleReceipt,body_base64:evidence.article.toString('base64')}},
  {key:'representative-image:SWSH301',object:{receipt:evidence.representativeReceipt,body_base64:evidence.representative.toString('base64')}},
  {key:'product-image:SWSH301',object:{receipt:evidence.productReceipt,body_base64:evidence.product.toString('base64')}} ]; }
export async function verifySwsh301Snapshots(db, receipt, expected) {
  const refs = receipt.payload.source_receipts;
  if (!Array.isArray(refs) || refs.length !== 5 || new Set(refs.map(r=>r.id)).size !== 5 || new Set(refs.map(r=>r.key)).size !== 5) throw Error('SWSH301_RECEIPT_REFS');
  const records = (await db.query('select id::text,payload from public.raw_imports where source=$1 and id=any($2::bigint[])',[SOURCE,refs.map(r=>r.id)])).rows;
  const map = new Map(expected.map(r=>[r.key,r.object])); if (records.length !== 5 || map.size !== 5) throw Error('SWSH301_SNAPSHOTS_MISSING');
  for (const record of records) { const ref = refs.find(r=>r.id===record.id), payload = record.payload;
    if (!ref || ref.key !== payload.key || payload._kind !== 'swsh301_promo_source_snapshot' || payload.package_fingerprint !== PLAN ||
        payload.run_id !== receipt.payload.run_id || !map.has(payload.key) || !isDeepStrictEqual(payload.snapshot,map.get(payload.key))) throw Error('SWSH301_SNAPSHOT_DRIFT'); }
}
async function verifyImages(config,snapshot,evidence) {
  if (!config.SUPABASE_SECRET_KEY) throw Error('SWSH301_STORAGE_CREDENTIAL_REQUIRED');
  const storage = createClient(config.SUPABASE_URL,config.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
  const {data,error} = await storage.from('user-card-images').download(snapshot.parents[0].image_path);
  if (error || !data || hash(Buffer.from(await data.arrayBuffer())) !== hash(evidence.representative)) throw Error('SWSH301_REPRESENTATIVE_IMAGE_DRIFT');
  const response = await fetch(evidence.productReceipt.url,{headers:{'user-agent':'GrookaiCatalogReview/1.0'},signal:AbortSignal.timeout(15000)});
  if (!response.ok || response.url !== evidence.productReceipt.final_url || hash(Buffer.from(await response.arrayBuffer())) !== hash(evidence.product)) throw Error('SWSH301_PRODUCT_IMAGE_DRIFT');
}
export async function runSwsh301PromoRarity({ mode='inspect', approval=null }={}) {
  if (!['inspect','rollback-proof','apply','verify'].includes(mode)) throw Error('INVALID_MODE');
  const mutating = ['rollback-proof','apply'].includes(mode); if (mutating && approval !== 'PROCEED') throw Error('PROCEED_REQUIRED');
  const {plan,snapshot,evidence} = packageData(), config = dotenv.parse(fs.readFileSync(path.join(root,'.env.local'))), u = new URL(config.SUPABASE_DB_URL);
  if (new URL(config.SUPABASE_URL).hostname !== PROJECT+'.supabase.co' || !fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8').includes(PROJECT) ||
      !`${u.hostname} ${decodeURIComponent(u.username)}`.includes(PROJECT)) throw Error('ENVIRONMENT_MISMATCH');
  console.log(`REMOTE ${mutating?'GUARDED '+mode.toUpperCase():'READ ONLY'}: ${config.SUPABASE_URL}`);
  const settings = {connectionString:config.SUPABASE_DB_URL,connectionTimeoutMillis:10000,application_name:EXEC};
  const db = new Client(settings), ledger = new Client(settings), runId = crypto.randomUUID(), writer = swsh301WriterFingerprint();
  const report = {version:'SWSH301_PROMO_RARITY_APPLY_V1',run_id:runId,mode,package_fingerprint:PLAN,writer_fingerprint:writer,started_at:new Date().toISOString(),status:'started',stages:[]};
  const reportPath = path.join(dir,`swsh301-run-${runId}.json`), save = () => fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
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
    if (triggers.length!==1 || triggers[0].relation!=='card_prints' || !triggers[0].definition.includes('UPDATE OF set_id, set_identity_model')) throw Error('SWSH301_TRIGGER_DRIFT');
    const before = await parent(db,mutating), existing = await receipts(db); if (existing.length>1) throw Error('SWSH301_DUPLICATE_RECEIPT');
    report.state = classify(snapshot,before,existing.length===1);
    const source = await captureSwsh301SourceProof(db,snapshot,evidence,{lock:mutating}), sourceDigest = hash(json(source)), staged = snapshots(source,evidence);
    await verifyImages(config,snapshot,evidence); stage('frozen_sources_and_images_verified');
    if (report.state==='already_applied' || mode==='verify') {
      if (report.state!=='already_applied' || !isDeepStrictEqual(existing[0].payload.changes,plan.changes)) throw Error('SWSH301_RECEIPT_MISMATCH');
      await verifySwsh301Snapshots(db,existing[0],staged); report.status='verified_already_applied'; report.receipt_id=existing[0].id;
      await db.query('rollback');tx=false;
    } else if (mode==='inspect') {report.status='preflight_passed';await db.query('rollback');tx=false;}
    else {
      if (mode==='apply') {
        const proof = JSON.parse(fs.readFileSync(path.join(dir,`swsh301-rollback-proof-${PLAN}-${writer}.json`)));
        if (proof.status!=='rollback_proof_passed' || proof.package_fingerprint!==PLAN || proof.writer_fingerprint!==writer) throw Error('SWSH301_ROLLBACK_PROOF_STALE');
      }
      const preimage = hash(json(before)); report.protected_before = await captureXyPromoProtectedState(db,[ID]);
      await assertExecuteCanonWriteV1({execution_name:EXEC,write_target:db,audit_target:db,ledger_target:ledger,transaction_control:'external',
        payload_snapshot:{package_fingerprint:PLAN,mode},actor_type:'system_worker',source_worker:EXEC,source_system:'catalog_metadata',
        contract_assertions:[{ok:report.state==='pending',contract_name:'NO_ASSUMPTION_RULE',reason:'One printed-design and source-reviewed rarity correction; representative image status preserved'}],
        write:async()=>{
          const refs = (await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes)
            select $1,jsonb_build_object('_kind','swsh301_promo_source_snapshot','package_fingerprint',$2::text,'run_id',$3::text,'key',x.key,'snapshot',x.object),
            'normalized',now(),'Preserved product/group JSONB and exact image/checklist bytes; record-specific review only'
            from jsonb_to_recordset($4::jsonb) x(key text,object jsonb) returning id::text,payload->>'key' key`,[SOURCE,PLAN,runId,json(staged)])).rows;
          if (refs.length!==5) throw Error('SWSH301_RAW_STAGE_COUNT');
          const changed = await db.query(`update public.card_prints set rarity='Promo' where id=$1::uuid and rarity='None' returning id`,[ID]);
          if (changed.rowCount!==1) throw Error('SWSH301_WRITE_COUNT'); classify(snapshot,await parent(db),true);
          const payload = {_kind:'swsh301_promo_rarity_receipt',package_fingerprint:PLAN,writer_fingerprint:writer,run_id:runId,
            changes:plan.changes,source_receipts:refs,preimage_hash:preimage,source_digest:sourceDigest};
          report.receipt_id = (await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes) values($1,$2::jsonb,'normalized',now(),$3) returning id::text`,[SOURCE,json(payload),'One SWSH301 parent rarity correction; source traits and representative image status preserved'])).rows[0].id;
        }, proofs:[{name:'swsh301_protected_state',contract_name:'IDENTITY_CONTRACT_SUITE_V1',run:async()=>{
          const after=await captureXyPromoProtectedState(db,[ID]), sourceAfter=await captureSwsh301SourceProof(db,snapshot,evidence);
          await verifyImages(config,snapshot,evidence);
          return {ok:isDeepStrictEqual(report.protected_before,after)&&hash(json(sourceAfter))===sourceDigest,reason:'Only the exact SWSH301 parent rarity may change'};
        }}]});
      stage('write_and_proofs_passed');
      if (mode==='rollback-proof') {
        await db.query('rollback');tx=false;await db.query('begin isolation level serializable read only');tx=true;
        const restored=await parent(db); if (hash(json(restored))!==preimage || classify(snapshot,restored,false)!=='pending' || (await receipts(db)).length) throw Error('SWSH301_ROLLBACK_FAILED');
        if ((await db.query(`select id from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2`,[SOURCE,PLAN])).rowCount) throw Error('SWSH301_RAW_ROLLBACK_FAILED');
        if (!isDeepStrictEqual(await captureXyPromoProtectedState(db,[ID]),report.protected_before) || hash(json(await captureSwsh301SourceProof(db,snapshot,evidence)))!==sourceDigest) throw Error('SWSH301_PROTECTED_ROLLBACK_FAILED');
        await db.query('rollback');tx=false;report.status='rollback_proof_passed';
      } else {
        commitStarted=true; await db.query('commit');tx=false;committed=true;await db.query('begin isolation level serializable read only');tx=true;
        const durable=await receipts(db),after=await parent(db); classify(snapshot,after,true);
        if (durable.length!==1 || durable[0].id!==report.receipt_id || !isDeepStrictEqual(durable[0].payload.changes,plan.changes)) throw Error('SWSH301_DURABLE_RECEIPT_FAILED');
        await verifySwsh301Snapshots(db,durable[0],staged);await db.query('rollback');tx=false;report.status='applied_and_verified';
      }
    }
    report.finished_at=new Date().toISOString();
    if (logged) await ledger.query(`update admin.import_runs set status='success',finished_at=now(),scope=$2::jsonb where id=$1`,[runId,json({package_fingerprint:PLAN,mode,writer_fingerprint:writer,status:report.status})]);
    stage(report.status); if (report.status==='rollback_proof_passed') fs.writeFileSync(path.join(dir,`swsh301-rollback-proof-${PLAN}-${writer}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    return report;
  } catch(error) {
    if(tx) await db.query('rollback').catch(()=>{});
    report.status=committed?'committed_readback_failed':commitStarted?'commit_outcome_unknown_requires_readback':'failed_rolled_back';
    report.error={code:error.code??'SWSH301_FAILED',message:String(error.message??error).replace(config.SUPABASE_DB_URL,'[redacted]')};report.finished_at=new Date().toISOString();
    if(logged) await ledger.query(`update admin.import_runs set status='error',finished_at=now(),error=$2,scope=$3::jsonb where id=$1`,[runId,report.error.message,json({package_fingerprint:PLAN,mode,status:report.status})]).catch(()=>{});
    save();throw Error(report.status+': '+report.error.message);
  } finally {await db.end().catch(()=>{});await ledger.end().catch(()=>{});}
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), value=key=>args[args.indexOf(key)+1];
  runSwsh301PromoRarity({mode:args.includes('--mode')?value('--mode'):'inspect',approval:args.includes('--approval')?value('--approval'):null})
    .then(r=>console.log(json({status:r.status,run_id:r.run_id,receipt_id:r.receipt_id??null}))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
