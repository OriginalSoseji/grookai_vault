// One-use local qualification. The populated fixture is retained after COMMIT.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {inspectJungleExecutorV45, assertJungleExecutorLocalV45} from './inspect_jungle_executor_v45.mjs';
import {freezeJungleReleaseV6, executeJungleReleaseV6, jungleProducerV6} from '../../backend/catalog/jungle_edition_catalog_release_v6.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const base = 'C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001', root = 'C:/gv_jungle_edition_20261001';
assert.equal(process.argv.length, 2); assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(), root.toLowerCase());
const read = p => JSON.parse(fs.readFileSync(p)), sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(read(base + '/executor-qualification-v45/seed/receipt.json').status, 'passed');
const runtime = inspectJungleExecutorV45(), out = base + '/executor-qualification-v45/transaction-' + Date.now(); fs.mkdirSync(out);
const save = (n,v) => fs.writeFileSync(out + '/' + n, JSON.stringify(v,null,2), {flag:'wx'});
save('intent.json', {at:new Date().toISOString(),runtime,productionWrites:0,resetOrReseed:false,sourceSha256:sha(fs.readFileSync(new URL(import.meta.url))),producer:jungleProducerV6()});
const options = {host:'127.0.0.1',port:54800,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:10000};
const c = new pg.Client(options); await c.connect(); await assertJungleExecutorLocalV45(c,'local_qualification');
const ar = base + '/catalog-authority-v2', manifest = read(root + '/docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json');
const artifacts = new Map(read(ar + '/artifact-map.portable.json').map(r => [r.ref,fs.readFileSync(path.resolve(ar,r.path))]));
const tables = (await c.query("select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by relname")).rows.map(r => r.relname);
for (const name of tables) assert.match(name,/^[a-z_][a-z0-9_]*$/);
const oracle = exclude => {
  const args = [], sql = tables.map(table => {
    let where = ''; if (exclude?.[table]) {args.push(exclude[table].map(r => String(r.id))); where = ` where id::text<>all($${args.length}::text[])`;}
    return `select '${table}' table_name,count(*)::int rows,md5(coalesce(string_agg(md5(t::text),'' order by md5(t::text)),'')) digest from public."${table}" t${where}`;
  }).join(' union all ') + ' order by table_name';
  return c.query(sql,args).then(r => r.rows);
};
const before = await oracle(), checks = [], pass = name => {checks.push(name); console.log(JSON.stringify({check:checks.length,name,status:'passed'}));}; save('public-before.json',before);
let committed = false, plan;
try {
  plan = await freezeJungleReleaseV6({client:c,manifest,artifacts,target:'local_qualification'}); save('plan.private.json',plan);
  assert.ok(plan.historicalPrecision.cards.unrecordedSubmillisecondFields.length>0);
  assert.ok(plan.retained.cards.some(r=>/741\+00:00$/.test(r.created_at)));pass('historical_milliseconds_compared_current_microseconds_retained');
  const args = {client:c,plan,expectedFingerprint:plan.fingerprint,manifest,artifacts}, run = mode => executeJungleReleaseV6({...args,mode});
  const unchanged = async () => assert.deepEqual(await oracle(),before,'whole_public_table_preservation_failed');
  assert.equal((await run('preflight')).before,'before'); pass('read_only_preflight');
  const rollback = await run('rollback'); assert.equal(rollback.rollbackProven,true); assert.equal(rollback.independentReadback,true); assert.equal(Object.values(rollback.writes).reduce((a,b)=>a+b),639); await unchanged(); save('rollback.json',rollback); pass('639_real_inserts_rolled_back_and_stable_independent_readback');
  for (const phase of Object.keys(plan.rows).concat('before_commit')) {
    await assert.rejects(executeJungleReleaseV6({...args,mode:'apply',onPhase:async p=>{if(p===phase)throw Error('injected_'+p);}}),/injected_/);
    await unchanged(); pass('failure_after_'+phase);
  }
  for (const [name,sql,values,error] of [
    ['copy_notes',"update vault_item_instances set notes='forbidden fixture update'",[],/protected_records_drift/],
    ['receipt_book','update vendor_receipt_books set revision=revision+1',[],/protected_records_drift/],
    ['cart_recovery',"update vendor_sales_cart_receipts set request=request||'{\"forbidden\":true}'::jsonb",[],/protected_records_drift/],
    ['catalog_recovery',"update vendor_sales_catalog_adds set request=request||'{\"forbidden\":true}'::jsonb",[],/protected_records_drift/],
    ['receipt_control','update vendor_receipt_cloud_control set enabled=not enabled',[],/protected_records_drift/],
    ['sales_control','update vendor_sales_cart_control set enabled=not enabled',[],/protected_records_drift/],
    ['trade_control','update vendor_sales_trade_control set enabled=not enabled',[],/auxiliary_records_drift/],
    ['legacy_json',"update card_prints set external_ids=external_ids||'{\"forbidden\":true}'::jsonb where id=$1",[plan.legacyParents[0]],/protected_records_drift/],
    ['legacy_microsecond',"update card_prints set created_at=created_at+interval '1 microsecond' where id=$1",[plan.legacyParents[0]],/protected_records_drift/],
    ['legacy_provenance',"update card_printings set provenance_ref='forbidden fixture update' where id=$1",[plan.legacyChildren[0]],/protected_records_drift/],
    ['planned_microsecond',"update card_printings set created_at=created_at+interval '1 microsecond' where id=$1",[plan.rows.card_printings[0].id],/planned_native_record_drift/],
    ['species_json',"update pokemon_species set display_name=display_name||' test' where id=$1",[plan.retained.species[0].id],/species_authority_drift/],
    ['set_metadata',"update sets set name=name||' forbidden test' where id=$1",[manifest.authority.set_id],/auxiliary_records_drift/],
    ['game_metadata',"update games set name=name||' forbidden test' where id=$1",[plan.gameId],/auxiliary_records_drift/],
    ['schema_function',"create function public.jungle_v45_unreviewed() returns integer language sql as 'select 1'",[],/schema_or_ledger_drift/],
    ['partial_review','delete from card_printing_truth_reviews where id=$1',[plan.rows.card_printing_truth_reviews[0].id],/partial_or_conflicting_execution/],
  ]) {
    await assert.rejects(executeJungleReleaseV6({...args,mode:'apply',onPhase:async p=>{if(p==='before_commit')await c.query(sql,values);}}),error);
    await unchanged(); pass(name+'_side_effect_rejected');
  }
  const altered = structuredClone(plan); altered.rows.jungle_edition_identity_links_v1[0].state='active'; delete altered.fingerprint; altered.fingerprint=hash(altered);
  await assert.rejects(executeJungleReleaseV6({...args,plan:altered,expectedFingerprint:altered.fingerprint,mode:'rollback'})); await unchanged(); pass('rehashing_active_payload_cannot_bypass_source_review');
  await assert.rejects(executeJungleReleaseV6({...args,mode:'rollback',artifacts:new Map([...artifacts,['tcgdex:base2-1',Buffer.from('{}')]])})); await unchanged(); pass('changed_source_bytes_rejected_before_sql');
  const wrap = query => ({connectionParameters:c.connectionParameters,query});
  await assert.rejects(executeJungleReleaseV6({...args,mode:'rollback',client:wrap(async(sql,values)=>{if(sql.startsWith('set local timezone'))throw Error('settings_failed');return c.query(sql,values);})}),/settings_failed/); await unchanged(); pass('begin_settings_failure_closes_transaction');
  const rollbackLost = wrap(async(sql,values)=>{const r=await c.query(sql,values);if(sql==='rollback')throw Error('rollback_ack_lost');return r;});
  await assert.rejects(executeJungleReleaseV6({...args,mode:'rollback',client:rollbackLost}),e=>e.message==='rollback_ack_lost'&&e.rollbackUncertain===true&&e.commitUncertain===false); await unchanged(); pass('lost_rollback_acknowledgement_is_uncertain');
  // A genuine duplicate key fails midway, with the original SQLSTATE preserved.
  await assert.rejects(executeJungleReleaseV6({...args,mode:'rollback',onPhase:async p=>{if(p==='card_printings')await c.query('insert into card_printings select * from card_printings where id=$1',[plan.rows.card_printings[0].id]);}}),e=>e.code==='23505'); await unchanged(); pass('real_database_error_rolls_back_partial_staging');
  save('rollback-checks.json',{status:'passed',checks:[...checks],checkCount:checks.length,allPublicTables:tables.length,productionWrites:0});
  const protectedBefore = await oracle(plan.rows), second = new pg.Client(options); await second.connect();
  let concurrent, waitObserved=false;
  try {
    const firstPid=(await c.query('select pg_backend_pid() p')).rows[0].p, secondPid=(await second.query('select pg_backend_pid() p')).rows[0].p;
    const lostCommit = wrap(async(sql,values)=>{const r=await c.query(sql,values);if(sql==='commit'){committed=true;throw Error('commit_ack_lost');}return r;});
    await assert.rejects(executeJungleReleaseV6({...args,client:lostCommit,mode:'apply',onPhase:async p=>{
      if(p!=='before_commit')return;
      concurrent=executeJungleReleaseV6({...args,client:second,mode:'apply'}).then(value=>({status:'fulfilled',value}),error=>({status:'rejected',code:error.code,message:error.message,commitUncertain:error.commitUncertain,rollbackUncertain:error.rollbackUncertain??false}));
      for(let i=0;i<80;i++){if((await c.query('select pg_blocking_pids($1) p',[secondPid])).rows[0].p.includes(firstPid)){waitObserved=true;break;}await new Promise(r=>setTimeout(r,20));}
      assert.equal(waitObserved,true,'concurrent_wait_required');
    }}),e=>e.message==='commit_ack_lost'&&e.commitUncertain===true&&e.committed===false&&e.independentReadbackRequired===true);
    pass('actual_commit_with_simulated_lost_ack_is_uncertain');
    const competing=await concurrent; save('concurrent.json',competing); assert.equal(competing.status,'rejected'); assert.ok(['40001','55P03'].includes(competing.code)); assert.equal(competing.commitUncertain,false); pass('actual_concurrent_wait_then_safe_conflict');
    const readback=await executeJungleReleaseV6({...args,client:second,mode:'readback'}); assert.equal(readback.after,'exact'); save('independent-readback.json',readback); pass('independent_recovery_after_uncertain_commit');
    const retry=await executeJungleReleaseV6({...args,client:second,mode:'apply'}); assert.equal(retry.committed,true); assert.ok(Object.values(retry.writes).every(n=>n===0)); assert.equal(retry.independentReadback,true); save('zero-write-retry.json',retry); pass('exact_retry_zero_inserts_with_stable_post_commit_readback');
    assert.deepEqual(await oracle(plan.rows),protectedBefore); pass('all_public_tables_preserved_except_planned_rows');
    assert.equal((await c.query('select count(*)::int n from vault_item_instances')).rows[0].n,5);
    assert.equal((await c.query("select count(*)::int n from jungle_edition_identity_links_v1 where state='staged'")).rows[0].n,128);
    assert.equal((await c.query('select bool_and(jungle_edition_link_valid_v1(id,true)) valid from jungle_edition_identity_links_v1')).rows[0].valid,true);
    for(const table of ['tcgplayer_jungle_edition_bindings_v1','tcgplayer_jungle_edition_assignments_v1','market_price_current_publication'])assert.equal((await c.query('select count(*)::int n from '+table)).rows[0].n,0);
    pass('128_valid_staged_links_no_binding_assignment_or_publication');
  } finally {if(concurrent)await concurrent;await second.end();}
  const result={at:new Date().toISOString(),status:'passed',out,checks,checkCount:checks.length,allPublicTables:tables.length,plannedRows:639,retainedCopies:5,actualCommit:true,productionWrites:0,productionWriteQualified:false,productionRollbackProven:false,resetOrReseed:false,producer:jungleProducerV6()};
  save('result.json',result);fs.writeFileSync(base+'/executor-qualification-v45/transaction-latest.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',checks:checks.length,actualCommit:true,productionWrites:0,out}));
} catch(error) {
  await c.query('rollback').catch(()=>{}); save('failure.json',{at:new Date().toISOString(),message:error.message,stack:error.stack,code:error.code,committed,checks,productionWrites:0});
  if(!committed)assert.deepEqual(await oracle(),before); throw error;
} finally {await c.end();}
