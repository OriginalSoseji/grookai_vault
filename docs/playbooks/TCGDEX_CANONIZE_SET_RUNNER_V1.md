# TCGDEX_CANONIZE_SET_RUNNER_V1

## Purpose
`backend/tools/tcgdex_canonize_set.mjs` canonizes one tcgdex set code using deterministic gates and two playbook patterns:

- Pattern 1: canonicalize set classification + set metadata
- Pattern 2: if coverage is complete, materialize missing canonical prints and backfill canonical mappings

No schema changes are performed.

## Usage
```bash
node backend/tools/tcgdex_canonize_set.mjs --set <set_code> --dry-run
node backend/tools/tcgdex_canonize_set.mjs --set <set_code> --apply
node backend/tools/tcgdex_canonize_set.mjs --set <set_code> --dry-run --detail
```

Arguments:
- `--set <set_code>` required
- `--dry-run` or `--apply` required, mutually exclusive
- `--detail` optional diagnostics

## Deterministic Gates
The runner enforces:

1. Canon Presence Gate:
- exactly 1 tcgdex set raw exists for `_external_id = <set_code>`

2. Set metadata gate:
- reads `name` and `cardCount.official` from the tcgdex set raw
- requires numeric `official_count`
- requires exactly 1 `sets` row where `sets.code = <set_code>`

3. Card raw count gate:
- counts tcgdex card raws for the set (`DISTINCT _external_id`)
- mode selection:
  - `COMPLETE` when `card_raws == official_count`
  - `INCOMPLETE` when `card_raws < official_count`
  - `STOP` when `card_raws > official_count`

## COMPLETE vs INCOMPLETE
In BOTH `COMPLETE` and `INCOMPLETE` modes (apply mode only), runner writes:
- `set_code_classification` upsert:
  - `is_canon=true`
  - `canon_source='tcgdex'`
  - `tcgdex_set_id=<set_code>`
  - `notes` includes mode + counts
- `sets` update:
  - `name`
  - `printed_total = official_count`
  - `source.tcgdex_set = <set_code>`
  - `last_synced_at = now()`
  - `updated_at = now()`

Only in `COMPLETE` mode:
- inserts missing `card_prints` with:
  - `number = payload.card.localId`
  - `variant_key=''`
  - `name`, `rarity`, `artist`, `variants` from tcgdex raw card
  - idempotent existence check on `(set_id, number, variant_key='')`
- inserts missing `external_mappings` with deterministic join:
  - `set_id + localId -> card_prints.number` and blank variant key
  - idempotent on `(source, external_id)`

In `INCOMPLETE` mode:
- does not insert `card_prints`
- does not insert `external_mappings`
- summary explicitly reports incomplete coverage (`card_raws/official_count`)

## STOP Rules
Runner stops writes for the set when any condition is true:
- missing required tables/columns
- canon presence gate fails (`set_raw_count != 1`)
- `sets.code` lookup is missing/ambiguous (`set_row_count != 1`)
- official count missing or non-numeric
- `card_raws > official_count`
- COMPLETE mode diagnostics detect deterministic violations:
  - missing `localId`
  - missing card name
  - unmappable rows even after print materialization
  - ambiguous localId->print candidates

## Transaction Behavior
- `--apply`: single transaction for all writes in that set
- `--dry-run`: zero writes

## Coverage V2 Verify
Runner computes:
- `canon_prints`
- `tcgdex_card_raws`
- `mapped_rows`
- `mapped_to_existing_prints`
- `dupes`
- `still_unmapped`

## Summary Output
Runner prints JSON summary:
```json
{
  "set": "tk-bw-e",
  "official_count": 30,
  "card_raws": 30,
  "mode": "COMPLETE",
  "would_insert_prints": 0,
  "would_insert_mappings": 0,
  "coverage_v2": {
    "canon_prints": 30,
    "tcgdex_card_raws": 30,
    "mapped_rows": 30,
    "mapped_to_existing_prints": 30,
    "dupes": 0,
    "still_unmapped": 0
  }
}
```

## Example: tk-bw-e (complete)
```bash
node backend/tools/tcgdex_canonize_set.mjs --set tk-bw-e --dry-run --detail
```

Expected shape:
- `mode = COMPLETE`
- non-zero or zero `would_insert_prints`/`would_insert_mappings` depending on current state
- coverage_v2 stats printed

## Example: tk-hs-r (incomplete)
```bash
node backend/tools/tcgdex_canonize_set.mjs --set tk-hs-r --dry-run --detail
```

Expected shape:
- `mode = INCOMPLETE`
- `would_insert_prints = 0`
- `would_insert_mappings = 0`
- summary note indicates incomplete coverage (for example `1/30`)
