/** Pure bulk packaging of already reviewed evidence. Never creates a review,
 * changes printing facts, selects an unreviewed subset, or authorizes execution. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freezeMasterMappingAuthority } from './master_index_mapping_authority_v1.mjs';
import { TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1 } from './tcgplayer_market_exact_mapping_apply_policy_v1.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value!==null && typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;

export function buildPricingCompletionMappingAuthorityBatchesV1({candidates,scopes,batchSize=TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1}={}) {
  assert.ok(Array.isArray(candidates) && candidates.length>0,'nonempty_candidate_selection_required');
  assert.ok(Array.isArray(scopes) && scopes.length>0,'already_reviewed_scopes_required');
  assert.ok(Number.isSafeInteger(batchSize) && batchSize>0 && batchSize<=TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1,'batch_size_outside_executor_limit');
  // Crucially validate every candidate and global parent/product uniqueness before
  // splitting: a collision across batch boundaries must never become two writes.
  const selected=[...candidates].sort((a,b)=>Number(a.source_product_id)-Number(b.source_product_id)
    || String(a.candidate_fingerprint).localeCompare(String(b.candidate_fingerprint)));
  const orderedScopes=[...scopes].sort((a,b)=>String(a.manifest.authority.set_id).localeCompare(String(b.manifest.authority.set_id)));
  const whole=freezeMasterMappingAuthority(selected,orderedScopes);
  const batches=[];
  for(let offset=0;offset<selected.length;offset+=batchSize) {
    const rows=selected.slice(offset,offset+batchSize);
    const setIds=new Set(rows.map(row=>row.target.set_id));
    const usedScopes=orderedScopes.filter(scope=>setIds.has(scope.manifest.authority.set_id));
    const authority=freezeMasterMappingAuthority(rows,usedScopes);
    const selectedJsonl=rows.map(row=>JSON.stringify(canonical(row))).join('\n')+'\n';
    const authorityJson=JSON.stringify(canonical(authority),null,2)+'\n';
    batches.push({index:batches.length+1,selectedCandidates:structuredClone(rows),selectedJsonl,authority,authorityJson,
      receipt:{version:'PRICING_COMPLETION_MAPPING_AUTHORITY_BATCH_RECEIPT_V1',selected_count:rows.length,
        selected_file_sha256:digest(selectedJsonl),authority_file_sha256:digest(authorityJson),
        authority_fingerprint:authority.fingerprint,candidate_fingerprints:[...authority.candidate_fingerprints],
        scope_count:usedScopes.length,review_records_issued:0,execution_authorized:false,database_writes:0}});
  }
  return {version:'PRICING_COMPLETION_MAPPING_AUTHORITY_BATCHES_V1',preparationOnly:true,executionAuthorized:false,
    databaseWrites:0,reviewRecordsIssued:0,selectedCount:selected.length,batchSize,batchCount:batches.length,
    wholeSelectionAuthorityFingerprint:whole.fingerprint,candidateFingerprints:[...whole.candidate_fingerprints],
    batches,nextGate:'Independent bounded execution authority and immediate live preflight remain required for each batch. Mapping packages do not authorize finish repair or publication.'};
}
