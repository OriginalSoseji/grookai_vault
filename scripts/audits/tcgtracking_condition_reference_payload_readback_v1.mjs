import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import '../../backend/env.mjs';
import {VERSION,SOURCE,STAGED_STATUS,hash} from '../../backend/pricing/tcgtracking_condition_reference_v1.mjs';
import {projectScopedUpstream} from '../../backend/pricing/tcgtracking_condition_reference_projection_v1.mjs';
import {conditionReferenceDatabaseConfigV1} from '../../backend/pricing/condition_reference_database_config_v1.mjs';

// Independent read-only verification of complete stored payloads, not just row counts.
const out=path.resolve(process.argv[2]??'');
if(process.argv.length!==3)throw new Error('Provide the exact completed artifact directory');
const read=async name=>JSON.parse(await fs.readFile(path.join(out,name),'utf8'));
const plan=await read('plan.json');const applied=await read('apply.json');
if(plan.version!==VERSION||applied.plan_hash!==hash(plan)||applied.groups.length!==plan.groups.length)throw new Error('INCOMPLETE_OR_CHANGED_APPLY');
const expected=new Map(applied.groups.map(group=>[String(group.raw_import_id),group]));
if(expected.size!==plan.groups.length)throw new Error('DUPLICATE_APPLIED_IDS');
const project='ycdxbpibncqcchqiihfz';
const route=new URL(process.env.SUPABASE_DB_URL);
if(new URL(process.env.SUPABASE_URL).hostname!==`${project}.supabase.co`||(route.hostname!==`db.${project}.supabase.co`&&!(route.hostname.endsWith('.supabase.com')&&decodeURIComponent(route.username).endsWith(`.${project}`))))throw new Error('ENVIRONMENT_MISMATCH');
const db=new pg.Client({...conditionReferenceDatabaseConfigV1(process.env.SUPABASE_DB_URL,{ca:process.env.SUPABASE_DB_CA_CERT?.trim()||undefined,readOnly:true,insecureTlsEnvironment:process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0',applicationName:'tcgtracking_condition_payload_readback_v1'}),statement_timeout:60000});
let groups=0;let prices=0;const seen=new Set();
try{
  await db.connect();await db.query('begin isolation level repeatable read read only');
  const ids=[...expected.keys()];
  for(let start=0;start<ids.length;start+=20){
    const records=(await db.query('select id,source,status,notes,payload from public.raw_imports where id=any($1::bigint[])',[ids.slice(start,start+20)])).rows;
    if(records.length!==ids.slice(start,start+20).length)throw new Error('MISSING_RAW_RECEIPT');
    for(const record of records){
      const receipt=expected.get(String(record.id));const payload=record.payload;
      if(seen.has(String(record.id)))throw new Error('DUPLICATE_READBACK_ID');seen.add(String(record.id));
      if(record.source!==SOURCE||record.status!==STAGED_STATUS||payload.version!==VERSION||payload._kind!=='condition_price_reference_group_v1'||payload.acquisition_key!==receipt.acquisition_key||payload.app_visible!==false||payload.can_publish_price_directly!==false||payload.pricing_lane!=='reference')throw new Error('SOURCE_OR_PRIVACY_BOUNDARY_MISMATCH');
      if(hash(payload.normalized)!==receipt.normalized_sha256||payload.normalized.rows.length!==receipt.priced_count)throw new Error(`STORED_NORMALIZED_PAYLOAD_CHANGED_${record.id}`);
      const raw=await fs.readFile(path.join(out,`groups/${receipt.category_id}_${receipt.group_id}.raw.json`));
      if(hash(raw)!==receipt.raw_sha256)throw new Error('LOCAL_SOURCE_HASH_CHANGED');
      const scoped=projectScopedUpstream(JSON.parse(raw),plan.targets.filter(row=>row.category_id===receipt.category_id&&row.group_id===receipt.group_id));
      if(hash(payload.upstream)!==hash(scoped))throw new Error(`STORED_UPSTREAM_SKU_VALUES_CHANGED_${record.id}`);
      groups++;prices+=payload.normalized.rows.length;
    }
    if(start%100===0)console.log(JSON.stringify({phase:'payload_readback',groups,prices}));
  }
  const sourceRows=Number((await db.query('select count(*)::int as count from public.raw_imports where source=$1 and status=$2',[SOURCE,STAGED_STATUS])).rows[0].count);
  if(sourceRows!==expected.size)throw new Error('UNEXPECTED_EXTRA_SOURCE_ROWS');
  const pointer=(await db.query('select publication_set_id,run_id from public.market_price_current_publication where singleton')).rows[0];
  const before=await read('prewrite_readback.json');
  await db.query('rollback');
  const report={version:VERSION,verified_at:new Date().toISOString(),status:'all_stored_payload_hashes_verified',groups,prices,source_rows:sourceRows,duplicate_ids:0,normalized_hash_mismatches:0,upstream_hash_mismatches:0,app_visible:false,current_publication:pointer,publication_pointer_matches_prewrite:pointer.publication_set_id===before.current_publication[0].publication_set_id&&pointer.run_id===before.current_publication[0].run_id};
  await fs.writeFile(path.join(out,'payload_readback.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){
  await db.query('rollback').catch(()=>{});
  await fs.writeFile(path.join(out,`payload_readback_failure_${Date.now()}.json`),JSON.stringify({version:VERSION,failed_at:new Date().toISOString(),error_code:'PAYLOAD_READBACK_FAILED',error_detail:error.message},null,2)+'\n');
  throw error;
}finally{await db.end();}
