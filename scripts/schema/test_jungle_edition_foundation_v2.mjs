// Real SQL/role proof against the dedicated full replay. No remote connection.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const base = 'C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const fixture = base + '/full-412-v2', container = 'supabase_db_jungle-edition-full-412-v2-20261001';
const migration = '20261001050000_jungle_edition_foundation_v1.sql';
const sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length, 2);
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(), 'c:/gv_jungle_edition_20261001');
const freeze = JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
const proof = JSON.parse(fs.readFileSync(fixture+'/replay-result.json'));
assert.equal(proof.status,'passed'); assert.equal(proof.fullReplay,true); assert.equal(proof.noOpPush,true);
assert.equal(sha(fs.readFileSync(root+'supabase/migrations/'+migration)),freeze.sourceHashes[migration]);
const docker = (...args) => execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:60000});
const db = JSON.parse(docker('inspect',container))[0];
assert.equal(db.State.Running,true); assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[freeze.project]);
assert.equal(JSON.parse(docker('network','inspect',freeze.project))[0].Internal,true);
const psql = ['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'];
const sql = q => execFileSync('docker',psql,{input:q,encoding:'utf8',windowsHide:true,timeout:60000}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
assert.equal(sql('select count(*) from auth.users'),'0','Retained test fixtures cannot be replayed');
const out = base+'/foundation-sql-v2-'+Date.now(); fs.mkdirSync(out);
const ids = Object.fromEntries(['user','set','legacy','first','unlimited','legacyChild','firstChild','unlimitedChild','firstLink','unlimitedLink','firstBinding','unlimitedBinding'].map(k=>[k,randomUUID()]));
const hash = 'a'.repeat(64), manifest = 'b'.repeat(64);
const link = (id,card,child,edition,state='staged',finish='holo') => `insert into public.jungle_edition_identity_links_v1(id,legacy_card_print_id,card_print_id,card_printing_id,edition,finish_key,state,manifest_sha256,review_ref) values('${id}','${ids.legacy}','${card}','${child}','${edition}','${finish}','${state}','${manifest}','synthetic-jungle-proof')`;
const binding = (id,linkId,subtype,state='staged') => `insert into public.tcgplayer_jungle_edition_bindings_v1(id,identity_link_id,product_id,source_subtype,source_product_payload_hash,manifest_sha256,review_ref,state) values('${id}','${linkId}',45120,'${subtype}','${hash}','${manifest}','synthetic-jungle-proof','${state}')`;
const resolve = subtype => `public.resolve_tcgplayer_jungle_edition_v1(45120,'${subtype}','${hash}')`;
const tests = [];
const ok = (query,name) => { tests.push(name); return `select pg_temp.check_true((${query}), '${name}');`; };
const bad = (query,pattern,name) => { tests.push(name); return `select pg_temp.expect_failure($case$${query}$case$,'${pattern}','${name}');`; };
const script = `begin;
create function pg_temp.check_true(value boolean, label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end$$;
create function pg_temp.expect_failure(statement text, pattern text, label text) returns void language plpgsql as $$
declare caught boolean := false; begin begin execute statement; exception when others then
  if sqlerrm !~ pattern then raise exception 'Unexpected failure for %: %',label,sqlerrm; end if; caught:=true;
end; if not caught then raise exception 'Expected rejection missing: %',label; end if; end$$;
insert into auth.users(id,aud,role,email) values('${ids.user}','authenticated','authenticated','${ids.user}@jungle-test.invalid');
insert into public.sets(id,code,name,game) values('${ids.set}','base2','Jungle','pokemon');
insert into public.card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain,set_identity_model,variant_key,printed_identity_modifier)
select v.id::uuid,'${ids.set}'::uuid,'base2','Clefable','1',v.gv_id,g.id,'pokemon_eng_standard','standard','',v.modifier
from (values ('${ids.legacy}','GV-PK-JU-1',null::text),('${ids.first}','GV-PK-JU-1-FIRST-EDITION','edition:first_edition'),('${ids.unlimited}','GV-PK-JU-1-UNLIMITED','edition:unlimited')) v(id,gv_id,modifier)
cross join public.games g where g.code='pokemon';
insert into public.card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional) values
('${ids.legacyChild}','${ids.legacy}','holo','GV-PK-JU-1-HOLO',false),
('${ids.firstChild}','${ids.first}','holo','GV-PK-JU-1-FIRST-EDITION-HOLO',false),
('${ids.unlimitedChild}','${ids.unlimited}','holo','GV-PK-JU-1-UNLIMITED-HOLO',false);
select public.admin_vault_instance_create_v1(p_user_id=>'${ids.user}'::uuid,p_card_print_id=>'${ids.legacy}'::uuid,p_condition_label=>'NM',p_card_printing_id=>'${ids.legacyChild}'::uuid) from generate_series(1,5);
insert into public.external_mappings(source,external_id,card_print_id,active) values('tcgplayer','45120','${ids.legacy}',true);
insert into public.tcgcsv_source_products(product_id,category_id,group_id,name,extended_data,raw_payload,payload_hash)
values(45120,3,635,'Clefable (1)','[{"name":"Number","value":"01/64"}]','{}','${hash}');
create temp table retained as select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_item_instances t),'anchors',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_items t),'mappings',(select jsonb_agg(to_jsonb(t) order by id) from public.external_mappings t)) data;
set local role service_role;
${bad(link(randomUUID(),ids.first,ids.unlimitedChild,'first_edition'),'invalid_jungle_edition_identity','cross_parent_child_rejected')}
${bad(link(randomUUID(),ids.first,ids.firstChild,'unlimited'),'invalid_jungle_edition_identity','wrong_edition_rejected')}
${bad(link(randomUUID(),ids.first,ids.firstChild,'first_edition','staged','normal'),'invalid_jungle_edition_identity','wrong_finish_rejected')}
${bad(link(randomUUID(),ids.first,ids.firstChild,'first_edition','active'),'invalid_jungle_edition_identity','unreviewed_activation_rejected')}
${link(ids.firstLink,ids.first,ids.firstChild,'first_edition')};
${link(ids.unlimitedLink,ids.unlimited,ids.unlimitedChild,'unlimited')};
${ok(`select count(*)=0 from ${resolve('1st Edition Holofoil')}`,'staged_links_do_not_resolve')}
${bad(binding(randomUUID(),ids.firstLink,'Unlimited Holofoil'),'invalid_jungle_edition_source_binding','cross_edition_binding_rejected')}
${bad(binding(randomUUID(),ids.firstLink,'1st Edition Holofoil','active'),'invalid_jungle_edition_source_binding','binding_cannot_activate_before_link')}
${binding(ids.firstBinding,ids.firstLink,'1st Edition Holofoil')};
${binding(ids.unlimitedBinding,ids.unlimitedLink,'Unlimited Holofoil')};
reset role;
insert into public.card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason,expected_finish_keys,source_report_path,evidence)
select id,'verified','visible','synthetic fixture',array['holo'],'master-index:${manifest}',
  jsonb_build_object('manifest_fingerprint','${manifest}','card_print_id',card_print_id::text,'finish_key','holo','review_sha256','${'d'.repeat(64)}')
from public.card_printings where id in ('${ids.firstChild}','${ids.unlimitedChild}');
set local role service_role;
${bad(`update public.jungle_edition_identity_links_v1 set state='active' where id='${ids.firstLink}'`,'invalid_jungle_edition_identity','missing_child_provenance_rejects_activation')}
reset role;
update public.card_printings set provenance_source='MASTER_INDEX_ADDITIVE_PRINTING_REPAIR_V1',provenance_ref='master-index:${manifest}' where id in ('${ids.firstChild}','${ids.unlimitedChild}');
savepoint unrelated_review;
update public.card_printing_truth_reviews set evidence='{}' where card_printing_id='${ids.firstChild}';
set local role service_role;
${bad(`update public.jungle_edition_identity_links_v1 set state='active' where id='${ids.firstLink}'`,'invalid_jungle_edition_identity','unbound_verified_review_rejects_activation')}
reset role;
rollback to unrelated_review;
set local role service_role;
update public.jungle_edition_identity_links_v1 set state='active' where id='${ids.firstLink}';
update public.tcgplayer_jungle_edition_bindings_v1 set state='active' where id='${ids.firstBinding}';
${ok(`select count(*)=0 from ${resolve('1st Edition Holofoil')}`,'incomplete_pair_does_not_resolve')}
update public.jungle_edition_identity_links_v1 set state='active' where id='${ids.unlimitedLink}';
update public.tcgplayer_jungle_edition_bindings_v1 set state='active' where id='${ids.unlimitedBinding}';
${ok(`select count(*)=1 and bool_and(card_print_id='${ids.first}'::uuid and card_printing_id='${ids.firstChild}'::uuid) from ${resolve('1st Edition Holofoil')}`,'first_edition_exact_identity')}
${ok(`select count(*)=1 and bool_and(card_print_id='${ids.unlimited}'::uuid and card_printing_id='${ids.unlimitedChild}'::uuid) from ${resolve('Unlimited Holofoil')}`,'unlimited_exact_identity')}
${ok(`select count(*)=0 from ${resolve('Holofoil')}`,'generic_subtype_cannot_select_edition')}
${ok(`select count(*)=0 from public.resolve_tcgplayer_jungle_edition_v1(45120,'Unlimited Holofoil','${'c'.repeat(64)}')`,'caller_hash_drift_rejected')}
${bad(binding(randomUUID(),ids.unlimitedLink,'Unlimited Holofoil'),'duplicate key','duplicate_source_binding_rejected')}
${bad(`update public.tcgplayer_jungle_edition_bindings_v1 set source_subtype='Unlimited' where id='${ids.firstBinding}'`,'permission denied','service_role_cannot_rewrite_binding')}
${bad(`delete from public.jungle_edition_identity_links_v1 where id='${ids.firstLink}'`,'permission denied','service_role_cannot_delete_history')}
reset role;
${bad(`update public.jungle_edition_identity_links_v1 set manifest_sha256='${'c'.repeat(64)}' where id='${ids.firstLink}'`,'edition_identity_is_immutable','owner_cannot_rewrite_manifest')}
savepoint stale_source;
update public.tcgcsv_source_products set payload_hash='${'c'.repeat(64)}' where product_id=45120;
${ok(`select count(*)=0 from ${resolve('Unlimited Holofoil')}`,'warehouse_hash_drift_rejected')}
rollback to stale_source;
savepoint identity_drift;
update public.card_prints set name='Wrong fixture identity' where id='${ids.unlimited}';
${ok(`select count(*)=0 from ${resolve('Unlimited Holofoil')}`,'canonical_drift_rejected_at_read')}
rollback to identity_drift;
savepoint review_drift;
update public.card_printing_truth_reviews set public_visibility='hidden_pending_review' where card_printing_id='${ids.unlimitedChild}';
${ok(`select count(*)=0 from ${resolve('Unlimited Holofoil')}`,'hidden_review_rejected_at_read')}
rollback to review_drift;
${[
  ["source_report_path='another-report'",'review_path_drift'],
  ["evidence=evidence-'manifest_fingerprint'",'missing_review_manifest'],
  [`evidence=jsonb_set(evidence,'{manifest_fingerprint}','"${'c'.repeat(64)}"')`,'review_manifest_drift'],
  [`evidence=jsonb_set(evidence,'{card_print_id}','"${ids.legacy}"')`,'review_parent_drift'],
  ["evidence=jsonb_set(evidence,'{finish_key}','\"normal\"')",'review_finish_drift'],
  ["evidence=evidence-'review_sha256'",'missing_review_hash'],
].map(([mutation,label])=>`savepoint ${label};
update public.card_printing_truth_reviews set ${mutation} where card_printing_id='${ids.unlimitedChild}';
${ok(`select count(*)=0 from ${resolve('Unlimited Holofoil')}`,label+'_rejected')}
${ok(`select count(*)=0 from ${resolve('1st Edition Holofoil')}`,label+'_holds_entire_pair')}
rollback to ${label};`).join('\n')}
savepoint provenance_drift;
update public.card_printings set provenance_ref='master-index:${'c'.repeat(64)}' where id='${ids.unlimitedChild}';
${ok(`select count(*)=0 from ${resolve('Unlimited Holofoil')}`,'child_provenance_drift_rejected')}
rollback to provenance_drift;
savepoint mixed_manifest_pair;
update public.jungle_edition_identity_links_v1 set state='retired' where id='${ids.unlimitedLink}';
update public.card_printings set provenance_ref='master-index:${'c'.repeat(64)}' where id='${ids.unlimitedChild}';
update public.card_printing_truth_reviews set source_report_path='master-index:${'c'.repeat(64)}',evidence=jsonb_set(evidence,'{manifest_fingerprint}','"${'c'.repeat(64)}"') where card_printing_id='${ids.unlimitedChild}';
${link(randomUUID(),ids.unlimited,ids.unlimitedChild,'unlimited','active').replace(manifest,'c'.repeat(64))};
${ok(`select count(*)=2 from public.jungle_edition_identity_links_v1 where state='active' and public.jungle_edition_link_valid_v1(id,true)`,'mixed_manifests_individually_valid')}
${ok(`select count(*)=0 from ${resolve('1st Edition Holofoil')}`,'mixed_manifest_pair_held')}
rollback to mixed_manifest_pair;
savepoint source_number_drift;
update public.tcgcsv_source_products set extended_data='[{"name":"Number","value":"02/64"}]' where product_id=45120;
${ok(`select count(*)=0 from ${resolve('Unlimited Holofoil')}`,'wrong_source_number_rejected')}
rollback to source_number_drift;
${['{}','null','"bad metadata"','42','[{"name":"Number","value":"01/64"},{"name":"Number","value":"01/64"}]'].map((value,i)=>`savepoint malformed_${i};
update public.tcgcsv_source_products set extended_data='${value}' where product_id=45120;
${ok(`select count(*)=0 from ${resolve('Unlimited Holofoil')}`,'malformed_or_duplicate_source_'+i+'_held_without_error')}
rollback to malformed_${i};`).join('\n')}
savepoint retired;
update public.tcgplayer_jungle_edition_bindings_v1 set state='retired' where id='${ids.firstBinding}';
${ok(`select count(*)=0 from ${resolve('1st Edition Holofoil')}`,'retired_binding_does_not_resolve')}
${bad(`update public.tcgplayer_jungle_edition_bindings_v1 set state='active' where id='${ids.firstBinding}'`,'retired_edition_cannot_reactivate','retired_binding_cannot_reactivate')}
rollback to retired;
set local role anon;
${bad(`select * from ${resolve('Unlimited Holofoil')}`,'permission denied','anonymous_cannot_resolve_internal_binding')}
reset role;
set local role authenticated;
${bad('select * from public.jungle_edition_identity_links_v1','permission denied','authenticated_cannot_read_staging')}
reset role;
${ok(`select data=jsonb_build_object('copies',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_item_instances t),'anchors',(select jsonb_agg(to_jsonb(t) order by id) from public.vault_items t),'mappings',(select jsonb_agg(to_jsonb(t) order by id) from public.external_mappings t)) from retained`,'owned_copies_anchors_and_legacy_mappings_unchanged')}
${ok('select count(*)=5 from public.vault_item_instances','five_owned_copies_preserved')}
${ok('select count(*)=0 from public.market_price_current_publication','no_price_publication_created')}
commit;
select jsonb_build_object('copies',(select count(*) from public.vault_item_instances),'links',(select count(*) from public.jungle_edition_identity_links_v1),'bindings',(select count(*) from public.tcgplayer_jungle_edition_bindings_v1),'first',(select card_print_id from ${resolve('1st Edition Holofoil')}),'unlimited',(select card_print_id from ${resolve('Unlimited Holofoil')}));
`;
fs.writeFileSync(out+'/fixture-intent.json',JSON.stringify({at:new Date().toISOString(),container,ids,consumed:true,productionWrites:0},null,2),{flag:'wx'});
fs.writeFileSync(out+'/proof.sql',script,{flag:'wx'});
const result = spawnSync('docker',psql,{input:script,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:8*1024*1024});
fs.writeFileSync(out+'/stdout.private.txt',result.stdout??'',{flag:'wx'});
fs.writeFileSync(out+'/stderr.private.txt',result.stderr??'',{flag:'wx'});
if(result.status!==0){console.error((result.stderr??'').slice(-1800));throw Error('SQL proof failed; preserve attempt '+out);}
const state=JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
assert.equal(state.copies,5); assert.equal(state.links,2); assert.equal(state.bindings,2);
assert.equal(state.first,ids.first); assert.equal(state.unlimited,ids.unlimited);
const receipt={at:new Date().toISOString(),status:'passed',tests:tests.length,test_names:tests,container,state,sourceSha256:sha(fs.readFileSync(root+'supabase/migrations/'+migration)),sqlSha256:sha(script),productionWrites:0,publicationWrites:0,output:out};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({status:'passed',tests:tests.length,copies:state.copies,distinctEditionParents:2,productionWrites:0,output:out}));
