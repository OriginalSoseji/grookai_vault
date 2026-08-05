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
separately and must be rerun after deployment.

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
- Production still needs the client read repair deployed before its set-grid
  result can be declared complete.
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
- Full repository contract suite passed 1477/1477.
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

Merge and deploy the mixed-case set-loader repair, then rerun this exact
53-row read-only smoke against `https://grookaivault.com`. Require 53/53 rows,
27/27 set pages, exact image bytes, hosted-first set-grid output, preserved
fallbacks, and zero writes.

Only after that deployed verification may Japanese V4 image acquisition expand
beyond these 53 parents under a new bounded plan. Child-printing publication,
family promotion, and broad catalog image writes remain separate approvals.

## Stop State

The pointer product integration is proven on the repaired branch. Deployment
verification remains the only open step for this 53-row product gate.
