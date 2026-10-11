// Synthetic governed-price runtime fixture. Fixed local target; never production.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const root='C:/gv_product_deal_refresh_20261008',base='C:/grookai_vault_operator_artifacts/product_deal_refresh_20261008';
const lab='C:/grookai_vault_operator_artifacts/product_negotiated_trade_20261007/full-433-v4',project='product-trade-full-433-v4-20261007';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const mode=process.argv[2];assert.ok(['prepare','verify','restore'].includes(mode));
assert.equal(process.argv.length,mode==='prepare'?3:4);
const run=mode==='prepare'?base+'/market-'+Date.now():path.resolve(process.argv[3]).replaceAll('\\','/');
assert.match(run,new RegExp('^'+base+'/market-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(read(base+'/CHECKPOINT.json').sourceFrozen,false);
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,433);
assert.ok(replay.fullReplay&&replay.noOpPush&&!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort(),Object.keys(freeze.sourceHashes).sort());
for(const[name,digest]of Object.entries(freeze.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),digest);
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:33561');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);
assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const port of[33560,33561])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33560/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_item_instance_dispositions','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.card_print_identity','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots','public.external_mappings','public.tcgcsv_source_categories','public.tcgcsv_source_groups','public.tcgcsv_source_sync_runs','public.tcgcsv_source_artifacts','public.tcgcsv_source_products','public.tcgcsv_source_price_daily_observations','public.market_evidence_variant_assignments','public.tcgplayer_jungle_edition_assignments_v1','public.market_price_pipeline_runs','public.market_price_pipeline_phase_attempts','public.market_price_pipeline_candidates','public.market_price_qualification_decisions','public.market_price_publication_sets','public.market_price_publication_snapshots','public.market_price_publication_events'];
const canon=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const flagsSql='select (select enabled from vendor_negotiated_trade_control) negotiated,(select enabled from vendor_sales_trade_control) trade,(select enabled from vendor_sales_payment_control) payments,(select enabled from vendor_purchase_control) purchase,(select enabled from vendor_sales_cart_control) cart,(select enabled from vendor_receipt_cloud_control) cloud,(select capture_enabled from vendor_cost_evidence_control) capture,(select edit_enabled from vendor_cost_evidence_control) edit';
const save=(name,value)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2));
async function retain(f){
 const counts={};for(const table of tables){const after=new Set((await q(`select to_jsonb(t) row from ${table} t`)).map(canon));for(const row of f.retained[table])assert.ok(after.has(canon(row)),table+': prior row changed');counts[table]=f.retained[table].length;}return counts;
}
async function restore(f){
 await q('reset role');await q('begin');
 try{
  await q("select pg_advisory_xact_lock(hashtext('tcgplayer_market_publication_v1'))");
  const pointers=await q('select * from market_price_current_publication for update');
  assert.equal(f.pointerBefore.length,0);
  if(pointers.length){assert.equal(pointers.length,1);const owned=await q('select id from market_price_pipeline_runs where id=$1 and run_key=$2',[pointers[0].run_id,f.canaryRunKey]);assert.equal(owned.length,1,'Do not touch another publication pointer');save('owned-pointer-before-removal.json',pointers[0]);const removed=await q('delete from market_price_current_publication where run_id=$1 and publication_set_id=$2 returning run_id',[pointers[0].run_id,pointers[0].publication_set_id]);assert.equal(removed.length,1);}
  for(const [table,key]of [['vendor_negotiated_trade_control','negotiated'],['vendor_sales_trade_control','trade'],['vendor_sales_payment_control','payments'],['vendor_purchase_control','purchase'],['vendor_sales_cart_control','cart'],['vendor_receipt_cloud_control','cloud']])await q('update '+table+' set enabled=$1',[f.flags[key]]);
  await q('update vendor_cost_evidence_control set capture_enabled=$1,edit_enabled=$2',[f.flags.capture,f.flags.edit]);
  await q('commit');
 }catch(e){await q('rollback');throw e;}
 assert.deepEqual((await q(flagsSql))[0],f.flags);assert.equal((await q('select * from market_price_current_publication')).length,0);const counts=await retain(f);
 save('retention.json',{status:'passed',retainedTables:tables.length,priorRowCounts:counts,controlsRestored:true,pointerRestoredToAbsent:true,allNewHistoryRetained:true,productionWrites:0});
 f.previousState=f.state;f.state='restored';save('fixture.private.json',f);
}
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,433);
 assert.equal(read('C:/grookai_vault_operator_artifacts/product_offer_market_20261008/CHECKPOINT.json').sourceFrozen,false,'Market qualification must be terminal');
 if(mode==='verify'){
  const f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');assert.equal(f.project,project);const a=read(run+'/phase-1/device-response.json'),b=read(run+'/phase-2/device-response.json');assert.equal(a.phase,'market_saved');assert.equal(b.phase,'market_reopened');assert.equal(a.owner,f.owner);assert.equal(b.owner,f.owner);assert.ok(a.noPending&&b.noPending&&b.exactHeldBytes&&b.exactHeldTermsAfterOpen&&b.accountClosed);assert.equal(b.journalRevisionIncrement,1);assert.equal(a.manualMinor,700);assert.equal(a.referenceMinor,1234);assert.deepEqual(a.reference,b.reference);assert.equal(a.reference.provenanceId,f.reference.provenance_id);assert.equal((await q('select count(*)::int n from vendor_sales_cart_receipts where owner_id=$1',[f.owner]))[0].n,0);assert.equal((await q('select count(*)::int n from vault_item_instances where user_id=$1',[f.owner]))[0].n,0);await retain(f);save('database-readback.json',{status:'passed',createdCopies:0,completedReceipts:0,retainedTables:tables.length,exactHeldBytesBeforeOpen:true,exactHeldTermsAfterOpen:true,journalRevisionIncrement:1,referenceMinor:1234,agreedMinor:700,productionWrites:0});console.log(JSON.stringify({run,state:'device_verified'}));
 }else if(mode==='restore'){
  const f=read(run+'/fixture.private.json');assert.equal(f.project,project);assert.ok(f.email.endsWith('@offer-market.invalid'));assert.notEqual(f.state,'restored');await restore(f);console.log(JSON.stringify({run,state:f.state}));
 }else{
  const flags=(await q(flagsSql))[0];assert.deepEqual(flags,{negotiated:false,trade:false,payments:false,purchase:false,cart:false,cloud:false,capture:false,edit:false});
  const pointerBefore=await q('select * from market_price_current_publication');assert.equal(pointerBefore.length,0,'Preserve existing active publication; this fixture requires the attested absent pointer');
  const retained={};for(const table of tables)retained[table]=await q(`select to_jsonb(t) row from ${table} t`);
  fs.mkdirSync(run);save('source-binding.json',{head:command('git',['rev-parse','HEAD']).trim(),workerSha256:sha(root+'/scripts/workers/tcgplayer_market_publication_worker_v1.mjs'),fixtureSha256:sha(root+'/scripts/audits/product_deal_refresh_fixture_v1.mjs'),migrations:433,localPipelineFunctionProof:true,cliReleaseQualification:false});const f={project,state:'preparing',consumed:true,at:new Date().toISOString(),flags,retained,pointerBefore,email:randomUUID()+'@offer-market.invalid',password:randomUUID()+'Aa9!',set:randomUUID(),card:randomUUID(),printing:randomUUID(),missingPrinting:randomUUID(),otherCard:randomUUID(),sourceRun:randomUUID(),priceArtifact:randomUUID(),summaryArtifact:randomUUID(),observation:randomUUID(),product:Math.floor(800000000+Math.random()*100000000),group:Math.floor(700000000+Math.random()*100000000),canaryRunKey:'LOCAL-OFFER-CANARY-'+randomUUID()};
  f.name='Runtime offer '+f.card.slice(0,8);f.gv='GV-PK-MARKET-'+f.card.toUpperCase();f.printingGv=f.gv+'-HOLO';f.sourceRunKey='LOCAL-OFFER-SOURCE-'+f.sourceRun;save('fixture.private.json',f);
  try{
   const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const made=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});assert.equal(made.error,null);f.owner=made.data.user.id;save('fixture.private.json',f);
   const priceBytes=JSON.stringify({synthetic:true,productId:f.product,subTypeName:'Holofoil',marketPrice:12.34,currency:'USD'}),summaryBytes=JSON.stringify({synthetic:true,sourceRun:f.sourceRun,products:1,prices:1});
   fs.writeFileSync(run+'/prices.synthetic.json',priceBytes);fs.writeFileSync(run+'/summary.synthetic.json',summaryBytes);
   await q('begin');
   await q("insert into sets(id,code,name,game) values($1,$2,'Synthetic market proof set','pokemon')",[f.set,'offer-'+f.set]);
   for(const[id,name,gv]of [[f.card,f.name,f.gv],[f.otherCard,f.name+' other','GV-PK-MARKET-'+f.otherCard]])await q("insert into card_prints(id,game_id,set_id,set_code,name,number,gv_id,image_status,identity_domain) values($1,(select id from games where code='pokemon'),$2,$3,$4,$6,$5,'missing','pokemon_eng_standard')",[id,f.set,'offer-'+f.set,name,gv,id===f.card?'1':'2']);
   await q("insert into card_print_identity(id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active) values($1,$2,'pokemon_eng_standard',$3,'1',$4,$5,'{\"variant_key_current\":\"standard\"}','pokemon_eng_standard:v1',$6,true)",[randomUUID(),f.card,'offer-'+f.set,f.name.toLowerCase(),f.name,createHash('sha256').update(f.card).digest('hex')]);
   for(const[id,finish,gv]of [[f.printing,'holo',f.printingGv],[f.missingPrinting,'reverse',f.gv+'-REVERSE']])await q('insert into card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional) values($1,$2,$3,$4,false)',[id,f.card,finish,gv]);
   await q("insert into external_mappings(card_print_id,source,external_id,meta,active) values($1,'tcgplayer',$2,'{\"mapping_method\":\"synthetic_local_runtime_fixture\",\"confidence\":1}',true)",[f.card,String(f.product)]);
   const syntheticHash=createHash('sha256').update('synthetic-local-fixture').digest('hex');
   await q("insert into tcgcsv_source_categories(category_id,name,raw_payload,payload_hash) values(3,'Pokemon','{\"synthetic\":true}',$1) on conflict do nothing",[syntheticHash]);
   await q("insert into tcgcsv_source_groups(group_id,category_id,name,raw_payload,payload_hash) values($1,3,'Synthetic market proof set','{\"synthetic\":true}',$2)",[f.group,syntheticHash]);
   await q("insert into tcgcsv_source_sync_runs(id,run_key,sync_mode,status,source_marker,observed_on,request_count,category_count,group_count,product_count,price_row_count,inserted_count,failed_count,artifact_hash,worker_version,parser_version,schema_contract_version,git_commit_sha,started_at,finished_at) values($1,$2,'current_full_sync','completed',$2,current_date,1,1,1,1,1,1,0,$3,'SYNTHETIC_LOCAL_RUNTIME','SYNTHETIC_LOCAL_RUNTIME','SYNTHETIC_LOCAL_RUNTIME',$4,now()-interval '2 minutes',now()-interval '1 minute')",[f.sourceRun,f.sourceRunKey,sha(run+'/summary.synthetic.json'),command('git',['rev-parse','HEAD']).trim()]);
   for(const[id,kind,file,bytes]of [[f.priceArtifact,'prices','prices.synthetic.json',priceBytes],[f.summaryArtifact,'run_summary','summary.synthetic.json',summaryBytes]])await q("insert into tcgcsv_source_artifacts(id,sync_run_id,run_key,artifact_kind,local_path,sha256,byte_size,fetched_at,http_status,observed_on,category_id,group_id) values($1,$2,$3,$4,$5,$6,$7,now()-interval '1 minute',200,current_date,3,$8)",[id,f.sourceRun,f.sourceRunKey,kind,run+'/'+file,sha(run+'/'+file),Buffer.byteLength(bytes),f.group]);
   await q("insert into tcgcsv_source_products(product_id,category_id,group_id,name,clean_name,extended_data,raw_payload,payload_hash,last_seen_run_id,source_active,catalog_metadata_status) values($1,3,$2,$3,$3,'[{\"name\":\"Number\",\"value\":\"1\"}]','{\"synthetic\":true}',$4,$5,true,'current')",[f.product,f.group,f.name,syntheticHash,f.sourceRun]);
   await q("insert into tcgcsv_source_price_daily_observations(id,source_price_row_identity,product_id,category_id,group_id,subtype_name,subtype_name_normalized,observed_on,market_price,currency,raw_payload,payload_hash,source_artifact_id,first_seen_run_id,last_seen_run_id,first_observed_at,last_observed_at) values($1,$2,$3,3,$4,'Holofoil','holofoil',current_date,12.34,'USD',$5::jsonb,$6,$7,$8,$8,now()-interval '1 minute',now()-interval '1 minute')",[f.observation,'synthetic:'+f.product+':holofoil',f.product,f.group,priceBytes,sha(run+'/prices.synthetic.json'),f.priceArtifact,f.sourceRun]);
   await q('commit');f.state='seeded';save('fixture.private.json',f);
   for(const key of Object.keys(process.env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|MTG_PRICING/.test(key))delete process.env[key];fs.writeFileSync(run+'/empty.env','');process.env.DOTENV_CONFIG_PATH=run+'/empty.env';
   const {runDurable,latestSourceRun,parseArgs}=await import('../workers/tcgplayer_market_publication_worker_v1.mjs');
   await q('set role service_role');const source=await latestSourceRun(db);assert.equal(source.id,f.sourceRun);
   const args={...parseArgs(['--shadow']),limit:null,canaryDefinition:null,batchSize:2},plan={run_key:'LOCAL-OFFER-SHADOW-'+randomUUID(),commit_sha:command('git',['rev-parse','HEAD']).trim()};
   const shadow=await runDurable(db,args,source,plan);save('shadow-run.json',{run:shadow.run,reconciliation:shadow.reconciliation});assert.equal(shadow.run.state,'shadow_verified');assert.equal(shadow.reconciliation.selected_count,1);assert.equal(shadow.reconciliation.snapshot_count,1);assert.deepEqual(shadow.reconciliation.mismatches,[]);
   const canaryDefinition={printings:[{source_product_id:f.product,source_subtype_name:'Holofoil',card_print_id:f.card,card_printing_id:f.printing,gv_id:f.gv,printing_gv_id:f.printingGv,expected_finish:'holo'}]};
   const current=await runDurable(db,{...args,runMode:'canary',canaryDefinition},source,{...plan,run_key:f.canaryRunKey});save('canary-run.json',{run:current.run,reconciliation:current.reconciliation});assert.equal(current.run.state,'verified');assert.equal(current.reconciliation.snapshot_count,1);assert.deepEqual(current.reconciliation.mismatches,[]);f.runId=current.run.id;
   const prices=await q(`select m.*,to_char(m.observed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') observed_at_exact,to_char(m.published_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') published_at_exact from get_market_pricing_read_model_v1(null,$1::uuid[]) m`,[[f.printing]]);assert.equal(prices.length,1);assert.equal(prices[0].status,'available');assert.equal(Number(prices[0].market_close),12.34);assert.equal(prices[0].card_print_id,f.card);f.reference=prices[0];save('governed-readback.json',prices[0]);
   await q('reset role');await retain(f);await q('begin');for(const table of ['vendor_negotiated_trade_control','vendor_sales_trade_control','vendor_sales_payment_control','vendor_purchase_control','vendor_sales_cart_control','vendor_receipt_cloud_control'])await q('update '+table+' set enabled=true');await q('commit');
   save('defines.private.json',{GROOKAI_WEB_BASE_URL:'http://127.0.0.1:33611',MARKET_TEST_PRINTING_GV:f.printingGv,MARKET_TEST_MISSING_PRINTING_GV:f.gv+'-REVERSE',MARKET_TEST_PROVENANCE:f.reference.provenance_id,MARKET_TEST_OBSERVED:f.reference.observed_at_exact,MARKET_TEST_PUBLISHED:f.reference.published_at_exact,SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,MARKET_TEST_EMAIL:f.email,MARKET_TEST_PASSWORD:f.password,MARKET_TEST_CARD:f.card,MARKET_TEST_PRINTING:f.printing,MARKET_TEST_MISSING_PRINTING:f.missingPrinting,MARKET_TEST_OTHER_CARD:f.otherCard,MARKET_TEST_NAME:f.name});
   f.state='prepared';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state,price:'USD12.34',shadowAndCanary:true}));
  }catch(error){await q('rollback').catch(()=>{});save('failure.json',{name:error.name,message:error.message,stack:error.stack});await restore(f);throw error;}
 }
}catch(error){await db.query('rollback').catch(()=>{});throw error;}finally{await db.end();}
