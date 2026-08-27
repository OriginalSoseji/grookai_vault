# Collectible Shadow Parser Wave 1 V1

## Status

`COMPLETE - SHADOW ARTIFACTS ONLY`

Yu-Gi-Oh and Gundam metadata parsers are merged, live-proven on the default
branch, and permanently bounded away from production persistence. Gundam is
source-complete for the tested feed. Yu-Gi-Oh remains explicitly review-routed
for source coverage gaps and unresolved alternative-artwork mappings.

## Context

The collectible adapter foundation proved source health but intentionally
emitted no catalog rows. Parser Wave 1 converts two terms-classified public
metadata feeds into deterministic printing candidates while preserving the
distinction between source evidence and Grookai canonical identity.

## Decision

Wave 1 parses only:

- YGOPRODeck API v7 for Yu-Gi-Oh printing metadata;
- the ODbL-licensed `gcg-api` feed for Gundam printing metadata.

Candidates contain source-owned identity coordinates and the exact source
response SHA-256. Card text, rules, prices, image URLs, and downloaded images
are excluded. Raw source bodies are parsed in memory and are not persisted as
artifacts.

## Implementation

- Contract: `docs/contracts/COLLECTIBLE_SHADOW_PARSER_WAVE1_V1.md`
- Registry: `backend/catalog/collectible_shadow_adapter_registry_v1.mjs`
- Parser: `backend/catalog/collectible_shadow_parser_wave1_v1.mjs`
- Artifact worker: `scripts/workers/collectible_shadow_parser_wave1_v1.mjs`
- Manual workflow: `.github/workflows/collectible-shadow-parser-wave1.yml`
- Pull request: `https://github.com/OriginalSoseji/grookai_vault/pull/273`
- Merge commit: `90afb4b7f33ff5b37c8c2183889bccae486b734b`

The worker enforces an exact Git SHA, writes `run_plan.json` before source
access, bounds requests by time and size, validates auxiliary manifest schemas,
strips query strings and fragments from redirected URLs, and cannot import or
dispatch production writers.

## Validation

- Targeted catalog contracts: 31/31 passed.
- Node syntax checks: passed.
- Fixture CLI: 5 unique candidates, 0 failures, 0 artifact hash mismatches.
- CodeQL: passed.
- Contracts drift gate: passed.
- Runtime protection: passed.
- Legacy-key guard: passed.
- Vercel preview: passed.
- Automated review P1 for malformed HTTP 200 auxiliary payloads: repaired,
  regression-tested, and review thread resolved.

## Default-Branch Live Proof

- Workflow run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33118951166`
- Exact default-branch SHA:
  `90afb4b7f33ff5b37c8c2183889bccae486b734b`
- Artifact ID: `9665669509`
- Workflow result: success in 54 seconds.
- Operational issue:
  `https://github.com/OriginalSoseji/grookai_vault/issues/274`

Reconciled run totals:

- 2 selected and parsed sources;
- 46,259 candidates;
- 46,259 candidate lines;
- 46,259 unique candidate IDs;
- 0 validation failures;
- 0 missing or duplicate candidate IDs;
- 0 forbidden card-text, price, ruling, or image fields;
- 0 signed-query or fragment-bearing snapshot URLs;
- 0 artifact hash mismatches;
- 1 source requiring completeness review.

Production boundaries all remained `false`:

- database access and writes;
- Storage writes;
- image downloads and URL persistence;
- source-text and pricing persistence;
- canonical writes;
- writer dispatches.

## Source Results

### Gundam

- Dataset version: `21-b5dc4c08fcb33085c3eea2dce70c1d19ebe859af`.
- Manifest rows: 1,816.
- Parsed candidates: 1,816.
- Set manifest coverage: 24/24.
- Validation failures: 0.
- Review status: `likely_complete` for this source feed.

### Yu-Gi-Oh

- Database version: `146.68`.
- Source cards: 14,521.
- Source printing entries and candidates: 44,443.
- Set manifest: 1,032 names.
- Observed candidate set names: 1,028.
- Cards without printing evidence: 516.
- Cards with unresolved alternative artwork: 124.
- Validation failures: 0.
- Review status: `needs_review`.

Five manifest names had no candidate printing rows:

1. `Adidas collaboration card`
2. `Kaiba's Collector Box`
3. `The Lost Art Promotion 2023 D`
4. `Yu-Gi-Oh! Power of Chaos: Yugi the Destiny Limited Collector's Edition`
5. `Yugi's Collector Box`

These are source-evidence gaps, not permission to invent candidate rows.

## Artifact Hashes

- `run_plan.json`:
  `4344592f7ea620019c3b9e4bc7a1933bf5ba72134ab2673479d77d5871ca778e`
- `candidate_index.jsonl`:
  `30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f`
- `validation_failures.jsonl`:
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `source_snapshots.json`:
  `1fe6c4f871579ae9af86feca1ea7ca4cfd0858b527cf8d5875af1bc4bda8b573`
- `completeness_report.json`:
  `30bdaff50d82af573780ab445ed700e3335c77ce160012fb543d278b3aade4e8`
- `summary.json`:
  `4d71ad8786528c64ac29f6e038566565ffdb15d5aa21671db30be96e49cbe609`

## Current Truths

- Wave 1 can deterministically extract Yu-Gi-Oh and Gundam printing candidates.
- The 46,259 candidates exist only in immutable run artifacts.
- No candidate has been compared with or promoted into production canonical
  identity by this gate.
- A complete source response does not grant image or publication authority.
- Gundam source completeness does not prove Grookai catalog completeness.
- Yu-Gi-Oh alternative artwork remains unresolved at the printing level.
- The parser workflow is manual-only; no unattended parser schedule is active.

## Invariants

1. A parsed candidate is not canonical identity.
2. Every candidate must retain a source-owned ID and exact response hash.
3. Malformed auxiliary metadata must fail closed.
4. Source coverage gaps remain review findings; rows are never invented.
5. Card text, prices, rulings, and image data remain outside Wave 1 artifacts.
6. No signed redirect token may be preserved in artifacts.
7. Image acquisition and self-hosting require a separate rights-governed gate.
8. Production persistence requires a separate bounded mutation contract.

## What Remains

1. Build a read-only candidate-to-canonical reconciliation for these exact
   46,259 candidates.
2. Classify each row as exact existing identity, new candidate, ambiguous, or
   conflicting without writing production state.
3. Preserve the 124 Yu-Gi-Oh alternative-artwork cases as unresolved variants.
4. Investigate the five missing Yu-Gi-Oh set-manifest names and 516 cards without
   print evidence through approved metadata sources only.
5. Prove idempotent reconciliation against repeated identical source hashes.
6. Produce a bounded promotion plan only after reconciliation is complete.
7. Keep Parser Wave 2 and image acquisition as separate source/rights gates.

## Explicit Next Gate

Run an artifact-to-canonical reconciliation in a read-only session against the
exact Wave 1 candidate artifact hash. Produce match, new-candidate, ambiguity,
conflict, and unresolved-variant artifacts with full count/hash reconciliation.
Stop without database, Storage, image, pricing, publication, or Vault writes.
