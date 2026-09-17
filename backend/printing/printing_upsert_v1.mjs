import {
  assertExecuteCanonWriteV1,
} from '../lib/contracts/execute_canon_write_v1.mjs';

const ALLOWED_FINISH_KEYS = new Set(['normal', 'holo', 'reverse']);
const FINISH_SUFFIX = Object.freeze({normal:'STD',holo:'HOLO',reverse:'RH'});
const PROOF_TYPES = new Set(['checked_checklist', 'official_printing', 'image_confirmed', 'exact_printing_mapping']);

function hasProofEvidence(evidence) {
  return Boolean(
    evidence &&
      typeof evidence === 'object' &&
      typeof evidence.source === 'string' &&
      evidence.source.trim().length > 0 &&
      typeof evidence.external_id === 'string' &&
      evidence.external_id.trim().length > 0 &&
      PROOF_TYPES.has(evidence.evidence_type) &&
      evidence.review_status === 'verified' &&
      typeof evidence.source_sha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(evidence.source_sha256),
  );
}

export async function upsertPrinting({
  supabase,
  card_print_id,
  finish_key,
  printing_gv_id = null,
  parent_gv_id = null,
  source,
  ref,
  evidence,
  is_provisional = false,
  created_by = 'printing_ingestion_v2',
  dryRun = false,
}) {
  // Fail before the write/audit boundary, including in dry-run mode. A single
  // supported finish is still an exact printing, not an optional identity.
  if (!card_print_id || !ALLOWED_FINISH_KEYS.has(finish_key)) throw new Error('Invalid exact printing identity');
  if (typeof parent_gv_id !== 'string' || !parent_gv_id.startsWith('GV-') ||
      printing_gv_id !== `${parent_gv_id}-${FINISH_SUFFIX[finish_key]}`) {
    throw new Error('Governed parent and exact printing GV-ID are required');
  }
  if (!hasProofEvidence(evidence) || evidence.card_print_id !== card_print_id || evidence.finish_key !== finish_key) {
    throw new Error('Printing evidence must bind the exact parent and finish');
  }
  if (source !== evidence.source || ref !== evidence.external_id || is_provisional !== false) {
    throw new Error('Verified printing provenance must match the admitted evidence');
  }
  const payloadSnapshot = {
    card_print_id,
    finish_key,
    printing_gv_id,
    parent_gv_id,
    source: source ?? null,
    ref: ref ?? null,
    evidence: evidence ?? null,
    is_provisional: Boolean(is_provisional),
    created_by,
    dry_run: Boolean(dryRun),
  };

  if (dryRun) {
    console.log(
      `[printing][dry-run] would upsert child printing card_print_id=${card_print_id} finish_key=${finish_key} source=${source ?? 'null'} ref=${ref ?? 'null'}`,
    );
    return;
  }

  const parentRead = await supabase.from('card_prints').select('id,gv_id').eq('id',card_print_id).single();
  if (parentRead.error || parentRead.data?.id !== card_print_id || parentRead.data?.gv_id !== parent_gv_id) {
    throw new Error('Canonical parent GV-ID readback mismatch');
  }

  await assertExecuteCanonWriteV1({
    execution_name: 'printing_upsert_v1',
    payload_snapshot: payloadSnapshot,
    write_target: supabase,
    audit_target: supabase,
    ledger_target: supabase,
    transaction_control: 'none',
    actor_type: 'system_worker',
    source_worker: 'printing_upsert_v1',
    source_system: 'printing',
    contract_assertions: [
      {
        ok: Boolean(card_print_id),
        contract_name: 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
        violation_type: 'missing_card_print_id',
        reason: 'printing_upsert_v1 requires card_print_id.',
      },
      {
        ok: ALLOWED_FINISH_KEYS.has(finish_key),
        contract_name: 'IDENTITY_CONTRACT_SUITE_V1',
        violation_type: 'unsupported_finish_key',
        reason: `printing_upsert_v1 received unsupported finish_key ${finish_key}.`,
      },
      {
        ok:
          typeof printing_gv_id === 'string' && printing_gv_id.trim().length > 0,
        contract_name: 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
        violation_type: 'invalid_printing_gv_id',
        reason: 'printing_upsert_v1 received an empty or invalid printing_gv_id.',
      },
      {
        ok: hasProofEvidence(evidence),
        contract_name: 'PRINTING_TRUTH_CONTRACT_V1',
        violation_type: 'missing_printing_proof',
        reason:
          'printing_upsert_v1 requires explicit source/external_id/evidence_type proof; generated finish flags are not enough.',
      },
    ],
    proofs: [
      {
        name: 'card_printing_round_trip',
        contract_name: 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
        violation_type: 'post_write_printing_missing',
        async run() {
          let request = supabase
            .from('card_printings')
            .select('card_print_id,finish_key')
            .eq('card_print_id', card_print_id)
            .eq('finish_key', finish_key);
          if (printing_gv_id) {
            request = request.eq('printing_gv_id', printing_gv_id);
          }
          const { data, error: selectError } = await request.limit(1);

          if (selectError) {
            return {
              ok: false,
              reason: `printing_upsert_v1 post-write proof query failed: ${selectError.message}`,
            };
          }

          return {
            ok: Array.isArray(data) && data.length === 1,
            reason: `printing_upsert_v1 could not round-trip card_printing ${card_print_id}/${finish_key}.`,
          };
        },
      },
    ],
    async write(target) {
      const { error } = await target.from('card_printings').upsert(
        {
          card_print_id,
          finish_key,
          ...(printing_gv_id ? { printing_gv_id } : {}),
          is_provisional,
          provenance_source: source ?? null,
          provenance_ref: ref ?? null,
          created_by,
        },
        {
          onConflict: 'card_print_id,finish_key',
        },
      );

      if (error) {
        throw new Error(`printing upsert failed: ${error.message}`);
      }
    },
  });
}
