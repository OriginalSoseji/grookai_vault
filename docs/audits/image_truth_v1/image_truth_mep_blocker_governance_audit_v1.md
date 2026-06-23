# Image Truth V1 MEP Blocker Governance Audit

This is read-only. It does not write to the DB, upload images, create migrations, clean up rows, or change parent image fields.

## Summary

- target_rows: 2
- finish_governance_required: 0
- non_holo_or_modifier_governance_required: 2
- mutation_safe_now: false

## Blocked Rows

| status | number | card | target finish | db finishes | index finishes | source products |
| --- | --- | --- | --- | --- | --- | --- |
| non_holo_or_modifier_governance_required | 064 | Serperior | holo | holo | holo, stamped | Serperior - 064; Serperior - 064 [Staff] |
| non_holo_or_modifier_governance_required | 067 | Doublade | holo | holo | holo, stamped | Doublade - 067; Doublade - 067 [Staff] |

## Rule

Do not use representative images to hide finish-taxonomy disagreement. These rows need finish governance first, then an image package can be generated against the corrected child printing target.
