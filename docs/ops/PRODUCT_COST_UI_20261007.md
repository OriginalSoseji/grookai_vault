# Private cost editor — October 7

Candidate: `C:/gv_product_cost_ui_20261007`, branch
`feature/product-cost-ui-20261007`, based on cost backend `3f3a30e88`.
The economics release-gate worktree remains separate and unchanged by this UI.
Read [Vendor cost evidence V1](../contracts/VENDOR_COST_EVIDENCE_V1.md).

The owner copy route mounts a private cost editor. Server `GV_COPY_COST_V1=1`
reveals new reads/edits; the database edit switch must also permit writes.
An existing pending request can be recovered when the web feature is off.
No public copy, store, customer receipt or asking-price DTO includes private cost.
An amount never receives an assumed currency; zero and unknown are distinct.

IndexedDB `grookai.private-copy-cost.v1` holds owner/copy-scoped drafts and exact
pending payloads. Persist before POST; failed storage prevents network mutation.
Readwrite transactions compare revisions across tabs. Lost responses retain the
original UUID until recovery or an explicit backend business rejection. A conflict
preserves proposed fields and requires loading the latest saved pair. Accepted
local writes finish across SPA departure; account changes close the private UI.

Local browser fixture: `npm exec playwright test -- --config
playwright.copy-cost.config.ts` in apps/web with an unused loopback port supplied
through `GROOKAI_PLAYWRIGHT_PORT`. Fixture routes intercept Auth and cost APIs;
they prove browser behavior, not real API/RLS integration. Use the dedicated
runtime producer for actual local Auth/DB evidence when available. Never direct
a development server to production, reset a retained lab, or replay old requests.

`scripts/audits/product_cost_ui_runtime_v1.mjs` attests the retained full431 lab
and its source hashes before temporary synthetic owners/copies. Its dedicated
`NEXT_PUBLIC_COPY_COST_LOCAL_TEST=true` accepts only loopback33061, excludes other
test modes and hosted/production builds, and requires authenticated staging with
telemetry disabled. It runs the actual owner page/API on loopback33210, drops one
successful response, verifies one persisted request, checks owner/origin/conflict
boundaries, and restarts entry-off to verify recovery. Scoped cleanup bypasses the
append-only event trigger only for recorded synthetic rows, then verifies all
eight retained table hashes. Historical failed receipts are retained.

`scripts/tests/run_product_cost_ui_checks_v1.mjs commit` uses the ordinary managed
hook with read-only lab credentials and writes its receipt in the UI artifact
directory. Stage reviewed source first, and do not edit it while the hook runs.

Actual outcomes belong to external
`C:/grookai_vault_operator_artifacts/product_cost_ui_20261007/CHECKPOINT.json`.
No deployment, production activation, release completion, native cost editor or
profit report is implied by this candidate. Historical sale-cost corrections,
expenses and event reporting remain separate overhaul work.
