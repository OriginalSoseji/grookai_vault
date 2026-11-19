import {admittedSourceUrl,assert,digest,EngineError,safeId,sha256,timestamp} from '../common.mjs';
import {prepareEvidence} from '../evidence.mjs';
import {validatePolicy} from '../policy.mjs';
import {createLegalityDocumentReceipt,readLegalityDocumentReceipt,validateLegalityDocumentScope} from '../legality_documents_v1.mjs';

export async function captureLegalityDocument({request,source,policy,observedAt,fetchImpl=globalThis.fetch,onSnapshot}){
  const at=timestamp(observedAt);validatePolicy(policy);
  prepareEvidence({version:'pokemon_playables_input:v1',sources:[source],receipts:[]},policy,at,'shadow');
  const documents=validateLegalityDocumentScope(source);safeId(request.id);safeId(request.document_id);
  assert(request.adapter==='pokemon_legality_document_v1'&&request.kind==='legality'&&
    (request.source_id===undefined||request.source_id===source.id),'LEGALITY_DOCUMENT_ACQUISITION_SCOPE');
  const doc=documents.find(doc=>doc.id===request.document_id&&doc.url===request.url);
  assert(doc&&doc.usage==='legality_evidence','LEGALITY_DOCUMENT_ACQUISITION_SCOPE');
  if(request.retain_until!==undefined)assert(timestamp(request.retain_until)>at,'RECEIPT_RETENTION_BOUND');
  assert(typeof onSnapshot==='function','LEGALITY_DOCUMENT_DURABLE_SINK_REQUIRED');
  const url=admittedSourceUrl(source,request.url);
  let response;
  try{response=await fetchImpl(url.href,{method:'GET',redirect:'error',signal:AbortSignal.timeout(20_000),
    headers:{Accept:doc.expected_media==='pdf'?'application/pdf':'text/html','User-Agent':'grookai-vault-playables/1.0'}});}
  catch{throw new EngineError('SOURCE_TRANSPORT_FAILURE');}
  const cancel=async()=>{await response.body?.cancel().catch(()=>{});};
  if(response.redirected||response.url&&response.url!==url.href){await cancel();throw new EngineError('LEGALITY_DOCUMENT_REDIRECT_FORBIDDEN');}
  const contentType=response.headers.get('content-type')??'';
  if(contentType.length>300){await cancel();throw new EngineError('LEGALITY_DOCUMENT_CONTENT_TYPE_BOUND');}
  const snapshot={url:url.href,observed_at:observedAt,http_status:response.status,content_type:contentType,body_base64:'',body_sha256:sha256(Buffer.alloc(0))};
  const wrap=()=>createLegalityDocumentReceipt({document_id:doc.id,source_id:source.id,snapshot,id:request.id,retain_until:request.retain_until});
  const overhead=Buffer.byteLength(wrap().body_text),rawLimit=Math.min(8*1024*1024,Math.floor((policy.maximum_receipt_bytes-overhead)/4)*3);
  if(rawLimit<1){await cancel();throw new EngineError('RECEIPT_SIZE');}
  const contentLength=Number(response.headers.get('content-length'));
  if(Number.isFinite(contentLength)&&contentLength>rawLimit){await cancel();throw new EngineError('RECEIPT_SIZE');}
  const chunks=[];let size=0;
  try{if(response.body)for await(const chunk of response.body){size+=chunk.byteLength;assert(size<=rawLimit,'RECEIPT_SIZE');chunks.push(Buffer.from(chunk));}}
  catch(error){if(error instanceof EngineError)throw error;throw new EngineError('SOURCE_TRANSPORT_FAILURE');}
  const bytes=Buffer.concat(chunks);snapshot.body_base64=bytes.toString('base64');snapshot.body_sha256=sha256(bytes);
  const receipt=wrap();assert(Buffer.byteLength(receipt.body_text)<=policy.maximum_receipt_bytes,'RECEIPT_SIZE');
  // HTTP failures, challenges and wrong media are still original observations.
  // They must be durable before rejection, and never reach admitted input.
  await onSnapshot(receipt,source);
  if(response.status!==200){
    const failure=new EngineError(response.status===429?'SOURCE_RATE_LIMITED':'SOURCE_HTTP_FAILURE'),retryAfter=response.headers.get('retry-after');
    failure.acquisition={request_fingerprint:digest({id:request.id,source_id:source.id,url:url.href}),http_status:response.status,
      retryable:[408,425,429,500,502,503,504].includes(response.status),
      ...(/^\d{1,5}$/.test(retryAfter??'')?{retry_after_seconds:Number(retryAfter)}:{})};throw failure;
  }
  readLegalityDocumentReceipt(receipt,source,{asOf:observedAt});
  return{receipt,acquisition_hash:digest(receipt),receipt_persisted:true};
}
