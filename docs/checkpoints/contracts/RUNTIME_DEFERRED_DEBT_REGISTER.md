# RUNTIME_DEFERRED_DEBT_REGISTER

Status: ACTIVE  
Purpose: Keep deferred risk visible and intentional

---

## Format

- id:
- area:
- description:
- risk_level: (high / medium / low)
- reason_deferred:
- unblock_condition:
- next_action:

---

## Current Debt

### 1. staging_reconciliation_v1
- area: canon
- description: blocked pending runtime-safe rewrite
- risk_level: high
- reason_deferred: requires architectural refactor
- unblock_condition: rewrite under `execute_canon_write_v1`
- next_action: design safe reconciliation flow

### 2. importVaultItems transactional gap
- area: ownership
- description: non-transactional bulk mutation
- risk_level: medium
- reason_deferred: complex batching behavior
- unblock_condition: transactional batching or improved compensation
- next_action: evaluate safe transactional strategy

### 3. schema migrations
- area: canon
- description: operator-driven SQL changes
- risk_level: medium
- reason_deferred: outside runtime scope
- unblock_condition: formal migration governance
- next_action: document migration discipline

### 4. legacy_identity_apply_scripts
- area: canon / trust
- description: contained maintenance authority remains outside runtime and requires explicit operator execution
- risk_level: high
- reason_deferred: replay/repair architecture is not yet rewritten into runtime-safe execution
- unblock_condition: dedicated replay architecture or governed retirement of the lane
- next_action: keep containment narrow and define long-term replay governance

### 5. canon_maintenance_replay_and_migration_helpers
- area: canon / trust
- description: replay, backfill, promote, and migration helpers remain explicit maintenance lanes
- risk_level: high
- reason_deferred: maintenance containment is complete, but runtime rewrite is not the right next move for every operator task
- unblock_condition: formal maintenance governance and any future runtime-safe rewrites where justified
- next_action: keep launcher, dry-run default, and audit trail in place

### 6. saveVaultItemIntentAction
- area: ownership / trust
- description: grouped intent mutation path is intentionally blocked and must remain non-authoritative
- risk_level: low
- reason_deferred: deprecated grouped path should stay blocked rather than revived
- unblock_condition: delete the legacy surface entirely or leave permanently blocked
- next_action: keep blocked and prevent reintroduction

### 7. grouped shared-card compatibility mutations
- area: ownership / trust
- description: `toggleSharedCardAction`, `saveSharedCardWallCategoryAction`, and `saveSharedCardPublicNoteAction` are intentionally blocked legacy compatibility lanes
- risk_level: medium
- reason_deferred: compatibility surface still exists, but mutation authority was removed
- unblock_condition: delete the deprecated actions entirely or keep them as blocked stubs
- next_action: keep in sync with `npm run contracts:deferred-report`

Rule:
Deferred must be:
- visible
- justified
- intentionally tracked
