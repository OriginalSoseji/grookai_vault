import {DOMAIN_SCOPES,FINISHES} from './tcgtracking_condition_reference_v1.mjs';

const UUID=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const one=value=>Array.isArray(value)?value.length===1?value[0]:null:value;
const finishOf=value=>typeof value==='string'?Object.entries(FINISHES).find(([label,key])=>label.toLowerCase()===value.toLowerCase()||key===value.toLowerCase())?.[1]:undefined;
async function checked(query){const {data,error}=await query.abortSignal(AbortSignal.timeout(15000));if(error)throw Error('CONDITION_PRICE_AUTHORITY_READ_FAILED');return data??[];}
function productOf(mapping,finish){
 const match=String(mapping.external_id).match(mapping.source==='tcgplayer_market'?/^([1-9]\d*):(normal|foil|holo|reverse)$/:/^([1-9]\d*)$/);
 if(!match||!Number.isSafeInteger(Number(match[1])))return null;
 if(mapping.source==='tcgplayer_market'?match[2]!==finish:finishOf(mapping.meta?.source_subtype)!==finish)return null;
 return Number(match[1]);
}

// A current, exact published printing already has independently qualified finish
// authority. Reuse that authority for an upstream condition lookup; never use
// its market amount as a condition price or create a new external mapping.
export async function resolvePublishedConditionTargetV3(client,printingId){
 const [printing]=await checked(client.from('card_printings').select('id,card_print_id,finish_key,is_provisional,card_prints!inner(id,identity_domain)').eq('id',printingId).limit(1));
 const parent=one(printing?.card_prints),scope=DOMAIN_SCOPES[parent?.identity_domain];
 if(!printing||printing.is_provisional!==false||!scope||parent.id!==printing.card_print_id||!Object.values(FINISHES).includes(printing.finish_key))return null;
 const reviews=await checked(client.from('card_printing_truth_reviews').select('public_visibility').eq('card_printing_id',printingId).eq('active',true).limit(101));
 if(reviews.length>100||reviews.some(row=>['hidden_pending_review','hidden_unsupported'].includes(row.public_visibility)))return null;
 const records=await checked(client.rpc('get_market_pricing_read_model_v1',{p_card_print_ids:null,p_card_printing_ids:[printingId]}));
 if(records.length!==1)return null;
 const record=records[0];
 if(record.pricing_scope!=='card_printing'||record.card_print_id!==parent.id||record.card_printing_id!==printingId||record.finish_key!==printing.finish_key||record.status!=='available'||record.freshness!=='fresh'||record.currency!=='USD'||record.source_name!=='tcgplayer'||record.is_from_price!==false||!UUID.test(record.provenance_id??'')||!(Number(record.market_close)>0))return null;
 const pointers=await checked(client.from('market_price_current_publication').select('publication_set_id,run_id').eq('singleton',true).limit(2));
 if(pointers.length!==1)return null;
 const pointer=pointers[0];
 const snapshots=await checked(client.from('market_price_publication_snapshots').select('provenance_id,card_print_id,card_printing_id,finish_key,source_product_id,source_mapping_id,mtg_printing_mapping_id,source_subtype_name').eq('publication_set_id',pointer.publication_set_id).eq('run_id',pointer.run_id).eq('card_printing_id',printingId).eq('publication_state','published').eq('freshness_state','fresh').limit(3));
 if(snapshots.length!==1)return null;
 const snapshot=snapshots[0],productId=Number(snapshot.source_product_id);
 if(snapshot.provenance_id!==record.provenance_id||snapshot.card_print_id!==parent.id||snapshot.card_printing_id!==printingId||snapshot.finish_key!==printing.finish_key||finishOf(snapshot.source_subtype_name)!==printing.finish_key||!Number.isSafeInteger(productId)||productId<=0)return null;
 const [products,exact,parents]=await Promise.all([
  checked(client.from('tcgcsv_source_products').select('product_id,category_id,group_id').eq('product_id',productId).eq('source_active',true).limit(2)),
  checked(client.from('external_printing_mappings').select('id,card_printing_id,source,external_id,meta').eq('active',true).in('source',['tcgplayer','tcgplayer_market']).in('external_id',[String(productId),`${productId}:${printing.finish_key}`]).limit(101)),
  parent.identity_domain==='mtg_eng_paper_print'?Promise.resolve([]):checked(client.from('external_mappings').select('id,card_print_id,source,external_id').eq('source','tcgplayer').eq('active',true).eq('external_id',String(productId)).limit(101)),
 ]);
 if(products.length!==1||products[0].category_id!==scope.category||!Number.isSafeInteger(products[0].group_id)||products[0].group_id<=0||exact.length>100||parents.length>100||parents.some(row=>row.card_print_id!==parent.id))return null;
 if(exact.some(row=>productOf(row,printing.finish_key)===productId&&row.card_printing_id!==printingId))return null;
 const [childMappings,parentMappings]=await Promise.all([
  checked(client.from('external_printing_mappings').select('source,external_id,meta').eq('card_printing_id',printingId).eq('active',true).in('source',['tcgplayer','tcgplayer_market']).limit(101)),
  parent.identity_domain==='mtg_eng_paper_print'?Promise.resolve([]):checked(client.from('external_mappings').select('external_id').eq('card_print_id',parent.id).eq('source','tcgplayer').eq('active',true).limit(101)),
 ]);
 if(childMappings.length>100||parentMappings.length>100||childMappings.some(row=>{const id=productOf(row,printing.finish_key);return id!==null&&id!==productId;})||parentMappings.some(row=>String(row.external_id)!==String(productId)))return null;
 if(snapshot.mtg_printing_mapping_id){
  if(!exact.some(row=>String(row.id)===String(snapshot.mtg_printing_mapping_id)&&row.card_printing_id===printingId&&productOf(row,printing.finish_key)===productId))return null;
 }else if(!parents.some(row=>String(row.id)===String(snapshot.source_mapping_id)&&row.card_print_id===parent.id))return null;
 return{mapping_lane:'published_exact_printing',mapping_source:'tcgplayer_market_publication',mapping_id:record.provenance_id,product_id:productId,card_print_id:parent.id,card_printing_id:printingId,finish_key:printing.finish_key,identity_domain:parent.identity_domain,category_id:scope.category,group_id:products[0].group_id,language:scope.language};
}

