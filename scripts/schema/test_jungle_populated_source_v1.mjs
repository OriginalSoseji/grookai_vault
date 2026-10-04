// Actual captured Jungle source against the retained isolated 415 upgrade lab.
// This has no configurable target and never publishes a current-price pointer.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {buildJungleExecutionRows} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const out=base+'/populated-source-v1',fixture=base+'/upgrade-415-v17',project='jungle-edition-upgrade-415-v17-20261001';
assert.equal(process.argv.length,3);const mode=process.argv[2];assert.ok(['seed','shadow'].includes(mode));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(fixture+'/freeze.json');assert.equal(freeze.project,project);assert.equal(read(fixture+'/upgrade-result.json').status,'passed');
for(const [name,h]of Object.entries(freeze.sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),h,name);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000});
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];
assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
for(const bindings of Object.values(JSON.parse(docker('inspect',project+'-relay'))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
const snapshot=read(out+'/production-snapshot.json'),review=read(out+'/review.json');
assert.equal(review.snapshot_sha256,sha(fs.readFileSync(out+'/production-snapshot.json')));
assert.equal(review.summary.compatible,128);assert.equal(review.summary.held,0);
assert.equal(review.reconciliation.changedDependencies,0);assert.equal(review.reconciliation.removedDependencies.length,0);
assert.ok(Object.values(review.reconciliation.comparisons).every(v=>v.unchanged));
assert.ok(Date.now()-Date.parse(snapshot.at)<3600000,'Refresh snapshot after one hour');
const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json');
const artifactRoot=base+'/catalog-authority-v2',artifacts=new Map(read(artifactRoot+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(artifactRoot,r.path))]));
const attempt=out+'/'+mode+'-'+Date.now();fs.mkdirSync(attempt);
const save=(name,value)=>fs.writeFileSync(attempt+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),mode,project,port:64940,consumed:true,productionWrites:0,scriptSha256:sha(fs.readFileSync(new URL(import.meta.url))),snapshotSha256:review.snapshot_sha256});
const c=new pg.Client({host:'127.0.0.1',port:64940,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000,statement_timeout:120000});
await c.connect();
const copies=async()=>(await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows;
try{
 const target=(await c.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.match(target.address,/^10\.248\.5\.\d+$/);assert.equal(target.workers,'0');assert.equal(target.migrations,mode==='seed'?415:419);if(mode==='shadow'){const upgrade=read(out+'/resolved-readiness-upgrade-receipt.json');assert.equal(upgrade.status,'passed');assert.equal(upgrade.migrationSha256,sha(fs.readFileSync('supabase/migrations/20261001223000_jungle_edition_resolved_readiness_v1.sql')));}
 assert.equal((await c.query('select count(*)::int n from market_price_current_publication')).rows[0].n,0);
 if(mode==='seed'){
  assert.ok(!fs.existsSync(out+'/seed-receipt.json'),'Never reseed retained fixtures');
  assert.equal((await c.query('select count(*)::int n from card_prints where set_id=$1',[manifest.authority.set_id])).rows[0].n,0);
  assert.equal((await c.query('select count(*)::int n from tcgcsv_source_products')).rows[0].n,0);
  const before=await copies();assert.equal(before.length,2);save('prior-copies.private.json',before);
  const allowed=new Set(['pokemon_species','card_prints','card_printings','raw_imports','card_printing_truth_reviews','card_print_species','jungle_edition_identity_links_v1','tcgcsv_source_sync_runs','tcgcsv_source_categories','tcgcsv_source_groups','tcgcsv_source_products','tcgcsv_source_artifacts','tcgcsv_source_price_daily_observations']);
  const insert=async(table,rows)=>{assert.ok(allowed.has(table));assert.ok(rows.length);
   const generated=(await c.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated<>'NEVER'",[table])).rows.map(r=>r.column_name);
   const fields=Object.keys(rows[0]).filter(k=>!generated.includes(k)).map(k=>'"'+k+'"').join(',');
   await c.query(`insert into public.${table}(${fields}) select ${fields} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows)]);
  };
  await c.query('begin');
  await c.query("insert into sets(id,code,name,game,identity_model,identity_domain_default) values($1,'base2','Jungle','pokemon','standard','pokemon_eng_standard')",[manifest.authority.set_id]);
  const gameId=(await c.query("select id from games where code='pokemon'")).rows[0].id;
  for(const [table,rows]of [['pokemon_species',snapshot.species],['card_prints',snapshot.cards.map(p=>({...p,game_id:gameId}))],['card_printings',snapshot.printings]])await insert(table,rows);
  const user=randomUUID();await c.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)",[user,user+'@jungle-source-fixture.invalid']);
  for(let i=0;i<5;i++)await c.query("select admin_vault_instance_create_v1(p_user_id=>$1::uuid,p_card_print_id=>$2::uuid,p_condition_label=>'NM')",[user,manifest.parents[0].legacy_card_print_id]);
  const planned=buildJungleExecutionRows(manifest,artifacts,{asOf:new Date().toISOString(),gameId});
  for(const [table,rows]of Object.entries(planned))await insert(table,rows);
  for(const [table,key]of [['tcgcsv_source_sync_runs','sourceRuns'],['tcgcsv_source_categories','sourceCategories'],['tcgcsv_source_groups','sourceGroups'],['tcgcsv_source_products','sourceProducts'],['tcgcsv_source_artifacts','sourceArtifacts'],['tcgcsv_source_price_daily_observations','observations']])await insert(table,snapshot[key]);
  const links=(await c.query('select * from jungle_edition_identity_links_v1 order by card_print_id')).rows;assert.equal(links.length,128);
  for(const l of links){const p=manifest.parents.find(p=>p.id===l.card_print_id),products=snapshot.sourceProducts.filter(product=>product.extended_data?.filter(x=>x.name==='Number'&&[p.printed_coordinate+'/64',p.printed_coordinate.padStart(2,'0')+'/64'].includes(x.value)).length===1);assert.equal(products.length,1);
   await c.query('insert into tcgplayer_jungle_edition_bindings_v1(id,identity_link_id,product_id,source_subtype,source_product_payload_hash,manifest_sha256,review_ref,state) values($1,$2,$3,$4,$5,$6,$7,\'staged\')',[randomUUID(),l.id,products[0].product_id,(l.edition==='first_edition'?'1st Edition':'Unlimited')+(l.finish_key==='holo'?' Holofoil':''),products[0].payload_hash,manifest.fingerprint,'local-source-review:'+review.snapshot_sha256]);
  }
  await c.query("update jungle_edition_identity_links_v1 set state='active'");await c.query("update tcgplayer_jungle_edition_bindings_v1 set state='active'");
  assert.equal((await c.query('select count(*)::int n from tcgplayer_jungle_edition_bindings_v1 where tcgplayer_jungle_binding_valid_v1(id,true)')).rows[0].n,128);
  assert.deepEqual((await copies()).filter(r=>before.some(b=>b.value.id===r.value.id)),before);
  assert.equal((await copies()).length,7);
  await c.query('commit');
  const receipt={at:new Date().toISOString(),status:'passed',project,sourceRun:snapshot.sourceRun.id,legacyParents:83,legacyChildren:84,canonicalParents:128,canonicalChildren:128,activeLocalLinks:128,activeLocalBindings:128,quotes:133,savedCopiesPreserved:2,syntheticLegacyCopiesAdded:5,productionWrites:0,priceActivation:false};
  save('receipt.json',receipt);fs.writeFileSync(out+'/seed-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
 }else{
  assert.equal(read(out+'/seed-receipt.json').status,'passed');const before=await copies();assert.equal(before.length,7);
  for(const name of Object.keys(process.env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|MTG_PRICING/.test(name))delete process.env[name];
  fs.writeFileSync(attempt+'/empty.env','',{flag:'wx'});process.env.DOTENV_CONFIG_PATH=attempt+'/empty.env';
  const workerSha=sha(fs.readFileSync('scripts/workers/tcgplayer_market_publication_worker_v1.mjs'));
  const {runDurable,latestSourceRun,parseArgs}=await import('../workers/tcgplayer_market_publication_worker_v1.mjs');
  await c.query('set role service_role');const source=await latestSourceRun(c);assert.equal(source.id,snapshot.sourceRun.id);
  const args={...parseArgs(['--shadow']),canaryDefinition:null,batchSize:31,limit:null};
  const plan={run_key:'jungle-real-source-shadow-'+randomUUID(),commit_sha:'local-fixture-source:'+workerSha};
  const result=await runDurable(c,args,source,plan);save('shadow-result.json',result);
  assert.equal(result.run.state,'shadow_verified');assert.equal(result.reconciliation.selected_count,133);assert.equal(result.reconciliation.eligible_count,128);assert.equal(result.reconciliation.quarantined_count,0);assert.equal(result.reconciliation.excluded_count,5);assert.equal(result.reconciliation.snapshot_count,128);assert.deepEqual(result.reconciliation.mismatches,[]);
  const retry=await runDurable(c,args,source,plan);assert.equal(retry.run.id,result.run.id);assert.equal(retry.reconciliation.snapshot_count,128);
  const decisions=(await c.query('select to_jsonb(t) value from market_price_qualification_decisions t where run_id=$1 order by source_observation_id',[result.run.id])).rows.map(r=>r.value);save('decisions.json',decisions);
  assert.equal(decisions.filter(d=>!d.eligible).length,5);assert.ok(decisions.filter(d=>d.eligible).every(d=>d.edition_assignment_id&&d.source_mapping_id===null&&d.variant_assignment_id===null));
  await c.query('reset role');assert.deepEqual(await copies(),before);assert.equal((await c.query('select count(*)::int n from market_price_current_publication')).rows[0].n,0);
  const assignments=(await c.query("select to_jsonb(t)||jsonb_build_object('assignment_payload_text',assignment_payload::text) value from v_tcgplayer_jungle_edition_current_assignments_v1 t order by source_observation_id")).rows.map(r=>r.value);
  const links=(await c.query('select to_jsonb(t) value from jungle_edition_identity_links_v1 t order by id')).rows.map(r=>r.value);assert.equal(assignments.length,128);assert.equal(links.length,128);
  const overlay={version:'JUNGLE_POPULATED_SOURCE_OVERLAY_V1',at:new Date().toISOString(),sourceRun:source.id,snapshotSha256:review.snapshot_sha256,manifestFingerprint:manifest.fingerprint,workerSha256:workerSha,localShadowRun:result.run.id,assignments,links};
  save('edition-overlay.json',overlay);fs.writeFileSync(out+'/edition-overlay.json',JSON.stringify(overlay,null,2),{flag:'wx'});
  const receipt={at:new Date().toISOString(),status:'passed',sourceRun:source.id,localShadowRun:result.run.id,selected:133,eligible:128,excluded:5,quarantined:0,snapshots:128,savedCopiesPreserved:7,idempotentResume:true,productionWrites:0,priceActivation:false,limitation:'Actual durable worker over all captured Jungle quotes; full source comparison is a separate read-only projection.'};save('receipt.json',receipt);console.log(JSON.stringify(receipt));
 }
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack});throw e;}finally{await c.end();}
