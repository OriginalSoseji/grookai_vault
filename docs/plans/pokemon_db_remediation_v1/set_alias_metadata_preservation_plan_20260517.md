# Set Alias Metadata Preservation Plan 2026-05-17

Status: no-write planning artifact. No Supabase writes, migrations, inserts, updates, deletes, set merges, card movement, mapping movement, or metadata copies are authorized by this document.

## Purpose

This plan defines how to preserve metadata and source provenance for the 20 route-clean alias candidates before any future set canonicalization work.

The route layer is now clean for the 20 alias candidates, including the executed route fixes for `sv3pt5 -> sv03.5` and `sm35 -> sm3.5`. The remaining risk is metadata: alias rows still contain source payloads, image URLs, release dates, or printed totals that may not be represented on the canonical row.

This is not a write plan. It is the policy and evidence pack for deciding whether any future metadata write is needed.

## Source Evidence

- `set_alias_prewrite_evidence_20260517.md`
- `set_alias_prewrite_evidence_matrix_20260517.json`
- `set_alias_route_classification_execution_20260517.md`
- `set_alias_route_classification_write_plan_20260517.md`
- `set_alias_dependency_audit_20260517.md`
- `set_alias_write_plan_dry_run_20260517.md`

Current evidence from the prewrite matrix:

- 20 alias pairs audited.
- 0 blockers.
- 0 route review items.
- 0 missing alias classification rows.
- 0 mismatched alias classification rows.
- 20 alias rows own zero cards.
- 20 alias rows have no hidden non-card FK dependencies.
- 20 canonical rows own real `card_prints`.
- 20 still require metadata/source review.

## Scope

In scope:

- The 20 alias candidates from the post-route-fix evidence matrix.
- Metadata behavior on `sets` rows.
- Source payload preservation.
- Future review queue for possible metadata copy decisions.

Out of scope:

- Hard-stop pairs: `sv04.5`/`sv4pt5`, `pgo`/`swsh10.5`, `sv08.5`/`sv8pt5`, `sv06.5`/`sv6pt5`.
- Prior review-stop pairs: `bog`/`bp`, `tk-ex-m`/`tk2b`, `tk-ex-p`/`tk2a`, `tk-ex-latia`/`tk1a`, `tk-ex-latio`/`tk1b`.
- Card movement.
- Alias-row deletion.
- External mapping movement.
- Missing-card backfill.
- Missing-set creation.
- Variant modeling.
- Pricing, vault, and scanner remediation.

## Policy

The canonical physical set remains the owner of real card inventory. Alias rows remain permanent routing/source-preservation records unless a future approved migration introduces a normalized alias/source table.

Metadata must not be blindly merged into canonical rows.

### Source Payloads

All 20 alias candidates have `source` differences. Treat `source` as provenance, not canonical display metadata. Do not overwrite or JSON-merge canonical `source` from alias `source` without a separate source-authority design.

Recommended future model:

```text
canonical physical set
+
permanent alias/source-routing layer
+
source-specific set metadata snapshots
```

### Null-Only Fields

Several alias rows have values where canonical rows are null, usually `release_date`, `logo_url`, or `symbol_url`. These are copy candidates only after exact field-level approval.

Null-only does not mean safe. It only means the future decision is simpler because it would not overwrite a canonical value.

### Conflicting Canonical Fields

Do not overwrite canonical non-null fields from alias rows.

Current explicit conflict queue:

- `swsh35 -> swsh3.5`: `printed_total` differs and requires manual review.
- `sv6 -> sv06`: `logo_url` and `symbol_url` differ and require asset-authority review.

### Route Preservation

Route/search preservation is now handled by `set_code_classification`. Metadata preservation should not depend on deleting alias rows. Alias rows should remain addressable as permanent redirects/source-routing records.

## Candidate Matrix

| Alias | Canonical | Name | Manual review fields | Null-only candidates | Recommended action |
| --- | --- | --- | --- | --- | --- |
| `sv3pt5` | `sv03.5` | 151 | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `zsv10pt5` | `sv10.5b` | Black Bolt | `source` | `logo_url`, `symbol_url` | Preserve alias metadata; review null-only assets separately. |
| `swsh35` | `swsh3.5` | Champion's Path | `printed_total`, `source` | `release_date`, `logo_url`, `symbol_url` | Hard manual metadata review; do not copy `printed_total`. |
| `swsh12pt5` | `swsh12.5` | Crown Zenith | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `sm7.5` | `sm75` | Dragon Majesty | `source` | none | Preserve alias metadata only. |
| `hgssp` | `hsp` | HeartGold SoulSilver Promos | `source` | none | Preserve alias metadata only. |
| `sv9` | `sv09` | Journey Together | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `lc` | `base6` | Legendary Collection | `source` | none | Preserve alias metadata only. |
| `me1` | `me01` | Mega Evolution | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `sv3` | `sv03` | Obsidian Flames | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `sv4` | `sv04` | Paradox Rift | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `me2` | `me02` | Phantasmal Flames | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `sv1` | `sv01` | Scarlet and Violet | `source` | `logo_url`, `symbol_url` | Preserve alias metadata; review null-only assets separately. |
| `swsh45` | `swsh4.5` | Shining Fates | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `sm35` | `sm3.5` | Shining Legends | `source` | `release_date` | Preserve alias metadata; review null-only release date separately. |
| `sv7` | `sv07` | Stellar Crown | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `sv8` | `sv08` | Surging Sparks | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `sv5` | `sv05` | Temporal Forces | `source` | `release_date`, `logo_url`, `symbol_url` | Preserve alias metadata; review null-only fields separately. |
| `sv6` | `sv06` | Twilight Masquerade | `logo_url`, `symbol_url`, `source` | none | Asset-authority review; do not overwrite canonical assets. |
| `rsv10pt5` | `sv10.5w` | White Flare | `source` | `logo_url`, `symbol_url` | Preserve alias metadata; review null-only assets separately. |

## Future Review Queue

1. Generate a source-payload diff summary per alias/canonical pair.
2. Decide whether source payloads need a normalized source-metadata table instead of set-row merges.
3. Review `swsh35` printed-total semantics against source authorities before any card or set metadata change.
4. Review `sv6` asset authority before choosing PokemonTCG image URLs over existing TCGdex asset URLs.
5. Batch null-only candidates by field:
   - release dates
   - logos
   - symbols
6. Decide whether the correct immediate action is no metadata write at all.

## Future Write Gates

Any future metadata write must stop if:

- An alias row owns cards.
- An alias row gains hidden non-card FK dependencies.
- A hard-stop or review-stop pair enters scope.
- Route classification regresses or becomes ambiguous.
- The target canonical row is missing.
- The source field is being overwritten or merged without a source-authority contract.
- A non-null canonical metadata field conflicts with alias metadata.
- External mappings require movement.
- The proposed change cannot be rolled back without losing source provenance.

## Recommended Next Step

Do not write metadata now.

The next safe step is a no-write source-payload diff report for the 20 route-clean alias candidates. That report should answer whether source provenance belongs in a new normalized authority model before any field-level metadata copy is considered.

## No-Write Confirmation

This plan does not authorize Supabase writes, migrations, inserts, updates, deletes, card movement, set deletion, metadata merge, or mapping movement.
