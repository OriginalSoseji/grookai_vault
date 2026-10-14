# Pricing Checkpoint 138: Unseen Forces Unown Mapping Batch

## Status

`28 EXACT MAPPINGS PREPARED; PRODUCTION APPLY PENDING CLEAN MERGE`

## Scope

This batch covers the complete 28-card TCGPlayer group `1398`, `EX Unseen
Forces`, subset that belongs to canonical set `exu`, `Unseen Forces Unown
Collection`: `Unown (!)` and `Unown (?)`, followed by `Unown (A)` through
`Unown (Z)`. Source product IDs are the contiguous exact range `90166..90193`.

Every reviewed registry row freezes the source product ID, raw title, group,
full printed coordinate (`!/28`, `?/28`, or `<letter>/28`), parent UUID, GV-ID,
symbol variant, Holo child GV-ID, and current child provenance. The punctuation
coordinates receive no general normalization exemption: only their exact
reviewed tuples can enter planning and apply admission, and the live executor
must re-read the same full printed coordinate.

## Evidence and Rehearsal

Checked-in English Master Index card and printing exports verify the 28
canonical identities and Holo finishes. The retained special-variant coverage
artifact binds each exact parent and child. The Master Index stores the question
mark coordinate as `%3F`; the authority builder decodes that representation
before exact comparison with `?`. It does not weaken source-coordinate matching.

The live repeatable-read, verified-TLS rehearsal confirmed exactly 28 current
TCGCSV products, 28 unique active `pokemon_eng_standard` parents, 28 active
non-provisional Holo children, and zero source or target TCGPlayer mapping
collisions. These older children have no active truth-review or visibility
override row. Their verified package status comes from the frozen Master Index
and special-variant evidence, and the builder asserts that live review state has
not drifted.

- trial plan candidates SHA-256:
  `ddb75f6b43515ddc6005166385e3627384cada5f1e435a81a1e647f63dac29af`
- candidates: `28`
- retained blocked products: `706`
- projected missing-price observations: `28`
- bounded apply packages: `25` and `3`
- trial batch authority fingerprints:
  `d70c0af79a8502a66b0ba4a9bf348af0ff191c7676cdbd5b1d824ad4fea5852d`,
  `eb14b92b4b6653d6dd4ed0bb8b9531f9df833be0b979e06ed9dd95493de04be0`
- database writes: `0`

Trial artifacts are retained under
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/exu-unown-plan-trial-v1`
and `exu-unown-authority-trial-v1`.

## Next Gate

Merge the registry, policies, authority builder, and contracts. Regenerate the
plan and authority package from that exact clean commit, prove rollback for both
bounded batches, apply both under the canonical maintenance launcher, and perform
an independent repeatable-read verification of all 28 mappings. Mapping alone
does not publish customer prices. Queue a fresh combined pricing shadow after
the mappings commit, then require same-commit production publication and
independent price readback.
