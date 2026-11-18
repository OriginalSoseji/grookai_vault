import {assert,boundedArray,digest,reviewValid,safeId,text,timestamp} from '../common.mjs';
import {DECKLIST_USAGE_BASIS,usesPublishedDecklists} from '../policy.mjs';

export function publishedDecklistPermissionSubject(source){
  const {review,...scope}=source;
  return digest({version:'pokemon_published_decklist_source_subject:v1',source:scope});
}

export function validatePublishedDecklistSource(source,policy,asOf){
  assert(usesPublishedDecklists(policy),'PUBLISHED_DECKLIST_POLICY_REQUIRED');
  assert(source.allowed_kinds.length===1&&source.allowed_kinds[0]==='tournament','PUBLISHED_DECKLIST_SOURCE_KIND');
  assert(reviewValid(source.review,asOf,policy)&&source.review.authority==='human_published_decklist_source_review'&&
    source.review.subject_hash===publishedDecklistPermissionSubject(source),'PUBLISHED_DECKLIST_PERMISSION_REVIEW_REQUIRED');
  const scope=source.decklist_scope;
  assert(scope?.game==='pokemon'&&scope.format==='standard'&&scope.platform==='paper'&&text(scope.region)!=='pending-review'&&
    scope.date_policy==='explicit_event_play_time_v1','PUBLISHED_DECKLIST_SCOPE');
  safeId(scope.ruleset_id);
  assert(scope.ruleset_id!=='pending-review','PUBLISHED_DECKLIST_SCOPE');
  const ids=boundedArray(scope.source_event_ids,100);
  assert(ids.length>0&&new Set(ids).size===ids.length,'PUBLISHED_DECKLIST_EVENT_SCOPE');ids.forEach(safeId);
  assert(scope.event_keys&&Object.keys(scope.event_keys).length===ids.length&&ids.every(id=>Object.hasOwn(scope.event_keys,id)),
    'PUBLISHED_DECKLIST_EVENT_KEYS');ids.forEach(id=>safeId(scope.event_keys[id]));
  return scope;
}

// A separately admitted publisher export. It establishes list publication,
// never match participation, a placing, or a win. No provider shape is guessed.
export function normalizePublishedDecklists(payload,receipt,source,policy,asOf){
  const scope=validatePublishedDecklistSource(source,policy,asOf),ids=scope.source_event_ids;
  assert(payload?.version==='pokemon_published_decklists:v1'&&payload.publication_kind==='completed_event_decklists',
    'PUBLISHED_DECKLIST_EXPORT_REQUIRED');
  const events=boundedArray(payload.events,policy.maximum_events).map(event=>{
    assert(ids.includes(event.source_event_id)&&event.event_key===scope.event_keys[event.source_event_id]&&
      event.game===scope.game&&event.format===scope.format&&event.online===false&&event.region===scope.region&&
      event.ruleset_id===scope.ruleset_id,'PUBLISHED_DECKLIST_EVENT_SCOPE');
    const publishedAt=timestamp(event.published_at);
    assert(timestamp(event.played_at)<=publishedAt&&publishedAt<=timestamp(receipt.observed_at)&&publishedAt<=asOf,
      'PUBLISHED_DECKLIST_PUBLICATION_TIME');
    return {...event,evidence_basis:DECKLIST_USAGE_BASIS,
      decks:boundedArray(event.decks,policy.maximum_decks_per_event).map(deck=>({entry_key:deck.entry_key,
        placing:null,top_cut:null,played_matches:null,cards:deck.cards}))};
  });
  return {version:'pokemon_playables_event_export:v1',events};
}
