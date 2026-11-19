import {assert,boundedArray,collectorNumber,digest,mapUnique,normalize,reviewValid,safeId,SHA256,text,timestamp,uniqueSorted,UUID} from './common.mjs';
import {aliasKey,normalizeEventExport,prepareEvidence} from './evidence.mjs';
import {buildMatchingReview} from './matching.mjs';
import {tcgdexGameplayProposal} from './cohort.mjs';
import {readTcgdexProfileReceipt,readTcgdexProfileReceipts} from './tcgdex_profile_receipt_v1.mjs';
import {catalogSourceNameMatches} from '../../catalog/catalog_source_name_binding_v1.mjs';
import {validatePolicy} from './policy.mjs';
import {readTcgdexSetReceipt} from './tcgdex_set_receipt_v1.mjs';
import {deckLimitSourceHints} from './deck_construction_review_v1.mjs';

export const GAMEPLAY_COMPILER_VERSION='pokemon_playables_compiled_gameplay:v1';
const noReview=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='review'));
export const gameplayGroupSubject=group=>digest(noReview(group));
export const gameplayMemberSubject=(group,member)=>digest({group_id:group.id,member:noReview(member)});
export const gameplayAliasSubject=(group,alias)=>digest({group_id:group.id,alias:noReview(alias)});
const basicNames=new Set(['Grass','Fire','Water','Lightning','Psychic','Fighting','Darkness','Metal'].map(type=>`Basic ${type} Energy`));
const hints=card=>({label:card.name,section:{Pokemon:'pokemon',Trainer:'trainer',Energy:'energy'}[card.category],copy_limit_key:card.name,
  basic_energy:card.category==='Energy'&&card.energyType==='Normal'&&basicNames.has(card.name),
  is_basic_pokemon:card.category==='Pokemon'&&card.stage==='Basic',deck_limit_groups:null});
export const gameplayMetadataHints=hints;
const pending=()=>({status:'pending'});
const originalRef=receipt=>({id:receipt.id,receipt_hash:digest(receipt)});

