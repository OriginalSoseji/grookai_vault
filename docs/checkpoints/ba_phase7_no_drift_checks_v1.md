# CHECKPOINT — BA Phase 7 No-Drift Checks V1

Date: 2026-04-02

Status: LOCKED
Scope: Compatibility and replayability checks for the identity subsystem rollout
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## D1 — Local Replayability

Check:

- `supabase db reset --local` must remain replayable after implementation

Failure gate:

- any migration design depends on non-replayable manual ordering, hidden state, or dashboard-only setup

---

## D2 — Existing `card_prints` Consumers Continue To Function

Check:

- current consumers of `card_prints`, `gv_id`, pricing joins, vault ownership, and catalog reads continue to resolve through `card_prints` while identity subsystem storage is introduced

Failure gate:

- any design requires downstream readers to pivot away from `card_prints` before the subsystem is proven

---

## D3 — Existing `external_mappings` Need No Anchor Change

Check:

- current mappings remain anchored to `card_prints.id`

Failure gate:

- any migration design requires re-anchoring mappings to `card_print_identity`

---

## D4 — `variant_key` Must Not Be Repurposed

Check:

- `variant_key` may remain a compatibility bridge where current canon already uses it
- `variant_key` must not become the hidden storage location for new identity law

Failure gate:

- any new identity discriminator is packed into `variant_key` instead of the subsystem

---

## D5 — Child Printing Boundaries Remain Intact

Check:

- finish-only dimensions remain out of canonical identity unless a contract explicitly promotes them

Failure gate:

- any design leaks finish-only dimensions into canonical identity unlawfully

---

## D6 — BA Promotion Remains Blocked Until Storage Alignment Lands

Check:

- BA promotion stays blocked until the identity subsystem exists, BA sets are registered, BA identity rows are representable losslessly, and Phase 6 unblock conditions remain satisfied

Failure gate:

- any design path implies BA promotion can start before storage alignment is complete

---

## D7 — No Hidden Manual Schema Edits

Check:

- no dashboard/manual schema edits are allowed
- rollout must be migration-driven and replayable

Failure gate:

- any step depends on non-migration remote edits or hidden reconciliation work
