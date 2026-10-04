// Offline comparison only. This module cannot issue mapping or publication authority.
import assert from 'node:assert/strict';
import releasedLedger from '../catalog/jungle_catalog_426_ledger.json' with {type:'json'};
import {createHash} from 'node:crypto';
import {parseTcgplayerEditionSubtypeV1} from './tcgplayer_edition_identity_v1.mjs';

export const JUNGLE_SOURCE_REVIEW_V3='JUNGLE_EDITION_SOURCE_REVIEW_V3';
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v;
export const jungleSourcePayloadHashV1=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const hash=b=>createHash('sha256').update(b).digest('hex');

export function jungleProductCompatibilityV1(parent,product){
 const numbers=Array.isArray(product.extended_data)?product.extended_data.filter(x=>x.name==='Number'):[];
 const number=parent.printed_coordinate;
 return product.category_id===3&&product.group_id===635&&product.source_active===true&&product.catalog_metadata_status==='current'&&
  numbers.length===1&&[number+'/64',number.padStart(2,'0')+'/64'].includes(numbers[0].value)&&
  [parent.name,parent.name+' ('+number+')',number==='57'&&parent.name==='Nidoran ♀'?'Nidoran F':parent.name,
   number==='64'&&parent.name==='Poké Ball'?'Poke Ball':parent.name].includes(product.name);
}

