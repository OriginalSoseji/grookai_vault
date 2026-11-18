import {assert,boundedArray,collectorNumber,digest,mapUnique,normalize,sha256,SHA256,timestamp,uniqueSorted,UUID} from './common.mjs';
import {readTcgdexProfileReceipt} from './tcgdex_profile_receipt_v1.mjs';
import {tcgdexGameplayProposal} from './cohort.mjs';
import {catalogSourceNameMatches} from '../../catalog/catalog_source_name_binding_v1.mjs';

// Positive source hints are guards against dropping a restriction, not authority
// for complete printed rules or for absence of other restrictions.
export function deckLimitSourceHints(card){
  const signals=[],unmodeled=[];
  const add=(restriction,field,value)=>signals.push({restriction,field,value});
  if(normalize(card.rarity)==='ace spec rare')add('ace_spec','rarity',card.rarity);
  if(card.category==='Pokemon'&&/^Radiant /u.test(card.name))add('radiant','name',card.name);
  const ruleText=boundedArray(card.rules??[],64);
  for(const [index,value]of ruleText.entries()){
    assert(typeof value==='string','DECK_CONSTRUCTION_RULE_SHAPE');
    const field=`rules[${index}]`,line=normalize(value),ace=/\bace[ -]?spec\b/u.test(line),radiant=/\bradiant pok[eé]mon\b/u.test(line);
    if(ace)add('ace_spec',field,value);
    if(radiant)add('radiant',field,value);
    // Exceptions outside the engine's modeled shared limits require a model
    // change; a reviewed empty array must not erase them.
    if(/\bdeck\b/u.test(line)&&/\b(?:copies|copy|number|only|limit)\b|more than|can[’']?t|cannot/u.test(line)&&!ace&&!radiant)
      unmodeled.push({field,value});
  }
  return{hinted_deck_limit_groups:uniqueSorted(signals.map(signal=>signal.restriction)),signals,
    unmodeled_deck_rules:unmodeled,rules_field_state:!Object.hasOwn(card,'rules')?'absent':card.rules===null?'null':ruleText.length?'present':'empty',
    complete_classification:false,review:{status:'pending'}};
}

export function buildDeckConstructionReview({workset,current_bindings},asOf){
  const at=timestamp(asOf),{workset_id,...content}=workset;
  assert(workset.version==='pokemon_pending_reprint_links:v1'&&SHA256.test(workset_id)&&digest(content)===workset_id,'DECK_CONSTRUCTION_WORKSET_CHANGED');
  assert(timestamp(workset.as_of)<=at&&at<timestamp(workset.retain_until),'DECK_CONSTRUCTION_WORKSET_EXPIRED');
  const groups=boundedArray(workset.packet.groups,500),members=groups.flatMap(group=>boundedArray(group.members,500));
  assert(members.length>0&&members.length<=500&&groups.every(group=>group.mode==='exact_source_profile'),'DECK_CONSTRUCTION_MEMBER_SCOPE');
  mapUnique(groups,'id');mapUnique(members,'card_print_id');mapUnique(members,'provider_card_id');
  const catalog=mapUnique(current_bindings.catalog,'id'),active=current_bindings.mappings.filter(mapping=>mapping.source==='tcgdex'&&mapping.active===true);
  const sources=mapUnique(workset.sources,'id'),receipts=mapUnique(workset.receipts,'id');let until=timestamp(workset.retain_until);
  const rows=groups.map(group=>{
    const profiles=group.members.map(member=>{
      const owners=active.filter(mapping=>mapping.external_id===member.provider_card_id),owner=owners[0],card=catalog.get(member.card_print_id);
      assert(owners.length===1&&owner.card_print_id===member.card_print_id&&String(owner.id)===member.mapping_id&&
        active.filter(mapping=>mapping.card_print_id===member.card_print_id).length===1&&card&&UUID.test(card.identity_id)&&SHA256.test(card.identity_key_hash)&&
        card.identity_id===member.identity_id&&card.identity_key_hash===member.identity_key_hash&&card.identity_active===true&&card.identity_consistent===true&&
        card.publicly_visible===true&&card.identity_domain==='pokemon_eng_standard','DECK_CONSTRUCTION_BINDING_DRIFT');
      const receipt=receipts.get(member.profile_original.id),source=receipt&&sources.get(receipt.source_id);
      assert(receipt&&source&&receipt.kind==='gameplay'&&digest(receipt)===member.profile_original.receipt_hash&&
        sha256(receipt.body_text)===receipt.body_sha256&&timestamp(receipt.observed_at)<=at,'DECK_CONSTRUCTION_ORIGINAL_CHANGED');
      if(receipt.retain_until){assert(timestamp(receipt.retain_until)>at,'DECK_CONSTRUCTION_ORIGINAL_EXPIRED');until=Math.min(until,timestamp(receipt.retain_until));}
      const {card:profile}=readTcgdexProfileReceipt(receipt,source,{providerCardId:member.provider_card_id}),proposal=tcgdexGameplayProposal(profile);
      assert(profile.id===member.provider_card_id&&digest(profile)===member.profile_hash&&proposal.fingerprint===member.mechanics_hash,'DECK_CONSTRUCTION_PROFILE_CHANGED');
      assert(catalogSourceNameMatches(card,profile.name,owner)&&normalize(card.set_code)===normalize(profile.set.id)&&
        collectorNumber(card.number)===collectorNumber(profile.localId),'DECK_CONSTRUCTION_COORDINATE_CONFLICT');
      return{provider_card_id:member.provider_card_id,card_print_id:member.card_print_id,identity_id:member.identity_id,identity_key_hash:member.identity_key_hash,
        profile_original:structuredClone(member.profile_original),profile_hash:member.profile_hash,mechanics_hash:member.mechanics_hash,...deckLimitSourceHints(profile)};
    });
    assert(new Set(profiles.map(profile=>profile.mechanics_hash)).size===1,'DECK_CONSTRUCTION_GROUP_MECHANICS_CONFLICT');
    const hinted=uniqueSorted(profiles.flatMap(profile=>profile.hinted_deck_limit_groups));
    return{group_id:group.id,group_hash:digest(group),label:group.metadata.label,current_deck_limit_groups:structuredClone(group.metadata.deck_limit_groups),
      hinted_deck_limit_groups:hinted,suggested_deck_limit_groups:hinted.length?hinted:null,
      classification_state:profiles.some(profile=>profile.unmodeled_deck_rules.length)?'unmodeled_rule_review_required':hinted.length?'positive_source_hint_review_required':'absence_review_required',
      profiles,review:{status:'pending'}};
  }).sort((a,b)=>a.group_id.localeCompare(b.group_id));
  const result={version:'pokemon_deck_construction_review:v1',purpose:'private_source_hints_only',as_of:asOf,retain_until:new Date(until).toISOString(),
    base_workset_id:workset_id,gameplay_packet_hash:digest(workset.packet),current_bindings_hash:digest(current_bindings),rows,
    summary:{groups:rows.length,members:members.length,groups_with_positive_hints:rows.filter(row=>row.hinted_deck_limit_groups.length).length,
      ace_spec_hinted_groups:rows.filter(row=>row.hinted_deck_limit_groups.includes('ace_spec')).length,
      radiant_hinted_groups:rows.filter(row=>row.hinted_deck_limit_groups.includes('radiant')).length,
      groups_requiring_absence_review:rows.filter(row=>row.classification_state==='absence_review_required').length,
      groups_with_unmodeled_rules:rows.filter(row=>row.classification_state==='unmodeled_rule_review_required').length,
      members_with_absent_rules:rows.flatMap(row=>row.profiles).filter(profile=>profile.rules_field_state==='absent').length},
    approvals_added:0,canonical_writes:0,qualification_attempted:false,
    limitations:['Positive source hints do not prove complete printed rules, equivalence, legality or artwork.',
      'Missing hints and absent/null/empty rules never establish an empty restriction classification.',
      'Review output does not modify the gameplay packet or renew any source review.']};
  return{...result,report_id:digest(result)};
}
