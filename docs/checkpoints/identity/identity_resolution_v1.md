## Identity Resolution V1

### Context

Identity Audit V1 added deterministic audit labels:

- `NEW_CANONICAL`
- `ALIAS`
- `VARIANT_IDENTITY`
- `PRINTING_ONLY`
- `SLOT_CONFLICT`
- `AMBIGUOUS`

This pass adds the next layer:

`classification -> identity_resolution -> action`

The goal is to convert identity audit output into a deterministic next action without weakening warehouse safety or auto-promoting anything.

### Surfaces Patched

- `backend/identity/identity_resolution_v1.mjs`
- `backend/identity/identity_resolution_v1.test.mjs`
- `backend/warehouse/classification_worker_v1.mjs`
- `backend/warehouse/source_identity_contract_v1.mjs`
- `backend/warehouse/promotion_stage_worker_v1.mjs`
- `backend/warehouse/promotion_executor_v1.mjs`

### Classification To Resolution Mapping

- `NEW_CANONICAL -> PROMOTE_NEW`
- `VARIANT_IDENTITY -> PROMOTE_VARIANT`
- `PRINTING_ONLY -> ATTACH_PRINTING`
- `ALIAS -> MAP_ALIAS`
- `SLOT_CONFLICT -> BLOCK_REVIEW_REQUIRED`
- `AMBIGUOUS -> BLOCK_AMBIGUOUS`

### Resolution Contract

Each classification package now carries:

- `identity_resolution`
- `identity_resolution_package`

The resolution package includes:

- `identity_audit_status`
- `identity_resolution`
- `reason_code`
- `explanation`
- `action_payload`

### Executable Resolutions

Only these resolutions are executable in the promotion path:

- `PROMOTE_NEW`
- `PROMOTE_VARIANT`
- `ATTACH_PRINTING`

They map to existing executable action types:

- `PROMOTE_NEW -> CREATE_CARD_PRINT`
- `PROMOTE_VARIANT -> CREATE_CARD_PRINT`
- `ATTACH_PRINTING -> CREATE_CARD_PRINTING`
- `ATTACH_PRINTING -> ENRICH_CANON_IMAGE` when the child printing already exists and the path is image reuse/enrichment

### Non-Executable Resolutions

These resolutions are deterministic but are not executable by promotion staging/executor:

- `MAP_ALIAS`
- `BLOCK_REVIEW_REQUIRED`
- `BLOCK_AMBIGUOUS`

This preserves the rule that the promotion executor only performs lawful canon writes.

### Alias Handling

Alias rows no longer stop at an undifferentiated blocked state.

They now resolve to `MAP_ALIAS` with an explicit mapping payload:

- target table: `external_mappings`
- target `card_print_id`
- source
- external id
- source set id
- source candidate id

Example proven live:

- candidate `c6d73a89-3dd1-44e8-a0f6-3ab6d0823c0b`
- upstream card: `Ghastly`
- canonical target: `Gastly`
- audit status: `ALIAS`
- resolution: `MAP_ALIAS`
- mapping payload:
  - `source = justtcg`
  - `external_id = pokemon-me02-phantasmal-flames-ghastly-common`
  - `card_print_id = 595ec587-4dcb-4f81-b43b-6ad61da852f3`

Promotion staging still blocks this row because mapping attachment is not a canon-promotion action. That is intentional.

### Conflict Handling

Slot conflicts now resolve to `BLOCK_REVIEW_REQUIRED` instead of falling through to a generic blocked path.

Example proven live:

- candidate `65617f55-5613-420d-b84a-514ac1c94e25`
- upstream card: `Charcadet - 022`
- occupied canonical slot: `me02 / 022`
- audit status: `SLOT_CONFLICT`
- resolution: `BLOCK_REVIEW_REQUIRED`

This keeps the row in a founder-review lane and prevents accidental parent creation.

### Warehouse Integration

#### Classification Worker

The classification package now appends the resolution package so downstream workers consume one deterministic next-action contract.

#### Promotion Stage Worker

The staging worker now:

- reads `identity_resolution` from the latest classification package
- allows staging only for executable resolutions
- blocks alias/conflict/ambiguous resolutions
- exposes alias rows as a blocked write plan with an `external_mappings` preview instead of a generic reject

#### Promotion Executor

The executor now validates:

- identity audit status
- identity resolution

before any parent or child write executes.

For identity-audited rows:

- `CREATE_CARD_PRINT` requires `PROMOTE_NEW` or `PROMOTE_VARIANT`
- `CREATE_CARD_PRINTING` requires `ATTACH_PRINTING`
- `ENRICH_CANON_IMAGE` is allowed for `ATTACH_PRINTING` child reuse/enrichment paths

Legacy non-audited image-enrichment rows are not forced through the resolution gate.

### Verification

Passed:

- `node --test backend/identity/identity_slot_audit_v1.test.mjs backend/identity/perfect_order_variant_identity_rule_v1.test.mjs backend/identity/identity_resolution_v1.test.mjs`
- import verification for:
  - `identity_slot_audit_v1.mjs`
  - `identity_resolution_v1.mjs`
  - `source_identity_contract_v1.mjs`
  - `classification_worker_v1.mjs`
  - `promotion_stage_worker_v1.mjs`
  - `promotion_executor_v1.mjs`
- `git diff --check`

Live runtime proof:

- `Ghastly` candidate resolves to `MAP_ALIAS` with a complete `external_mappings` payload
- `Charcadet - 022` candidate resolves to `BLOCK_REVIEW_REQUIRED`

### Invariants Preserved

- no canon schema changes
- no ingestion or bridge changes
- no automatic promotion added
- no alias row can create a duplicate canonical parent
- no slot conflict can bypass founder review
- child-printing and parent-row lanes remain separate
- executor still rejects non-executable rows before write

### Operational Outcome

The warehouse path now knows not just what a candidate is, but what its next lawful action is.

That action can be:

- executable promotion
- deterministic mapping attachment
- explicit founder review
- explicit ambiguity block

without guessing and without collapsing canon identity.
