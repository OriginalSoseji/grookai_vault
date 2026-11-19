import {CONDITIONS,DOMAIN_SCOPES,FINISHES,SOURCE,normalizeGroup,resolveTargets,selectConditionReference} from './tcgtracking_condition_reference_v1.mjs';

export const CONDITION_PRICE_VERSION='CONDITION_PRICE_READ_MODEL_V1';
const UUID=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const MAX_BYTES=16*1024*1024;
const TTL=60*60*1000;
const one=value=>Array.isArray(value)?value.length===1?value[0]:null:value;
async function checked(query){const {data,error}=await query.abortSignal(AbortSignal.timeout(15000));if(error)throw new Error('CONDITION_PRICE_MAPPING_READ_FAILED');return data??[];}
const finishOf=value=>typeof value==='string'?Object.entries(FINISHES).find(([label,key])=>label.toLowerCase()===value.toLowerCase()||key===value.toLowerCase())?.[1]:undefined;

// Revalidate canonical eligibility on every request, independently of source caching.
export async function resolveConditionPriceTargetV1(client,cardPrintingId){
  const [printing]=await checked(client.from('card_printings').select('id,card_print_id,finish_key,is_provisional,card_prints!inner(id,identity_domain)').eq('id',cardPrintingId).limit(1));
  const parent=one(printing?.card_prints);
  const scope=DOMAIN_SCOPES[parent?.identity_domain];
  if(!printing||printing.is_provisional!==false||!parent||parent.id!==printing.card_print_id||!scope||!Object.values(FINISHES).includes(printing.finish_key))return null;
  const [reviews,exact]=await Promise.all([
    checked(client.from('card_printing_truth_reviews').select('review_status,public_visibility').eq('card_printing_id',cardPrintingId).eq('active',true).limit(101)),
    checked(client.from('external_printing_mappings').select('id,source,external_id,meta').eq('card_printing_id',cardPrintingId).eq('active',true).in('source',['tcgplayer','tcgplayer_market']).limit(101)),
  ]);
  if(reviews.length>100||exact.length>100||reviews.some(row=>['hidden_pending_review','hidden_unsupported'].includes(row.public_visibility)))return null;
  const parentMappings=parent.identity_domain==='pokemon_eng_standard'&&reviews.some(row=>row.review_status==='verified'&&row.public_visibility==='visible')
    ?await checked(client.from('external_mappings').select('id,source,external_id').eq('card_print_id',parent.id).eq('source','tcgplayer').eq('active',true).limit(101)):[];
  if(parentMappings.length>100)return null;
  const candidates=[];
  for(const [mapping_lane,mappings] of [['exact_printing',exact],['verified_parent_finish',parentMappings]])for(const mapping of mappings){
    const id=String(mapping.external_id);
    const product=mapping.source==='tcgplayer_market'?id.match(/^([1-9]\d*):(normal|foil|holo|reverse)$/):id.match(/^([1-9]\d*)$/);
    const finish=mapping_lane==='verified_parent_finish'?printing.finish_key:mapping.source==='tcgplayer_market'?product?.[2]:finishOf(mapping.meta?.source_subtype);
    if(!product||finish!==printing.finish_key||!Number.isSafeInteger(Number(product[1])))continue;
    candidates.push({mapping_lane,mapping_source:mapping.source,mapping_id:String(mapping.id),product_id:Number(product[1]),card_print_id:parent.id,card_printing_id:printing.id,finish_key:printing.finish_key,identity_domain:parent.identity_domain});
  }
  const ids=[...new Set(candidates.map(row=>row.product_id))];
  if(!ids.length)return null;
  const products=await checked(client.from('tcgcsv_source_products').select('product_id,category_id,group_id').in('product_id',ids).eq('source_active',true).limit(101));
  if(products.length>100)return null;
  const mapped=candidates.flatMap(row=>{
    const matches=products.filter(product=>Number(product.product_id)===row.product_id);
    if(matches.length!==1)return[];
    const product=matches[0];
    if(product.category_id!==scope.category||!Number.isSafeInteger(product.group_id)||product.group_id<=0)return[];
    return[{...row,category_id:product.category_id,group_id:product.group_id}];
  });
  const resolved=resolveTargets(mapped);
  if(resolved.targets.length!==1||resolved.withheld.length)return null;
  const target=resolved.targets[0];
  const [competingExact,competingParents]=await Promise.all([
    checked(client.from('external_printing_mappings').select('card_printing_id,source,external_id,meta').eq('active',true).in('source',['tcgplayer','tcgplayer_market']).in('external_id',[String(target.product_id),`${target.product_id}:${target.finish_key}`]).limit(101)),
    parent.identity_domain==='pokemon_eng_standard'?checked(client.from('external_mappings').select('card_print_id').eq('active',true).eq('source','tcgplayer').eq('external_id',String(target.product_id)).limit(101)):Promise.resolve([]),
  ]);
  if(competingExact.length>100||competingParents.length>100||competingParents.some(mapping=>mapping.card_print_id!==parent.id))return null;
  if(competingExact.some(mapping=>mapping.card_printing_id!==printing.id&&(mapping.source==='tcgplayer_market'||finishOf(mapping.meta?.source_subtype)===printing.finish_key)))return null;
  if(target.mapping_lane==='verified_parent_finish'){
    const siblings=await checked(client.from('card_printings').select('id').eq('card_print_id',parent.id).eq('finish_key',printing.finish_key).eq('is_provisional',false).limit(2));
    if(siblings.length!==1||siblings[0].id!==printing.id)return null;
  }
  return target;
}

