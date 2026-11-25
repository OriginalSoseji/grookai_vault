// Source-supported ordinary metadata only. No pricing, finish or identity inference.
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?
  Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])):v;
export const tcgplayerPayloadHashV1=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
export const TCGPLAYER_RARITY_ADMISSION_V1=Object.freeze(['Common','Rare','Double Rare','Illustration Rare','Special Illustration Rare','Promo']);
const text=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const coordinate=v=>text(v).replace(/\d+/g,d=>String(Number(d)));
export function tcgplayerFieldV1(product,key){
  const fields=product.raw_payload?.extendedData?.filter(e=>e.name===key);
  return fields?.length===1&&typeof fields[0].value==='string'?fields[0].value.trim():null;
}
export function admitTcgplayerRarityV1({parent,product,group,mapping,groupSets,runs}){
  if(parent.identity_domain!=='pokemon_eng_standard'||!['','base'].includes(parent.variant_key??'')||parent.printed_identity_modifier?.trim())return {status:'exact_version_specific_evidence_required'};
  if(parent.rarity!=null&&String(parent.rarity).trim())return {status:'populated_value_preserved'};
  if(!mapping||mapping.source!=='tcgplayer'||!mapping.active||mapping.card_print_id!==parent.id||mapping.owners!==1||mapping.parent_mappings!==1||
    mapping.external_id!==String(product?.product_id))return {status:'exact_active_source_owner_required'};
  if(!product||!group||product.category_id!==3||group.category_id!==3||product.group_id!==group.group_id||
    !product.source_active||!group.source_active||product.catalog_metadata_status!=='current'||group.catalog_metadata_status!=='current')return {status:'current_pokemon_source_record_required'};
  if(![product,group].every(r=>runs.some(run=>run.id===r.last_seen_run_id&&run.status==='completed'&&run.sync_mode==='current_full_sync'&&run.failed_count===0)))return {status:'completed_source_sync_required'};
  if(product.payload_hash!==tcgplayerPayloadHashV1(product.raw_payload)||group.payload_hash!==tcgplayerPayloadHashV1(group.raw_payload)||
    !isDeepStrictEqual(product.extended_data,product.raw_payload.extendedData)||product.raw_payload.productId!==product.product_id||
    product.raw_payload.groupId!==group.group_id||product.raw_payload.categoryId!==3||product.raw_payload.name!==product.name||
    group.raw_payload.groupId!==group.group_id||group.raw_payload.categoryId!==3||group.raw_payload.name!==group.name)return {status:'source_payload_or_dimension_mismatch'};
  if(groupSets?.group_id!==group.group_id||groupSets.set_count!==1||groupSets.set_codes?.length!==1||groupSets.set_codes[0]!==parent.set_code)return {status:'source_group_set_binding_requires_review'};
  const number=tcgplayerFieldV1(product,'Number');
  if(!number||!parent.number||coordinate(number)!==coordinate(parent.number))return {status:'printed_coordinate_mismatch'};
  let name=product.name;
  const suffix=name.match(/^(.*) - ([a-z0-9]+(?:\/[a-z0-9]+)?)$/i);
  if(suffix&&coordinate(suffix[2])===coordinate(number))name=suffix[1];
  if(text(name)!==text(parent.name))return {status:'source_title_or_physical_feature_requires_review'};
  const rarity=tcgplayerFieldV1(product,'Rarity');
  if(!TCGPLAYER_RARITY_ADMISSION_V1.includes(rarity))return {status:'rarity_vocabulary_requires_review',source_rarity:rarity};
  return {status:'exact_source_null_rarity_fill',value:rarity,source_number:number,
    rule:'exact_current_tcgplayer_product_and_unique_group_set_v1'};
}
