# Missing Set Universe Decision 2026-05-17

Status: no-write decision artifact. No Supabase writes, migrations, inserts, updates, deletes, set creation, card backfill, alias changes, or mapping changes are authorized by this document.

## Purpose

Classify the 18 PkmnCards master sets or collections that the master-set audit reported with no DB match.

This pass decides what each missing universe item is before any future implementation plan exists. The goal is to avoid creating duplicate sets, importing cards into the wrong owner, or treating source collection pages as canonical physical sets without product policy.

## Source Evidence

- `docs/audits/pokemon_master_set_audit_v1/pokemon_master_set_audit_v1.md`
- `docs/audits/pokemon_master_set_audit_v1/summary.json`
- `docs/plans/pokemon_db_remediation_v1/missing_sets_plan.md`
- `docs/plans/pokemon_db_remediation_v1/source_route_equivalence_evidence_20260517.md`
- Live read-only Supabase evidence gathered on 2026-05-17 inside `begin transaction read only`.

Read-only DB evidence changed two important audit interpretations:

- `Shiny Vault` has an existing DB target row: `sma` / `Hidden Fates Shiny Vault`, with 94 `card_prints` and 94 distinct numbers from `SV1` through `SV94`.
- `Rumble (RM)` has an existing DB target row: `ru1` / `Pokemon Rumble`, with 16 `card_prints`, 16 distinct numbers, and a canonical `set_code_classification` row.

Those two should not become new set-create work.

Later source-route equivalence evidence proved:

- `Shiny Vault` is a 94/94 exact number/name checklist match to existing `sma`.
- `Rumble (RM)` is a 16/16 exact number/name checklist match to existing `ru1`.
- Both are future route/source mapping planning candidates only. They are not card-insert or set-create candidates.

## Classification Summary

| Classification | Count |
| --- | ---: |
| Canonical physical set needed | 4 |
| Promo/subset/special collection needing policy decision | 12 |
| External-only/no app support yet | 1 |
| Needs further evidence | 1 |

## Decision Matrix

| Source item | Cards | Classification | Current decision |
| --- | ---: | --- | --- |
| Black & White Energy (2011 Unnumbered) | 8 | Promo/subset/special collection needing policy decision | Energy-only unnumbered collection. Do not create until energy-collection policy exists. |
| Shiny Vault | 94 | Promo/subset/special collection needing policy decision | Existing DB row `sma` appears to own the checklist. Treat as source-routing/collection mapping work, not set creation. |
| HS Energy (2010 Unnumbered) | 8 | Promo/subset/special collection needing policy decision | Energy-only unnumbered collection. Do not create until energy-collection policy exists. |
| Mega Evolution Energy (MEE) | 8 | Promo/subset/special collection needing policy decision | Numbered energy collection. Needs energy policy and source corroboration before support. |
| Pokemon Trading Card Game Classic - Blastoise (CLB) | 34 | Canonical physical set needed | Real English product deck/checklist. Future target-set dry-run should start here. |
| Pokemon Trading Card Game Classic - Charizard (CLC) | 34 | Canonical physical set needed | Real English product deck/checklist. Future target-set dry-run should include this with the other Classic decks. |
| Pokemon Trading Card Game Classic - Venusaur (CLV) | 34 | Canonical physical set needed | Real English product deck/checklist. Future target-set dry-run should include this with the other Classic decks. |
| Box Topper | 12 | Promo/subset/special collection needing policy decision | Special release bucket. Needs canonical/search/vault policy before support. |
| Miscellaneous | 0 | External-only/no app support yet | Zero parsed checklist cards. Do not create a DB set from this source bucket. |
| Victory Medals | 9 | Promo/subset/special collection needing policy decision | Prize/promo collection. Needs product policy and numbering policy before support. |
| World Collection | 9 | Promo/subset/special collection needing policy decision | Special product collection. Needs English-language and source-identity policy before support. |
| Rumble (RM) | 16 | Needs further evidence, now resolved by source-route evidence | Existing DB row `ru1` owns the checklist by 16/16 exact equivalence. Plan source alias/mapping only; do not create a set or insert cards. |
| McDonald's Match Battle 2023 (M23) | 15 | Canonical physical set needed | Real English physical promo set. Existing McDonald's rows stop at 2022 in live evidence; future target-set dry-run needed. |
| Sun & Moon Energy | 9 | Promo/subset/special collection needing policy decision | Energy-only unnumbered collection. Do not create until energy-collection policy exists. |
| Sun & Moon Energy (Team Up) | 9 | Promo/subset/special collection needing policy decision | Energy-only unnumbered Team Up-era collection. Needs parent/subset policy. |
| Sword & Shield Energy | 9 | Promo/subset/special collection needing policy decision | Energy-only unnumbered collection. Do not create until energy-collection policy exists. |
| Sword & Shield Energy (Brilliant Stars) | 8 | Promo/subset/special collection needing policy decision | Energy-only unnumbered Brilliant Stars-era collection. Needs parent/subset policy. |
| XY Energy (2013 Unnumbered) | 9 | Promo/subset/special collection needing policy decision | Energy-only unnumbered collection. Do not create until energy-collection policy exists. |

## Recommended Review Order

1. Prove non-create mappings first:
   - `Shiny Vault` source collection to existing `sma`.
   - `Rumble (RM)` source checklist to existing `ru1`.
2. Build target-set dry-runs for high-confidence canonical physical sets:
   - Classic Blastoise (`CLB`)
   - Classic Charizard (`CLC`)
   - Classic Venusaur (`CLV`)
   - McDonald's Match Battle 2023 (`M23`)
3. Define energy-collection policy before any energy set creation:
   - unnumbered era energy collections
   - numbered `MEE`
   - parent/subset routing
   - search and vault support
4. Define special-bucket policy:
   - Box Topper
   - Victory Medals
   - World Collection
5. Leave `Miscellaneous` unsupported unless a future audit finds real checklist rows.

## Future No-Write Queue

| Queue | Scope | Output |
| --- | --- | --- |
| `MISSING_SET_ALIAS_EVIDENCE_V1` | `Shiny Vault`, `Rumble` | Prove existing DB target ownership and source-route shape. |
| `MISSING_SET_TARGET_DRY_RUN_V1` | `CLB`, `CLC`, `CLV`, `M23` | Proposed canonical set rows, aliases, source mappings, and post-write checks. |
| `ENERGY_COLLECTION_POLICY_V1` | 8 energy collections | Decide canonical set vs subset/source-only handling. |
| `SPECIAL_COLLECTION_POLICY_V1` | Box Topper, Victory Medals, World Collection | Decide app support, routing, and vault/search behavior. |
| `MISCELLANEOUS_BUCKET_POLICY_V1` | Miscellaneous | Keep external-only unless card evidence appears. |

## Stop Conditions

Any future implementation must stop if:

- A proposed target set already exists under another code.
- Source checklist ownership overlaps an existing DB set.
- A collection page is being treated as a canonical set without product policy.
- An energy-only collection lacks numbering, parent routing, or collector-support policy.
- English-language scope is ambiguous.
- The future plan includes card inserts before target set ownership is proven.
- The future plan includes variants or finishes during set creation.
- The future plan includes Supabase writes without a fresh preflight and explicit approval.

## No-Write Confirmation

This decision pack authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set creation, alias mutation, mapping movement, metadata merge, missing-card backfill, or variant changes.
