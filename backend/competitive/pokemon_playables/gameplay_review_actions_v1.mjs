import {assert,boundedArray,digest,mapUnique,reviewValid,sha256,SHA256,timestamp,uniqueSorted} from './common.mjs';
import {validatePolicy} from './policy.mjs';
import {aliasKey} from './evidence.mjs';
import {gameplayAliasSubject,gameplayGroupSubject,gameplayMemberSubject,gameplayProviderIds} from './gameplay_decisions_v1.mjs';
import {readTcgdexProfileReceipt} from './tcgdex_profile_receipt_v1.mjs';
import {tcgdexGameplayProposal} from './cohort.mjs';
import {deckLimitSourceHints} from './deck_construction_review_v1.mjs';

// Local trusted-reviewer tooling. Hashes prevent stale edits; they do not
// authenticate reviewers. No reviewer, approval or source admission is invented.
const contextContent=context=>Object.fromEntries(['packet','sources','receipts','retain_until'].map(key=>[key,context[key]]));
export const gameplayReviewContextHash=context=>digest(contextContent(context));
const taskId=(kind,group,key=null)=>digest({kind,group_id:group.id,key});
const limitsSubject=group=>digest({group_id:group.id,metadata:group.metadata});
function targets(context,asOf){
  const at=timestamp(asOf);assert(at<timestamp(context.retain_until),'GAMEPLAY_ACTION_CONTEXT_EXPIRED');
  gameplayProviderIds(context.packet);const groups=boundedArray(context.packet.groups,500);mapUnique(groups,'id');
  const sources=mapUnique(boundedArray(context.sources,100),'id'),receipts=mapUnique(boundedArray(context.receipts,5000),'id'),rows=[];
  const requireOriginal=(ref,kind)=>{
    const receipt=receipts.get(ref?.id);
    assert(receipt&&sources.has(receipt.source_id)&&receipt.kind===kind&&SHA256.test(ref.receipt_hash)&&digest(receipt)===ref.receipt_hash&&
      typeof receipt.body_text==='string'&&sha256(receipt.body_text)===receipt.body_sha256&&timestamp(receipt.observed_at)<=at,'GAMEPLAY_ACTION_ORIGINAL_CHANGED');
    assert(!receipt.retain_until||timestamp(receipt.retain_until)>=timestamp(context.retain_until),'GAMEPLAY_ACTION_RETENTION_BOUND');
    return receipt;
  };
  const memberOwners=new Set(),aliasOwners=new Set();let aliasCount=0;
  for(const group of groups){
    assert(group.mode==='exact_source_profile'&&group.members.length>0,'GAMEPLAY_ACTION_GROUP_MODE');
    assert(group.metadata&&['pending','approved','rejected'].includes(group.review?.status),'GAMEPLAY_ACTION_GROUP_SHAPE');
    if(group.metadata.deck_limit_groups!==null){const limits=boundedArray(group.metadata.deck_limit_groups,2);
      assert(new Set(limits).size===limits.length&&limits.every(limit=>['ace_spec','radiant'].includes(limit)),'GAMEPLAY_ACTION_DECK_LIMIT_VALUE');}
    const members=group.members.map(member=>{
      assert(!memberOwners.has(member.card_print_id),'GAMEPLAY_ACTION_DUPLICATE_MEMBER');memberOwners.add(member.card_print_id);
      const original=requireOriginal(member.profile_original,'gameplay');
      const {card}=readTcgdexProfileReceipt(original,sources.get(original.source_id),{providerCardId:member.provider_card_id});
      assert(card.id===member.provider_card_id&&digest(card)===member.profile_hash&&tcgdexGameplayProposal(card).fingerprint===member.mechanics_hash,'GAMEPLAY_ACTION_PROFILE_CHANGED');
      const row={id:taskId('member',group,member.card_print_id),kind:'member',group,entity:member,subject:()=>gameplayMemberSubject(group,member),
        latest:timestamp(original.observed_at),original_refs:[member.profile_original],hints:deckLimitSourceHints(card)};rows.push(row);return row;
    });
    assert(new Set(group.members.map(member=>member.mechanics_hash)).size===1,'GAMEPLAY_ACTION_MECHANICS_CONFLICT');
    const aliases=boundedArray(group.aliases,2000).map(alias=>{
      assert(++aliasCount<=2000&&group.members.some(member=>member.card_print_id===alias.card_print_id),'GAMEPLAY_ACTION_ALIAS_SCOPE');
      const key=aliasKey(alias);assert(!aliasOwners.has(key),'GAMEPLAY_ACTION_DUPLICATE_ALIAS');aliasOwners.add(key);
      const eventRefs=boundedArray(alias.event_originals,30);assert(eventRefs.length>0,'GAMEPLAY_ACTION_ALIAS_ORIGINAL_REQUIRED');
      const originals=[requireOriginal(alias.set_original,'gameplay'),...eventRefs.map(ref=>requireOriginal(ref,'tournament'))];
      const row={id:taskId('alias',group,digest(key)),kind:'alias',group,entity:alias,subject:()=>gameplayAliasSubject(group,alias),
        latest:Math.max(...originals.map(original=>timestamp(original.observed_at))),original_refs:[alias.set_original,...eventRefs]};rows.push(row);return row;
    });
    const children=[...members,...aliases];
    rows.push({id:taskId('deck_limits',group),kind:'deck_limits',group,entity:group,subject:()=>limitsSubject(group),children,latest:0,original_refs:[]});
    rows.push({id:taskId('group',group),kind:'group',group,entity:group,subject:()=>gameplayGroupSubject(group),children,
      latest:Math.max(...children.map(child=>child.latest)),original_refs:[]});
  }
  return rows;
}

