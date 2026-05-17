# Grey Felt Hat Pikachu Manual Number Evidence - 2026-05-17

Status: no-write manual evidence only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.

## Purpose

Isolate the one referenced Lane A candidate that blocked the 248-row pre-execution gate:

```text
svp Pikachu with Grey Felt Hat #85
```

This row is excluded from the 247-row write-plan draft because it is already referenced by user, vault, pricing, slab, shared-card, and JustTCG market tables.

## Source Evidence

- `number_normalization_lane_a_248_preexecution_gate_20260517.md`
- `number_normalization_lane_a_248_preexecution_gate_matrix_20260517.json`
- `number_normalization_grey_felt_hat_manual_evidence_matrix_20260517.json`
- `number_normalization_lane_a_247_write_plan_20260517.md`

## Candidate

| Field | Value |
| --- | --- |
| Card print id | `50386954-ded6-4909-8d17-6b391aeb53e4` |
| Set | `svp` Scarlet & Violet Black Star Promos |
| Card | Pikachu with Grey Felt Hat |
| Proposed `number` | `85` |
| Proposed `number_plain` | `85` |
| Source carriers | `external_ids.tcgdex`, `external_mappings.tcgdex` |
| Source external id | `svp-085` |
| Current `print_identity_key` | `svp:085:pikachu-with-grey-felt-hat` |
| Current `gv_id` | `GV-PK-PR-SV-085` |

## Reference Inventory

| Table.column | Reference rows |
| --- | ---: |
| `pricing_watch.card_print_id` | 1 |
| `shared_cards.card_id` | 1 |
| `slab_certs.card_print_id` | 1 |
| `vault_item_instances.card_print_id` | 2 |
| `vault_items.card_id` | 3 |
| `justtcg_variants.card_print_id` | 5 |
| `justtcg_variant_prices_latest.card_print_id` | 5 |
| `justtcg_variant_price_snapshots.card_print_id` | 5 |

## Manual Decision Needed

This is likely an ID-stable number update, because the future change would only populate missing direct number fields on the same `card_prints.id`. However, this row already participates in user ownership, pricing, slab, shared-card, and market surfaces, so it should not ride with the bulk 247-row write.

Manual review must decide one of:

- leave this row unnormalized for now;
- approve a separate one-row transaction that updates only `card_prints.number` and `card_prints.number_plain`;
- require additional public/vault/pricing UI verification before a one-row write;
- defer until the identity maintenance plan can prove whether direct number changes affect generated display or search surfaces.

## Future One-Row Write Boundary

If separately authorized later, the only allowed mutation would be:

- set `card_prints.number = '85'`;
- set `card_prints.number_plain = '85'`;
- update `card_prints.updated_at`.

The future one-row transaction must not touch:

- external mappings;
- raw imports;
- set rows;
- identity rows;
- vault rows;
- pricing rows;
- slab rows;
- shared-card rows;
- JustTCG variant or pricing rows;
- variant rows;
- missing-card rows.

## Required Future Preflight

Before any one-row execution:

- rerun the live pre-execution gate;
- prove this card_print id still exists and still belongs to `svp`;
- prove both direct number fields are still null or blank;
- prove source carriers still point to `svp-085`;
- snapshot the card_print row;
- snapshot all reference counts listed above;
- prove no duplicate same-set direct `number` or `number_plain` collision exists for `85`;
- prove no active identity conflict exists;
- prepare post-write checks for all references.

## Post-Write Checks If Ever Authorized

Future verification must prove:

- exactly one card_print row changed;
- `number` and `number_plain` are `85`;
- the card_print id is unchanged;
- every reference listed above still points at the same card_print id;
- no mapping, raw import, set, identity, vault, pricing, slab, shared-card, JustTCG, missing-card, or variant row changed;
- public card, vault, and pricing surfaces still resolve this card.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No data changes.
