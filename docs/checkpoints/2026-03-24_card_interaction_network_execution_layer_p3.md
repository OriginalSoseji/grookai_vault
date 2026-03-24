# CHECKPOINT — CARD INTERACTION NETWORK + EXECUTION LAYER (P3)

**Status:** ACTIVE  
**Date:** 2026-03-24  
**Severity:** L3 (System Invariant)  
**Scope:** Card Interaction Network + Execution Layer + Ownership Transfer

---

# CONTEXT

Grookai evolved from:

- canonical identity system
- vault-based ownership tracking
- pricing + ingestion infrastructure

Into:

`Card interaction network`

Phase 2 established:

- intent (`trade` / `sell` / `showcase`)
- card discovery (`/network`, `In Play`)
- card-anchored contact
- grouped conversations
- unread state + inbox organization

However, the system stopped at:

`conversation`

There was no representation of:

- actual outcomes (`sale` / `trade`)
- ownership transition
- price capture
- market signal

---

# PROBLEM

Without an execution layer:

- conversations never resolve into real outcomes
- ownership never changes
- system cannot produce real market data
- vendor intelligence cannot exist
- provenance cannot be extended

The system remained:

`open-loop`

---

# DECISION

Introduce a deterministic execution layer consisting of:

## 1. Execution Events

`card_execution_events`

- immutable event container
- represents a `sale` or `trade` bundle

## 2. Outcome Legs

`card_interaction_outcomes`

- immutable per-card transfer record
- links:
  - card identity
  - source ownership instance
  - target ownership instance
  - participants
  - optional price

## 3. Ownership Transition Model

Execution operates on:

`vault_item_instances` (not `vault_items`)

Rules:

- source instance is archived
- target instance is newly created
- ownership is never mutated or reassigned
- historical episodes remain intact

## 4. Trade Modeling

Trades are:

`two-leg execution under one event`

Rules:

- each owner executes their own leg
- no unilateral transfers
- no single-row dual transfer
- event is complete when both legs exist

---

# INVARIANTS (LOCKED)

## Data Integrity

- `card_interactions` is append-only
- `card_interaction_outcomes` is append-only
- `vault_item_instances` are never reassigned
- ownership is represented as episodes, not mutable state

## Execution Rules

- one outcome per `source_instance_id`
- all execution is transactional
- partial execution is not allowed
- stale ownership must fail execution
- double execution must be blocked

## Identity Rules

All outcomes must reference:

- `card_print_id`
- `source_instance_id`
- `result_instance_id`

No name-based or loose matching is allowed.

## Price Rules

- price is optional
- price is stored on the outcome row and, when present for a sale, copied to the created target instance as acquisition cost
- price capture must not contaminate pricing ingestion pipelines

---

# SYSTEM SHIFT

Before:

```text
card -> intent -> interaction -> conversation
```

After:

```text
card -> intent -> interaction -> conversation -> execution -> ownership -> signal
```

---

# RESULT

Grookai is now:

`closed-loop collector system`

It supports:

- identity
- ownership
- intent
- interaction
- conversation
- execution
- ownership transition
- market signal generation

---

# RISKS ADDRESSED

This design prevents:

- mutation of historical interaction data
- incorrect ownership reassignment
- fake or unilateral trades
- partial or inconsistent state writes
- schema drift from execution logic
- loss of provenance integrity

---

# SYSTEM CAPABILITY UNLOCKED

Grookai can now:

- track real sales
- track real trades
- capture real price data
- generate true demand signals
- power vendor intelligence
- support provenance expansion

---

# NEXT PHASE

System is now ready for:

`Phase 3 — Network Formation + Behavior Validation`

Focus:

- real-world usage
- repeated interactions
- completed transactions
- user trust

---

# SUCCESS CONDITION

Grookai is validated when collectors complete full loops:

- discover card
- initiate interaction
- continue conversation
- execute transfer
- ownership updates correctly

---

# FINAL TRUTH

Grookai is no longer:

- a vault
- a tracker
- a pricing tool

Grookai is:

`network where collectors act on real cards`

---

# LOCK

All future changes must preserve:

- append-only truth
- instance-level ownership
- card-anchored interaction
- execution integrity

---

# RELATED ARTIFACTS

- [20260324160000_p3_card_execution_layer_v1.sql](/c:/grookai_vault/supabase/migrations/20260324160000_p3_card_execution_layer_v1.sql)
- [20260324162500_patch_execute_card_interaction_outcome_v1.sql](/c:/grookai_vault/supabase/migrations/20260324162500_patch_execute_card_interaction_outcome_v1.sql)
- [20260324163500_restore_resolve_active_vault_anchor_v1.sql](/c:/grookai_vault/supabase/migrations/20260324163500_restore_resolve_active_vault_anchor_v1.sql)
- [executeCardInteractionOutcomeAction.ts](/c:/grookai_vault/apps/web/src/lib/network/executeCardInteractionOutcomeAction.ts)
- [InteractionGroupExecutionPanel.tsx](/c:/grookai_vault/apps/web/src/components/network/InteractionGroupExecutionPanel.tsx)
- [getUserCardInteractions.ts](/c:/grookai_vault/apps/web/src/lib/network/getUserCardInteractions.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/network/inbox/page.tsx)

---

# TAGS

- interaction-network
- execution-layer
- ownership-model
- market-signal
- p3-complete
