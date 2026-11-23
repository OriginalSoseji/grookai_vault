import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {validateMcd22Plan,classifyMcd22State,MCD22_PLAN_FINGERPRINT,sha256} from './mcd22_rarity_policy_v1.mjs';
import {evaluateMcd22Candidate} from '../../docs/audits/promo_era_search_review_20261118/mcd22_candidate_policy.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(root,'docs/audits/promo_era_search_review_20261118');
const require=createRequire(import.meta.url),{Client}=require('pg'),dotenv=require('dotenv');
const EXEC='catalog_mcd22_rarity_apply_v1',SOURCE='grookai_catalog_mcd22_rarity_v1',PROJECT='ycdxbpibncqcchqiihfz';
const json=v=>JSON.stringify(v),plain=v=>JSON.parse(json(v)),hash=v=>sha256(json(v));
const writerFiles=['backend/catalog/mcd22_rarity_apply_v1.mjs','backend/catalog/mcd22_rarity_policy_v1.mjs',
 'backend/pokemon/tcgplayer_catalog_rarity_v1.mjs','docs/audits/promo_era_search_review_20261118/mcd22_candidate_policy.mjs',
 'backend/lib/contracts/contract_scope_v1.mjs','backend/lib/contracts/execute_canon_write_v1.mjs','backend/lib/contracts/run_post_write_proofs_v1.mjs'];
export function writerFingerprint(){return hash(writerFiles.map(f=>[f,sha256(fs.readFileSync(path.join(root,f)))]));}
const protectedTables=[['card_print_identity','card_print_id'],['card_printings','card_print_id'],
 ['external_mappings','card_print_id'],['external_mapping_aliases','canonical_card_print_id'],
 ['card_print_species','card_print_id'],['card_print_cameos','card_print_id'],['card_print_traits','card_print_id'],
 ['card_print_image_faces','card_print_id'],['vault_item_instances','card_print_id'],['vault_items','card_id'],
 ['card_print_price_curves','card_print_id'],['price_observations','print_id'],['market_prices','card_id']];
