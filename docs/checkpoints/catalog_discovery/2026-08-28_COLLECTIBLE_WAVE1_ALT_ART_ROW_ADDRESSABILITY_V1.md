# Collectible Wave 1 Alternative Artwork Row Addressability V1

## Status

`COMPLETE - METADATA-ONLY SOURCE ROW ADDRESSABILITY`

The 124 Yu-Gi-Oh source cards previously known only through an aggregate
multi-image count are now individually addressable by source card ID and stable
source image IDs. The gate does not assign an image to a set printing and does
not grant canonical, image, or write authority.

## Context

The Wave 1 parser produced 44,443 Yu-Gi-Oh printing candidates and reported
124 source cards with multiple source images. Canonical reconciliation could
preserve only the aggregate count because the affected source cards were not
emitted as evidence rows.

This refinement uses the same byte-identical YGOPRODeck metadata response to
identify the exact 124 source cards. It records stable source-owned image IDs
and the printing-candidate scope for each source card without downloading,
inspecting, persisting, or republishing image content.

## Problem And Risk

Aggregate-only evidence could not identify which source cards required later
variant review. Guessing an artwork-to-printing relationship would create false
canonical identity. Persisting source image URLs or content would also exceed
the source and project authority of this gate.

The implementation therefore fails closed on source-response hash drift,
missing or duplicate stable source image IDs, or a changed 124-card count.
Source drift artifacts retain the observed response snapshot and expected and
observed hashes so a future pin can be investigated without weakening the
gate.

## Decision

Emit one metadata-only evidence row per multi-image source card containing:

- deterministic evidence ID;
- source card ID;
- exact source response SHA-256;
- distinct stable source image IDs, never image URLs;
- all printing candidate IDs emitted for the source card;
- explicit `unresolved_artwork_to_printing` status;
- false canonical, write, image-content, and republication authority.

The existing parser remains unchanged by default. The refinement is available
only through an explicit Yu-Gi-Oh-only CLI flag and an immutable manual
default-branch workflow.

## Alternatives Rejected

- Image comparison or AI inference: unnecessary and not authorized.
- Assigning each source image ID to a set code or rarity: unsupported by the
  source metadata.
- Copying image URLs or content: outside this gate's rights boundary.
- Treating all source-card printing candidates as alternative-art printings:
  would convert candidate scope into false identity.
- Re-running canonical reconciliation before game foundations exist: all rows
  would remain blocked and no new canonical truth would be produced.

## Implementation

- Contract:
  `docs/contracts/COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_V1.md`
- Parser extractor:
  `backend/catalog/collectible_shadow_parser_wave1_v1.mjs`
- Explicit worker mode:
  `scripts/workers/collectible_shadow_parser_wave1_v1.mjs`
- Manual workflow:
  `.github/workflows/collectible-wave1-alt-art-row-addressability.yml`
- Pull request:
  `https://github.com/OriginalSoseji/grookai_vault/pull/279`
- Merge commit:
  `23c6bb77941916f4bbcfd3b1f703fa0a1b7700e8`

Automated review identified one valid failure-path defect: a drifted response
was blocked but its observed snapshot was discarded. Commit
`7d3ff68be07e157f788b2a5e6088baecddf7d2b5` repaired the path and added a
regression proving artifacts retain the observed hash before the worker exits
nonzero.

## Validation

- Parser and worker syntax checks: passed.
- Parser/refinement contracts: `15/15` passed.
- Collectible adapter contracts: `12/12` passed.
- Shadow automation contracts: `9/9` passed.
- Canonical reconciliation contracts: `18/18` passed.
- Total targeted and related contracts: `54/54` passed.
- Git diff check: passed.
- Pull-request CodeQL: passed.
- Contracts drift gate: passed.
- Contracts runtime protection: passed.
- Legacy-key guard: passed.
- Vercel preview: passed.
- Review finding: fixed, tested, and thread resolved.

## Default-Branch Proof