export function createGameplayReviewTasks(context,asOf){
  const rows=targets(context,asOf),tasks=rows.filter(row=>row.entity.review?.status==='pending').map(row=>({
    task_id:row.id,kind:row.kind,group_id:row.group.id,label:row.group.metadata.label,subject_hash:row.subject(),
    ...(row.kind==='member'?{card_print_id:row.entity.card_print_id,provider_card_id:row.entity.provider_card_id,source_hints:row.hints}:{}),
    ...(row.kind==='alias'?{alias_key_hash:digest(aliasKey(row.entity)),card_print_id:row.entity.card_print_id}:{}),
    ...(row.kind==='deck_limits'?{current_value:row.group.metadata.deck_limit_groups,
      source_hints:uniqueSorted(row.children.filter(child=>child.kind==='member').flatMap(child=>child.hints.hinted_deck_limit_groups)),
      absence_requires_review:true}:{}),
    ...(row.kind==='group'?{depends_on:row.children.map(child=>child.id),regenerate_after_child_decisions:true}:{}),
    original_refs:structuredClone(row.original_refs),review:{status:'pending'}}));
  const content={version:'pokemon_gameplay_review_tasks:v1',as_of:asOf,retain_until:context.retain_until,context_hash:gameplayReviewContextHash(context),
    packet_hash:digest(context.packet),tasks,summary:{groups:context.packet.groups.length,tasks:tasks.length,
      members:tasks.filter(task=>task.kind==='member').length,aliases:tasks.filter(task=>task.kind==='alias').length,
      deck_limit_choices:tasks.filter(task=>task.kind==='deck_limits').length,group_reviews:tasks.filter(task=>task.kind==='group').length},
    approvals_added:0,publication_attempted:false};
  return{...content,manifest_id:digest(content)};
}

