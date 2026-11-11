import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { classifyMtgDateOnlyCandidateV1 } from './mtg_date_only_candidate_v1.mjs';

// This review plan carries no mutation authority. Actual source receipt,
// locking, full precommit proof, rollback and publication remain separate.
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
};
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const mtgDateOnlyStableHashV1 = hash;
export function verifyMtgDateOnlyPlanFingerprintV1(plan, expectedFingerprint) {
  if (!plan || typeof expectedFingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(expectedFingerprint)) return false;
  const { fingerprint_sha256, ...body } = plan;
  return fingerprint_sha256 === expectedFingerprint && hash(body) === expectedFingerprint;
}
const sorted = rows => [...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
const relevant = (context, row) => ({
  parent:context.parents.find(p=>p.id===row.id),
  identities:sorted(context.identities.filter(i=>i.card_print_id===row.id)),
  mappings:sorted(context.mappings.filter(m=>m.card_print_id===row.id)),
  owners:sorted(context.owners.filter(m=>m.external_id===row.parent_source_id)),
});

export function buildMtgDateOnlyReviewPlanV1(context, sourceRows) {
  if (!context || context.status!=='review_only_not_apply_plan' || context.sanity?.read_only!=='on' ||
      context.database_writes!==0 || context.canonical_admissions!==0 ||
      !context.schema || !context.protected_facts || context.source_replay?.bulk_hashes_and_member_bytes_verified!==true ||
      !Array.isArray(context.parents) || !Array.isArray(context.identities) || !Array.isArray(context.mappings) ||
      !Array.isArray(context.owners) || !Array.isArray(sourceRows) || sourceRows.length!==48 || context.parents.length!==48 ||
      new Set(sourceRows.map(r=>r.id)).size!==48 || new Set(sourceRows.map(r=>r.parent_source_id)).size!==48 ||
      new Set(context.parents.map(p=>p.id)).size!==48) throw Error('INVALID_REVIEW_SCOPE');
  const rows=sourceRows.map(row=>{
    const {parent,identities,mappings,owners}=relevant(context,row);
    if(!parent || parent.ai_metadata!==null)throw Error('PARENT_NOT_NULL_METADATA');
    const parentOwners=mappings.filter(m=>m.active&&m.source==='scryfall');
    if(owners.length!==1 || parentOwners.length!==1 || !isDeepStrictEqual(owners[0],parentOwners[0]))
      throw Error('GLOBAL_OWNER_PREIMAGE_MISMATCH');
    const combined=[...new Map([...owners,...parentOwners].map(m=>[m.id,m])).values()];
    const decision=classifyMtgDateOnlyCandidateV1({parent,identities,sourceOwners:combined,
      currentBody:row.original_sources?.current?.body_text,historicalBody:row.original_sources?.historical?.body_text});
    if(decision.status!=='candidate_only')throw Error(`SOURCE_IDENTITY_REVIEW_REQUIRED:${decision.reason}`);
    const sourceSet=context.sets?.find(s=>s.id===parent.set_id);
    if(!sourceSet)throw Error('SET_PREIMAGE_MISSING');
    return {card_print_id:parent.id,source_print_id:row.parent_source_id,release_date:decision.release_date,
      current_member_sha256:decision.current_member_sha256,historical_member_sha256:decision.historical_member_sha256,
      parent_preimage_sha256:hash(parent),identities_preimage_sha256:hash(identities),mappings_preimage_sha256:hash(mappings),
      global_owners_preimage_sha256:hash(owners),set_preimage_sha256:hash(sourceSet),
      current_identity_matches:decision.current_identity_matches};
  }).sort((a,b)=>a.card_print_id.localeCompare(b.card_print_id));
  const body={version:'mtg_date_only_review_plan:v1',status:'review_only_not_apply_plan',snapshot_at:context.sanity.snapshot_at,
    schema_preimage_sha256:hash(context.schema),protected_facts_sha256:hash(context.protected_facts),
    raw_first_receipt_required:true,live_precommit_recheck_required:true,rollback_proof_required:true,
    independent_readback_required:true,canonical_admission:false,database_writes:0,rows};
  return {...body,fingerprint_sha256:hash(body)};
}

export function checkMtgDateOnlyReviewPreimagesV1(plan, context, sourceRows) {
  try { return isDeepStrictEqual(plan,buildMtgDateOnlyReviewPlanV1(context,sourceRows)); }
  catch { return false; }
}