- Workflow run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33132457407`
- Workflow result: `success` in `59s`.
- Immutable workflow SHA:
  `23c6bb77941916f4bbcfd3b1f703fa0a1b7700e8`
- Artifact ID: `9670781463`.
- Artifact name:
  `collectible-wave1-alt-art-row-addressability-33132457407`.
- Source response SHA-256:
  `883c6da2281e2594608c04b21280ae10bd94d0f5d642269760f698314b337a97`.
- Source response bytes: `21,213,955`.
- Source database version: `146.68`.

Result:

- source cards: `14,521`;
- printing candidates: `44,443`;
- alternative-artwork evidence rows: `124`;
- unique evidence IDs: `124`;
- unique source card IDs: `124`;
- stable source image IDs: `288`;
- unique source-card/image references: `288`;
- printing-candidate references: `1,679`;
- missing candidate references: `0`;
- invalid evidence rows: `0`;
- validation failures: `0`;
- artifact hash mismatches: `0`;
- forbidden fields or URLs: `0`;
- boundary violations: `0`.

Five of the 124 source cards have no source printing candidates. They remain
addressable source evidence with `source_card_has_no_printing_candidates`; this
is an explicit source-coverage gap, not permission to invent printings.

The source still reports five manifest set names without card candidates. This
pre-existing completeness finding remains review-routed and does not invalidate
the exact alternative-artwork evidence result.

## Permanent Artifact Hashes

- `run_plan.json`:
  `8052f74285c2ea04ae50eee5782e57b152f8bcae8b38f355a3ecf2de3352ecca`
- `candidate_index.jsonl`:
  `fd74d6fa88158338b7b3a619243c3419fb697828b0240458ee254489a644089f`
- `alternative_artwork_index.jsonl`:
  `ac33edbe569b8a1bb020366780182c4d3f293291fde46a10d8f76b257cbacddf`
- `validation_failures.jsonl`:
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `source_snapshots.json`:
  `55a6ee7260dd22dea51de25de7b659528780e62843f3f789b2ba67ffb2854cfc`
- `completeness_report.json`:
  `c22f6f57a326aa10419420293c80e4243f5f4c8a6547fcd028e9130b932028ce`
- `summary.json`:
  `6890b0823da5ad841df75f7a3a74d2119864f7b8dd0766872a93bfc8a3347516`

The downloaded GitHub artifact was independently parsed after workflow
completion. Counts, IDs, references, byte sizes, source hashes, and artifact
SHA-256 values reconciled exactly.

## Migration And Apply Status

- Migration applied: none.
- Database access: none.
- Database writes: none.
- Storage access or writes: none.
- Image download or inspection: none.
- AI or vision calls: none.
- Canonical, pricing, publication, or Vault writes: none.
- Estimated provider cost: `$0.00`.

## Current Truths

1. The exact 124 multi-image Yu-Gi-Oh source cards are now row-addressable.
2. Their 288 stable source image IDs are evidence identifiers only.
3. Their 1,679 printing-candidate references define source-card candidate
   scope, not artwork-to-printing identity.
4. Artwork-to-printing mapping remains unresolved for all 124 rows.
5. Five evidence rows have no source printing candidates and remain explicit
   coverage gaps.
6. Yu-Gi-Oh and Gundam still lack production game foundations; canonical
   reconciliation issue 277 remains valid and open.
7. No production data or user-facing behavior changed.

## Invariants

1. A source image ID never proves a canonical printing.
2. Candidate scope never becomes artwork assignment by implication.
3. Every evidence row must retain the exact source response hash.
4. Stable image IDs must be distinct and complete for every emitted row.
5. Source hash or row-count drift must fail closed after preserving evidence.
6. Image URLs and content must remain outside this artifact.
7. Canonical, image, and write authority must remain false.
8. The explicit refinement must remain manual, default-branch-only, and pinned
   to immutable `github.sha`.

## What Must Never Be Broken

- Do not map source image IDs to set codes, rarities, or canonical rows without
  independent evidence.
- Do not use image content, AI inference, or URL persistence to extend this
  metadata-only gate.
- Do not treat the five no-printing-candidate rows as new canonical cards.
- Do not close issue 277 until governed game foundations and a fresh read-only
  reconciliation support closure.
- Do not combine this evidence gate with card, set, printing, mapping, image,
  pricing, publication, or Vault writes.

## Explicit Next Gate

Define and dry-run a separate bounded Yu-Gi-Oh and Gundam game-foundation
contract. The gate may specify exact game and hidden release-control rows, but
must stop before any card, set, printing, mapping, image, pricing, publication,
or Vault write. Only after an independently reviewed foundation apply may the
46,259-row canonical reconciliation be rerun and the 124 alternative-artwork
evidence rows be carried forward as unresolved variant overlays.