// Archival template creation only; this cannot renew current source admission.
// Singleton groups deliberately propose no cross-print functional equivalence.
export function createGameplayReviewTemplate({archive,input,selected_card_print_ids},asOf){
  const at=timestamp(asOf);assert(timestamp(archive.retain_until)>at&&timestamp(archive.report.as_of)<=at,'GAMEPLAY_TEMPLATE_ARCHIVE_EXPIRED');
  assert(digest(buildMatchingReview(input,archive.policy,archive.report.as_of,archive.bindings))===digest(archive.report),'GAMEPLAY_TEMPLATE_HISTORICAL_REPLAY');
  const selected=boundedArray(selected_card_print_ids,500);assert(selected.length>0&&selected.every(id=>UUID.test(id)),'GAMEPLAY_TEMPLATE_MEMBER_SCOPE');
  assert(new Set(selected).size===selected.length,'GAMEPLAY_TEMPLATE_DUPLICATE_MEMBER');
  const sources=new Map(input.sources.map(source=>[source.id,source])),receipts=new Map(input.receipts.map(receipt=>[receipt.id,receipt]));
  const events=input.receipts.filter(receipt=>receipt.kind==='tournament').map(receipt=>({receipt,events:normalizeEventExport(receipt,sources.get(receipt.source_id),archive.policy,timestamp(archive.report.as_of))}));
  const groups=selected.map(id=>{
    const rows=archive.report.coordinate_review_queue.filter(row=>row.canonical_binding?.card_print_id===id);
    assert(rows.length>0&&rows.every(row=>row.gameplay_profile),'GAMEPLAY_TEMPLATE_EXACT_PROFILE_REQUIRED');
    assert(new Set(rows.map(row=>row.provider_card_id)).size===1,'GAMEPLAY_TEMPLATE_MULTIPLE_PROVIDER_OWNERS');
    const row=rows[0],r=receipts.get(row.gameplay_profile.receipt_id),profile=readTcgdexProfileReceipt(r,sources.get(r.source_id),{providerCardId:row.provider_card_id}),proposal=tcgdexGameplayProposal(profile.card);
    const member={provider_card_id:profile.card.id,card_print_id:id,identity_id:row.canonical_binding.identity_id,identity_key_hash:row.canonical_binding.identity_key_hash,
      mapping_id:String(row.canonical_binding.mapping_id),profile_original:originalRef(r),profile_hash:digest(profile.card),mechanics_hash:proposal.fingerprint,
      warnings:proposal.warnings,review:pending()};
    const aliases=rows.map(alias=>{
      const sets=input.matching.set_receipt_ids.map(ref=>receipts.get(ref)).filter(receipt=>readTcgdexSetReceipt(receipt,sources.get(receipt.source_id)).set.id===profile.card.set.id);
      assert(sets.length===1,'GAMEPLAY_TEMPLATE_EXACT_SET_REQUIRED');
      const originals=events.filter(value=>value.events.some(event=>event.decks.some(deck=>deck.cards.some(line=>aliasKey(line)===alias.alias_key)))).map(value=>originalRef(value.receipt));
      assert(originals.length>0,'GAMEPLAY_TEMPLATE_ALIAS_ORIGINAL_REQUIRED');
      return {source_id:alias.source_id,set:alias.set,number:alias.number,name:alias.name,card_print_id:id,
        set_original:originalRef(sets[0]),event_originals:originals.sort((a,b)=>a.id.localeCompare(b.id)),review:pending()};
    });
    return {id:`gameplay-${digest({card_print_id:id,identity_key_hash:member.identity_key_hash,mechanics_hash:member.mechanics_hash})}`,
      mode:'exact_source_profile',metadata:hints(profile.card),members:[member],aliases:aliases.sort((a,b)=>aliasKey(a).localeCompare(aliasKey(b))),review:pending()};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  return {version:'pokemon_playables_gameplay_review_packet:v1',historical_matching_report_id:archive.report.report_id,groups};
}

export function gameplayProviderIds(packet){
  assert(packet?.version==='pokemon_playables_gameplay_review_packet:v1','GAMEPLAY_PACKET_VERSION');
  const members=boundedArray(packet.groups,500).flatMap(group=>boundedArray(group.members,500));
  assert(members.length>0&&members.length<=500&&members.every(member=>typeof member.provider_card_id==='string'&&/^[a-zA-Z0-9.]+-[a-zA-Z0-9]+$/.test(member.provider_card_id)),'GAMEPLAY_PROFILE_SCOPE');
  return uniqueSorted(members.map(member=>member.provider_card_id));
}

export function assembleGameplayCandidateInput({input,packet,catalog,current_bindings,legality_packet}){
  gameplayProviderIds(packet);
  const required=new Set(input.ruleset.evidence_refs),originals=new Map(input.receipts.map(receipt=>[receipt.id,receipt]));
  for(const group of packet.groups){
    for(const member of group.members)required.add(member.profile_original.id);
    for(const alias of group.aliases){required.add(alias.set_original.id);alias.event_originals.forEach(ref=>required.add(ref.id));}
  }
  if(legality_packet)for(const decision of legality_packet.decisions)for(const axis of decision.axes)axis.evidence_refs.forEach(ref=>required.add(ref.id));
  const receipts=[...required].sort().map(id=>{const receipt=originals.get(id);assert(receipt,'GAMEPLAY_CANDIDATE_ORIGINAL_REQUIRED');return receipt;});
  const sourceIds=new Set(receipts.map(receipt=>receipt.source_id)),sources=input.sources.filter(source=>sourceIds.has(source.id));
  assert(sources.length===sourceIds.size,'GAMEPLAY_CANDIDATE_SOURCE_REQUIRED');
  const members=new Set(packet.groups.flatMap(group=>group.members.map(member=>member.card_print_id)));
  const candidate={version:'pokemon_playables_input:v1',synthetic:input.synthetic===true,sources,ruleset:input.ruleset,receipts,
    catalog:catalog.filter(card=>members.has(card.id)),groups:[],legality:[],gameplay_current_bindings:current_bindings,gameplay_review_packet:packet,
    ...(legality_packet?{legality_review_packet:legality_packet}:{})};
  // Return an isolated proposal; callers cannot edit archived originals/reviews
  // through shared object references. No acquisition or approval is added.
  return structuredClone(candidate);
}

export function compileGameplayDecisions(input,policy,packet,{asOf,purpose='shadow'}={}){
  validatePolicy(policy);const at=timestamp(asOf);gameplayProviderIds(packet);
  const evidence=prepareEvidence(input,policy,at,purpose),bindings=input.gameplay_current_bindings;
  assert(Array.isArray(bindings?.mappings)&&Array.isArray(bindings?.catalog),'GAMEPLAY_CURRENT_BINDINGS_REQUIRED');
  const catalog=mapUnique(input.catalog,'id','DUPLICATE_CATALOG_MEMBER'),bindingCatalog=mapUnique(bindings.catalog,'id','GAMEPLAY_DUPLICATE_BINDING');
  const proposals=boundedArray(packet.groups,Math.min(policy.maximum_groups,500));mapUnique(proposals,'id','GAMEPLAY_DUPLICATE_GROUP');
  assert(proposals.reduce((sum,group)=>sum+boundedArray(group.aliases,2000).length,0)<=2000,'GAMEPLAY_ALIAS_SCOPE');
  const owners=new Set(),aliasOwners=new Set(),groups=[],held=[];
  const setCache=new Map(),eventCache=new Map(),profileCache=new Map();
  const requireOriginal=(ref,kind)=>{
    const receipt=evidence.requireEvidence([ref?.id],kind)[0];
    assert(SHA256.test(ref.receipt_hash)&&digest(receipt)===ref.receipt_hash,'GAMEPLAY_ORIGINAL_CHANGED');return receipt;
  };
  const reviewed=(review,subject)=>{
    if(!reviewValid(review,at,policy)||review.authority!=='human_evidence_review')return false;
    assert(review.subject_hash===subject,'GAMEPLAY_REVIEW_SUBJECT_CHANGED');return true;
  };
  for(const group of proposals){
    safeId(group.id);assert(group.mode==='exact_source_profile','GAMEPLAY_REVIEW_MODE');
    const reasons=[],profiles=new Map(),evidenceRefs=[],members=[],aliases=[];let validUntil=Infinity;
    const groupReviewed=reviewed(group.review,gameplayGroupSubject(group));if(!groupReviewed)reasons.push('GAMEPLAY_GROUP_REVIEW_REQUIRED');
    else validUntil=Math.min(validUntil,timestamp(group.review.valid_until));
    for(const member of group.members){
      assert(UUID.test(member.card_print_id)&&UUID.test(member.identity_id)&&SHA256.test(member.identity_key_hash),'GAMEPLAY_MEMBER_IDENTITY');
      assert(!owners.has(member.card_print_id),'GAMEPLAY_MEMBER_IN_MULTIPLE_GROUPS');owners.add(member.card_print_id);
      const receipt=requireOriginal(member.profile_original,'gameplay');
      if(!profileCache.has(receipt.id))profileCache.set(receipt.id,new Map(readTcgdexProfileReceipts(receipt,evidence.sources.get(receipt.source_id)).map(profile=>[profile.card.id,profile])));
      const profile=profileCache.get(receipt.id).get(member.provider_card_id);assert(profile,'GAMEPLAY_PROFILE_CHANGED');
      const proposal=tcgdexGameplayProposal(profile.card),card=catalog.get(member.card_print_id),bound=bindingCatalog.get(member.card_print_id);
      assert(profile.card.id===member.provider_card_id&&digest(profile.card)===member.profile_hash&&proposal.fingerprint===member.mechanics_hash,'GAMEPLAY_PROFILE_CHANGED');
      const active=bindings.mappings.filter(mapping=>mapping.source==='tcgdex'&&mapping.active);
      const matches=active.filter(mapping=>mapping.external_id===member.provider_card_id),owner=matches[0];
      if(matches.length!==1||owner.card_print_id!==member.card_print_id||String(owner.id)!==member.mapping_id||active.filter(mapping=>mapping.card_print_id===member.card_print_id).length!==1)
        reasons.push('GAMEPLAY_CURRENT_OWNER_DRIFT');
      if(!card||!bound||card.identity_id!==member.identity_id||card.identity_key_hash!==member.identity_key_hash||bound.identity_id!==card.identity_id||bound.identity_key_hash!==card.identity_key_hash||
        !card.identity_active||!card.identity_consistent||!card.publicly_visible||!bound.identity_active||!bound.identity_consistent||!bound.publicly_visible||
        card.identity_domain!==policy.scope.identity_domain||bound.identity_domain!==policy.scope.identity_domain)
        reasons.push('GAMEPLAY_CURRENT_IDENTITY_DRIFT');
      if(card&&owner&&(!catalogSourceNameMatches(card,profile.card.name,owner)||normalize(card.set_code)!==normalize(profile.card.set.id)||collectorNumber(card.number)!==collectorNumber(profile.card.localId)))
        reasons.push('GAMEPLAY_CURRENT_COORDINATE_CONFLICT');
      if(!reviewed(member.review,gameplayMemberSubject(group,member)))reasons.push('GAMEPLAY_MEMBER_REVIEW_REQUIRED');
      else{
        assert(timestamp(member.review.reviewed_at)>=timestamp(receipt.observed_at),'GAMEPLAY_REVIEW_PREDATES_ORIGINAL');
        if(groupReviewed)assert(timestamp(group.review.reviewed_at)>=timestamp(member.review.reviewed_at),'GAMEPLAY_GROUP_REVIEW_PREDATES_MEMBER');
        validUntil=Math.min(validUntil,timestamp(member.review.valid_until));
      }
      profiles.set(member.card_print_id,profile.card);evidenceRefs.push(receipt.id);
      members.push({card_print_id:member.card_print_id,identity_id:member.identity_id,identity_key_hash:member.identity_key_hash,review:member.review,evidence_refs:[receipt.id]});
    }
    assert(new Set(group.members.map(member=>member.mechanics_hash)).size===1,'GAMEPLAY_SOURCE_MECHANICS_CONFLICT');
    const exemplar=profiles.values().next().value,expected=hints(exemplar),metadata=group.metadata;
    assert(metadata&&['label','section','copy_limit_key','basic_energy','is_basic_pokemon'].every(key=>key==='copy_limit_key'||key==='label'
      ?normalize(metadata[key])===normalize(expected[key]):metadata[key]===expected[key]),'GAMEPLAY_METADATA_SOURCE_CONFLICT');
    if(metadata.deck_limit_groups===null)reasons.push('GAMEPLAY_DECK_LIMIT_REVIEW_REQUIRED');
    else{const limits=boundedArray(metadata.deck_limit_groups,2);assert(new Set(limits).size===limits.length&&limits.every(value=>['ace_spec','radiant'].includes(value)),'GAMEPLAY_DECK_LIMIT_GROUP');
      const sourceHints=[...profiles.values()].map(deckLimitSourceHints);
      if(sourceHints.some(hint=>hint.hinted_deck_limit_groups.some(limit=>!limits.includes(limit))))reasons.push('GAMEPLAY_DECK_LIMIT_SOURCE_HINT_CONFLICT');
      if(sourceHints.some(hint=>hint.unmodeled_deck_rules.length))reasons.push('GAMEPLAY_DECK_LIMIT_UNMODELED_SOURCE_RULE');
    }
    for(const alias of boundedArray(group.aliases,2000)){
      const key=aliasKey(alias);assert(!aliasOwners.has(key),'GAMEPLAY_ALIAS_MULTIPLE_OWNERS');aliasOwners.add(key);
      const profile=profiles.get(alias.card_print_id);assert(profile,'GAMEPLAY_ALIAS_MEMBER_REQUIRED');
      const setReceipt=requireOriginal(alias.set_original,'gameplay');let set=setCache.get(setReceipt.id);
      if(!set){set=readTcgdexSetReceipt(setReceipt,evidence.sources.get(setReceipt.source_id)).set;setCache.set(setReceipt.id,set);}
      const labels=[set.id,set.tcgOnline,typeof set.abbreviation==='string'?set.abbreviation:set.abbreviation?.official].filter(value=>typeof value==='string').map(normalize);
      assert(set.id===profile.set.id&&labels.includes(normalize(alias.set))&&
        collectorNumber(alias.number)===collectorNumber(profile.localId)&&normalize(alias.name)===normalize(profile.name),'GAMEPLAY_ALIAS_COORDINATE_CONFLICT');
      assert(boundedArray(set.cards,2000).filter(card=>card.id===profile.id&&collectorNumber(card.localId)===collectorNumber(profile.localId)&&normalize(card.name)===normalize(profile.name)).length===1,
        'GAMEPLAY_ALIAS_SET_MEMBER_REQUIRED');
      const eventRefs=boundedArray(alias.event_originals,30);assert(eventRefs.length>0&&new Set(eventRefs.map(ref=>ref.id)).size===eventRefs.length,'GAMEPLAY_ALIAS_EVENT_ORIGINAL_REQUIRED');
      let latestOriginal=timestamp(setReceipt.observed_at);
      for(const ref of eventRefs){
        const receipt=requireOriginal(ref,'tournament');assert(receipt.source_id===alias.source_id,'GAMEPLAY_ALIAS_SOURCE_CONFLICT');
        latestOriginal=Math.max(latestOriginal,timestamp(receipt.observed_at));
        let events=eventCache.get(receipt.id);
        if(!events){events=normalizeEventExport(receipt,evidence.sources.get(receipt.source_id),policy,at);eventCache.set(receipt.id,events);}
        const matching=events.filter(event=>event.status==='complete'&&timestamp(event.played_at)<=at&&at<timestamp(event.expires_at)&&
          event.decks.some(deck=>deck.cards.some(line=>aliasKey(line)===key)));
        assert(matching.length>0,'GAMEPLAY_ALIAS_NOT_IN_CURRENT_ORIGINAL');
        validUntil=Math.min(validUntil,...matching.map(event=>timestamp(event.expires_at)));
      }
      if(!reviewed(alias.review,gameplayAliasSubject(group,alias)))reasons.push('GAMEPLAY_ALIAS_REVIEW_REQUIRED');
      else{
        assert(timestamp(alias.review.reviewed_at)>=latestOriginal,'GAMEPLAY_REVIEW_PREDATES_ORIGINAL');
        if(groupReviewed)assert(timestamp(group.review.reviewed_at)>=timestamp(alias.review.reviewed_at),'GAMEPLAY_GROUP_REVIEW_PREDATES_MEMBER');
        validUntil=Math.min(validUntil,timestamp(alias.review.valid_until));
      }
      aliases.push({source_id:alias.source_id,set:alias.set,number:alias.number,name:alias.name,card_print_id:alias.card_print_id});evidenceRefs.push(setReceipt.id);
    }
    if(reasons.length){held.push({group_id:group.id,reasons:uniqueSorted(reasons)});continue;}
    groups.push({id:group.id,...metadata,members,aliases,evidence_refs:uniqueSorted(evidenceRefs),
      review:{...group.review,valid_until:new Date(validUntil).toISOString()},decision_hash:digest(group)});
  }
  const compiledIds=new Set(groups.flatMap(group=>group.members.map(member=>member.card_print_id)));
  const member_bindings=proposals.flatMap(group=>group.members).filter(member=>compiledIds.has(member.card_print_id)).map(member=>({
    card_print_id:member.card_print_id,identity_id:member.identity_id,identity_key_hash:member.identity_key_hash,
    provider_card_id:member.provider_card_id,mapping_id:member.mapping_id,profile_hash:member.profile_hash,
  })).sort((a,b)=>a.card_print_id.localeCompare(b.card_print_id));
  return {version:GAMEPLAY_COMPILER_VERSION,packet_hash:digest(packet),as_of:asOf,member_bindings,
    groups:groups.sort((a,b)=>a.id.localeCompare(b.id)),held:held.sort((a,b)=>a.group_id.localeCompare(b.group_id))};
}

export function currentGameplayBindingsMatch(snapshot,bindings,policy){
  if(snapshot.gameplay_review?.version!==GAMEPLAY_COMPILER_VERSION||!Array.isArray(snapshot.gameplay_review.member_bindings)||
    !Array.isArray(bindings?.mappings)||!Array.isArray(bindings?.catalog))return false;
  try{
    const proof=mapUnique(snapshot.gameplay_review.member_bindings,'card_print_id'),catalog=mapUnique(bindings.catalog,'id');
    const active=bindings.mappings.filter(row=>row.source==='tcgdex'&&row.active);
    return snapshot.rows.filter(row=>row.playable).every(row=>{
      const member=proof.get(row.card_print_id),card=catalog.get(row.card_print_id);
      if(!member||!card||member.identity_id!==row.identity_id||member.identity_key_hash!==row.identity_key_hash||
        card.identity_id!==member.identity_id||card.identity_key_hash!==member.identity_key_hash||!card.identity_active||!card.identity_consistent||
        !card.publicly_visible||card.identity_domain!==policy.scope.identity_domain)return false;
      const owners=active.filter(owner=>owner.external_id===member.provider_card_id);
      return owners.length===1&&owners[0].card_print_id===member.card_print_id&&String(owners[0].id)===member.mapping_id&&
        active.filter(owner=>owner.card_print_id===member.card_print_id).length===1;
    });
  }catch{return false;}
}
