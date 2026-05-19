# Child Printing Public Identity V1 Audit

Generated: 2026-05-19T03:51:55.792Z

Mode: read-only dry-run. No database writes were performed.

## Summary

- total card_printings: 55582
- active child printings: 55582
- eligible dry-run candidates: 55582
- approved candidates: 44698
- candidates with parent gv_id: 45205
- blocked because parent gv_id is missing: 10377
- owned child printings: 0
- child printings with image presence: 54092
- parent prints with multiple child printings: 19146
- proposed child ID collision count: 0
- proposed child IDs already used by parent card_prints.gv_id: 0

## Blocked Candidates

- BLOCKED_PARENT_MISSING_GV_ID: 10377
- BLOCKED_PARENT_VARIANT_BOUNDARY: 507

## Finish Key Distribution

- normal (Normal): 19919 rows, 16535 with parent gv_id
- reverse (Reverse Holo): 18550 rows, 15065 with parent gv_id
- holo (Holo): 16816 rows, 13308 with parent gv_id
- pokeball (Poké Ball): 230 rows, 230 with parent gv_id
- masterball (Master Ball): 67 rows, 67 with parent gv_id

## Unsupported Finish Keys

- none

## Highest Risk Sets

| set_code | child_printings | premium_child_count | parent_print_count |
| --- | --- | --- | --- |
|  | 1923 | 1923 | 1923 |
| me02.5 | 425 | 425 | 295 |
| B1 | 331 | 331 | 331 |
| A1 | 286 | 286 | 286 |
| sm12 | 271 | 271 | 271 |
| sv8pt5 | 447 | 267 | 180 |
| sm11 | 258 | 258 | 258 |
| smp | 736 | 244 | 248 |
| A4 | 241 | 241 | 241 |
| A3 | 239 | 239 | 239 |
| sm8 | 236 | 236 | 236 |
| sm10 | 234 | 234 | 234 |
| swsh8 | 230 | 230 | 230 |
| xyp | 214 | 214 | 214 |
| A2 | 207 | 207 | 207 |
| sm9 | 196 | 196 | 196 |
| svp | 195 | 195 | 195 |
| sm7 | 183 | 183 | 183 |
| sv02 | 177 | 177 | 177 |
| sv03 | 176 | 176 | 176 |
| sv10.5w | 173 | 173 | 173 |
| sm5 | 173 | 173 | 173 |
| sm1 | 172 | 172 | 172 |
| sv10.5b | 172 | 172 | 172 |
| sm3 | 169 | 169 | 169 |

## Required Audit Questions

1. How many child printings are eligible? 55582
2. How many have parent gv_id? 45205
3. How many are blocked because parent gv_id is missing? 10377
4. Are any proposed child IDs duplicated? No.
5. Are any proposed child IDs already used by parent card_prints.gv_id? No.
6. Which finish keys are unsupported? None in this dry-run.
7. Which sets are highest risk? , me02.5, B1, A1, sm12, sv8pt5, sm11, smp, A4, A3
8. Do any existing vault-owned child printings exist and need priority? No.
9. Does this affect Species Dex denominator? No. Species Dex remains parent-print based.
10. Does this require public route changes? No for V1. Parent card routes remain default.

## Notes

- The current remote schema already has `card_printings.printing_gv_id`.
- Pricing child references are not present in the current pricing mapping table schema.
- Parent-level variants are intentionally blocked for manual review so this lane does not collapse parent variant identity into child finish identity.
