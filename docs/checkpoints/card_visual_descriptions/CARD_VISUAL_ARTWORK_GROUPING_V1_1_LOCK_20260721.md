# Card Visual Artwork Grouping V1.1 Lock

Status: COMPLETE - GROUPING MANIFEST LOCKED

Date: 2026-07-21

## Context

The locked visual-search eligibility corpus contains `9,702` Tier A/B non-Energy card-print rows. Search must retrieve distinct artwork before expanding to printings, but source data cannot safely assume that similarly named cards or visually similar images share artwork.

## Problem

Without a governed artwork identity layer, duplicate printings can crowd search results and shared artwork facts can be copied across unrelated variants. Grouping must be deterministic, fail closed, and independent of model or embedding similarity.

## Risk

An unsafe merge could attach visual facts to the wrong canonical printing. It could also imply that a stamp, logo, border, text line, error, color difference, or finish was observed on a variant whose own image was unavailable.

## Decision

Lock `CARD_VISUAL_ARTWORK_GROUPING_V1_1` with authority:

```text
exact source image SHA-256
+ normalized canonical name
+ prompt branch
```

All three must agree. Same-name rows with different image hashes remain separate. Visual similarity, graph similarity, embeddings, set/number, and name similarity cannot authorize a merge.

## Narrow Repair Before Lock

The first V1 run at commit `ac403167` reconciled but produced `12` conflict rows across `6` exact-image pairs. Every pair differed only by typographic apostrophes or terminal `EX/GX` hyphen spacing.

V1.1 at commit `de9ca5d5` added only:

- typographic apostrophe normalization;
- terminal `-EX`/` EX` normalization; and
- terminal `-GX`/` GX` normalization.

Meaningful species punctuation such as `Ho-Oh` and `Porygon-Z` remains unchanged. Exact image and branch equality are still mandatory.

## Alternatives Rejected

- Group by card name alone: same names frequently have different artwork.
- Group by set/number: variants and reprints can still differ.
- Group by visual or embedding similarity: similarity is not identity authority.
- Treat all shared hashes as one artwork: cross-name or cross-branch image reuse could reflect source defects.
- Inherit print markers with shared artwork: image equality for one source does not prove every printing-specific feature.

## Locked Result

Producing grouping commit: `de9ca5d5a1c1b8a58cb18aec0fc3f55b47b8153e`

Audit implementation commit: `4c321ffe5f5837bb1fcfada4fcfbe42bd9535e3d`

- Eligible rows: `9,702`
- Memberships: `9,702`
- Artwork groups: `9,532`
- Singleton groups: `9,372`
- Multi-member groups: `160`
- Multi-member memberships: `330`
- Explicit conflicts: `0`
- Duplicate memberships: `0`
- Duplicate groups: `0`
- Tier C memberships: `0`
- Energy memberships: `0`
- Reconciliation findings: `0`

## Audit Proof

The deterministic engineering audit verified all `9,532` group hashes and all `9,702` memberships globally. It then adjudicated `75/75` sampled cases as policy-correct:

- `25` multi-member groups;
- `25` singleton groups; and
- `25` same-name/different-image split families.

The corpus contains `1,947` same-name/different-image families, confirming why name-only grouping is unsafe. Input artifact hash mismatches were `0`. This was not human visual approval.

## Current Truths

- Exact shared image bytes plus normalized identity and branch can authorize shared artwork facts.
- A singleton means no safe merge partner exists in this corpus, not that the artwork is globally unique.
- Same canonical name does not imply same artwork.
- Group Tier A requires every member to be Tier A; otherwise the group is Tier B.
- Group guards are the union of member guards.
- All source visual graphs remain derived intelligence with their original review status.

## Invariants

- Every eligible row appears exactly once in a group membership or explicit conflict.
- Tier C and Energy rows never enter active artwork groups.
- Group IDs and hashes are stable and independent of processing order or timestamps.
- Shared artwork never overwrites canonical card-print identity.
- `not_observed` never means absent.

## What Must Never Be Broken

- Never merge artwork from name, set, number, graph, color, or vector similarity alone.
- Never copy stamps, logos, text lines, borders, errors, finishes, or other print markers across variants without their own evidence.
- Never treat an artwork group as canonical identity truth.
- Never allow a conflicted or incomplete source row into active projections.
- Never activate search from unreconciled grouping artifacts.

## Boundaries Proven

No provider calls, database connections or writes, approvals, embeddings, search projections, index writes, or public reads occurred during grouping or its audit.

## Artifacts

Grouping:

`docs/audits/card_visual_artwork_grouping_v1_1/2026-07-21T16-45-14-932Z_grouping_424dbd1f2469/`

Audit:

`docs/audits/card_visual_artwork_grouping_audit_v1/2026-07-21T16-48-08-040Z_audit_04df9ccff639/`

Both directories contain immutable run plans, exact JSON/JSONL evidence, reconciliation reports, and SHA-256 manifests.

## Tests

- Grouping, audit, eligibility, and corpus targeted contracts: `40/40` passed.
- Syntax/import checks: passed.
- `git diff --check`: passed.

The repository-wide shipcheck was not run because the local environment lacks `SUPABASE_DB_URL`; no database-dependent result is claimed.

## Explicit Next Gate

Build deterministic Tier A/Tier B subject, scene, and style/composition projection documents from the locked artwork manifest. Enforce every V1.4 projection guard, preserve evidence references and exclusions, and run lexical/structured evaluation offline. Do not generate embeddings, write index tables, or expose public search yet.
