# CHECKPOINT — BA Phase 7 Identity Key Hash Design V1

Date: 2026-04-02

Status: LOCKED
Scope: Exact deterministic hash-input contract for `card_print_identity.identity_key_hash`
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## 1. Purpose

`identity_key_hash` must be reproducible across:

- existing-canon backfill
- future ingestion
- BA enablement
- replay from a clean local reset

The hash contract must therefore be fixed, ordered, and versioned.

---

## 2. Hash Function

Exact design:

```text
identity_key_hash = sha256(serialized_identity_key_v1)
```

Output format:

- lowercase hex digest

No alternate hash functions are lawful in V1.

---

## 3. Base Input Contract

Base input fields:

- `identity_domain`
- `identity_key_version`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw`
- approved domain-specific dimensions

Hard rule:

- `identity_key_version` is included in the hash input
- any version change necessarily changes the hash space

---

## 4. Field Normalization Rules Before Serialization

### Required text fields

- must be non-null
- must be non-empty after trim
- use the stored canonical value, not an alternate recomputation

### Optional text fields

- `null`, `undefined`, and blank-string-after-trim` -> null`
- no fuzzy cleanup
- no synonym expansion

### Domain-specific payload fields

- only approved keys for the domain/version may participate
- keys not approved for the domain/version are excluded entirely
- approved keys missing from the row serialize as `null`

### Finish-only dimensions

- excluded from canonical hash input unless a contract explicitly promotes them into canonical identity

---

## 5. Serialization Format

Exact serialization format:

```text
JSON.stringify([
  ["identity_domain", identity_domain],
  ["identity_key_version", identity_key_version],
  ["set_code_identity", set_code_identity],
  ["printed_number", printed_number],
  ["normalized_printed_name", normalized_printed_name_or_null],
  ["source_name_raw", source_name_raw_or_null],
  ["domain_dimensions", ordered_domain_dimensions]
])
```

Where `ordered_domain_dimensions` is:

- an array of `[key, value]` pairs
- keys sorted lexicographically ascending
- only approved keys for the row's domain/version

Example shape:

```json
[
  ["identity_domain", "pokemon_ba"],
  ["identity_key_version", "pokemon_ba:v1"],
  ["set_code_identity", "ba-2024"],
  ["printed_number", "188"],
  ["normalized_printed_name", "potion"],
  ["source_name_raw", "Potion - Pikachu 15"],
  ["domain_dimensions", [["printed_total", 192], ["underlying_card_print_id", null], ["upstream_set_id", "battle-academy-2024-pokemon"]]]
]
```

---

## 6. Approved Domain Dimension Sets

### `pokemon_eng_standard:v1`

Approved payload keys in hash:

- `variant_key_current`

Optional but excluded from hash in V1:

- `printed_total`
- `printed_set_abbrev`

### `pokemon_ba:v1`

Approved payload keys in hash:

- none required beyond the 4D explicit field set

Optional evidence keys stored but excluded from uniqueness hash in V1:

- `printed_total`
- `underlying_card_print_id`
- `upstream_set_id`

### `pokemon_eng_special_print:v1`

Approved payload keys in hash:

- `variant_key_current`
- `stamp_text`
- `stamp_program`
- `release_marking`
- `distribution_mark`

### `pokemon_jpn:v1`

Approved payload keys in hash:

- `language_code`
- `rarity_policy`
- `edition_marking`
- `release_context`
- `variant_key_current` only when present and lawful for the row

---

## 7. Reproducibility Rules

1. Field order is fixed.
2. Missing optional fields serialize as `null`.
3. Domain payload keys are lexicographically sorted.
4. The same row content must always yield the same hash.
5. Different approved identity content must yield a different hash within the same domain/version.

No SQL is written in this phase.
