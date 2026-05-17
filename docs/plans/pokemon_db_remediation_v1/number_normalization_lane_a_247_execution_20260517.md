# Lane A 247 Number Normalization Execution - 2026-05-17

Status: `EXECUTED_COMMITTED`.

## Scope

Executed the approved Lane A number-normalization transaction for 247 collision-free, unreferenced Pokemon card print rows.

Only these columns were explicitly updated:

- `public.card_prints.number`

`public.card_prints.number_plain` is a generated column. It was not explicitly assigned; post-write verification proves it derived to the approved `number_plain` value for all 247 rows.

Only these `public.card_prints` columns changed:

- `public.card_prints.number`
- `public.card_prints.number_plain`

No card movement, set creation, set deletion, alias deletion, metadata merge, external mapping movement, raw import mutation, identity mutation, missing-card backfill, variant write, migration, or schema change was performed.

## Result

| Check | Result |
| --- | --- |
| Committed matrix rows | 247 |
| Fresh pre-execution gate status | PASS_247_EXACT_MATCH_NO_WRITE |
| Updated rows | 247 |
| Post-write exact matches | 247 |
| Non-number target column changes | 0 |
| Grey Felt Hat changed rows | 0 |
| Post-write collision rows | 0 |
| User/market referenced target rows | 0 |
| Related object hashes changed | 0 |

## Set Breakdown

| Set | Name | Rows | Range |
| --- | --- | --- | --- |
| `2021swsh` | Macdonald's Collection 2021 | 25 | 1-25 |
| `A3a` | Extradimensional Crisis | 103 | 1-103 |
| `ecard3` | Skyridge | 4 | 4-9 |
| `fut2020` | Pokémon Futsal 2020 | 5 | 1-5 |
| `mep` | MEP Black Star Promos | 10 | 1-10 |
| `P-A` | Promos-A | 100 | 1-100 |

## Related Object Hashes

| Object | Before rows | After rows | Unchanged |
| --- | --- | --- | --- |
| external_mappings | 247 | 247 | true |
| card_print_identity | 247 | 247 | true |
| sets | 6 | 6 | true |
| raw_imports | 247 | 247 | true |

## Rollback Note

The transaction committed after all guards passed. If a future rollback is explicitly required, use the `before_after_rows` evidence in `number_normalization_lane_a_247_execution_matrix_20260517.json` to restore only `number` for these exact 247 `card_print_id` values, then verify generated `number_plain` and rerun the same post-write collision/reference checks.

## Confirmation

- Supabase write executed: yes, exactly 247 `card_prints` rows.
- Migrations: none.
- Schema changes: none.
- Card movement: none.
- Set changes: none.
- External mapping changes: none.
- Raw import changes: none.
- Identity row changes: none.
- Variant changes: none.
