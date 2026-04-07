# MCD_YEARLY_ALIAS_BATCH_COLLAPSE_V1

## Context

The MCD namespace contract corrected McDonald's yearly identity from shared
`GV-PK-MCD-<number>` to year-qualified `GV-PK-MCD-<year>-<number>`.

That changed the remaining yearly alias lanes from apparent numeric-promotion
surfaces into alias-collapse surfaces. Prior single-year executions proved the
pattern:

- `2011bw -> mcd11`
- `2012bw -> mcd12`

This batch applied the same audited pattern to the remaining yearly pairs:

- `2014xy -> mcd14`
- `2015xy -> mcd15`
- `2016xy -> mcd16`
- `2017sm -> mcd17`
- `2018sm -> mcd18`
- `2019sm -> mcd19`

## Why Batch Execution Was Lawful

Each year pair was audited independently before entering apply scope. A year was
included only if all hard gates passed:

- unresolved alias parents existed only on the exact alias code
- canonical targets existed only on the exact `mcdYY` code
- source count matched target count
- mapping was exact `1:1` by normalized digits plus normalized name
- no multiple canonical matches
- no reused canonical targets
- no unmatched rows
- no same-number different-name conflicts
- canonical `GV-PK-MCD-<YEAR>-*` namespace already existed on the target lane
- no out-of-scope rows entered the map

All six target years passed.

## Per-Year Audit Result

| Alias | Canonical | Source | Target | Map | Multi | Reused | Unmatched | Different Name | Namespace | Apply Safe |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `2014xy` | `mcd14` | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 12/12 | yes |
| `2015xy` | `mcd15` | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 12/12 | yes |
| `2016xy` | `mcd16` | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 12/12 | yes |
| `2017sm` | `mcd17` | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 12/12 | yes |
| `2018sm` | `mcd18` | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 12/12 | yes |
| `2019sm` | `mcd19` | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 12/12 | yes |

## Combined Apply Scope

- applied years: `2014xy`, `2015xy`, `2016xy`, `2017sm`, `2018sm`, `2019sm`
- blocked years: none
- total collapsed alias parents: `72`
- combined map size: `72`
- duplicate old ids in batch map: `0`
- duplicate new ids in batch map: `0`

## Collision Audit

Trait and external mapping conflicts were zero for every included year.

Printing collisions were deterministic and safe:

- `2014xy`: no printing collisions
- `2015xy`: `1` finish-key collision, metadata-only merge, `0` unresolved conflicts
- `2016xy`: `12` finish-key collisions, all metadata-only merges, `0` unresolved conflicts
- `2017sm`: no printing collisions
- `2018sm`: no printing collisions
- `2019sm`: no printing collisions

No year produced a conflicting non-identical FK row that required exclusion.

## Backup

Backups were created before live apply:

- `backups/mcd_yearly_alias_batch_collapse_preapply_schema.sql`
- `backups/mcd_yearly_alias_batch_collapse_preapply_data.sql`

## Execution

Apply ran year-by-year in chronological order. For each year:

1. repoint `card_print_identity`
2. merge/repoint `card_print_traits`
3. merge/repoint `card_printings`
4. repoint `external_mappings`
5. repoint `vault_items` if present
6. verify zero remaining FK references to old parents
7. delete old alias parent rows

No new `gv_id` was created. No canonical `gv_id` was changed.

## Per-Year Apply Results

### 2014xy -> mcd14

- collapsed count: `12`
- deleted old parents: `12`
- remaining unresolved null-`gv_id` rows for `2014xy`: `0`
- canonical `mcd14` row count unchanged: `12`
- FK movement:
  - `card_print_identity = 12`
  - `card_print_traits = 12`
  - `card_printings = 12` moved, `0` merged, `0` redundant deleted
  - `external_mappings = 12`
  - `vault_items = 0`

### 2015xy -> mcd15

- collapsed count: `12`
- deleted old parents: `12`
- remaining unresolved null-`gv_id` rows for `2015xy`: `0`
- canonical `mcd15` row count unchanged: `12`
- FK movement:
  - `card_print_identity = 12`
  - `card_print_traits = 12`
  - `card_printings = 9` moved, `1` merged, `1` redundant deleted
  - `external_mappings = 12`
  - `vault_items = 0`

### 2016xy -> mcd16

- collapsed count: `12`
- deleted old parents: `12`
- remaining unresolved null-`gv_id` rows for `2016xy`: `0`
- canonical `mcd16` row count unchanged: `12`
- FK movement:
  - `card_print_identity = 12`
  - `card_print_traits = 12`
  - `card_printings = 24` moved, `0` merged, `12` redundant deleted
  - `external_mappings = 12`
  - `vault_items = 0`

### 2017sm -> mcd17

- collapsed count: `12`
- deleted old parents: `12`
- remaining unresolved null-`gv_id` rows for `2017sm`: `0`
- canonical `mcd17` row count unchanged: `12`
- FK movement:
  - `card_print_identity = 12`
  - `card_print_traits = 12`
  - `card_printings = 6` moved, `0` merged, `0` redundant deleted
  - `external_mappings = 12`
  - `vault_items = 0`

### 2018sm -> mcd18

- collapsed count: `12`
- deleted old parents: `12`
- remaining unresolved null-`gv_id` rows for `2018sm`: `0`
- canonical `mcd18` row count unchanged: `12`
- FK movement:
  - `card_print_identity = 12`
  - `card_print_traits = 12`
  - `card_printings = 11` moved, `0` merged, `0` redundant deleted
  - `external_mappings = 12`
  - `vault_items = 0`

