# Grookai Final App Store Launch Checklist

Date: September 9, 2026. Status: NOT READY TO SUBMIT.
Purpose: finish the existing collector product, not expand its feature scope.
This checklist consolidates release work; it does not override frozen pricing,
identity, ownership, migration or destructive-operation contracts.

## Founder Release Exception - September 9, 2026

The founder explicitly directed: complete what can be completed and release
without waiting for canaries or calendar holds, accepting an imperfect first
release so collectors can start using the app. This supersedes the elapsed-time
72-hour soak and seven-cycle scheduling prerequisites below for this launch.
Those observations continue after release and are not falsely marked passed.

Current correctness, authentication/isolation, core-flow smoke tests, exact
artifact identity, honest limitation reporting and rollback remain required.
Apple review/processing is an external distribution requirement, not an internal
canary. This exception does not authorize fabricating holdings/conditions,
changing source identity, destroying data or accepting new financial/legal terms.
Safely isolate noncritical defects instead of holding all usable features.

## Release Rule

Ship one identifiable candidate with zero known launch-blocking defects, passing
critical journeys, current production evidence and a tested rollback. Tests do
not establish that software is bug-free. Every available feature must either
meet its acceptance gate or be explicitly deferred and unavailable to collectors;
do not quietly remove promised sealed ownership to make the checklist green.

Only fixes, verification, operations and store preparation belong in this lane.
No new TCG expansion, visual-search merge, image-background removal or redesign.
Owners: engineering executes and records evidence; founder supplies facts only
they can verify and handles any new legal/financial or separately restricted
production authority. Routine testing does not require repeated micro-approvals.

## Current Evidence

| Area | Verified state | Release implication |
|---|---|---|
| Native totals repair | Samsung 318 installed and visually verified; 27 Flutter tests pass | Local source remains uncommitted; web/iOS do not include this repair |
| Sealed ownership | One genuine Blooming Waters holding exists; condition unknown; reference USD 326.70; owned value null | Confirm condition only from owner evidence; do not infer it or substitute reference price |
| Add access | Account-only, one-product test; global Add off; expires September 10 at 13:13:42 UTC | Ordinary collectors/reviewers do not yet have durable sealed Add access |
| Apple build | Last direct receipt: 317 in internal TestFlight and selected in an unsubmitted manual-release draft | Fresh console readback and a final candidate containing current fixes required |
| Pokemon sealed maintenance | Run 34369019748 failed September 9 at 15:15 UTC; issue 426 open | Source identity drift blocked refresh; 24 aging prices, eight reach expiry September 10 |
| Printing identity | Issue 450 remains open | Four Phantom Forces EX entries exposed as reverse holo require authoritative resolution |
| Pricing canary monitor | Run 34377983245 succeeded by exiting an already-complete August 13-16 window | Not a current pipeline/price-health proof |
| Supabase capacity | Audit 34377974946 PASS at 16:39:23 UTC; Medium, 320 GB, 80.93% used, 600 GB maximum | Configuration/headroom pass only; load, growth, billing, restore and worker disk remain separate |
| Repository | Remote main observed at 312c5c7ab0cc9ebf594dd1696354e58f85b9b33d; PR453 open | Preserve local repair and reconcile deliberately; no blind branch merge |

Operational facts not freshly rechecked remain pending, even when older receipts
show success. Relevant evidence:

