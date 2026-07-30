# Visual Search V2 External Source Incorporation Checkpoint

## Status

SOURCE GOVERNANCE IMPLEMENTED; ONLY EXISTING ROTOMAMITI SNAPSHOT AUTHORIZED FOR
ROW-LEVEL PROCESSING.

## Producer

- Branch: `agent/visual-search-lab-runtime-fix`
- Base commit: `3c2ed7a21600f8c3ea401a574c8df08ff6529623`
- Implementation state: uncommitted working tree
- Date: `2026-07-30` America/Denver

## Problem

SightDex, Artchu, TCG Curator, BinderBloom, ArtFinderTCG, and the supplied
RotomAmiti spreadsheet can accelerate visual search. Their public availability
does not establish permission to copy card-level records, and their taxonomies
do not map one-to-one onto Grookai's appearance roles.

## Decision

Every source enters through a versioned source registry with:

- acquisition mode;
- permission status;
- current and potential uses;
- network and snapshot-import gates;
- authority ceiling;
- source-specific taxonomy mapping;
- required image confirmation.

No source can directly write an active assertion.

## Source Disposition

- RotomAmiti: operator-supplied snapshot import is allowed into candidate
  staging. Network refresh remains disabled.
- SightDex: query/vocabulary research now; partnership export required for
  card-level candidates.
- Artchu: vocabulary, query, and product research now; permission required for
  card-tag imports.
- TCG Curator: vocabulary, query, and product research now; community votes
  may prioritize but never authorize evidence.
- BinderBloom: product/query research now; panorama import requires permission
  and a separate artwork-relationship contract.
- ArtFinderTCG: benchmark and query-language research only.

## Implementation

- Added `CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_V1`.
- Added deterministic allow/deny decisions for each source/use pair.
- Added safety validation forbidding unknown-rights imports.
- Added the active external-source incorporation contract.
- Added a source-specific partnership outreach/data specification.
- Amended the still-unapplied migration with
  `card_visual_external_sources`.
- Required every future external candidate to reference its governed source
  registry row.
- Required permission evidence and a terms hash before network acquisition can
  be enabled.

## Verification

- Source-registry and persistence contracts: `18/18` passed.
- Registry contains no network, provider, database, or mutation code.
- No external site was scraped.
- No database row was written.
- No migration was applied.
- No active search release changed.
- No paid Vision run occurred.

## Invariants

- Source taxonomy is candidate input, not Grookai ontology.
- External consensus affects priority, not authority.
- Canonical reconciliation proves the referenced card, not the visual claim.
- Grookai reviewers use self-hosted images.
- Source-hosted images are not copied.
- Missing or removed source records do not delete active Grookai assertions.
- Existing Fact Graphs are not regenerated or rewritten.

## Exact Next Gate

Send or manually deliver the owner-outreach requests. Until written permission
is recorded, continue using SightDex, Artchu, TCG Curator, BinderBloom, and
ArtFinderTCG only for the registered research lanes. Build the first new
network/export adapter only after its source registry row contains permission
evidence and the adapter has an immutable no-write import plan.