async function protectedState(db,ids){
 const result={parent_other_fields:(await db.query(`select count(*)::int rows,md5(coalesce(string_agg(md5((to_jsonb(p)-'rarity')::text),'' order by id),'')) digest
  from public.card_prints p where id=any($1::uuid[])`,[ids])).rows[0]};
 for(const [table,column] of protectedTables)result[table]=(await db.query(`select count(*)::int rows,
  coalesce(bit_xor(hashtextextended(t.id::text||':'||t.xmin::text,0)),0)::text row_versions_1,
  coalesce(bit_xor(hashtextextended(t.id::text||':'||t.xmin::text,8675309)),0)::text row_versions_2
  from public.${table} t where ${column}=any($1::uuid[])`,[ids])).rows[0];
 result.market_price_current_publication=(await db.query(`select count(*)::int rows,
  md5(coalesce(string_agg(md5(to_jsonb(p)::text),'' order by md5(to_jsonb(p)::text)),'')) digest from public.market_price_current_publication p`)).rows[0];
 result.market_price_publication_snapshots=(await db.query(`select count(*)::int rows,
  coalesce(bit_xor(hashtextextended(s.id::text||':'||s.xmin::text,0)),0)::text row_versions_1,
  coalesce(bit_xor(hashtextextended(s.id::text||':'||s.xmin::text,8675309)),0)::text row_versions_2
  from public.market_price_publication_snapshots s where s.card_print_id=any($1::uuid[])
  and s.publication_set_id in(select publication_set_id from public.market_price_current_publication)`,[ids])).rows[0];
 result.market_price_qualification_decisions=(await db.query(`select count(*)::int rows,
  coalesce(bit_xor(hashtextextended(d.id::text||':'||d.xmin::text,0)),0)::text row_versions_1,
  coalesce(bit_xor(hashtextextended(d.id::text||':'||d.xmin::text,8675309)),0)::text row_versions_2
  from public.market_price_qualification_decisions d where d.id in(select s.qualification_decision_id
   from public.market_price_publication_snapshots s where s.card_print_id=any($1::uuid[])
   and s.publication_set_id in(select publication_set_id from public.market_price_current_publication))`,[ids])).rows[0];
 result.sets=(await db.query(`select count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(s)::text),'' order by s.id),'')) digest
  from public.sets s where id in(select set_id from public.card_prints where id=any($1::uuid[]))`,[ids])).rows[0];
 return result;
}
async function parents(db,ids,lock=false){return (await db.query(`select to_jsonb(p) row from public.card_prints p where p.id=any($1::uuid[]) order by id ${lock?'for update':''}`,[ids])).rows.map(x=>x.row);}
async function receipts(db){return (await db.query(`select id::text,payload from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'_kind'='mcd22_rarity_receipt' order by id`,[SOURCE,MCD22_PLAN_FINGERPRINT])).rows;}
export async function verifyStagedSnapshots(db,receipt,source){
 const refs=receipt.payload.source_receipts;
 if(!Array.isArray(refs)||refs.length!==16||new Set(refs.map(r=>r.id)).size!==16||new Set(refs.map(r=>r.key)).size!==16)throw Error('MCD22_SNAPSHOT_RECEIPT_MISMATCH');
 const rows=(await db.query(`select id::text,payload from public.raw_imports where source=$1 and id=any($2::bigint[]) order by id`,[SOURCE,refs.map(r=>r.id)])).rows;
 if(rows.length!==16)throw Error('MCD22_DURABLE_SNAPSHOTS_MISSING');
 const expected=new Map([...source.products.map(p=>['product:'+p.product_id,p]),...source.groups.map(g=>['group:'+g.group_id,g])]);
 for(const row of rows){const key=row.payload.key,ref=refs.find(r=>r.id===row.id);
  if(!ref||ref.key!==key||row.payload._kind!=='mcd22_source_snapshot'||row.payload.package_fingerprint!==MCD22_PLAN_FINGERPRINT||
     row.payload.run_id!==receipt.payload.run_id||!expected.has(key)||!isDeepStrictEqual(row.payload.snapshot,expected.get(key)))throw Error('MCD22_DURABLE_SNAPSHOT_DRIFT');
 }
}
async function sourceProof(db,evidence,lock){
 const ids=evidence.map(r=>r.input.parent.id),productIds=evidence.map(r=>r.input.product.product_id),setId=evidence[0].input.set.id,groupId=evidence[0].input.group.group_id;
 const q=async(sql,args)=>(await db.query(sql,args)).rows.map(x=>x.row);
 if(lock){await db.query('select id from public.external_mappings where card_print_id=any($1::uuid[]) for share',[ids]);
  await db.query('select id from public.card_print_identity where card_print_id=any($1::uuid[]) and is_active for share',[ids]);
  await db.query('select id from public.card_print_traits where card_print_id=any($1::uuid[]) for share',[ids]);}
 const identity=await q('select to_jsonb(i) row from public.card_print_identity i where card_print_id=any($1::uuid[]) and is_active order by id',[ids]);
 const traits=await q('select to_jsonb(t) row from public.card_print_traits t where card_print_id=any($1::uuid[]) order by id',[ids]);
 const sets=await q(`select to_jsonb(s) row from public.sets s where id=$1 ${lock?'for share':''}`,[setId]);
 const mappings=await q(`with m as(select x.*,count(*) over(partition by source,external_id)::int owners,
  count(*) over(partition by source,card_print_id)::int parent_mappings from public.external_mappings x where active)
  select to_jsonb(m) row from m where card_print_id=any($1::uuid[]) and source='tcgplayer' order by id`,[ids]);
 const products=await q(`select to_jsonb(p) row from public.tcgcsv_source_products p where product_id=any($1::int[]) order by product_id ${lock?'for share':''}`,[productIds]);
 const groups=await q(`select to_jsonb(g) row from public.tcgcsv_source_groups g where group_id=$1 ${lock?'for share':''}`,[groupId]);
 const gs=(await db.query(`select product.group_id,count(distinct p.set_id)::int set_count,array_agg(distinct p.set_code) set_codes
  from public.tcgcsv_source_products product join public.external_mappings m on m.source='tcgplayer' and m.active and m.external_id=product.product_id::text
  join public.card_prints p on p.id=m.card_print_id where product.group_id=$1 group by 1`,[groupId])).rows;
 const runIds=[...new Set([...products,...groups].map(r=>r.last_seen_run_id))];
 const runs=plain((await db.query('select id,status,sync_mode,failed_count,started_at,finished_at from public.tcgcsv_source_sync_runs where id=any($1::uuid[]) order by id',[runIds])).rows);
 if(identity.length!==15||sets.length!==1||mappings.length!==15||products.length!==15||groups.length!==1||gs.length!==1)throw Error('MCD22_SOURCE_MEMBERSHIP_DRIFT');
 for(const row of evidence){const old=row.input,id=old.parent.id,current={...old,
  identities:identity.filter(x=>x.card_print_id===id),traits:traits.filter(x=>x.card_print_id===id),set:sets[0],
  mapping:mappings.find(x=>x.id===old.mapping.id),product:products.find(x=>x.product_id===old.product.product_id),group:groups[0],groupSets:gs[0],runs};
  for(const key of ['identities','traits','set','mapping','product','group','groupSets'])if(!isDeepStrictEqual(current[key],old[key]))throw Error('MCD22_FROZEN_'+key.toUpperCase()+'_DRIFT');
  if(!isDeepStrictEqual(evaluateMcd22Candidate(current),row.decision))throw Error('MCD22_SOURCE_ADMISSION_DRIFT');
 }
 return {digest:hash({identity,traits,sets,mappings,products,groups,gs}),products,groups};
}
export async function runMcd22Rarity({mode='inspect',approval=null}={}){
 if(!['inspect','rollback-proof','apply','verify'].includes(mode))throw Error('INVALID_MODE');
 const mutating=['rollback-proof','apply'].includes(mode);if(mutating&&approval!=='PROCEED')throw Error('PROCEED_REQUIRED');
 const read=f=>fs.readFileSync(path.join(dir,f)),plan=JSON.parse(read('mcd22-execution-plan.json'));
 const evidence=validateMcd22Plan(plan,read('mcd22-frozen-candidates.json'),read('mcd22_candidate_policy.mjs'),read('mcd22-preflight-v2.json'));
 const ids=evidence.map(r=>r.input.parent.id),config=dotenv.parse(fs.readFileSync(path.join(root,'.env.local'))),u=new URL(config.SUPABASE_DB_URL);
 if(new URL(config.SUPABASE_URL).hostname!==PROJECT+'.supabase.co'||!fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8').includes(PROJECT)||!`${u.hostname} ${decodeURIComponent(u.username)}`.includes(PROJECT))throw Error('ENVIRONMENT_MISMATCH');
 console.log(`REMOTE ${mutating?'GUARDED '+mode.toUpperCase():'READ ONLY'}: ${config.SUPABASE_URL}`);
 const settings={connectionString:config.SUPABASE_DB_URL,connectionTimeoutMillis:10000,application_name:EXEC},db=new Client(settings),ledger=new Client(settings);
 const runId=crypto.randomUUID(),writer=writerFingerprint(),report={version:'MCD22_RARITY_APPLY_V1',run_id:runId,mode,package_fingerprint:MCD22_PLAN_FINGERPRINT,writer_fingerprint:writer,started_at:new Date().toISOString(),status:'started',stages:[]};
 const reportPath=path.join(dir,`mcd22-run-${runId}.json`),save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 const stage=name=>{report.stages.push({name,at:new Date().toISOString()});save();};
 let tx=false,logged=false,commitStarted=false,committed=false;
 try{
  await db.connect();await ledger.connect();
  if(mutating){await ledger.query(`insert into admin.import_runs(id,kind,scope,status,started_at) values($1,$2,$3::jsonb,'running',$4)`,[runId,EXEC,json({package_fingerprint:MCD22_PLAN_FINGERPRINT,mode,writer_fingerprint:writer}),report.started_at]);logged=true;}
  await db.query(`begin isolation level serializable ${mutating?'read write':'read only'}`);tx=true;
  await db.query("set local statement_timeout='60s'");await db.query("set local lock_timeout='5s'");
  if(mutating)await db.query('select pg_advisory_xact_lock(hashtext($1))',[EXEC]);
  report.sanity=(await db.query(`select (select count(*)::int from public.card_prints) parents,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`)).rows[0];
  if(report.sanity.parents<40000||report.sanity.sets<150||report.sanity.traits<5000)throw Error('ENVIRONMENT_COUNT_GATE');
  const triggers=(await db.query(`select tgrelid::regclass::text relation,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid in('public.card_prints'::regclass,'public.raw_imports'::regclass) and not tgisinternal order by tgrelid,tgname`)).rows;
  if(triggers.length!==1||triggers[0].relation!=='card_prints'||!triggers[0].definition.includes('UPDATE OF set_id, set_identity_model'))throw Error('MCD22_TRIGGER_DRIFT');
  const before=await parents(db,ids,mutating),existing=await receipts(db);if(existing.length>1)throw Error('MCD22_DUPLICATE_RECEIPT');
  report.state=classifyMcd22State(evidence,before,existing.length===1);
  const source=await sourceProof(db,evidence,mutating);report.source_digest=source.digest;stage('source_and_scope_verified');
  if(report.state==='already_applied'||mode==='verify'){
   if(report.state!=='already_applied'||!isDeepStrictEqual(existing[0].payload.changes,plan.rows))throw Error('MCD22_RECEIPT_MISMATCH');
   await verifyStagedSnapshots(db,existing[0],source);
   report.status='verified_already_applied';report.receipt_id=existing[0].id;await db.query('rollback');tx=false;
  }else if(mode==='inspect'){report.status='preflight_passed';await db.query('rollback');tx=false;}
  else{
   if(mode==='apply'){
    const proof=JSON.parse(read(`mcd22-rollback-proof-${MCD22_PLAN_FINGERPRINT}-${writer}.json`));
    if(proof.status!=='rollback_proof_passed'||proof.package_fingerprint!==MCD22_PLAN_FINGERPRINT||proof.writer_fingerprint!==writer)throw Error('MCD22_ROLLBACK_PROOF_STALE');
   }
   report.protected_before=await protectedState(db,ids);const preimage=hash(before);
   await assertExecuteCanonWriteV1({execution_name:EXEC,write_target:db,audit_target:db,ledger_target:ledger,transaction_control:'external',
    payload_snapshot:{package_fingerprint:MCD22_PLAN_FINGERPRINT,mode},actor_type:'system_worker',source_worker:EXEC,source_system:'catalog_metadata',
    contract_assertions:[{ok:report.state==='pending',contract_name:'NO_ASSUMPTION_RULE',reason:'Exact fifteen source-backed null-rarity candidates'}],
    write:async()=>{
     const snapshots=[...source.products.map(x=>({key:'product:'+x.product_id,object:x})),...source.groups.map(x=>({key:'group:'+x.group_id,object:x}))];
     const staged=(await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes)
      select $1,jsonb_build_object('_kind','mcd22_source_snapshot','package_fingerprint',$2::text,'run_id',$3::text,'key',x.key,'snapshot',x.object),
       'normalized',now(),'Preserved source warehouse JSONB; no original HTTP byte claim'
      from jsonb_to_recordset($4::jsonb) x(key text,object jsonb) returning id::text,payload->>'key' key`,[SOURCE,MCD22_PLAN_FINGERPRINT,runId,json(snapshots)])).rows;
     if(staged.length!==16)throw Error('MCD22_RAW_STAGE_COUNT');
     const changed=await db.query(`update public.card_prints set rarity='Promo' where id=any($1::uuid[]) and rarity is null returning id`,[ids]);
     if(changed.rowCount!==15)throw Error('MCD22_WRITE_COUNT');
     const after=await parents(db,ids);classifyMcd22State(evidence,after,true);
     const payload={_kind:'mcd22_rarity_receipt',package_fingerprint:MCD22_PLAN_FINGERPRINT,writer_fingerprint:writer,run_id:runId,
      changes:plan.rows,source_receipts:staged,preimage_hash:preimage,source_digest:source.digest};
     report.receipt_id=(await db.query(`insert into public.raw_imports(source,payload,status,processed_at,notes) values($1,$2::jsonb,'normalized',now(),$3) returning id::text`,[SOURCE,json(payload),'Guarded null-only parent rarity repair; exact preimages in frozen package'])).rows[0].id;
    },proofs:[{name:'mcd22_protected_state',contract_name:'IDENTITY_CONTRACT_SUITE_V1',run:async()=>{
     const after=await protectedState(db,ids),sourceAfter=await sourceProof(db,evidence,false);
     return {ok:isDeepStrictEqual(report.protected_before,after)&&sourceAfter.digest===source.digest,reason:'Only fifteen target rarity fields may change'};
    }}]});
   stage('write_and_proofs_passed');
   if(mode==='rollback-proof'){
    await db.query('rollback');tx=false;await db.query('begin isolation level serializable read only');tx=true;
    const restored=await parents(db,ids);if(hash(restored)!==preimage||classifyMcd22State(evidence,restored,false)!=='pending'||(await receipts(db)).length)throw Error('MCD22_ROLLBACK_FAILED');
    if((await db.query(`select id from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2`,[SOURCE,MCD22_PLAN_FINGERPRINT])).rowCount)throw Error('MCD22_RAW_ROLLBACK_FAILED');
    if(!isDeepStrictEqual(await protectedState(db,ids),report.protected_before)||(await sourceProof(db,evidence,false)).digest!==source.digest)throw Error('MCD22_PROTECTED_ROLLBACK_FAILED');
    await db.query('rollback');tx=false;report.status='rollback_proof_passed';
   }else{
    commitStarted=true;await db.query('commit');tx=false;committed=true;
    await db.query('begin isolation level serializable read only');tx=true;
    const durable=await receipts(db),after=await parents(db,ids);classifyMcd22State(evidence,after,true);
    if(durable.length!==1||durable[0].id!==report.receipt_id||!isDeepStrictEqual(durable[0].payload.changes,plan.rows))throw Error('MCD22_DURABLE_RECEIPT_FAILED');
    await verifyStagedSnapshots(db,durable[0],source);
    await db.query('rollback');tx=false;report.status='applied_and_verified';
   }
  }
  report.finished_at=new Date().toISOString();if(logged)await ledger.query(`update admin.import_runs set status='success',finished_at=now(),scope=$2::jsonb where id=$1`,[runId,json({package_fingerprint:MCD22_PLAN_FINGERPRINT,mode,writer_fingerprint:writer,status:report.status})]);
  stage(report.status);if(report.status==='rollback_proof_passed')fs.writeFileSync(path.join(dir,`mcd22-rollback-proof-${MCD22_PLAN_FINGERPRINT}-${writer}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  return report;
 }catch(error){
  if(tx)await db.query('rollback').catch(()=>{});report.status=committed?'committed_readback_failed':commitStarted?'commit_outcome_unknown_requires_readback':'failed_rolled_back';
  report.error={code:error.code??'MCD22_FAILED',message:String(error.message??error).replace(config.SUPABASE_DB_URL,'[redacted]')};report.finished_at=new Date().toISOString();
  if(logged)await ledger.query(`update admin.import_runs set status='error',finished_at=now(),error=$2,scope=$3::jsonb where id=$1`,[runId,report.error.message,json({package_fingerprint:MCD22_PLAN_FINGERPRINT,mode,status:report.status})]).catch(()=>{});
  save();throw Error(report.status+': '+report.error.message);
 }finally{await db.end().catch(()=>{});await ledger.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),v=k=>args[args.indexOf(k)+1];
 runMcd22Rarity({mode:args.includes('--mode')?v('--mode'):'inspect',approval:args.includes('--approval')?v('--approval'):null})
  .then(r=>console.log(json({status:r.status,run_id:r.run_id,receipt_id:r.receipt_id??null}))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
