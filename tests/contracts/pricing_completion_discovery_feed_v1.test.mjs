import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {runPricingCompletionDiscoveryFeedCycleV1 as cycle,PRICING_DISCOVERY_REVIEWED_PINS_V1 as PINS} from '../../backend/pricing/pricing_completion_discovery_feed_v1.mjs';
import {openPricingCompletionDiscoveryQueueV1} from '../../backend/pricing/pricing_completion_discovery_queue_v1.mjs';
import {WAREHOUSE_SCOPE_V1} from '../../backend/pricing/pricing_completion_warehouse_intake_v1.mjs';

const NOW=Date.parse('2026-10-14T00:00:10.000Z'),id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?`[${v.map(canon).join(',')}]`:`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
const enc=v=>Buffer.from(canon(v)+'\n');
const RPC='Synthetic immutable RPC fixture. No SQL execution.\n';
function captures(n=0){
  const transaction=new Date(NOW-9000+n*1000).toISOString(),masterAt=new Date(NOW-8000+n*1000).toISOString(),warehouseAt=new Date(NOW-7000+n*1000).toISOString();
  const source='2026-10-13T23:00:00.000Z',completed='2026-10-13T23:01:00.000Z';
  const env={kind:'environment',read_only:'on',isolation:'repeatable read',database:'postgres',captured_at:transaction,server_version:'17',cards:40000,sets:150,traits:5000,migrations:447};
  const pointer={run_id:id(1),publication_set_id:id(2),source_sync_run_id:id(3),run_mode:'production',state:'verified',reconciliation_state:'reconciled',publication_state:'published',completed_at:completed,source_finished_at:source,source_status:'completed',sync_mode:'current_full_sync',source_failed_count:0};
  const parents=[4,5].map(i=>({id:id(i),gv_id:`GV-PK-TEST-${i}`,name:'Test parent',set_id:id(6),set_code:'test',game:'pokemon',set_game:'pokemon'}));
  const printing={id:id(7),card_print_id:id(4),printing_gv_id:'GV-PK-TEST-4-HOLO',finish_key:'holo'};
  const price={pricing_scope:'card_printing',card_print_id:id(4),card_printing_id:id(7),gv_id:parents[0].gv_id,printing_gv_id:printing.printing_gv_id,finish_key:'holo',status:'unavailable',currency:null,market_close:null,freshness:'unavailable',source_name:null,observed_at:null,published_at:null,provenance_id:null,is_from_price:false,eligible_printing_count:0};
  const common={projectRef:'ycdxbpibncqcchqiihfz',verifiedTls:true,readOnly:true,rollbackAcknowledged:true,caSha256:PINS.caSha256,sourceRunId:id(1),publicationSetId:id(2),databaseWrites:0};
  const mp={...pointer,selected_count:1,snapshot_count:0};
  const master={...common,version:'FIXED_OPERATOR_POKEMON_MASTER_CENSUS_V2',capturedAt:masterAt,sqlSha256:PINS.master.sqlSha256,appRpcSha256:sha(RPC),sourceSyncRunId:id(3),scope:{games:['pokemon'],setFamilies:['pokemon','pokemon_jpn'],currency:'USD',priceBasis:'TCGPLAYER_MARKET',condition:'NOT_CONDITION_SPECIFIC'},sourceCoverage:'unknown',physicalConditionVerified:false,inventoryComplete:true,readbackComplete:true,batchSize:500,invalidParentRoutes:0,records:[
    {...env,latest_migration:'20261014000000'},{kind:'rpc_definition',signature:'public.get_market_pricing_read_model_v1(uuid[],uuid[])',definition_sha256:sha(RPC),definition:RPC},
    {kind:'current_publication_before',rows:[mp]},{kind:'master_counts',rows:[{parents_count:2,printings_count:1,parents_without_printings_count:1,invalid_parent_routes_count:0}]},
    {kind:'parents',rows:parents},{kind:'printings',rows:[printing]},{kind:'rpc_batch',batchIndex:0,requestedPrintingIds:[id(7)],sourceRunId:id(1),publicationSetId:id(2),rows:[price]},
    {kind:'current_publication_after',rows:[structuredClone(mp)]},{kind:'transaction_end',status:'ROLLBACK',read_only_after:'on',isolation_after:'read committed'}]};
  const p={product_id:1,category_id:3,group_id:null,name:'Dragonite GameStop',clean_name:null,source_url:null,extended_data:[],payload_hash:'a'.repeat(64),source_modified_on:null,first_seen_at:null,last_seen_at:null,last_seen_run_id:id(3),source_active:true,source_missing_since:null,catalog_metadata_status:'current'};
  const status={product_id:1,historical_observation_count:null,has_historical_observations:false,latest_observed_on:null,current_observation_count:0,current_positive_quote_count:0,current_decision_count:0,current_published_count:0,mapping_count:0,active_mapping_count:0,active_tcgplayer_mapping_count:0,mapping_group_mismatch_count:0,inactive_product:false,stale_product_metadata:false,missing_group:true,group_category_mismatch:false};
  const counts={products:1,groups:0,observations:0,decisions:0,mappings:0,product_status:1,current_observations:0,historical_observations:null,inactive_products:0,stale_products:0,products_without_any_observations:1,products_without_current_observations:1,products_without_current_positive_quotes:1,products_not_selected_in_current_run:1,products_without_active_tcgplayer_mapping:1,products_without_any_parent_mapping:1,products_with_inactive_mappings_only:0,products_with_mapping_group_mismatch:0,products_with_missing_group:1,products_with_group_category_mismatch:0,decisions_missing_observation:0,decisions_observation_product_mismatch:0};
  const wp={...pointer,observed_on:'2026-10-13'};
  const warehouse={...common,version:'FIXED_OPERATOR_POKEMON_WAREHOUSE_EXPORT_V3',capturedAt:warehouseAt,sqlSha256:PINS.warehouse.sqlSha256,scope:WAREHOUSE_SCOPE_V1,masterCoverage:'unknown',records:[env,{kind:'publication_before',rows:[wp]},
    {kind:'warehouse',data:{historical_observation_count_status:'not_collected',products:[p],groups:[],observations:[],decisions:[],mappings:[],product_status:[status],counts}},
    {kind:'publication_after',rows:[structuredClone(wp)]},{kind:'transaction_end',status:'ROLLBACK',read_only_after:'on',isolation_after:'read committed'}]};
  return {master,warehouse};
}
function publish(options,c=captures(),n=0){const captured=Object.fromEntries(Object.entries(c).map(([k,v])=>[k,enc(v)]));
  const generationId=sha(enc({version:'DISCOVERY_CENSUS_FEED_GENERATION_V1',masterSha256:sha(captured.master),warehouseSha256:sha(captured.warehouse)}));
  const publishedAt=new Date(NOW-5000+n*1000).toISOString(),m={version:'DISCOVERY_CENSUS_FEED_GENERATION_V1',generationId,projectRef:'ycdxbpibncchqiihfz',sourceRunId:id(1),publicationSetId:id(2),sourceSyncRunId:id(3),sourceFinishedAt:'2026-10-13T23:00:00.000Z',publishedAt,snapshotSemantics:'separate_repeatable_read_transactions',captures:{}};
  m.projectRef='ycdxbpibncqcchqiihfz';
  for(const lane of ['master','warehouse'])m.captures[lane]={file:`${lane}.json`,sha256:sha(captured[lane]),bytes:captured[lane].length,collectorSha256:options.expectedPins[lane].collectorSha256,sqlSha256:options.expectedPins[lane].sqlSha256,caSha256:PINS.caSha256,appRpcSha256:lane==='master'?sha(RPC):null,capturedAt:c[lane].capturedAt};
  const root=path.join(options.feedDirectory,'generations',generationId);fs.mkdirSync(root,{recursive:true});
  for(const lane of ['master','warehouse'])fs.writeFileSync(path.join(root,`${lane}.json`),captured[lane]);fs.writeFileSync(path.join(root,'manifest.json'),enc(m));
  const latest={version:'DISCOVERY_CENSUS_FEED_LATEST_V1',generationId,generationPath:`generations/${generationId}`,manifestSha256:sha(enc(m)),publishedAt};
  const status={version:'DISCOVERY_CENSUS_FEED_STATUS_V1',state:'published',attemptedAt:publishedAt,generationId,errorCode:null};
  fs.writeFileSync(path.join(options.feedDirectory,'latest.json'),enc(latest));fs.writeFileSync(path.join(options.feedDirectory,'status.json'),enc(status));return {m,latest,status,root};
}
function setup(){const root=fs.mkdtempSync(path.join(tmpdir(),'discovery-feed-')),options={feedDirectory:path.join(root,'feed'),stateDirectory:path.join(root,'state'),outputDirectory:path.join(root,'out'),expectedPins:{...structuredClone(PINS),master:{...PINS.master,appRpcSha256:sha(RPC)}},now:NOW,batchSize:500};return {root,options,...publish(options)};}
function queue(o){return openPricingCompletionDiscoveryQueueV1({directory:path.join(o.stateDirectory,'queue')});}
function mutateMeta(f,change){change(f.m);fs.writeFileSync(path.join(f.root,'manifest.json'),enc(f.m));f.latest.manifestSha256=sha(enc(f.m));fs.writeFileSync(path.join(f.options.feedDirectory,'latest.json'),enc(f.latest));}

test('both complete sources ingest once, preserve three real identity namespaces, packet precedes defer',()=>{
  const f=setup(),r=cycle(f.options);assert.equal(r.state,'prepared',JSON.stringify(r));assert.equal(r.queue.total,3);assert.equal(r.queue.completed,0);
  assert.deepEqual(Object.keys(r.queue.kinds).sort(),['catalog_parent','master_printing','warehouse_product']);
  const packet=JSON.parse(fs.readFileSync(path.join(f.options.outputDirectory,r.packet.file)));
  assert.equal(packet.items.length,3);assert.equal(packet.productionExecutionEnabled,false);assert.equal(packet.sourceLinks.snapshotSemantics,'separate_repeatable_read_transactions');
  for(const item of packet.items){const live=queue(f.options).get(item.identity);assert.equal(live.state,'review_needed');assert.match(live.history.at(-1).reason,new RegExp(r.packet.sha256));}
  const again=cycle(f.options);assert.equal(again.state,'prepared');assert.equal(again.ingestion.replayed,true);assert.equal(again.packet,null);
});
test('new capture clocks/provenance alone do not reopen or rewrite item shards',()=>{
  const f=setup();assert.equal(cycle(f.options).state,'prepared');const before=queue(f.options).inspect();publish(f.options,captures(1),1);
  const r=cycle(f.options);assert.equal(r.state,'prepared',JSON.stringify(r));assert.equal(r.ingestion.reopened,0);assert.equal(r.packet,null);assert.deepEqual(queue(f.options).inspect().shards,before.shards);
});
test('invalid second source rejects before queue creation even with valid Master',()=>{
  const f=setup(),c=captures();c.warehouse.records[2].data.counts.products=2;publish(f.options,c);
  const r=cycle(f.options);assert.equal(r.state,'failed');assert.equal(r.queueMutationStarted,false);assert.equal(fs.existsSync(path.join(f.options.stateDirectory,'queue')),false);
});
test('Both captures accept the300second budget while305second duration and freshness bounds remain enforced',()=>{
  for(const [lane,duration,accepted] of [['master',240000,true],['master',305000,true],['master',305001,false],['warehouse',240000,true],['warehouse',305000,true],['warehouse',305001,false]]){
    const f=setup(),c=captures();
    c[lane].records[0].captured_at=new Date(Date.parse(c[lane].capturedAt)-duration).toISOString();
    publish(f.options,c);const r=cycle(f.options);
    assert.equal(r.state,accepted?'prepared':'failed',JSON.stringify(r));
    if(accepted){assert.equal(r.queue.total,3);assert.equal(r.queue.completed,0);}
    else {assert.equal(r.queueMutationStarted,false);assert.equal(fs.existsSync(path.join(f.options.stateDirectory,'queue')),false);}
  }
});
test('independent producer pins and same tuple are required',()=>{
  for(const mutate of [f=>{f.options.expectedPins.master.collectorSha256='0'.repeat(64);},f=>mutateMeta(f,m=>m.sourceSyncRunId=id(44)),
    f=>mutateMeta(f,m=>m.snapshotSemantics='single_transaction'),f=>mutateMeta(f,m=>m.captures.warehouse.file='../master.json')]){
    const f=setup();mutate(f);const r=cycle(f.options);assert.equal(r.state,'failed');assert.equal(r.queueMutationStarted,false);
  }
});
test('failed/stale/future/tampered feed never mutates discovery state',()=>{
  for(const mode of ['failed','stale','future','capture']){const f=setup();
    if(mode==='failed'){f.status.state='failed';f.status.errorCode='collector_failed';fs.writeFileSync(path.join(f.options.feedDirectory,'status.json'),enc(f.status));}
    if(mode==='stale')f.options.now+=1800001;
    if(mode==='future')f.options.now-=20000;
    if(mode==='capture')fs.appendFileSync(path.join(f.root,'warehouse.json'),' ');
    const r=cycle(f.options);assert.equal(r.state,'failed');assert.equal(r.queueMutationStarted,false);
  }
});
test('concurrent publisher failure is checked after both normalizers and before ingestion',()=>{
  const f=setup(),original=fs.readFileSync;let changed=false;
  fs.readFileSync=function(...args){const raw=original(...args);if(Buffer.isBuffer(raw)&&!changed&&raw.includes(Buffer.from('FIXED_OPERATOR_POKEMON_WAREHOUSE_EXPORT_V3'))){changed=true;f.status.state='failed';f.status.errorCode='new_failure';fs.writeFileSync(path.join(f.options.feedDirectory,'status.json'),enc(f.status));}return raw;};
  try{const r=cycle(f.options);assert.equal(r.errorCode,'DISCOVERY_FEED_CHANGED');assert.equal(r.queueMutationStarted,false);}finally{fs.readFileSync=original;}
});
test('packet write failure leaves leases unresolved and retry can prepare after expiry',()=>{
  const f=setup(),original=fs.linkSync;
  fs.linkSync=function(a,b){if(path.basename(b).startsWith('packet-')){const e=new Error('synthetic');e.code='EIO';throw e;}return original(a,b);};
  try{const r=cycle({...f.options,leaseMs:1000});assert.equal(r.state,'failed');assert.equal(queue(f.options).summary().states.leased,3);assert.equal(queue(f.options).summary().completed,0);}finally{fs.linkSync=original;}
  const resumed=cycle({...f.options,now:NOW+2000});assert.equal(resumed.state,'prepared');assert.equal(resumed.packet.items,3);
});
test('publisher failure during unchanged ingestion blocks claiming and final success',()=>{
  const f=setup();assert.equal(cycle(f.options).state,'prepared');const next=publish(f.options,captures(1),1),original=fs.renameSync;let changed=false;
  fs.renameSync=function(a,b){const r=original(a,b);if(!changed&&path.basename(b)==='CURRENT.json'){
    changed=true;next.status.state='failed';next.status.errorCode='concurrent_failure';fs.writeFileSync(path.join(f.options.feedDirectory,'status.json'),enc(next.status));}return r;};
  syncBuiltinESMExports();
  try{const r=cycle(f.options);assert.equal(changed,true,'fault must run at the durable queue commit');assert.equal(r.state,'failed');assert.equal(r.errorCode,'DISCOVERY_FEED_CHANGED');assert.equal(r.queueMutationStarted,true);
    assert.equal(queue(f.options).summary().states.review_needed,3);assert.equal(queue(f.options).summary().totalAttempts,3);
  }finally{fs.renameSync=original;syncBuiltinESMExports();}
});
test('overlapping paths, symlink feed and abandoned cycle locks fail closed',()=>{
  const f=setup();assert.throws(()=>cycle({...f.options,outputDirectory:f.options.stateDirectory}),/OVERLAP/);
  fs.mkdirSync(f.options.stateDirectory,{recursive:true});fs.writeFileSync(path.join(f.options.stateDirectory,'CYCLE.lock'),'abandoned');
  assert.equal(cycle(f.options).errorCode,'DISCOVERY_CYCLE_LOCKED');assert.equal(fs.readFileSync(path.join(f.options.stateDirectory,'CYCLE.lock'),'utf8'),'abandoned');
  const g=setup(),link=path.join(path.dirname(g.options.feedDirectory),'feed-link');fs.symlinkSync(g.options.feedDirectory,link,process.platform==='win32'?'junction':'dir');
  assert.equal(cycle({...g.options,feedDirectory:link}).state,'failed');
});
test('PAUSE is preparation-only and CLI rejects missing flag or production options',()=>{
  const f=setup();fs.mkdirSync(f.options.stateDirectory,{recursive:true});fs.writeFileSync(path.join(f.options.stateDirectory,'PAUSE'),'');
  const args=[`--feed-dir=${f.options.feedDirectory}`,`--state-dir=${f.options.stateDirectory}`,`--out-dir=${f.options.outputDirectory}`,
    `--master-collector-sha256=${PINS.master.collectorSha256}`,`--master-sql-sha256=${PINS.master.sqlSha256}`,`--master-rpc-sha256=${PINS.master.appRpcSha256}`,
    `--warehouse-collector-sha256=${PINS.warehouse.collectorSha256}`,`--warehouse-sql-sha256=${PINS.warehouse.sqlSha256}`,`--ca-sha256=${PINS.caSha256}`];
  const script=new URL('../../scripts/workers/pricing_completion_discovery_feed_worker_v1.mjs',import.meta.url);
  const run=extra=>spawnSync(process.execPath,[script.pathname.replace(/^\/([A-Za-z]:\/)/,'$1'),...args,...extra],{encoding:'utf8'});
  assert.notEqual(run([]).status,0);assert.notEqual(run(['--prepare-only','--apply=true']).status,0);
  const paused=run(['--prepare-only']);assert.equal(paused.status,0,paused.stderr);assert.equal(JSON.parse(paused.stdout).state,'paused');
  assert.equal(fs.existsSync(path.join(f.options.stateDirectory,'queue')),false);
});
