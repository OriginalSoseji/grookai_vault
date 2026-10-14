# Pricing Checkpoint 138: Unseen Forces Unown Mapping Batch

## Status

`28 EXACT MAPPINGS APPLIED AND INDEPENDENTLY VERIFIED; FULL PRICING SHADOW QUEUED`

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

## Production Release

PR `#658` merged the reviewed identity registry and guarded planning/apply
support at exact commit `82d6397c05509e4e8b14642ab1d3af128f36d5db`.
The clean post-merge plan and authority freeze reproduced all 28 candidates
with a clean tracked worktree and the same candidate SHA-256. The clean batch
authority fingerprints are
`62d4ae2cbcc0560ae2b8865a38324f686016cd128845d69d86aa7726d4f3e15d`
and
`5b5ae0441e4e8c9b58c3094047ee2625bfc2cde7d3a3e4e2a81f85088fc5a4e2`.

Both bounded dry runs passed and proved rollback before production apply.
The canonical maintenance launcher then committed 25 insert-only mappings in
run `7f7140cf-19db-4dd7-9d23-e1ed64e3e92a` and 3 insert-only mappings in run
`19f0620e-98cc-4ca5-9919-8bac82a0851e`. The executor read back every mapping;
there were no mapping updates, deletes, publication writes, or customer-state
writes.

A separate verified-TLS, repeatable-read transaction then confirmed 28 current
source products, 28 active mappings on the exact reviewed parents, 28 unique
active standard identities, and 28 governed public Holo printings. It matched
each mapping to its expected maintenance run and performed zero writes.

Full-scope pricing shadow run `38610995648` was dispatched at the exact mapping
release commit. Mapping availability is live; customer price publication
remains governed by the shadow and same-commit publication gates.

## Next Gate

Wait for full-scope shadow run `38610995648`, inspect its immutable evidence,
and require same-commit production publication and independent price readback.
In parallel, remeasure the remaining mapping backlog and prepare the next exact,
evidence-backed batch without weakening identity or collision safeguards.
