// Advance only the nine retained local RAW fixtures through the existing
// classification and extraction workers. Never grants founder approval.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {GENERIC_PLAY_NINE_QUALIFICATION_DATABASE,readGenericPlayNineIntakeFrameV1,
  buildGenericPlayNineIntakePlanV1,classifyGenericPlayNineIntakeStateV1}
  from '../../backend/warehouse/generic_play_nine_intake_v1.mjs';
import {runClassificationWorkerV1} from '../../backend/warehouse/classification_worker_v1.mjs';
import {runMetadataExtractionWorkerV1} from '../../backend/warehouse/metadata_extraction_worker_v1.mjs';
import {runPromotionStageWorkerV1} from '../../backend/warehouse/promotion_stage_worker_v1.mjs';
const out=path.resolve(process.argv[2]??'');assert.ok(process.argv[2]);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const database=process.argv[3]??GENERIC_PLAY_NINE_QUALIFICATION_DATABASE;
assert.ok([GENERIC_PLAY_NINE_QUALIFICATION_DATABASE,'stamped_bulk_proposed_ids_qualification_v1'].includes(database));
const client=new pg.Client({host:'127.0.0.1',port:56230,user:'postgres',password:'postgres',database});
// The extraction worker constructs a client even for source-backed records.
// There is no HTTP dependency in this path: any attempted request fails closed.
process.env.SUPABASE_DB_URL=`postgresql://postgres:postgres@127.0.0.1:56230/${database}`;
process.env.SUPABASE_URL='http://127.0.0.1:1';
process.env.SUPABASE_SECRET_KEY='qualification-unused';
delete process.env.GV_USER_ACCESS_TOKEN;
let httpAttempts=0;globalThis.fetch=async()=>{httpAttempts++;throw Error('HTTP forbidden during local source-backed qualification');};
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const report={startedAt:new Date().toISOString(),pass:false,database,productionWrites:0,realHttpCalls:0,
  founderApprovalsGranted:0,stagingRowsCreated:0,canonicalWrites:0,results:[]};
try {
  await client.connect();assert.equal((await client.query('select current_database() name')).rows[0].name,database);
  const before=await readGenericPlayNineIntakeFrameV1(client),plan=buildGenericPlayNineIntakePlanV1(before);
  assert.equal(classifyGenericPlayNineIntakeStateV1(plan,before),'after','Requires the retained successful RAW qualification, without resetting it');
  const historicalBefore=before.intakes.filter(r=>r.state==='PROMOTED').map(r=>({id:r.id,digest:hash(r)}));
  const canonicalBefore=(await client.query("select md5(string_agg(to_jsonb(t)::text,E'\\n' order by id)) digest from public.card_prints t")).rows[0].digest;
  for(const candidate of before.intakes.filter(r=>r.state==='RAW')) {
    const classification=await runClassificationWorkerV1({candidateId:candidate.id,apply:true,emitLogs:false});
    save(candidate.tcgplayer_id+'-classification.json',classification);
    assert.equal(classification.processed,1);assert.equal(classification.results[0].status,'applied');
    const extraction=await runMetadataExtractionWorkerV1({candidateId:candidate.id,apply:true,emitLogs:false});
    save(candidate.tcgplayer_id+'-extraction.json',extraction);
    assert.equal(extraction.processed,1);assert.ok(['applied','skipped'].includes(extraction.results[0].status));
    const stage=await runPromotionStageWorkerV1({candidateId:candidate.id,dryRun:true,emitLogs:false});
    save(candidate.tcgplayer_id+'-stage-without-approval.json',stage);
    // The real stage worker must refuse an unapproved prepared record.
    assert.equal(stage.processed,1);assert.equal(stage.results[0].status,'blocked');
    report.results.push({product:candidate.tcgplayer_id,candidateId:candidate.id,classification:'applied',
      extraction:extraction.results[0].status,unapprovedStage:'blocked'});
  }
  assert.equal(report.results.length,9);assert.equal(httpAttempts,0);
  const after=await readGenericPlayNineIntakeFrameV1(client);
  for(const historical of historicalBefore)assert.equal(hash(after.intakes.find(r=>r.id===historical.id)),historical.digest);
  assert.equal((await client.query("select md5(string_agg(to_jsonb(t)::text,E'\\n' order by id)) digest from public.card_prints t")).rows[0].digest,canonicalBefore);
  assert.equal((await client.query('select count(*)::int n from public.canon_warehouse_promotion_staging')).rows[0].n,0);
  const prepared=after.intakes.filter(r=>r.reference_hints_payload?.generic_play_nine_intake);
  assert.equal(prepared.length,9);assert.ok(prepared.every(r=>r.state==='REVIEW_READY'&&r.proposed_action_type==='CREATE_CARD_PRINT'&&
    r.founder_approved_at===null&&r.promoted_card_print_id===null));
  report.preparedForReview=9;report.historicalIntakesPreserved=2;report.pass=true;
} catch(error) {
  report.error={message:error.message,code:error.code,stack:error.stack};process.exitCode=1;
} finally {
  await client.end().catch(()=>{});report.realHttpCalls=httpAttempts;report.finishedAt=new Date().toISOString();save('result.json',report);
  console.log(JSON.stringify({pass:report.pass,preparedForReview:report.preparedForReview,completedCandidates:report.results.length,
    productionWrites:0,httpCalls:httpAttempts,error:report.error}));
}
