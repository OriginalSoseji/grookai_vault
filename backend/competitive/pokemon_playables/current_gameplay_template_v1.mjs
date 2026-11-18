import {admittedSourceUrl,assert,boundedArray,collectorNumber,DAY_MS,digest,mapUnique,normalize,reviewValid,sha256,SHA256,timestamp,uniqueSorted,UUID} from './common.mjs';
import {validatePolicy} from './policy.mjs';
import {aliasKey} from './evidence.mjs';
import {tcgdexGameplayProposal} from './cohort.mjs';
import {enabledProfileSources,readTcgdexProfileReceipts} from './tcgdex_profile_receipt_v1.mjs';
import {readTcgdexSetReceipt} from './tcgdex_set_receipt_v1.mjs';
import {gameplayMetadataHints} from './gameplay_decisions_v1.mjs';
import {catalogSourceNameMatches} from '../../catalog/catalog_source_name_binding_v1.mjs';
import {limitlessPublishedReceipt,readLimitlessPublishedLists,verifyLimitlessPublishedOriginals} from './adapters/limitless_published_decklists_v1.mjs';

const pending=()=>({status:'pending'}),ref=receipt=>({id:receipt.id,receipt_hash:digest(receipt)});

// Archival evidence packaging only. Expired source reviews remain expired;
// every gameplay/member/alias decision and deck-limit classification stays held.
export function createCurrentSampleGameplayTemplate({sample,input,native_proposals,native_source,current_bindings,retention_bounds,policy},asOf){
  validatePolicy(policy);const at=timestamp(asOf);assert(sample.version==='pokemon_current_decklist_sample:v1'&&timestamp(sample.retain_until)>at,'CURRENT_GAMEPLAY_SAMPLE_EXPIRED');
  const coordinates=boundedArray(sample.coordinates,500),sources=mapUnique(boundedArray(input.sources,100),'id'),receipts=mapUnique(boundedArray(input.receipts,20000),'id');
  const bindings=mapUnique(boundedArray(current_bindings.catalog,500),'id'),owners=boundedArray(current_bindings.mappings,2000).filter(row=>row.source==='tcgdex'&&row.active);
  const used=new Map(),nativeLines=new Map(),eventIds=new Set(),profileMap=new Map(),setMap=new Map(),profileSources=enabledProfileSources(input.matching);
  let until=timestamp(sample.retain_until);
  const keep=receipt=>{
    const source=sources.get(receipt.source_id)??(receipt.source_id===native_source.id?native_source:null);
    assert(source&&sha256(receipt.body_text)===receipt.body_sha256&&timestamp(receipt.observed_at)<=at,'CURRENT_GAMEPLAY_ORIGINAL_HASH_OR_TIME');
    admittedSourceUrl(source,receipt.url);
    const bound=Math.min(timestamp(retention_bounds[receipt.id]),timestamp(receipt.observed_at)+source.retention_days*DAY_MS,
      receipt.retain_until===undefined?Infinity:timestamp(receipt.retain_until));
    assert(bound>at,'CURRENT_GAMEPLAY_ORIGINAL_EXPIRED');until=Math.min(until,bound);
    if(used.has(receipt.id))assert(digest(used.get(receipt.id))===digest(receipt),'CURRENT_GAMEPLAY_DUPLICATE_ORIGINAL');used.set(receipt.id,receipt);return ref(receipt);
  };
  for(const {capture,receipt}of boundedArray(native_proposals,100)){
    assert(receipt.source_id===native_source.id&&digest(receipt)===digest(limitlessPublishedReceipt(capture,native_source.id)),'CURRENT_GAMEPLAY_NATIVE_WRAPPER_CHANGED');
    assert(!eventIds.has(capture.event_id),'CURRENT_GAMEPLAY_DUPLICATE_EVENT');eventIds.add(capture.event_id);
    verifyLimitlessPublishedOriginals(capture,native_source,at);keep(receipt);
    for(const deck of readLimitlessPublishedLists(capture,policy).decks){
      const seen=new Set();for(const line of deck.cards){const key=aliasKey({...line,source_id:native_source.id});if(seen.has(key))continue;seen.add(key);
        if(!nativeLines.has(key))nativeLines.set(key,{refs:new Map(),events:new Set(),lists:new Set()});const row=nativeLines.get(key);
        row.refs.set(receipt.id,ref(receipt));row.events.add(capture.event_id);row.lists.add(`${capture.event_id}|${deck.entry_key}`);
      }
    }
  }
  const setReceiptIds=new Set(boundedArray(input.matching.set_receipt_ids,100));
  for(const receipt of receipts.values())if(receipt.kind==='gameplay'&&profileSources.has(receipt.source_id)&&
    (!setReceiptIds.has(receipt.id)||sources.get(receipt.source_id)?.adapter==='tcgdex_repository_set_v1')){
    assert(sha256(receipt.body_text)===receipt.body_sha256,'CURRENT_GAMEPLAY_PROFILE_HASH');
    for(const profile of readTcgdexProfileReceipts(receipt,sources.get(receipt.source_id))){
      if(!profileMap.has(profile.card.id))profileMap.set(profile.card.id,[]);profileMap.get(profile.card.id).push({receipt,...profile});
    }
  }
  for(const id of boundedArray(input.matching.set_receipt_ids,100)){
    const receipt=receipts.get(id);assert(receipt?.kind==='gameplay'&&sha256(receipt.body_text)===receipt.body_sha256,'CURRENT_GAMEPLAY_SET_ORIGINAL');
    const {set}=readTcgdexSetReceipt(receipt,sources.get(receipt.source_id));if(!setMap.has(set.id))setMap.set(set.id,[]);setMap.get(set.id).push({receipt,set});
  }
  const groups=new Map(),held=[],priority=[],seenCoordinates=new Set();
  for(const coordinate of coordinates){
    const key=aliasKey({...coordinate,source_id:native_source.id});assert(!seenCoordinates.has(key),'CURRENT_GAMEPLAY_DUPLICATE_COORDINATE');seenCoordinates.add(key);
    const hold=reason=>held.push({set:coordinate.set,number:coordinate.number,name:coordinate.name,reason});
    if(!coordinate.current_catalog_binding_proposed){hold('CURRENT_CATALOG_BINDING_REQUIRED');continue;}
    const card=bindings.get(coordinate.card_print_id),mappings=owners.filter(row=>row.card_print_id===coordinate.card_print_id),owner=mappings[0];
    if(mappings.length!==1||owners.filter(row=>row.external_id===owner?.external_id).length!==1){hold('CURRENT_GAMEPLAY_OWNER_DRIFT');continue;}
    if(!card||!UUID.test(card.id)||!UUID.test(card.identity_id)||!SHA256.test(card.identity_key_hash)||card.identity_id!==coordinate.identity_id||card.identity_key_hash!==coordinate.identity_key_hash||
      card.identity_active!==true||card.identity_consistent!==true||card.publicly_visible!==true||card.identity_domain!==policy.scope.identity_domain){hold('CURRENT_GAMEPLAY_IDENTITY_DRIFT');continue;}
    const candidates=profileMap.get(owner.external_id)??[];
    if(!candidates.length){hold('CURRENT_GAMEPLAY_PROFILE_REQUIRED');continue;}
    const complete=[];for(const value of candidates){try{complete.push({...value,proposal:tcgdexGameplayProposal(value.card)});}catch{/* incomplete source facts remain held */}}
    if(complete.length!==candidates.length){hold('CURRENT_GAMEPLAY_PROFILE_INCOMPLETE');continue;}
    if(new Set(complete.map(value=>value.proposal.fingerprint)).size!==1){hold('CURRENT_GAMEPLAY_PROFILE_CONFLICT');continue;}
    const profile=complete.sort((a,b)=>a.receipt.id.localeCompare(b.receipt.id))[0],p=profile.card;
    if(!catalogSourceNameMatches(card,p.name,owner)||normalize(card.set_code)!==normalize(p.set.id)||collectorNumber(card.number)!==collectorNumber(p.localId)){
      hold('CURRENT_GAMEPLAY_PROFILE_COORDINATE_CONFLICT');continue;}
    const sets=setMap.get(p.set.id)??[];
    if(sets.length!==1){hold('CURRENT_GAMEPLAY_SET_ORIGINAL_REQUIRED');continue;}
    const {set,receipt:setReceipt}=sets[0],labels=[set.id,set.tcgOnline,typeof set.abbreviation==='string'?set.abbreviation:set.abbreviation?.official].filter(value=>typeof value==='string').map(normalize);
    const occurrence=nativeLines.get(key);
    if(!labels.includes(normalize(coordinate.set))||normalize(coordinate.name)!==normalize(p.name)||collectorNumber(coordinate.number)!==collectorNumber(p.localId)||
      set.cards.filter(value=>value.id===p.id&&collectorNumber(value.localId)===collectorNumber(p.localId)&&normalize(value.name)===normalize(p.name)).length!==1||
      !occurrence||coordinate.section!==gameplayMetadataHints(p).section){hold('CURRENT_GAMEPLAY_EXACT_ALIAS_REQUIRED');continue;}
    const member={provider_card_id:p.id,card_print_id:card.id,identity_id:card.identity_id,identity_key_hash:card.identity_key_hash,mapping_id:String(owner.id),
      profile_original:keep(profile.receipt),profile_hash:digest(p),mechanics_hash:profile.proposal.fingerprint,warnings:profile.proposal.warnings,review:pending()};
    const alias={source_id:native_source.id,set:coordinate.set,number:coordinate.number,name:coordinate.name,card_print_id:card.id,
      set_original:keep(setReceipt),event_originals:[...occurrence.refs.values()].sort((a,b)=>a.id.localeCompare(b.id)),review:pending()};
    if(!groups.has(card.id))groups.set(card.id,{id:`gameplay-${digest({card_print_id:card.id,identity_key_hash:card.identity_key_hash,mechanics_hash:member.mechanics_hash})}`,
      mode:'exact_source_profile',metadata:gameplayMetadataHints(p),members:[member],aliases:[],review:pending()});
    groups.get(card.id).aliases.push(alias);
    priority.push({provider_card_id:p.id,card_print_id:card.id,source_set:coordinate.set,source_number:coordinate.number,source_name:coordinate.name,
      published_list_occurrences:occurrence.lists.size,published_event_occurrences:occurrence.events.size,profile_status:'retained_complete_pending_review',review:pending()});
  }
  const packet={version:'pokemon_playables_gameplay_review_packet:v1',current_sample_hash:digest(sample),groups:[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id))};
  for(const group of packet.groups)group.aliases.sort((a,b)=>aliasKey(a).localeCompare(aliasKey(b)));
  const requiredSources=uniqueSorted([...used.values()].map(receipt=>receipt.source_id));
  const selectedSources=requiredSources.map(id=>sources.get(id)??native_source);
  const source_review_gaps=selectedSources.filter(source=>!reviewValid(source.review,at,policy)||source.allow_ingest!==true)
    .map(source=>({source_id:source.id,reason:'CURRENT_SOURCE_ADMISSION_REVIEW_REQUIRED'}));
  const content={version:'pokemon_current_sample_gameplay_template:v1',as_of:asOf,retain_until:new Date(until).toISOString(),sample_hash:digest(sample),
    packet,current_bindings:structuredClone(current_bindings),sources:structuredClone(selectedSources),receipts:structuredClone([...used.values()].sort((a,b)=>a.id.localeCompare(b.id))),
    held:held.sort((a,b)=>digest(a).localeCompare(digest(b))),review_priority:priority.sort((a,b)=>b.published_event_occurrences-a.published_event_occurrences||b.published_list_occurrences-a.published_list_occurrences||a.provider_card_id.localeCompare(b.provider_card_id)),
    source_review_gaps,approvals_added:0,canonical_writes:0,qualification_attempted:false,
    limitations:['Pending singleton groups assert no cross-print equivalence.','Retained source profiles and current bindings do not establish gameplay review or legality.','Expired source reviews remain unchanged; native event context remains pending.']};
  return{...content,template_id:digest(content)};
}
