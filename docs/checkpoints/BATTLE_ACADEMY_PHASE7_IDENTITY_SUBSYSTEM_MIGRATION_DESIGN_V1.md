# CHECKPOINT — Battle Academy Phase 7 Identity Subsystem Migration Design V1

Date: 2026-04-02

Status: LOCKED
Scope: Exact migration-ready design for the identity subsystem
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## 1. Why Option B Required Migration Design Before Implementation

Phase 6 selected Option B at the architecture level.
That was enough to lock ownership boundaries, but not enough to write safe migrations.

The next failure mode would have been drift:

- different migrations inferring different table shapes
- uniqueness split across `card_prints` and a new table
- BA storage implemented ad hoc
- `gv_id` and mapping anchors moving implicitly

Phase 7 closes that gap by turning the approved architecture into one exact migration-ready design.

---

## 2. Target Table Summary

Target table:

```text
public.card_print_identity
```

Core shape:

- UUID primary key with repo-standard `gen_random_uuid()` default
- parent `card_print_id`
- explicit universal identity fields:
  - `identity_domain`
  - `set_code_identity`
  - `printed_number`
  - `normalized_printed_name`
  - `source_name_raw`
- governed extension zone:
  - `identity_payload`
- versioning and uniqueness fields:
  - `identity_key_version`
  - `identity_key_hash`
- lifecycle fields:
  - `is_active`
  - `created_at`
  - `updated_at`

---

## 3. Constraint Summary

The migration design locks these constraints:

- PK on `id`
- FK `card_print_id -> card_prints(id)`
- one active identity row per `card_print`
- active uniqueness on `(identity_domain, identity_key_version, identity_key_hash)`
- `identity_domain` guarded to the approved V1 domains
- final-state invariant that no `card_print` remains identity-less after backfill

The active-row constraints are intentionally designed as partial unique indexes in Postgres.

---

## 4. Index Summary

The design adds:

- active lookup by `card_print_id`
- history lookup by `card_print_id`
- domain lookup
- active lookup by domain/version/hash
- domain-qualified lookup by `set_code_identity + printed_number`
- domain-qualified lookup by `normalized_printed_name` when populated

Every index is tied to either:

- backfill support
- steady-state lookup
- or both

---

## 5. Domain Strategy Summary

Approved V1 domains:

- `pokemon_eng_standard:v1`
- `pokemon_ba:v1`
- `pokemon_eng_special_print:v1`
- `pokemon_jpn:v1`

Rules:

- universal dimensions live in explicit columns
- domain-specific dimensions live in governed payload keys
- finish-only dimensions stay out of canonical identity unless a contract explicitly promotes them
- `variant_key` may exist only as a compatibility bridge where current canon already depends on it

---

## 6. GV ID Derivation Summary

`gv_id` remains on `card_prints`.

The active identity row becomes the lawful derivation input source.

Rules locked in Phase 7:

- existing non-null `gv_id` values stay stable
- new rows derive `gv_id` only after an active identity row exists
- BA requires a suffix seed derived from both `normalized_printed_name` and `source_name_raw`
- future identity-law version changes must not silently rotate public `gv_id`s

---

## 7. Mappings Continuity Summary

`external_mappings` stays anchored to `card_prints`.

That remains true during:

- identity backfill
- BA storage alignment
- later BA promotion

The identity subsystem changes identity authority, not the external mapping anchor.

---

## 8. Backfill Strategy Summary

The ordered design phases are:

- `7A` schema introduction design
- `7B` existing canon backfill design
- `7C` binding verification design
- `7D` `gv_id` derivation alignment design
- `7E` BA enablement design

BA is deliberately last.
No BA promotion is lawful until the subsystem exists, existing canon is backfilled safely, and BA rows can be represented losslessly.

---

## 9. BA Alignment Summary

Phase 7 makes BA storage exact under Option B:

- `ba_set_code` -> `card_print_identity.set_code_identity`
- `printed_number` -> `card_print_identity.printed_number`
- `normalized_printed_name` -> `card_print_identity.normalized_printed_name`
- `source_name_raw` -> `card_print_identity.source_name_raw`

Result:

- all `328` BA candidates can be projected into `pokemon_ba:v1`
- BA no longer needs ad hoc `card_prints` columns
- BA remains blocked until the subsystem exists and BA sets are registered

---

## 10. Phase Boundary

This phase defines the exact migration-ready design for the identity subsystem. It does not implement schema change and does not promote BA canon rows.

Nothing in this phase:

- writes migration SQL
- changes live schema
- promotes BA rows
- moves `gv_id` off `card_prints`
- moves `external_mappings` off `card_prints`

---

## 11. Next Phase

Next lawful artifact:

```text
BA_PHASE8_IDENTITY_SUBSYSTEM_MIGRATIONS_V1
```

That phase may write the actual migrations and implementation plan from this locked design.
