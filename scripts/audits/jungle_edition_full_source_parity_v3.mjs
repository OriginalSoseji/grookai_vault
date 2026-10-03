// Read-only current-source projection using128 actual SQL assignments from a rolled-back422 fixture.
// No production schema, ledger, pointer or catalog writes. Not a full durable shadow.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash, X509Certificate} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createGzip} from 'node:zlib';
import {once} from 'node:events';
import {finished} from 'node:stream/promises';
import {hydrateTcgplayerEditionCandidateV1} from '../../backend/pricing/tcgplayer_edition_identity_v1.mjs';
import {evaluateTcgplayerMarketQualificationV1 as candidatePolicy} from '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';
import {TRAINER_KIT_CANDIDATE_COLUMNS_V1 as columns, TRAINER_KIT_CANDIDATE_JOINS_V1 as joins} from '../../backend/pricing/tcgplayer_trainer_kit_candidate_evidence_v1.mjs';
import {buildTcgplayerCandidateProductPagesV1} from '../../backend/pricing/tcgplayer_market_candidate_paging_v1.mjs';
import {createCandidateStreamReconcilerV1} from '../../backend/pricing/tcgplayer_market_streaming_v1.mjs';

assert.equal(process.argv.length,2);
assert.equal(process.platform,'linux');
process.umask(0o077);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base='/var/lib/grookai/ops/jungle-edition-pricing-20261001';
assert.equal(root,base+'/full-source-parity-package-v29b');
const runtime=fs.realpathSync('/opt/grookai_pricing_current');
assert.equal(runtime,'/opt/grookai/releases/backend/755937002e');
const require=createRequire(runtime+'/package.json');
const {Client}=require('pg');
const env=require('dotenv').parse(fs.readFileSync('/etc/grookai/tcgplayer-market-pricing.env'));
const ref='ycdxbpibncqcchqiihfz';
if(env.SUPABASE_URL)assert.equal(new URL(env.SUPABASE_URL).hostname,ref+'.supabase.co');
const url=new URL(env.SUPABASE_DB_URL);
assert.equal(url.hostname,'aws-1-us-east-2.pooler.supabase.com');
assert.ok(decodeURIComponent(url.username).endsWith('.'+ref));
for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
const chain=execFileSync('openssl',['s_client','-starttls','postgres','-connect',`${url.hostname}:${url.port}`,'-servername',url.hostname,'-showcerts'],{input:'',encoding:'utf8',timeout:15000,stdio:['pipe','pipe','ignore']});
const pems=chain.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
assert.equal(pems.length,3);
const certs=pems.map(p=>new X509Certificate(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(certs[2].raw),'807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa');
assert.equal(hash(certs[1].raw),'303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea');
assert.ok(certs[0].checkHost(url.hostname));
for(const c of certs)assert.ok(Date.parse(c.validFrom)<Date.now()&&Date.parse(c.validTo)>Date.now());
assert.ok(certs[0].verify(certs[1].publicKey)&&certs[1].verify(certs[2].publicKey)&&certs[2].verify(certs[2].publicKey));
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));
assert.equal(manifest.projectRef,ref);
for(const [p,h]of Object.entries(manifest.hashes))assert.equal(hash(fs.readFileSync(root+'/'+p)),h,p);
assert.equal(manifest.migrationSha256,'8f999fe06e70c73e45c27ea573213e4a6c0bce4e6210ffe69696edb77e330c93');
const {evaluateTcgplayerMarketQualificationV1:livePolicy}=await import(pathToFileURL(runtime+'/backend/pricing/tcgplayer_market_publication_policy_v1.mjs'));
const overlay=JSON.parse(fs.readFileSync(root+'/edition-overlay.json'));
assert.equal(overlay.version,'JUNGLE_POPULATED_SOURCE_OVERLAY_V1');assert.equal(overlay.assignments.length,128);assert.equal(overlay.links.length,128);
assert.ok(overlay.links.every(l=>l.state==='active'));assert.equal(new Set(overlay.assignments.map(a=>a.source_observation_id)).size,128);
const assigned=new Map(overlay.assignments.map(a=>[a.source_observation_id,a]));
const body=fs.readFileSync(root+'/candidate-v2-body.sql','utf8');
const projectedBody=body.replaceAll('public.jungle_edition_identity_links_v1','audit_links')
  .replaceAll('public.v_tcgplayer_jungle_edition_current_assignments_v1','audit_assignments');
