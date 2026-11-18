import {admittedSourceUrl,assert,boundedArray,digest,httpsUrl,reviewValid,safeFailure,safeId,sha256,text,timestamp} from '../common.mjs';
import {normalizePublishedDecklists,validatePublishedDecklistSource} from './published_decklists_v1.mjs';

export const DECKLIST_TEXT_PARSER='pokemon_headed_decklist_text:v1';
const CAPTURE_VERSION='pokemon_playables_decklist_text_submission:v1';

// Syntax only: coordinates and names remain source strings. No name-only,
// regulation, artwork or in-game ALT-to-physical identity inference occurs.
export function parseDecklistText(body){
  assert(typeof body==='string'&&Buffer.byteLength(body)<=256*1024,'DECKLIST_TEXT_SIZE');
  const lines=body.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);assert(lines.length<=200,'DECKLIST_TEXT_LINE_LIMIT');
  const cards=[],sections=new Set();let section=null,declaredTotal=null,ended=false;
  for(const raw of lines){
    const line=raw.trim();if(!line)continue;
    const heading=line.normalize('NFD').replace(/\p{M}/gu,'').match(/^(Pokemon|Trainers?|Energ(?:y|ies)):\s*(\d{1,2})?$/i);
    if(heading){
      assert(!ended,'DECKLIST_TEXT_AFTER_TOTAL');
      section=/^pokemon$/i.test(heading[1])?'pokemon':/^trainer/i.test(heading[1])?'trainer':'energy';
      assert(!sections.has(section),'DECKLIST_TEXT_DUPLICATE_SECTION');sections.add(section);continue;
    }
    const total=line.match(/^Total Cards:\s*(\d{1,3})$/i);
    if(total){assert(!ended,'DECKLIST_TEXT_DUPLICATE_TOTAL');declaredTotal=Number(total[1]);ended=true;continue;}
    assert(section&&!ended,'DECKLIST_TEXT_SECTION_REQUIRED');
    const match=line.match(/^([1-9]\d?)\s+(.+?)\s+([A-Za-z0-9][A-Za-z0-9.-]{0,15})\s+([A-Za-z]{0,5}\d{1,5}[A-Za-z]?)$/u);
    assert(match&&Number(match[1])<=60,'DECKLIST_TEXT_EXACT_COORDINATES_REQUIRED');
    assert(!/ALT$/i.test(match[3]),'DECKLIST_TEXT_NONPHYSICAL_ALT_COORDINATE');
    cards.push({quantity:Number(match[1]),name:text(match[2]),set:match[3],number:match[4],section});
    assert(cards.length<=60,'DECKLIST_TEXT_CARD_LINE_LIMIT');
  }
  assert(cards.length>0,'DECKLIST_TEXT_EMPTY');
  const totalQuantity=cards.reduce((sum,card)=>sum+card.quantity,0);
  assert(declaredTotal===null||declaredTotal===totalQuantity,'DECKLIST_TEXT_TOTAL_MISMATCH');
  return{parser_version:DECKLIST_TEXT_PARSER,cards,total_quantity:totalQuantity,declared_total:declaredTotal};
}

function validateOriginals(capture,maxBytes=8*1024*1024){
  timestamp(capture.received_at);const ids=new Set();let bytes=0;
  const originals=boundedArray(capture.originals,100);assert(originals.length>0,'DECKLIST_TEXT_ORIGINALS_REQUIRED');
  for(const original of originals){
    safeId(original.entry_key);assert(!ids.has(original.entry_key),'DECKLIST_TEXT_DUPLICATE_ENTRY');ids.add(original.entry_key);
    text(original.file_name,'DECKLIST_TEXT_FILE_NAME',200);
    assert(original.received_at===capture.received_at,'DECKLIST_TEXT_ORIGINAL_RECEPTION');
    assert(typeof original.body_text==='string'&&sha256(original.body_text)===original.body_sha256,'DECKLIST_TEXT_ORIGINAL_HASH');
    bytes+=Buffer.byteLength(original.body_text);assert(bytes<=maxBytes,'DECKLIST_TEXT_BATCH_SIZE');
  }
  return originals;
}

export const decklistTextReviewSubject=capture=>digest({version:capture.version,origin:capture.origin,
  parser_version:capture.parser_version,reference_url:capture.reference_url,received_at:capture.received_at,
  event_context:capture.event_context,originals:capture.originals});

export function decklistTextReceipt(capture,source_id){
  safeId(source_id);const body_text=JSON.stringify(capture),body_sha256=sha256(body_text);
  return{id:`decklist-text-${digest({source_id,body_sha256})}`,source_id,kind:'tournament',url:capture.reference_url,
    observed_at:capture.received_at,body_text,body_sha256};
}

export function createDecklistTextProposal({source_id,reference_url,received_at,event_context,originals}){
  safeId(source_id);httpsUrl(reference_url);assert(event_context&&typeof event_context==='object'&&!Array.isArray(event_context),'DECKLIST_TEXT_CONTEXT_REQUIRED');
  safeId(event_context.source_event_id);
  const capture={version:CAPTURE_VERSION,origin:'submitted_text_files',parser_version:DECKLIST_TEXT_PARSER,reference_url,received_at,
    event_context:structuredClone(event_context),originals:structuredClone(originals),event_review:{status:'pending'}};
  validateOriginals(capture);
  const previews=capture.originals.map(original=>{
    try{const parsed=parseDecklistText(original.body_text);return{entry_key:original.entry_key,status:'parsed',
      card_lines:parsed.cards.length,total_quantity:parsed.total_quantity};}
    catch(error){return{entry_key:original.entry_key,status:'review_required',...safeFailure(error)};}
  });
  return{capture,previews,receipt:decklistTextReceipt(capture,source_id)};
}

export function normalizeDecklistTextSubmission(capture,receipt,source,policy,asOf){
  validatePublishedDecklistSource(source,policy,asOf);
  assert(capture?.version===CAPTURE_VERSION&&capture.origin==='submitted_text_files'&&capture.parser_version===DECKLIST_TEXT_PARSER,
    'DECKLIST_TEXT_CAPTURE_VERSION');
  assert(receipt.url===capture.reference_url&&receipt.observed_at===capture.received_at&&timestamp(capture.received_at)<=asOf,
    'DECKLIST_TEXT_RECEIPT_CONTEXT');admittedSourceUrl(source,capture.reference_url);
  const originals=validateOriginals(capture,Math.min(policy.maximum_receipt_bytes,8*1024*1024)),review=capture.event_review;
  assert(reviewValid(review,asOf,policy)&&review.authority==='human_evidence_review'&&
    review.subject_hash===decklistTextReviewSubject(capture),'DECKLIST_TEXT_EVENT_REVIEW_REQUIRED');
  assert(timestamp(review.reviewed_at)>=timestamp(capture.received_at),'DECKLIST_TEXT_REVIEW_PREDATES_RECEIPT');
  const context=capture.event_context;
  assert(context&&context.platform==='paper'&&context.publication_kind==='completed_event_decklists','DECKLIST_TEXT_PUBLICATION_CONTEXT');
  // Transformation output is internal. The receipt still contains the actual
  // text originals and reviewed context, not a fabricated publisher JSON file.
  return normalizePublishedDecklists({version:'pokemon_published_decklists:v1',publication_kind:context.publication_kind,
    events:[{...context,review_valid_until:review.valid_until,decks:originals.map(original=>({entry_key:original.entry_key,
      cards:parseDecklistText(original.body_text).cards}))}]},receipt,source,policy,asOf);
}
