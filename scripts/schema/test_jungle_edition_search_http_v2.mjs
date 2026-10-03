// Actual PostgREST/Auth search, discovery and retained-ownership proof in V12.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const fixture=base+'/full-412-v12', project='jungle-edition-full-412-v12-20261001';
assert.equal(process.argv.length,2);
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
assert.equal(freeze.project,project);
assert.equal(hash(fs.readFileSync('supabase/migrations/20261001050000_jungle_edition_foundation_v1.sql')),freeze.sourceHashes['20261001050000_jungle_edition_foundation_v1.sql']);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const successes=fs.readdirSync(base).filter(n=>n.startsWith('foundation-sql-v12-')&&fs.existsSync(base+'/'+n+'/receipt.json'));
assert.equal(successes.length,1);
const sqlProof=JSON.parse(fs.readFileSync(base+'/'+successes[0]+'/receipt.json'));
assert.equal(sqlProof.status,'passed');assert.equal(sqlProof.sourceSha256,freeze.sourceHashes['20261001050000_jungle_edition_foundation_v1.sql']);
const {ids}=JSON.parse(fs.readFileSync(base+'/'+successes[0]+'/fixture-intent.json'));
const out=base+'/search-http-v2';fs.mkdirSync(out);
fs.writeFileSync(out+'/intent.json',JSON.stringify({at:new Date().toISOString(),project,user:ids.user,consumed:true,productionWrites:0},null,2),{flag:'wx'});
const env={...process.env};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
const config=JSON.parse(execFileSync('supabase',['status','--output','json','--workdir',fixture,'--network-id',project],{encoding:'utf8',windowsHide:true,env,stdio:['ignore','pipe','pipe']}));
assert.equal(config.API_URL,'http://127.0.0.1:63641');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const anon=createClient(config.API_URL,config.ANON_KEY,options),admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options);
const tests=[];
const rpc='get_jungle_edition_resolution_v1';
const publicResult=await anon.rpc(rpc,{p_card_print_id:ids.legacy});
assert.ifError(publicResult.error);assert.equal(publicResult.data.status,'selection_required');assert.equal(publicResult.data.options.length,2);tests.push('anonymous_exact_choices');
const denied=await anon.from('jungle_edition_identity_links_v1').select('*');assert.ok(denied.error);tests.push('anonymous_internal_table_denied');
const password=randomUUID()+'aA!8';
const email=randomUUID()+'@jungle-http.invalid';
const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);
assert.ok(created.data.user?.id);assert.notEqual(created.data.user.id,ids.user);
const owner=createClient(config.API_URL,config.ANON_KEY,options);
const login=await owner.auth.signInWithPassword({email,password});assert.ifError(login.error);assert.equal(login.data.user.id,created.data.user.id);
const retained=await admin.from('vault_item_instances').select('id,card_print_id,card_printing_id,legacy_vault_item_id,archived_at').order('id');
assert.ifError(retained.error);assert.equal(retained.data.length,5);assert.ok(retained.data.every(x=>x.card_print_id===ids.legacy));tests.push('service_existing_copy_read');
const privateRows=await owner.from('vault_item_instances').select('id');assert.ifError(privateRows.error);assert.equal(privateRows.data.length,0);tests.push('authenticated_cross_owner_read_denied');
const held=await admin.rpc('vault_add_card_instance_service_v1',{p_actor_user_id:ids.user,p_card_print_id:ids.legacy,p_card_printing_id:ids.legacyChild});
assert.equal(held.error?.message,'JUNGLE_EDITION_REQUIRED');tests.push('actual_service_rpc_typed_rejection');
const after=await admin.from('vault_item_instances').select('id,card_print_id,card_printing_id,legacy_vault_item_id,archived_at').order('id');assert.ifError(after.error);assert.deepEqual(after.data,retained.data);tests.push('rejected_add_preserves_owned_copies');
const explicit=await owner.rpc(rpc,{p_card_print_id:ids.first});assert.ifError(explicit.error);assert.equal(explicit.data.status,'ready');tests.push('authenticated_exact_edition_read');
const discovery=await anon.rpc('get_jungle_edition_discovery_exclusions_v1');
assert.ifError(discovery.error);assert.deepEqual(discovery.data,[ids.legacy]);tests.push('anonymous_discovery_excludes_only_legacy');
const catalog=await anon.rpc('get_public_catalog_sets_v2',{p_game_code:'pokemon'});assert.ifError(catalog.error);assert.equal(catalog.data.find(row=>row.code==='base2').card_count,2);tests.push('catalog_count_two_not_three');
const setCount=await anon.rpc('get_public_set_card_counts_v1',{p_set_codes:['base2']});assert.ifError(setCount.error);assert.equal(setCount.data[0].card_count,2);tests.push('set_count_matches_catalog');
const pages=[];for(let offset=0;offset<2;offset++){
 const page=await anon.from('card_prints').select('id',{count:'exact'}).eq('set_id',ids.set).not('id','in','('+discovery.data.join(',')+')').order('id').range(offset,offset);
 assert.ifError(page.error);assert.equal(page.count,2);assert.equal(page.data.length,1);pages.push(page.data[0].id);
}assert.equal(new Set(pages).size,2);assert.ok(!pages.includes(ids.legacy));tests.push('filtered_pagination_has_no_legacy_or_missing_page');
const legacy=await anon.from('card_prints').select('id,gv_id').eq('id',ids.legacy).single();assert.ifError(legacy.error);assert.equal(legacy.data.gv_id,'GV-PK-JU-1');tests.push('exact_legacy_route_remains_readable');
const viewParents=await anon.from('v_card_prints_discovery_v1').select('id,sets(name)',{count:'exact'}).eq('set_id',ids.set).order('id');
assert.ifError(viewParents.error);assert.equal(viewParents.count,2);assert.ok(viewParents.data.every(row=>row.id!==ids.legacy && row.sets.name==='Jungle'));tests.push('discovery_parent_view_preserves_set_embedding_and_count');
const viewChildren=await anon.from('v_card_printings_discovery_v1').select('id,card_print_id,card_prints(gv_id,name)').order('id');
assert.ifError(viewChildren.error);assert.equal(viewChildren.data.length,2);assert.ok(viewChildren.data.every(row=>row.card_print_id!==ids.legacy && row.card_prints.name==='Clefable'));tests.push('discovery_child_view_preserves_parent_embedding');
for(const [name,args,idKey] of [
 ['search_game_card_prints_v4',{game_code_in:'pokemon',q:'Clefable'},'id'],
 ['search_card_prints_v1',{q:'Clefable'},'id'],
 ['search_print_identity_v1',{q:'Clefable',object_type_in:'parent_print'},'parent_gv_id'],
 ['search_print_identity_v1',{q:'Clefable',object_type_in:'child_printing'},'printing_gv_id'],
]){
 const rows=[];for(let offset=0;offset<3;offset++){
  const result=await anon.rpc(name,{...args,limit_in:1,offset_in:offset});assert.ifError(result.error);
  assert.equal(result.data.length,offset<2?1:0);rows.push(...result.data);
 }
 assert.equal(new Set(rows.map(row=>row[idKey])).size,2);assert.ok(rows.every(row=>row[idKey]!==ids.legacy&&row[idKey]!=='GV-PK-JU-1'&&row[idKey]!=='GV-PK-JU-1-HOLO'));
 tests.push(name+'_'+idKey+'_pagination_two_full_pages_then_end');
}
for(const [name,args,key,value]of [
 ['search_game_card_prints_v4',{game_code_in:'pokemon',q:'GV-PK-JU-1'},'id',ids.legacy],
 ['search_print_identity_v1',{q:'GV-PK-JU-1',object_type_in:'parent_print'},'parent_gv_id','GV-PK-JU-1'],
 ['search_print_identity_v1',{q:'GV-PK-JU-1-HOLO',object_type_in:'child_printing'},'printing_gv_id','GV-PK-JU-1-HOLO'],
]){
 const result=await anon.rpc(name,{...args,limit_in:10});assert.ifError(result.error);assert.ok(result.data.some(row=>row[key]===value));tests.push(name+'_'+key+'_retained_exact_identity');
}
const completion=await admin.rpc('user_set_completion_v1',{p_user_id:ids.user,p_set_id:ids.set});assert.ifError(completion.error);assert.equal(completion.data[0].variant_option_count,2);assert.equal(completion.data[0].owned_variant_option_count,0);tests.push('server_completion_holds_legacy_credit');
const otherCompletion=await owner.rpc('user_set_completion_v1',{p_user_id:ids.user,p_set_id:ids.set});assert.ok(otherCompletion.error);tests.push('server_completion_rejects_other_owner');
const anonCompletion=await anon.rpc('user_set_completion_v1',{p_user_id:ids.user,p_set_id:ids.set});assert.ok(anonCompletion.error);tests.push('server_completion_remains_private');
for(const [client,label] of [[anon,'anonymous'],[owner,'authenticated']]){
 for(const table of ['tcgplayer_jungle_edition_assignments_v1','v_tcgplayer_jungle_edition_assignment_candidates_v1','v_tcgplayer_jungle_edition_current_assignments_v1']){
  const denied=await client.from(table).select('*');assert.ok(denied.error);tests.push(label+'_'+table+'_denied');
 }
 const denied=await client.rpc('prepare_tcgplayer_jungle_edition_assignments_v1',{p_source_sync_run_id:randomUUID()});
 assert.ok(denied.error);tests.push(label+'_edition_assignment_preparation_denied');
}
const assignments=await admin.from('v_tcgplayer_jungle_edition_current_assignments_v1').select('*');
assert.ifError(assignments.error);assert.equal(assignments.data.length,2);
assert.ok(assignments.data.every(row=>row.publishable===false));
assert.deepEqual(assignments.data.map(row=>row.assignment_payload.canonical.card_print_id).sort(),[ids.first,ids.unlimited].sort());
tests.push('service_role_reads_two_exact_nonpublishable_edition_assignments');
const prepared=await admin.rpc('prepare_tcgplayer_jungle_edition_assignments_v1',{p_source_sync_run_id:assignments.data[0].source_sync_run_id});
assert.ifError(prepared.error);assert.equal(prepared.data,0);tests.push('service_rpc_preparation_is_idempotent');
const immutable=await admin.from('tcgplayer_jungle_edition_assignments_v1').update({assignment_payload:{}}).eq('id',assignments.data[0].id);
assert.ok(immutable.error);tests.push('service_http_cannot_rewrite_assignment');
await owner.auth.signOut();
const receipt={at:new Date().toISOString(),status:'passed',tests,testCount:tests.length,project,sourceSha256:sqlProof.sourceSha256,scriptSha256:hash(fs.readFileSync(new URL(import.meta.url))),productionWrites:0,ownershipWrites:0};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
