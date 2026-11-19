import {assert,DAY_MS,sha256,timestamp} from './common.mjs';

export const LEGALITY_AXES=Object.freeze(['rotation','release','ban','reprint_errata','physical_eligibility']);

export function officialLegalityDocumentUrl(url){
  if(['www.pokemon.com','play.pokemon.com','community.pokemon.com'].includes(url.hostname))return true;
  return url.hostname==='mcdn.pokemon.com'&&!url.port&&!url.search&&!url.hash&&
    /^\/pokemon-prod\/raw\/upload\/v1\/live\/static-assets\/content-assets\/cms2\/pdf\/[A-Za-z0-9/_-]+\.pdf$/.test(url.pathname);
}

// Content availability only. Neither a valid transport nor a rule excerpt is
// an admitted source or a reviewed legality decision.
export function referenceReadiness(reference,asOf){
  const {snapshot,expected_media}=reference;
  assert(['html','pdf'].includes(expected_media),'LEGALITY_REFERENCE_MEDIA');
  assert(typeof snapshot?.body_base64==='string'&&snapshot.body_base64.length<=12_000_000,'LEGALITY_REFERENCE_SIZE');
  const bytes=Buffer.from(snapshot.body_base64,'base64');
  assert(bytes.toString('base64')===snapshot.body_base64&&sha256(bytes)===snapshot.body_sha256,'LEGALITY_REFERENCE_ORIGINAL_HASH');
  const url=new URL(snapshot.url);
  assert(url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&
    officialLegalityDocumentUrl(url),'LEGALITY_REFERENCE_ORIGIN');
  assert(timestamp(snapshot.observed_at)<=timestamp(asOf),'LEGALITY_REFERENCE_FUTURE');
  const mime=String(snapshot.content_type??'').split(';')[0].trim().toLowerCase(),body=bytes.toString('utf8');
  const reasons=[];
  if(snapshot.http_status!==200)reasons.push('REFERENCE_HTTP_FAILURE');
  if(timestamp(asOf)>=timestamp(snapshot.observed_at)+DAY_MS)reasons.push('REFERENCE_STALE');
  if(expected_media==='pdf'&&(mime!=='application/pdf'||bytes.subarray(0,5).toString()!=='%PDF-'))reasons.push('REFERENCE_MEDIA_MISMATCH');
  if(expected_media==='html'&&(mime!=='text/html'||!/<(?:!doctype\s+html|html)\b/i.test(body)))reasons.push('REFERENCE_MEDIA_MISMATCH');
  if((bytes.length<4096&&/<iframe\b/i.test(body))||/<title[^>]*>\s*(?:just a moment|access denied|verify you are human)/i.test(body))reasons.push('REFERENCE_CHALLENGE_OR_INTERSTITIAL');
  return {id:reference.id,url:snapshot.url,observed_at:snapshot.observed_at,body_sha256:snapshot.body_sha256,expected_media,
    actual_media:mime,http_status:snapshot.http_status,original_verified:true,content_available:reasons.length===0,
    rules_admitted:false,reasons:[...new Set(reasons)].sort()};
}
