import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';
import dotenv from 'dotenv';
import pg from 'pg';
import { buildPokemonSealedWorldPlanV1, validatePokemonSealedWorldPlanV1,
  classifyPokemonSealedProductV1, pokemonSealedHashV1 } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { pgSslConfig } from './japanese_master_index_v4/read_only_guard_v1.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{
  const i=arg.indexOf('='); if(i<0) throw new Error('Expected --key=value');
  return [arg.slice(2,i),arg.slice(i+1)];
}));
if(!args.inventory || !args.out) throw new Error('--inventory and --out required');
const bytes=await fs.readFile(path.join(args.inventory,'source_products.jsonl.gz'));
const hashes=JSON.parse(await fs.readFile(path.join(args.inventory,'artifact_hashes.json'),'utf8'));
if(pokemonSealedHashV1(bytes)!==hashes['source_products.jsonl.gz']) throw new Error('Inventory hash mismatch');
const rows=gunzipSync(bytes).toString().trim().split('\n').map(JSON.parse);
const selected=rows.filter(row=>classifyPokemonSealedProductV1(row).classification==='sealed_candidate');
dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,
  ssl:pgSslConfig(process.env.SUPABASE_DB_URL),connectionTimeoutMillis:30000,statement_timeout:120000});
await c.connect();
try {
  await c.query('begin isolation level repeatable read read only');
  const sync=(await c.query(`select id,status,observed_on::text,finished_at from tcgcsv_source_sync_runs
    where sync_mode='current_full_sync' and status='completed' order by created_at desc,id desc limit 1`)).rows[0];
  if(!sync || Date.now()-Date.parse(sync.observed_on)>7*86400000) throw new Error('Source sync is missing or stale');
  if (sync.finished_at instanceof Date) sync.finished_at = sync.finished_at.toISOString();
  const prices=[];
  for(let i=0;i<selected.length;i+=100){
    const batch=(await c.query(`select distinct on(product_id,subtype_name_normalized)
      product_id,source_price_row_identity,subtype_name_normalized,observed_on::text,
      currency,market_price,low_price,mid_price,high_price,direct_low_price,payload_hash
      from tcgcsv_source_price_daily_observations where product_id=any($1::bigint[])
      order by product_id,subtype_name_normalized,observed_on desc,updated_at desc,id desc`,
    [selected.slice(i,i+100).map(row=>row.product_id)])).rows;
    prices.push(...batch.map(row=>({...row,product_id:Number(row.product_id)})));
    if(i%500===0) console.log(`Price evidence ${i}/${selected.length}`);
  }
  await c.query('rollback');
  const plan=buildPokemonSealedWorldPlanV1({sourceRows:rows,latestPriceRows:prices,
    latestSync:sync,producerCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()});
  const validation=validatePokemonSealedWorldPlanV1(plan);
  if(!validation.valid) throw new Error(validation.findings.join(','));
  const dispositions=rows.map(row=>({product_id:Number(row.product_id),name:row.name,
    category_id:Number(row.category_id),...classifyPokemonSealedProductV1(row)}));
  const summary={version:plan.version,counts:plan.counts,qualification_status_counts:plan.qualification_status_counts,
    source_fingerprint_sha256:plan.source_fingerprint_sha256,plan_fingerprint_sha256:plan.plan_fingerprint_sha256,
    source_count:rows.length,classified_sealed:selected.length,validation,database_writes:0};
  await fs.mkdir(args.out,{recursive:true});
  for(const [name,value] of Object.entries({'plan.json.gz':gzipSync(JSON.stringify(plan)),
    'prices.jsonl.gz':gzipSync(prices.map(JSON.stringify).join('\n')),
    'dispositions.jsonl.gz':gzipSync(dispositions.map(JSON.stringify).join('\n')),
    'summary.json':JSON.stringify(summary,null,2)+'\n'})) await fs.writeFile(path.join(args.out,name),value);
  console.log(JSON.stringify(summary,null,2));
} finally {await c.end();}
