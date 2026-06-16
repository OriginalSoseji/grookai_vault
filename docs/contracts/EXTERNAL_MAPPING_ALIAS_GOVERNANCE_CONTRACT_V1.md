# EXTERNAL_MAPPING_ALIAS_GOVERNANCE_CONTRACT_V1

Status: ACTIVE
Type: System Contract
Scope: Governs duplicate active `external_mappings` where more than one upstream source identifier currently points at the same Grookai `card_print_id`
Authority: Aligns with `EXTERNAL_SOURCE_INGESTION_MODEL_V1`, `EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1`, `CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1`, and `MASTER_INDEX_GOVERNANCE_CONTRACT_V1`

---

## 1. Purpose

This contract defines how Grookai treats source-card duplicate external mappings after the English physical canon reconciliation and enrichment passes.

Some duplicate mappings are true formatting duplicates and can be deactivated when proven. Others are valuable product, deck, promo, suffix, or terminology aliases that should not be destroyed simply because they do not belong as active canonical owner mappings.

The goal is to protect both invariants:

- canonical mapping ownership must stay deterministic
- useful external alias intelligence must not be discarded

---

## 2. Core Principle

`external_mappings` is the canonical source ownership bridge.

It is not the long-term storage location for every source synonym, product slug, deck alias, prize-pack alias, text alias, or suffix/base lookup hint.

When a source identifier is useful but not the canonical source owner, it must be preserved as alias evidence before any deactivation is considered.

---

## 3. Canonical Ownership Rule

For each source and canonical card object, Grookai should converge toward one active canonical ownership mapping unless an explicit source contract permits more.

The active mapping should represent the best canonical source identifier for that card identity.

Duplicate active mappings may be reduced only when the loser row is one of:

- proven formatting duplicate
- proven stale source identifier
- proven relocated owner mapping
- proven invalid mapping
- preserved alias that has already been copied to a governed sidecar

---

## 4. Alias Preservation Rule

The following source identifiers must not be blindly deactivated:

- product aliases
- deck aliases
- Battle Academy aliases
- Prize Pack aliases
- prerelease aliases
- league or winner aliases
- stamp/product overlay aliases
- suffix/base source aliases
- source terminology aliases such as secret/rainbow rare duplicates
- spelling or text aliases
- Pocket product aliases

These rows may be useful for:

- product intelligence
- source reconciliation
- future image acquisition
- search recovery
- pricing source routing
- audit provenance

They must remain blocked from destructive cleanup until a sidecar or equivalent governed preservation target exists.

---

## 5. Future Sidecar Shape

This contract does not create a schema change.

Future alias preservation should use a governed storage shape equivalent to:

```text
source_aliases_sidecar
  canonical_card_print_id
  canonical_external_mapping_id
  source
  alias_external_id
  alias_kind
  alias_status
  source_domain
  evidence_reason
  preserved_from_mapping_id
  created_from_audit
  active
```

Allowed alias kinds include:

```text
product_alias
deck_alias
prize_pack_alias
battle_academy_alias
prerelease_alias
league_alias
winner_alias
suffix_alias
base_number_alias
terminology_alias
text_alias
pocket_product_alias
manual_review_alias
```

---

## 6. Readiness Classes

Current duplicate mapping groups must be classified before any write:

- `formatting_duplicate_ready`
- `preserve_until_sidecar`
- `suffix_alias_review`
- `terminology_alias_review`
- `text_alias_review`
- `pocket_alias_blocked`
- `manual_source_specific_review`

Only `formatting_duplicate_ready` may proceed directly to a guarded deactivation package.

All other classes must remain no-write until sidecar preservation, source-specific adjudication, or explicit review makes them safe.

---

## 7. Forbidden Behaviors

The following are forbidden:

- deleting or deactivating product aliases before preservation
- treating alias existence as canonical truth
- promoting source aliases into card identity
- using source alias strings to overwrite parent identity
- collapsing suffix/base aliases without source-specific owner proof
- hiding Pocket aliases inside English physical canon
- weakening preflight by ignoring duplicate mapping classes without documentation

---

## 8. Current Governance Outcome

After the PokemonAPI zero-padding cleanup, the remaining source-card duplicate mapping groups are deferred governance debt, not cleanup-ready rows.

Their correct state is:

```text
preserve, classify, and sidecar later
```

not:

```text
deactivate now
```

---

## 9. Final Principle

Do not throw away source intelligence to make a duplicate counter smaller.

Make the intelligence safe, then tighten the invariant.
