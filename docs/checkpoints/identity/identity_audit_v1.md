## Identity Audit V1

### Context

This pass adds a deterministic identity-audit layer between warehouse classification and promotion so upstream rows can be routed safely without corrupting canon.

Target problem classes:

- clean new canon rows
- safe aliases
- printing-only finish rows
- identity-bearing variants
- occupied-slot conflicts
- ambiguous upstream shapes

This pass is pipeline evolution only. It does not auto-promote anything and it does not write new canon rows.

### Surfaces Patched

- `backend/identity/identity_slot_audit_v1.mjs`
- `backend/identity/identity_slot_audit_v1.test.mjs`
- `backend/warehouse/source_identity_contract_v1.mjs`
- `backend/warehouse/classification_worker_v1.mjs`
- `backend/warehouse/promotion_stage_worker_v1.mjs`
- `backend/warehouse/promotion_executor_v1.mjs`

### Classification Rules

The new identity audit normalizes candidate identity from:

- `set_code`
- `name`
- `printed_number`
- `number_plain`
- variant and finish hints

It then audits canonical slot occupancy against normalized `(set_code, number_plain)`.

Possible outcomes:

- `NEW_CANONICAL`
  - slot is empty
  - candidate can proceed as a new parent `card_print`
- `ALIAS`
  - candidate safely resolves onto an existing canonical row
  - candidate must not create a new parent row
- `VARIANT_IDENTITY`
  - candidate carries an identity-bearing modifier
  - candidate can proceed as a new parent `card_print` with deterministic `variant_key`
- `PRINTING_ONLY`
  - candidate differs only by lawful finish / child-printing shape
  - candidate must route to `card_printings`
- `SLOT_CONFLICT`
  - slot is occupied by a different canonical identity
  - candidate must be blocked for review
- `AMBIGUOUS`
  - upstream evidence is not deterministic enough to classify safely
  - candidate must be blocked

### Slot Conflict Handling

The audit no longer trusts resolver absence alone. It performs a direct occupancy check against canonical rows by normalized slot identity.

That means an upstream row cannot reach promotion as `CREATE_CARD_PRINT` when:

- the collector slot is already occupied by a different card
- the upstream source is using an alias/spelling that should resolve to existing canon

This closes the gap that previously allowed source-backed rows to reach executor and fail only at insert time.

### Variant vs Printing Distinction

The audit preserves the existing truth boundary:

- finish-only differences belong to `card_printings`
- identity-bearing differences belong to parent `card_prints.variant_key`

Examples treated as identity-bearing variants:

- `cosmos_holo`
- `cracked_ice`
- `staff_stamp`
- `prerelease_stamp`
- `championship_stamp`
- `special_illustration_rare`
- `illustration_rare`
- `shiny_rare`

Examples treated as printing-only finish differences:

- `reverse`
- `pokeball`
- `masterball`

The worker will not guess when the upstream evidence does not support a deterministic split.

### Alias Logic

Safe alias handling is narrow and explicit.

Current protected examples:

- `Ghastly` -> `Gastly`
- `Nidoran F` -> `Nidoran♀`
- `Nidoran M` -> `Nidoran♂`

The audit also allows the existing normalized-name helper to resolve extremely small spelling drift when the slot and identity evidence remain coherent.

Alias rows are classified as `ALIAS`, linked to the matched canonical row, and blocked from parent creation.

### Stage Gate

Promotion staging now requires an identity-audit status that matches the write type:

- `CREATE_CARD_PRINT` requires `NEW_CANONICAL` or `VARIANT_IDENTITY`
- `CREATE_CARD_PRINTING` requires `PRINTING_ONLY`
- `ALIAS`, `SLOT_CONFLICT`, and `AMBIGUOUS` cannot stage for promotion

This preserves founder review while preventing unsafe rows from becoming executable write plans.

The executor now enforces the same staged-payload rule before any parent or child write:

- staged payloads missing `latest_identity_audit_package.identity_audit_status` are rejected
- `CREATE_CARD_PRINT` is rejected unless the staged audit status is `NEW_CANONICAL` or `VARIANT_IDENTITY`
- `CREATE_CARD_PRINTING` is rejected unless the staged audit status is `PRINTING_ONLY`

### Number Normalization Repair

Warehouse number normalization is now slash-aware across the relevant path.

Examples:

- `054/094` -> `54`
- `022` -> `22`

This matters because direct slot occupancy must compare canonical and upstream rows on the same collector-number basis instead of treating slash numbers as concatenated strings.

### Verification

#### Automated

Passed:

- `node --test backend/identity/identity_slot_audit_v1.test.mjs backend/identity/perfect_order_variant_identity_rule_v1.test.mjs`
- import verification for:
  - `identity_slot_audit_v1.mjs`
  - `source_identity_contract_v1.mjs`
  - `classification_worker_v1.mjs`
  - `promotion_stage_worker_v1.mjs`
  - `promotion_executor_v1.mjs`

#### Live Audit Proof

Candidate `65617f55-5613-420d-b84a-514ac1c94e25`:

- set: `me02`
- upstream identity: `Charcadet - 022`
- result: `SLOT_CONFLICT`
- blocker: slot `me02 / 022` is already occupied by canonical `Dewgong`

Candidate `c6d73a89-3dd1-44e8-a0f6-3ab6d0823c0b`:

- set: `me02`
- upstream identity: `Ghastly 054/094`
- result: `ALIAS`
- blocker: safely resolves onto canonical `Gastly` at `me02 / 054`

These are the exact rows that previously reached failed executor staging in the missing-card test. They are now classified before promotion as non-creatable identities.

### Invariants Preserved

- no canon rows were inserted in this pass
- no mappings were rewritten in this pass
- founder review remains required
- executor remains the final write boundary
- slot conflicts and aliases are blocked before promotion instead of discovered by failed inserts
- finish-only rows and identity-bearing variants remain separate lanes

### Operational Outcome

The pipeline can now distinguish:

- new canon
- alias to existing canon
- child printing
- identity-bearing variant
- true slot conflict

without weakening canon constraints or bypassing warehouse controls.
