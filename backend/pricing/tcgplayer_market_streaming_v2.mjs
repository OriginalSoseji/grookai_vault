import {readMarketLedgerBatchesV1} from './tcgplayer_market_streaming_v1.mjs';
import {readMarketCursorBatchesV1} from './market_pipeline_cursors_v1.mjs';
export {createCandidateStreamReconcilerV1} from './tcgplayer_market_streaming_v1.mjs';

export async function* readMarketLedgerBatchesV2(client,kind,runId,batchSize=1000){
 if(kind==='decisions'){yield* readMarketLedgerBatchesV1(client,kind,runId,batchSize);return;}
 if(kind!=='candidates')throw Error('Invalid ledger paging configuration');
 const seen=new Set();
 for await(const rows of readMarketCursorBatchesV1(client,{query:'select id,candidate_payload,source_product_id,source_subtype_name,source_observation_id from public.market_price_pipeline_candidates where run_id=$1 order by source_product_id,source_subtype_name,source_observation_id',values:[runId],batchSize})){
  for(const row of rows){if(!row.id||!row.source_observation_id||row.source_product_id==null||row.source_subtype_name==null||seen.has(row.source_observation_id))throw Error('Invalid or duplicate ledger identity');seen.add(row.source_observation_id);}
  yield rows;
 }
}

export function marketLedgerRowsV2(client,kind,runId){return{async *[Symbol.asyncIterator](){for await(const rows of readMarketLedgerBatchesV2(client,kind,runId))yield* rows;}};}
