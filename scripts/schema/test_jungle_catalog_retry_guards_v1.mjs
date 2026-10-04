// Non-destructive follow-up on the committed local rehearsal; every injected drift rolls back.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';import pg from 'pg';
import {executeJungleLocal,readJungleExecutionState,assertJungleLocalTarget} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',root=base+'/catalog-executor-v1';
assert.equal(process.argv.length,2);const read=p=>JSON.parse(fs.readFileSync(p));
const attempts=fs.readdirSync(root).filter(n=>n.startsWith('exercise-')&&fs.existsSync(root+'/'+n+'/receipt.json'));assert.equal(attempts.length,1);
const prior=root+'/'+attempts[0],proof=read(prior+'/receipt.json'),plan=read(prior+'/plan.private.json');assert.equal(proof.status,'passed');
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(proof.executorSha256,sha(fs.readFileSync('backend/catalog/jungle_edition_catalog_execution_v1.mjs')));
const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json'),artifactRoot=base+'/catalog-authority-v2';
const artifacts=new Map(read(artifactRoot+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(artifactRoot,r.path))]));
const seed=read(root+'/seed-receipt.json'),out=root+'/retry-guards-'+Date.now();fs.mkdirSync(out);
const save=(n,x)=>fs.writeFileSync(out+'/'+n,JSON.stringify(x,null,2),{flag:'wx'});
const connect=async()=>{const c=new pg.Client({host:'127.0.0.1',port:64740,user:'postgres',password:'postgres',database:'postgres'});await c.connect();await assertJungleLocalTarget(c);return c;};
const client=await connect(),args={client,plan,expectedFingerprint:plan.fingerprint,manifest,artifacts};
save('intent.json',{at:new Date().toISOString(),project:proof.project,consumed:true,productionWrites:0,planFingerprint:plan.fingerprint});
const tests=[];
try{
 const initial=await readJungleExecutionState(client,plan.rows,plan.schema);
 const child=plan.rows.card_printings.find(c=>c.finish_key==='holo');
 const cases=[
  ['missing_raw_evidence','delete from raw_imports where id=$1',[plan.rows.raw_imports[0].id],/partial_or_conflicting_execution/],
  ['missing_truth_review','delete from card_printing_truth_reviews where id=$1',[plan.rows.card_printing_truth_reviews[0].id],/partial_or_conflicting_execution/],
  ['renamed_new_parent',"update card_prints set name='Forged fixture name' where id=$1",[plan.rows.card_prints[0].id],/partial_or_conflicting_execution/],
  ['changed_species_evidence',"update card_print_species set evidence='{}' where id=$1",[plan.rows.card_print_species[0].id],/partial_or_conflicting_execution/],
  ['unexpected_sibling',"insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,'normal',$3)",[randomUUID(),child.card_print_id,child.printing_gv_id+'-FORGED'],/protected_records_drift/],
  ['raw_payload_tampered',"update raw_imports set payload='{}' where id=$1",[plan.rows.raw_imports[0].id],/partial_or_conflicting_execution/],
  ['saved_copy_notes_changed',"update vault_item_instances set notes='forbidden' where user_id=$1",[seed.user],/protected_records_drift/],
  ['legacy_mapping_json_changed',"update external_mappings set meta='{}' where card_print_id=$1",[seed.legacy],/protected_records_drift/],
  ['old_parent_changed',"update card_prints set name='forbidden legacy name' where id=$1",[seed.legacy],/protected_records_drift/],
 ];
 for(const [name,sql,params,pattern]of cases){
  let error,mutated=0;
  try{await executeJungleLocal({...args,mode:'apply',onPhase:async phase=>{if(phase==='before_commit')mutated=(await client.query(sql,params)).rowCount;}});}catch(e){error=e;}
  assert.ok(mutated>0,name+' must exercise a real mutation');assert.ok(error,name+' must reject');assert.match(error.message,pattern);assert.equal(error.commitUncertain,false);assert.equal(error.committed,false);
  assert.deepEqual(await readJungleExecutionState(client,plan.rows,plan.schema),initial,name+' rollback must restore exact committed state');
  tests.push({name,mutatedRowsRolledBack:mutated,expectedRejection:pattern.source});
 }
 const clients=await Promise.all([connect(),connect()]);
 try{
  const results=await Promise.all(clients.map(c=>executeJungleLocal({...args,client:c,mode:'apply'})));
  assert.ok(results.every(r=>r.before==='exact'&&Object.values(r.writes).every(n=>n===0)));
  tests.push({name:'concurrent_exact_retries_both_insert_zero_rows'});
 }finally{await Promise.all(clients.map(c=>c.end()));}
 assert.deepEqual(await readJungleExecutionState(client,plan.rows,plan.schema),initial);
 const counts=(await client.query(`select finish_key,count(*)::int n from card_printings where card_print_id=any($1::uuid[]) group by finish_key order by finish_key`,[manifest.parents.map(p=>p.id)])).rows;
 assert.deepEqual(counts,[{finish_key:'holo',n:32},{finish_key:'normal',n:96}]);tests.push({name:'exact32_holo96_normal_children'});
 const trainerIds=manifest.parents.filter(p=>p.printed_coordinate==='64').map(p=>p.id);
 assert.equal((await client.query('select count(*)::int n from card_print_species where card_print_id=any($1::uuid[])',[trainerIds])).rows[0].n,0);tests.push({name:'pokeball_has_no_species_membership'});
 const images=(await client.query("select count(*)::int n from card_prints where id=any($1::uuid[]) and (image_url is not null or image_path is not null or representative_image_url is not null or external_ids<>'{}'::jsonb)",[manifest.parents.map(p=>p.id)])).rows[0].n;
 assert.equal(images,0);tests.push({name:'no_copied_images_or_provider_ids'});
 const receipt={at:new Date().toISOString(),status:'passed',testCount:tests.length,tests,planFingerprint:plan.fingerprint,executorSha256:proof.executorSha256,productionWrites:0,localDurableMutationRows:0};
 save('receipt.json',receipt);console.log(JSON.stringify(receipt));
}catch(e){save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack});console.error(e.message);process.exitCode=1;}finally{await client.end();}
