import {admittedSourceUrl,assert,boundedArray,digest,reviewValid,safeId,sha256,text,timestamp} from '../common.mjs';

const stripReview=review=>Object.fromEntries(Object.entries(review).filter(([key])=>!['subject_hash','status','authority','reviewed_by','reviewed_at','valid_until','basis'].includes(key)));
export const submissionPermissionSubject=source=>digest(Object.fromEntries(['id','adapter','access_method','allowed_origins','allowed_kinds','allow_ingest','allow_derived_publication',
  'retention_days','permission_reference','attribution','submission_scope'].map(key=>[key,source[key]])));
export const submittedEventSubject=capture=>digest({version:capture.version,original:capture.original,context:stripReview(capture.event_review)});

// This is an explicitly submitted artifact, never a captured HTTP response.
// A real event reference URL is retained without claiming it served these bytes.
export function createSubmittedEventProposal({source_id,original,reference_url}){
  safeId(source_id);text(original?.file_name,'SUBMISSION_FILE_NAME',200);timestamp(original.received_at);
  assert(typeof original.body_text==='string'&&sha256(original.body_text)===original.body_sha256,'SUBMISSION_ORIGINAL_HASH');
  let exported;try{exported=JSON.parse(original.body_text);}catch{assert(false,'SUBMISSION_EXPORT_JSON');}
  assert(exported?.version==='pokemon_playables_organizer_export:v1'&&exported.event?.reference_url===reference_url,'SUBMISSION_EXPORT_VERSION_OR_REFERENCE');
  const capture={version:'pokemon_playables_reviewed_event_submission:v1',origin:'submitted_file',reference_url,original:structuredClone(original),
    event_review:{event_key:null,ruleset_id:null,time_policy:'explicit_event_play_time_v1',status:'pending'}};
  return submittedEventReceipt(capture,source_id);
}

export function submittedEventReceipt(capture,source_id){
  const body_text=JSON.stringify(capture);return{id:`submitted-event-${digest({source_id,body_sha256:capture.original.body_sha256})}`,source_id,kind:'tournament',
    url:capture.reference_url,observed_at:capture.original.received_at,body_text,body_sha256:sha256(body_text)};
}

