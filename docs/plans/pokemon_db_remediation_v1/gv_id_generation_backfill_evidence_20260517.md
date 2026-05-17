# GV-ID Generation Backfill Evidence - 2026-05-17

Status: no-write evidence pack for the 218 Lane A rows that still lack public `gv_id`. This is not a write plan and authorizes no Supabase writes, migrations, inserts, updates, deletes, generated ID backfill execution, public view rewrites, deploys, card movement, set changes, missing-card backfill, or variant changes.

## Product Gate

The public web gate stays strict: no stable `gv_id`, no public `/card/[gv_id]` route. This evidence pack does not recommend loosening public queries or exposing rows without stable IDs.

## Source Evidence

- `docs/audits/pokemon_post_lane_a_247_audit_20260517/gv_id_public_coverage_matrix_20260517.json`
- `backend/warehouse/buildCardPrintGvIdV1.mjs`
- Live Supabase read-only transaction for collision, duplicate-owner, namespace, identity, mapping, and reference evidence.

## Headline Counts

| Metric | Count |
| --- | --- |
| Rows audited | 218 |
| Builder produced candidate | 218 |
| Builder failed | 0 |
| Distinct proposed gv_id values | 218 |
| Internal proposed gv_id duplicates | 0 |
| Exact live gv_id collisions | 0 |
| Semantic duplicate public-owner rows | 10 |
| Padding convention collision rows | 10 |
| Namespace/source policy review rows | 208 |
| Blocked rows | 10 |
| Recommended immediate writes | 0 |

## Set Breakdown

| Set | Name | Rows | Namespace | Status | Duplicate owners | Padding collisions | Existing set GV IDs | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A3a | Extradimensional Crisis | 103 | A3A | POLICY_REVIEW | 0 | 0 | 0 | Do not backfill yet; approve namespace/source-domain policy first. |
| fut2020 | Pokémon Futsal 2020 | 5 | FUT2020 | POLICY_REVIEW | 0 | 0 | 0 | Do not backfill yet; approve namespace/source-domain policy first. |
| mep | MEP Black Star Promos | 10 | MEP | BLOCKED | 10 | 10 | 10 | Do not backfill; resolve duplicate public-owner/padding evidence first. |
| P-A | Promos-A | 100 | P-A | POLICY_REVIEW | 0 | 0 | 0 | Do not backfill yet; approve namespace/source-domain policy first. |

## Findings

- `mep` is not a simple missing-`gv_id` lane. The 10 missing rows duplicate existing public MEP rows that already own padded `GV-PK-MEP-001` through `GV-PK-MEP-010`; those rows need duplicate-resolution design, not ID minting.
- `A3a`, `P-A`, and `fut2020` have collision-free candidate strings from the current builder, but no established same-set public GV-ID pattern. They require namespace/source-domain policy approval before any write plan.
- The existing public gate is correct: rows without `gv_id` should remain absent from `/card/[gv_id]` routes until stable IDs are explicitly approved and assigned.

## Candidate Policy

Candidate strings in the JSON matrix are evidence only. They are not approved IDs. A future write plan must prove exact candidate equality against a freshly regenerated matrix, prove zero live drift, prove no semantic duplicate public owners, and explicitly choose namespace policy for each included set.

## Required Future Gates

- Regenerate this matrix from live DB immediately before any future write plan.
- Exclude all `BLOCKED` rows.
- Require explicit namespace approval for `A3a`, `P-A`, and `fut2020` before they can move from policy review to write-plan candidate.
- Resolve `mep` duplicate ownership before any `mep` GV-ID backfill is considered.
- Verify proposed `gv_id` values are exact-match collision-free and semantically collision-free after padding/number normalization.
- Update only `card_prints.gv_id` in any future approved transaction; do not touch routes, public view filters, card numbers, mappings, raw imports, sets, images, missing cards, or variants.
- Post-verify exact changed row count, unique GV-ID ownership, public card route readiness, and no related table changes.

## Confirmation

- Supabase writes: none.
- Migrations: none.
- Data changes: none.
- Public web gates loosened: no.
- Deploy: none.
