import {admittedSourceUrl,assert,boundedArray,digest,reviewValid,safeId,sha256,text,timestamp} from '../common.mjs';
import {hasCompletedStandings} from './limitless_v1.mjs';
import {normalizePublishedDecklists,validatePublishedDecklistSource} from './published_decklists_v1.mjs';

export const LIMITLESS_PUBLISHED_CAPTURE='pokemon_limitless_published_decklists_capture:v1';
const ORIGIN='https://play.limitlesstcg.com';
const endpoints=id=>({details:`${ORIGIN}/api/tournaments/${id}/details`,standings:`${ORIGIN}/api/tournaments/${id}/standings`,
  standings_page:`${ORIGIN}/tournament/${id}/standings`});
export const limitlessPublishedReviewSubject=capture=>{
  const {event_review,...subject}=capture;return digest(subject);
};

export function verifyLimitlessPublishedOriginals(capture,source,asOf){
  assert(/^[a-f0-9]{24}$/.test(capture.event_id),'LIMITLESS_PUBLISHED_EVENT_ID');
  const urls=endpoints(capture.event_id),keys=Object.keys(capture.originals??{});
  assert(keys.length===3&&Object.keys(urls).every(key=>keys.includes(key)),'LIMITLESS_PUBLISHED_ORIGINALS_REQUIRED');
  let latest=0,retainUntil=Infinity;
  for(const [key,url]of Object.entries(urls)){
    const original=capture.originals[key],receipt=original?.receipt;
    assert(receipt?.kind==='tournament'&&receipt.url===url&&typeof receipt.body_text==='string'&&
      sha256(receipt.body_text)===receipt.body_sha256,'LIMITLESS_PUBLISHED_ORIGINAL_HASH');
    safeId(receipt.id);safeId(receipt.source_id);
    const observed=timestamp(receipt.observed_at),until=timestamp(original.retain_until);
    assert(observed<=asOf&&until>observed,'LIMITLESS_PUBLISHED_ORIGINAL_TIME');
    if(source)admittedSourceUrl(source,url);
    latest=Math.max(latest,observed);retainUntil=Math.min(retainUntil,until);
  }
  assert(timestamp(capture.observed_at)===latest&&timestamp(capture.retain_until)===retainUntil&&retainUntil>latest,
    'LIMITLESS_PUBLISHED_RETENTION_BOUND');
}

export function limitlessPublishedReceipt(capture,source_id){
  safeId(source_id);const body_text=JSON.stringify(capture),body_sha256=sha256(body_text);
  return{id:`limitless-published-${digest({source_id,body_sha256})}`,source_id,kind:'tournament',
    url:endpoints(capture.event_id).standings_page,observed_at:capture.observed_at,retain_until:capture.retain_until,body_text,body_sha256};
}

// Repackage preserved native responses, never a fabricated publisher export.
// A proposal is intentionally unreviewed; scheduled date is not actual play time.
export function createLimitlessPublishedProposal({event_id,source_id,event_context,originals}){
  assert(event_context&&typeof event_context==='object'&&!Array.isArray(event_context),'LIMITLESS_PUBLISHED_CONTEXT');
  const rows=Object.values(originals??{});
  assert(rows.length===3,'LIMITLESS_PUBLISHED_ORIGINALS_REQUIRED');
  const capture={version:LIMITLESS_PUBLISHED_CAPTURE,transformation:'grookai_native_response_conversion_v1',event_id,
    observed_at:new Date(Math.max(...rows.map(row=>timestamp(row.receipt.observed_at)))).toISOString(),
    retain_until:new Date(Math.min(...rows.map(row=>timestamp(row.retain_until)))).toISOString(),
    event_context:structuredClone(event_context),originals:structuredClone(originals),event_review:{status:'pending'}};
  verifyLimitlessPublishedOriginals(capture,null,Number.POSITIVE_INFINITY);
  return{capture,receipt:limitlessPublishedReceipt(capture,source_id),review_subject:limitlessPublishedReviewSubject(capture)};
}

