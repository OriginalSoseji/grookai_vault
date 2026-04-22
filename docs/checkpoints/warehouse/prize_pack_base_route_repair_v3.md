# Prize Pack Base Route Repair V3

Generated: 2026-04-20T17:46:17.516Z

## Starting Pool

- BASE_ROUTE_AMBIGUOUS remaining from V2: 31
- Counts by ambiguity type: ALT_ART_ONLY_NUMBER_SLOT_COLLISION=5, ANNOTATED_NAME_NORMALIZATION_ROUTE_RESOLVED_BUT_EVIDENCE_STILL_REQUIRED=12, EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED=13, SPECIAL_IDENTITY_FAMILY_COLLISION=1

## Selection

- Target cluster: ANNOTATED_NAME_NORMALIZATION_ROUTE_RESOLVED_BUT_EVIDENCE_STILL_REQUIRED
- Target cluster size: 12
- Selection rationale: ALT_ART_ONLY_NUMBER_SLOT_COLLISION was audited first and deferred because its exact-number alt slots would require a deeper illustration-family invariant. The annotated-normalization cluster closes cleanly by structure alone and rebuckets out of BASE_ROUTE_AMBIGUOUS without guessing.

## Invariant

If source-side annotation stripping yields exactly one canon base route, and no competing plain-base route remains for the same name+number pair, then base-route ambiguity is closed. If the row still lacks independent Prize Pack proof after that normalization, it must not become READY or DO_NOT_CANON on structure alone; it rebuckets to WAIT under NO_SERIES_CONFIRMATION.

## Reclassification

- Newly READY_FOR_WAREHOUSE: 0
- Newly DO_NOT_CANON: 0
- Route-resolved to WAIT: 12
- Still ambiguous in chosen cluster: 0
- Remaining BASE_ROUTE_AMBIGUOUS after V3: 19

## Route-Resolved WAIT Rows

- Raging Bolt ex - 123/162 (Wrong Image) | 123/162 | GV-PK-TEF-123
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Basic Fire Energy - MEE002 | 2 | GV-PK-SVE-2
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Basic Fighting Energy - MEE006 | 6 | GV-PK-SVE-6
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Basic Darkness Energy - MEE007 | 7 | GV-PK-SVE-7
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Basic Metal Energy - MEE008 | 8 | GV-PK-SVE-8
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Inteleon (058) | 058/202 | GV-PK-SSH-58
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Altaria - 49/73 | 49/73 | GV-PK-CPA-49
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Professor's Research (Professor Juniper) | 060/072 | GV-PK-SHF-60
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Inteleon (43) | 043/198 | GV-PK-CRE-43
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Wormadam (010) | 010/172 | GV-PK-BRS-10
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Wormadam (077) | 077/172 | GV-PK-BRS-77
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.
- Wormadam (098) | 098/172 | GV-PK-BRS-98
  - Rebucketed blocker: NO_SERIES_CONFIRMATION
  - Reason: Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.

## Remaining Ambiguous Examples

- Glaceon VMAX | 041/203 | ALT_ART_ONLY_NUMBER_SLOT_COLLISION
  - Why: The exact number slot is occupied only by an alt-art canon row, so the generic Prize Pack stamp cannot yet attach to a lawful plain-base route.
- Sylveon V | 074/203 | ALT_ART_ONLY_NUMBER_SLOT_COLLISION
  - Why: The exact number slot is occupied only by an alt-art canon row, so the generic Prize Pack stamp cannot yet attach to a lawful plain-base route.
- Umbreon VMAX | 095/203 | ALT_ART_ONLY_NUMBER_SLOT_COLLISION
  - Why: The exact number slot is occupied only by an alt-art canon row, so the generic Prize Pack stamp cannot yet attach to a lawful plain-base route.
- Rayquaza VMAX | 111/203 | ALT_ART_ONLY_NUMBER_SLOT_COLLISION
  - Why: The exact number slot is occupied only by an alt-art canon row, so the generic Prize Pack stamp cannot yet attach to a lawful plain-base route.
- Duraludon V | 122/203 | ALT_ART_ONLY_NUMBER_SLOT_COLLISION
  - Why: The exact number slot is occupied only by an alt-art canon row, so the generic Prize Pack stamp cannot yet attach to a lawful plain-base route.
- Pokegear 3.0 | 186/198 | EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED
  - Why: The row has one live canon base route by exact name+number, but that route has not yet been carried through a Prize Pack adjudication artifact.
- Atticus | 077/091 | EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED
  - Why: The row has one live canon base route by exact name+number, but that route has not yet been carried through a Prize Pack adjudication artifact.
- Moonlit Hill | 081/091 | EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED
  - Why: The row has one live canon base route by exact name+number, but that route has not yet been carried through a Prize Pack adjudication artifact.
- Technical Machine: Crisis Punch | 090/091 | EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED
  - Why: The row has one live canon base route by exact name+number, but that route has not yet been carried through a Prize Pack adjudication artifact.
- Galvantula | 002/064 | EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED
  - Why: The row has one live canon base route by exact name+number, but that route has not yet been carried through a Prize Pack adjudication artifact.

## Recommended Next Step

- PRIZE_PACK_BASE_ROUTE_REPAIR_V4

