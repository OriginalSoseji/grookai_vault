# Collectible Wave 1 Card Identity Proposal V1

## Objective

Produce a hidden, artifact-only parent card identity proposal for Yu-Gi-Oh and
Gundam candidates whose exact set foundations are already present in
production. The proposal grants no canonical or write authority.

## Frozen Inputs

- Parser Wave 1 run `33118951166`:
  - 46,259 source printing candidates;
  - candidate SHA-256
    `30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f`.
- Alternative-artwork run `33132457407`:
  - 124 source-card evidence rows;
  - index SHA-256
    `ac33edbe569b8a1bb020366780182c4d3f293291fde46a10d8f76b257cbacddf`.
- Applied set payload:
  - 505 rows: 500 Yu-Gi-Oh and 5 Gundam;
  - payload SHA-256
    `2c07787bf965909a2b9f0a6296e45d6a2407c7faf28d70069c23a305beec7144`.

The run fails closed on any byte, count, producer-SHA, or manifest mismatch.

## Identity Grain

One proposed parent identity is the normalized combination of:

- game;
- exact approved canonical set ID;
- printed collector number;
- printed card name;
- language `en`.

Source candidates are printing evidence, not independent parent cards. Multiple
rarities for the same set, number, and name group under one parent proposal.

## Set Ownership

The globally namespaced canonical set code is not source matching evidence.

- Yu-Gi-Oh candidates match an approved set by exact source set name.
- Gundam candidates match an approved set by exact source set code.
- Candidates outside the approved 505-set payload remain explicit exclusions.
- No missing set may be inferred, created, aliased, or substituted.

## Variant Boundaries

- Source rarity is preserved exactly as source printing evidence.
- Source rarity is not normalized into a Grookai finish or variant key here.
- No child printing ID is proposed.
- Multi-image source cards remain
  `review_required_unresolved_alternative_artwork`.
- Source image IDs remain evidence identifiers only; no image URL, content,
  mapping, download, or republication is authorized.

## Conflict Policy

If one game, set, and collector number has multiple normalized source names,
every affected parent proposal routes to `review_required_identity_conflict`.
The proposal may not select a preferred name.

## Production Readback

Before building the proposal, one repeatable-read transaction must prove:

- the exact 505 selected set rows still match their applied payload;
- Yu-Gi-Oh and Gundam game foundations are exact;
- both release controls remain `hidden`;
- the selected sets contain zero existing parent card rows;
- the session and transaction are read-only;
- the transaction ends in rollback.

## Required Artifacts

- `run_plan.json`
- `parent_card_identity_proposals.jsonl`
- `source_printing_evidence.jsonl`
- `candidate_dispositions.jsonl`
- `excluded_candidates.jsonl`
- `review_required_parents.jsonl`
- `database_readback.json`
- `summary.json`
- `REPORT.md`
- `artifact_hashes.json`

Every source candidate must appear exactly once in `candidate_dispositions`.
The selected and excluded partitions must sum to 46,259. Parent candidate
references must reconcile exactly to selected source printing evidence.

## Boundaries

- no database writes;
- no Storage access or writes;
- no image access, download, persistence, or pointer changes;
- no canonical card, identity, printing, or mapping writes;
- no pricing, publication, search, or Vault writes;
- no AI or vision calls;
- no writer dispatch;
- no game or set visibility change.

## Stop Condition

Stop after one immutable default-branch run, artifact reconciliation, and a
permanent checkpoint. Do not generate or apply a card migration. The next gate
must separately define deterministic parent IDs, GV-IDs, identity domains,
source evidence rows, and a bounded rollback-only apply proof.
