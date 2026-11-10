// Private, current-identity read boundary shared by downstream consumers.
// null source fields remain unknown; an explicit [] remains an empty source array.
const PROVIDERS={pokemonapi:{domain:'pokemon_eng_standard',language:'en',sources:['pokemonapi']},tcgdex:{domain:'pokemon_jpn',language:'ja',sources:['tcgdex','tcgdex_ja','tcgdex_ja_cards']}};
const FIELDS=['attacks','abilities','weaknesses','resistances','rules','retreat_cost','retreat_count','evolves_from_label','card_text','flavor_text'];
export function readPokemonGameplayDetailsV1(parent,identity,profile,sourceOwners){
 const d=profile,p=parent,i=identity,scope=PROVIDERS[d?.source_provider];
 if(!scope||!p||d.card_print_id!==p.id||p.identity_domain!==scope.domain||d.language_code!==scope.language||d.normalization_version!=='pokemon_gameplay_details:v1'||d.verification_status!=='source_supported'||i?.is_active!==true||i.card_print_id!==p.id||i.identity_domain!==p.identity_domain||i.id!==d.identity_id||i.identity_key_hash!==d.identity_key_hash||!/^[a-f0-9]{64}$/.test(d.identity_key_hash)||!/^[a-f0-9]{64}$/.test(d.source_body_sha256)||!/^[1-9]\d*$/.test(String(d.source_raw_import_id))||!Number.isFinite(Date.parse(d.source_observed_at))||!Array.isArray(sourceOwners)||sourceOwners.length!==1)return null;
 const m=sourceOwners[0];if(m.active!==true||!scope.sources.includes(m.source)||m.card_print_id!==p.id||m.external_id!==d.source_card_id)return null;
 if(d.source_provider==='tcgdex'&&(m.meta?.language_code!=='ja'||m.meta.identity_id!==i.id||m.meta.identity_key_hash!==i.identity_key_hash||String(m.meta.original_source_raw_import_id)!==String(d.source_raw_import_id)||m.meta.original_body_sha256!==d.source_body_sha256||d.source_url!=='https://api.tcgdex.net/v2/ja/cards/'+d.source_card_id))return null;
 if(d.source_provider==='pokemonapi'&&!/^https:\/\/raw\.githubusercontent\.com\/PokemonTCG\/pokemon-tcg-data\/[0-9a-f]{40}\/cards\/en\/[a-zA-Z0-9._-]+\.json$/.test(d.source_url))return null;
 return{...Object.fromEntries(FIELDS.map(k=>[k,d[k]])),language_code:d.language_code,verification_status:d.verification_status,identity_id:i.id,identity_key_hash:i.identity_key_hash,source:{provider:d.source_provider,card_id:d.source_card_id,url:d.source_url,raw_import_id:String(d.source_raw_import_id),body_sha256:d.source_body_sha256,observed_at:d.source_observed_at,mapping_id:String(m.id)}};
}