export function applyGameplayReviewActions(context,patch,policy,asOf){
  validatePolicy(policy);const at=timestamp(asOf),baseHash=gameplayReviewContextHash(context);
  assert(patch?.version==='pokemon_gameplay_review_actions:v1'&&patch.base_context_hash===baseHash,'GAMEPLAY_ACTION_STALE_CONTEXT');
  assert(Object.keys(patch).every(key=>['version','base_context_hash','actions'].includes(key)),'GAMEPLAY_ACTION_UNEXPECTED_FIELD');
  const actions=boundedArray(patch.actions,2500);assert(actions.length>0,'GAMEPLAY_ACTIONS_REQUIRED');mapUnique(actions,'task_id','GAMEPLAY_ACTION_DUPLICATE_TARGET');
  const next=structuredClone(contextContent(context)),rows=targets(next,asOf),byId=mapUnique(rows,'id'),changes=[];
  for(const action of actions){
    const target=byId.get(action.task_id);assert(target&&target.subject()===action.expected_subject_hash,'GAMEPLAY_ACTION_SUBJECT_CHANGED');
    assert(target.entity.review?.status==='pending'&&target.group.review?.status==='pending','GAMEPLAY_ACTION_PENDING_ONLY');
    if(target.kind==='deck_limits'){
      assert(Object.keys(action).every(key=>['task_id','expected_subject_hash','deck_limit_groups'].includes(key)),'GAMEPLAY_ACTION_UNEXPECTED_FIELD');
      const limits=boundedArray(action.deck_limit_groups,2);
      assert(new Set(limits).size===limits.length&&limits.every(limit=>['ace_spec','radiant'].includes(limit)),'GAMEPLAY_ACTION_DECK_LIMIT_VALUE');
      const hints=target.children.filter(child=>child.kind==='member').map(child=>child.hints);
      assert(hints.every(hint=>hint.hinted_deck_limit_groups.every(limit=>limits.includes(limit))&&hint.unmodeled_deck_rules.length===0),'GAMEPLAY_ACTION_DECK_LIMIT_SOURCE_CONFLICT');
      target.group.metadata.deck_limit_groups=[...limits].sort();
    }else{
      assert(Object.keys(action).every(key=>['task_id','expected_subject_hash','review'].includes(key)),'GAMEPLAY_ACTION_UNEXPECTED_FIELD');
      const review=action.review;
      assert(['approved','rejected'].includes(review?.status)&&review.authority==='human_evidence_review'&&
        reviewValid({...review,status:'approved'},at,policy)&&review.subject_hash===target.subject()&&timestamp(review.reviewed_at)>=target.latest&&
        timestamp(review.valid_until)<=timestamp(next.retain_until),'GAMEPLAY_ACTION_REVIEW_INVALID');
      if(target.kind==='group'&&review.status==='approved'){
        assert(Array.isArray(target.group.metadata.deck_limit_groups)&&target.children.every(child=>
          child.entity.review?.status==='approved'&&child.entity.review.authority==='human_evidence_review'&&
          reviewValid(child.entity.review,at,policy)&&child.entity.review.subject_hash===child.subject()&&
          timestamp(review.reviewed_at)>=timestamp(child.entity.review.reviewed_at)),'GAMEPLAY_ACTION_GROUP_DEPENDENCIES');
        const hints=target.children.filter(child=>child.kind==='member').map(child=>child.hints);
        assert(hints.every(hint=>hint.hinted_deck_limit_groups.every(limit=>target.group.metadata.deck_limit_groups.includes(limit))&&
          hint.unmodeled_deck_rules.length===0),'GAMEPLAY_ACTION_DECK_LIMIT_SOURCE_CONFLICT');
      }
      target.entity.review=structuredClone(review);
    }
    changes.push({task_id:target.id,kind:target.kind,group_id:target.group.id,expected_subject_hash:action.expected_subject_hash,
      resulting_subject_hash:target.subject(),...(target.kind==='deck_limits'?{deck_limit_groups:structuredClone(target.group.metadata.deck_limit_groups)}:{review:structuredClone(target.entity.review)})});
  }
  // A child decision changes its enclosing group's subject. Ordering mistakes
  // or edits under a completed group must never leave a stale approval behind.
  assert(rows.filter(row=>row.kind!=='deck_limits'&&['approved','rejected'].includes(row.entity.review?.status)).every(row=>
    row.entity.review.subject_hash===row.subject()),'GAMEPLAY_ACTION_FINAL_SUBJECT_CHANGED');
  const result={version:'pokemon_gameplay_review_revision:v1',as_of:asOf,retain_until:next.retain_until,base_context_hash:baseHash,
    result_context_hash:gameplayReviewContextHash(next),policy_hash:digest(policy),patch_hash:digest(patch),packet:next.packet,changes,
    approvals_imported:changes.filter(change=>change.review?.status==='approved').length,
    rejections_imported:changes.filter(change=>change.review?.status==='rejected').length,
    canonical_writes:0,qualification_attempted:false,publication_attempted:false,
    limitations:['Reviewer identity and authorization remain the trusted operator boundary; hashes are not authentication.',
      'These are supplied review decisions, not source admission, legality approval or engine acceptance.',
      'The engine still requires fresh canonical bindings, admitted evidence, current legality and policy before qualification.']};
  return{...result,revision_id:digest(result)};
}
