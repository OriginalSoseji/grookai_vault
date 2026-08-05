# Japanese Master Index V4 Image Pointer Product Smoke Completion V1

Date: 2026-08-05

## Context

The approved Japanese V4 pointer apply durably linked 53 parent identities to
exact self-hosted images. This gate tested whether the existing product read
paths actually consumed those pointers without changing database or Storage
state.

## Problem

The initial deployed production smoke proved card-detail and image-proxy
behavior but found that 15 rows from `jpn-S8b` and `jpn-SV8a` did not appear in
their set-grid API windows. The product normalized route codes to lowercase and
then used a case-sensitive `set_code` query, excluding mixed-case legacy lanes.

## Risk

A successful database pointer apply is insufficient if product loaders omit the
rows. Fixing the data instead of the loaders would have risked identity churn,
duplicate-set cleanup, or mutation outside this gate.

## Decision

- Keep the 53 database rows and Storage objects unchanged.
- Make web set-card, web master-set-stat, and Flutter set-card reads use
  case-insensitive exact set-code matching.
- Aggregate case-equivalent set metadata rows into one route total and choose
  descriptive metadata ahead of generated code-based names.
- Remove source presentation markup from set names at the display boundary.
- Preserve both legacy case lanes in product results.
- Rank smoke-test pagination across the same case-insensitive combined set
  corpus returned by the product.
- Keep card-detail images hosted-first and preserve external provider URLs only
  as failure fallbacks.

## Alternatives Rejected

- Renaming or merging mixed-case set rows during an image smoke gate.
- Mutating the 53 parent identities again.
- Publishing child printings to make parent images visible.
- Ignoring set-grid omissions because card detail already worked.
- Treating raw source set-name markup as the product display-name contract.

## Initial Production Evidence

- Rows checked: 53
- Complete row hashes: 53/53
- Exact search RPC: 53/53
- Exact deployed image-proxy bytes: 53/53
- Deployed card detail: 53/53
- Set-grid hosted-first/fallback: 38/53
- Set pages returning HTTP 200: 27/27
- Root cause: case-sensitive set-card lookup excluded 15 mixed-case rows.
- Preserved artifact directory:
  `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/initial_production_failure_v1/`

## Repaired Branch Proof

- Status: `complete_read_only_product_smoke`
- Rows passed: 53/53
- Distinct parent IDs: 53/53
- Distinct GV-IDs: 53/53
- Distinct sets: 27
- Complete live expected-after row hashes: 53/53
- Exact image pointers: 53/53
- Preserved external fallbacks: 53/53
- Public child printing rows: 0
- Exact search RPC matches: 53/53
- Self-hosted image responses matching frozen byte hashes: 53/53
- Card-detail routes: 53/53
- Set-grid hosted-first rows: 53/53
- Set-grid fallback preservation: 53/53
- Set pages: 27/27
- Set pages with exact live canonical totals: 27/27
- Set pages with preferred metadata: 27/27
- Database transaction read-only: `on`
- Database writes: 0
- Storage writes: 0

The repaired proof used the production database and Storage through the locally
built production web code. The deployed production artifact remains preserved
separately below.

## Production Deployment Verification

- Merged main SHA:
  `dba6d3521bdf5bd7292b912d9d6d1cd8a709b80a`
- Production base URL: `https://grookaivault.com`
- Final production rows: 53/53
- Final production set pages: 27/27
- Final production set pages with exact canonical totals: 27/27
- Final production set pages with preferred metadata: 27/27
- Final production exact image bytes: 53/53
- Final production card-detail routes: 53/53
- Final production set-grid hosted-first rows: 53/53
- Final production set-grid fallbacks preserved: 53/53
- Final production exact search matches: 53/53
- Distinct production HTTP checks: 163
- Final-run HTTP retries: 0
- Database writes: 0
- Storage writes: 0

Two pre-proof diagnostics are preserved. The first captured one transient set
grid `500`; the second captured a different transport-level `fetch failed`.
Both occurred while the deployment was stabilizing. The smoke harness now
performs at most two delayed retries for idempotent GET transport or `5xx`
failures, records every retry, and still fails immediately for `4xx` responses
or incorrect successful content. The final production proof required no retry.