export function normalizeLimitlessPublishedDecklists(capture,receipt,source,policy,asOf){
  validatePublishedDecklistSource(source,policy,asOf);
  assert(capture?.version===LIMITLESS_PUBLISHED_CAPTURE&&capture.transformation==='grookai_native_response_conversion_v1',
    'LIMITLESS_PUBLISHED_CAPTURE_VERSION');
  verifyLimitlessPublishedOriginals(capture,source,asOf);
  assert(receipt.url===endpoints(capture.event_id).standings_page&&receipt.observed_at===capture.observed_at&&
    receipt.retain_until===capture.retain_until&&timestamp(capture.retain_until)>asOf,'LIMITLESS_PUBLISHED_RECEIPT_CONTEXT');
  const review=capture.event_review;
  assert(reviewValid(review,asOf,policy)&&review.authority==='human_evidence_review'&&
    review.subject_hash===limitlessPublishedReviewSubject(capture),'LIMITLESS_PUBLISHED_EVENT_REVIEW_REQUIRED');
  assert(timestamp(review.reviewed_at)>=timestamp(capture.observed_at),'LIMITLESS_PUBLISHED_REVIEW_PREDATES_ORIGINALS');
  const context=capture.event_context;
  assert(context.source_event_id===capture.event_id&&context.platform==='paper'&&context.status==='complete'&&
    context.publication_kind==='completed_event_decklists'&&context.date_policy==='explicit_event_play_time_v1',
    'LIMITLESS_PUBLISHED_CONTEXT');
  timestamp(context.played_at);
  let details,standings;
  try{details=JSON.parse(capture.originals.details.receipt.body_text);standings=JSON.parse(capture.originals.standings.receipt.body_text);}
  catch{assert(false,'LIMITLESS_PUBLISHED_RESPONSE_JSON');}
  assert(details?.id===capture.event_id&&details.game==='PTCG'&&details.format==='STANDARD'&&details.isOnline===false&&
    details.isPublic===true&&!details.multideck&&(!details.bannedCards||details.bannedCards.length===0)&&
    (!details.specialRules||details.specialRules.length===0),'LIMITLESS_PUBLISHED_SCOPE');
  assert(Number.isInteger(details.players)&&details.players>0&&context.participant_count===details.players,'LIMITLESS_PUBLISHED_PARTICIPANTS');
  assert(hasCompletedStandings(capture.originals.standings_page.receipt.body_text),'LIMITLESS_COMPLETION_PROOF_REQUIRED');
  const publishedAt=Math.min(timestamp(capture.originals.standings.receipt.observed_at),timestamp(capture.originals.standings_page.receipt.observed_at));
  assert(timestamp(context.played_at)<=publishedAt,'LIMITLESS_PUBLISHED_PLAY_TIME');
  const {decks,standing_entries}=readLimitlessPublishedLists(capture,policy);
  assert(standing_entries<=details.players,'LIMITLESS_PUBLISHED_ENTRY_COUNT');
  // The reviewed actual date is authoritative; details.date is only scheduling
  // metadata. Result fields and pairings are neither read nor reconstructed.
  return normalizePublishedDecklists({version:'pokemon_published_decklists:v1',publication_kind:context.publication_kind,
    events:[{...context,online:false,published_at:new Date(publishedAt).toISOString(),
      review_valid_until:new Date(Math.min(timestamp(review.valid_until),timestamp(capture.retain_until))).toISOString(),decks}]},receipt,source,policy,asOf);
}

// Data extraction for pending review tools as well as admitted normalization.
// Callers verify original hashes first. This function establishes no event,
// gameplay or legality authority and ignores result/placement fields.
export function readLimitlessPublishedLists(capture,policy){
  let standings;try{standings=JSON.parse(capture.originals.standings.receipt.body_text);}catch{assert(false,'LIMITLESS_PUBLISHED_RESPONSE_JSON');}
  const rows=boundedArray(standings,policy.maximum_decks_per_event),seen=new Set(),decks=[];
  for(const row of rows){
    const player=text(row.player);assert(!seen.has(player),'LIMITLESS_DUPLICATE_ENTRY');seen.add(player);
    if(row.decklist==null)continue;
    assert(row.decklist&&typeof row.decklist==='object'&&!Array.isArray(row.decklist),'LIMITLESS_DECK_OBJECT');
    assert(Object.keys(row.decklist).every(key=>['pokemon','trainer','energy'].includes(key)),'LIMITLESS_DECK_SECTION');
    const cards=[];
    for(const section of ['pokemon','trainer','energy'])for(const card of boundedArray(row.decklist[section]??[],60)){
      const quantity=typeof card.count==='string'&&/^\d+$/.test(card.count)?Number(card.count):card.count;
      assert(Number.isInteger(quantity)&&quantity>0&&quantity<=60,'LIMITLESS_QUANTITY');
      assert(typeof card.number==='string'||Number.isSafeInteger(card.number),'LIMITLESS_CARD_NUMBER');
      cards.push({set:text(card.set),number:text(String(card.number)),name:text(card.name),quantity,section});
    }
    assert(cards.length<=60,'LIMITLESS_DECK_CARD_BOUND');
    decks.push({entry_key:`entry-${sha256(`${capture.event_id}|${player}`).slice(0,24)}`,cards});
  }
  return{decks,standing_entries:rows.length};
}
