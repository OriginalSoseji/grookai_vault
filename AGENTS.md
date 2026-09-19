# Grookai Agent Entry Point

## Storefront Full Shipcheck — September 19 UTC

Read `docs/audits/vendor_storefront_shipcheck_v1/SHIPCHECK.md`. The unchanged full
repository gate passed: 3,904 Node contracts, web typecheck/lint/build, Flutter
analysis and 748 Flutter tests. Three Node tests are skipped. The local runner uses
only the dedicated 168xx project and temporary 15439 API relay. Preserve existing
proofs and use the normal pre-commit hook. Push, merge and production release remain
separate; the prior integration checkpoint's full-suite pending step is superseded.

## Storefront Integration Review — September 19 UTC

Read `docs/audits/vendor_storefront_integration_review_v1/REVIEW.md`.
Current main and PR #473 remain unchanged. Its application changes are retained;
only the storefront route additions and accumulated playbook checkpoints differ.
The local release schema matches preserved printing-executor schema evidence and
coordinate definitions. New Vault/Wall dependencies and entitlement triggers remain
explicit production coordination points. Use the new rollback-only 395-migration
runner in `scripts/tests/STOREFRONT_TESTING.md`; historical 397 runners are not the
current release entry point. No merge, push, production apply or deployment.

## Storefront Release Package — September 18 (September 19 UTC)

Read `docs/audits/vendor_storefront_release_package_v1/RELEASE_PACKAGE_PROOF.md`.
The new candidate at `C:/gv_store_release_20260919` preserves desktop/native product
source and consolidates the three unapplied migrations into `20260919050000`.
Both strict phases passed: production baseline/security parity, unchanged duplicate
scanner, a dedicated 395-migration reset, and exact 9,494-object equivalence with
the original candidate. Three rollback SQL checks pass. Historical worktrees,
migrations and proof databases remain preserved. No merge, push, production apply,
activation or deployment occurred. Integration/dependency review and governed
release remain separate; use the new handoff instead of the old three-file package.

## Storefront Production Preflight — September 18

Read `docs/audits/vendor_storefront_preflight_v1/PREFLIGHT_20260918.md`. Fresh
production reads confirm 394 applied migrations and exactly three storefront
migrations pending, with no remote-only drift or active store grants. Diagnostic
schema comparison found only the expected store additions and known column order
differences. The actual strict scanner rejects two intentional function replacements:
formal release remains blocked until the pending package is reconciled and a new
isolated formal replay passes. Do not reset the populated proof DB or bypass the gate.

## Desktop Storefront Review — September 18

Read `docs/audits/vendor_storefront_desktop_review_v1/REVIEW_AND_HANDOFF_20260918.md`.
The desktop candidate remains at `C:/gv_store_desktop_20260918`. A shared-navigation
draft-loss defect is fixed and browser regression coverage added. The handoff
contains a local PR description and exact production prerequisites. Historical
receipts remain intact; no merge, remote migration, activation or deployment.

## Desktop Storefront Management — September 18

Read `docs/audits/vendor_storefront_desktop_v1/DESKTOP_PROOF_20260918.md` and
`docs/contracts/VENDOR_STOREFRONT_DESKTOP_MANAGEMENT_V1.md`. The review candidate is
`C:/gv_store_desktop_20260918`, detached at `a151794a9`, preserving the preceding
current-main candidate. `/account/store` supports desktop owner authoring and
publication with private media. Existing catalog add/import and exact-copy editing
are reused. App-only packages can manage from a computer; web publication still
requires `store_web`. No schema or native change in this extension. All production
integration, migration preflight, release and billing gates remain separate.

## Storefront Current-Main Reconciliation — September 18

