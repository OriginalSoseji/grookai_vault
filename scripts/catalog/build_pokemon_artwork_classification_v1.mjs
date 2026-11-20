// Offline validation by default. --stage-raw retains exact accepted originals
// through the existing private raw-import/artifact store; it cannot write canon.
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {randomUUID} from 'node:crypto';
import os from 'node:os';
import {bodyHash,classifyArtworkReference,classifyCatalogProductArtwork,artworkSource,runArtworkBuild} from '../../backend/catalog/pokemon_artwork_classification_v1.mjs';
import {FileArtifactStore,SupabaseArtifactStore} from '../../backend/competitive/pokemon_playables/store.mjs';
import {assertRemoteEnvironment,loadCanonicalCatalog} from '../../backend/competitive/pokemon_playables/catalog.mjs';

async function main(){
const {values}=parseArgs({options:{input:{type:'string'},output:{type:'string'},'stage-raw':{type:'boolean',default:false},'expected-project':{type:'string'}}});
if(!values.input||!values.output)throw Error('--input and --output are required');
const inputPath=path.resolve(values.input),inputRoot=path.dirname(inputPath);
const audit=JSON.parse(await fs.readFile(inputPath,'utf8'));
if(!Array.isArray(audit.results)||!audit.results.length||audit.results.length>500)throw Error('ARTWORK_CANDIDATE_BOUND');
let catalog=audit.catalog,mappings=audit.mappings,store,db;
if(values['stage-raw']){
  const {createBackendClient}=await import('../../backend/supabase_backend_client.mjs');
  db=createBackendClient();await assertRemoteEnvironment(db,values['expected-project']);
  store=new SupabaseArtifactStore(db);await store.initialize();
}else store=new FileArtifactStore(path.join(inputRoot,'artwork-offline-raw'));
const summary=await runArtworkBuild(store,async run=>{
if(db){
  catalog=await loadCanonicalCatalog(db,audit.results.map(item=>item.parent.id));
  const ids=[...new Set(audit.mappings.map(item=>item.external_id))];
  const current=await db.from('external_mappings').select('id,source,external_id,card_print_id,active').eq('source','tcgplayer').eq('active',true).in('external_id',ids).limit(1000);
  if(current.error||current.data.length===1000)throw Error('ARTWORK_MAPPING_READ');mappings=current.data;
}
const rows=[],held=[],ingress=[];
run.stage='stage_references';
for(const item of audit.results){
  if(!item.receipt_file){held.push({card_print_id:item.parent.id,reason:item.reason});continue;}
  const file=path.resolve(item.receipt_file);
  if(path.dirname(file)!==inputRoot||path.basename(file)!==`${item.parent.gv_id}.json`)throw Error('ARTWORK_REFERENCE_PATH');
  const original=JSON.parse(await fs.readFile(file,'utf8'));
  let result;
  try{result=classifyArtworkReference({receipt:original,parent:item.parent,catalog:catalog.find(row=>row.id===item.parent.id),mappings,setName:item.setName});}
  catch(error){if(error.message==='ARTWORK_REFERENCE_INTEGRITY')throw error;held.push({card_print_id:item.parent.id,reason:error.message});continue;}
  if(result.state!=='classified'){held.push({card_print_id:item.parent.id,reason:result.reason});continue;}
  const observed=Date.parse(original.observed_at);
  if(!Number.isFinite(observed)||observed>Date.now()||Date.now()-observed>30*86400000)throw Error('ARTWORK_REFERENCE_AGE');
  const receipt={...original,id:`artwork-${bodyHash(original.url+'|'+original.body_sha256)}`,source_id:artworkSource,kind:'artwork_metadata'};
  const reference=await store.saveRaw(receipt,new Date(observed+30*86400000).toISOString());
  if(values['stage-raw']&&!reference.raw_import_id)throw Error('ARTWORK_RAW_INGRESS_REQUIRED');
  rows.push(result.row);ingress.push({card_print_id:item.parent.id,...reference});
}
for(const item of audit.product_artwork_candidates??[]){
  if(rows.some(row=>row.card_print_id===item.parent.id))continue;
  let product=item.product,group=item.group;
  if(db){
    const live=await db.from('tcgcsv_source_products').select('*').eq('product_id',product.product_id).single();
    const g=await db.from('tcgcsv_source_groups').select('group_id,name').eq('group_id',product.group_id).single();
    if(live.error||g.error||bodyHash(JSON.stringify(live.data.raw_payload))!==bodyHash(JSON.stringify(product.raw_payload)))throw Error('ARTWORK_PRODUCT_CHANGED');
    product=live.data;group=g.data;
  }
  const result=classifyCatalogProductArtwork({product,group,parent:item.parent,catalog:catalog.find(row=>row.id===item.parent.id),mappings,setName:item.setName});
  if(result.state!=='classified')continue;
  const observed=Date.parse(product.last_seen_at);
  if(!Number.isFinite(observed)||observed>Date.now()||Date.now()-observed>30*86400000)throw Error('ARTWORK_REFERENCE_AGE');
  const receipt={id:`artwork-product-${product.product_id}-${result.row.evidence.body_sha256}`,source_id:'tcgcsv_retained_catalog_product',kind:'artwork_metadata',
    url:product.source_url,observed_at:new Date(product.last_seen_at).toISOString(),body_text:JSON.stringify(product.raw_payload),body_sha256:result.row.evidence.body_sha256,
    original_format:'retained_json_payload',upstream_payload_hash:product.payload_hash};
  const reference=await store.saveRaw(receipt,new Date(Date.parse(receipt.observed_at)+30*86400000).toISOString());
  if(values['stage-raw']&&!reference.raw_import_id)throw Error('ARTWORK_RAW_INGRESS_REQUIRED');
  rows.push(result.row);ingress.push({card_print_id:item.parent.id,...reference});
}
for(let i=held.length-1;i>=0;i--)if(rows.some(row=>row.card_print_id===held[i].card_print_id))held.splice(i,1);
if(new Set(rows.map(row=>row.card_print_id)).size!==rows.length||!rows.length)throw Error('ARTWORK_DUPLICATE_OR_EMPTY');
rows.sort((a,b)=>a.gv_id.localeCompare(b.gv_id));
const model={version:'pokemon_artwork_classification:v1',source_policy:{
  scope:'Existing English physical catalog cards; explicit Details.Notes or retained catalog product Full Art labels only. No prices, auction titles, images or provider analysis are published.',
  collection_basis:'Bounded public factual-reference research; public game paths allowed by the observed robots.txt. No authentication, access-control bypass, price feed or bulk database copy.',
  robots_url:'https://www.pricecharting.com/robots.txt',reviewed_at:'2026-11-20',raw_retention_days:30},
  coverage:{candidates_checked:audit.results.length,classified:rows.length,held:held.length},rows};
run.stage='write_read_model';
await fs.mkdir(path.dirname(path.resolve(values.output)),{recursive:true});
const temporary=path.resolve(values.output)+`.${randomUUID()}.tmp`;
const file=await fs.open(temporary,'wx');
try{await file.writeFile(JSON.stringify(model,null,2)+'\n');await file.sync();}finally{await file.close();}
await fs.rename(temporary,values.output);
await fs.writeFile(path.join(inputRoot,values['stage-raw']?'ingress-production.json':'ingress-offline.json'),JSON.stringify({at:new Date().toISOString(),remote:values['stage-raw'],ingress,held},null,2));
return {run_id:run.run_id,output:values.output,remote_raw_ingress:values['stage-raw'],model_hash:bodyHash(JSON.stringify(model)),...model.coverage};
});
console.log(JSON.stringify(summary));
}
await main().catch(async error=>{
  // Target/configuration failures cannot safely write to an unverified remote.
  // Preserve an operator receipt locally even if DB/storage is unavailable.
  const input=process.argv[process.argv.indexOf('--input')+1];
  const dir=input&&input!==process.execPath?path.join(path.dirname(path.resolve(input)),'artwork-build-failures'):path.join(os.tmpdir(),'grookai-artwork-build-failures');
  await fs.mkdir(dir,{recursive:true});
  const error_code=/^[A-Z][A-Z0-9_]+$/.test(error.message??'')?error.message:'ARTWORK_BUILD_FAILED';
  const run_id=error.artwork_run_id??randomUUID();
  await fs.writeFile(path.join(dir,run_id+'.json'),JSON.stringify({run_id,at:new Date().toISOString(),stage:error.artwork_stage??'target_verification',
    status:error.artwork_terminal_uncertain?'outcome_unknown':'failed',error_code,error_detail:'Artwork build did not finish; remote success must be independently verified.'}));
  console.error(error);process.exitCode=1;
});
