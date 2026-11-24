// Candidate server orchestration. The private database authority, not this
// module or the offline planner, admits and fences each provider mutation.
import {randomUUID} from 'node:crypto';
import {SquareApiError} from './client_v1.mjs';
import {squareQrSku} from './catalog_plan_v1.mjs';
import {planSquarePriceBatches, inspectSquarePriceBatchReceipt} from './catalog_price_batch_plan_v1.mjs';

const fail = code => {throw new SquareApiError(code);};
const safeCode = error => /^square_[a-z_]{1,80}$/.test(error?.code) ? error.code : 'square_batch_unconfirmed';

/** One existing connection lease, one stored parent and no parallel seller IO.
 * Recovery is always attempted, including with new admission disabled. This
 * does not allocate inventory, acknowledge POS readiness or settle a sale.
 */
export async function processSquarePriceBatch({connection, context, client, rpc, enabled = false, catalogEnabled = true}) {
  const call = (action, data = {}) => rpc('price_batch_' + action, {...context, ...data});
  const state = await call('state');
  let batch = state.pending, attempt = null;
  if (!batch) {
    if (!enabled || !catalogEnabled || !state.admissionEnabled || state.legacyPending || !state.candidates?.length) return {status:'idle', acknowledged:0};
    const scope = {ownerId:connection.owner_id,environment:connection.environment,
      merchantId:connection.merchant_id,locationId:connection.location_id};
    const rows = state.candidates;
    const catalog = await client.itemsForExactSkus(rows.map(row => squareQrSku(row.offer.gvviId)));
    const plan = planSquarePriceBatches({scope,offers:rows.map(row=>row.offer),catalog:{scope,complete:true,items:catalog},
      mappings:rows.map(row=>({scope,gvviId:row.offer.gvviId,itemId:row.target.item_id,
        variationId:row.target.variation_id,lastSyncedProjection:row.target.last_synced_projection}))});
    const prepared = plan.batches[0];
    if (!prepared) return {status:'deferred',acknowledged:0};
    const byGvvi = new Map(rows.map(row=>[row.offer.gvviId,row]));
    batch = await call('prepare',{batchId:randomUUID(),batch:prepared,requestText:JSON.stringify(prepared.request),
      bindings:prepared.members.map(member=>({targetId:byGvvi.get(member.gvviId).target.id,
        instanceId:byGvvi.get(member.gvviId).target.instance_id,
        previousObject:catalog.find(item=>item.id===member.itemId)}))});
    if (['cancelled','no_effect','succeeded'].includes(batch.status)) return {status:'deferred',acknowledged:0};
  }
  // Read every member after any previous dispatch or rejection. A known HTTP
  // rejection is not proof that all other objects remained unchanged.
  const observe = async () => {
    const items = await client.itemsForExactSkus(batch.members.map(member=>squareQrSku(member.sourceSnapshot.gvviId)));
    return call('observe',{batchId:batch.id,objects:items});
  };
  try {
    if (batch.started_at) {
      const observed = await observe();
      if (observed.status === 'succeeded') return {status:'reconciled',acknowledged:batch.members.length};
      if (observed.status === 'no_effect') return {status:'no_effect',acknowledged:0};
      batch = observed;
    }
    // Database begin independently checks flag/control policy, every original
    // source/mapping, the current lease and the 23-hour saved-key deadline.
    // A changed source may cancel only a parent that was never dispatched.
    if (!catalogEnabled) return {status:'paused',acknowledged:0};
    const begun = await call('begin',{batchId:batch.id,attemptId:randomUUID()});
    if (begun.status === 'cancelled') return {status:'cancelled',acknowledged:0};
    batch = begun.batch; attempt = begun.attempt;
    // Use the literal committed text, not a re-serialized or newly planned body.
    const response = await client.upsertPriceBatch(batch.request_text,batch.request_hash);
    // jsonb storage may reorder object keys. Reconstruct only the inspection
    // view from the immutable literal text that was actually dispatched.
    inspectSquarePriceBatchReceipt({...batch.plan,request:JSON.parse(batch.request_text)},response);
    const result = await call('observe',{batchId:batch.id,objects:response.objects});
    if (result.status !== 'succeeded') fail('square_batch_unconfirmed');
    return {status:'synced',acknowledged:batch.members.length};
  } catch (error) {
    const code = safeCode(error);
    if (attempt) {
      // Only definite 4xx provider responses classify a rejection. Any missing
      // receipt, response parse failure or database failure retains uncertainty.
      await call('failure',{batchId:batch.id,attemptId:attempt.id,errorCode:code,
        uncertain:!(error.uncertain===false && Number.isInteger(error.status) && error.status>=400 && error.status<500),
        providerStatus:Number.isInteger(error.status)?error.status:null}).catch(()=>{});
      if (!['square_rate_limited','square_authorization_required'].includes(code)) {
        try {
          const observed = await observe();
          if (observed.status==='succeeded') return {status:'reconciled',acknowledged:batch.members.length};
          if (observed.status==='no_effect') return {status:'no_effect',acknowledged:0};
        } catch { /* Retain the original error and the stored whole request. */ }
      }
    }
    if (code === 'square_batch_source_changed' || code === 'square_reconciliation_required') return {status:'review',acknowledged:0};
    throw error;
  }
}