Production artifact hashes:

- JSON SHA-256:
  `4dc8ed1f2024f62e46c43dccae8e0dced16d793c59a94f23774e8fb1b6d0bf74`
- Markdown SHA-256:
  `f24dc5c14e78a47cd611a6bda4f3d55af2011eb4616278e470806ca608c3c9d8`
- Content fingerprint:
  `a660c8e067ee19856f24b34a4ff5df71e0be2b28aa991fdd3c62027664652774`

## Artifact Hashes

- Final JSON SHA-256:
  `924b18f946573fd93caf86d3b404ab78b35c42c7fd5064e8cc34c4872190a6e5`
- Final Markdown SHA-256:
  `932ce188bf9d97dc37aa1787704c36f4d4a85e27f24f034a85d5149c3d157b45`
- Final content fingerprint:
  `a9ccb4028b22f082f8b58332f4b7fc59ebdfc9d9417fdab86c282c3ad0b29dfe`

The final artifact was regenerated after replacing broad markup stripping and
global HTML re-decoding with exact, known-boundary parsing and literal or
once-encoded path matching. Earlier successful proofs are preserved under the
two `pre_*` provenance directories listed below.

Artifacts:

- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/jpn_image_pointer_product_smoke_v1.json`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/jpn_image_pointer_product_smoke_v1.md`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/artifact_hashes_v1.json`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/initial_production_failure_v1/`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/repaired_branch_pagination_assertion_failure_v1/`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/pre_total_reconciliation_v1/`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/pre_codeql_parser_hardening_v1/`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/pre_raw_rendered_html_matching_v1/`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/production_post_deploy_transient_failure_v1/`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/production_post_deploy_transport_failure_v2/`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/production_post_deploy_v1/`
- `docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/total_reconciliation_markup_failure_v1/`

## Current Truths

- All 53 parent pointers and Storage objects remain correct and unchanged.
- All 53 are exact-search reachable and card-detail visible.
- The repaired branch includes all mixed-case Japanese set-code lanes in set
  grids and master-set stats.
- Case-equivalent set pages reconcile their rendered totals to the complete
  live canonical lane and prefer descriptive metadata such as `VMAX Climax`
  and `Terastal Fest ex`.
- Source set-name presentation markup is removed only at the client display
  boundary; stored canonical evidence is unchanged.
- Production is deployed and the exact 53-row product boundary is complete.
- No public Japanese V4 child printing exists or was authorized.

## Invariants

- Image visibility must not redefine canonical identity.
- A parent image does not prove a child finish or variant.
- Mixed-case legacy set codes must remain readable until a separately governed
  canonical cleanup proves a safe migration.
- External fallback evidence remains preserved.
- Search, card detail, set grids, and Flutter must consume the same hosted-first
  image truth.
- This gate authorizes no database or Storage mutation.

## Verification

- Full Japanese Master Index V4 contract suite passed 202/202, including exact
  total and preferred-metadata assertions.
- Full repository contract suite passed 1479/1479.
- Relevant web public-set tests passed 14/14.
- Targeted Flutter image and public-set tests passed 37/37, including
  case-equivalent count aggregation and set-name display sanitization.
- Full Flutter suite passed 565/565.
- Production web build compiled, typechecked, and generated all routes.
- Full repository shipcheck passed with zero critical runtime-preflight
  failures.
- Final product-smoke contract includes live artifact reconciliation after
  artifact generation.
- `git diff --check` passed.

## Explicit Next Gate

Japanese V4 image acquisition may now expand beyond these 53 parents only
under a new bounded plan with independent image evidence, collision preflight,
exact byte readback, and separately approved pointer mutations.

Child-printing publication, family promotion, and broad catalog image writes
remain separate approvals.

## Stop State

The 53-row Japanese V4 parent-image product integration is deployed and proven
end to end. No database or Storage mutation remains open in this gate.
