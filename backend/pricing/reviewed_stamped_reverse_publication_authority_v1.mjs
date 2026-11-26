import{printingManifestHash as hash}from'../catalog/printing_completeness_gate_v1.mjs';
import{REVIEWED_STAMPED_REVERSE_REGISTRY_V1 as registry,REVIEWED_STAMPED_REVERSE_MARKET_LINKS_V1,
 reviewedStampedReverseMappingMetadataV1 as metadata}from'./reviewed_stamped_reverse_registry_v1.mjs';
const byProduct=new Map(registry.targets.filter(t=>t.source_product).map(t=>[t.source_product.product_id,t]));
const same=(a,b)=>a!==undefined&&b!==undefined&&hash({value:a})===hash({value:b});
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
export function isReviewedStampedReverseProductV1(row={}){
 return Number(row.category_id)===3&&row.source_subtype_name==='Reverse Holofoil'&&byProduct.has(Number(row.source_product_id));
}
export function resolveReviewedStampedReversePublicationAuthorityV1(row={}){
 if(!isReviewedStampedReverseProductV1(row))return null;
 const t=byProduct.get(Number(row.source_product_id)),p=t.source_product,r=t.retained_projection,meta=row.source_mapping_meta;
 if(row.mapping_method!==REVIEWED_STAMPED_REVERSE_MARKET_LINKS_V1||String(row.source_mapping_id)!==r.mapping_id||!meta||meta.reviewed_invalidation?.reason_code)return null;
 const expected=metadata(t,{id:r.identity_id,card_print_id:t.parent.id,is_active:true,identity_domain:t.parent.identity_domain});
 if(Object.entries(expected).some(([k,v])=>!same(meta[k],v)))return null;
 for(const k of['source_mapping_count','card_print_mapping_count','card_printing_mapping_count','identity_domain_count'])if(Number(row[k])!==1)return null;
 if(Number(row.group_id)!==p.group_id||row.source_product_name!==p.name||row.source_product_active!==true||
  row.source_product_catalog_status!=='current'||row.has_printed_number_evidence!==true)return null;
 const numbers=Array.isArray(row.reviewed_source_extended_data)?row.reviewed_source_extended_data.filter(f=>f.name==='Number'):[];
 if(numbers.length!==1||numbers[0].value!==p.number)return null;
 for(const[k,v]of Object.entries({card_print_id:t.parent.id,gv_id:t.parent.gv_id,set_id:t.parent.set_id,set_code:t.set_code,
  canonical_name:t.parent.name,canonical_number:t.parent.printed_coordinate,identity_domain:t.parent.identity_domain,
  variant_key:t.parent.variant_key,reviewed_printed_identity_modifier:t.parent.printed_identity_modifier,
  reviewed_identity_id:r.identity_id,card_printing_id:t.printing.id,printing_gv_id:t.printing.printing_gv_id,
  finish_key:'reverse',normalized_finish_key:'reverse',variant_assignment_status:'exact_child_finish',printing_is_provisional:false,
  printing_truth_verified:true,reviewed_printing_provenance_source:r.provenance_source,
  reviewed_printing_provenance_ref:r.provenance_ref,reviewed_printing_created_by:r.created_by}))if(!same(row[k],v))return null;
 if(!uuid(row.variant_assignment_id))return null;
 const reviews=row.reviewed_printing_truth_reviews;if(!Array.isArray(reviews)||reviews.length!==1)return null;
 for(const[k,v]of Object.entries(t.review)){
  if(k==='reviewed_at'){if(!Number.isFinite(Date.parse(reviews[0][k]))||new Date(reviews[0][k]).toISOString()!==v)return null;}
  else if(!same(reviews[0][k],v))return null;
 }
 return{version:'REVIEWED_STAMPED_REVERSE_PUBLICATION_AUTHORITY_V1',registry_fingerprint:registry.fingerprint,
  mapping_id:r.mapping_id,mapping_method:REVIEWED_STAMPED_REVERSE_MARKET_LINKS_V1,card_print_id:t.parent.id,
  card_printing_id:t.printing.id,source_product_id:p.product_id,source_group_id:p.group_id,finish_key:'reverse',
  review_id:t.review.id,identity_id:r.identity_id};
}
