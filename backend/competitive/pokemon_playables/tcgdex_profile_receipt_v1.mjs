import {assert,boundedArray,safeId} from './common.mjs';
import {decodeRepositoryCapture} from './adapters/tcgdex_repository_v1.mjs';
import {decodeRepositorySetCapture} from './adapters/tcgdex_repository_set_v1.mjs';

export function enabledProfileSources(config) {
  const ids=[config.profile_source_id,...boundedArray(config.additional_profile_source_ids??[],10)].filter(Boolean);
  ids.forEach(safeId);assert(new Set(ids).size===ids.length,'DUPLICATE_PROFILE_SOURCE');return new Set(ids);
}
export function readTcgdexProfileReceipts(receipt,source,options={}){
  if(source?.adapter!=='tcgdex_repository_set_v1')return[readTcgdexProfileReceipt(receipt,source,options)];
  const decoded=decodeRepositorySetCapture(receipt,source),set=source.repository.sets.find(set=>set.id===decoded.set.id);
  return decoded.profiles.map(card=>({card,provenance:{kind:'tcgdex_repository_set_member_v1',authority:'tcgdex',repository:source.repository.repository,
    commit_sha:source.repository.commit_sha,card_blob_sha1:source.repository.blobs[`data/${set.series??'Mega Evolution'}/${set.name}/${card.localId}.ts`],
    original_receipt_id:receipt.id,original_set_capture:true}}));
}
export function readTcgdexProfileReceipt(receipt,source,{jsonCode='MATCHING_PROFILE_JSON',originCode='MATCHING_PROFILE_ORIGIN_OR_DUPLICATE',providerCardId}={}) {
  if(source?.adapter==='tcgdex_repository_set_v1'){
    const profiles=readTcgdexProfileReceipts(receipt,source),matches=profiles.filter(profile=>profile.card.id===providerCardId);
    assert(matches.length===1,'REPOSITORY_SET_PROFILE_MEMBER_REQUIRED');return matches[0];
  }
  if(source?.adapter==='tcgdex_repository_card_v1')return decodeRepositoryCapture(receipt,source);
  let card;try{card=JSON.parse(receipt.body_text);}catch{assert(false,jsonCode);}
  assert(receipt.url===`https://api.tcgdex.net/v2/en/cards/${card.id}`,originCode);
  return {card,provenance:{kind:'tcgdex_api_card_v1',authority:'tcgdex',original_receipt_id:receipt.id}};
}
