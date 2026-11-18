import {admittedSourceUrl,assert,boundedArray,digest,mapUnique,safeFailure,safeId,sha256,stableJson,text,timestamp} from './common.mjs';
import {createRotationAnnouncementCandidate,ROTATION_2026_URL} from './rotation_announcement_candidate_v1.mjs';
import {createStandardBanReference,OFFICIAL_BAN_LIST_URL} from './standard_ban_reference_v1.mjs';

export const BROWSER_LEGALITY_ADAPTER='pokemon_legality_browser_reference_v1';
const TYPES={rotation_announcement_v1:{url:ROTATION_2026_URL,axis:'rotation',read:createRotationAnnouncementCandidate},standard_bans_v1:{url:OFFICIAL_BAN_LIST_URL,axis:'ban',read:createStandardBanReference}};
export function validateBrowserReferenceScope(source){
  assert(source?.adapter===BROWSER_LEGALITY_ADAPTER&&source.legality_evidence_role==='independent_rules'&&source.allowed_kinds?.length===1&&source.allowed_kinds[0]==='legality','LEGALITY_BROWSER_SOURCE');
  const refs=boundedArray(source.browser_references,8);assert(refs.length>0&&source.review?.browser_scope_hash===digest(refs),'LEGALITY_BROWSER_REVIEWED_SCOPE');
  mapUnique(refs,'id');mapUnique(refs,'url');
  for(const ref of refs){safeId(ref.id);const spec=Object.hasOwn(TYPES,ref.type)?TYPES[ref.type]:null;
    assert(spec&&ref.url===spec.url&&admittedSourceUrl(source,ref.url).href===ref.url,'LEGALITY_BROWSER_ORIGIN_OR_TYPE');
    assert(ref.axes?.length===1&&ref.axes[0]===spec.axis,'LEGALITY_BROWSER_AXES');
    assert(ref.scope?.game==='pokemon'&&ref.scope.format==='standard'&&ref.scope.platform==='paper','LEGALITY_BROWSER_TARGET_SCOPE');
    safeId(ref.scope.ruleset_id);text(ref.scope.region);
    assert(Object.keys(ref.scope).every(key=>['game','format','platform','region','ruleset_id'].includes(key)),'LEGALITY_BROWSER_TARGET_SCOPE');
  }return refs;
}
export function createBrowserReferenceReceipt({source,entry,retain_until}){
  const refs=validateBrowserReferenceScope(source),ref=refs.find(ref=>ref.id===entry.reference_id);assert(ref,'LEGALITY_BROWSER_UNSCOPED_CAPTURE');
  const capture=entry.capture;assert(capture?.resolved_url===ref.url,'LEGALITY_BROWSER_CAPTURE_SCOPE');
  const cap=new Date(Math.min(timestamp(capture.retain_until),timestamp(retain_until))).toISOString();assert(timestamp(cap)>timestamp(capture.observed_at),'LEGALITY_BROWSER_RETENTION');
  const body_text=stableJson({version:'pokemon_legality_browser_capture:v1',reference_id:ref.id,capture,anchor:entry.anchor});
  assert(Buffer.byteLength(body_text)<=192*1024,'LEGALITY_BROWSER_RECEIPT_SIZE');
  return{id:`browser-reference-${digest({reference_id:ref.id,capture_hash:digest(capture)})}`,source_id:source.id,kind:'legality',url:ref.url,
    observed_at:capture.observed_at,body_text,body_sha256:sha256(body_text),retain_until:cap};
}
export function readBrowserReferenceReceipt(receipt,source,{asOf,axis,ruleset}={}){
  const refs=validateBrowserReferenceScope(source);
  assert(receipt.kind==='legality'&&receipt.source_id===source.id&&typeof receipt.body_text==='string'&&Buffer.byteLength(receipt.body_text)<=192*1024&&sha256(receipt.body_text)===receipt.body_sha256,'LEGALITY_BROWSER_RECEIPT');
  let body;try{body=JSON.parse(receipt.body_text);}catch{assert(false,'LEGALITY_BROWSER_CAPTURE_JSON');}
  assert(body?.version==='pokemon_legality_browser_capture:v1','LEGALITY_BROWSER_CAPTURE_VERSION');
  const ref=refs.find(ref=>ref.id===body.reference_id);
  assert(ref&&receipt.url===ref.url&&body.capture?.resolved_url===ref.url&&receipt.observed_at===body.capture.observed_at,'LEGALITY_BROWSER_CAPTURE_SCOPE');
  assert(timestamp(receipt.retain_until)<=timestamp(body.capture.retain_until)&&timestamp(receipt.retain_until)>timestamp(asOf),'LEGALITY_BROWSER_RETENTION');
  const parsed=TYPES[ref.type].read({capture:body.capture,anchor:body.anchor},asOf);
  if(axis!==undefined)assert(ref.axes.includes(axis),'LEGALITY_BROWSER_AXIS_NOT_REVIEWED');
  if(ruleset)assert(Object.entries(ref.scope).every(([key,value])=>ruleset[key==='ruleset_id'?'id':key]===value),'LEGALITY_BROWSER_RULESET_SCOPE');
  return{capture_kind:body.capture.capture_kind,is_original_http_response:false,original_capture_hash:digest(body.capture),reference_scope_hash:digest(ref),
    axes:ref.axes,scope:ref.scope,parsed_reference:parsed,historical_effective_period_established:false,legality_approved:false};
}

// Pre-admission, local intake only. It preserves actual observation times and
// browser artifacts, and cannot activate source admission or fetch a page.
export function buildBrowserReferenceIntake({source,entries,retain_until},asOf){
  const refs=validateBrowserReferenceScope(source),at=timestamp(asOf);assert(at<timestamp(retain_until),'LEGALITY_BROWSER_INTAKE_EXPIRED');
  boundedArray(entries,8);mapUnique(entries,'reference_id');assert(entries.every(entry=>refs.some(ref=>ref.id===entry.reference_id)),'LEGALITY_BROWSER_UNSCOPED_CAPTURE');
  let until=timestamp(retain_until);
  for(const entry of entries){assert(timestamp(entry.capture.retain_until)>at,'LEGALITY_BROWSER_INTAKE_EXPIRED');until=Math.min(until,timestamp(entry.capture.retain_until));}
  const cap=new Date(until).toISOString(),receipt_proposals=[],readiness=[];
  for(const ref of refs){
    const entry=entries.find(entry=>entry.reference_id===ref.id);
    if(!entry){readiness.push({id:ref.id,content_available:false,error_code:'LEGALITY_BROWSER_ORIGINAL_REQUIRED'});continue;}
    try{const receipt=createBrowserReferenceReceipt({source,entry,retain_until:cap});readBrowserReferenceReceipt(receipt,source,{asOf});
      receipt_proposals.push(receipt);readiness.push({id:ref.id,content_available:true,capture_kind:entry.capture.capture_kind,is_original_http_response:false});
    }catch(error){readiness.push({id:ref.id,content_available:false,...safeFailure(error)});}
  }
  const result={version:'pokemon_legality_browser_intake:v1',purpose:'offline_pre_admission_browser_reference_proposals',as_of:asOf,retain_until:cap,
    source_id:source.id,browser_scope_hash:digest(refs),receipt_proposals,readiness,source_admitted:false,legality_approvals:0,legal_records_admitted:0,
    source_requests:0,qualification_attempted:false,publication_attempted:false};return{...result,intake_id:digest(result)};
}
