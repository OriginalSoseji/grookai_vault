// Credential-free, read-only source qualification. Never grants display rights.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {sourceDocumentTextV1} from './lib/source_document_text_v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.resolve(process.argv[2]??path.join(root,'artifacts/tcgtracking_source_qualification_v1',new Date().toISOString().replace(/[:.]/g,'-')));
const intake=path.join(root,'artifacts/tcgtracking_condition_reference_v1/full_database_v3_20261117');
const preview=path.join(root,'docs/audits/pricing/condition_pricing_private_canary_v1/live-read-model.json');
const sources=[
  ['openapi_docs','https://openapi.tcgtracking.com/'],
  ['provider_home','https://tcgtracking.com/'],
  ['provider_disclaimer','https://tcgtracking.com/disclaimer.php'],
  ['provider_privacy','https://tcgtracking.com/privacy.php'],
  ['provider_contact','https://tcgtracking.com/contact.php'],
  ['dragons_exalted_skus','https://openapi.tcgtracking.com/v1/3/sets/1394/skus'],
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
await fs.mkdir(path.dirname(out),{recursive:true});
// Acquisition receipts are immutable; a rerun needs a new output directory.
await fs.mkdir(out);
const captures=await Promise.allSettled(sources.map(async([name,url])=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{Accept:name.endsWith('skus')?'application/json':'text/html','User-Agent':'GrookaiVault-SourceQualification/1.0'}});
  if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);
  if(new URL(response.url).origin!==new URL(url).origin)throw new Error(`${name}: cross-origin redirect`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>2_000_000)throw new Error(`${name}: response exceeds audit bound`);
  const json=name.endsWith('skus');
  await fs.writeFile(path.join(out,`${name}.${json?'json':'html'}`),bytes);
  return{name,url:response.url,http_status:response.status,fetched_at:new Date().toISOString(),bytes:bytes.length,sha256:sha(bytes),headers:Object.fromEntries(['content-type','etag','last-modified','cache-control'].map(key=>[key,response.headers.get(key)])),body:json?JSON.parse(bytes):sourceDocumentTextV1(bytes.toString('utf8'))};
}));
const failed=captures.flatMap((result,index)=>result.status==='rejected'?[{name:sources[index][0],error:String(result.reason.message??result.reason)}]:[]);
const successful=captures.filter(result=>result.status==='fulfilled').map(result=>result.value);
const docs=successful.filter(row=>typeof row.body==='string');
const receipt=successful.find(row=>row.name==='dragons_exalted_skus');
const normalized=JSON.parse(await fs.readFile(path.join(intake,'groups/3_1394.normalized.json'),'utf8'));
const snapshot=JSON.parse(await fs.readFile(preview,'utf8'));
const currencyFields=new Set();const skuFields=new Set();const conditions=new Set();
let sourceRows=0;let missingSelected=0;const comparisons=[];
if(receipt){
  const source=receipt.body;
  if(source.set_id!==1394||!source.products||!Number.isInteger(source.sku_count))throw new Error('Unexpected fixed-set SKU envelope');
  for(const key of Object.keys(source))if(/currency|currency_code|^ccy$/i.test(key))currencyFields.add(`envelope.${key}`);
  for(const skus of Object.values(source.products))for(const row of Object.values(skus)){
    sourceRows++;conditions.add(row.cnd);
    for(const key of Object.keys(row)){skuFields.add(key);if(/currency|currency_code|^ccy$/i.test(key))currencyFields.add(`sku.${key}`);}
  }
  if(sourceRows!==source.sku_count)throw new Error('SKU envelope count mismatch');
  for(const expected of snapshot.prices){
    const printing=snapshot.catalog.find(row=>row.id===expected.card_printing_id);
    const lineage=normalized.rows.find(row=>row.card_printing_id===expected.card_printing_id);
    if(!printing||!lineage)throw new Error('Captured selection lacks exact printing lineage');
    const matches=Object.entries(source.products[lineage.product_id]??{}).filter(([,row])=>row.cnd===expected.condition&&row.lng==='EN'&&row.var===(printing.finishKey==='normal'?'Normal':printing.finishKey==='reverse'?'Reverse Holofoil':'UNSUPPORTED'));
    const fresh=matches.length===1&&typeof matches[0][1].mkt==='number'&&Number.isFinite(matches[0][1].mkt)&&matches[0][1].mkt>0?matches[0][1].mkt:null;
    if(fresh===null)missingSelected++;
    comparisons.push({card_printing_id:printing.id,condition:expected.condition,stored_amount:expected.amount,fresh_amount:fresh,unchanged:expected.amount===fresh,sku_matches:matches.length});
  }
}
const checkedAt=new Date().toISOString();
const report={version:'TCGTRACKING_SOURCE_QUALIFICATION_V1',checked_at:checkedAt,local_date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(checkedAt)),timezone:'America/Denver',mode:'credential_free_public_get_and_saved_fixture_only',production_reads:false,production_writes:false,provider_messages_sent:false,
  captures:successful.map(({body,...row})=>row),failed_captures:failed,
  document_search:docs.map(row=>({name:row.name,licence_or_terms_word_present:/\b(?:licen[cs]e|terms)\b/i.test(row.body),commercial_word_present:/\bcommercial\b/i.test(row.body),usd_word_present:/\bUSD\b/i.test(row.body),note:'Keyword presence is search evidence, not a grant, prohibition or currency guarantee.'})),
  sku_sample:receipt?{url:receipt.url,set_id:receipt.body.set_id,provider_updated_at:receipt.body.updated,sku_count:sourceRows,product_count:receipt.body.product_count,envelope_fields:Object.keys(receipt.body).sort(),sku_fields:[...skuFields].sort(),conditions:[...conditions].sort(),explicit_currency_fields:[...currencyFields],scope_printings:snapshot.catalog.length,selections:comparisons.length,available:comparisons.length-missingSelected,unavailable:missingSelected,unchanged_from_saved_preview:comparisons.filter(row=>row.unchanged).length,comparisons}:null,
  qualification:{intentionally_published_api:'documented',condition_market_field:'documented_as_tcgplayer_market',daily_refresh:'documented',commercial_display_permission:'not_established_in_reviewed_pages',provider_permission_request_required:false,source_use_policy:'owner_authorized_published_api_absent_explicit_restriction_20261117',sku_currency:'unverified',official_per_sku_accuracy:'not_independently_corroborated',public_activation:'separate_release_qualification',note:'The owner permits using the published API without separate permission absent an applicable explicit restriction. Missing terms are not a prohibition. This is not an ownership or upstream-rights determination. A dollar sign or third-party consumer is not explicit SKU currency evidence.'},
  next_evidence:['Track applicable explicit provider restrictions, attribution and request limits; do not require a custom permission statement merely because none is published.','Seek stronger SKU currency evidence while preserving the explicit USD assumption.','Independent official SKU comparison with matching product, finish, language, condition and observation time.'],
};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({out,failed_captures:failed.length,sample:report.sku_sample?{selections:comparisons.length,unchanged:report.sku_sample.unchanged_from_saved_preview,available:report.sku_sample.available,unavailable:missingSelected,currency_fields:[...currencyFields]}:null,public_activation:report.qualification.public_activation}));
if(failed.length)process.exitCode=1;
