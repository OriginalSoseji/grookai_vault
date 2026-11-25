import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {PLAY_STAMP_NORMAL_CONDITION_REGISTRY_V4 as original} from './play_stamp_normal_condition_registry_v4.mjs';
import {PLAY_STAMP_NORMAL_RECOVERY_MAPPING_REGISTRY_V2 as recovered} from './play_stamp_normal_recovery_mapping_registry_v2.mjs';
import {PLAY_STAMP_SERIES5_NORMAL_MAPPING_REGISTRY_V1 as series5} from './play_stamp_series5_normal_mapping_registry_v1.mjs';

export const PLAY_STAMP_NORMAL_PUBLICATION_AUTHORITY_V1='PLAY_STAMP_NORMAL_PUBLICATION_AUTHORITY_V1';
const profiles=[
 {registry:original,registryPin:'d8847f8c34c8227045259f2752a7a3d118b6d38034f5809616b6cb9c0f392c2d',method:'PLAY_STAMP_MARKET_MAPPING_V1',plan:'ecdbb0571dd32118a45357228822adfadca19d573bdf73e01306fc416bff3783'},
 {registry:recovered,registryPin:'ac646421df3367321d2a3330424ea684138960e042517a66422082b0120d45ae',method:'PLAY_STAMP_NORMAL_RECOVERY_MARKET_MAPPING_V2',plan:'711cb06754c4f51adc4e9ef230d3def2ca708b79e79921a2b73b5c1b5f8782a8'},
 {registry:series5,registryPin:'c389c34a4d1e6d17d97bc39d008630609cf573211be00e8543d11ba306183fcf',method:'PLAY_STAMP_SERIES5_NORMAL_MARKET_MAPPING_V1',plan:'56d4f8c0740477111871884b45181feeba2228ff60c3704f24e586abcbbb13e5'},
];
const entries=[];
for(const p of profiles){const{fingerprint,...body}=p.registry;if(fingerprint!==p.registryPin||hash(body)!==fingerprint)throw Error('Reviewed Play Normal identity registry changed');for(const target of p.registry.targets)entries.push({profile:p,target});}
if(entries.length!==75||new Set(entries.map(e=>e.target.source_product.product_id)).size!==75||new Set(entries.map(e=>e.target.printing.id)).size!==75)throw Error('Reviewed Play Normal scope changed');
export const PLAY_STAMP_NORMAL_PRODUCT_IDS_V1=Object.freeze(entries.map(e=>e.target.source_product.product_id).sort((a,b)=>a-b));
const byProduct=new Map(entries.map(e=>[e.target.source_product.product_id,e]));
const same=(a,b)=>a!==undefined&&b!==undefined&&hash({value:a})===hash({value:b});
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(v);

export function isReviewedPlayStampNormalProductV1(row={}){return Number(row.category_id)===3&&row.source_subtype_name==='Normal'&&byProduct.has(Number(row.source_product_id));}

// The registries specify identities only. Admission also requires the current
// separately approved Market link and its complete current physical truth chain.
export function resolvePlayStampNormalPublicationAuthorityV1(row={}){
 if(!isReviewedPlayStampNormalProductV1(row))return null;
 const {profile:p,target:t}=byProduct.get(Number(row.source_product_id)),meta=row.source_mapping_meta;
 if(!meta||typeof meta!=='object'||row.mapping_method!==p.method||meta.reviewed_invalidation?.reason_code)return null;
 const mappingId=-(1000000000000+Number.parseInt(hash({version:p.method,parent:t.parent.id,product:t.source_product.product_id}).slice(0,12),16));
 if(!Number.isSafeInteger(mappingId)||String(row.source_mapping_id)!==String(mappingId))return null;
 const fields={mapping_method:p.method,derived_from:'reviewed_justtcg_explicit_tcgplayer_id',master_program:p.registry.master_program,canonical_plan_fingerprint:p.plan,reference_registry_fingerprint:p.registryPin,approved_printing_id:t.printing.id,approved_finish_key:'normal',justtcg_mapping_id:t.source_mapping.id,source_candidate_id:t.source_mapping.source_candidate_id,justtcg_raw_import_id:t.source_review.justtcg_raw_import_id,source_identity_sha256:t.source_review.justtcg_identity_sha256,source_group_id:22880};
 if(Object.entries(fields).some(([key,value])=>!same(meta[key],value)))return null;
 if(Number(row.group_id)!==22880||row.source_group_name!=='Prize Pack Series Cards'||row.source_product_name!==t.source_product.name||row.source_product_active!==true||row.source_product_catalog_status!=='current'||row.has_printed_number_evidence!==true)return null;
 for(const key of ['source_mapping_count','card_print_mapping_count','card_printing_mapping_count','identity_domain_count'])if(Number(row[key])!==1)return null;
 if(row.card_print_id!==t.parent.id||row.gv_id!==t.parent.gv_id||row.card_printing_id!==t.printing.id||row.printing_gv_id!==t.printing.printing_gv_id||row.identity_domain!=='pokemon_eng_standard'||row.variant_key!=='play_pokemon_stamp'||row.finish_key!=='normal'||row.normalized_finish_key!=='normal'||row.variant_assignment_status!=='exact_child_finish'||!uuid(row.variant_assignment_id))return null;
 if(row.set_id!==t.parent.set_id||row.set_code!==t.parent.set_code||row.canonical_name!==t.parent.name||String(row.canonical_number)!==String(t.parent.number)||!same(row.reviewed_printed_identity_modifier,t.parent.printed_identity_modifier))return null;
 if(row.printing_is_provisional!==false||row.printing_truth_verified!==true||row.reviewed_identity_id!==t.identity_id)return null;
 if(row.reviewed_printing_provenance_source!==t.printing.provenance_source||row.reviewed_printing_provenance_ref!==t.printing.provenance_ref||row.reviewed_printing_created_by!==t.printing.created_by)return null;
 const numberFields=Array.isArray(row.reviewed_source_extended_data)?row.reviewed_source_extended_data.filter(f=>f.name==='Number'):[];
 if(numberFields.length!==1||numberFields[0].value!==t.source_product.number||numberFields[0].value.split('/')[0]!==String(t.parent.number))return null;
 const reviews=row.reviewed_printing_truth_reviews;if(!Array.isArray(reviews)||reviews.length!==1)return null;const review=reviews[0];
 if(review.id!==t.review.id||review.card_printing_id!==t.printing.id||review.active!==true||review.review_status!=='verified'||review.public_visibility!=='visible'||review.confidence!=='high'||review.reviewed_by!==t.printing.provenance_source||review.source_report_path!==t.printing.provenance_ref||!same(review.expected_finish_keys,['normal']))return null;
 if(Object.entries(t.review).some(([key,value])=>key!=='id'&&!same(review.evidence?.[key],value)))return null;
 return{version:PLAY_STAMP_NORMAL_PUBLICATION_AUTHORITY_V1,registry_fingerprint:p.registryPin,master_program:p.registry.master_program,canonical_plan_fingerprint:p.plan,mapping_method:p.method,mapping_id:String(mappingId),card_print_id:t.parent.id,card_printing_id:t.printing.id,source_product_id:t.source_product.product_id,source_group_id:22880,finish_key:'normal',review_id:t.review.id};
}