assert.notEqual(projectedBody,body);
const cte=`with audit_links as (
 select * from jsonb_to_recordset($3::jsonb) as t(legacy_card_print_id uuid,card_print_id uuid,state text)
),audit_assignments as (
 select id,binding_id,assignment_sha256,assignment_version,assignment_payload_text::jsonb as assignment_payload,source_observation_id,source_sync_run_id
 from jsonb_to_recordset($4::jsonb) as t(id uuid,binding_id uuid,assignment_sha256 text,
 assignment_version text,assignment_payload_text text,source_observation_id uuid,source_sync_run_id uuid)
),audit_candidate_v2 as (${projectedBody})`;
const queryFor=(candidate=false)=>`${candidate?cte:''} select candidate.*,source_group.name as source_group_name,${columns}
 from ${candidate?'audit_candidate_v2':'public.v_tcgplayer_market_qualification_candidates_v1'} candidate
 left join public.tcgcsv_source_groups source_group on source_group.group_id=candidate.group_id ${joins}
 where candidate.source_sync_run_id=$1 and candidate.source_product_id=any($2::integer[])
 order by candidate.source_product_id,candidate.source_subtype_name,candidate.source_observation_id`;
const out=base+'/current-source-full-parity-v29-'+Date.now();fs.mkdirSync(out);
const save=(p,value)=>fs.writeFileSync(out+'/'+p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),target:ref,runtime,manifest,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),mode:'repeatable_read_read_only',populatedEditionRelations:true,productionWrites:0});
fs.writeFileSync(out+'/projected-query.sql',queryFor(true),{flag:'wx'});
const client=new Client({connectionString:url.href,ssl:{ca:pems.slice(1),rejectUnauthorized:true,servername:url.hostname},connectionTimeoutMillis:15000,query_timeout:125000,application_name:'grookai_jungle_readonly_source_parity_v1'});
const gzip=createGzip({level:6}),archive=fs.createWriteStream(out+'/candidates-and-decisions.ndjson.gz',{flags:'wx',mode:0o600});
gzip.pipe(archive);
const streamHash=createHash('sha256');let uncompressedBytes=0;
async function line(record){const b=Buffer.from(JSON.stringify(record)+'\n');streamHash.update(b);uncompressedBytes+=b.length;if(!gzip.write(b))await once(gzip,'drain');}
const counts={selected:0,ordinary:0,edition:0,jungleEdition:0,liveEligible:0,candidateEligible:0,newlyEligible:0,newlyHeld:0,ordinaryRowDifferences:0,ordinaryDecisionDifferences:0,editionEligible:0};
const byCategory={},bySubtype={},reasons={},pages=[],changes=[];
const increment=(o,k)=>o[k]=(o[k]??0)+1;
const added=['edition_assignment_id','edition_binding_id','edition_assignment_sha256','edition_assignment_version','edition_assignment_payload','edition_assignment_required','edition_assignment_current','edition_source_sync_finished_at','printed_identity_modifier'];
const started=Date.now();let receipt;
try{
 await client.connect();
 await client.query("begin isolation level repeatable read read only; set local statement_timeout='120s'; set local lock_timeout='3s'; set local idle_in_transaction_session_timeout='120s'");
 assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only,'on');
 const sanity=(await client.query(`select (select count(*)::int from public.card_prints) cards,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits,(select count(*)::int from supabase_migrations.schema_migrations) migrations,to_regclass('public.jungle_edition_identity_links_v1') edition_links,to_regclass('public.tcgplayer_jungle_edition_assignments_v1') edition_assignments`)).rows[0];
 assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000);assert.equal(sanity.migrations,414);assert.equal(sanity.edition_links,null);assert.equal(sanity.edition_assignments,null);
 const before=(await client.query('select to_jsonb(t) value from public.market_price_current_publication t')).rows;
 const now=new Date((await client.query('select transaction_timestamp() at')).rows[0].at);
 const source=(await client.query(`select * from public.tcgcsv_source_sync_runs where sync_mode='current_full_sync' and status='completed' and failed_count=0 and finished_at is not null order by finished_at desc,created_at desc,id desc limit 1`)).rows[0];
 assert.ok(source);assert.equal(source.id,overlay.sourceRun);
 const productIds=[...new Set(overlay.assignments.map(a=>Number(a.assignment_payload.source.product_id)))];
 const products=(await client.query('select product_id,payload_hash from public.tcgcsv_source_products where product_id=any($1::integer[])',[productIds])).rows;
 for(const a of overlay.assignments){assert.equal(a.source_sync_run_id,source.id);assert.equal(products.find(p=>p.product_id===Number(a.assignment_payload.source.product_id))?.payload_hash,a.assignment_payload.source.product_hash);}
 const digestCheck=(await client.query("select count(*)::int n from jsonb_to_recordset($1::jsonb) as a(assignment_payload jsonb,assignment_payload_text text,assignment_sha256 text) where a.assignment_payload=a.assignment_payload_text::jsonb and encode(extensions.digest((assignment_payload_text::jsonb)::text,'sha256'),'hex')=assignment_sha256",[JSON.stringify(overlay.assignments)])).rows[0];assert.equal(digestCheck.n,128);
 assert.ok((now-new Date(source.finished_at))/3600000<=36,'Source must be fresh');
 const inventory=(await client.query(`select count(*)::int observation_count,array_agg(distinct product_id order by product_id) product_ids from public.tcgcsv_source_price_daily_observations where last_seen_run_id=$1 and observed_on=$2 and category_id in(1,3)`,[source.id,source.observed_on])).rows[0];
 assert.ok(inventory.observation_count>200000,'Full source inventory unexpectedly small');
 const tracker=createCandidateStreamReconcilerV1(source.id,inventory.observation_count);
 const candidateTracker=createCandidateStreamReconcilerV1(source.id,inventory.observation_count);
 const productPages=buildTcgplayerCandidateProductPagesV1(inventory.product_ids);
 save('baseline.json',{at:now.toISOString(),sanity,source,publication:before,inventory:{observations:inventory.observation_count,products:inventory.product_ids.length,pages:productPages.length},livePolicySha256:hash(fs.readFileSync(runtime+'/backend/pricing/tcgplayer_market_publication_policy_v1.mjs'))});
 console.log(JSON.stringify({stage:'baseline',out,source:source.id,observations:inventory.observation_count,pages:productPages.length}));
 for(const [index,ids]of productPages.entries()){
  const t0=performance.now();const live=(await client.query(queryFor(false),[source.id,ids])).rows;const t1=performance.now();
  const candidate=(await client.query(queryFor(true),[source.id,ids,JSON.stringify(overlay.links),JSON.stringify(overlay.assignments)])).rows;const t2=performance.now();
  tracker.accept(live);candidateTracker.accept(candidate);assert.equal(live.length,candidate.length);
  for(let i=0;i<live.length;i++){
   const a=live[i],b=candidate[i];assert.equal(a.source_observation_id,b.source_observation_id);
   if(Number(a.category_id)===3){assert.ok(String(a.source_product_name??'').trim());assert.ok(String(a.source_group_name??'').trim());}
   const x=livePolicy(a,{now}),y=candidatePolicy(hydrateTcgplayerEditionCandidateV1(b),{now});const edition=b.edition_assignment_required===true;
   counts.selected++;increment(byCategory,String(a.category_id));increment(bySubtype,`${a.category_id}:${a.source_subtype_name}`);
   if(x.eligible)counts.liveEligible++;if(y.eligible)counts.candidateEligible++;
   if(!x.eligible&&y.eligible)counts.newlyEligible++;if(x.eligible&&!y.eligible)counts.newlyHeld++;
   if(edition){counts.edition++;if(Number(a.group_id)===635)counts.jungleEdition++;if(y.eligible)counts.editionEligible++;
    assert.equal(b.source_mapping_id,null);assert.equal(b.variant_assignment_id,null);
    const expected=assigned.get(a.source_observation_id);
    if(expected){assert.equal(y.eligible,true,JSON.stringify(y.reason_codes));assert.equal(b.edition_assignment_id,expected.id);assert.equal(b.card_print_id,expected.assignment_payload.canonical.card_print_id);assert.equal(b.card_printing_id,expected.assignment_payload.canonical.card_printing_id);}
    else{assert.equal(y.eligible,false);assert.equal(b.card_print_id,null);assert.equal(b.card_printing_id,null);assert.ok(y.reason_codes.includes('edition_bound_pricing_authority_required'));}
   }
   else{counts.ordinary++;const clean={...b};for(const key of added)delete clean[key];try{assert.deepEqual(clean,a)}catch{counts.ordinaryRowDifferences++}try{assert.deepEqual(y,x)}catch{counts.ordinaryDecisionDifferences++}}
   for(const reason of y.reason_codes)increment(reasons,reason);
   if(x.eligible!==y.eligible)changes.push({observation:a.source_observation_id,product:a.source_product_id,subtype:a.source_subtype_name,parent:a.card_print_id,group:a.group_id,edition,before:x.reason_codes,after:y.reason_codes});
   await line({baseline:a,projected:b,liveDecision:x,candidateDecision:y});
  }
  const page={index:index+1,products:ids.length,rows:live.length,baselineQueryMs:Math.round(t1-t0),projectedQueryMs:Math.round(t2-t1),totalMs:Math.round(performance.now()-t0)};pages.push(page);
  fs.appendFileSync(out+'/progress.ndjson',JSON.stringify({...page,selected:counts.selected})+'\n');console.log(JSON.stringify({stage:'page',...page,selected:counts.selected}));
 }
 const reconciliation=tracker.finish(),candidateReconciliation=candidateTracker.finish();
 const after=(await client.query('select to_jsonb(t) value from public.market_price_current_publication t')).rows;assert.deepEqual(after,before);
 assert.equal(counts.ordinaryRowDifferences,0);assert.equal(counts.ordinaryDecisionDifferences,0);assert.equal(counts.newlyEligible,128);assert.equal(counts.newlyHeld,0);assert.equal(counts.editionEligible,128);assert.ok(counts.jungleEdition>=126);
 await client.query('rollback');
 receipt={status:'passed',at:new Date().toISOString(),target:ref,sourceRun:source.id,asOf:now.toISOString(),counts,byCategory,bySubtype,reasons,changes,reconciliation,candidateReconciliation,pages,elapsedMs:Date.now()-started,migrationSha256:manifest.migrationSha256,populatedEditionRelations:true,productionDatabaseWrites:0,productionRuntimeWrites:0,publicationActivation:false,populatedV2FullSourceShadow:false,limitation:'Current422 candidate view with128 actual SQL assignments from a rolled-back local fixture; all current production source rows/decisions compared. No current-source durable worker, ledger, snapshot or publication proof is claimed.'};
}catch(error){receipt={status:'failed',at:new Date().toISOString(),error:error.message,counts,pages,elapsedMs:Date.now()-started,productionDatabaseWrites:0};process.exitCode=1;}
finally{await client.query('rollback').catch(()=>{});await client.end().catch(()=>{});gzip.end();await finished(archive);receipt.archive={path:'candidates-and-decisions.ndjson.gz',uncompressedBytes,uncompressedSha256:streamHash.digest('hex'),compressedBytes:fs.statSync(out+'/candidates-and-decisions.ndjson.gz').size};save('receipt.json',receipt);console.log(JSON.stringify({status:receipt.status,out,counts,error:receipt.error,elapsedMs:receipt.elapsedMs}));}
