// Read-only backend verification; this is not a development app routed to production.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createBackendClient} from '../../backend/supabase_backend_client.mjs';
import {createConditionSourceCacheV1,getConditionPriceV1} from '../../backend/pricing/condition_pricing_read_model_v1.mjs';
import {CONDITIONS,FINISHES,hash} from '../../backend/pricing/tcgtracking_condition_reference_v1.mjs';

const project='ycdxbpibncqcchqiihfz';
if(new URL(process.env.SUPABASE_URL).hostname!==`${project}.supabase.co`||!(await fs.readFile('supabase/config.toml','utf8')).includes(project))throw new Error('ENVIRONMENT_MISMATCH');
const out=path.resolve(process.argv[2]??`artifacts/condition_price_read_model_v1/${new Date().toISOString().replace(/[:.]/g,'-')}`);
await fs.mkdir(path.dirname(out),{recursive:true});await fs.mkdir(out);
const client=createBackendClient();
const counts={};
for(const table of ['card_prints','sets','card_print_traits']){
  let result;
  for(let attempt=0;attempt<2;attempt++){
    result=await client.from(table).select('id',{count:'exact',head:true}).abortSignal(AbortSignal.timeout(20000));
    if(!result.error)break;
  }
  if(result.error)throw new Error(`ENV_COUNT_READ_FAILED:${table}:${result.error.code??'transport'}`);
  counts[table]=result.count;
}
if(counts.card_prints<40000||counts.sets<150||counts.card_print_traits<5000)throw new Error('ENVIRONMENT_MISMATCH');
const artifact='artifacts/tcgtracking_condition_reference_v1/full_database_v3_20261117';
const canary=JSON.parse(await fs.readFile('docs/audits/pricing/condition_pricing_private_canary_v1/live-read-model.json','utf8'));
const {receipts}=JSON.parse(await fs.readFile(`${artifact}/receipts.json`,'utf8'));
const requests=canary.catalog.map(row=>({id:row.id,category:3,group:1394}));
for(const category of [1,68,85]){
  const receipt=receipts.find(row=>row.category_id===category&&row.source_fresh&&row.priced_count>0);
  if(!receipt)throw new Error('SAMPLE_CATEGORY_MISSING');
  const normalized=JSON.parse(await fs.readFile(`${artifact}/groups/${category}_${receipt.group_id}.normalized.json`,'utf8'));
  requests.push({id:normalized.rows[0].card_printing_id,category,group:receipt.group_id});
}
const cache=createConditionSourceCacheV1(),evidence=new Map();
const readSource=async target=>{const value=await cache(target);evidence.set(`${target.category_id}:${target.group_id}`,value);return value;};
const results=[];
for(const request of requests)for(const condition of CONDITIONS){
  const price=await getConditionPriceV1(client,{cardPrintingId:request.id,condition},{readSource});
  if(price.card_printing_id!==request.id||price.condition!==condition)throw new Error('EXACT_RESPONSE_MISMATCH');
  let exactSourceMatches=null;
  if(price.source_product_id){
    const source=evidence.get(`${request.category}:${request.group}`)?.source;
    // Bind to the exact mapped product, finish, language and condition.
    const matches=Object.values(source?.products?.[price.source_product_id]??{}).filter(row=>row.cnd===condition&&FINISHES[row.var]===price.finish_key&&row.lng===price.language);
    exactSourceMatches=matches.length;
    const age=Date.now()-Date.parse(source?.updated);
    const expected=matches.length===1&&typeof matches[0].mkt==='number'&&Number.isFinite(matches[0].mkt)&&matches[0].mkt>0&&Number.isFinite(age)&&age>=-300000&&age<=36*3600000?matches[0].mkt:null;
    if(price.amount!==expected||price.status!==(expected===null?'unavailable':'available'))throw new Error('SOURCE_AMOUNT_OR_AVAILABILITY_MISMATCH');
  }
  results.push({category_id:request.category,group_id:request.group,...price,source_selection_checked:exactSourceMatches!==null});
}
const executed_source_hashes=Object.fromEntries(await Promise.all(['backend/pricing/condition_pricing_read_model_v1.mjs','backend/pricing/tcgtracking_condition_reference_v1.mjs','scripts/audits/condition_price_read_model_live_v1.mjs'].map(async name=>[name,hash(await fs.readFile(name))])));
const report={version:'CONDITION_PRICE_READ_MODEL_LIVE_V1',checked_at:new Date().toISOString(),project_ref:project,counts,executed_source_hashes,production_writes:false,proof_scope:'shared backend reader and public feed; not deployed route or authenticated browser',printing_count:requests.length,condition_selections:results.length,available:results.filter(row=>row.status==='available').length,unavailable:results.filter(row=>row.status!=='available').length,source_groups:[...evidence].map(([group,value])=>({group,provider_updated_at:value.source.updated,fetched_at:value.fetchedAt,source_json_sha256:hash(value.source)})),results};
await fs.writeFile(path.join(out,'readback.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({out,printings:report.printing_count,selections:report.condition_selections,available:report.available,unavailable:report.unavailable,source_groups:report.source_groups.length,production_writes:false}));