### 2019sm -> mcd19

- collapsed count: `12`
- deleted old parents: `12`
- remaining unresolved null-`gv_id` rows for `2019sm`: `0`
- canonical `mcd19` row count unchanged: `12`
- FK movement:
  - `card_print_identity = 12`
  - `card_print_traits = 12`
  - `card_printings = 4` moved, `0` merged, `0` redundant deleted
  - `external_mappings = 12`
  - `vault_items = 0`

## Combined FK Movement Summary

- `card_print_identity = 72`
- `card_print_traits = 72`
- `card_printings = 92`
- `external_mappings = 72`
- `vault_items = 0`

## Post-Apply Truth

For every applied year:

- remaining old parent rows: `0`
- remaining unresolved null-`gv_id` rows for alias lane: `0`
- canonical target count unchanged at `12`
- target `GV-PK-MCD-<YEAR>-*` namespace unchanged
- target active identity rows: `12`
- route-resolvable target rows: `12`
- zero FK references remain to old parents

Global active identity count remained unchanged:

- before: `10613`
- after: `10613`

## Sample Before / After Rows

### 2014xy

- `Weedle / 1`: `4bbf8383-1ee5-4595-9672-8f5257e7fa1a` -> `7df32558-45a4-41a6-817e-69119a056e96` / `GV-PK-MCD-2014-1`
- `Honedge / 7`: `0c592b65-02a4-4eac-a7e4-c57df2d7f905` -> `12a1417f-d734-4227-8dc6-43dc6cd0e3e8` / `GV-PK-MCD-2014-7`
- `Furfrou / 12`: `d46097bc-81d0-433b-a2cf-961977543966` -> `8af64864-4adb-47b2-99d2-077f08f4ef25` / `GV-PK-MCD-2014-12`

### 2015xy

- `Treecko / 1`: `c4868bdb-8d6e-4707-906a-85778348c4e7` -> `660b70e4-c52e-44bf-beb4-2efc1af977b6` / `GV-PK-MCD-2015-1`
- `Electrike / 7`: `b14f2430-6afd-4b72-b852-64c98ebf1a3e` -> `65906508-6468-4220-8939-d3dde51b0d0c` / `GV-PK-MCD-2015-7`
- `Skitty / 12`: `95f99fe8-4ff5-4f28-ab77-0f0d10a8ab2f` -> `21352bb8-e63b-4bae-93d3-5dde0dba008f` / `GV-PK-MCD-2015-12`

### 2016xy

- `Vulpix / 1`: `39eaae3e-92df-41d2-b517-51185c5548f6` -> `9421a17d-0ef5-44f3-ac6f-2e9616f79a6d` / `GV-PK-MCD-2016-1`
- `Scraggy / 7`: `c22186fe-93c3-46dd-8c33-baa5551e9da1` -> `aea61ca5-8edd-4718-a786-a2408d5d89b3` / `GV-PK-MCD-2016-7`
- `Eevee / 12`: `5b5e8a98-3045-4215-bdbb-b71ad7cd983a` -> `12fb37f4-cc29-4769-8307-318f2f14b99f` / `GV-PK-MCD-2016-12`

### 2017sm

- `Rowlet / 1`: `c4630f0d-e009-4f58-b594-122b39fc43c1` -> `2c5d16d6-8cdc-4035-a390-5098ca9c6194` / `GV-PK-MCD-2017-1`
- `Crabrawler / 7`: `c3b8ec93-904f-414a-8129-e6c9c994f29d` -> `c5891ba9-71fd-4394-8c34-aa1389eab1aa` / `GV-PK-MCD-2017-7`
- `Yungoos / 12`: `49da7416-8b7c-4df8-bb82-1385e21d4cff` -> `abc1a7d0-5bc6-46f9-a2ef-76d156c9c719` / `GV-PK-MCD-2017-12`

### 2018sm

- `Growlithe / 1`: `af966963-8a44-4293-b1bf-dc63e0d6d678` -> `c91a4d0b-4416-4227-959e-0dbc482a5079` / `GV-PK-MCD-2018-1`
- `Cubone / 7`: `4ff69455-1d5d-4149-a659-17d6a1b04471` -> `9d07b0c9-f6ef-4dc0-a3cf-43ffb1cb89a1` / `GV-PK-MCD-2018-7`
- `Porygon / 12`: `32cd523f-ff42-4c92-83e0-56e5b118fef6` -> `7f55c4f3-df38-4b91-86dd-fae964422cba` / `GV-PK-MCD-2018-12`

### 2019sm

- `Caterpie / 1`: `01994aed-393f-4fdd-b6c7-0f914bf6b3b6` -> `97d1f0f0-a38b-483f-ac9e-93cc1b322b01` / `GV-PK-MCD-2019-1`
- `Gastly / 7`: `6292805b-f96e-4fc3-b0c4-538e6a058ddc` -> `d629dcad-ed05-4495-bbf3-f0810a5d4ffc` / `GV-PK-MCD-2019-7`
- `Eevee / 12`: `5570e14b-8d01-45c3-b05d-b466c622f3c4` -> `edc5ddb7-85e6-4d15-a40c-7ca66e5e297d` / `GV-PK-MCD-2019-12`

For every sample row above:

- `old_parent_still_exists = false`
- `active_identity_row_count_on_new_parent = 1`
