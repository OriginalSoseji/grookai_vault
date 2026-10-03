// Fixed retained local413 lab; source-backed catalog fixtures, synthetic ownership only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import pg from 'pg';
import {buildJungleExecutionRows,freezeJungleExecution,executeJungleLocal,assertJungleLocalTarget,readJungleExecutionState} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',out=base+'/catalog-executor-v1';
const fixture=base+'/upgrade-413-v16',project='jungle-edition-upgrade-413-v16-20261001';
assert.equal(process.argv.length,3);const mode=process.argv[2];assert.ok(['seed','exercise'].includes(mode));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const frozen=read(fixture+'/freeze.json');assert.equal(read(fixture+'/upgrade-result.json').status,'passed');assert.equal(frozen.project,project);
for(const [name,h]of Object.entries(frozen.sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),h,name);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000});
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
for(const bindings of Object.values(JSON.parse(docker('inspect',project+'-relay'))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json');
const artifactRoot=base+'/catalog-authority-v2',artifacts=new Map(read(artifactRoot+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(artifactRoot,r.path))]));
const snapshot=JSON.parse(String(artifacts.get('jungle:production-snapshot')));
buildJungleExecutionRows(manifest,artifacts,{asOf:new Date().toISOString()});
const connect=async()=>{const client=new pg.Client({host:'127.0.0.1',port:64740,database:'postgres',user:'postgres',password:'postgres',connectionTimeoutMillis:5000});await client.connect();await assertJungleLocalTarget(client);return client;};
const client=await connect();fs.mkdirSync(out,{recursive:true});
const attempt=out+'/'+mode+'-'+Date.now();fs.mkdirSync(attempt);
const save=(name,value)=>fs.writeFileSync(attempt+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),project,mode,consumed:true,productionWrites:0,scriptSha256:sha(fs.readFileSync(new URL(import.meta.url)))});
try{
 if(mode==='seed'){
  assert.ok(!fs.existsSync(out+'/seed-receipt.json'),'Never reseed retained fixtures');
  assert.equal((await client.query('select count(*)::int n from card_prints where set_id=$1',[manifest.authority.set_id])).rows[0].n,0);
  const priorCopies=(await client.query('select to_jsonb(t) row from vault_item_instances t order by id')).rows;assert.equal(priorCopies.length,2);
  save('prior-upgrade-copies.private.json',priorCopies);
  const user=randomUUID(),legacy=manifest.parents[0].legacy_card_print_id,legacyChild=snapshot.printings.find(c=>c.card_print_id===legacy);
  await client.query('begin');
  await client.query("insert into sets(id,code,name,game,identity_model,identity_domain_default) values($1,'base2','Jungle','pokemon','standard','pokemon_eng_standard')",[manifest.authority.set_id]);
  const localGameId=(await client.query("select id from games where code='pokemon'")).rows[0].id;
  for(const [table,rows]of [['pokemon_species',snapshot.species],['card_prints',snapshot.cards.map(p=>({...p,game_id:localGameId}))],['card_printings',snapshot.printings]]){
   const generated=(await client.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated<>'NEVER'",[table])).rows.map(r=>r.column_name);
   const fields=Object.keys(rows[0]).filter(k=>!generated.includes(k)).map(k=>'"'+k+'"').join(',');
   await client.query(`insert into ${table}(${fields}) select ${fields} from jsonb_populate_recordset(null::${table},$1::jsonb)`,[JSON.stringify(rows)]);
  }
  await client.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)",[user,user+'@jungle-catalog-fixture.invalid']);
  for(let i=0;i<5;i++)await client.query("select admin_vault_instance_create_v1(p_user_id=>$1::uuid,p_card_print_id=>$2::uuid,p_condition_label=>'NM')",[user,legacy]);
  await client.query("insert into external_mappings(card_print_id,source,external_id,meta) values($1,'tcgplayer','45120',$2)",[legacy,{synthetic_dependency_fixture:true}]);
  await client.query("insert into external_printing_mappings(card_printing_id,source,external_id,meta) values($1,'tcgplayer','45120',$2)",[legacyChild.id,{synthetic_dependency_fixture:true}]);
  await client.query("insert into card_print_species(card_print_id,species_id,role,source,evidence) values($1,$2,'primary','synthetic_legacy_preservation',$3)",[legacy,manifest.species_memberships[0].species_id,{synthetic_dependency_fixture:true}]);
  assert.deepEqual((await client.query('select to_jsonb(t) row from vault_item_instances t where id=any($1::uuid[]) order by id',[priorCopies.map(r=>r.row.id)])).rows,priorCopies);
  await client.query('commit');
  const receipt={at:new Date().toISOString(),status:'passed',project,legacyParents:83,legacyChildren:84,sourceSpecies:151,syntheticJungleCopies:5,priorUpgradeCopiesPreserved:2,user,legacy,legacyChild:legacyChild.id,productionWrites:0};
  save('receipt.json',receipt);fs.writeFileSync(out+'/seed-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({status:'seeded',legacyParents:83,legacyChildren:84,productionWrites:0}));
 }else{
  const seed=read(out+'/seed-receipt.json');assert.equal(seed.status,'passed');
  const tests=[],pass=name=>tests.push(name),plan=await freezeJungleExecution({client,manifest,artifacts});save('plan.private.json',plan);
  const args={client,plan,expectedFingerprint:plan.fingerprint,manifest,artifacts};
  const run=mode=>executeJungleLocal({...args,mode});
  const initial=await readJungleExecutionState(client,plan.rows,plan.schema);
  const unchanged=async()=>assert.deepEqual(await readJungleExecutionState(client,plan.rows,plan.schema),initial);
  const rejects=async(name,operation)=>{await assert.rejects(operation);await unchanged();pass(name);};
  const preflight=await run('preflight');assert.equal(preflight.before,'before');assert.ok(Object.values(preflight.writes).every(n=>n===0));pass('read_only_preflight_zero_writes');
  const rollback=await run('rollback');assert.equal(rollback.rollbackProven,true);assert.equal(rollback.after,'exact');save('rollback.json',rollback);pass('complete_639_row_transaction_rollback');
  await unchanged();pass('rollback_preserves_all_public_table_rows');
  for(const phase of Object.keys(plan.rows))await rejects('failure_after_'+phase,()=>executeJungleLocal({...args,mode:'apply',onPhase:async name=>{if(name===phase)throw Error('injected_abort');}}));
  await rejects('failure_before_commit',()=>executeJungleLocal({...args,mode:'apply',onPhase:async name=>{if(name==='before_commit')throw Error('injected_abort');}}));
  await rejects('side_effect_on_existing_copy_rolls_back',()=>executeJungleLocal({...args,mode:'apply',onPhase:async name=>{if(name==='before_commit')await client.query("update vault_item_instances set notes='forbidden fixture mutation' where user_id=$1",[seed.user]);}}));
  for(const [name,change]of [
   ['wrong_species',p=>p.rows.card_print_species[0].species_id=randomUUID()],
   ['copied_image',p=>p.rows.card_prints[0].image_url='https://example.invalid/copied.png'],
   ['active_link',p=>p.rows.jungle_edition_identity_links_v1[0].state='active'],
   ['additional_parent',p=>p.rows.card_prints.push({...p.rows.card_prints[0],id:randomUUID()})],
   ['schema_drift',p=>{p.schema.functions.pop();p.schema_sha256=hash(p.schema);}],
  ]){const tampered=structuredClone(plan);change(tampered);delete tampered.fingerprint;tampered.fingerprint=hash(tampered);await rejects(name,()=>executeJungleLocal({...args,plan:tampered,expectedFingerprint:tampered.fingerprint,mode:'apply'}));}
  await rejects('source_byte_drift',()=>executeJungleLocal({...args,artifacts:new Map([...artifacts,['tcgdex:base2-1',Buffer.from('{}')]]),mode:'apply'}));
  const badClient={connectionParameters:{host:'production.invalid',port:5432},query(){throw Error('must_not_query_remote');}};
  await assert.rejects(assertJungleLocalTarget(badClient),/local_qualification_only/);pass('remote_target_rejected_before_query');
  // One fully committed transaction with a deliberately lost COMMIT response.
  // Resolve by fresh-connection exact readback before retrying anything.
  const lost=await connect(),original=lost.query.bind(lost);
  lost.query=async(...a)=>{const result=await original(...a);if(a[0]==='commit')throw Error('simulated_lost_commit_response');return result;};
  let uncertain;
  try{await executeJungleLocal({...args,client:lost,mode:'apply'});}catch(e){uncertain=e;}
  await lost.end();assert.equal(uncertain?.commitUncertain,true);pass('lost_commit_response_reports_uncertainty');
  const readback=await run('readback');assert.equal(readback.after,'exact');save('readback.json',readback);pass('fresh_connection_exact_readback_resolves_commit');
  const retry=await run('apply');assert.equal(retry.before,'exact');assert.ok(Object.values(retry.writes).every(n=>n===0));save('retry.json',retry);pass('retry_inserts_zero_rows_including_raw_evidence');
  assert.deepEqual((await readJungleExecutionState(client,plan.rows,plan.schema)).footprints,initial.footprints);pass('all_existing_public_records_preserved');
  const links=(await client.query('select state,count(*)::int n from jungle_edition_identity_links_v1 group by state')).rows;assert.deepEqual(links,[{state:'staged',n:128}]);pass('all128_identity_links_remain_staged');
  const validity=(await client.query('select bool_and(jungle_edition_link_valid_v1(id,true)) valid from jungle_edition_identity_links_v1')).rows[0];assert.equal(validity.valid,true);pass('every_staged_link_has_valid_exact_review');
  const exclusions=(await client.query('select get_jungle_edition_discovery_exclusions_v1() ids')).rows[0].ids;assert.equal(exclusions.length,128);assert.deepEqual([...exclusions].sort(),manifest.parents.map(p=>p.id).sort());pass('staged_editions_excluded_from_discovery');
  assert.equal((await client.query('select count(*)::int n from tcgplayer_jungle_edition_bindings_v1')).rows[0].n,0);pass('no_source_bindings_created');
  assert.equal((await client.query('select count(*)::int n from market_price_current_publication')).rows[0].n,0);pass('no_price_publication_created');
  assert.equal((await client.query('select count(*)::int n from vault_item_instances')).rows[0].n,7);pass('five_jungle_and_two_prior_copies_retained');
  const receipt={at:new Date().toISOString(),status:'passed',project,tests,testCount:tests.length,planFingerprint:plan.fingerprint,plannedRows:Object.fromEntries(Object.entries(plan.rows).map(([t,r])=>[t,r.length])),protectedPublicTables:plan.before.footprints.length,productionWrites:0,activation:false,localCommit:true,executorSha256:sha(fs.readFileSync('backend/catalog/jungle_edition_catalog_execution_v1.mjs'))};save('receipt.json',receipt);console.log(JSON.stringify(receipt));
 }
}catch(error){await client.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:error.message,stack:error.stack,commitUncertain:error.commitUncertain??false,committed:error.committed??false});console.error(error.message);process.exitCode=1;}finally{await client.end();}
