// Schema425 catalog staging rehearsal. Production targets reject before SQL.
// No activation, source bindings, pricing publication or post-commit deletion.
import assert from 'node:assert/strict';
import {buildJungleExecutionRows,readJungleExecutionSchema,readJungleExecutionState} from './jungle_edition_catalog_execution_v1.mjs';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
// Production execution needs a separately qualified post-migration capture.

export const JUNGLE_RELEASE_EXECUTION_V4='JUNGLE_EDITION_CATALOG_RELEASE_EXECUTION_V4';
const tables=['raw_imports','card_prints','card_printings','card_printing_truth_reviews','card_print_species','jungle_edition_identity_links_v1'];
const sorted=rows=>[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
const identifier=s=>'"'+s.replaceAll('"','""')+'"';
const normalize=rows=>sorted(rows).map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,k.endsWith('_at')&&v?new Date(v).toISOString():v])));


export async function assertJungleReleaseTarget(client,target){
 assert.equal(target,'local_rehearsal','post_migration_production_context_not_qualified');
 const c=client.connectionParameters;
 assert.equal(c.database,'postgres');
 assert.equal(c.host,'127.0.0.1');assert.equal(Number(c.port),54000,'fixed_local_rehearsal_port_required');assert.equal(c.user,'postgres');
 const state=(await client.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.equal(state.migrations,425,'qualified_425_schema_required');
 if(target==='local_rehearsal'){
  // Each fixed port belongs to exactly one isolated fixture subnet. The full
  // source fixture is separate from the retained rollback-only upgrade lab.
  assert.match(state.address,/^10\.248\.27\.\d+$/);assert.equal(state.workers,'0');
 }
}
const ledger=async client=>(await client.query('select version,name,statements from supabase_migrations.schema_migrations order by version')).rows;
const buildRows=(manifest,artifacts,options,target,refresh)=>{
 // Keep the original physical review immutable for this isolated rehearsal.
 assert.equal(target,'local_rehearsal','post_migration_production_context_not_qualified');
 const asOf=JSON.parse(String(artifacts.get('jungle:production-snapshot'))).at;
 const rows=buildJungleExecutionRows(manifest,artifacts,{...options,asOf});
 rows.raw_imports[0].notes='Reviewed Jungle base editions; bounded catalog staging only; no activation, publication or copy reassignment.';
 return rows;
};

function expectedFullRows(rows,schema){
 return Object.fromEntries(tables.map(t=>[t,normalize(rows[t].map(row=>Object.fromEntries(schema.columns.filter(c=>c.table_name===t).map(c=>[c.column_name,Object.hasOwn(row,c.column_name)?row[c.column_name]:null]))))]));
}

export async function freezeJungleRelease({client,manifest,artifacts,target,refresh}){
 await assertJungleReleaseTarget(client,target);
 const games=(await client.query("select id from games where code='pokemon'")).rows;assert.equal(games.length,1);
 const localGameId=games[0].id,asOf=new Date().toISOString(),rows=buildRows(manifest,artifacts,{asOf,gameId:localGameId},target,refresh);
 await client.query('begin isolation level repeatable read read only');
 try{
  const schema=await readJungleExecutionSchema(client),before=await readJungleExecutionState(client,rows,schema);
  assert.ok(tables.every(t=>before.selected[t].length===0),'initial_collision_or_partial_state');
  const snapshot=JSON.parse(String(artifacts.get('jungle:production-snapshot')));
  const legacy=(await client.query('select to_jsonb(t) row from card_prints t where set_id=$1 order by id',[manifest.authority.set_id])).rows.map(r=>r.row);
  // Only the fixed rehearsal lab may translate the environment-specific game FK.
  if(target==='production')assert.equal(localGameId,snapshot.cards[0].game_id);
  assert.deepEqual(normalize(legacy),normalize(snapshot.cards.map(p=>({...p,game_id:localGameId}))),'legacy_scope_drift');
  const species=(await client.query('select to_jsonb(t) row from pokemon_species t where id=any($1::uuid[]) order by id',[[...new Set(rows.card_print_species.map(r=>r.species_id))]])).rows.map(r=>r.row);
  assert.deepEqual(normalize(species),normalize(snapshot.species.filter(s=>rows.card_print_species.some(r=>r.species_id===s.id))),'species_authority_drift');
  const set=(await client.query('select id,code,game,identity_model from sets where id=$1',[manifest.authority.set_id])).rows;
  assert.deepEqual(set,[{id:manifest.authority.set_id,code:'base2',game:'pokemon',identity_model:'standard'}]);
  const plan={version:JUNGLE_RELEASE_EXECUTION_V4,target,executionRefresh:refresh??null,production_execution_authorized:false,activation:false,asOf,localGameId,manifest_fingerprint:manifest.fingerprint,ledger:await ledger(client),
   rows,schema,schema_sha256:hash(schema),before,expected:expectedFullRows(rows,schema),boundaries:{updates:0,deletes:0,ownedCopyWrites:0,sourceMappingWrites:0,pricingWrites:0,activeLinks:0}};
  plan.fingerprint=hash(plan);await client.query('rollback');return plan;
 }catch(e){await client.query('rollback');throw e;}
}

export function assertJungleReleasePlan(plan,expectedFingerprint,manifest,artifacts,{readback=false}={}){
 const {fingerprint,...body}=plan;assert.equal(fingerprint,expectedFingerprint);assert.equal(hash(body),fingerprint,'execution_plan_drift');
 assert.equal(plan.version,JUNGLE_RELEASE_EXECUTION_V4);assert.equal(plan.target,'local_rehearsal','post_migration_production_context_not_qualified');assert.equal(plan.production_execution_authorized,false);assert.equal(plan.activation,false);
 const age=Date.now()-Date.parse(plan.asOf);assert.ok(Number.isFinite(age)&&age>=0&&(readback||age<3600000),'execution_plan_stale_or_future');
 assert.equal(plan.ledger.length,425);assert.equal(new Set(plan.ledger.map(r=>r.version)).size,425);assert.equal(plan.manifest_fingerprint,manifest.fingerprint);assert.equal(hash(plan.schema),plan.schema_sha256);
 assert.deepEqual(plan.rows,buildRows(manifest,artifacts,{asOf:readback?plan.asOf:new Date().toISOString(),gameId:plan.localGameId},plan.target,plan.executionRefresh));
 assert.deepEqual(plan.expected,expectedFullRows(plan.rows,plan.schema));
 assert.deepEqual(plan.boundaries,{updates:0,deletes:0,ownedCopyWrites:0,sourceMappingWrites:0,pricingWrites:0,activeLinks:0});
}

function classify(plan,state){
 assert.deepEqual(state.footprints,plan.before.footprints,'protected_records_drift');
 if(tables.every(t=>state.selected[t].length===0))return 'before';
 assert.deepEqual(state.selected,plan.expected,'partial_or_conflicting_execution');return 'exact';
}

export async function executeJungleRelease({client,plan,expectedFingerprint,manifest,artifacts,mode,onPhase=async()=>{}}){
 assert.ok(['preflight','rollback','apply','readback'].includes(mode));
 const validation={readback:mode==='readback'};
 assertJungleReleasePlan(plan,expectedFingerprint,manifest,artifacts,validation);await assertJungleReleaseTarget(client,plan.target);
 let commitAttempted=false,committed=false;
 try{
  await client.query('begin isolation level serializable'+(['preflight','readback'].includes(mode)?' read only':''));
  await client.query("set local lock_timeout='3s'");await client.query("set local statement_timeout='45s'");
  if(['rollback','apply'].includes(mode)){
   await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['JUNGLE_EDITION_CATALOG_RELEASE_EXECUTION_V2']);
   await client.query('lock table '+tables.map(t=>'public.'+identifier(t)).join(',')+' in share row exclusive mode');
   await client.query('select id from card_prints where set_id=$1 order by id for update',[manifest.authority.set_id]);
  }
  assert.equal(hash(await readJungleExecutionSchema(client)),plan.schema_sha256,'schema_or_side_effect_drift');
  assert.deepEqual(await ledger(client),plan.ledger,'migration_ledger_drift');
  assert.deepEqual((await client.query("select id from games where code='pokemon'")).rows,[{id:plan.localGameId}],'game_registry_drift');
  const before=await readJungleExecutionState(client,plan.rows,plan.schema),classification=classify(plan,before);
  if(mode==='readback')assert.equal(classification,'exact');
  const writes=Object.fromEntries(tables.map(t=>[t,0]));
  if(classification==='before'&&['rollback','apply'].includes(mode)){
   for(const t of tables){
    const fields=Object.keys(plan.rows[t][0]).filter(k=>plan.schema.columns.find(c=>c.table_name===t&&c.column_name===k)?.is_generated==='NEVER').map(identifier).join(',');
    writes[t]=(await client.query(`insert into public.${identifier(t)}(${fields}) select ${fields} from jsonb_populate_recordset(null::public.${identifier(t)},$1::jsonb)`,[JSON.stringify(plan.rows[t])])).rowCount;
    assert.equal(writes[t],plan.rows[t].length);await onPhase(t);
   }
  }
  assertJungleReleasePlan(plan,expectedFingerprint,manifest,artifacts,validation);
  assert.equal(hash(await readJungleExecutionSchema(client)),plan.schema_sha256,'schema_or_side_effect_drift');
  assert.deepEqual(await ledger(client),plan.ledger,'migration_ledger_drift');
  const after=await readJungleExecutionState(client,plan.rows,plan.schema),afterClass=classify(plan,after);
  if(mode!=='preflight'||classification==='exact')assert.equal(afterClass,'exact');
  const result={mode,before:classification,after:afterClass,writes,fingerprint:plan.fingerprint,project_ref:plan.target==='production'?'ycdxbpibncqcchqiihfz':null,target:plan.target,activation:false,dependenciesPreserved:true};
  if(mode==='apply'){
   await onPhase('before_commit');
   assertJungleReleasePlan(plan,expectedFingerprint,manifest,artifacts);
   assert.equal(classify(plan,await readJungleExecutionState(client,plan.rows,plan.schema)),'exact');
   assert.equal(hash(await readJungleExecutionSchema(client)),plan.schema_sha256,'schema_or_side_effect_drift');
   assert.deepEqual(await ledger(client),plan.ledger,'migration_ledger_drift');
   commitAttempted=true;await client.query('commit');committed=true;
  }
  else await client.query('rollback');
  if(mode==='rollback'){assert.deepEqual(await readJungleExecutionState(client,plan.rows,plan.schema),before,'rollback_readback_mismatch');result.rollbackProven=true;}
  if(mode==='apply')assert.equal(classify(plan,await readJungleExecutionState(client,plan.rows,plan.schema)),'exact');
  return {...result,committed,commitUncertain:false};
 }catch(e){try{await client.query('rollback');}catch{e.rollbackUncertain=true;}e.commitUncertain=commitAttempted&&!committed;e.committed=committed;throw e;}
}
