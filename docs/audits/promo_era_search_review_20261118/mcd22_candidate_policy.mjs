// Read-only proposal policy; this module has no database writer.
// It narrows an existing source matcher to the observed 15-card set.
import {admitTcgplayerRarityV1,tcgplayerFieldV1} from '../../../backend/pokemon/tcgplayer_catalog_rarity_v1.mjs';
const digits=s=>/^\d+$/.test(String(s??''))?String(Number(s)):null;
export function evaluateMcd22Candidate({parent,set,identities,product,group,mapping,groupSets,runs,traits}) {
 if(!parent||!set||!Array.isArray(identities)||!Array.isArray(traits))return {status:'missing_evidence'};
 if(set.code!=='mcd22'||set.game!=='pokemon'||set.id!==parent.set_id||parent.set_code!==set.code||
    set.printed_total!==15||set.source?.pokemonapi?.id!=='mcd22'||set.source?.pokemonapi?.printedTotal!==15)
  return {status:'set_evidence_mismatch'};
 const active=identities.filter(i=>i.card_print_id===parent.id&&i.is_active);
 if(active.length!==1)return {status:'active_identity_mismatch'};
 const identity=active[0],number=digits(parent.number),source=tcgplayerFieldV1(product??{},'Number');
 const parts=/^(\d+)\/(\d+)$/.exec(source??'');
 if(!number||Number(number)<1||Number(number)>15||identity.identity_domain!=='pokemon_eng_standard'||
    identity.identity_domain!==parent.identity_domain||identity.set_code_identity!=='mcd22'||
    digits(identity.printed_number)!==number||identity.identity_payload?.printed_total!==15||
    identity.normalized_printed_name!==String(parent.name??'').trim().toLowerCase()||
    identity.identity_payload?.variant_key_current!=='base'||
    !/^[a-f0-9]{64}$/.test(identity.identity_key_hash??'')||!parts||digits(parts[1])!==number||digits(parts[2])!=='15')
  return {status:'coordinate_or_identity_mismatch'};
 if(!traits.length||traits.some(t=>t.card_print_id!==parent.id))return {status:'trait_evidence_mismatch'};
 const original=admitTcgplayerRarityV1({parent,product,group,mapping,groupSets,runs});
 if(original.status!=='printed_coordinate_mismatch')return {status:'original_admission_changed',original:original.status};
 // The synthetic comparison cannot change the stored parent. The original and
 // adapted decisions are retained separately in the resulting proposal.
 const comparison=admitTcgplayerRarityV1({parent:{...parent,number:`${parent.number}/15`},product,group,mapping,groupSets,runs});
 if(comparison.status!=='exact_source_null_rarity_fill'||comparison.value!=='Promo')
  return {status:'source_evidence_mismatch',comparison:comparison.status};
 return {status:'candidate_only',proposed_value:'Promo',source_number:source,
  identity_key_hash:identity.identity_key_hash,trait_count:traits.length,original_status:original.status};
}