- `C:/grookai_vault_operator_artifacts/release_closeout/20260909/FINAL_GATE_STATUS.md`
- `docs/checkpoints/COLLECTION_SEALED_TOTALS_20260909.md`
- `C:/grookai_vault_operator_artifacts/release_closeout/20260909/final_checklist_capacity_34377974946/`
- [Sealed failure](https://github.com/OriginalSoseji/grookai_vault/actions/runs/34369019748)
- [Sealed maintenance issue](https://github.com/OriginalSoseji/grookai_vault/issues/426)
- [Printing truth issue](https://github.com/OriginalSoseji/grookai_vault/issues/450)

## Gate 1: One Release Candidate

- [ ] Preserve and commit the collection-total changes; resolve PR453 and its
  separate contract amendment without changing historical execution provenance.
- [ ] Reconcile against current main. Leave unrelated work and recovery refs intact.
- [ ] Pass full repository checks, relevant integration tests and security review.
- [ ] Freeze source SHA, build numbers, app IDs, schema ledger, feature flags,
  web deployment and separately pinned backend runtimes in a release manifest.
- [ ] Produce signed production-configured iOS/TestFlight and Android builds.
  Verify installed/downloaded artifact identity, not just build success.
- [ ] Deploy the matching web repair once, then read back deployment and flags.

Exit: no local-only launch fix, unresolved release PR or unexplained client/runtime
drift. Samsung profile 318 is QA evidence, not an App Store binary.

## Gate 2: Data, Prices And Sealed Ownership

- [ ] Diagnose the exact identity drift in issue 426. Repair only with source
  evidence; preserve the rejected payload and verify refresh/readback. Do not
  extend freshness windows or re-date observations to conceal stale prices.
- [ ] Resolve issue 450 with authoritative printing evidence and regression tests.
  No fabricated reverse-holo mappings or damage to existing holdings.
- [ ] Verify actual latest TCGPlayer publication, MEE nightly/reference refresh,
  source warehouse and sealed refresh results. Reconcile counts, freshness,
  provenance and active read models through rendered prices.
- [ ] Verify cards and sealed quantities, conditions and totals after add, edit,
  duplicate request, sale, trade and removal. Unknown values remain visibly
  unpriced; currencies stay separate; cost/asking/reference never replace market.
- [ ] Complete bounded sealed rollout and rollback, then verify ordinary-account
  and reviewer access for every advertised supported game/product category.
  The founder's expiring grant cannot be the public release configuration.

Exit: correct identities, fresh qualified prices, working ownership and reconciled
totals with no silent omissions. Use staging fixtures for destructive/business
journeys; never fabricate real sales, trades or holdings in production.

## Gate 3: Complete Collector Journey Crawl

Run on the frozen candidate: iPhone, supported iPad layout, Samsung, desktop web
and mobile web. Use both a new account and an existing collection, including
empty, large, unpriced and mixed card/sealed collections.

| Journey | Required proof |
|---|---|
| Authentication | Signup, verification, sign-in/out, recovery, expired session and account switching |
| Search/catalog | Names, aliases, set/number, year and finish filters; Pokemon/MTG/OP; set grids, covers and pagination |
| Vault | Exact printing, quantity, condition, sealed Add, combined totals, filters, bulk selection and removal |
| Wall/vendor | Add/remove and section assignment; price editing; sold/traded records; private/public boundaries |
| Memory/Pulse | Open the memory itself, public/private transition, share link, print and cross-account access |
| Sharing | Single card/sealed QR, front/back lot image generation, cancel/retry, deep links installed/uninstalled |
| Messages/safety | Send/receive, block/report, moderation routing and private-data protection |
| Scanner | Camera permission/denial, disclaimer, scan, manual correction and safe failure |
| Founder operations | Notification opens the exact task; duplicate/expired decisions denied; execution/readback visible |
| Lifecycle/failures | Offline, slow network, timeout, background/resume, failed image, retries and safe recovery |

- [ ] Each journey has build/environment/account-role, steps, expected/actual,
  screenshot or video, evidence reference and pass/fail status.
- [ ] No broken primary action, dead link, unexpected empty catalog, wrong object,
  incorrect total, lost edit, duplicate holding, private leak or launch crash.
- [ ] Keyboard, safe areas, text scaling, accessibility labels and loading/error
  states work on supported screen sizes; no infinite spinners or overlapping UI.

## Gate 4: Sustained Operations, Security And Speed

- [ ] Verify new-set/card discovery per active game/language, staging completeness,
  last success, failure alerts and strict boundaries between discovery and apply.
- [ ] Reconcile full MEE nightly policy with deployed runtime before replacement.
  Verify actual source yield; a successful one-request job is not full ingestion.
- [ ] Resolve worker retention/capacity after exact preservation and reachability
  checks. Never delete the preserved dirty runtime merely to clear an alert.
- [ ] Measure database growth, query latency, CPU/memory/IO, connection headroom,
  storage/egress and spend alerts. The capacity audit does not prove Spend Cap.
- [ ] Prove a restore in isolation and rollback for clients, functions, releases
  and feature flags; record recovery time/data-loss objectives and incident owner.
- [ ] Verify RLS/storage/function authorization, account isolation, sanitized logs,
  dependency exposure and secret handling. Track residual advisories explicitly.
- [ ] Exercise a bounded failure alert through founder notification, task view,
  acknowledgment and recovery without adding fake production business records.
- [ ] Measure cold/warm search, Vault, Wall, sets and images on normal and slow
  networks. Use existing contracted SLOs; establish explicit launch budgets where
  missing before results are judged. Record p50/p95, timeout and crash rates.
- [ ] Verify current runtime health and reconciliation; continue soak/cycle
  observation after release under the founder exception above. Do not wait for
  a calendar threshold, reuse old no-op monitors as current proof or relabel
  failed historical cycles as passes.

## Gate 5: Apple Review And Store Readiness

- [ ] Fresh App Store Connect readback: correct app, bundle ID, version/build,
  signing, processing status, agreements and manual-release selection.
- [ ] Test reviewer credentials on a clean device. All described features and
  live backends must be accessible without the founder's temporary grant.
- [ ] Verify in-app account deletion and public privacy/support/deletion routes.
- [ ] Reconcile privacy disclosures, SDK manifests, permission descriptions,
  age rating and encryption/export answers against the actual final binary.
- [ ] Verify report/block/filtering and moderation response coverage across all
  user-generated content. Do not claim implemented moderation from a checkbox.
- [ ] Confirm pricing/image/content display rights for the intended audience.
  Keep anonymous pricing denied until its separate display-authority gate passes.
- [ ] Capture accurate final-build screenshots for supported devices; finish
  description, keywords, support/contact details and review notes with sample links.
- [ ] Confirm symbol files match the final iOS archive and Crashlytics build.
- [ ] Run `npm run release:store:status` and `npm run release:store:require`,
  then independently verify console fields; repository checks alone are insufficient.

Apple references checked September 9:
[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
and [Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/).
They require accurate metadata, working review access and accessible services;
user-generated content needs safety controls. App Review acceptance is Apple's
decision, not something these tests can guarantee.

Google Play readiness is a separate distribution checklist. It need not delay an
iOS-only submission, but shared backend/security defects block both platforms.

## Gate 6: Submission And Public Release

- [ ] Final report lists every gate PASS/BLOCKED/DEFERRED with evidence and owner.
  No open P0/P1 or unresolved security/data/identity/publication blocker in scope.
- [ ] Upload the one verified candidate, attach its build and submit for review
  through the applicable store authority. Do not turn submission into automatic release.
- [ ] Keep production services and reviewer access healthy throughout review.
- [ ] After approval and go/no-go, release with active monitoring and rollback
  ownership. Phased rollout applies to eligible updates, not an assumed first-launch gate.
- [ ] Monitor initial collectors: crashes, auth, search, images, totals, writes,
  source freshness, worker failures and support. Roll back/disable the affected
  function on data loss, unauthorized access or materially wrong published values.

## Execution Order

1. Fix launch blockers: sealed refresh, printing truth, total-repair promotion.
2. Prove ordinary-account sealed ownership and all collector journeys.
3. In parallel, finish operational reliability, security/performance and store assets.
4. Freeze and reconcile current correctness evidence; continue duration monitoring
   after release without a calendar hold.
5. Final go/no-go, submission, monitored manual release.

This checklist creation performed read-only GitHub/release evidence inspection
and documentation edits only. It did not deploy, rerun ingestion, mutate
production data, expand activation or submit to either store.
