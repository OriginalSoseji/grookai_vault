import registry from './governed_japanese_numbered_single_registry_v1.json' with {type:'json'};
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';

const {fingerprint,...body}=registry;
if(fingerprint!=='631dff3a2cf4b89e7df1b60ca23d18d4d78074790c9896ba726753c1be95e3c4'||hash(body)!==fingerprint||registry.targets.length!==4)throw Error('Japanese single-card registry drift');
const targets=new Map(registry.targets.map(t=>[t.product_id,t]));
const text=value=>String(value??'').trim();
export const GOVERNED_JAPANESE_SINGLE_REGISTRY_FINGERPRINT_V1=fingerprint;
export function isReviewedJapaneseNumberedSingleV1(row={}) {
 return Number(row.category_id)===85&&targets.has(Number(row.source_product_id))&&
  row.finish_key==='normal'&&row.normalized_finish_key==='normal'&&text(row.source_subtype_name).toLowerCase()==='normal';
}

// This is product-kind evidence, not mapping or publication authority. The
// current V2 SQL lane independently requires active exact mappings, one identity,
// visible nonprovisional printings, source group/category and no mapping conflict.
export function resolveGovernedJapaneseNumberedSingleV1(row={}) {
 if(!isReviewedJapaneseNumberedSingleV1(row))return null;
 const target=targets.get(Number(row.source_product_id));
 if(row.identity_domain!=='pokemon_jpn'||row.mapping_method!=='governed_cross_tcg_exact_finish_v2'||
    !['source_mapping_count','card_print_mapping_count','card_printing_mapping_count','identity_domain_count','duplicate_product_row_count'].every(k=>Number(row[k])===1)||
    Number(row.mapping_confidence)!==1||Number(row.variant_assignment_confidence)!==1||
    row.cross_tcg_printing_mapping_id!==target.mapping_id||
    ['cross_tcg_source_mapping_id','source_mapping_id','variant_assignment_id','edition_assignment_id','gym_edition_assignment_id','mtg_printing_mapping_id'].some(k=>row[k]!=null)||
    row.variant_assignment_status!=='exact_child_finish'||row.variant_assignment_version!=='CROSS_TCG_EXACT_FINISH_V2'||
    row.card_print_id!==target.parent_id||row.gv_id!==target.parent_gv_id||
    row.card_printing_id!==target.printing_id||row.printing_gv_id!==target.printing_gv_id||
    row.finish_key!=='normal'||row.normalized_finish_key!=='normal'||text(row.source_subtype_name).toLowerCase()!=='normal'||
    row.printing_is_provisional===true||row.source_product_active!==true||row.source_product_catalog_status!=='current'||
    Number(row.group_id)!==target.group_id||text(row.source_product_name)!==target.source_name)return null;
 const meta=row.source_mapping_meta;
 if(!meta||typeof meta!=='object'||Array.isArray(meta)||hash(meta)!==target.mapping_metadata_fingerprint)return null;
 const fields=row.source_product_extended_data;
 if(!Array.isArray(fields))return null;
 const values=name=>fields.filter(f=>text(f?.name).toLowerCase()===name).map(f=>text(f.value));
 const numbers=values('number'),types=values('cardtype');
 if(numbers.length!==1||types.length!==1||numbers[0]!==target.printed_number||types[0]!==target.card_type)return null;
 return {version:'GOVERNED_JAPANESE_NUMBERED_SINGLE_EVIDENCE_V1',registry_fingerprint:fingerprint,
  source_product_id:target.product_id,source_group_id:target.group_id,printed_number:target.printed_number,card_type:target.card_type,
  card_print_id:target.parent_id,card_printing_id:target.printing_id,source_mapping_id:target.mapping_id,
  mapping_metadata_fingerprint:target.mapping_metadata_fingerprint,manifest_fingerprint:meta.manifest_fingerprint,
  truth_review_id:meta.truth_review_id,finish_key:'normal',current_mapping_authority:'v_cross_tcg_market_targets_v2'};
}
