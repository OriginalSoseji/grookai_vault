import {admittedSourceUrl,assert,boundedArray,digest,mapUnique,safeId,sha256,text,timestamp} from './common.mjs';
import {LEGALITY_AXES,referenceReadiness,officialLegalityDocumentUrl} from './legality_reference_v1.mjs';

// Wrap exact original bytes without admitting their content or changing time.
// Live acquisition persists this wrapper before checking media/rule usability.
export function createLegalityDocumentReceipt({document_id,source_id,snapshot,id,retain_until}){
  safeId(document_id);safeId(source_id);timestamp(snapshot.observed_at);
  assert(typeof snapshot.body_base64==='string'&&snapshot.body_base64.length<=12_000_000,'LEGALITY_REFERENCE_SIZE');
  const bytes=Buffer.from(snapshot.body_base64,'base64');
  assert(bytes.toString('base64')===snapshot.body_base64&&sha256(bytes)===snapshot.body_sha256,'LEGALITY_REFERENCE_ORIGINAL_HASH');
  const body_text=JSON.stringify({version:'pokemon_playables_legality_document_capture:v1',document_id,snapshot});
  const receipt_id=id??`document-${digest({document_id,body_sha256:snapshot.body_sha256})}`;safeId(receipt_id);
  if(retain_until!==undefined)assert(timestamp(retain_until)>timestamp(snapshot.observed_at),'RECEIPT_RETENTION_BOUND');
  return{id:receipt_id,source_id,kind:'legality',url:snapshot.url,observed_at:snapshot.observed_at,body_text,body_sha256:sha256(body_text),
    ...(retain_until!==undefined?{retain_until}:{})};
}

export function validateLegalityDocumentScope(source){
  assert(source?.adapter==='pokemon_legality_document_v1'&&source.legality_evidence_role==='independent_rules'&&
    source.allowed_kinds?.length===1&&source.allowed_kinds[0]==='legality','LEGALITY_DOCUMENT_SOURCE');
  const documents=boundedArray(source.legality_documents,12);
  assert(documents.length>0&&source.review?.document_scope_hash===digest(documents),'LEGALITY_DOCUMENT_REVIEWED_SCOPE');
  mapUnique(documents,'id','LEGALITY_DOCUMENT_DUPLICATE_SCOPE');mapUnique(documents,'url','LEGALITY_DOCUMENT_DUPLICATE_SCOPE');
  for(const doc of documents){
    safeId(doc.id);const url=admittedSourceUrl(source,doc.url);
    assert(officialLegalityDocumentUrl(url)&&
      source.allowed_origins?.includes(url.origin),'LEGALITY_DOCUMENT_ORIGIN');
    assert(['html','pdf'].includes(doc.expected_media),'LEGALITY_DOCUMENT_MEDIA');
    assert(doc.scope?.game==='pokemon'&&doc.scope.format==='standard'&&doc.scope.platform==='paper','LEGALITY_DOCUMENT_TARGET_SCOPE');
    safeId(doc.scope.ruleset_id);text(doc.scope.region);
    const axes=boundedArray(doc.axes,LEGALITY_AXES.length);
    assert(['legality_evidence','discovery_only'].includes(doc.usage)&&
      (doc.usage==='discovery_only'?axes.length===0:axes.length>0)&&new Set(axes).size===axes.length&&axes.every(axis=>LEGALITY_AXES.includes(axis)),'LEGALITY_DOCUMENT_AXES');
  }
  return documents;
}

export function readLegalityDocumentReceipt(receipt,source,{asOf,axis,ruleset}={}){
  const documents=validateLegalityDocumentScope(source);
  assert(receipt.kind==='legality'&&receipt.source_id===source.id&&sha256(receipt.body_text)===receipt.body_sha256,'LEGALITY_DOCUMENT_RECEIPT');
  let capture;try{capture=JSON.parse(receipt.body_text);}catch{assert(false,'LEGALITY_DOCUMENT_CAPTURE_JSON');}
  assert(capture?.version==='pokemon_playables_legality_document_capture:v1','LEGALITY_DOCUMENT_CAPTURE_VERSION');
  const doc=documents.find(doc=>doc.id===capture.document_id);
  assert(doc&&doc.url===receipt.url&&capture.snapshot?.url===receipt.url&&capture.snapshot.observed_at===receipt.observed_at,
    'LEGALITY_DOCUMENT_CAPTURE_SCOPE');
  const readiness=referenceReadiness({id:doc.id,expected_media:doc.expected_media,snapshot:capture.snapshot},asOf);
  assert(readiness.content_available,'LEGALITY_DOCUMENT_CONTENT_UNAVAILABLE');
  assert(doc.usage==='legality_evidence','LEGALITY_DOCUMENT_DISCOVERY_ONLY');
  if(axis!==undefined)assert(doc.axes.includes(axis),'LEGALITY_DOCUMENT_AXIS_NOT_REVIEWED');
  if(ruleset)assert(Object.entries(doc.scope).every(([key,value])=>ruleset[key==='ruleset_id'?'id':key]===value),'LEGALITY_DOCUMENT_RULESET_SCOPE');
  return {...readiness,document_scope_hash:digest(doc),axes:doc.axes,scope:doc.scope,
    original_snapshot_hash:digest(capture.snapshot),legality_approved:false};
}

// Offline, pending proposals only. Capture times, status, media and original
// bytes survive unchanged. It never fetches, admits sources or writes a store.
export function buildLegalityDocumentIntake({source,snapshots,asOf}){
  timestamp(asOf);const documents=validateLegalityDocumentScope(source);
  boundedArray(snapshots,12);mapUnique(snapshots,'url','LEGALITY_DOCUMENT_DUPLICATE_SNAPSHOT');
  assert(snapshots.every(snapshot=>documents.some(doc=>doc.url===snapshot.url)),'LEGALITY_DOCUMENT_UNSCOPED_SNAPSHOT');
  const readiness=[],receipt_proposals=[];
  for(const doc of documents){
    const snapshot=snapshots.find(snapshot=>snapshot.url===doc.url);
    if(!snapshot){readiness.push({id:doc.id,url:doc.url,content_available:false,rules_admitted:false,reasons:['ORIGINAL_DOCUMENT_REQUIRED']});continue;}
    const row={...referenceReadiness({id:doc.id,expected_media:doc.expected_media,snapshot},asOf),usage:doc.usage};readiness.push(row);
    if(!row.content_available||doc.usage==='discovery_only')continue;
    const receipt=createLegalityDocumentReceipt({document_id:doc.id,source_id:source.id,snapshot});
    readLegalityDocumentReceipt(receipt,source,{asOf});receipt_proposals.push(receipt);
  }
  return {version:'pokemon_playables_legality_document_intake:v1',purpose:'offline_pre_admission_document_proposals',as_of:asOf,
    source_id:source.id,document_scope_hash:digest(documents),readiness,receipt_proposals,legal_records_admitted:0,public_rows:0};
}
