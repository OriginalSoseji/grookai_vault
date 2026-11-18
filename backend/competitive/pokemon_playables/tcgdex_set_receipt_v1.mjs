import {assert} from './common.mjs';
import {decodeRepositorySetCapture} from './adapters/tcgdex_repository_set_v1.mjs';

export function readTcgdexSetReceipt(receipt,source){
  if(source?.adapter==='tcgdex_repository_set_v1')return decodeRepositorySetCapture(receipt,source);
  let set;try{set=JSON.parse(receipt.body_text);}catch{assert(false,'MATCHING_SET_JSON');}
  assert(receipt.url===`https://api.tcgdex.net/v2/en/sets/${set.id}`,'MATCHING_SET_ORIGINAL_URL');
  return {set,coverage:'provider_listing',complete_set_inventory:false,
    provenance:{kind:'tcgdex_api_set_v1',authority:'tcgdex',original_receipt_id:receipt.id}};
}
