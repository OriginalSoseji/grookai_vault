import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { startFixtureRuntime } from './collector-fixture-runtime.mjs';
import { buildCandidate } from '../../../scripts/preview/build_collector_set_binder_candidate.mjs';
import { evaluateTcgplayerMarketQualificationV1, TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3 as policyVersion }
  from '../../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';

const root = new URL('../../../', import.meta.url);
const browserMode = process.argv.includes('--browser');
assert.ok(process.argv.slice(2).every(arg=>arg==='--browser'),'Unknown replay option');
const container = 'supabase_db_ycdxbpibncqcchqiihfz';
const database = `collector_pricing_replay_${Date.now()}`;
const label = 'SYNTHETIC_LOCAL_REPLAY_NOT_MARKET_DATA';
const parent = '98d26f6e-83e8-4990-8e42-ea2e3aadb111';
const printing = '92f0c41e-1f2a-41ed-957d-ea973012bb5c';
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const exec = (file, args, input) => execFileSync(file, args, {
  cwd: root, input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe','pipe','pipe'], windowsHide: true,
});
assert.match(database, /^collector_pricing_replay_\d+$/);
assert.equal(exec('git',['branch','--show-current']).trim(), 'preview/collector-authenticated-20260910');
assert.match(exec('docker',['port',container,'5432']), /:54330\b/);
const status = JSON.parse(exec('pwsh',['-NoProfile','-Command','supabase status -o json']));
assert.equal(status.API_URL, 'http://127.0.0.1:54321');
const psqlArgs = db => ['exec','-i',container,'sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" exec psql "$@"',
  '--','-X','-qAt','-v','ON_ERROR_STOP=1','-U','supabase_admin','-d',db];
const sql = (db, statement) => exec('docker',psqlArgs(db),statement).trim();
const sampleQuery = `select jsonb_build_object('cards',(select count(*) from public.card_prints),
  'printings',(select count(*) from public.card_printings), 'sets',(select count(*) from public.sets),
  'observations',(select count(*) from public.tcgcsv_source_price_daily_observations),
  'identity_rows',(select count(*) from public.card_print_identity),
  'source_runs',(select count(*) from public.tcgcsv_source_sync_runs),
  'artifacts',(select count(*) from public.tcgcsv_source_artifacts),
  'products',(select count(*) from public.tcgcsv_source_products),
  'assignments',(select count(*) from public.market_evidence_variant_assignments),
  'candidates',(select count(*) from public.market_price_pipeline_candidates),
  'decisions',(select count(*) from public.market_price_qualification_decisions),
  'publication_sets',(select count(*) from public.market_price_publication_sets),
  'publication_events',(select count(*) from public.market_price_publication_events),
  'vault_owners',(select count(*) from public.vault_owners),
  'mappings',(select count(*) from public.external_mappings),
  'runs',(select count(*) from public.market_price_pipeline_runs),
  'snapshots',(select count(*) from public.market_price_publication_snapshots),
  'pointers',(select count(*) from public.market_price_current_publication),
  'users',(select count(*) from auth.users),'copies',(select count(*) from public.vault_item_instances));`;
const before = JSON.parse(sql('postgres',`begin read only; ${sampleQuery} rollback;`));
assert.equal(before.cards,326); assert.equal(before.printings,491);
for (const field of ['observations','mappings','runs','snapshots','pointers']) assert.equal(before[field],0);
assert.equal(sql('postgres',`select count(*) from pg_database where datname=${literal(database)};`),'0');
const out = `C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/${database}`;
mkdirSync(out,{recursive:true});
const report = { label, database, branch: 'preview/collector-authenticated-20260910',
  baseCommit: exec('git',['rev-parse','HEAD']).trim(), sourceBefore: before,
  productionAccess:false, workersStarted:0, previewSampleWrites:0, browserVerified:false, steps:[] };
writeFileSync(`${out}/run_plan.json`,JSON.stringify({ ...report, fixturePrice:12.34, expectedTotal:24.68,
  parent, printing, transaction:browserMode?'commit only in new isolated fixture DB; retain for audit':'rollback-only', sourceProducts:1, observations:1, publicationSnapshots:1,
  ownerCopies:4, users:2, syntheticIdentityFixtures:1, policyVersion, runnerSha256:hash(readFileSync(new URL(import.meta.url),'utf8')) },null,2));

