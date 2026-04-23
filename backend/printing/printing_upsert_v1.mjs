import {
  assertExecuteCanonWriteV1,
} from '../lib/contracts/execute_canon_write_v1.mjs';

const ALLOWED_FINISH_KEYS = new Set(['normal', 'holo', 'reverse']);

export async function upsertPrinting({
  supabase,
  card_print_id,
  finish_key,
  source,
  ref,
  is_provisional = false,
  created_by = 'printing_ingestion_v2',
  dryRun = false,
}) {
  const payloadSnapshot = {
    card_print_id,
    finish_key,
    source: source ?? null,
    ref: ref ?? null,
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
    ],
    proofs: [
      {
        name: 'card_printing_round_trip',
        contract_name: 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
        violation_type: 'post_write_printing_missing',
        async run() {
          const { data, error: selectError } = await supabase
            .from('card_printings')
            .select('card_print_id,finish_key')
            .eq('card_print_id', card_print_id)
            .eq('finish_key', finish_key)
            .limit(1);

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