export function reviewJungleEditionSourcesV3({manifest,snapshot,artifactBytes,asOf}){
 const age=Date.parse(asOf)-Date.parse(snapshot.at),run=snapshot.sourceRun;
 assert.equal(snapshot.project_ref,'ycdxbpibncqcchqiihfz');assert.equal(snapshot.read_only,true);assert.equal(snapshot.tls_verified,true);
 assert.equal(snapshot.setId,manifest.authority.set_id);assert.ok([426].includes(snapshot.sanity.migrations),'unqualified_source_schema');
 assert.equal(snapshot.version,'JUNGLE_EDITION_POST_RELEASE_CAPTURE_V38');assert.equal(snapshot.ledger.length,426);assert.deepEqual(snapshot.ledger.map(r=>r.version),releasedLedger,'released_ledger_required');assert.equal(new Set(snapshot.ledger.map(r=>r.version)).size,426);assert.deepEqual(snapshot.ledger.at(-1),{version:'20261004090000',name:'jungle_discovery_projection_order_v1'});assert.deepEqual(snapshot.releaseState,{links:0,bindings:0,assignments:0,slab_receipts:0});assert.deepEqual(snapshot.collisions,{parents:[],children:[]});assert.ok(age>=0&&age<3600000,'fresh_snapshot_required');
 assert.equal(run.sync_mode,'current_full_sync');assert.equal(run.status,'completed');assert.equal(run.failed_count,0);
 const sourceAge=Date.parse(asOf)-Date.parse(run.finished_at);assert.ok(sourceAge>=0&&sourceAge<=36*3600000,'fresh_source_required');
 assert.equal(new Set(snapshot.sourceProducts.map(p=>p.product_id)).size,snapshot.sourceProducts.length,'duplicate_product');
 assert.equal(new Set(snapshot.observations.map(o=>o.id)).size,snapshot.observations.length,'duplicate_observation');
 assert.equal(new Set(snapshot.observations.map(o=>o.source_price_row_identity)).size,snapshot.observations.length,'duplicate_source_identity');
 const rawRows=new Map();
 for(const a of snapshot.sourceArtifacts){
  assert.equal(a.sync_run_id,run.id);assert.equal(a.category_id,3);assert.equal(a.group_id,635);assert.equal(a.artifact_kind,'prices');assert.equal(a.http_status,200);
  const bytes=artifactBytes.get(a.id);assert.ok(bytes,'source_bytes_required');assert.equal(hash(bytes),a.sha256,'artifact_hash_mismatch');
  const parsed=JSON.parse(String(bytes));assert.ok(Array.isArray(parsed.results),'source_results_required');rawRows.set(a.id,parsed.results);
 }
 for(const p of snapshot.sourceProducts){
  assert.equal(jungleSourcePayloadHashV1(p.raw_payload),p.payload_hash,'product_payload_mismatch');
  assert.equal(p.raw_payload.productId,p.product_id);assert.equal(p.raw_payload.categoryId,p.category_id);assert.equal(p.raw_payload.groupId,p.group_id);
  assert.equal(p.raw_payload.name,p.name);assert.deepEqual(p.raw_payload.extendedData,p.extended_data);
 }
 for(const o of snapshot.observations){
  assert.equal(o.last_seen_run_id,run.id);assert.equal(o.observed_on,run.observed_on);assert.equal(o.category_id,3);assert.equal(o.group_id,635);
  assert.equal(jungleSourcePayloadHashV1(o.raw_payload),o.payload_hash,'observation_payload_mismatch');
  assert.equal(o.raw_payload.productId,o.product_id);assert.equal(o.raw_payload.subTypeName,o.subtype_name);
  assert.equal(o.source_price_row_identity,'tcgplayer:'+o.product_id+':'+o.subtype_name.trim().toLowerCase().replace(/\s+/g,' '));
  assert.equal(o.currency,'USD');assert.equal(o.raw_payload.marketPrice==null?null:Number(o.raw_payload.marketPrice),o.market_price==null?null:Number(o.market_price));
  const rows=rawRows.get(o.source_artifact_id)?.filter(r=>r.productId===o.product_id&&r.subTypeName===o.subtype_name);
  assert.equal(rows?.length,1,'ambiguous_or_missing_raw_quote');assert.deepEqual(rows[0],o.raw_payload,'raw_quote_mismatch');
 }
 const rows=manifest.parents.map(parent=>{
  const children=manifest.printings.filter(c=>c.card_print_id===parent.id);assert.equal(children.length,1);const child=children[0];
  const edition=parent.printed_identity_modifier.slice(8),products=snapshot.sourceProducts.filter(p=>jungleProductCompatibilityV1(parent,p));
  const reasons=[];if(products.length!==1)reasons.push(products.length?'ambiguous_product':'source_product_identity_unmatched');
  const product=products.length===1?products[0]:null;
  const quotes=product?snapshot.observations.filter(o=>{const parsed=parseTcgplayerEditionSubtypeV1(o.subtype_name);return o.product_id===product.product_id&&parsed?.edition===edition&&parsed?.finish_key===child.finish_key;}):[];
  if(product&&quotes.length!==1)reasons.push(quotes.length?'ambiguous_quote':'missing_exact_edition_quote');
  const quote=quotes.length===1?quotes[0]:null;if(quote&&!(Number(quote.market_price)>0))reasons.push('positive_market_price_required');
  return {card_print_id:parent.id,card_printing_id:child.id,gv_id:parent.gv_id,name:parent.name,number:parent.printed_coordinate,edition,finish_key:child.finish_key,
   product_id:product?.product_id??null,product_hash:product?.payload_hash??null,source_observation_id:quote?.id??null,source_subtype:quote?.subtype_name??null,source_row_hash:quote?.payload_hash??null,
   source_artifact_id:quote?.source_artifact_id??null,market_price:quote?.market_price??null,currency:quote?.currency??null,compatible:reasons.length===0,reasons};
 });
 const used=new Set(rows.filter(r=>r.compatible).map(r=>r.source_observation_id));assert.equal(used.size,rows.filter(r=>r.compatible).length,'quote_reused');
 return {version:JUNGLE_SOURCE_REVIEW_V3,at:asOf,manifest_fingerprint:manifest.fingerprint,snapshot_at:snapshot.at,source_run_id:run.id,source_finished_at:run.finished_at,
  execution_authorized:false,write_ready:false,publishable:false,executable_deltas:[],summary:{parents:rows.length,compatible:rows.filter(r=>r.compatible).length,held:rows.filter(r=>!r.compatible).length,source_products:snapshot.sourceProducts.length,source_observations:snapshot.observations.length},rows,
  unused_observations:snapshot.observations.filter(o=>!used.has(o.id)).map(o=>({id:o.id,product_id:o.product_id,subtype:o.subtype_name}))};
}
