# Collectible Shadow Parser Wave 1 V1

## Status

`BOUNDED SHADOW CANARY`

## Objective

Convert two terms-classified metadata feeds into deterministic, evidence-backed
printing candidates without writing production database, Storage, image,
pricing, publication, or Vault state.

## Sources

### Yu-Gi-Oh

- Operator: YGOPRODeck.
- Source: public API v7.
- Documentation and usage terms: `https://ygoprodeck.com/api-guide/`.
- Classification: documented public API for internal shadow identity metadata.
- License: no separate data license is asserted.
- Required attribution: yes.

The API documentation permits public consumption and requests that consumers
cache downloaded data rather than repeatedly call the service. Grookai may
preserve internal identity candidates. This contract does not authorize
republishing card text, prices, or images.

### Gundam Card Game

- Operator: gcg-api.
- Source: public metadata bulk API.
- Documentation: `https://api.gcgapi.com/docs`.
- Data terms: `https://github.com/yzRobo/gcg-api/blob/main/LICENSE-DATA`.
- Classification: governed community open data.
- License: ODbL 1.0.
- Required attribution: yes.

Only factual identity metadata is preserved. Card text, rulings, and image URLs
are excluded from candidate artifacts.

## Candidate Boundary

Every candidate must include:

- candidate schema and parser versions;
- source adapter and source-owned compound identifier;
- exact source response SHA-256;
- source authority, license, and attribution requirement;
- game, language, set or product, collector number, and card name;
- source-specific product/card identifier;
- rarity when supplied;
- explicit `shadow_evidence_not_canonical` authority;
- `canonical_authority: false`;
- `image_republication_authorized: false`.

The candidate index must never contain:

- card rules or effect text;
- prices;
- source image URLs or downloaded images;
- lore or descriptive copy;
- canonical IDs invented by Grookai;
- production database state.

## Identity Rules

### Yu-Gi-Oh

A printing candidate is the source card ID plus set code plus rarity. Exact
duplicate source entries are deduplicated. Conflicting entries with the same
source compound identifier fail validation. Alternative artwork is recorded as
an unresolved variant class because the source does not prove an artwork-to-set
printing mapping.

### Gundam

A printing candidate uses the source `product_id`. The card number remains the
collector number and the source set name/code remain separate coordinates.
Duplicate product IDs with conflicting identity fail validation.

## Completeness

Completeness is source-specific and never inferred from candidate volume alone.

Yu-Gi-Oh review includes:

- source card and printing-entry counts;
- exact duplicate and validation-failure counts;
- set-manifest names not represented by candidates;
- cards without printing evidence;
- unresolved alternative-artwork count.

Gundam review includes:

- manifest card count versus bulk row count;
- candidate and validation-failure counts;
- set-manifest codes not represented by candidates;
- exact duplicate count.

Any mismatch remains `needs_review`. It cannot be repaired by inventing rows.

## Runtime Invariants

1. `CATALOG_AUTOMATION_MODE` must equal `shadow-only`.
2. The worker verifies the exact Git SHA before calls.
3. `run_plan.json` is written before source access.
4. Requests are time-bounded and responses are size-bounded while streaming.
5. Raw API responses are never persisted as run artifacts.
6. The worker imports no database or Storage client.
7. The worker receives no production secret.
8. The worker cannot dispatch canonical writers.
9. Candidate IDs are unique across the run.
10. Artifacts are SHA-256 reconciled.
11. Redirected source URLs are recorded without query strings or fragments.
12. Auxiliary manifest and set payloads must pass source-specific schema checks.

## Required Artifacts

- `run_plan.json`
- `candidate_index.jsonl`
- `validation_failures.jsonl`
- `source_snapshots.json`
- `completeness_report.json`
- `summary.json`
- `artifact_hashes.json`

## Stop Condition

Stop after one bounded live shadow run and artifact reconciliation. Do not
schedule parsing, write candidates to production, acquire images, or promote
canonical identity until the completeness report is reviewed and a separate
gate is authorized.

The separately governed read-only comparison gate is defined by
`COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_V1.md`. It does not expand this
parser's persistence or promotion authority.
