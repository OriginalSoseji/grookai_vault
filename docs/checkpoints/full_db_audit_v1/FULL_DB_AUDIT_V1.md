# FULL_DB_AUDIT_V1

## 1. Why This Audit Was Run
This audit was run to establish actual remote database truth before any further identity, canon, migration, repair, or promotion work.

## 2. Current Live DB Truth
- Remote `card_prints` row count: `33998`
- Remote `card_print_identity` row count: `0`
- Remote `external_mappings` row count: `63562`
- Remote `raw_imports` row count: `45349`
- Missing parent identity surface: `11790` rows missing `set_code` or `number`; `11758` missing both
- Supported null-parent surface: `10620`
- Excluded non-canonical null-parent surface: `1138`
- Remote BA state: no BA sets, no BA card_prints, no BA identity rows
- Remote tcg_pocket state: `2947` parent rows, `0` identity rows

## 3. What Is Proven
- The audit was fully read-only.
- `external_mappings` still anchors to `card_prints`.
- `card_print_identity` exists remotely and is currently present but empty.
- The supported null-parent surface is heavily referenced downstream and cannot be treated as harmless debris.
- Printed set identity is directly stored on `sets` for most supported null-parent rows.
- Printed-number truth exists in provenance-bearing surfaces, especially linked raw payload number fields and composite provenance identifiers.

## 4. What Is Disproven
- Remote live canon is not parent-complete.
- Numeric-only printed-number assumptions do not fully describe the live provenance surface.
- Remote BA promotion has not landed.
- The remote identity subsystem rollout is not yet complete just because the table exists.

## 5. Highest-Risk Surfaces
- Supported null-parent rows because they are incomplete and broadly referenced.
- Legacy parent uniqueness on remote `card_prints` because it conflicts with the intended subsystem authority split.
- Provenance normalization because truth exists but remains only partially structured.
- tcg_pocket parent rows because they remain live while excluded from identity rollout.

## 6. Highest-Confidence Next Decisions
- Decide string-first vs numeric-first printed identity law.
- Decide whether provenance normalization must be formalized before parent repair.
- Decide whether remote identity rollout blocks on null-parent repair.
- Decide how symbolic identities are governed.

## 7. Statement
This audit is read-only and establishes current database truth before any further repair, normalization, migration, or promotion work.