export function normalizeReviewedEventSubmission(capture,receipt,source,policy,asOf){
  assert(source.adapter==='pokemon_reviewed_event_submission_v1'&&['direct_submission','authorized_export'].includes(source.access_method)&&
    source.allowed_kinds.length===1&&source.allowed_kinds[0]==='tournament','SUBMISSION_SOURCE_REQUIRED');
  assert(reviewValid(source.review,asOf,policy)&&source.review.authority==='human_submission_permission_review'&&
    source.review.subject_hash===submissionPermissionSubject(source),'SUBMISSION_PERMISSION_REVIEW_REQUIRED');
  const scope=source.submission_scope;assert(scope?.game==='pokemon'&&scope.format==='standard'&&scope.platform==='paper'&&text(scope.region),'SUBMISSION_SOURCE_SCOPE');
  const ids=boundedArray(scope.source_event_ids,100);assert(ids.length>0&&new Set(ids).size===ids.length,'SUBMISSION_EVENT_SCOPE');ids.forEach(safeId);
  assert(scope.event_keys&&Object.keys(scope.event_keys).length===ids.length&&ids.every(id=>Object.hasOwn(scope.event_keys,id)),'SUBMISSION_EVENT_KEY_SCOPE');
  ids.forEach(id=>safeId(scope.event_keys[id]));
  assert(capture?.version==='pokemon_playables_reviewed_event_submission:v1'&&capture.origin==='submitted_file','SUBMISSION_CAPTURE_VERSION');
  const original=capture.original,review=capture.event_review;
  assert(typeof original?.body_text==='string'&&Buffer.byteLength(original.body_text)<=policy.maximum_receipt_bytes&&
    sha256(original.body_text)===original.body_sha256,'SUBMISSION_ORIGINAL_HASH');
  text(original.file_name,'SUBMISSION_FILE_NAME',200);
  assert(receipt.url===capture.reference_url&&receipt.observed_at===original.received_at&&timestamp(original.received_at)<=asOf,'SUBMISSION_RECEIVED_AT_OR_REFERENCE');
  admittedSourceUrl(source,capture.reference_url);
  assert(reviewValid(review,asOf,policy)&&review.authority==='human_evidence_review'&&review.subject_hash===submittedEventSubject(capture),
    'SUBMISSION_EVENT_REVIEW_REQUIRED');
  assert(timestamp(review.reviewed_at)>=timestamp(original.received_at),'SUBMISSION_REVIEW_PREDATES_ORIGINAL');
  safeId(review.event_key);safeId(review.ruleset_id);
  assert(review.ruleset_id===scope.ruleset_id&&review.time_policy==='explicit_event_play_time_v1','SUBMISSION_RULESET_OR_DATE_POLICY');
  let exported;try{exported=JSON.parse(original.body_text);}catch{assert(false,'SUBMISSION_EXPORT_JSON');}
  assert(exported?.version==='pokemon_playables_organizer_export:v1','SUBMISSION_EXPORT_VERSION_OR_REFERENCE');
  const event=exported.event;safeId(event?.source_event_id);
  assert(scope.event_keys[event.source_event_id]===review.event_key,'SUBMISSION_EVENT_KEY_SCOPE');
  assert(ids.includes(event.source_event_id)&&event.reference_url===capture.reference_url&&event.game===scope.game&&event.format===scope.format&&
    event.platform===scope.platform&&event.region===scope.region,'SUBMISSION_EVENT_SCOPE');
  assert(['complete','ongoing','canceled','withdrawn','unverified'].includes(event.status)&&Number.isInteger(event.revision)&&event.revision>=0,'SUBMISSION_EVENT_STATUS');
  const playedAt=timestamp(event.played_at);assert(playedAt<=timestamp(original.received_at),'SUBMISSION_FUTURE_EVENT_AT_RECEIPT');
  assert(event.participant_count===null||Number.isInteger(event.participant_count)&&event.participant_count>0,'SUBMISSION_PARTICIPANT_COUNT');
  assert(['full_field','top_cut','published_subset'].includes(event.population),'SUBMISSION_POPULATION');
  assert(event.top_cut_size===null||Number.isInteger(event.top_cut_size)&&event.top_cut_size>=0,'SUBMISSION_TOP_CUT_SIZE');
  const entries=boundedArray(exported.entries,policy.maximum_decks_per_event),entryIds=new Set();
  for(const entry of entries){safeId(entry.entry_id);assert(!entryIds.has(entry.entry_id),'SUBMISSION_DUPLICATE_ENTRY');entryIds.add(entry.entry_id);}
  assert(event.participant_count===null||entries.length<=event.participant_count,'SUBMISSION_ENTRY_COUNT_EXCEEDS_PARTICIPANTS');
  const played=new Map(),matchIds=new Set(),roundEntries=new Set();
  for(const match of boundedArray(exported.matches,policy.maximum_decks_per_event*100)){
    safeId(match.match_id);assert(!matchIds.has(match.match_id),'SUBMISSION_DUPLICATE_MATCH');matchIds.add(match.match_id);
    assert(Number.isInteger(match.phase)&&match.phase>0&&Number.isInteger(match.round)&&match.round>0,'SUBMISSION_MATCH_ROUND');
    assert(entryIds.has(match.entry1)&&(match.entry2===null||entryIds.has(match.entry2))&&match.entry1!==match.entry2,'SUBMISSION_MATCH_ENTRY');
    assert(['played','bye','no_show','unverified'].includes(match.status),'SUBMISSION_MATCH_STATUS');
    for(const id of [match.entry1,match.entry2].filter(id=>id!==null)){
      const key=`${match.phase}|${match.round}|${id}`;assert(!roundEntries.has(key),'SUBMISSION_DUPLICATE_ROUND_ENTRY');roundEntries.add(key);
    }
    if(match.status!=='played')continue;
    assert(match.entry2!==null&&['entry1_win','entry2_win','draw'].includes(match.result),'SUBMISSION_PLAYED_RESULT');
    const matchAt=timestamp(match.played_at);assert(matchAt>=playedAt&&matchAt<=timestamp(original.received_at),'SUBMISSION_PLAYED_MATCH_TIME');
    for(const id of [match.entry1,match.entry2])played.set(id,(played.get(id)??0)+1);
  }
  const decks=[];
  for(const entry of entries){
    assert(entry.placing===null||Number.isInteger(entry.placing)&&entry.placing>0,'SUBMISSION_PLACING');
    if(entry.decklist===null)continue;
    const cards=boundedArray(entry.decklist,60).map(card=>{
      assert(['pokemon','trainer','energy'].includes(card.section)&&Number.isInteger(card.quantity)&&card.quantity>0&&card.quantity<=60,'SUBMISSION_CARD_QUANTITY_OR_SECTION');
      text(card.set);text(card.number);text(card.name);return{set:card.set,number:card.number,name:card.name,quantity:card.quantity,section:card.section};
    });
    if(event.population==='top_cut')assert(event.top_cut_size>0&&entry.placing!==null&&entry.placing<=event.top_cut_size,'SUBMISSION_TOP_CUT_SCOPE');
    decks.push({entry_key:`entry-${sha256(`${source.id}|${event.source_event_id}|${entry.entry_id}`).slice(0,24)}`,placing:entry.placing,
      played_matches:played.get(entry.entry_id)??0,top_cut:event.top_cut_size===null||entry.placing===null?null:event.top_cut_size>0&&entry.placing<=event.top_cut_size,cards});
  }
  if(event.population==='full_field')assert(event.participant_count!==null&&entries.length===event.participant_count&&decks.length===event.participant_count,'SUBMISSION_FULL_FIELD_INCOMPLETE');
  return{version:'pokemon_playables_event_export:v1',events:[{event_key:review.event_key,source_event_id:event.source_event_id,revision:event.revision,status:event.status,
    game:event.game,format:event.format,ruleset_id:review.ruleset_id,played_at:event.played_at,review_valid_until:review.valid_until,online:false,participant_count:event.participant_count,population:event.population,decks}]};
}
