# TK_SAFE_PRINTING_MAPPER_V1

## Purpose
`backend/tools/tk_safe_printing_mapper.mjs` deterministically maps TCGdex Trainer Kit raws (`tk-*`) to finish-level mappings without creating new canonical prints.

The runner:
- resolves each raw card to exactly one existing `card_prints` row via deterministic keys
- ensures `card_printings` children exist for `normal|reverse|holo`
- inserts `external_printing_mappings` with external id format `<tcgdex_external_id>:<finish_key>`
- blocks on non-deterministic or incomplete inputs

## Scope
- One set per run: `--set <tk-set-code>`
- No batch mode
- Dry-run and apply supported

## Deterministic Join Contract
Each tk raw card is matched with:
- `national_dex = (payload.card.dexId[0])::int`
- `illustrator = payload.card.illustrator`
- `name = payload.card.name`

Candidate canon rows must satisfy:
- `card_print_traits.national_dex = national_dex`
- `card_prints.artist = illustrator`
- `card_prints.name = name`

STOP if candidate count is not exactly 1.

## Finish Contract
Input finish source:
- `payload.card.variants_detailed` array (`[{ type: ... }]`)

Mapped finish keys:
- `normal`
- `reverse`
- `holo`

Behavior:
- creates missing `card_printings(card_print_id, finish_key)` rows for supported finishes
- ignores allowlisted non-target types via env `TK_VARIANT_TYPE_ALLOWLIST`
- STOP on unexpected variant types not in target set and not in allowlist

## STOP Rules
Runner stops with no writes when any condition is true:
- `no_raw_rows_for_set`
- missing required fields (`name`, `illustrator`, numeric `dexId[0]`, non-empty `variants_detailed`)
- `no_match > 0`
- `ambiguous > 0`
- `unexpected_variant_type > 0`
- `no_supported_finish > 0`
- required tables/columns missing

Preflight gate query reports:
- `tk_rows`
- `unique_ok`
- `no_match`
- `ambiguous`

Runner enforces: `no_match = 0` and `ambiguous = 0` before apply.

## CLI
```bash
node backend/tools/tk_safe_printing_mapper.mjs --set tk-hs-g --dry-run
node backend/tools/tk_safe_printing_mapper.mjs --set tk-hs-g --apply
node backend/tools/tk_safe_printing_mapper.mjs --set tk-hs-g --dry-run --detail
```

Arguments:
- `--set <tk-set-code>` required
- `--dry-run` optional
- `--apply` optional
- `--detail` optional verbose stop samples

Notes:
- `--dry-run` and `--apply` are mutually exclusive
- if neither flag is set, runner executes preflight/check mode with no writes

## Write Behavior
Apply mode executes one transaction for the entire set run:
- `BEGIN`
- insert missing `card_printings`
- insert missing `external_printing_mappings`
- `COMMIT`

On error: `ROLLBACK`

## Schema-proof inserts
The runner writes primary keys explicitly and does not depend on database defaults:
- `card_printings.id = gen_random_uuid()` and `card_printings.created_at = now()`
- `external_printing_mappings.id = gen_random_uuid()`

Idempotency:
- printing insertion uses `NOT EXISTS` on `(card_print_id, finish_key)` intent
- mapping insertion uses `NOT EXISTS` on `(source, external_id)` intent

## Mapping Format
For each resolved finish row:
- `source = 'tcgdex'`
- `external_id = <raw_external_id>:<finish_key>`
- `card_printing_id = card_printings.id`
- `active = true`
- `synced_at = now()`
- `meta` includes: `tk_set`, `tk_card_external_id`, `finish_key`, and join description

## Output Contract
Runner prints structured JSON lines:
- `connection`
- `config`
- `preflight`
- `pair_counts`
- `apply` (apply mode)
- `summary`
- `verify` (apply mode)

Summary shape:
```json
{
  "set": "tk-hs-g",
  "raw_cards": 1,
  "matched_ok": 1,
  "inserted_printings": 0,
  "inserted_printing_mappings": 0,
  "skipped_existing": 6,
  "stops": []
}
```

## Post-Apply Verification
After apply, runner prints:
- `raw_cards`
- `raw_cards_with_printing_mapping`
- `total_printing_mappings_for_set`

Verification uses `external_id LIKE (<raw_external_id> || ':%')` to count finish-level mappings per raw card.

## Sample Run
```text
node backend/tools/tk_safe_printing_mapper.mjs --set tk-hs-g --apply
connection {"database":"postgres","server_addr":"10.168.175.208/32","server_port":5432,"db_user":"postgres","mode":"apply","set":"tk-hs-g"}
config {"target_finish_keys":["normal","reverse","holo"],"allow_variant_types":[],"detail":false}
preflight {"tk_rows":1,"unique_ok":1,"no_match":0,"ambiguous":0,"missing_required":0,"unexpected_variant":0,"no_supported_finish":0}
pair_counts {"expected_pairs":3,"would_insert_printings":0,"would_insert_printing_mappings":0,"existing_printings":3,"existing_printing_mappings":3}
apply {"insertedPrintings":0,"insertedPrintingMappings":0}
summary {"set":"tk-hs-g","raw_cards":1,"matched_ok":1,"inserted_printings":0,"inserted_printing_mappings":0,"skipped_existing":6,"stops":[]}
verify {"raw_cards":1,"raw_cards_with_printing_mapping":1,"total_printing_mappings_for_set":3}
```
