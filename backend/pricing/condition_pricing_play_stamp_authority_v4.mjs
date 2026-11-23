import {hash} from './tcgtracking_condition_reference_v1.mjs';
import {PLAY_STAMP_NORMAL_CONDITION_REGISTRY_V4 as registry} from './play_stamp_normal_condition_registry_v4.mjs';

const {fingerprint,...body}=registry;
if(hash(body)!==fingerprint||registry.targets.length!==43||registry.master_program!=='2f37fcdc2494d9849afcb8a8f9081a296afe9b7032b36f81589e189bf8ffdd4e')throw Error('PLAY_STAMP_REFERENCE_REGISTRY_INVALID');
const targets=new Map(registry.targets.map(t=>[t.printing.id,t]));
const one=v=>Array.isArray(v)?v.length===1?v[0]:null:v;
async function checked(query){const {data,error}=await query.abortSignal(AbortSignal.timeout(15000));if(error)throw Error('CONDITION_PRICE_PLAY_STAMP_READ_FAILED');return data??[];}

// A reference-only crosswalk for the exact43 reviewed Normal facts. It does not
// insert a TCGplayer mapping or make an unpublished Market price available.
// The approved printing transaction must actually exist before this can resolve.
export async function resolveSourceBoundPlayStampNormalTargetV4(client,cardPrintingId){
 const expected=targets.get(cardPrintingId);if(!expected)return null;
 const rows=await checked(client.from('card_printings').select('id,card_print_id,finish_key,printing_gv_id,is_provisional,provenance_source,provenance_ref,created_by,card_prints!inner(id,set_id,set_code,gv_id,name,number,identity_domain,variant_key,printed_identity_modifier)').eq('id',cardPrintingId).limit(2));
 if(rows.length!==1)return null;const printing=rows[0],parent=one(printing.card_prints);
 if(!parent||Object.entries(expected.parent).some(([k,v])=>parent[k]!==v)||Object.entries(expected.printing).some(([k,v])=>printing[k]!==v))return null;
 const [reviews,mappings,identities,products,siblings,ownExact]=await Promise.all([
  checked(client.from('card_printing_truth_reviews').select('id,review_status,public_visibility,confidence,reviewed_by,evidence').eq('card_printing_id',cardPrintingId).eq('active',true).limit(101)),
  checked(client.from('external_mappings').select('id,card_print_id,source,external_id,meta,active').eq('card_print_id',parent.id).in('source',['justtcg','tcgplayer']).limit(101)),
  checked(client.from('card_print_identity').select('id,card_print_id').eq('card_print_id',parent.id).eq('is_active',true).limit(2)),
  checked(client.from('tcgcsv_source_products').select('product_id,category_id,group_id,name,extended_data,source_active,catalog_metadata_status').eq('product_id',expected.source_product.product_id).limit(2)),
  checked(client.from('card_printings').select('id').eq('card_print_id',parent.id).eq('finish_key','normal').eq('is_provisional',false).limit(2)),
  checked(client.from('external_printing_mappings').select('id').eq('card_printing_id',cardPrintingId).in('source',['tcgplayer','tcgplayer_market']).limit(1)),
 ]);
 if(!reviews.length||reviews.length>100||reviews.some(r=>r.review_status!=='verified'||r.public_visibility!=='visible'))return null;
 const approved=reviews.find(r=>r.id===expected.review.id);if(!approved||approved.confidence!=='high'||approved.reviewed_by!=='PLAY_POKEMON_STAMP_NORMAL_EXECUTION_V1'||Object.entries(expected.review).some(([k,v])=>k!=='id'&&approved.evidence?.[k]!==v))return null;
 if(identities.length!==1||identities[0].id!==expected.identity_id||identities[0].card_print_id!==parent.id||siblings.length!==1||siblings[0].id!==cardPrintingId||ownExact.length)return null;
 // If a persistent TCGplayer assertion exists, the earlier V1/V3 readers must
 // decide it. This path cannot bypass an inactive/conflicting exact resolution.
 if(mappings.length!==1)return null;const mapping=mappings[0],source=expected.source_mapping;
 if(mapping.active!==true||mapping.card_print_id!==parent.id||mapping.source!=='justtcg'||String(mapping.id)!==source.id||mapping.external_id!==source.external_id||mapping.meta?.source_candidate_id!==source.source_candidate_id||mapping.meta?.source_family!==source.source_family||mapping.meta?.effective_set_code!==source.effective_set_code||mapping.meta?.variant_key!=='play_pokemon_stamp')return null;
 if(products.length!==1)return null;const product=products[0],wanted=expected.source_product;
 if(product.product_id!==wanted.product_id||product.category_id!==3||product.group_id!==22880||product.source_active!==true||product.catalog_metadata_status!=='current'||product.name!==wanted.name)return null;
 const numbers=Array.isArray(product.extended_data)?product.extended_data.filter(f=>f.name==='Number').map(f=>f.value):[];if(numbers.length!==1||numbers[0]!==wanted.number)return null;
 const productId=String(wanted.product_id),[sourceOwners,productOwners,printingOwners]=await Promise.all([
  checked(client.from('external_mappings').select('id,card_print_id').eq('source','justtcg').eq('external_id',source.external_id).eq('active',true).limit(2)),
  checked(client.from('external_mappings').select('card_print_id').eq('source','tcgplayer').eq('external_id',productId).limit(1)),
  checked(client.from('external_printing_mappings').select('card_printing_id').in('source',['tcgplayer','tcgplayer_market']).in('external_id',[productId,...['normal','holo','reverse','foil'].map(f=>productId+':'+f)]).limit(1)),
 ]);
 if(sourceOwners.length!==1||sourceOwners[0].card_print_id!==parent.id||String(sourceOwners[0].id)!==source.id||productOwners.length||printingOwners.length)return null;
 return{mapping_lane:'reviewed_play_stamp_normal_reference_v4',mapping_source:'reviewed_read_only_crosswalk_v4',mapping_id:fingerprint+':'+cardPrintingId,product_id:wanted.product_id,category_id:3,group_id:22880,card_print_id:parent.id,card_printing_id:cardPrintingId,finish_key:'normal',identity_domain:'pokemon_eng_standard',language:'EN'};
}