// Keep one psql connection for the entire transaction. A process exit rolls back fixtures.
function session() {
  const child = spawn('docker',psqlArgs(database),{stdio:['pipe','pipe','pipe'],windowsHide:true});
  let pending; let buffer=''; let stderr=''; let closed=false;
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stderr.on('data', data => { stderr += data; });
  child.stdout.on('data', data => {
    buffer += data;
    if (pending && buffer.includes(pending.marker+'\n')) {
      const index=buffer.indexOf(pending.marker+'\n'); const answer=buffer.slice(0,index).trim();
      buffer=buffer.slice(index+pending.marker.length+1); const current=pending; pending=null;
      clearTimeout(current.timer); current.resolve(answer);
    }
  });
  const completion = new Promise((resolve,reject) => {
    child.on('error',reject);
    child.on('close',code => {
      closed=true;
      if (pending) { clearTimeout(pending.timer); pending.reject(new Error(stderr || `psql exited ${code}`)); pending=null; }
      resolve(code);
    });
  });
  return {
    query(statement) {
      assert.ok(!pending && !closed,'Only one query at a time on an open replay session');
      return new Promise((resolve,reject) => {
        const marker=`END_${randomUUID()}`;
        const timer=setTimeout(() => { child.stdin.end(); reject(new Error('Replay SQL timed out')); },60000);
        pending={marker,resolve,reject,timer};
        child.stdin.write(`${statement}\nselect ${literal(marker)};\n`);
      });
    },
    async close() { child.stdin.end(); await completion; },
  };
}
let connection;
let runtime;
const sourceHashes = {};
function load(relative, expose='') {
  const original=readFileSync(new URL(relative,import.meta.url),'utf8'); sourceHashes[relative]=hash(original);
  const exports={};
  vm.runInNewContext(ts.transpileModule(original+expose,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
    {exports,console,require:()=>new Proxy({},{get(){throw new Error('Unexpected dependency access');}})});
  return exports;
}
try {
  sql('postgres',`create database ${database} owner postgres;`);
  const schema=exec('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only',
    '--no-publications','--no-subscriptions','--exclude-extension=pg_cron','--exclude-extension=pg_net',
    '--exclude-schema=cron','--exclude-schema=net','--exclude-extension=pg_graphql','--exclude-schema=graphql','--exclude-schema=graphql_public']);
  sql(database,schema); report.schemaSha256=hash(schema);
  const tables=['games','sets','finish_keys','card_prints','card_printings'];
  const references=exec('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--data-only','--no-owner','--no-privileges',
    ...tables.flatMap(t=>['-t',`public.${t}`])]);
  sql(database,references); report.referenceSha256=hash(references);
  if(browserMode) {
    const binderCandidate=buildCandidate();
    sql(database,`set role postgres;\n${binderCandidate.sql}\nreset role;`);
    report.setBinderCandidateSha256=binderCandidate.sha256;
    writeFileSync(`${out}/set-binder-candidate.sql`,binderCandidate.sql);
    const cameoCandidate=readFileSync(new URL('../../../scripts/preview/sql/collector_cameo_read_candidate_v1.sql',import.meta.url),'utf8');
    const cameoTests=readFileSync(new URL('../../../scripts/preview/sql/collector_cameo_read_tests_v1.sql',import.meta.url),'utf8');
    sql(database,`set role postgres;\n${cameoCandidate}\nreset role;`);
    writeFileSync(`${out}/cameo-tests.txt`,sql(database,cameoTests));
    report.cameoProjection={candidateSha256:hash(cameoCandidate),testSha256:hash(cameoTests),passed:true,
      remainingConfirmations:Number(sql(database,'select count(*) from public.card_cameo_confirmations_v1;'))};
    assert.equal(report.cameoProjection.remainingConfirmations,0);
    sql(database,exec('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--data-only','--no-owner','--no-privileges','-t','public.binder_feature_flags']));
    const authLedger=exec('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--data-only','--no-owner','--no-privileges','-t','auth.schema_migrations']);
    sql(database,authLedger);
    runtime=await startFixtureRuntime({database,out,local:status});
  }
  connection=session(); const q=statement=>connection.query(statement);
  const json=async statement=>JSON.parse(await q(statement));
  await q('begin; set local statement_timeout=30000;');
  // Schema-only restore leaves this optional ask projection unpopulated.
  await q('refresh materialized view public.mv_market_listing_active_ask_current_v1;');
  const allowed = new Set(['tcgcsv_source_sync_runs','tcgcsv_source_artifacts','tcgcsv_source_products',
    'tcgcsv_source_price_daily_observations','external_mappings','market_price_pipeline_runs',
    'market_price_pipeline_candidates','market_price_qualification_decisions','market_price_publication_sets',
    'market_price_publication_snapshots','vault_owners','vault_item_instances','card_print_identity','vault_items','slab_certs']);
  const inserted = {};
  async function insert(table,row) {
    assert.ok(allowed.has(table));
    const columns=await json(`select json_agg(column_name) from information_schema.columns where table_schema='public' and table_name=${literal(table)};`);
    const keys=Object.keys(row).filter(key=>columns.includes(key));
    assert.ok(keys.every(k=>/^[a-z_][a-z_0-9]*$/.test(k)));
    const fields=keys.map(k=>`"${k}"`).join(',');
    const result=await json(`with added as (insert into public.${table} (${fields}) select ${fields}
      from json_populate_record(null::public.${table},${literal(JSON.stringify(row))}) returning *) select row_to_json(added) from added;`);
    inserted[table]=(inserted[table]??0)+1; return result;
  }
  const now=await json('select to_json(now());'); const day=now.slice(0,10);
  const stamp=new Date(new Date(now).getTime()-60000).toISOString();
  const card=await json(`select row_to_json(c) from public.card_prints c where id=${literal(parent)};`);
  assert.equal(card.identity_domain,'pokemon_eng_standard');
  if(browserMode) {
    await q(`update public.binder_feature_flags set enabled=flag_key in ('schema_internal','personal','custom','set_binders');
      with release as (insert into public.binder_set_slot_releases_v1(set_id,source_reference,source_sha256,expected_slot_count,slots)
      values('${card.set_id}','SYNTHETIC BROWSER FIXTURE ONLY - NOT A REAL SET CHECKLIST','${hash(label)}',1,
        '[{"position":0,"card_print_id":"${parent}","card_printing_id":"${printing}"}]'::jsonb) returning id)
      insert into public.binder_set_slot_pointers_v1(set_id,release_id) select '${card.set_id}',id from release;`);
  }
  const sourceId=randomUUID(); const artifactId=randomUUID(); const observationId=randomUUID();
  const sourcePayload={synthetic:true,label,subTypeName:'Holofoil',marketPrice:12.34};
  writeFileSync(`${out}/source-prices.fixture.json`,JSON.stringify(sourcePayload));
  const sourceHash=hash(sourcePayload); const runKey=`${label}_${database}`;
  await insert('tcgcsv_source_sync_runs',{id:sourceId,run_key:runKey,sync_mode:'current_full_sync',status:'completed',
    source_marker:label,observed_on:day,request_count:0,category_count:1,group_count:1,product_count:1,price_row_count:1,
    inserted_count:1,failed_count:0,artifact_hash:sourceHash,worker_version:label,parser_version:label,
    schema_contract_version:label,git_commit_sha:report.baseCommit,started_at:stamp,finished_at:stamp});
  await insert('tcgcsv_source_artifacts',{id:artifactId,sync_run_id:sourceId,run_key:runKey,artifact_kind:'prices',
    local_path:`${out}/source-prices.fixture.json`,sha256:sourceHash,byte_size:Buffer.byteLength(JSON.stringify(sourcePayload)),
    fetched_at:stamp,http_status:200,observed_on:day});
  await insert('tcgcsv_source_products',{product_id:990001,category_id:3,group_id:1,name:card.name,clean_name:card.name,
    extended_data:[{name:'Number',value:card.number}],raw_payload:{synthetic:true,label,name:card.name,productId:990001},
    payload_hash:hash({synthetic:true,label,name:card.name,productId:990001}),last_seen_run_id:sourceId,source_active:true,catalog_metadata_status:'current'});
  await insert('external_mappings',{card_print_id:parent,source:'tcgplayer',external_id:'990001',active:true,
    meta:{derived_from:'synthetic_deterministic_mapping',confidence:1,synthetic:true}});
  await insert('tcgcsv_source_price_daily_observations',{id:observationId,source_price_row_identity:`3:990001:holofoil:${day}`,
    product_id:990001,category_id:3,group_id:1,subtype_name:'Holofoil',subtype_name_normalized:'holofoil',observed_on:day,
    low_price:9.5,mid_price:11,high_price:15,market_price:12.34,direct_low_price:10.25,currency:'USD',raw_payload:sourcePayload,
    payload_hash:sourceHash,source_artifact_id:artifactId,first_seen_run_id:sourceId,last_seen_run_id:sourceId,
    first_observed_at:stamp,last_observed_at:stamp});
  assert.equal(Number(await q(`select public.prepare_tcgplayer_market_variant_assignments_v1(${literal(sourceId)});`)),1);
  assert.equal(Number(await q(`select public.prepare_tcgplayer_market_variant_assignments_v1(${literal(sourceId)});`)),0);
  const candidateQuery=`select coalesce(json_agg(c),'[]') from public.v_tcgplayer_market_qualification_candidates_v1 c where source_sync_run_id=${literal(sourceId)};`;
  const missingIdentity=await json(candidateQuery);
  assert.equal(missingIdentity.length,1);
  report.missingIdentityEvaluation=evaluateTcgplayerMarketQualificationV1(missingIdentity[0],{now:new Date(now)});
  assert.equal(report.missingIdentityEvaluation.eligible,false);
  assert.ok(report.missingIdentityEvaluation.reason_codes.includes('not_english_standard_identity'));
  await insert('card_print_identity',{card_print_id:parent,identity_domain:card.identity_domain,
    set_code_identity:card.set_code,printed_number:card.number,normalized_printed_name:card.name.toLowerCase(),
    source_name_raw:label,identity_payload:{synthetic:true,label,variant_key_current:'standard'},
    identity_key_version:'pokemon_eng_standard:v1',identity_key_hash:hash({label,parent}),is_active:true});
  const candidates=await json(candidateQuery);
  assert.equal(candidates.length,1); const candidate=candidates[0];
  const evaluation=evaluateTcgplayerMarketQualificationV1(candidate,{now:new Date(now)});
  report.candidate=candidate; report.evaluation=evaluation;
  assert.equal(evaluation.eligible,true,JSON.stringify(evaluation.reason_codes));
  assert.equal(candidate.card_printing_id,printing);
  report.policyNegatives={wrongCurrency:evaluateTcgplayerMarketQualificationV1({...candidate,currency:'EUR'},{now:new Date(now)}),
    stale:evaluateTcgplayerMarketQualificationV1(candidate,{now:new Date(new Date(now).getTime()+96*3600000)})};
  assert.equal(report.policyNegatives.wrongCurrency.eligible,false); assert.equal(report.policyNegatives.stale.eligible,false);
  const run=await insert('market_price_pipeline_runs',{run_key:runKey,pipeline_version:label,policy_version:policyVersion,
    run_mode:'canary',source_sync_run_id:sourceId,source_artifact_id:artifactId,source_artifact_hash:sourceHash,
    source_observed_on:day,source_marker:label,state:'reconciled',reconciliation_state:'reconciled',selected_count:1,mapped_count:1,
    eligible_count:1,snapshot_count:1,required_phase_count:1,succeeded_phase_count:1,
    git_commit_sha:report.baseCommit,worker_version:label,schema_version:label,
    reconciliation:{synthetic:true,note:'fixture setup, not worker execution'}});
  const staged=await insert('market_price_pipeline_candidates',{...candidate,run_id:run.id,candidate_hash:hash(candidate),candidate_payload:candidate});
  const decision=await insert('market_price_qualification_decisions',{...candidate,...evaluation,run_id:run.id,
    decision_key:hash({candidate,evaluation}),pipeline_candidate_id:staged.id,run_key:runKey,
    policy_version:policyVersion,code_version:label,source_price_row_identity:candidate.source_price_row_identity,
    observed_at:stamp,evaluated_at:now,evidence:{...evaluation.evidence,synthetic:true,label}});
  const publication=await insert('market_price_publication_sets',{run_id:run.id,run_key:runKey,expected_snapshot_count:1});
  const snapshot=await insert('market_price_publication_snapshots',{...candidate,run_id:run.id,publication_set_id:publication.id,
    qualification_decision_id:decision.id,policy_version:policyVersion,source_name:'tcgplayer',source_label:'TCGPlayer Market',
    source_artifact_hash:sourceHash,source_row_hash:candidate.source_row_hash,observed_at:stamp,qualified_at:now,
    published_at:now,freshness_state:'fresh',code_version:label});
  await q(`do $$ begin
    begin perform public.activate_market_price_publication_set_v1('${run.id}','${publication.id}',2);
      raise exception 'wrong_count_accepted';
    exception when others then if sqlerrm not like 'market price expected snapshot counts do not agree:%' then raise; end if; end;
  end $$;`);
  await q(`select count(*) from public.activate_market_price_publication_set_v1('${run.id}','${publication.id}',1);`);
  const user=runtime?.users[0].id??randomUUID(); const outsider=runtime?.users[1].id??randomUUID();
  if(!runtime) await q(`insert into auth.users(id,email) values('${user}','pricing-owner@example.invalid'),('${outsider}','pricing-outsider@example.invalid');`);
  await insert('vault_owners',{user_id:user,owner_code:'ABCD1234',next_instance_index:5});
  const anchor=browserMode?await insert('vault_items',{user_id:user,card_id:parent,gv_id:card.gv_id,name:card.name,set_name:'151',qty:4,condition_label:'Near Mint',notes:label}):null;
  const slab=browserMode?await insert('slab_certs',{grader:'PSA',cert_number:'SYNTHETIC-LOCAL-ONLY',card_print_id:parent,grade:9,label_metadata:{synthetic:true,label}}):null;
  for(let i=1;i<=4;i++) await insert('vault_item_instances',{user_id:user,gv_vi_id:`GVVI-ABCD1234-00000${i}`,
    card_print_id:i===4&&slab?null:parent,card_printing_id:i===3||(i===4&&slab)?null:printing,is_graded:i===4,condition_label:'Near Mint',
    legacy_vault_item_id:anchor?.id??null,slab_cert_id:i===4?slab?.id??null:null});
  await q(`set local role authenticated; select set_config('request.jwt.claim.sub','${user}',true); select set_config('request.jwt.claim.role','authenticated',true);`);
  const rawRows=await json(`select json_agg(r) from public.get_market_pricing_read_model_v1(array['${parent}']::uuid[],array['${printing}']::uuid[]) r;`);
  const unknownPrinting=randomUUID();
  report.unknownPrintingResponse=await json(`select json_agg(r) from public.get_market_pricing_read_model_v1(null,array['${unknownPrinting}']::uuid[]) r;`);
  assert.equal(report.unknownPrintingResponse.length,1);
  assert.equal(report.unknownPrintingResponse[0].status,'unavailable');
  assert.equal(report.unknownPrintingResponse[0].market_close,null);
  assert.equal(report.unknownPrintingResponse[0].card_printing_id,unknownPrinting);
  const copies=await json(`select json_agg(v) from public.vault_item_instances v where user_id='${user}' and archived_at is null;`);
  assert.equal(copies.length,4);
  await q(`select set_config('request.jwt.claim.sub','${outsider}',true);`);
  assert.equal(Number(await q(`select count(*) from public.vault_item_instances where user_id='${user}';`)),0);
  await q(`reset role; set local role anon;`);
  await q(`do $$ begin begin perform public.get_market_pricing_read_model_v1(array['${parent}']::uuid[],null);
    raise exception 'anonymous_pricing_allowed'; exception when insufficient_privilege then null; end; end $$;`);
  await q('reset role;');
  report.trace=await json(`select public.get_market_price_trace_v1('${snapshot.provenance_id}');`);
  for (const [key,expected] of Object.entries({card_print_id:parent,card_printing_id:printing,
    source_observation_id:observationId,source_sync_run_id:sourceId,source_artifact_id:artifactId,
    qualification_decision_id:decision.id,publication_set_id:publication.id,run_id:run.id,
    source_mapping_id:candidate.source_mapping_id,variant_assignment_id:candidate.variant_assignment_id})) {
    assert.equal(String(report.trace[key]),String(expected),`Trace mismatch: ${key}`);
  }
  const pricing=load('../src/lib/pricing/marketPricingReadModelV1.ts');
  const vault=load('../src/lib/vault/getCanonicalVaultCollectorRows.ts','\nexport { buildVaultExactPricingSummary };');
  const owner=load('../src/lib/vault/getOwnerVaultItems.ts');
  const records=await pricing.getMarketPricingReadModelV1({rpc:async()=>({data:rawRows,error:null})},
    {cardPrintIds:[parent],cardPrintingIds:[printing],throwOnError:true});
  assert.equal(records.length,2);
  const exact=pricing.indexExactMarketPricingByCardPrintingId(records);
  assert.equal(exact.get(printing).market_close,12.34); assert.equal(exact.get(printing).provenance_id,snapshot.provenance_id);
  const summary=vault.buildVaultExactPricingSummary({aggregate:{cardPrintId:parent,rawCount:3,copyItems:copies},marketPriceByPrintingId:exact});
  assert.equal(summary.effectivePrice,24.68); assert.equal(summary.pricedRawCopyCount,2); assert.equal(summary.unpricedRawCopyCount,1);
  for(const copy of summary.copyItems) assert.equal(copy.market_price,copy.is_graded || !copy.card_printing_id ? null : 12.34);
  const totals=owner.buildVaultValueSummary([{raw_count:3,effective_price:summary.effectivePrice,priced_raw_copy_count:summary.pricedRawCopyCount,
    unpriced_raw_copy_count:summary.unpricedRawCopyCount,pricing_updated_at:now}]);
  assert.equal(totals.totalEstimatedValue,24.68);
  report.rawReadModel=rawRows; report.acceptedRecords=records; report.vaultSummary=summary; report.collectionTotals=totals;
  report.insertedFixtureRows=inserted; report.webSourceHashes=sourceHashes;
  report.steps.push('real assignment prepared idempotently','actual candidate qualified by existing policy',
    'wrong activation count rejected; exact fixture activated inside transaction','authenticated read model and cross-account/anon guards passed',
    'actual SQL rows fed to unchanged web reader and Vault total functions');
  await q(browserMode?'commit;':'rollback;'); await connection.close(); connection=null;
  if(runtime) {
    await runtime.startWeb();
    report.browser=await runtime.verifyBrowser();
    report.browserVerified=true;
    report.steps.push('actual browser login, exact card price, quantity-weighted Vault total and outsider isolation passed');
  }
  report.replayAfter=JSON.parse(sql(database,sampleQuery));
  if(!browserMode) for(const field of Object.keys(report.replayAfter).filter(key=>!['cards','printings','sets'].includes(key))) assert.equal(report.replayAfter[field],0);
  else {assert.equal(report.replayAfter.snapshots,1);assert.equal(report.replayAfter.copies,4);assert.equal(report.replayAfter.users,2);}
  assert.equal(report.replayAfter.cards,326); assert.equal(report.replayAfter.printings,491);
  report.steps.push(browserMode?'fixture DB retained separately; API and web stopped after verification':'transaction rolled back; zero fixture source/pricing/users/ownership rows remain'); report.passed=true;
} catch(error) {
  report.passed=false; report.error=String(error.stderr??error.stack??error); process.exitCode=1;
} finally {
  if(connection) await connection.close();
  if(runtime) await runtime.close();
  report.sourceAfter=JSON.parse(sql('postgres',`begin read only; ${sampleQuery} rollback;`));
  if(JSON.stringify(report.sourceAfter)!==JSON.stringify(before)) {report.passed=false; report.reconciliationError='source sample changed';process.exitCode=1;}
  writeFileSync(`${out}/result.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({artifact:`${out}/result.json`,passed:report.passed,error:report.error,steps:report.steps}));
}
