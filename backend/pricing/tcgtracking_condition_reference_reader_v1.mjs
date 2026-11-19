import { VERSION, SOURCE, STAGED_STATUS, selectConditionReference } from './tcgtracking_condition_reference_v1.mjs';

// Private backend inspection API. Pass the shared backend Supabase client.
// It deliberately cannot replace get_market_pricing_read_model_v1 or Vault totals.
export async function getStagedConditionReferencesV1(client, { categoryId, groupId, requests, now }) {
  if (![categoryId,groupId].every(value=>Number.isSafeInteger(value)&&value>0) || !Array.isArray(requests) || requests.length>500) throw new Error('INVALID_BOUNDED_REFERENCE_REQUEST');
  if (!requests.length) return [];
  const {data,error}=await client.from('raw_imports')
    .select('id,normalized:payload->normalized,receipt:payload->receipt,version:payload->version')
    .eq('source',SOURCE).eq('status',STAGED_STATUS)
    .like('notes',`${VERSION}:${categoryId}:${groupId}:%`)
    .order('id',{ascending:false}).limit(1).abortSignal(AbortSignal.timeout(20000));
  if(error)throw new Error(`CONDITION_REFERENCE_READ_FAILED: ${error.code}`);
  const latest=data?.[0];
  if(latest && latest.version!==VERSION)throw new Error('CONDITION_REFERENCE_VERSION_MISMATCH');
  return requests.map(request=>({
    card_printing_id:request.cardPrintingId,condition:request.condition,
    ...selectConditionReference(latest?.normalized?.rows??[],{...request,now}),
    raw_import_id:latest?.id??null,
  }));
}
