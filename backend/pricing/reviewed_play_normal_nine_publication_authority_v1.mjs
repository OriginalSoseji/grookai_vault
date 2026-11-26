import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {REVIEWED_PLAY_NORMAL_NINE_REGISTRY_V1 as registry,REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1,
  reviewedPlayNormalNineMappingMetadataV1} from './reviewed_play_normal_nine_registry_v1.mjs';

const byProduct=new Map(registry.targets.map(t=>[t.product_id,t]));
const same=(a,b)=>a!==undefined&&b!==undefined&&hash({value:a})===hash({value:b});
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
export function isReviewedPlayNormalNineProductV1(row={}) {
  return Number(row.category_id)===3&&row.source_subtype_name==='Normal'&&byProduct.has(Number(row.source_product_id));
}
export function resolveReviewedPlayNormalNinePublicationAuthorityV1(row={}) {
  if(!isReviewedPlayNormalNineProductV1(row))return null;
  const target=byProduct.get(Number(row.source_product_id)),meta=row.source_mapping_meta;
  if(row.mapping_method!==REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1||String(row.source_mapping_id)!==target.mapping_id||
    !meta||meta.reviewed_invalidation?.reason_code)return null;
  if(Object.entries(reviewedPlayNormalNineMappingMetadataV1(target)).some(([k,v])=>!same(meta[k],v)))return null;
  for(const key of ['source_mapping_count','card_print_mapping_count','card_printing_mapping_count','identity_domain_count'])
    if(Number(row[key])!==1)return null;
  if(Number(row.group_id)!==22880||row.source_group_name!==registry.group_name||row.source_product_name!==target.source_product.name||
    row.source_product_active!==true||row.source_product_catalog_status!=='current'||row.has_printed_number_evidence!==true)return null;
  const numbers=Array.isArray(row.reviewed_source_extended_data)?row.reviewed_source_extended_data.filter(f=>f.name==='Number'):[];
  if(numbers.length!==1||numbers[0].value!==target.source_product.number)return null;
  const parentFields={card_print_id:'id',gv_id:'gv_id',set_id:'set_id',set_code:'set_code',canonical_name:'name',canonical_number:'number',
    identity_domain:'identity_domain',variant_key:'variant_key',reviewed_printed_identity_modifier:'printed_identity_modifier'};
  if(Object.entries(parentFields).some(([key,field])=>row[key]!==target.parent[field]))return null;
  if(row.reviewed_identity_id!==target.identity.id||row.card_printing_id!==target.printing.id||row.printing_gv_id!==target.printing.printing_gv_id||
    row.finish_key!=='normal'||row.normalized_finish_key!=='normal'||row.variant_assignment_status!=='exact_child_finish'||!uuid(row.variant_assignment_id))return null;
  if(row.printing_is_provisional!==false||row.printing_truth_verified!==true)return null;
  for(const [key,field]of Object.entries({reviewed_printing_provenance_source:'provenance_source',
    reviewed_printing_provenance_ref:'provenance_ref',reviewed_printing_created_by:'created_by'}))
    if(row[key]!==target.printing[field])return null;
  const reviews=row.reviewed_printing_truth_reviews;if(!Array.isArray(reviews)||reviews.length!==1)return null;
  for(const [key,value]of Object.entries(target.review)) {
    if(key==='reviewed_at') {if(!Number.isFinite(Date.parse(reviews[0][key]))||new Date(reviews[0][key]).toISOString()!==value)return null;}
    else if(!same(reviews[0][key],value))return null;
  }
  return {version:'REVIEWED_PLAY_NORMAL_NINE_PUBLICATION_AUTHORITY_V1',registry_fingerprint:registry.fingerprint,
    mapping_id:target.mapping_id,mapping_method:REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1,
    card_print_id:target.parent.id,card_printing_id:target.printing.id,source_product_id:target.product_id,
    source_group_id:22880,finish_key:'normal',review_id:target.review.id,identity_id:target.identity.id};
}
