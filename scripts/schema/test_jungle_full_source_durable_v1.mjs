// Full actual-source fixture and durable worker shadow. Fixed isolated target only.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import readline from 'node:readline';
import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import pg from 'pg';
import {buildJungleExecutionRows} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';
import {inspectJungleRetainedRuntimeV1} from './inspect_jungle_retained_runtime_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',out=base+'/full-source-durable-v1';
const fixture=base+'/full-416-v18',project='jungle-edition-full-416-v18-20261001',port=65040;
assert.equal(process.argv.length,3);const mode=process.argv[2];assert.ok(['seed','shadow'].includes(mode));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex'),quote=s=>'"'+s.replaceAll('"','""')+'"';
const source=read(out+'/receipt.json');assert.equal(source.status,'passed');assert.equal(source.readOnly,true);assert.equal(source.tlsVerified,true);assert.equal(source.sanity.migrations,413);assert.ok(Date.now()-Date.parse(source.sourceRun.finished_at)<36*3600000);
const freeze=read(fixture+'/freeze.json');assert.equal(freeze.project,project);assert.equal(read(fixture+'/replay-result.json').status,'passed');
const finalUpgrade=read(base+'/populated-source-v1/resolved-readiness-upgrade-receipt.json');assert.equal(finalUpgrade.status,'passed');assert.equal(finalUpgrade.migrations,419);
for(const [name,hash]of Object.entries(read(base+'/jungle-source-baseline-413-latest.json').sourceHashes)){assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),hash);assert.equal(sha(fs.readFileSync(fixture+'/supabase/migrations/'+name)),hash);}
const runtimeAttestation=inspectJungleRetainedRuntimeV1();
const capacity=()=>{const s=fs.statfsSync('C:/');return Number(s.bavail)*Number(s.bsize);};assert.ok(capacity()>12*1024**3,'At least12GiB free before full durable fixture');
const attempt=out+'/'+mode+'-'+Date.now();fs.mkdirSync(attempt);const save=(n,v)=>fs.writeFileSync(attempt+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),project,port,mode,consumed:true,sourceReceiptSha256:sha(fs.readFileSync(out+'/receipt.json')),scriptSha256:sha(fs.readFileSync(new URL(import.meta.url))),freeBytes:capacity(),productionWrites:0});
save('runtime-attestation.json',runtimeAttestation);
const c=new pg.Client({host:'127.0.0.1',port,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000,statement_timeout:120000});await c.connect();
const original=c.query.bind(c);c.query=(...args)=>{assert.ok(capacity()>3*1024**3,'Stop local writes before exhausting disk');return original(...args);};
const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json');
const artifactRoot=base+'/catalog-authority-v2',artifacts=new Map(read(artifactRoot+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(artifactRoot,r.path))]));
async function small(table){const lines=[];for await(const line of readline.createInterface({input:fs.createReadStream(out+'/'+table+'.ndjson.gz').pipe(zlib.createGunzip()),crlfDelay:Infinity}))lines.push(JSON.parse(line));return lines;}
try{
 const state=(await c.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations,(select count(*)::int from auth.users) users,(select count(*)::int from market_price_current_publication) pointers")).rows[0];assert.match(state.address,/^10\.248\.6\.\d+$/);assert.equal(state.workers,'0');assert.equal(state.migrations,419);assert.equal(state.pointers,0);
 if(mode==='seed'){
  assert.ok(!fs.existsSync(out+'/seed-receipt.json'),'Never reseed a completed fixture');assert.equal(state.users,0);assert.equal((await c.query('select count(*)::int n from market_price_pipeline_runs')).rows[0].n,0);
  const remoteGames=await small('games'),localGames=(await c.query('select id,code from games')).rows;const gameMap=Object.fromEntries(remoteGames.filter(g=>localGames.some(l=>l.code===g.code)).map(g=>[g.id,localGames.find(l=>l.code===g.code).id]));save('local-game-translation.json',gameMap);
  const order=['finish_keys','catalog_game_release_controls','tcgcsv_source_sync_runs','tcgcsv_source_categories','tcgcsv_source_groups','tcgcsv_source_products','tcgcsv_source_artifacts','tcgcsv_source_price_daily_observations','sets','catalog_set_release_controls','card_prints','card_printings','card_print_identity','card_printing_truth_reviews','external_mappings','external_printing_mappings','market_evidence_variant_assignments'];
  for(const table of order){
   const meta=source.metadata.find(m=>m.name===table);assert.ok(meta);assert.equal(sha(fs.readFileSync(out+'/'+meta.file)),meta.compressedSha256);
   const proofPath=out+'/loaded-'+table+'.json';if(fs.existsSync(proofPath)){assert.equal(read(proofPath).sourceSha256,meta.sha256);console.log(JSON.stringify({stage:'retained_table',table}));continue;}
   const columns=(await c.query("select column_name,is_generated from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",[table])).rows;assert.ok(columns.length);
   const fields=columns.filter(f=>f.is_generated==='NEVER').map(f=>f.column_name);const pk=(await c.query("select a.attname name from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey) where i.indrelid=$1::regclass and i.indisprimary order by a.attnum",[table])).rows.map(r=>r.name);assert.ok(pk.length);
   const upsert=['finish_keys','catalog_game_release_controls'].includes(table);
   const transform=table==='card_prints'?"jsonb_set(value,'{game_id}',coalesce(to_jsonb(($2::jsonb->>(value->>'game_id'))::uuid),'null'::jsonb))":'value';
   const relation=`select * from jsonb_populate_recordset(null::public.${table},(select jsonb_agg(${transform}) from jsonb_array_elements($1::jsonb)))`;
   const columnsSql=fields.map(quote).join(',');const conflict=upsert?` on conflict (${pk.map(quote).join(',')}) do update set ${fields.filter(f=>!pk.includes(f)).map(f=>quote(f)+'=excluded.'+quote(f)).join(',')}`:'';
   const insert=`insert into public.${table}(${columnsSql}) select ${columnsSql} from (${relation}) r${conflict}`;
   const compare=`with expected as (${relation}) select count(*)::int n from expected e join public.${table} actual on ${pk.map(k=>'actual.'+quote(k)+'=e.'+quote(k)).join(' and ')} where to_jsonb(actual)=to_jsonb(e)`;
   await c.query('begin');
   let n=0,batch=[];const digest=createHash('sha256');const input=fs.createReadStream(out+'/'+meta.file).pipe(zlib.createGunzip());input.on('data',b=>digest.update(b));
   const flush=async()=>{if(!batch.length)return;const params=['['+batch.join(',')+']'];if(table==='card_prints')params.push(JSON.stringify(gameMap));await c.query(insert,params);assert.equal((await c.query(compare,params)).rows[0].n,batch.length,table+' exact readback');n+=batch.length;batch=[];};
   try{for await(const line of readline.createInterface({input,crlfDelay:Infinity})){if(table==='card_prints'){const row=JSON.parse(line);assert.ok(row.game_id===null||gameMap[row.game_id],'Source game must have exact local code counterpart');}batch.push(line);if(batch.length===500)await flush();}await flush();assert.equal(n,meta.rows);assert.equal(digest.digest('hex'),meta.sha256);await c.query('commit');}catch(e){await original('rollback');throw e;}
   await c.query('analyze public.'+table);fs.writeFileSync(proofPath,JSON.stringify({at:new Date().toISOString(),status:'passed',table,rows:n,sourceSha256:meta.sha256,exactReadback:true,gameIdTranslation:table==='card_prints'},null,2),{flag:'wx'});console.log(JSON.stringify({stage:'loaded',table,rows:n,freeBytes:capacity()}));
  }
  const cards=(await c.query('select to_jsonb(t) value from card_prints t where set_id=$1 order by id',[manifest.authority.set_id])).rows.map(r=>r.value);assert.equal(cards.length,83);
  const prior=JSON.parse(String(artifacts.get('jungle:production-snapshot')));
  // Historical authority used pg Date values (milliseconds); the full export
  // retains PostgreSQL timestamp precision. Normalize only for this comparison.
  const historicalTimes=row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,k.endsWith('_at')&&v?new Date(v).toISOString():v]));
  for(const card of cards){const old=prior.cards.find(p=>p.id===card.id);assert.ok(old);assert.deepEqual(historicalTimes({...card,game_id:old.game_id}),historicalTimes(old));}
  const localGame=(await c.query("select id from games where code='pokemon'")).rows[0].id,planned=buildJungleExecutionRows(manifest,artifacts,{asOf:new Date().toISOString(),gameId:localGame});
  await c.query('begin');
  for(const [table,rows]of [['pokemon_species',prior.species],...Object.entries(planned)]){const generated=(await c.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated<>'NEVER'",[table])).rows.map(r=>r.column_name);const fields=Object.keys(rows[0]).filter(k=>!generated.includes(k)).map(quote).join(',');await c.query(`insert into ${table}(${fields}) select ${fields} from jsonb_populate_recordset(null::${table},$1::jsonb)`,[JSON.stringify(rows)]);}
  const links=(await c.query('select * from jungle_edition_identity_links_v1')).rows,products=(await c.query('select * from tcgcsv_source_products where category_id=3 and group_id=635')).rows;
  for(const l of links){const p=manifest.parents.find(p=>p.id===l.card_print_id),matches=products.filter(product=>product.extended_data?.filter(x=>x.name==='Number'&&[p.printed_coordinate+'/64',p.printed_coordinate.padStart(2,'0')+'/64'].includes(x.value)).length===1);assert.equal(matches.length,1);await c.query("insert into tcgplayer_jungle_edition_bindings_v1(id,identity_link_id,product_id,source_subtype,source_product_payload_hash,manifest_sha256,review_ref,state) values($1,$2,$3,$4,$5,$6,$7,'staged')",[randomUUID(),l.id,matches[0].product_id,(l.edition==='first_edition'?'1st Edition':'Unlimited')+(l.finish_key==='holo'?' Holofoil':''),matches[0].payload_hash,manifest.fingerprint,'local-full-source:'+sha(fs.readFileSync(out+'/receipt.json'))]);}
  const user=randomUUID();await c.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)",[user,user+'@full-source-fixture.invalid']);for(let i=0;i<5;i++)await c.query("select admin_vault_instance_create_v1(p_user_id=>$1::uuid,p_card_print_id=>$2::uuid,p_condition_label=>'NM')",[user,manifest.parents[0].legacy_card_print_id]);
  await c.query("update jungle_edition_identity_links_v1 set state='active'");await c.query("update tcgplayer_jungle_edition_bindings_v1 set state='active'");assert.equal((await c.query('select count(*)::int n from tcgplayer_jungle_edition_bindings_v1 where tcgplayer_jungle_binding_valid_v1(id,true)')).rows[0].n,128);await c.query('commit');
  const receipt={at:new Date().toISOString(),status:'passed',project,sourceRows:source.counts.sourceRows,canonicalAdditions:128,activeLocalBindings:128,syntheticLegacyCopies:5,productionWrites:0,freeBytes:capacity()};save('receipt.json',receipt);fs.writeFileSync(out+'/seed-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
 }else{
  assert.equal(read(out+'/seed-receipt.json').status,'passed');const before=(await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows;assert.equal(before.length,5);
  for(const k of Object.keys(process.env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|MTG_PRICING/.test(k))delete process.env[k];fs.writeFileSync(attempt+'/empty.env','',{flag:'wx'});process.env.DOTENV_CONFIG_PATH=attempt+'/empty.env';
  const {runDurable,latestSourceRun,parseArgs}=await import('../workers/tcgplayer_market_publication_worker_v1.mjs');await c.query('set role service_role');const runSource=await latestSourceRun(c);assert.equal(runSource.id,source.sourceRun.id);
  const args={...parseArgs(['--shadow']),canaryDefinition:null,batchSize:1000,limit:null},plan={run_key:'jungle-full-source-shadow-'+randomUUID(),commit_sha:'local-fixture-source:'+sha(fs.readFileSync('scripts/workers/tcgplayer_market_publication_worker_v1.mjs'))};save('run-plan.json',plan);
  const result=await runDurable(c,args,runSource,plan);save('result.json',result);assert.equal(result.run.state,'shadow_verified');assert.equal(result.reconciliation.selected_count,source.counts.sourceRows);assert.equal(result.reconciliation.eligible_count,source.counts.baselineEligible+128);assert.equal(result.reconciliation.snapshot_count,source.counts.baselineEligible+128);assert.deepEqual(result.reconciliation.mismatches,[]);
  const retried=await runDurable(c,args,runSource,plan);assert.equal(retried.run.id,result.run.id);assert.deepEqual(retried.reconciliation,result.reconciliation);
  await c.query('reset role');assert.deepEqual((await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows,before);assert.equal((await c.query('select count(*)::int n from market_price_current_publication')).rows[0].n,0);
  const editions=(await c.query('select count(*)::int n from market_price_publication_snapshots where run_id=$1 and edition_assignment_id is not null',[result.run.id])).rows[0].n;assert.equal(editions,128);
  const receipt={at:new Date().toISOString(),status:'passed',project,run:result.run.id,sourceRun:runSource.id,reconciliation:result.reconciliation,editionSnapshots:128,copiesPreserved:5,idempotentResume:true,productionWrites:0,priceActivation:false,fullSourceDurableShadow:true,freeBytes:capacity()};save('receipt.json',receipt);fs.writeFileSync(out+'/shadow-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
 }
}catch(e){await original('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack,freeBytes:capacity()});throw e;}finally{await c.end();}
