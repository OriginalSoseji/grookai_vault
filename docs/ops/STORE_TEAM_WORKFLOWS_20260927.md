# Manager workflows — September 27

## Review and release continuation

Final shipcheck exposed intermittent Windows loopback fixture subprocess
timeouts under four-way Node test execution, despite focused passes and one
complete commit pass. Contract files now run serially, preserving the exact
file set/assertions and all hook stages. The commerce alert test explicitly
closes its own connections during teardown so keepalive sockets cannot hold
the suite open. This changes test scheduling/cleanup only; no gate is skipped.

PR523 is ready for review. The normal commit and push hooks passed for the
initial candidate (5,509 Node tests, 749 Flutter tests, analysis, web checks and
build). Review found two rollback/validation edges. Additive migration
`20260927160000_vendor_store_team_workflow_review_v1.sql` rejects the reserved
Wall name for both section actions and permits retaining/removing existing
workflow grants while the workflow flag is off, without adding any new grant.
The owner UI displays dormant grants with an explicit removal choice.

The original405 package remains immutable. The fresh406 package and receipts
are `store-team-workflow-review-replay-v1` and
`docs/audits/store_team_workflow_review_v1`. Run the review-specific role and
HTTP scripts against that package; the older scripts retain historical gates.

Production release uses the narrow `-VendorStoreTeamWorkflowsV1` mode in
`scripts/migration_preflight_strict.ps1`, only AuditLinkedSchema/PrePush with
exact expected IDs `20260927143000,20260927160000`. It compares fresh remote404
to the captured404 baseline, verifies406 local replay/security, actual role and
HTTP proof, and source-bound browser/normal-hook receipts. The fixed-target
`scripts/release/store_team_workflows_v1.mjs` handles prepare, dry-run, apply,
readback through the CLI. Never reuse a consumed intent. Both migrations leave
workflow publication off. Verify retained data and existing flags before source
deployment and separate workflow activation; payments stay off. A new release
checkpoint outside the repo records the actual deployment state.

## Local implementation checkpoint

Migration `20260927143000_vendor_store_team_workflows_v1.sql` is frozen in the
dedicated `store-team-workflows-replay-v1` package. The404→405 upgrade, complete
405 replay and no-op push passed, with identical normalized schema/security.
Only two team permission constraints and three team functions changed; all
canonical, ownership, pricing and stock authorities were retained.

Seventeen real role/concurrency groups passed, including the original manager
regressions and concurrent exact-copy/product retry and permission-removal tests.
Eight real local Auth/HTTP/Storage groups passed before browser proof. Receipts
are under `docs/audits/store_team_workflows_v1`. The earlier transaction-only
draft test passed and rolled all fixtures/DDL back before freezing405. Its
404 baseline guard intentionally prevents running it against the advanced lab.

Desktop components now expose catalog intake, selected sections and custom
products only with their respective grants. Public listing and price controls
require separate grants. API mutations keep exact-origin and bounded body checks.
Creation retries retain their request while the page remains open; after an
uncertain response the UI freezes the attempted details and offers safe retry.

Browser proof also passed: owner sees seven opt-in permission choices; manager
created a second distinct copy with printing/price/section/listing together and
created a private custom draft. Product editing worked at390px with no horizontal
overflow. Desktop dark and mobile light/dark viewport captures were inspected.
Full-page CDP capture timed out; the ordinary visible captures succeeded.
All synthetic Auth users, copies, catalog fixtures and storage objects were
removed; both team controls are off in the isolated405 lab. No shared reset.

Production remains404 with its existing manager feature. This expansion is not
live. The workflow flag is false by default and existing staff grants are not
changed. Pending: normal shipcheck evidence, review, fresh production
404 preflight, bounded405 application, verified source deployment and explicit
workflow activation. Never reuse previous release apply/activation intents.

Baseline main a0dc406405ccffc49be19ff69796a9763f444aaa includes the catalog
refresh and live manager release521. Follow-up branch is
feature/store-team-workflows-20260927 in C:/gv_store_production_20260926.
Existing owner/manager release is live at404; do not replay its consumed intents.

Next scope: independent opt-in catalog-card intake, store sections and custom
product permissions. Existing grants remain unchanged. Manager actions retain
the authenticated actor; never impersonate the store owner. Billing, payouts,
ownership, store destination publication and staff administration remain owner-only.
Bulk scan intake remains in the existing owner workflow.

New catalog intake creates exact copies in the store owner's Vault through the
existing GVVI allocator. Public catalog/printing eligibility is rechecked. New
copies do not enter the storefront unless explicitly listed with listing access;
initial asking prices require pricing access, and section assignment requires
section access. Durable request IDs prevent duplicate additions after retries.

Only store-selected sections and store-scoped copies are exposed. Private Wall
sections/copies are excluded. Custom product editing preserves existing product
versions, validation, publication and stock boundaries. Price, listing and section
actions additionally require their corresponding permission.

Baseline audit passed: production/local404 ledgers and schema/security agree;
171021 cards,3400 sets,32903 traits. Production team enabled, zero managers and
pending invitations, seller/orders/reservations disabled. New workflow rollout
will default off. No production write or invitation belongs to development.

Use a fresh one-use replay package in the dedicated empty294xx lab, retain all
earlier packages/receipts and preserve290xx/shared repair services. Paused catalog
repair needs new dependency fingerprints before resumption. Local role/Auth/UI
proof and normal reviewed release checks precede any production expansion.
