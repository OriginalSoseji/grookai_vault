# CHECKPOINT — BA Phase 7 Identity Domain Field Matrix V1

Date: 2026-04-02

Status: LOCKED
Scope: Exact domain-to-field matrix for `card_print_identity`
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## 1. Domain Version Names

Approved `identity_key_version` values in V1:

- `pokemon_eng_standard:v1`
- `pokemon_ba:v1`
- `pokemon_eng_special_print:v1`
- `pokemon_jpn:v1`

---

## 2. `pokemon_eng_standard`

### Required explicit fields

- `identity_domain = 'pokemon_eng_standard'`
- `identity_key_version = 'pokemon_eng_standard:v1'`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`

### Required payload keys

- `variant_key_current`

Rule:

- `variant_key_current` preserves current canonical identity law where existing canon still distinguishes rows by `variant_key`
- base / empty variant rows are normalized to the explicit payload value `base`

### Optional explicit fields

- `source_name_raw`

### Optional payload keys

- `printed_total`
- `printed_set_abbrev`

### Forbidden identity inputs

- finish-only dimensions: `normal`, `holo`, `reverse`, `pokeball`, `masterball`
- condition
- grading
- pricing
- external ids

### What remains in child printing

- finish-only distinctions remain child-printing or subordinate printing-layer concerns

### Hash input set

Hash uses:

- `identity_domain`
- `identity_key_version`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw = null` unless explicitly populated by a future approved contract
- payload subset:
  - `variant_key_current`

---

## 3. `pokemon_ba`

### Required explicit fields

- `identity_domain = 'pokemon_ba'`
- `identity_key_version = 'pokemon_ba:v1'`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw`

### Optional payload keys

- `printed_total`
- `underlying_card_print_id`
- `upstream_set_id`

### Forbidden identity inputs

- heuristic fields
- guessed underlying identities
- fuzzy name cleanup
- deck inference beyond directly captured printed evidence

### What remains out of identity

- product quantity
- packaging context
- non-card product metadata
- finish-only dimensions

### Hash input set

Hash uses:

- `identity_domain`
- `identity_key_version`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw`
- payload subset:
  - `printed_total` only when the BA domain contract explicitly permits it as an evidence field, not as a discriminator

Hard rule:

- BA uniqueness in V1 is driven by the 4D explicit field set

---

## 4. `pokemon_eng_special_print`

### Required explicit fields

- `identity_domain = 'pokemon_eng_special_print'`
- `identity_key_version = 'pokemon_eng_special_print:v1'`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`

### Required payload keys

- `variant_key_current`
- one or more approved special-print discriminator keys drawn from:
  - `stamp_text`
  - `stamp_program`
  - `release_marking`
  - `distribution_mark`

Rule:

- `variant_key_current` is the compatibility bridge for current canon
- the explicit special-print payload keys are the governed discriminator set that prevents future identity from remaining opaque

### Optional explicit fields

- `source_name_raw`

### Optional payload keys

- `printed_total`
- `printed_set_abbrev`

### Forbidden identity inputs

- finish-only dimensions unless a contract explicitly promotes them into canonical identity
- seller wording
- inferred promo families
- unmanaged catch-all use of `variant_key`

### What remains in child printing

- finish-only dimensions remain in the child printing subsystem unless a contract explicitly says they are canonical identity

### Hash input set

Hash uses:

- `identity_domain`
- `identity_key_version`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw = null` unless explicitly approved for that subfamily
- payload subset:
  - `variant_key_current`
  - any approved present keys from:
    - `stamp_text`
    - `stamp_program`
    - `release_marking`
    - `distribution_mark`

---

## 5. `pokemon_jpn`

### Required explicit fields

- `identity_domain = 'pokemon_jpn'`
- `identity_key_version = 'pokemon_jpn:v1'`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`

Rule:

- V1 stores the approved Japanese identity-name field in `normalized_printed_name`
- if a future Japan-domain contract proves a different explicit identity-name field is necessary, that requires a contract update and new identity-key version

### Optional explicit fields

- `source_name_raw`

### Required payload keys

- `language_code`
- `rarity_policy`
- `edition_marking`
- `release_context`

### Optional payload keys

- `variant_key_current`
- `printed_total`
- `printed_set_abbrev`

### Forbidden identity inputs

- ENG assumptions forced onto JPN identity
- translation synonyms
- inferred rarity backfills
- heuristic set equivalence

### What remains in child printing

- finish-only dimensions remain child-printing concerns unless the Japan-domain contract explicitly promotes them

### Hash input set

Hash uses:

- `identity_domain`
- `identity_key_version`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw = null` unless explicitly approved for a future Japan-domain contract
- payload subset:
  - `language_code`
  - `rarity_policy`
  - `edition_marking`
  - `release_context`
  - `variant_key_current` only when present and contract-approved
