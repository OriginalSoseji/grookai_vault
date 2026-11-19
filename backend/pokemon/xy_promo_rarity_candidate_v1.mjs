// Exact two-card source-disagreement review. This policy does not write canon.
import {isDeepStrictEqual} from 'node:util';
import {tcgplayerFieldV1,tcgplayerPayloadHashV1} from './tcgplayer_catalog_rarity_v1.mjs';
const EXACT=Object.freeze({
 'XY177':{id:'48854339-79de-41bd-a10a-acc158c1b195',name:'Karen',variant:'XY',product:123438,title:'Karen',pokemonapi:'1764',tcgdex:'14901'},
 'XY198':{id:'fa353da7-a194-4d02-8667-ad9b033a49e5',name:'M Camerupt-EX',variant:'',product:129898,title:'M Camerupt EX - XY198',pokemonapi:'1786',tcgdex:'14925'},
});
export function evaluateXyPromoCandidate({parent,set,identities,traits,mappings,raw,product,group,groupSets,runs}){
 const exact=EXACT[parent?.number];
 if(!exact||parent.id!==exact.id||parent.gv_id!==`GV-PK-PR-XY-${parent.number}`||parent.name!==exact.name||
  parent.set_code!=='xyp'||parent.rarity!=='Common'||(parent.variant_key??'')!==exact.variant||parent.identity_domain!=='pokemon_eng_standard')
  return {status:'parent_scope_or_preimage_mismatch'};
 if(!set||set.id!==parent.set_id||set.game!=='pokemon'||set.code!=='xyp'||set.printed_total!==211)return {status:'set_mismatch'};
 const active=(identities??[]).filter(i=>i.is_active&&i.card_print_id===parent.id);
 if(active.length!==1||active[0].identity_domain!==parent.identity_domain||active[0].set_code_identity!=='xyp'||
  active[0].printed_number!==parent.number||active[0].normalized_printed_name!==parent.name.toLowerCase()||
  active[0].identity_payload?.printed_total!==211||!/^[a-f0-9]{64}$/.test(active[0].identity_key_hash??''))
  return {status:'identity_mismatch'};
 if(!Array.isArray(traits)||traits.length!==1||traits[0].card_print_id!==parent.id||traits[0].source!=='tcgdex'||
  traits[0].trait_type!=='pokemon:stats'||traits[0].rarity!=='Common')return {status:'source_trait_mismatch'};
 const one=(source,id)=>{const a=(mappings??[]).filter(m=>m.active&&m.card_print_id===parent.id&&m.source===source);
  return a.length===1&&a[0].external_id===id&&a[0].owners===1&&a[0].parent_mappings===1;};
 if(!one('pokemonapi',`xyp-${parent.number}`)||!one('tcgdex',`xyp-${parent.number}`)||!one('tcgplayer',String(exact.product)))
  return {status:'mapping_mismatch'};
 const api=(raw??[]).filter(r=>r.source==='pokemonapi'&&r.id===exact.pokemonapi),dex=(raw??[]).filter(r=>r.source==='tcgdex'&&r.id===exact.tcgdex);
 const latest=(source)=>{
  const matching=(raw??[]).filter(r=>r.source===source&&(r.payload?._external_id??r.payload?.card?.id??r.payload?.id)===`xyp-${parent.number}`);
  if(matching.some(r=>!/^\d+$/.test(String(r.id))||!Number.isFinite(Date.parse(r.ingested_at))))return null;
  return matching.sort((a,b)=>Date.parse(b.ingested_at)-Date.parse(a.ingested_at)||(BigInt(b.id)>BigInt(a.id)?1:BigInt(b.id)<BigInt(a.id)?-1:0))[0]?.id??null;
 };
 if(api.length!==1||dex.length!==1||api[0].payload?._external_id!==`xyp-${parent.number}`||api[0].payload?.id!==`xyp-${parent.number}`||
  api[0].payload?.name!==parent.name||api[0].payload?.number!==parent.number||api[0].payload?.set?.id!=='xyp'||api[0].payload?.rarity!=='Promo'||
  dex[0].payload?._external_id!==`xyp-${parent.number}`||dex[0].payload?.card?.name!==parent.name||
  dex[0].payload?.card?.localId!==parent.number||dex[0].payload?.card?.rarity!=='Common'||
  latest('pokemonapi')!==exact.pokemonapi||latest('tcgdex')!==exact.tcgdex)return {status:'raw_source_disagreement_mismatch'};
 if(!product||!group||product.product_id!==exact.product||product.name!==exact.title||product.group_id!==1451||group.group_id!==1451||
  product.category_id!==3||group.category_id!==3||!product.source_active||!group.source_active||
  product.catalog_metadata_status!=='current'||group.catalog_metadata_status!=='current'||
  product.payload_hash!==tcgplayerPayloadHashV1(product.raw_payload)||group.payload_hash!==tcgplayerPayloadHashV1(group.raw_payload)||
  !isDeepStrictEqual(product.extended_data,product.raw_payload?.extendedData)||product.raw_payload?.productId!==exact.product||
  product.raw_payload?.groupId!==1451||product.raw_payload?.categoryId!==3||product.raw_payload?.name!==exact.title||
  group.raw_payload?.groupId!==1451||group.raw_payload?.categoryId!==3||group.raw_payload?.name!==group.name||
  tcgplayerFieldV1(product,'Number')!==parent.number||tcgplayerFieldV1(product,'Rarity')!=='Promo'||
  groupSets?.group_id!==1451||groupSets.set_count!==1||!isDeepStrictEqual(groupSets.set_codes,['xyp']))return {status:'product_evidence_mismatch'};
 if(![product,group].every(r=>(runs??[]).some(run=>run.id===r.last_seen_run_id&&run.status==='completed'&&run.sync_mode==='current_full_sync'&&run.failed_count===0)))
  return {status:'completed_source_sync_required'};
 return {status:'candidate_only',before:'Common',proposed:'Promo',identity_key_hash:active[0].identity_key_hash,
  pokemonapi_raw_id:api[0].id,tcgdex_raw_id:dex[0].id,source_product_id:exact.product,trait_ids:traits.map(t=>t.id)};
}
