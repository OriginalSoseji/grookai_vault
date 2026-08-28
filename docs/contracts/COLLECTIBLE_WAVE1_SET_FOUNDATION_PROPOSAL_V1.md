# Collectible Wave 1 Set Foundation Proposal V1

## Status

`ARTIFACT-ONLY PROPOSAL`

## Objective

Build a deterministic, reviewable set-foundation proposal for the already
applied Yu-Gi-Oh and Gundam game foundations. The proposal joins immutable
parser evidence, frozen set manifests, and unresolved alternative-artwork
evidence without accessing or changing production.

This gate does not create canonical sets. It produces the evidence required to
design a later bounded set apply.

## Frozen Evidence

The live proposal is bound to:

- Parser Wave 1 run `33118951166`, artifact `9665669509`, with 46,259
  candidates and candidate SHA-256
  `30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f`;
- alternative-artwork run `33132457407`, artifact `9670781463`, with index
  SHA-256
  `ac33edbe569b8a1bb020366780182c4d3f293291fde46a10d8f76b257cbacddf`;
- Yu-Gi-Oh set-manifest SHA-256
  `16c47dcdceffe4ea0b221b75efaeace5d8bd9f888795f061369023ce8ed1c999`;
- Gundam set-manifest SHA-256
  `e3c7c641711ccbabc42c6c191bd7ca6c5715c74c669d78002bc1ad85c500a14e`.

Every downloaded parser artifact must match its own exact hash manifest and the
worker's reviewed per-file byte and SHA-256 profile. Raw set-manifest bodies and
source image URLs are read transiently and are not included in proposal
artifacts.

## Mapping Policy

### Yu-Gi-Oh

Candidates map by exact, case-sensitive source set name. Source casing is
evidence: it is not normalized away to manufacture a match. The two lowercase
`promotional cards` TF05 candidates therefore remain explicit source gaps
against the manifest's uppercase `Promotional Cards` identity.

Manifest `set_code` values are not unique. A shared code never causes source
sets to be merged and never becomes an invented canonical code. Each shared
code receives one diagnostic row. Collector-number signatures replace digit
runs with `#` solely to classify member namespaces as disjoint, overlapping,
or insufficient. These signatures have no canonical authority.

The 13 `(POR)` manifest rows whose assigned parser candidates remain `en` with
`-PT` collector evidence are preserved as language-marker conflicts. The
proposal does not silently relabel their language.

### Gundam

Candidates map by exact source set code because all 24 manifest codes are
unique. Candidate set names that differ from the manifest name remain explicit
review conflicts. Exact code mapping does not authorize a canonical set write.

## Alternative Artwork

All 124 alternative-artwork rows and all 1,679 candidate references must join
to the frozen parser candidate universe. The proposal may group those
references by proposed set, but it must preserve
`unresolved_artwork_to_printing`. It may not assign an image or artwork identity
to a printing. Source image IDs are evidence identifiers, not image URLs or
republication authority.

## Candidate Reconciliation

Every one of the 46,259 parser candidates must occur exactly once as either:

- a row in `candidate_set_assignments.jsonl`; or
- a candidate-level `candidate_without_manifest` row in `source_gaps.jsonl`.

Every one of the 1,056 manifest rows must occur exactly once in
`set_candidates.jsonl`. A manifest row with no candidate is valid only when it
also appears as `manifest_without_candidates` in `source_gaps.jsonl`.

## Required Artifacts

- `run_plan.json`
- `set_candidates.jsonl`
- `candidate_set_assignments.jsonl`
- `set_code_collisions.jsonl`
- `candidate_set_conflicts.jsonl`
- `candidate_only_set_coordinates.jsonl`
- `alternative_artwork_set_overlays.jsonl`
- `source_gaps.jsonl`
- `validation_failures.jsonl`
- `summary.json`
- `artifact_hashes.json`

Every artifact except the hash manifest must have exact byte and SHA-256
readback in `artifact_hashes.json`.

## Reviewed Live Profile

The frozen source tuple must produce:

- 1,056 manifest sets: 1,032 Yu-Gi-Oh and 24 Gundam;
- 46,257 mapped candidates and 2 candidate source gaps;
- 5 manifest source gaps;
- 142 Yu-Gi-Oh shared-code groups: 87 disjoint, 52 overlapping, 3
  insufficient;
- 32 candidate/set conflicts: 13 language-marker and 19 Gundam name
  conflicts;
- 1 candidate-only coordinate group;
- 124 alternative-artwork rows, 1,679 candidate references, and 1,266
  set-level references;
- zero missing alternative-artwork candidate references;
- zero candidate reconciliation mismatches.

## Invariants

- Every proposal row has `canonical_authority: false` and
  `write_authority: false` where applicable.
- No source image URL or raw set-manifest body is persisted.
- No source set code collision is silently merged.
- No candidate, manifest row, or alternative-artwork reference is dropped.
- No database, Storage, image, pricing, publication, Vault, or writer access
  occurs.
- The workflow has no production secret and no scheduled trigger.

## Stop Condition

Stop after one exact-artifact proposal run and artifact reconciliation. Do not
create or update sets, cards, printings, identities, mappings, images, prices,
publication state, or Vault rows. A later set apply requires its own migration,
reviewed payload, preflight fingerprint, authorization, and rollback proof.
