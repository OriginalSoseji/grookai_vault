import {readLegalityDocumentReceipt,validateLegalityDocumentScope} from './legality_documents_v1.mjs';
import {BROWSER_LEGALITY_ADAPTER,readBrowserReferenceReceipt,validateBrowserReferenceScope} from './legality_browser_reference_v1.mjs';

export function validateScopedLegalitySource(source){
  if(source.adapter==='pokemon_legality_document_v1')return validateLegalityDocumentScope(source);
  if(source.adapter===BROWSER_LEGALITY_ADAPTER)return validateBrowserReferenceScope(source);
}
export function readScopedLegalityReceipt(receipt,source,options){
  if(source.adapter==='pokemon_legality_document_v1')return readLegalityDocumentReceipt(receipt,source,options);
  if(source.adapter===BROWSER_LEGALITY_ADAPTER)return readBrowserReferenceReceipt(receipt,source,options);
}
