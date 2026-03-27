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
  if (!card_print_id) return;
  if (!ALLOWED_FINISH_KEYS.has(finish_key)) {
    throw new Error(`printing upsert failed: unsupported finish_key ${finish_key}`);
  }

  if (dryRun) {
    console.log(
      `[printing][dry-run] would upsert child printing card_print_id=${card_print_id} finish_key=${finish_key} source=${source ?? 'null'} ref=${ref ?? 'null'}`,
    );
    return;
  }

  const { error } = await supabase.from('card_printings').upsert(
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
}
