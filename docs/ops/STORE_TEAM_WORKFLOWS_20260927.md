# Manager workflows — September 27

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
