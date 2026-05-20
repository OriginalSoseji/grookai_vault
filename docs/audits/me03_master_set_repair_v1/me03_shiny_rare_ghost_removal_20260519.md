# ME03 Shiny Rare Ghost Removal Gate

Date: 2026-05-19

Scope: gated reference audit for the six suspected ME03 `SHINY-RARE` ghost
parent rows.

Result: `BLOCKED_DO_NOT_DELETE`

No rows were deleted. No backup table was created because the delete gate did
not pass.

## Target Rows

```text
GV-PK-ME03-089-SHINY-RARE
GV-PK-ME03-090-SHINY-RARE
GV-PK-ME03-092-SHINY-RARE
GV-PK-ME03-093-SHINY-RARE
GV-PK-ME03-094-SHINY-RARE
GV-PK-ME03-095-SHINY-RARE
```

All six target rows exist.

## Reference Gate Result

The delete gate failed because the target rows have references.

| Reference surface | Count |
| --- | ---: |
| `canon_warehouse_candidates.promoted_card_print_id` | 6 |
| `card_print_species.card_print_id` | 6 |
| `external_mappings.card_print_id` | 6 |

All checked vault, pricing, JustTCG price/snapshot, scanner fingerprint,
listing, slab, photo, wishlist, and child-printing surfaces returned `0`.

## Decision

Do not delete these rows under `ME03_MASTER_SET_REPAIR_V1`.

The next safe lane should first decide whether these references should be:

- moved to the matching Illustration Rare parent rows,
- marked superseded/quarantined through a governed correction path, or
- preserved because another source proves the `SHINY-RARE` rows are valid.

No reference rewrites were performed in this lane.