// One Piece's governed import already bound the physical parent to a specific
// TCGPlayer product and repaired its child from the retained source/Master Index
// evidence. Admit that existing assertion only with all of its original pins.
export async function resolveSourceBoundOnePieceTargetV3(client,printingId){
 const [printing]=await checked(client.from('card_printings').select('id,card_print_id,finish_key,is_provisional,provenance_source,provenance_ref,card_prints!inner(id,identity_domain,variant_key,external_ids,number)').eq('id',printingId).limit(1));
 const parent=one(printing?.card_prints);
 if(!printing||parent?.identity_domain!=='one_piece_eng_print'||parent.id!==printing.card_print_id||printing.is_provisional!==false||!['normal','foil'].includes(printing.finish_key)||printing.provenance_source!=='ONE_PIECE_EXACT_PRODUCT_PRINTING_REPAIR_20260919'||!/^raw_imports:-?\d+\|master-index:[a-f\d]{64}$/.test(printing.provenance_ref??''))return null;
 const productMatch=String(parent.variant_key).match(/^tcgplayer_product_([1-9]\d*)$/),productId=Number(productMatch?.[1]);
 if(!productMatch||!Number.isSafeInteger(productId)||String(parent.external_ids?.tcgplayer)!==String(productId))return null;
 const [identities,reviews,mappings]=await Promise.all([
  checked(client.from('card_print_identity').select('card_print_id,identity_domain').eq('card_print_id',parent.id).eq('is_active',true).limit(2)),
  checked(client.from('card_printing_truth_reviews').select('public_visibility').eq('card_printing_id',printingId).eq('active',true).limit(101)),
  checked(client.from('external_mappings').select('id,card_print_id,source,external_id,meta').eq('card_print_id',parent.id).eq('source','tcgplayer').eq('active',true).limit(2)),
 ]);
 if(identities.length!==1||identities[0].identity_domain!==parent.identity_domain||reviews.length>100||reviews.some(row=>['hidden_pending_review','hidden_unsupported'].includes(row.public_visibility))||mappings.length!==1)return null;
 const mapping=mappings[0],meta=mapping.meta;
 if(String(mapping.external_id)!==String(productId)||meta?.mapping_authority!=='exact_durable_source_product_with_official_number_name'||meta?.promotion_plan_version!=='ONE_PIECE_COMPLETE_ENGLISH_NUMBERED_PARENT_PROMOTION_PLAN_V1'||!UUID.test(meta?.durable_staging_row_id??'')||!Number.isSafeInteger(meta.source_group_id)||meta.source_group_id<=0)return null;
 const [products,siblings,owners,exact,groups,childMappings]=await Promise.all([
  checked(client.from('tcgcsv_source_products').select('product_id,category_id,group_id,extended_data').eq('product_id',productId).eq('category_id',68).eq('source_active',true).eq('catalog_metadata_status','current').limit(2)),
  checked(client.from('card_printings').select('id').eq('card_print_id',parent.id).eq('finish_key',printing.finish_key).eq('is_provisional',false).limit(2)),
  checked(client.from('external_mappings').select('id,card_print_id').eq('source','tcgplayer').eq('external_id',String(productId)).eq('active',true).limit(2)),
  checked(client.from('external_printing_mappings').select('card_printing_id,source,external_id,meta').eq('active',true).in('source',['tcgplayer','tcgplayer_market']).in('external_id',[String(productId),`${productId}:${printing.finish_key}`]).limit(101)),
  checked(client.from('tcgcsv_source_groups').select('group_id').eq('group_id',meta.source_group_id).eq('category_id',68).eq('source_active',true).eq('catalog_metadata_status','current').limit(2)),
  checked(client.from('external_printing_mappings').select('source,external_id,meta').eq('card_printing_id',printingId).eq('active',true).in('source',['tcgplayer','tcgplayer_market']).limit(101)),
 ]);
 if(products.length!==1||products[0].group_id!==meta.source_group_id||groups.length!==1||siblings.length!==1||siblings[0].id!==printingId||owners.length!==1||owners[0].card_print_id!==parent.id||exact.length>100||childMappings.length>100)return null;
 if(childMappings.some(row=>{const match=String(row.external_id).match(row.source==='tcgplayer_market'?/^([1-9]\d*):(normal|foil|holo|reverse)$/:/^([1-9]\d*)$/);const finish=row.source==='tcgplayer_market'?match?.[2]:finishOf(row.meta?.source_subtype);return !match||!Number.isSafeInteger(Number(match[1]))||Number(match[1])!==productId||(finish&&finish!==printing.finish_key);}))return null;
 const fields=products[0].extended_data;
 const numbers=Array.isArray(fields)?fields.filter(field=>String(field.name).toLowerCase()==='number').map(field=>String(field.value).normalize('NFKC').trim().toUpperCase()):[];
 if(numbers.length!==1||numbers[0]!==String(parent.number??'').normalize('NFKC').trim().toUpperCase()||!numbers[0])return null;
 if(exact.some(row=>row.card_printing_id!==printingId&&(row.source==='tcgplayer_market'||!finishOf(row.meta?.source_subtype)||finishOf(row.meta?.source_subtype)===printing.finish_key)))return null;
 return{mapping_lane:'governed_one_piece_product_finish',mapping_source:'tcgplayer',mapping_id:String(mapping.id),product_id:productId,card_print_id:parent.id,card_printing_id:printingId,finish_key:printing.finish_key,identity_domain:parent.identity_domain,category_id:68,group_id:meta.source_group_id,language:'EN'};
}
