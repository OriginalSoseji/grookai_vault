// Read-only SWSH301 record review; representative image status is never promoted.
import crypto from 'node:crypto';import {isDeepStrictEqual} from 'node:util';
import {tcgplayerFieldV1,tcgplayerPayloadHashV1} from '../../../backend/pokemon/tcgplayer_catalog_rarity_v1.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),ID='af831a08-6e93-4e7a-8e8b-1b02d38c9ff1';
export function evaluateSwsh301Candidate(snapshot,evidence){
 const p=snapshot.parents?.[0],s=snapshot.sets?.[0],identity=snapshot.identities?.[0],product=snapshot.products?.[0]?.row,group=snapshot.groups?.[0]?.row;
 if(snapshot.project_ref!=='ycdxbpibncqcchqiihfz'||snapshot.parents?.length!==1||p.id!==ID||p.gv_id!=='GV-PK-PR-SW-SWSH301'||p.name!=='Lugia V'||
  p.number!=='SWSH301'||p.set_code!=='swshp'||p.rarity!=='None'||(p.variant_key??'')!==''||p.identity_domain!=='pokemon_eng_standard'||
  p.artist!=='PLANETA Mochizuki'||p.image_status!=='representative_shared'||
  p.image_path!=='warehouse-derived/image-truth-v1/img02a-missing-display-representative/swshp/e973055a-df3e-4bcb-bdc4-ae7a726e6178/755e1a00a0516c9f9c95ff9f.jpg')return {status:'parent_mismatch'};
 if(snapshot.sets.length!==1||s.id!==p.set_id||s.code!=='swshp'||s.game!=='pokemon'||s.printed_total!==307||snapshot.identities.length!==1||
  identity.card_print_id!==ID||!identity.is_active||identity.printed_number!=='SWSH301'||identity.identity_domain!=='pokemon_eng_standard'||
  identity.set_code_identity!=='swshp'||identity.normalized_printed_name!=='lugia v'||identity.identity_payload?.printed_total!==307||
  identity.identity_key_hash!=='555f3983d65462ef118cd38560972afec9cf86c59a5243202c4526f4c07d4485')return {status:'identity_mismatch'};
 const traitIds=snapshot.traits.filter(t=>t.card_print_id===ID).map(t=>t.id).sort((a,b)=>a-b);
 if(!isDeepStrictEqual(traitIds,[61173,61174,61175,61176,61177,61178])||!snapshot.traits.some(t=>t.id===61173&&t.source==='tcgdex'&&t.trait_type==='pokemon:stats'&&t.rarity==='None'))return {status:'trait_mismatch'};
 for(const [source,external] of [['tcgdex','swshp-SWSH301'],['tcgplayer','505996']]){const m=snapshot.mappings.filter(x=>x.active&&x.card_print_id===ID&&x.source===source);
  if(m.length!==1||m[0].external_id!==external||m[0].owners!==1||m[0].parent_mappings!==1)return {status:'mapping_mismatch'};}
 if(snapshot.products.length!==1||snapshot.groups.length!==1||product.product_id!==505996||product.name!=='Lugia V - SWSH301'||product.group_id!==2545||product.category_id!==3||
  !product.source_active||product.catalog_metadata_status!=='current'||product.payload_hash!==tcgplayerPayloadHashV1(product.raw_payload)||
  !isDeepStrictEqual(product.extended_data,product.raw_payload?.extendedData)||product.raw_payload?.productId!==505996||product.raw_payload?.name!==product.name||
  product.raw_payload?.groupId!==2545||product.raw_payload?.categoryId!==3||product.image_url!=='https://tcgplayer-cdn.tcgplayer.com/product/505996_200w.jpg'||
  tcgplayerFieldV1(product,'Number')!=='SWSH301'||tcgplayerFieldV1(product,'Rarity')!=='Promo'||group.group_id!==2545||group.category_id!==3||
  group.name!=='SWSH: Sword & Shield Promo Cards'||!group.source_active||group.catalog_metadata_status!=='current'||group.payload_hash!==tcgplayerPayloadHashV1(group.raw_payload)||
  group.raw_payload?.groupId!==2545||group.raw_payload?.categoryId!==3||group.raw_payload?.name!==group.name||snapshot.groupSets.length!==1||snapshot.groupSets[0].set_count!==1||
  !isDeepStrictEqual(snapshot.groupSets[0].set_codes,['swshp']))return {status:'product_mismatch'};
 if(![product,group].every(item=>snapshot.runs.some(r=>r.id===item.last_seen_run_id&&r.status==='completed'&&r.sync_mode==='current_full_sync'&&r.failed_count===0)))return {status:'source_sync_incomplete'};
 if(hash(evidence.representative)!=='755e1a00a0516c9f9c95ff9f06626c180a1eddb874466cdab31e12e150ab5abb'||
  evidence.representativeReceipt?.image_status!=='representative_shared'||evidence.representativeReceipt.image_path!==p.image_path||evidence.representativeReceipt.sha256!==hash(evidence.representative)||
  evidence.productReceipt?.url!==product.image_url||evidence.productReceipt.status!==200||evidence.productReceipt.sha256!==hash(evidence.product)||
  hash(evidence.product)!=='77f432097c42af65a0a7d8e46b7dfae3bbb8c3bf6ab586ba09d7375c27c4cced')return {status:'image_mismatch'};
 const articleHash='4ad2712b6d8aed1870164877d2e8d0c369f36b07ba693a3f1a707202aa9ed45a';
 if(evidence.articleReceipt?.url!=='https://bulbapedia.bulbagarden.net/wiki/Lugia_V_%28Silver_Tempest_138%29'||evidence.articleReceipt.status!==200||
  evidence.articleReceipt.sha256!==articleHash||hash(evidence.article)!==articleHash||
  !['SWSH301','SWSH Black Star Promos','PLANETA Mochizuki'].every(t=>evidence.article.toString('utf8').includes(t)))return {status:'checklist_mismatch'};
 return {status:'review_candidate_only',id:ID,gv_id:p.gv_id,before:'None',proposed:'Promo',identity_key_hash:identity.identity_key_hash,
  protected_trait_ids:traitIds,product_id:505996,retained_image_status:'representative_shared'};
}
