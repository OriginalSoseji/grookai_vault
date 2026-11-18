import {VERSION,SOURCE,STAGED_STATUS,CONDITIONS,selectConditionReference} from './tcgtracking_condition_reference_v1.mjs';

export const CANARY_VERSION='CONDITION_PRICING_PRIVATE_CANARY_V1';
export const CANARY_SET=Object.freeze({categoryId:3,groupId:1394,setCode:'bw6',name:'Dragons Exalted'});
async function checked(query){const {data,error}=await query.abortSignal(AbortSignal.timeout(15000));if(error)throw new Error('CONDITION_CANARY_READ_FAILED');return data??[];}
const one=value=>Array.isArray(value)?(value.length===1?value[0]:null):value;

async function context(client){
  const [receipt]=await checked(client.from('raw_imports')
    .select('id,normalized:payload->normalized,version:payload->version,kind:payload->_kind,lane:payload->pricing_lane,visible:payload->app_visible')
    .eq('source',SOURCE).eq('status',STAGED_STATUS).like('notes',`${VERSION}:3:1394:%`).order('id',{ascending:false}).limit(1));
  if(!receipt)return{catalog:[],rows:[],rawId:null};
  if(receipt.version!==VERSION||receipt.kind!=='condition_price_reference_group_v1'||receipt.lane!=='reference'||receipt.visible!==false||!Array.isArray(receipt.normalized?.rows))throw new Error('CONDITION_CANARY_RECEIPT_INVALID');
  const rows=receipt.normalized.rows;
  const ids=[...new Set(rows.map(row=>row.card_printing_id))];
  if(ids.length>500)throw new Error('CONDITION_CANARY_SCOPE_BOUND_EXCEEDED');
  if(!ids.length)return{catalog:[],rows:[],rawId:receipt.id};
  const [printings,reviews]=await Promise.all([
    checked(client.from('card_printings').select('id,card_print_id,finish_key,is_provisional,printing_gv_id,card_prints!inner(id,name,number,gv_id,set_code,identity_domain)').in('id',ids)),
    checked(client.from('card_printing_truth_reviews').select('card_printing_id,review_status,public_visibility').in('card_printing_id',ids).eq('active',true)),
  ]);
  const parentMappingIds=[...new Set(rows.filter(row=>row.mapping_lane==='verified_parent_finish').map(row=>row.mapping_id))];
  const exactMappingIds=[...new Set(rows.filter(row=>row.mapping_lane==='exact_printing').map(row=>row.mapping_id))];
  const parentMappings=parentMappingIds.length?await checked(client.from('external_mappings').select('id,card_print_id,external_id,source').in('id',parentMappingIds).eq('active',true)):[];
  const exactMappings=exactMappingIds.length?await checked(client.from('external_printing_mappings').select('id,card_printing_id,external_id,source').in('id',exactMappingIds).eq('active',true)):[];
  const catalog=[];
  for(const printing of printings){
    const parent=one(printing.card_prints);
    const evidence=rows.filter(row=>row.card_printing_id===printing.id);
    const activeReviews=reviews.filter(review=>review.card_printing_id===printing.id);
    if(!parent||printing.is_provisional||parent.id!==printing.card_print_id||parent.set_code!==CANARY_SET.setCode||parent.identity_domain!=='pokemon_eng_standard'||activeReviews.some(review=>['hidden_pending_review','hidden_unsupported'].includes(review.public_visibility)))continue;
    const valid=evidence.every(row=>{
      if(row.card_print_id!==parent.id||row.finish_key!==printing.finish_key||row.category_id!==3||row.group_id!==1394||row.language!=='EN'||row.source!==SOURCE||row.pricing_lane!=='reference'||row.app_visible!==false)return false;
      const list=row.mapping_lane==='verified_parent_finish'?parentMappings:row.mapping_lane==='exact_printing'?exactMappings:[];
      const mapping=list.find(mapping=>String(mapping.id)===String(row.mapping_id));
      if(!mapping||mapping.source!==row.mapping_source||Number(mapping.external_id.split(':')[0])!==row.product_id)return false;
      return row.mapping_lane==='verified_parent_finish'
        ?mapping.card_print_id===parent.id&&activeReviews.some(review=>review.review_status==='verified'&&review.public_visibility==='visible')
        :mapping.card_printing_id===printing.id;
    });
    if(valid&&evidence.length)catalog.push({id:printing.id,cardPrintId:parent.id,name:parent.name,number:parent.number,finishKey:printing.finish_key,printingGvId:printing.printing_gv_id});
  }
  catalog.sort((a,b)=>String(a.number).localeCompare(String(b.number),undefined,{numeric:true})||a.name.localeCompare(b.name)||a.finishKey.localeCompare(b.finishKey));
  return{catalog,rows,rawId:receipt.id};
}

export async function getConditionCanaryCatalogV1(client){return(await context(client)).catalog;}
export async function getConditionCanaryPriceV1(client,{cardPrintingId,condition,now}){
  if(!CONDITIONS.includes(condition))throw new Error('INVALID_CONDITION');
  const data=await context(client);const printing=data.catalog.find(row=>row.id===cardPrintingId);
  if(!printing)return null;
  const selected=selectConditionReference(data.rows,{cardPrintingId,condition,now});
  return{version:CANARY_VERSION,status:selected.status==='reference_available'?'available':'unavailable',card_printing_id:printing.id,card_print_id:printing.cardPrintId,condition,amount:selected.status==='reference_available'?selected.market_price:null,currency:null,currency_hint:'USD',currency_verified:false,source_label:'TCGPlayer condition reference via TCGTracking',provider_updated_at:selected.provider_updated_at??null,unavailable_reason:selected.reason??null,pricing_lane:'reference',private_preview:true};
}

export function createConditionCanaryHandlerV1({authorize,read}){
  const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'};
  const json=(body,status=200)=>Response.json(body,{status,headers});
  return async request=>{
    try{
      const access=await authorize(request);
      if(!access.authenticated)return json({ok:false,error:'Sign in required.'},401);
      if(!access.founder)return json({ok:false,error:'Founder access required.'},403);
      if(request.method!=='GET')return json({ok:false,error:'Method not allowed.'},405);
      const query=new URL(request.url).searchParams;
      const id=query.get('card_printing_id')??'';const condition=query.get('condition');
      if(query.getAll('card_printing_id').length!==1||query.getAll('condition').length!==1||!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id)||!CONDITIONS.includes(condition))return json({ok:false,error:'Choose an exact printing and supported condition.'},400);
      const result=await read({cardPrintingId:id,condition});
      if(!result)return json({ok:false,error:'Printing is not available in this private canary.'},404);
      if(result.version!==CANARY_VERSION||result.card_printing_id!==id||result.condition!==condition||result.pricing_lane!=='reference'||result.private_preview!==true||!['available','unavailable'].includes(result.status)||(result.status==='available'&&!(typeof result.amount==='number'&&Number.isFinite(result.amount)&&result.amount>0)))throw new Error('CONDITION_CANARY_RESPONSE_MISMATCH');
      // Explicit allowlist: raw receipts, provider datasets and credentials never leave the backend.
      return json({ok:true,pricing:{version:result.version,status:result.status,card_printing_id:result.card_printing_id,card_print_id:result.card_print_id,condition:result.condition,amount:result.status==='available'?result.amount:null,currency:null,currency_hint:'USD',currency_verified:false,source_label:result.source_label,provider_updated_at:result.provider_updated_at,unavailable_reason:result.unavailable_reason,pricing_lane:'reference',private_preview:true}});
    }catch{return json({ok:false,error:'Condition preview is temporarily unavailable.'},503);}
  };
}
