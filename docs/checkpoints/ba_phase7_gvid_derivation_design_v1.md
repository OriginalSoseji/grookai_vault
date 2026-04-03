# CHECKPOINT — BA Phase 7 GV ID Derivation Design V1

Date: 2026-04-02

Status: LOCKED
Scope: Exact `gv_id` derivation path under the identity subsystem
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## 1. Fixed Boundary

- `gv_id` remains stored on `card_prints`
- `gv_id` derives from the one active canonical identity row
- `card_print_identity` provides the lawful derivation inputs
- `card_prints` remains the public route holder

gv_id remains stored on `card_prints`.

---

## 2. Domain Projection Model

Each active identity row must project into deterministic `gv_id` builder inputs:

- `set_token_source`
- `number_token_source`
- `variant_suffix_source`

Exact projection rules:

- `set_token_source = coalesce(approved printed-set token, set_code_identity)`
- `number_token_source = printed_number`
- `variant_suffix_source = domain-specific discriminator seed or null`

For existing compatible domains, the Phase 8 implementation may continue to call the current `buildCardPrintGvIdV1` builder after projection.

---

## 3. G1 — Existing Backfilled Rows

Rule:

- existing non-null `card_prints.gv_id` values are preserved
- backfilled identity rows do not trigger silent `gv_id` rewrites
- only rows with null `gv_id` may receive a generated value during backfill completion

This preserves `GV_ID_ASSIGNMENT_V1` public stability.

---

## 4. G2 — New Promoted Rows

Rule:

- for newly promoted rows, `gv_id` is generated after the active identity row exists and before the row becomes publicly addressable
- the active identity row is the only lawful derivation input source

---

## 5. G3 — Cross-Domain Determinism

Determinism rule:

- every approved domain/version must define a deterministic `gv_id` projection
- no domain may inject heuristic or runtime-only values

### `pokemon_eng_standard:v1`

- `set_token_source` from set metadata / `set_code_identity`
- `number_token_source = printed_number`
- `variant_suffix_source = identity_payload.variant_key_current`, treating `base` as no suffix

### `pokemon_eng_special_print:v1`

- `set_token_source` from set metadata / `set_code_identity`
- `number_token_source = printed_number`
- `variant_suffix_source` from `identity_payload.variant_key_current`; explicit special-print payload keys remain the governed authority for the identity row even when the suffix source is compatibility-backed

### `pokemon_jpn:v1`

- `set_token_source` from set metadata / `set_code_identity`
- `number_token_source = printed_number`
- `variant_suffix_source` from the approved Japan-domain discriminator seed built from lawful payload keys when required; null when not required

---

## 6. G4 — BA Source Name Participation

Battle Academy requires the full 4D identity law.

Therefore the BA `gv_id` projection must include both:

- `normalized_printed_name`
- `source_name_raw`

Exact BA suffix seed:

```text
ba_source::<normalized_printed_name>::<source_name_raw>
```

Projection rule for `pokemon_ba:v1`:

- `set_token_source = set_code_identity`
- `number_token_source = printed_number`
- `variant_suffix_source = ba_source::<normalized_printed_name>::<source_name_raw>`

Phase 8 may normalize that seed using the same upper-hyphen token rules already used by the current `gv_id` builder.

This keeps BA `gv_id` derivation based on the full BA identity law rather than a partial key.

---

## 7. G5 — Future Identity Law Version Changes

Hard rule:

- future identity-law version changes must not silently rewrite existing public `gv_id` values

If a future identity version would change the projection inputs for already-public rows:

- stop
- write an explicit `gv_id` contract or migration artifact
- plan the backfill explicitly

No silent `gv_id` rotation is lawful.
