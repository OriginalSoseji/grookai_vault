import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { writeMarketSnapshotBatchesV1 } from '../../backend/pricing/market_snapshot_batches_v1.mjs';

const url = new URL(process.env.SUPABASE_DB_URL ?? 'about:blank');
assert.equal(url.hostname, '127.0.0.1');assert.equal(url.port,'55000');assert.equal(url.pathname,'/postgres');
const proof=JSON.parse(fs.readFileSync(process.env.GV_SNAPSHOT_PROOF_INPUT));
const input=JSON.parse(fs.readFileSync(process.env.GV_SNAPSHOT_SQL_INPUT));
assert.equal(proof.status,'exact_readonly_projection_parity_passed');
const source=fs.readFileSync(new URL('../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs',import.meta.url),'utf8');
const actualSql=source.slice(source.indexOf('async function insertSnapshotBatch('),source.indexOf('async function decisionCounts(')).split(String.fromCharCode(96))[1];
assert.equal(actualSql,input.newSql);assert.equal(input.newSql.replace('       and decision.id = any($6::uuid[])\n',''),input.oldSql);
const client=new pg.Client({connectionString:url.href,connectionTimeoutMillis:10000,statement_timeout:60000});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,run=id(900001),publication=id(900002),phase1=id(900003),phase2=id(900004);
const count=2513;
await client.connect();try {
  const state=(await client.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
  assert.match(state.address,/^10\.248\.37\.\d+$/);assert.equal(state.workers,'0');assert.equal(state.migrations,428);
  await client.query('begin');
  await client.query('create temp table snapshot_decisions as select * from public.market_price_qualification_decisions with no data');
  await client.query('create temp table snapshot_candidates as select * from public.market_price_pipeline_candidates with no data');
  await client.query('create temp table snapshot_expected (like public.market_price_publication_snapshots including all)');
  await client.query('create temp table snapshot_actual (like public.market_price_publication_snapshots including all)');
  const decisions=[],candidates=[];
  for(let n=1;n<=count+4;n++) {
    const candidateId=id(n+10000),observation=id(n+20000),printing=id(n+30000),other=n>count;
    candidates.push({...proof.template.candidate,id:candidateId,run_id:other?id(900009):run,source_observation_id:observation});
    decisions.push({...proof.template.decision,id:id(n),pipeline_candidate_id:candidateId,run_id:other?id(900009):run,
      source_observation_id:observation,card_printing_id:printing,printing_gv_id:'GV-SNAPSHOT-TEST-'+n,
      source_price_row_identity:'snapshot-test-'+n,source_subtype_name:n%2?'Normal':'Foil'});
  }
  for(const [table,rows]of [['snapshot_candidates',candidates],['snapshot_decisions',decisions]])
    await client.query(`insert into pg_temp.${table} select * from jsonb_populate_recordset(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(rows)]);
  await client.query('create index on snapshot_decisions(run_id,id) where eligible=true and decision=\'publish\' and publication_lane=\'current\'');
  await client.query('create unique index on snapshot_candidates(id)');
  const rewrite=(sql,target)=>sql.replaceAll('public.market_price_publication_snapshots','pg_temp.'+target)
    .replaceAll('public.market_price_qualification_decisions','pg_temp.snapshot_decisions')
    .replaceAll('public.market_price_pipeline_candidates','pg_temp.snapshot_candidates');
  const args=[run,publication,phase1,'MARKET_PRICE_PUBLICATION_SNAPSHOT_V1','SNAPSHOT_BATCH_POSTGRES_TEST'];
  const old=await client.query(rewrite(input.oldSql,'snapshot_expected'),args);assert.equal(old.rowCount,count);
  const adapter={query:(sql,values)=>client.query(rewrite(sql,'snapshot_actual'),values)};
  let calls=0;
  const insert=phase=>async ids=>{
    if(phase===phase1&&++calls===3)throw new Error('simulated interruption between statements');
    assert.ok(ids.length<=500);
    return (await client.query(rewrite(input.newSql,'snapshot_actual'),[...args.slice(0,2),phase,...args.slice(3),ids])).rowCount;
  };
  await assert.rejects(()=>writeMarketSnapshotBatchesV1(adapter,{runId:run,expectedCount:count,insertBatch:insert(phase1)}),/simulated interruption/);
  assert.equal((await client.query('select count(*)::int n from snapshot_actual')).rows[0].n,1000);
  // Random snapshot/provenance IDs differ between independent generations, but
  // a retry must preserve every byte of already-written snapshots.
  const saved=(await client.query('select to_jsonb(s) payload from snapshot_actual s order by qualification_decision_id')).rows;
  const resumed=await writeMarketSnapshotBatchesV1(adapter,{runId:run,expectedCount:count,insertBatch:insert(phase2)});assert.equal(resumed.inserted,count-1000);
  assert.deepEqual((await client.query('select to_jsonb(s) payload from snapshot_actual s order by qualification_decision_id limit 1000')).rows,saved);
  const beforeReplay=(await client.query('select to_jsonb(s) payload from snapshot_actual s order by qualification_decision_id')).rows;
  const replay=await writeMarketSnapshotBatchesV1(adapter,{runId:run,expectedCount:count,insertBatch:insert(phase2)});assert.equal(replay.inserted,0);
  assert.deepEqual((await client.query('select to_jsonb(s) payload from snapshot_actual s order by qualification_decision_id')).rows,beforeReplay);
  const normalized=table=>`select (to_jsonb(s)-'id'-'provenance_id'-'phase_attempt_id') payload from ${table} s`;
  const diff=(await client.query(`select count(*)::int n from ((${normalized('snapshot_expected')} except all ${normalized('snapshot_actual')}) union all (${normalized('snapshot_actual')} except all ${normalized('snapshot_expected')})) d`)).rows[0].n;
  assert.equal(diff,0);
  const lineage=(await client.query('select phase_attempt_id,count(*)::int n from snapshot_actual group by phase_attempt_id order by phase_attempt_id')).rows;
  assert.deepEqual(lineage,[{phase_attempt_id:phase1,n:1000},{phase_attempt_id:phase2,n:1513}]);
  await client.query('rollback');
  assert.equal((await client.query("select to_regclass('pg_temp.snapshot_actual') name")).rows[0].name,null);
  console.log(JSON.stringify({status:'passed',rows:count,otherRunRowsExcluded:4,pages:resumed.pages,exactPayloadDiff:diff,interruptionResume:true,replayInserted:replay.inserted,lineagePreserved:true,existingSnapshotAndProvenanceIdsPreserved:true,rollbackVerified:true,productionWrites:0,scope:'PostgreSQL temporary tables with actual snapshot column types/defaults/checks/unique indexes; production foreign-key/activation proof remains separate'}));
} finally {await client.query('rollback').catch(()=>{});await client.end();}
