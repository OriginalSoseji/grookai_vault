// Real isolated SQL proof. Retains its one-use intent and committed evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const version='v17',fixture=base+'/full-415-'+version,project='jungle-edition-full-415-'+version+'-20261001';
const container='supabase_db_'+project,migration='20261001050000_jungle_edition_foundation_v1.sql';
assert.equal(process.argv.length,2);
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
assert.equal(JSON.parse(fs.readFileSync(fixture+'/replay-result.json')).status,'passed');
assert.equal(hash(fs.readFileSync('supabase/migrations/'+migration)),freeze.sourceHashes[migration]);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync('supabase/migrations/'+name)).digest('hex'),digest,name);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000});
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
assert.deepEqual(Object.keys(JSON.parse(docker('inspect',container))[0].NetworkSettings.Networks),[project]);
const psql=['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'];
const sql=q=>execFileSync('docker',psql,{input:q,encoding:'utf8',windowsHide:true,timeout:60000}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
assert.equal(sql('select count(*) from public.tcgplayer_jungle_edition_assignments_v1'),'0','Do not replay a populated assignment fixture');
const receipts=fs.readdirSync(base).filter(n=>n.startsWith('foundation-sql-'+version+'-')&&fs.existsSync(base+'/'+n+'/receipt.json'));
assert.equal(receipts.length,1);
const foundation=JSON.parse(fs.readFileSync(base+'/'+receipts[0]+'/receipt.json'));
assert.equal(foundation.status,'passed');assert.equal(foundation.sourceSha256,freeze.sourceHashes[migration]);
const {ids}=JSON.parse(fs.readFileSync(base+'/'+receipts[0]+'/fixture-intent.json'));
const run=randomUUID(),artifact=randomUUID(),first=randomUUID(),unlimited=randomUUID();
const tests=[];
const ok=(query,name)=>{tests.push(name);return `select pg_temp.check_true((${query}),'${name}');`;};
const bad=(query,pattern,name)=>{tests.push(name);return `select pg_temp.expect_failure($case$${query}$case$,'${pattern}','${name}');`;};
const candidates='public.v_tcgplayer_jungle_edition_assignment_candidates_v1';
const current='public.v_tcgplayer_jungle_edition_current_assignments_v1';
const ledger='public.tcgplayer_jungle_edition_assignments_v1';
const prepare=`public.prepare_tcgplayer_jungle_edition_assignments_v1('${run}')`;
const drift=(statement,count,name)=>`savepoint drift;${statement};${ok(`select count(*)=${count} from ${current}`,name)}rollback to drift;`;
const corrupt=(expression,name)=>bad(`insert into ${ledger}(source_observation_id,source_sync_run_id,binding_id,assignment_payload,assignment_sha256)
  select source_observation_id,source_sync_run_id,binding_id,payload,encode(extensions.digest(payload::text,'sha256'),'hex')
  from (select candidate.*,${expression} as payload from ${candidates} candidate where source_observation_id='${first}') altered`,
  'jungle_edition_assignment_evidence_changed',name);
const script=`begin;
create function pg_temp.check_true(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end$$;
create function pg_temp.expect_failure(statement text,pattern text,label text) returns void language plpgsql as $$
declare caught boolean:=false;begin begin execute statement;exception when others then
  if sqlerrm !~ pattern then raise exception 'Unexpected failure for %: %',label,sqlerrm;end if;caught:=true;
end;if not caught then raise exception 'Expected rejection missing: %',label;end if;end$$;
create temp table preserved_assignment_scope as select jsonb_build_object(
 'copies',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_item_instances t),
 'anchors',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_items t),
 'mappings',(select jsonb_agg(to_jsonb(t) order by id) from public.external_mappings t),
 'generic_assignments',(select jsonb_agg(to_jsonb(t) order by id) from public.market_evidence_variant_assignments t)) data;
insert into public.tcgcsv_source_sync_runs(id,run_key,sync_mode,status,observed_on,artifact_hash,worker_version,parser_version,schema_contract_version,finished_at)
values('${run}','${run}','current_full_sync','completed',current_date,'${'c'.repeat(64)}','synthetic','synthetic','synthetic',now());
insert into public.tcgcsv_source_artifacts(id,sync_run_id,run_key,artifact_kind,local_path,sha256,byte_size,http_status,observed_on,category_id,group_id)
values('${artifact}','${run}','${run}','prices','synthetic-prices.json','${'e'.repeat(64)}',100,200,current_date,3,635);
insert into public.tcgcsv_source_price_daily_observations(id,source_price_row_identity,product_id,category_id,group_id,subtype_name,subtype_name_normalized,observed_on,market_price,raw_payload,payload_hash,source_artifact_id,first_seen_run_id,last_seen_run_id)
values('${first}','tcgplayer:45120:1st edition holofoil',45120,3,635,'1st Edition Holofoil','1st edition holofoil',current_date,100,'{}','${'1'.repeat(64)}','${artifact}','${run}','${run}'),
('${unlimited}','tcgplayer:45120:unlimited holofoil',45120,3,635,'Unlimited Holofoil','unlimited holofoil',current_date,20,'{}','${'2'.repeat(64)}','${artifact}','${run}','${run}');
set local role service_role;
${ok(`select count(*)=2 from ${candidates}`,'two_subtype_candidates_before_legacy_parent_join')}
${ok(`select bool_and(assignment_payload#>>'{canonical,card_print_id}'<>'${ids.legacy}') from ${candidates}`,'legacy_mapping_never_selects_parent')}
${ok(`select ${prepare}=2`,'preparation_appends_two_assignments')}
${ok(`select ${prepare}=0`,'unchanged_preparation_is_idempotent')}
${ok(`select count(*)=2 and bool_and(not publishable) from ${current}`,'current_assignments_are_internal_not_publication')}
savepoint timezone_session;set local timezone='America/Denver';set local datestyle='SQL,DMY';
${ok(`select count(*)=2 from ${current}`,'assignment_fingerprint_independent_of_session_timezone_and_datestyle')}
${ok(`select ${prepare}=0`,'different_timezone_does_not_append_duplicate_assignment')}
rollback to timezone_session;
${ok(`select assignment_payload#>>'{canonical,card_print_id}'='${ids.first}' and assignment_payload#>>'{canonical,card_printing_id}'='${ids.firstChild}' and assignment_payload#>>'{source,market_price}'='100' from ${current} where source_observation_id='${first}'`,'first_quote_exact_parent_child_and_price')}
${ok(`select assignment_payload#>>'{canonical,card_print_id}'='${ids.unlimited}' and assignment_payload#>>'{source,market_price}'='20' from ${current} where source_observation_id='${unlimited}'`,'unlimited_quote_has_its_own_parent_and_price')}
${bad(`select public.prepare_tcgplayer_jungle_edition_assignments_v1(null)`,'source_run_changed','null_run_rejected')}
${bad(`select public.prepare_tcgplayer_jungle_edition_assignments_v1('${randomUUID()}')`,'source_run_changed','unselected_run_rejected')}
${bad(`update ${ledger} set assignment_payload='{}'`,'permission denied','service_role_cannot_update_assignment')}
${bad(`delete from ${ledger}`,'permission denied','service_role_cannot_delete_assignment')}
${bad(`truncate ${ledger}`,'permission denied','service_role_cannot_truncate_assignment')}
reset role;
${bad(`update ${ledger} set assignment_payload=assignment_payload`,'assignment_is_immutable','owner_update_trigger_rejects_reinterpretation')}
${bad(`delete from ${ledger}`,'assignment_is_immutable','owner_delete_trigger_retains_history')}
${corrupt(`jsonb_set(assignment_payload,'{canonical,card_print_id}',to_jsonb('${ids.unlimited}'::text))`,'forged_cross_edition_payload_rejected')}
${corrupt(`jsonb_set(assignment_payload,'{source,market_price}','999'::jsonb)`,'forged_price_with_recomputed_hash_rejected')}
${corrupt(`jsonb_set(assignment_payload,'{binding,manifest_sha256}',to_jsonb('${'f'.repeat(64)}'::text))`,'forged_manifest_rejected')}
${bad(`insert into ${ledger}(source_observation_id,source_sync_run_id,binding_id,assignment_payload,assignment_sha256)
 select source_observation_id,source_sync_run_id,'${ids.unlimitedBinding}',assignment_payload,assignment_sha256 from ${candidates} where source_observation_id='${first}'`,'evidence_changed','cross_binding_columns_rejected')}
${drift(`update public.tcgcsv_source_price_daily_observations set payload_hash='${'3'.repeat(64)}' where id='${first}'`,1,'source_hash_drift_holds_old_assignment')}
${drift(`update public.tcgcsv_source_price_daily_observations set market_price=101 where id='${first}'`,1,'price_change_without_hash_change_still_invalidates')}
${drift(`update public.tcgcsv_source_price_daily_observations set currency='EUR' where id='${first}'`,1,'non_usd_quote_held')}
${drift(`update public.tcgcsv_source_price_daily_observations set market_price='NaN' where id='${first}'`,1,'non_finite_quote_held')}
${drift(`update public.tcgcsv_source_price_daily_observations set subtype_name='Holofoil',subtype_name_normalized='holofoil' where id='${first}'`,1,'generic_holo_never_falls_back_to_legacy')}
${drift(`update public.tcgcsv_source_price_daily_observations set subtype_name_normalized='unlimited holofoil' where id='${first}'`,1,'normalized_subtype_disagreement_held')}
${drift(`update public.tcgcsv_source_artifacts set sha256='${'f'.repeat(64)}' where id='${artifact}'`,0,'artifact_hash_change_holds_both')}
${drift(`update public.tcgcsv_source_artifacts set group_id=999 where id='${artifact}'`,0,'wrong_artifact_group_held')}
${drift(`update public.tcgcsv_source_artifacts set http_status=503 where id='${artifact}'`,0,'failed_artifact_held')}
${drift(`update public.tcgcsv_source_artifacts set byte_size=0 where id='${artifact}'`,0,'empty_artifact_held')}
${drift(`update public.tcgcsv_source_artifacts set sync_run_id=null where id='${artifact}'`,0,'artifact_from_unbound_run_held')}
${drift(`update public.tcgcsv_source_sync_runs set finished_at=now()-interval '37 hours' where id='${run}'`,0,'stale_assignments_held')}
${drift(`update public.tcgcsv_source_sync_runs set finished_at=now()+interval '7 minutes' where id='${run}'`,0,'future_source_run_held')}
${drift(`update public.tcgcsv_source_sync_runs set failed_count=1 where id='${run}'`,0,'unreconciled_source_run_held')}
${drift(`update public.tcgcsv_source_products set payload_hash='${'9'.repeat(64)}' where product_id=45120`,0,'product_hash_drift_invalidates_binding')}
${drift(`update public.card_printing_truth_reviews set evidence=jsonb_set(evidence,'{review_sha256}',to_jsonb('${'9'.repeat(64)}'::text)) where card_printing_id='${ids.firstChild}'`,1,'changed_review_fingerprint_holds_old_assignment')}
${drift(`update public.card_prints set data_quality_flags='{"app_visibility_v1":{"status":"suppressed"}}' where id='${ids.first}'`,0,'hidden_parent_holds_entire_pair')}
${drift(`update public.jungle_edition_identity_links_v1 set state='retired' where id='${ids.firstLink}'`,0,'retired_identity_holds_entire_pair')}
${drift(`update public.tcgplayer_jungle_edition_bindings_v1 set state='retired' where id='${ids.firstBinding}'`,1,'retired_binding_holds_exact_quote')}
${drift(`insert into public.tcgcsv_source_price_daily_observations(source_price_row_identity,product_id,category_id,group_id,subtype_name,subtype_name_normalized,observed_on,market_price,raw_payload,payload_hash,source_artifact_id,last_seen_run_id)
 values('duplicate-row',45120,3,635,'1st Edition Holofoil','1st edition holofoil',current_date,999,'{}','${'8'.repeat(64)}','${artifact}','${run}')`,1,'competing_product_subtype_rows_held')}
${drift(`update public.tcgcsv_source_price_daily_observations set raw_payload='{"changed":true}' where id='${first}'`,1,'raw_source_drift_holds_old_assignment')}
${drift(`insert into public.tcgcsv_source_price_daily_observations(source_price_row_identity,product_id,category_id,group_id,subtype_name,subtype_name_normalized,observed_on,market_price,raw_payload,payload_hash,source_artifact_id,last_seen_run_id)
 values('conflicting-group-row',45120,3,999,'1st Edition Holofoil','1st edition holofoil',current_date,999,'{}','${'8'.repeat(64)}','${artifact}','${run}')`,1,'competing_group_metadata_cannot_launder_duplicate')}
create temp table frozen_assignments as select id,assignment_sha256,assignment_payload from ${ledger};
update public.tcgcsv_source_price_daily_observations set market_price=101,payload_hash='${'3'.repeat(64)}' where id='${first}';
${bad(`insert into ${ledger}(source_observation_id,source_sync_run_id,binding_id,assignment_payload,assignment_sha256)
 select source_observation_id,source_sync_run_id,binding_id,assignment_payload,assignment_sha256 from ${ledger} where source_observation_id='${first}'`,
 'evidence_changed','previously_valid_frozen_quote_cannot_be_reinserted_after_refresh')}
set local role service_role;
${ok(`select ${prepare}=1`,'quote_refresh_appends_new_assignment')}
${ok(`select count(*)=3 from ${ledger}`,'historical_assignment_retained_after_refresh')}
${ok(`select count(*)=2 from ${current}`,'only_current_quote_per_edition_is_selected')}
${ok(`select assignment_payload#>>'{source,market_price}'='101' from ${current} where source_observation_id='${first}'`,'refreshed_price_bound_to_new_assignment')}
reset role;
${ok(`select count(*)=2 and bool_and(f.assignment_sha256=a.assignment_sha256 and f.assignment_payload=a.assignment_payload) from frozen_assignments f join ${ledger} a using(id)`,'frozen_ids_and_payloads_unchanged')}
set local role anon;
${bad(`select * from ${ledger}`,'permission denied','anonymous_ledger_denied')}
${bad(`select * from ${current}`,'permission denied','anonymous_current_assignments_denied')}
${bad(`select ${prepare}`,'permission denied','anonymous_prepare_denied')}
reset role;set local role authenticated;
${bad(`select * from ${candidates}`,'permission denied','authenticated_source_evidence_denied')}
${bad(`select ${prepare}`,'permission denied','authenticated_prepare_denied')}
reset role;
${ok(`select data=jsonb_build_object('copies',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_item_instances t),'anchors',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_items t),'mappings',(select jsonb_agg(to_jsonb(t) order by id) from public.external_mappings t),'generic_assignments',(select jsonb_agg(to_jsonb(t) order by id) from public.market_evidence_variant_assignments t)) from preserved_assignment_scope`,'copies_anchors_legacy_mappings_and_generic_assignments_unchanged')}
${ok(`select count(*)=0 from public.market_price_current_publication`,'no_publication_activated')}
commit;
select jsonb_build_object('assignments',(select count(*) from ${ledger}),'current',(select count(*) from ${current}),'copies',(select count(*) from public.vault_item_instances));
`;
const out=base+'/assignment-sql-v7-'+Date.now();fs.mkdirSync(out);
fs.writeFileSync(out+'/intent.json',JSON.stringify({at:new Date().toISOString(),project,ids,run,artifact,first,unlimited,consumed:true,productionWrites:0},null,2),{flag:'wx'});
fs.writeFileSync(out+'/proof.sql',script,{flag:'wx'});
const result=spawnSync('docker',psql,{input:script,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:8*1024*1024});
fs.writeFileSync(out+'/stdout.private.txt',result.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/stderr.private.txt',result.stderr??'',{flag:'wx'});
if(result.status!==0){console.error((result.stderr??'').slice(-1800));throw Error('SQL proof failed; preserve '+out);}
const state=JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));assert.equal(state.assignments,3);assert.equal(state.current,2);assert.equal(state.copies,5);
const receipt={status:'passed',at:new Date().toISOString(),tests:tests.length,testNames:tests,state,project,sourceSha256:freeze.sourceHashes[migration],scriptSha256:hash(fs.readFileSync(new URL(import.meta.url))),sqlSha256:hash(script),productionWrites:0,publicationWrites:0,output:out};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
