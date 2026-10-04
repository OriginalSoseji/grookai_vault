// Exhaustive, read-only comparison of the retained full-source shadow to live policy.
import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {inspectJungleRetainedRuntimeV1} from './inspect_jungle_retained_runtime_v1.mjs';
import {evaluateTcgplayerMarketQualificationV1 as evaluate} from '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';
const out='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/full-source-durable-v1';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length,2);
const source=read(out+'/receipt.json'),shadow=read(out+'/shadow-receipt.json');
assert.equal(shadow.status,'passed');assert.equal(source.status,'passed');
const meta=source.metadata.find(m=>m.name==='live-candidates');
assert.equal(sha(fs.readFileSync(out+'/'+meta.file)),meta.compressedSha256);
const attempt=out+'/parity-'+Date.now();fs.mkdirSync(attempt);
const save=(n,v)=>fs.writeFileSync(attempt+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),run:shadow.run,readOnly:true,scriptSha256:sha(fs.readFileSync(new URL(import.meta.url))),sourceReceiptSha256:sha(fs.readFileSync(out+'/receipt.json'))});
save('runtime.json',inspectJungleRetainedRuntimeV1());
const c=new pg.Client({host:'127.0.0.1',port:65040,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000,statement_timeout:120000});
const counts={selected:0,ordinary:0,heldEdition:0,newlyEligible:0,eligible:0,snapshots:0,exactLedgerDecisions:0,exactOrdinaryCandidates:0,exactOrdinaryPolicy:0,existingGenericPreparation:0};
// pg Date objects in the capture and JSON timestamps in the durable ledger represent
// the same instant. Normalize only this evidence field, never identity or prices.
const normalized=d=>({...d,evidence:{...d.evidence,source_sync_finished_at:d.evidence.source_sync_finished_at?new Date(d.evidence.source_sync_finished_at).toISOString():null}});
const persisted=['policy_version','decision','eligible','publication_lane','language_result','finish_result','source_integrity_result','duplicate_product_result','freshness_result','reason_codes','evidence'];
const pick=(v,keys)=>Object.fromEntries(keys.map(k=>[k,v[k]]));
// SQL DATE carries a calendar date, not a timezone. pg encodes local midnight
// as06:00Z on this Windows host and00:00Z on the UTC production capture host.
const calendarDates=row=>({...row,...Object.fromEntries(['source_observed_on','source_artifact_date'].filter(k=>k in row).map(k=>[k,row[k]==null?null:String(row[k]).slice(0,10)]))});
const changes=[];const seen=new Set();let batch=[];
await c.connect();
try{
 await c.query('begin isolation level repeatable read read only');
 const state=(await c.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.equal(state.address,'10.248.6.3');assert.equal(state.readonly,'on');assert.equal(state.migrations,419);
 assert.equal((await c.query('select state from market_price_pipeline_runs where id=$1',[shadow.run])).rows[0].state,'shadow_verified');
 const publicationSets=(await c.query('select id from market_price_publication_sets where run_id=$1',[shadow.run])).rows;assert.equal(publicationSets.length,1);
 const baselineSchema=read('C:/grookai_vault_operator_artifacts/gamestop_duraludon_20261001/full-413-v1/replayed.private.json');
 const prepareName='prepare_tcgplayer_market_variant_assignments_v1';
 const prepareBody=(await c.query('select prosrc from pg_proc where oid=$1::regprocedure',[prepareName+'(uuid)'])).rows[0].prosrc;
 assert.equal(prepareBody,baselineSchema.FUNCTIONS_QUERY.find(r=>r.schema==='public'&&r.name===prepareName).definition,'Generic preparation unchanged from qualified production413');
 const genericIds=['3c8c0508-f5fc-4b7f-b1c9-8557ac6942b2','cf085e16-6560-4d39-9251-41cf4996c2ed'];
 const genericRows=(await c.query('select * from market_evidence_variant_assignments where source_row_id=any($1::uuid[])',[genericIds])).rows;assert.equal(genericRows.length,2);
 const generic=new Map(genericRows.map(r=>[r.source_row_id,r]));
 const preparation=(await c.query("select resumability_data from market_price_pipeline_phase_attempts where run_id=$1 and phase_name='prepare_variant_assignments' and state='succeeded'",[shadow.run])).rows;assert.equal(preparation.length,1);assert.equal(preparation[0].resumability_data.inserted_generic_assignment_count,2);
 save('existing-generic-preparation.json',{sourceFunctionSha256:sha(prepareBody),preparation:preparation[0],rows:genericRows});
 const flush=async()=>{
  if(!batch.length)return;
  const rows=(await c.query(`select candidate.source_observation_id,candidate.candidate_payload payload,to_jsonb(decision.*) decision,to_jsonb(snapshot.*) snapshot
    from market_price_pipeline_candidates candidate
    join market_price_qualification_decisions decision on decision.source_observation_id=candidate.source_observation_id and decision.pipeline_candidate_id=candidate.id and decision.run_id=candidate.run_id
    left join market_price_publication_snapshots snapshot on snapshot.publication_set_id=$3 and snapshot.source_observation_id=decision.source_observation_id and snapshot.qualification_decision_id=decision.id and snapshot.run_id=decision.run_id
    where candidate.run_id=$1 and candidate.source_observation_id=any($2::uuid[])`,[shadow.run,batch.map(b=>b.row.source_observation_id),publicationSets[0].id])).rows;
  assert.equal(rows.length,batch.length);const byId=new Map(rows.map(r=>[r.source_observation_id,r]));assert.equal(byId.size,batch.length);
  for(const baseline of batch){
   const id=baseline.row.source_observation_id;assert.ok(!seen.has(id),'Duplicate source observation');seen.add(id);
   const {payload,decision,snapshot}=byId.get(id);
   const expected=evaluate(payload,{now:new Date(decision.evaluated_at)});
   assert.deepEqual(pick(decision,persisted),pick(expected,persisted),'Exact persisted policy '+id);counts.exactLedgerDecisions++;
   if(payload.edition_assignment_required===true){
    assert.equal(baseline.decision.eligible,false);
    if(expected.eligible){assert.equal(Number(payload.group_id),635);assert.ok(payload.edition_assignment_id);assert.equal(payload.mapping_method,'jungle_edition_binding_v1');counts.newlyEligible++;changes.push({observation:id,product:payload.source_product_id,subtype:payload.source_subtype_name,parent:payload.card_print_id,printing:payload.card_printing_id,marketPrice:payload.market_price});}
    else {assert.equal(payload.card_print_id,null);assert.equal(payload.card_printing_id,null);assert.ok(expected.reason_codes.includes('edition_bound_pricing_authority_required'));counts.heldEdition++;}
   }else{
    const expectedRow={...baseline.row},expectedPolicy=structuredClone(baseline.decision),prepared=generic.get(id);
    if(prepared){
     assert.equal(baseline.decision.eligible,false);assert.equal(expected.eligible,false);assert.equal(expected.decision,'exclude');assert.equal(snapshot,null);
     for(const key of ['variant_assignment_id','variant_assignment_status','variant_assignment_confidence','variant_assignment_version']){assert.equal(baseline.row[key],null);expectedRow[key]=key==='variant_assignment_id'?prepared.id:prepared[key];}
     assert.equal(prepared.card_print_id,payload.card_print_id);assert.equal(prepared.card_printing_id,payload.card_printing_id);
     expectedPolicy.evidence.variant_assignment_id=prepared.id;counts.existingGenericPreparation++;
    }
    assert.deepEqual(calendarDates(pick(payload,Object.keys(baseline.row))),calendarDates(expectedRow),'Exact ordinary candidate '+id);if(!prepared)counts.exactOrdinaryCandidates++;
    // Capture evaluated pg timestamp Date objects before JSON serialization.
    const captureTyped={...payload,source_sync_finished_at:new Date(payload.source_sync_finished_at)};
    assert.deepEqual(normalized(evaluate(captureTyped,{now:new Date(source.asOf)})),normalized(expectedPolicy),'Ordinary live policy parity '+id);if(!prepared)counts.exactOrdinaryPolicy++;
    assert.equal(expected.eligible,baseline.decision.eligible,'No freshness transition during shadow');counts.ordinary++;
   }
   if(expected.eligible){
    assert.ok(snapshot);for(const key of ['source_observation_id','source_sync_run_id','source_artifact_id','source_artifact_hash','source_price_row_identity','source_row_hash','card_print_id','card_printing_id','gv_id','printing_gv_id','finish_key','currency','edition_assignment_id'])assert.equal(snapshot[key]??null,payload[key]??null,'Snapshot '+key+' '+id);
    for(const key of ['market_price','low_price','mid_price','high_price','direct_low_price'])assert.equal(snapshot[key]==null?null:Number(snapshot[key]),payload[key]==null?null:Number(payload[key]),'Exact source price '+key+' '+id);
    for(const key of ['source_observed_on','source_artifact_date'])assert.equal(calendarDates(snapshot)[key],calendarDates(payload)[key],'Exact SQL date '+key+' '+id);
    counts.eligible++;counts.snapshots++;
   }else assert.equal(snapshot,null);
   counts.selected++;
  }
  batch=[];if(counts.selected%10000===0)console.log(JSON.stringify(counts));
 };
 const hash=createHash('sha256'),input=fs.createReadStream(out+'/'+meta.file).pipe(zlib.createGunzip());input.on('data',b=>hash.update(b));
 for await(const line of readline.createInterface({input,crlfDelay:Infinity})){batch.push(JSON.parse(line));if(batch.length===500)await flush();}await flush();
 assert.equal(hash.digest('hex'),meta.sha256);assert.equal(counts.selected,208305);assert.equal(counts.ordinary,206430);assert.equal(counts.newlyEligible,128);assert.equal(counts.heldEdition,1747);assert.equal(counts.eligible,164815);assert.equal(counts.existingGenericPreparation,2);assert.equal(counts.exactOrdinaryCandidates,206428);assert.equal(counts.exactOrdinaryPolicy,206428);
 const exactNumeric=(await c.query(`select count(*)::int checked,count(*) filter(where s.market_price is distinct from o.market_price or s.low_price is distinct from o.low_price or s.mid_price is distinct from o.mid_price or s.high_price is distinct from o.high_price or s.direct_low_price is distinct from o.direct_low_price or s.source_observed_on is distinct from o.observed_on)::int mismatches from market_price_publication_snapshots s join tcgcsv_source_price_daily_observations o on o.id=s.source_observation_id where s.run_id=$1`,[shadow.run])).rows[0];assert.equal(exactNumeric.checked,164815);assert.equal(exactNumeric.mismatches,0);save('exact-postgres-price-date.json',exactNumeric);
 assert.equal((await c.query('select count(*)::int n from market_price_current_publication')).rows[0].n,0);
 assert.equal((await c.query('select count(*)::int n from vault_item_instances')).rows[0].n,5);
 await c.query('rollback');
 const result={at:new Date().toISOString(),status:'passed',run:shadow.run,counts,changes,productionWrites:0,publicationActivation:false,readOnly:true};save('receipt.json',result);fs.writeFileSync(out+'/parity-receipt.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',counts}));
}catch(e){save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack,counts});throw e;}finally{await c.query('rollback').catch(()=>{});await c.end();}
