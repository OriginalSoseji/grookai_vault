// Exact Yellow A source/visual review only; no mapping or canonical writer.
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {tcgplayerFieldV1,tcgplayerPayloadHashV1} from '../../../backend/pokemon/tcgplayer_catalog_rarity_v1.mjs';
const exact=Object.freeze({
  XY200a:{id:'2928d70e-b3ff-4c8e-914f-a361cff27396',gv:'GV-PK-PR-XY-XY200A',name:'M Sharpedo-EX',identity:'9134b71216655aa603286da032296e9a26234758fcb48fe7d52df5363a28f7a8',trait:39444,api:'1790',dex:'14930',product:148346,title:'M Sharpedo EX - XY200a',catalog:'bd22f824398effd1a5228992b580c6779377c24670e217eecd0d9639c871cc8d',productImage:'aa84e2206808c488bf3e274acc87bfc41bd18eb9e5b38a954c090d6e6bab53b1',article:'e7a8b250bfe72c16277ff2e322e01aef887dc1cc04fd930c6ba7a4519b749c65'},
  XY67a:{id:'46b9dcd9-3f90-4770-890e-6817eed4d388',gv:'GV-PK-PR-XY-XY67A',name:'Jirachi',identity:'7608ef3121158a7d7181a5c6b3da72f77f7b6901b967c619814d10ff52446cec',trait:39503,api:'1653',dex:'14989',product:148343,title:'Jirachi - XY67a',catalog:'aa3b4cbece46bc50935b0a95dbaa686cbe0ff18f0dd5b4117c5825dd98b9c1d7',productImage:'ea986abca7394bcd2b23e4da0b0ac1ce9fa67994a737d7ae8afff325d52eb2ac',article:'473787aba9ddf6907ac028715654f0aa9d9be49ba416b2c981ee658a0e1e9d44'}
});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function evaluateXySuffixCandidate(snapshot,number,evidence){
 const e=exact[number],p=snapshot.parents?.find(p=>p.number===number),s=snapshot.sets?.find(s=>s.id===p?.set_id);
 if(!e||snapshot.project_ref!=='ycdxbpibncqcchqiihfz'||snapshot.parents.length!==2||p?.id!==e.id||p.gv_id!==e.gv||p.name!==e.name||
  p.set_code!=='xyp'||p.rarity!=='Common'||p.variant_key!=='XYa'||p.identity_domain!=='pokemon_eng_standard'||p.image_status!=='exact'||
  !p.image_path?.endsWith(`/${e.catalog.slice(0,24)}.webp`))return {status:'parent_mismatch'};
 const identities=snapshot.identities.filter(i=>i.card_print_id===e.id&&i.is_active),traits=snapshot.traits.filter(t=>t.card_print_id===e.id);
 if(!s||s.code!=='xyp'||s.game!=='pokemon'||s.printed_total!==211||identities.length!==1||identities[0].printed_number!==number||
  identities[0].identity_domain!=='pokemon_eng_standard'||identities[0].set_code_identity!=='xyp'||identities[0].identity_key_hash!==e.identity||
  identities[0].identity_payload?.printed_total!==211||identities[0].identity_payload?.variant_key_current!=='XYa'||
  identities[0].normalized_printed_name!==e.name.toLowerCase())return {status:'identity_mismatch'};
 if(traits.length!==1||traits[0].id!==e.trait||traits[0].source!=='tcgdex'||traits[0].trait_type!=='pokemon:stats'||traits[0].rarity!=='Common')return {status:'trait_mismatch'};
 const own=snapshot.mappings.filter(m=>m.card_print_id===e.id&&m.active);
 for(const source of ['pokemonapi','tcgdex']){const m=own.filter(x=>x.source===source);if(m.length!==1||m[0].external_id!==`xyp-${number}`||m[0].owners!==1||m[0].parent_mappings!==1)return {status:'mapping_mismatch'};}
 if(own.some(m=>m.source==='tcgplayer'))return {status:'unexpected_product_mapping'};
 const raw=snapshot.raw.filter(r=>r.payload?._external_id===`xyp-${number}`),api=raw.filter(r=>r.source==='pokemonapi'),dex=raw.filter(r=>r.source==='tcgdex');
 if(api.length!==1||dex.length!==1||api[0].id!==e.api||dex[0].id!==e.dex||api[0].payload.id!==`xyp-${number}`||api[0].payload.name!==e.name||
  api[0].payload.number!==number||api[0].payload.set?.id!=='xyp'||api[0].payload.rarity!=='Promo'||dex[0].payload.card?.name!==e.name||
  dex[0].payload.card?.localId!==number||dex[0].payload.card?.rarity!=='Common')return {status:'raw_mismatch'};
 const candidate=snapshot.products.filter(x=>x.row.product_id===e.product),product=candidate[0]?.row,group=snapshot.groups?.[0]?.row;
 if(snapshot.products.length!==2||candidate.length!==1||candidate[0].active_mappings.length!==0||product.name!==e.title||product.group_id!==1938||product.category_id!==3||
  !product.source_active||product.catalog_metadata_status!=='current'||product.payload_hash!==tcgplayerPayloadHashV1(product.raw_payload)||
  !isDeepStrictEqual(product.extended_data,product.raw_payload?.extendedData)||product.raw_payload?.productId!==e.product||product.raw_payload?.name!==e.title||
  product.raw_payload?.groupId!==1938||product.raw_payload?.categoryId!==3||product.image_url!==`https://tcgplayer-cdn.tcgplayer.com/product/${e.product}_200w.jpg`||
  tcgplayerFieldV1(product,'Number')!==number||tcgplayerFieldV1(product,'Rarity')!=='Promo'||snapshot.groups.length!==1||group.group_id!==1938||
  group.name!=='Alternate Art Promos'||group.category_id!==3||!group.source_active||group.catalog_metadata_status!=='current'||group.payload_hash!==tcgplayerPayloadHashV1(group.raw_payload)||
  group.raw_payload?.groupId!==1938||group.raw_payload?.categoryId!==3||group.raw_payload?.name!==group.name)return {status:'product_mismatch'};
 if(![product,group].every(item=>snapshot.runs.some(r=>r.id===item.last_seen_run_id&&r.status==='completed'&&r.sync_mode==='current_full_sync'&&r.failed_count===0)))return {status:'source_sync_incomplete'};
 if(hash(evidence.catalog)!==e.catalog||hash(evidence.product)!==e.productImage)return {status:'image_mismatch'};
 const articleUrl=number==='XY200a'?'https://bulbapedia.bulbagarden.net/wiki/M_Sharpedo-EX_%28XY_Promo_200a%29':'https://bulbapedia.bulbagarden.net/wiki/Jirachi_%28XY_Promo_67a%29';
 if(evidence.articleReceipt?.url!==articleUrl||evidence.articleReceipt?.status!==200||evidence.articleReceipt.sha256!==e.article||hash(evidence.article)!==e.article||
  !evidence.article.toString('utf8').includes(number)||!evidence.article.toString('utf8').includes('Yellow A Alternate cards'))return {status:'checklist_mismatch'};
 return {status:'review_candidate_only',id:e.id,gv_id:e.gv,number,before:'Common',proposed:'Promo',identity_key_hash:e.identity,
  protected_trait_id:e.trait,pokemonapi_raw_id:e.api,tcgdex_raw_id:e.dex,unmapped_product_id:e.product};
}