// Process-local LRU: coalesce a set fetch, cap memory and outbound concurrency.
// Only published pricing endpoints are fetched. No upstream pages or account data.
export function createConditionSourceCacheV1({fetcher=fetch,clock=Date.now,maxBytes=MAX_BYTES,ttlMs=TTL}={}){
  const cache=new Map(),pending=new Map();let bytes=0;
  return async target=>{
    const key=`${target.category_id}:${target.group_id}`;
    if(!Number.isSafeInteger(target.category_id)||target.category_id<=0||!Number.isSafeInteger(target.group_id)||target.group_id<=0)throw new Error('INVALID_SOURCE_GROUP');
    const hit=cache.get(key);
    if(hit&&clock()-hit.at<ttlMs){cache.delete(key);cache.set(key,hit);return hit.value;}
    if(hit){cache.delete(key);bytes-=hit.bytes;}
    if(pending.has(key))return pending.get(key);
    if(pending.size>=2)throw new Error('CONDITION_SOURCE_BUSY');
    const task=(async()=>{
      const url=`https://openapi.tcgtracking.com/v1/${target.category_id}/sets/${target.group_id}/skus`;
      const response=await fetcher(url,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{Accept:'application/json','User-Agent':'GrookaiVault-ConditionPricing/1.0'},cache:'no-store'});
      if(!response.ok)throw new Error('CONDITION_SOURCE_UNAVAILABLE');
      const declared=Number(response.headers.get('content-length'));
      if(Number.isFinite(declared)&&declared>maxBytes){await response.body?.cancel();throw new Error('CONDITION_SOURCE_TOO_LARGE');}
      if(!response.body)throw new Error('CONDITION_SOURCE_EMPTY');
      const reader=response.body.getReader(),chunks=[];let size=0;
      try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new Error('CONDITION_SOURCE_TOO_LARGE');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
      const source=JSON.parse(Buffer.concat(chunks,size).toString('utf8'));
      if(source.set_id!==target.group_id||!source.products||Array.isArray(source.products)||typeof source.products!=='object'||!Number.isSafeInteger(source.sku_count)||source.sku_count<0)throw new Error('CONDITION_SOURCE_SHAPE_INVALID');
      const value={source,fetchedAt:new Date(clock()).toISOString()};
      // Reject corrupt counts/SKU identity before admitting a response to cache.
      normalizeGroup({response:source,targets:[],categoryId:target.category_id,groupId:target.group_id,fetchedAt:value.fetchedAt});
      while(cache.size&&(cache.size>=6||bytes+size>32*1024*1024)){const oldest=cache.keys().next().value;bytes-=cache.get(oldest).bytes;cache.delete(oldest);}
      cache.set(key,{at:clock(),bytes:size,value});bytes+=size;
      return value;
    })();
    pending.set(key,task);
    try{return await task;}finally{pending.delete(key);}
  };
}
const sharedSourceCache=createConditionSourceCacheV1();

