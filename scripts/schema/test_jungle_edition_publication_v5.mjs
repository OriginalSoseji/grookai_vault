// Executes the actual worker pipeline functions against the isolated replay.
// This is not the CLI clean-commit gate or a production-scale shadow release.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const generation='v17',fixture=base+'/full-415-'+generation,project='jungle-edition-full-415-'+generation+'-20261001';
const port=64840,migration='20261001050000_jungle_edition_foundation_v1.sql';
assert.equal(process.argv.length,2);
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const freeze=read(fixture+'/freeze.json');assert.equal(read(fixture+'/replay-result.json').status,'passed');
assert.equal(hash(fs.readFileSync('supabase/migrations/'+migration)),freeze.sourceHashes[migration]);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync('supabase/migrations/'+name)).digest('hex'),digest,name);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000});
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
assert.deepEqual(Object.keys(JSON.parse(docker('inspect','supabase_db_'+project))[0].NetworkSettings.Networks),[project]);
const assignments=fs.readdirSync(base).filter(n=>n.startsWith('assignment-sql-v7-')&&fs.existsSync(base+'/'+n+'/receipt.json'));
assert.equal(assignments.length,1);const prior=read(base+'/'+assignments[0]+'/receipt.json');
assert.equal(prior.sourceSha256,freeze.sourceHashes[migration]);
const input=read(base+'/'+assignments[0]+'/intent.json'),ids=input.ids;
const out=base+'/publication-pipeline-v5-'+Date.now();fs.mkdirSync(out);
for(const name of Object.keys(process.env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|MTG_PRICING/.test(name))delete process.env[name];
fs.writeFileSync(out+'/empty.env','',{flag:'wx'});process.env.DOTENV_CONFIG_PATH=out+'/empty.env';
const workerPath='scripts/workers/tcgplayer_market_publication_worker_v1.mjs';
const workerSha256=hash(fs.readFileSync(workerPath));
const {candidateRows,runDurable,latestSourceRun,parseArgs}=await import('../workers/tcgplayer_market_publication_worker_v1.mjs');
const client=new pg.Client({host:'127.0.0.1',port,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000,statement_timeout:120000});
const tests=[];const pass=name=>tests.push(name);
const save=(name,data)=>fs.writeFileSync(out+'/'+name,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),project,port,sourceRun:input.run,ids,workerSha256,consumed:true,productionWrites:0});
const allowedTables=new Set(['market_price_pipeline_runs','market_price_pipeline_candidates','market_price_qualification_decisions','market_price_publication_sets','market_price_publication_snapshots']);
const insert=async(table,row)=>{assert.ok(allowedTables.has(table));await client.query(`insert into public.${table} select * from jsonb_populate_record(null::public.${table},$1::jsonb)`,[JSON.stringify(row)]);};
async function reject(name,operation,pattern){await client.query('savepoint negative_case');let error;try{await operation();}catch(e){error=e;}finally{await client.query('rollback to negative_case');await client.query('release negative_case');}assert.ok(error,name+' must reject');assert.match(error.message,pattern,name);pass(name);}
async function drift(name,statement,params,expected){await client.query('savepoint source_drift');try{
 await client.query(statement,params);
 const rows=(await client.query('select card_print_id,market_price from public.v_market_price_current_v1')).rows;
 assert.equal(rows.length,expected,name);pass(name);
 await reject(name+'_pointer_reactivation_rejected',()=>client.query('update public.market_price_current_publication set activated_at=activated_at'),/jungle_edition_publication_assignment_changed/);
}finally{await client.query('rollback to source_drift');await client.query('release source_drift');}}
await client.connect();
try{
 assert.equal((await client.query("select current_setting('max_worker_processes') value")).rows[0].value,'0');
 assert.equal((await client.query('select count(*)::int n from public.vault_item_instances')).rows[0].n,5);
 assert.equal((await client.query('select count(*)::int n from public.card_prints where id=$1',[ids.legacy])).rows[0].n,1);
 const retained=(await client.query(`select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_item_instances t),'anchors',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_items t),'legacy_mapping',(select jsonb_agg(to_jsonb(t) order by id) from public.external_mappings t where external_id='45120')) value`)).rows[0].value;
 const seedPath=fixture+'/publication-fixture-seed-v1.json';let seed;
 if(fs.existsSync(seedPath)){seed=read(seedPath);assert.equal(seed.migrationSha256,freeze.sourceHashes[migration]);assert.equal(seed.sourceRun,input.run);}
 else{
  seed={migrationSha256:freeze.sourceHashes[migration],sourceRun:input.run,pk:{parent:randomUUID(),child:randomUUID(),set:randomUUID(),observation:randomUUID(),product:900000001,category:3,game:'pokemon',domain:'pokemon_eng_standard',finish:'normal',subtype:'Normal',group:900001},mtg:{parent:randomUUID(),child:randomUUID(),set:randomUUID(),observation:randomUUID(),product:900000002,category:1,game:'mtg',domain:'mtg_eng_paper_print',finish:'foil',subtype:'Foil',group:900002},held:randomUUID()};
  await client.query('begin');
  try{
   await client.query(`insert into public.tcgcsv_source_categories(category_id,name,raw_payload,payload_hash) values(3,'Pokemon','{}',$1),(1,'Magic','{}',$1) on conflict do nothing`,['a'.repeat(64)]);
   await client.query(`insert into public.tcgcsv_source_groups(group_id,category_id,name,raw_payload,payload_hash) values(635,3,'Jungle','{}',$1),(900001,3,'Synthetic Pokemon Set','{}',$1),(900002,1,'Synthetic Magic Set','{}',$1)`,['a'.repeat(64)]);
   for(const [kind,card]of Object.entries({pk:seed.pk,mtg:seed.mtg})){
    card.gv='GV-'+(kind==='pk'?'PK':'MTG')+'-SYNTHETIC-1';card.printingGv=card.gv+'-'+card.finish.toUpperCase();card.artifact=randomUUID();
    await client.query(`insert into public.sets(id,code,name,game) values($1,$2,$3,$4)`,[card.set,'pricing-proof-'+kind,'Synthetic '+kind,card.game]);
    await client.query(`insert into public.card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain) values($1,$2,$3,$4,'1',$5,(select id from public.games where code=$6),$7)`,[card.parent,card.set,'pricing-proof-'+kind,'Synthetic '+kind+' Card',card.gv,card.game,card.domain]);
    await client.query(`insert into public.card_print_identity(id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active) values($1,$2,$3,$4,'1',$5,$5,'{}',$6,$7,true)`,[randomUUID(),card.parent,card.domain,'pricing-proof-'+kind,'Synthetic '+kind+' Card',card.domain+':v1',hash(card.parent)]);
    await client.query(`insert into public.card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional) values($1,$2,$3,$4,false)`,[card.child,card.parent,card.finish,card.printingGv]);
    await client.query(`insert into public.external_mappings(source,external_id,card_print_id,active,meta) values('tcgplayer',$1,$2,true,'{"mapping_method":"synthetic_explicit_fixture","confidence":1}')`,[String(card.product),card.parent]);
    await client.query(`insert into public.tcgcsv_source_products(product_id,category_id,group_id,name,extended_data,raw_payload,payload_hash) values($1,$2,$3,$4,'[{"name":"Number","value":"1/64"}]','{}',$5)`,[card.product,card.category,card.group,'Synthetic '+kind+' Card','b'.repeat(64)]);
    await client.query(`insert into public.tcgcsv_source_artifacts(id,sync_run_id,run_key,artifact_kind,local_path,sha256,byte_size,http_status,observed_on,category_id,group_id) values($1,$2,$3,'prices',$4,$5,100,200,current_date,$6,$7)`,[card.artifact,input.run,input.run,'synthetic-'+kind+'.json','e'.repeat(64),card.category,card.group]);
    await client.query(`insert into public.tcgcsv_source_price_daily_observations(id,source_price_row_identity,product_id,category_id,group_id,subtype_name,subtype_name_normalized,observed_on,market_price,raw_payload,payload_hash,source_artifact_id,last_seen_run_id) values($1,$2,$3,$4,$5,$6,lower($6),current_date,5,'{}',$7,$8,$9)`,[card.observation,`tcgplayer:${card.product}:${card.subtype.toLowerCase()}`,card.product,card.category,card.group,card.subtype,'c'.repeat(64),card.artifact,input.run]);
   }
   await client.query(`insert into public.tcgcsv_source_products(product_id,category_id,group_id,name,extended_data,raw_payload,payload_hash) values(900000003,3,635,'Synthetic Unbound Jungle','[{"name":"Number","value":"2/64"}]','{}',$1)`,['b'.repeat(64)]);
   await client.query(`insert into public.tcgcsv_source_price_daily_observations(id,source_price_row_identity,product_id,category_id,group_id,subtype_name,subtype_name_normalized,observed_on,market_price,raw_payload,payload_hash,source_artifact_id,last_seen_run_id) values($1,'tcgplayer:900000003:1st edition holofoil',900000003,3,635,'1st Edition Holofoil','1st edition holofoil',current_date,777,'{}',$2,$3,$4)`,[seed.held,'d'.repeat(64),input.artifact,input.run]);
   await client.query(`update public.tcgcsv_source_price_daily_observations set market_price=102,payload_hash=$1,raw_payload='{"synthetic":true,"marketPrice":102}' where id=$2`,['7'.repeat(64),input.first]);
   await client.query('commit');fs.writeFileSync(seedPath,JSON.stringify(seed,null,2),{flag:'wx'});
  }catch(error){await client.query('rollback');throw error;}
 }
 save('seed.json',seed);
 await client.query('set role service_role');
 const source=await latestSourceRun(client);assert.equal(source.id,input.run);
 const args={...parseArgs(['--shadow']),canaryDefinition:null,batchSize:2,limit:null};
 const plan={run_key:'jungle-shadow-'+randomUUID(),commit_sha:'local-fixture-source:'+workerSha256};
 const shadow=await runDurable(client,args,source,plan);
 assert.equal(shadow.run.state,'shadow_verified');assert.equal(shadow.reconciliation.selected_count,5);
 assert.equal(shadow.reconciliation.eligible_count,4);assert.equal(shadow.reconciliation.quarantined_count,1);
 assert.equal(shadow.reconciliation.snapshot_count,4);assert.deepEqual(shadow.reconciliation.mismatches,[]);
 pass('actual_worker_shadow_reconciles_all_five_source_rows_in_two_row_batches');save('shadow-run.json',shadow.run);save('shadow-reconciliation.json',shadow.reconciliation);
 const held=(await client.query('select to_jsonb(t) value from public.market_price_qualification_decisions t where run_id=$1 and source_observation_id=$2',[shadow.run.id,seed.held])).rows[0].value;
 assert.equal(held.eligible,false);assert.ok(held.reason_codes.includes('edition_bound_pricing_authority_required'));assert.equal(held.card_print_id,null);pass('unbound_edition_stays_in_reconciliation_without_legacy_fallback');
 const resumed=await runDurable(client,args,source,plan);assert.equal(resumed.run.id,shadow.run.id);assert.equal(resumed.reconciliation.snapshot_count,4);pass('completed_shadow_resume_is_idempotent');
 const expected=[{source_product_id:45120,source_subtype_name:'1st Edition Holofoil',card_print_id:ids.first,card_printing_id:ids.firstChild,gv_id:'GV-PK-JU-1-FIRST-EDITION',printing_gv_id:'GV-PK-JU-1-FIRST-EDITION-HOLO',expected_finish:'holo'},
 {source_product_id:45120,source_subtype_name:'Unlimited Holofoil',card_print_id:ids.unlimited,card_printing_id:ids.unlimitedChild,gv_id:'GV-PK-JU-1-UNLIMITED',printing_gv_id:'GV-PK-JU-1-UNLIMITED-HOLO',expected_finish:'holo'},
 ...[seed.pk,seed.mtg].map(c=>({source_product_id:c.product,source_subtype_name:c.subtype,card_print_id:c.parent,card_printing_id:c.child,gv_id:c.gv,printing_gv_id:c.printingGv,expected_finish:c.finish}))];
 const canaryDefinition={printings:expected};
 const selected=await candidateRows(client,{limit:null,canaryDefinition,sourceRun:source});assert.equal(selected.length,4);pass('actual_worker_canary_selects_reviewed_edition_and_ordinary_identities');
 const canary=await runDurable(client,{...args,runMode:'canary',canaryDefinition},source,{...plan,run_key:'jungle-canary-'+randomUUID()});
 assert.equal(canary.run.state,'verified');assert.equal(canary.reconciliation.snapshot_count,4);pass('actual_worker_canary_activates_and_reads_back_four_exact_prices');save('canary-run.json',canary.run);
 const snapshots=(await client.query('select to_jsonb(t) value from public.market_price_publication_snapshots t where run_id=$1',[canary.run.id])).rows.map(r=>r.value);
 const firstSnapshot=snapshots.find(r=>r.card_print_id===ids.first),unlimitedSnapshot=snapshots.find(r=>r.card_print_id===ids.unlimited),ordinary=snapshots.find(r=>r.card_print_id===seed.pk.parent);
 assert.equal(Number(firstSnapshot.market_price),102);assert.equal(Number(unlimitedSnapshot.market_price),20);
 assert.equal(firstSnapshot.source_mapping_id,null);assert.equal(firstSnapshot.variant_assignment_id,null);assert.ok(firstSnapshot.edition_assignment_id);
 assert.ok(ordinary.source_mapping_id);assert.ok(ordinary.variant_assignment_id);assert.equal(ordinary.edition_assignment_id,null);pass('snapshot_foreign_keys_preserve_two_separate_assignment_lanes');
 await client.query('reset role');await client.query('begin');
 const currentBefore=(await client.query('select to_jsonb(t) value from public.market_price_current_publication t')).rows[0].value;
 const firstDecision=(await client.query('select to_jsonb(t) value from public.market_price_qualification_decisions t where id=$1',[firstSnapshot.qualification_decision_id])).rows[0].value;
 const ordinaryDecision=(await client.query('select to_jsonb(t) value from public.market_price_qualification_decisions t where id=$1',[ordinary.qualification_decision_id])).rows[0].value;
 for(const [name,patch]of [
  ['decision_cross_edition_assignment',{edition_assignment_id:unlimitedSnapshot.edition_assignment_id}],
  ['decision_wrong_parent',{card_print_id:ids.unlimited}],['decision_wrong_child',{card_printing_id:ids.unlimitedChild}],
  ['decision_wrong_amount',{market_price:999}],['decision_wrong_source_hash',{source_row_hash:'f'.repeat(64)}],
  ['decision_wrong_assignment_version',{variant_assignment_version:'generic-version'}],
  ['decision_wrong_language_result',{language_result:'non_english'}],
  ['decision_subtype_lie_cannot_use_generic_lane',{edition_assignment_id:null,source_subtype_name:'Normal',card_print_id:ids.legacy,card_printing_id:ids.legacyChild,source_mapping_id:ordinary.source_mapping_id,variant_assignment_id:ordinary.variant_assignment_id}],
  ['decision_wrong_candidate_lineage',{pipeline_candidate_id:ordinaryDecision.pipeline_candidate_id}],
 ]) await reject(name,()=>insert('market_price_qualification_decisions',{...firstDecision,...patch,id:randomUUID(),decision_key:randomUUID()}),/jungle_edition_price_(assignment|lineage)_invalid/);
 const forgeRun={...(await client.query('select to_jsonb(t) value from public.market_price_pipeline_runs t where id=$1',[canary.run.id])).rows[0].value,id:randomUUID(),run_key:'jungle-guard-'+randomUUID()};
 await insert('market_price_pipeline_runs',forgeRun);
 const forgeCandidate={...(await client.query('select to_jsonb(t) value from public.market_price_pipeline_candidates t where id=$1',[firstDecision.pipeline_candidate_id])).rows[0].value,id:randomUUID(),run_id:forgeRun.id};
 await insert('market_price_pipeline_candidates',forgeCandidate);
 const forgeDecision={...firstDecision,id:randomUUID(),run_id:forgeRun.id,run_key:forgeRun.run_key,decision_key:randomUUID(),pipeline_candidate_id:forgeCandidate.id};
 await insert('market_price_qualification_decisions',forgeDecision);
 const forgeSet={...(await client.query('select to_jsonb(t) value from public.market_price_publication_sets t where id=$1',[firstSnapshot.publication_set_id])).rows[0].value,id:randomUUID(),run_id:forgeRun.id,run_key:forgeRun.run_key,publication_state:'staging'};
 await insert('market_price_publication_sets',forgeSet);
 const prototype={...firstSnapshot,run_id:forgeRun.id,publication_set_id:forgeSet.id,qualification_decision_id:forgeDecision.id};
 for(const [name,patch]of [
  ['snapshot_cross_edition_assignment',{edition_assignment_id:unlimitedSnapshot.edition_assignment_id}],
  ['snapshot_wrong_price',{market_price:999}],['snapshot_wrong_supporting_price',{low_price:1}],
  ['snapshot_wrong_parent',{card_print_id:ids.legacy}],['snapshot_wrong_qualified_lineage',{qualification_decision_id:ordinaryDecision.id}],
  ['snapshot_subtype_lie_cannot_use_generic_lane',{edition_assignment_id:null,source_subtype_name:'Normal',source_mapping_id:ordinary.source_mapping_id,variant_assignment_id:ordinary.variant_assignment_id}],
 ]) await reject(name,()=>insert('market_price_publication_snapshots',{...prototype,...patch,id:randomUUID(),provenance_id:randomUUID()}),/jungle_edition_price_(assignment|lineage)_invalid/);
 await reject('ordinary_snapshot_still_requires_product_and_generic_assignment',()=>insert('market_price_publication_snapshots',{...ordinary,id:randomUUID(),provenance_id:randomUUID(),publication_set_id:forgeSet.id,source_mapping_id:null}),/market_price_snapshot_assignment_lane_v1/);
 await drift('changed_quote_suppresses_only_affected_edition','update public.tcgcsv_source_price_daily_observations set market_price=103 where id=$1',[input.first],3);
 await drift('changed_product_hash_suppresses_both_editions','update public.tcgcsv_source_products set payload_hash=$1 where product_id=45120',['9'.repeat(64)],2);
 await drift('retired_binding_suppresses_only_affected_edition','update public.tcgplayer_jungle_edition_bindings_v1 set state=\'retired\' where id=$1',[ids.firstBinding],3);
 await drift('hidden_parent_suppresses_entire_pair','update public.card_prints set data_quality_flags=\'{"app_visibility_v1":{"status":"suppressed"}}\' where id=$1',[ids.first],2);
 await client.query('set local role authenticated');
 const pricing=(await client.query('select * from public.get_market_pricing_read_model_v1($1::uuid[],$2::uuid[])',[[ids.legacy,ids.first,ids.unlimited],[ids.firstChild,ids.unlimitedChild]])).rows;
 assert.equal(pricing.length,5);assert.equal(pricing.find(r=>r.card_print_id===ids.legacy).market_close,null);
 assert.ok(pricing.filter(r=>r.card_print_id===ids.first).every(r=>Number(r.market_close)===102));
 assert.ok(pricing.filter(r=>r.card_print_id===ids.unlimited).every(r=>Number(r.market_close)===20));pass('authenticated_parent_and_child_reads_keep_editions_separate_and_legacy_unpriced');
 await client.query('reset role');
 assert.deepEqual((await client.query('select to_jsonb(t) value from public.market_price_current_publication t')).rows[0].value,currentBefore);pass('rejected_mutations_preserve_current_publication_pointer');
 await client.query('rollback');
 const after=(await client.query(`select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_item_instances t),'anchors',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_items t),'legacy_mapping',(select jsonb_agg(to_jsonb(t) order by id) from public.external_mappings t where external_id='45120')) value`)).rows[0].value;
 assert.deepEqual(after,retained);pass('five_saved_copies_anchors_and_legacy_mapping_unchanged');
 const receipt={status:'passed',at:new Date().toISOString(),tests:tests.length,testNames:tests,project,ids,sourceRun:source.id,shadowRun:shadow.run.id,canaryRun:canary.run.id,currentPrices:4,savedCopies:5,sourceSha256:freeze.sourceHashes[migration],workerSha256,scriptSha256:hash(fs.readFileSync(new URL(import.meta.url))),productionWrites:0,cliReleaseProof:false,fullProductionSourceShadow:false,output:out};save('receipt.json',receipt);console.log(JSON.stringify(receipt));
}catch(error){await client.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),error:error.message,stack:error.stack,testsPassed:tests,productionWrites:0});throw error;}
finally{await client.end();}
