import registry from './governed_mtg_mapped_single_kind_registry_v1.json' with {type:'json'};
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';

const {fingerprint,...body}=registry;
if(fingerprint!=='7814d85c4ae550b47ae04e92ab74704338d777183cc6d554203da0533f7c2ede'||hash(body)!==fingerprint||registry.targets.length!==38)throw Error('MTG single-card kind registry drift');
const targets=new Map(registry.targets.map(t=>[t.product_id,t]));
if(targets.size!==38)throw Error('Duplicate MTG single-card product');
const text=value=>String(value??'').trim();
export const GOVERNED_MTG_SINGLE_KIND_REGISTRY_FINGERPRINT_V1=fingerprint;

export function isReviewedMtgMappedSingleKindV1(row={}) {
 const target=targets.get(Number(row.source_product_id));
 return Number(row.category_id)===1&&!!target&&row.finish_key===target.finish_key&&
  row.normalized_finish_key===target.finish_key&&text(row.source_subtype_name).toLowerCase()===target.source_subtype.toLowerCase();
}

// Product-kind evidence only. The existing V7 SQL lane and decision/snapshot
// guards independently require a current active exact product/finish mapping,
// visible nonprovisional child and one active English paper identity. Registry
// Scryfall facts were re-parsed from the original retained, hashed source bodies.
export function resolveGovernedMtgMappedSingleKindV1(row={}) {
 if(!isReviewedMtgMappedSingleKindV1(row))return null;
 const target=targets.get(Number(row.source_product_id));
 if(row.identity_domain!=='mtg_eng_paper_print'||row.mapping_method!=='exact_external_printing_mapping_v1'||
    !['source_mapping_count','card_print_mapping_count','card_printing_mapping_count','identity_domain_count','duplicate_product_row_count'].every(k=>Number(row[k])===1)||
    Number(row.mapping_confidence)!==1||Number(row.variant_assignment_confidence)!==1||
    row.mtg_printing_mapping_id!==target.mapping_id||
    ['cross_tcg_printing_mapping_id','cross_tcg_source_mapping_id','source_mapping_id','variant_assignment_id','edition_assignment_id','gym_edition_assignment_id'].some(k=>row[k]!=null)||
    row.variant_assignment_status!=='exact_child_finish'||row.derived_variant_assignment_status!=='exact_child_finish'||
    row.variant_assignment_version!=='MTG_EXACT_PRINTING_MAPPING_V1'||
    row.card_print_id!==target.parent_id||row.gv_id!==target.parent_gv_id||
    row.card_printing_id!==target.printing_id||row.printing_gv_id!==target.printing_gv_id||
    row.printing_is_provisional===true||row.source_product_active!==true||row.source_product_catalog_status!=='current'||
    Number(row.group_id)!==target.group_id||text(row.source_product_name)!==target.source_name)return null;
 const meta=row.source_mapping_meta;
 if(!meta||typeof meta!=='object'||Array.isArray(meta)||hash(meta)!==target.parent_mapping_metadata_fingerprint)return null;
 const fields=row.source_product_extended_data;if(!Array.isArray(fields))return null;
 const values=name=>fields.filter(f=>text(f?.name).toLowerCase()===name).map(f=>text(f.value));
 if(hash(values('number'))!==hash(target.source_number_fields)||hash(values('subtype'))!==hash(target.source_type_fields)||hash(values('rarity'))!==hash(target.source_rarity_fields))return null;
 return {version:'GOVERNED_MTG_MAPPED_SINGLE_KIND_EVIDENCE_V1',registry_fingerprint:fingerprint,
  source_product_id:target.product_id,source_group_id:target.group_id,card_print_id:target.parent_id,
  card_printing_id:target.printing_id,mtg_printing_mapping_id:target.mapping_id,finish_key:target.finish_key,
  parent_mapping_metadata_fingerprint:target.parent_mapping_metadata_fingerprint,
  scryfall_print_id:target.scryfall.id,source_body_sha256:target.scryfall.source_body_sha256,
  source_raw_import_id:target.scryfall.source_raw_import_id,collector_number:target.scryfall.collector_number,
  type_line:target.scryfall.type_line,layout:target.scryfall.layout,
  current_mapping_authority:'v_tcgplayer_market_qualification_candidates_v7'};
}
