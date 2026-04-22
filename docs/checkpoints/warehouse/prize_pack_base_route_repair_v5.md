# Prize Pack Base Route Repair V5

Generated: 2026-04-20T18:20:18.374Z

## Rule

- Contract: docs/contracts/PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1.md
- Invariant: When a same-name exact printed-number canon row exists, that row is the lawful printed identity anchor for routing even if current canon stores a non-null variant_key such as alt. Prize Pack evidence still controls READY vs WAIT vs DO_NOT_CANON after route resolution.

## Re-evaluation

- Target cluster: ALT_ART_ONLY_NUMBER_SLOT_COLLISION
- Rows investigated: 5
- READY_FOR_WAREHOUSE: 0
- DO_NOT_CANON: 0
- Route-resolved WAIT: 5
- Remaining ambiguous in cluster: 0

## Row Outcomes

- Glaceon VMAX | 041/203
  - Exact owner: GV-PK-EVS-41 (41)
  - Final decision: WAIT
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Printed identity is now resolved by the exact same-name same-number canon owner, so BASE_ROUTE_AMBIGUOUS is closed. Prize Pack evidence is still missing, so the row returns to WAIT under NO_SERIES_CONFIRMATION.
- Sylveon V | 074/203
  - Exact owner: GV-PK-EVS-74 (74)
  - Final decision: WAIT
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Printed identity is now resolved by the exact same-name same-number canon owner, so BASE_ROUTE_AMBIGUOUS is closed. Prize Pack evidence is still missing, so the row returns to WAIT under NO_SERIES_CONFIRMATION.
- Umbreon VMAX | 095/203
  - Exact owner: GV-PK-EVS-95 (95)
  - Final decision: WAIT
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Printed identity is now resolved by the exact same-name same-number canon owner, so BASE_ROUTE_AMBIGUOUS is closed. Prize Pack evidence is still missing, so the row returns to WAIT under NO_SERIES_CONFIRMATION.
- Rayquaza VMAX | 111/203
  - Exact owner: GV-PK-EVS-111 (111)
  - Final decision: WAIT
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Printed identity is now resolved by the exact same-name same-number canon owner, so BASE_ROUTE_AMBIGUOUS is closed. Prize Pack evidence is still missing, so the row returns to WAIT under NO_SERIES_CONFIRMATION.
- Duraludon V | 122/203
  - Exact owner: GV-PK-EVS-122 (122)
  - Final decision: WAIT
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Printed identity is now resolved by the exact same-name same-number canon owner, so BASE_ROUTE_AMBIGUOUS is closed. Prize Pack evidence is still missing, so the row returns to WAIT under NO_SERIES_CONFIRMATION.

## Remaining Structural Ambiguity

- EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED: 13
- SPECIAL_IDENTITY_FAMILY_COLLISION: 1

## Recommended Next Step

- PRIZE_PACK_BASE_ROUTE_REPAIR_V6