Read `docs/audits/vendor_storefront_current_main_v1/CURRENT_MAIN_PROOF_20260918.md`.
The detached candidate at `C:/gv_store_current_20260918` now includes main
`a151794a9` (#494), storefront/custom collectibles and PR #473. Catalog/search,
access/ownership, QR, real local storefront/API/browser checks and the web build
pass. All 468 native source/test files match the preceding Samsung-proven candidate.
Previous worktrees and receipts are preserved. Local reconciliation is complete;
review, production dependency preflight and authorized release remain separate.
No commit, merge, push, remote migration or deployment occurred.

## Collector Printing Readback - September 18

Read `docs/ops/COLLECTOR_PRINTING_READBACK_20260918.md`. Anthology membership
counts must not fill missing card denominators; exact GV-IDs must survive
search parsing intact. This is a web-only repair, not permission to replay
completed database repairs. Keep local tests, deployment and live proof distinct.

## Storefront Combined Integration Rehearsal — September 18

Read `docs/audits/vendor_storefront_integration_v1/INTEGRATION_PROOF_20260918.md`.
The detached rehearsal combines recorded main `83b2283a0`, the preserved storefront
candidate and complete PR #473 source. Combined Flutter, database, web and physical
Samsung auth/navigation checks pass. The playbook conflict retains both checkpoints.
Main subsequently advanced to `a151794a9` (#494); its catalog read/search changes
are recorded but not included in this tested source. Reconcile that delta before
integration/release. No commit, merge, push, remote migration or deployment occurred.

## Storefront Full Native Auth Proof — September 18

Read `docs/audits/vendor_storefront_native_auth_v1/NATIVE_AUTH_PROOF_20260918.md`. The physical Samsung passed real local email login,
refresh, pending store/product intents, Vendor Mode settings and owner/visitor
preview boundaries through the actual production Dart app in a separate package.
The mobile dock now reserves its own height, fixing floating notices on return
from store management. Integration review and proposed PR #473 checkpoint
resolution are included; no merge or deployment occurred. Provider OAuth, cold
process links, iOS and production release remain distinct checks.


## Storefront Real Supabase Verification — September 18

Read `docs/audits/vendor_storefront_supabase_v1/LOCAL_SUPABASE_PROOF_20260918.md`.
The user-approved Docker recovery unblocked the dedicated 164xx project. Full
397-migration replay, real Auth/Storage/API/browser checks and exact-copy schema
checks pass. Additive migration `20260918100000` changes stale custom edits to
`PT409`; PostgREST otherwise retries `40001`. Previous receipts remain intact.
Full native auth/pending routes, coordinated integration and release remain open.
Preserve the populated proof database; no shared reset, merge or deployment.


## Storefront Device Verification — September 18

Read `docs/audits/vendor_storefront_verification_v1/LOCAL_VERIFICATION_20260918.md`.
The separate Samsung test shell proved gallery upload, preview, publication and
custom/store deep links against the dedicated synthetic adapter. The adapter now
accepts the pinned Dart SDK's multipart upload format. Real Supabase replay and
Auth/Storage remain blocked by the unresponsive shared Docker daemon; no reset or
restart was performed. Preserve previous receipts and the prepared isolated project.
This is not full production-app auth or release proof.

## Custom Store Collectibles — September 17

The existing storefront candidate now includes seller-authored custom products.
Read `docs/audits/vendor_custom_collectibles_v1/LOCAL_IMPLEMENTATION_20260917.md`
and `docs/contracts/VENDOR_CUSTOM_COLLECTIBLES_V1.md`. Preserve the starting
manifest and previous storefront receipts. Custom stock has stable product UUIDs,
version-checked vendor quantities and no canonical/Vault identity. The additional
custom rollout flag defaults off; SQL/HTTP fixture proof is not real Supabase,
device or release proof. No remote apply, merge, push or deployment is authorized.

## Browse-only Storefront Candidate — September 17

Read `docs/audits/vendor_storefronts_v1/LOCAL_IMPLEMENTATION_20260917.md` and
`docs/contracts/VENDOR_STOREFRONTS_V1.md` for this isolated local implementation.
Both new publication rollout flags default off. Preserve the catalog repair
worktrees and Vault-add PR #473; coordinate navigation and new schema dependencies
before integration. Synthetic SQL/browser proof is not full Supabase replay,
physical-device proof, billing activation or production release authority.

## Master Index Source Independence - September 17

Read `docs/ops/MASTER_INDEX_SOURCE_INDEPENDENCE_20260917.md`. Catalog mirrors
are not independent finish votes. Preserve raw provenance and do not replay
superseded historical finish candidates. The current index already replaced
four MEP generic Holo claims with Cosmos and removed Lugia ex's old Normal claim.
Source-status corrections are not production mutation authority.
Prize Pack finish evidence also remains variant-scoped review material; it cannot
prove an unstamped Normal/Holo/Cosmos option. Historical/source-outage carry-forward
retains those records without restoring their old verified status.

## Legacy Set SQL Review - September 17

Read `docs/ops/LEGACY_SET_SQL_REVIEW_CHECKPOINT_20260917.md`. The set repair and
TCGdex canonization tools now admit one bounded evidence-only scope, not their
historical SQL apply paths. Even old dry-run checkpoint writes are unreachable.
Retain source payloads and explicit truncation; a successful review is not
printing completeness or production authority. Runtime deployment remains open.

## Legacy Pokemon Admission - September 17

Read `docs/ops/POKEMON_LEGACY_ADMISSION_CHECKPOINT_20260917.md`. Legacy enrichment,
mapping backfill and TCGdex normalization admit bounded review-only runs. The old
PokemonAPI normalizer, remote import chain and new-set apply are retired. This
closes unsafe entry paths in code, not deployed runtime or catalog completeness.
Do not restart historical applies; preserve source bytes for reviewed execution.

## Source-Backed JustTCG Boundary - September 17

Read `docs/ops/SOURCE_BACKED_MAPPING_REVIEW_CHECKPOINT_20260917.md`. The legacy
source-backed writer is review-only; ten historical Prize Pack batch entry
points are retired before mutation. Preserve old approvals as history, not
reusable authority. Fresh stamped mappings need reviewed Master Index evidence
and a separate bounded executor. Local changes do not prove deployed closure.

## Legacy JustTCG Mapping Review - September 17

Read `docs/ops/JUSTTCG_MAPPING_REVIEW_CHECKPOINT_20260917.md`. Three legacy
JustTCG discovery scripts no longer write mappings or auto-align set mappings.
Provider agreement stays review-only; existing matches are not identity proof.
The separate source-backed JustTCG writer and runtime deployment remain open.
Preserve the frozen McDonald's production apply boundary.

## Master Mapping Evidence - September 17

Read `docs/ops/MASTER_MAPPING_AUTHORITY_CHECKPOINT_20260917.md`. The local
candidate requires reviewed Master Index mapping evidence before the bounded
writer connects. Packaging is offline and does not create reviews or execution
authority. Local dry-run, frozen apply/readback and lost-commit-response proof
pass. Preserve the receipts; release checks and remote TLS/runtime verification
remain before deployment. Do not repeat completed local applies as pending work.
Preserve the separate frozen McDonald's executor and existing data identities.

## Legacy TCGdex Mapping Boundary - September 17

Read `docs/ops/TCGDEX_MAPPING_REVIEW_CHECKPOINT_20260917.md`. The legacy bridge
is now a read-only evidence collector; direct apply is retired. Its product-ID
agreement and existing mapping rows do not prove printing identity. Use reviewed
Master Index evidence and the existing bounded mapping executor, not this report,
for future writes. Integration is not deployed runtime enforcement.

## Exact Mapping Identity Preservation - September 17

Read `docs/ops/EXACT_MAPPING_IDENTITY_CHECKPOINT_20260917.md`. The isolated
mapping repair preserves source treatment labels and checks frozen set identity
before writes. Old V1.1 plans require regeneration; do not modify their hashes
or replay old applies. Historical label differences are review leads, not proof
that existing mappings are wrong. No production records were changed here.

## Warehouse Printing Authority - September 17

Read `docs/ops/WAREHOUSE_PRINTING_AUTHORITY_CHECKPOINT_20260917.md`. The source
denial repair is verified live; its read-only workflow is terminal with catalog
publication findings. Isolated admission and full staging/claim/event execution
now pass, including competing workers, lost commit responses and alias/image
rollback checks. Release and production queue checks remain pending.
Do not claim the production bypass closed.
Preserve the separate frozen McDonald's production executor and approval boundary.

## Bounded Master Printing Executor - September 17

Read `docs/ops/MASTER_PRINTING_EXECUTOR_CHECKPOINT_20260917.md` for the first
complete local raw-evidence/printing/review transaction proof. This isolated
executor has not repaired production. PRs #474 and #476 are merged. Preserve
the local rehearsal receipts. Read-only audit `35188899452` verified Pokemon
inclusion and issue reporting but failed source discovery; it is terminal.

## Catalog Source Access Repair - September 17

Read `docs/ops/CATALOG_SOURCE_ACCESS_CHECKPOINT_20260917.md`. This isolated
repair keeps a source HTTP 403 from aborting unrelated discovery while retaining
an explicit access-denied alert. It does not bypass the source or write catalog
data. Preserve the separate Master Index executor branch and its frozen plan.

## Printing Completeness Repair - September 17

Start with `docs/ops/MASTER_INDEX_TOP_DOWN_REPAIR_CHECKPOINT_20260917.md` for
the current Master Index authority contract, source-bound reconciler and first
reviewed McDonald's scope. This is local preparation, not a database-wide repair
or deployed guard. Existing production IDs and ownership must be preserved.

Read `docs/ops/INGESTION_PRINTING_GATE_CHECKPOINT_20260917.md` and
`docs/contracts/INGESTION_PRINTING_COMPLETENESS_V1.md` for the current isolated
ingestion repair. No new production apply is part of this change. Preserve the
completed anniversary Holo repair and all unrelated worktrees.

## Native Anniversary Release - September 16

Read `docs/ops/NATIVE_ANNIVERSARY_RELEASE_20260916.md` first. This branch
integrates the Samsung-verified native cover fix onto current main for the
existing TestFlight audience. Preserve all Mac checkouts and prior archives.
No database/Storage writes or public App Store submission belong to this step.

## Anniversary Sealed Intake - September 16

Read `docs/ops/ANNIVERSARY_SEALED_CHECKPOINT_20260916.md` first on this branch.
Read `docs/contracts/POKEMON_SEALED_ADDITIVE_CATALOG_V1.md` before the new
manifest-bound executor. Preparation is not a deployed catalog expansion.
Preserve the live Pokemon catalog, existing mappings and
all other games. Do not run the original hidden-lane writer or replace the
active catalog with the nine-product candidate release.

## Active Market Health Read Repair

Read `docs/ops/MARKET_HEALTH_READ_REPAIR_20260916.md`. Health-reader repair only;
preserve the completed publication and failed wrapper evidence. No ingestion,
publication, canonical data, migration, or separate MEE runtime changes.

## Verified Catalog Image Delivery

Read `docs/ops/VERIFIED_CATALOG_IMAGE_DELIVERY_20260916.md` first on this branch.
This is an isolated read-path repair for already-published 30th Celebration
images. Do not repeat catalog/Storage applies or import the dirty intake tree.

## Active Market Activation Repair

Read `docs/ops/MARKET_ACTIVATION_GUARD_REPAIR_20260915.md` first in this worktree.
This isolated branch repairs the pricing coverage query only. Production reads
are diagnostic; no deployment or publication has occurred. Keep the catalog
client candidate separate and preserve the failed producer's frozen provenance.

## Current Catalog Latency Follow-up

Numeric pagination is live at main `e986e10eee8b8c917ae646f37a11a20536a259c9`.
Read `docs/ops/CATALOG_PAGE_READ_LATENCY_CHECKPOINT_20260913.md` for the next
bounded read optimization. Preserve the exact-set index and caller visibility;
only independent metadata/printing reads may overlap. Completed release receipts:
`C:/grookai_vault_operator_artifacts/catalog_numeric_pagination_20260913/CHECKPOINT.md`.

## Current Catalog Follow-up

The September 13 presentation release is live at main `494c8626830514c278eedcdb7133575244824627`.
The eight M6 exceptions are complete; M4/M5/M6 have 351/351 hosted images.
Do not repeat completed Storage or pointer operations. Full receipts:
`C:/grookai_vault_operator_artifacts/catalog_presentation_20260913/CHECKPOINT.md`.
The next isolated code repair is natural numeric set pagination; read
`docs/contracts/CATALOG_NUMERIC_PAGINATION_V1.md` and
`docs/ops/CATALOG_NUMERIC_PAGINATION_CHECKPOINT_20260913.md`.

## Catalog Presentation Release - September 13, 2026

Read `docs/ops/CATALOG_PRESENTATION_RELEASE_CHECKPOINT_20260913.md` first.
This clean candidate preserves the original presentation tree and current main.
It contains display/cover repairs only, no image/identity mutation executor.
The completed 343 recent Japanese image pointers must not be repeated. The eight
remaining source exceptions are prepared separately, not included in this release.

## Current Collector Rollout Follow-up

The MTG scheduled refresh is enabled and verified. The collector deployment was
temporarily promoted, then rolled back after its signed-in smoke exposed the
legacy recent-activity timeout also present on the original website. Read
`docs/ops/COLLECTOR_WEB_PRODUCTION_RELEASE_CHECKPOINT_20260912.md` before resuming.
Only a bounded authenticated card-activity read repair is in progress; do not
repeat migrations, pricing publication, or expand production permissions.

## Active Backend Repair

The founder subsequently requested fixing both release blockers. Read
`docs/contracts/COLLECTOR_BACKEND_RELEASE_REPAIR_V1.md` and
`docs/ops/COLLECTOR_BACKEND_REPAIR_CHECKPOINT_20260912.md`. This extends the
website-only scope to these two backend repairs, not to bypassing migration,
producer-freeze or production-apply gates. Preserve the staged approved design.

## Collector Production Release Candidate

Read `docs/contracts/COLLECTOR_WEB_PRODUCTION_RELEASE_V1.md`. This separate release
tree preserves both live and the approved staging source. The founder authorized
production verification and a conditional website switch only after every critical
gate passes. No schema/data migration or operational worker changes. Keep testing
writes isolated; do not route a dev/staging app to production. Record results in
`docs/ops/COLLECTOR_WEB_PRODUCTION_RELEASE_CHECKPOINT_20260912.md`.

Read this file before operating in this repository.

## Required Reading

1. `docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md`
2. `docs/GROOKAI_RULEBOOK.md`
3. The current checkpoint and contract for the domain being changed.

The operator playbook is the durable map for accounts, consoles, worktrees,
devices, releases, database safety, pricing operations, and verification.

## Non-Negotiable Start Rule

Before asking the founder to repeat setup or provide access, inspect what is
already available:

- repository files, status artifacts, and current checkpoints;
- the active git branch, worktree, and remote state;
- existing signed-in browser profiles and open console tabs;
- connected Android devices and emulators;
- the configured Mac/Tailscale route for iOS work;
- existing non-secret environment-variable names and automation scripts.

A failed route, signed-out tab, wrong browser profile, missing device in one
tool, or stale checkpoint is not proof that access or setup does not exist.
Verify through a second authoritative path before asking the founder.

## Safety Boundary

- Never expose or commit secrets, review credentials, personal identifiers, or
  private keys.
- Never create a duplicate store account, app, canonical record, or remote
  resource because an existing one was not found on the first attempt.
- Never mutate production data or schema without following the governing
  migration/apply contract and its approval boundary.
- Never submit a store release, accept legal terms, publish publicly, or change
  account permissions without explicit authorization for that external action.
- Never treat a saved draft, uploaded build, prepared asset, or repository
  configuration as proof that an external console accepted it.

## Completion Rule

Finish work with direct readback, update the current status/checkpoint, run the
relevant tests, and report remaining external gates precisely. Do not make the
founder reconstruct state from chat history.

## Living-Documentation Rule

When work introduces or materially changes a recurring process, account,
console, remote-access route, device workflow, worker, deployment path, release
gate, or source-of-truth artifact, update
`docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md` in the same change. Do not leave new
operational knowledge only in chat, an unindexed audit, or personal memory.