export async function getConditionPriceV1(client,{cardPrintingId,condition,now=new Date().toISOString()},{readSource=sharedSourceCache}={}){
  if(!UUID.test(cardPrintingId)||!CONDITIONS.includes(condition))throw new Error('INVALID_EXACT_CONDITION');
  const target=await resolveConditionPriceTargetV1(client,cardPrintingId);
  const unavailable=reason=>({version:CONDITION_PRICE_VERSION,status:'unavailable',confidence:'unavailable',card_printing_id:cardPrintingId,condition,amount:null,currency:null,currency_hint:'USD',currency_verified:false,source:SOURCE,source_label:'TCGplayer condition price via TCGTracking',pricing_lane:'reference',provider_updated_at:null,unavailable_reason:reason});
  if(!target)return unavailable('exact_mapping_unavailable');
  const {source,fetchedAt}=await readSource(target);
  const normalized=normalizeGroup({response:source,targets:[target],categoryId:target.category_id,groupId:target.group_id,fetchedAt});
  const selected=selectConditionReference(normalized.rows,{cardPrintingId,condition,now});
  const base={...unavailable(normalized.source_fresh?selected.reason??null:'stale_or_invalid_price'),card_print_id:target.card_print_id,source_product_id:target.product_id,finish_key:target.finish_key,language:target.language,provider_updated_at:source.updated,fetched_at:fetchedAt};
  return selected.status==='reference_available'?{...base,status:'available',confidence:'medium',amount:selected.market_price,unavailable_reason:null}:base;
}

export function createConditionPriceHandlerV1({authorize,read}){
  const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'}});
  return async request=>{
    try{
      if(!await authorize(request))return json({ok:false,error:'Sign in required.'},401);
      if(request.method!=='GET')return json({ok:false,error:'Method not allowed.'},405);
      const query=new URL(request.url).searchParams,id=query.get('card_printing_id')??'',condition=query.get('condition');
      if(!UUID.test(id)||!CONDITIONS.includes(condition)||query.getAll('card_printing_id').length!==1||query.getAll('condition').length!==1)return json({ok:false,error:'Choose an exact printing and condition.'},400);
      const price=await read({cardPrintingId:id,condition});
      if(price.version!==CONDITION_PRICE_VERSION||price.card_printing_id!==id||price.condition!==condition||price.pricing_lane!=='reference'||!['available','unavailable'].includes(price.status)||(price.status==='available'&&!(typeof price.amount==='number'&&Number.isFinite(price.amount)&&price.amount>0)))throw new Error('CONDITION_PRICE_RESPONSE_MISMATCH');
      return json({ok:true,pricing:{version:price.version,status:price.status,confidence:price.status==='available'?'medium':'unavailable',card_printing_id:id,condition,amount:price.status==='available'?price.amount:null,currency:null,currency_hint:'USD',currency_verified:false,source_label:price.source_label,provider_updated_at:price.provider_updated_at,pricing_lane:'reference',unavailable_reason:price.unavailable_reason}});
    }catch{return json({ok:false,error:'Condition pricing is temporarily unavailable.'},503);}
  };
}
