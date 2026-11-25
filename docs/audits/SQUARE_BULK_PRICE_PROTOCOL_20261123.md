# Square bulk price protocol investigation — November 23, 2026

Status: offline request preparation and operator-only Sandbox qualification.
No production batch writer, schema change, activation or capacity qualification.

## Problem and bounded scope

The integrated candidate at `63d043f5aa4ff39c97adbd43f2718fd56502b30d`
reached 100 vendors and confirmed 400 changed prices in a controlled 151-second
wave. Its five-target selection still limits the full daily tail. Increasing
merchant concurrency alone cannot qualify 100,000 changing prices overnight.

This step establishes provider behavior before adding a new durable database
authority. It adds a network-free price-only batch planner, a bounded read-only
25-SKU lookup, receipt inspection, and a Sandbox-only operator transport probe.
Existing production worker, save, stock, sale, selection and recovery paths do
not call the new methods. No new operational flag is introduced.

## Starting state and schema stop

A new canonical shared-SDK read-only maturity check confirmed project
`ycdxbpibncqcchqiihfz`: 173,994 prints, 3,421 sets and 47,409 traits.
The genuine strict `AuditLinkedSchema` attempt initially lacked this new
worktree's link metadata; its failed receipt is retained. After carrying the
verified existing canonical CLI metadata, the second attempt reached production
and failed on applied IDs `20261123050000` and `20261123190000`, absent from this
branch. No new application SQL was authored or applied. The historical 519 audit
and synthetic Square 522 prefix do not qualify the current production schema.

The active duplicate-set main merge pause remains binding. Exact applied-source
reconciliation and a genuine current starting-schema proof precede database
implementation. This audit grants no production SQL, main merge, protection
change or dashboard-writer exception.

## Request and lookup boundaries

`catalog_price_batch_plan_v1.mjs` reuses the existing complete-catalog planner.
Only existing mapped single-variation items with price-only changes enter a
batch. Creation, adoption, seller edits, shared items, conflicts and name changes
stay on the ordinary path. Private, unavailable and unselected offers are
excluded. Caller-supplied eligibility is preparation data, never authentication.
Manual override policy still belongs to the server's pricing authority.

Each group has at most 25 distinct existing parents / 50 nested objects and one
atomic provider batch. The unchanged 1MiB request bound splits groups without
truncating an item. An oversized full item is deferred. The original full item
and child fields are preserved; only the qualified price is changed. No stock
quantity is written. Deterministic whole-request keys bind scope, original source,
member IDs/versions and complete objects; single-target operation keys are not
reused as batch keys. Exact request bytes/count/hash and all members must match
before receipt inspection accepts any result. Inspection has no DB authority.

`itemsForExactSkus` uses a paginated SKU set search and separate full parent
retrieval. It does not infer uniqueness from stored mapped IDs. It retains
duplicate matches for conflict detection, rejects incomplete pages and changed
QR/parent membership, and rejects foreign, missing, repeated, deleted or invalid
versioned objects. The existing 2MiB response and provider deadline remain.
Case-variant unexpected results fail closed; they are never silently discarded.

## Actual Square Sandbox evidence

The API remains pinned to `2026-09-16`. Twenty-five explicitly named Sandbox
fixtures were created with zero inventory quantity writes or payment requests.
They are not a real seller's inventory. All provider requests were limited to
`connect.squareupsandbox.com`; no database connection was initialized.

The initial fixture creation hit an actual 429 on attempt 24. The exact saved
request/key was retained and resumed; no replacement fixture/key was invented.
The first batch changed all 25 prices and replayed identically without duplicates.

The first optimistic-concurrency experiment **failed**: making only one parent
ITEM version stale, while retaining its current child version, was accepted and
all 25 prices changed. The source, request, failure and independent readback are
retained. A stale parent version alone is not a qualified conflict guard.

A forward probe reused these same fixtures. A stale child version returned 400;
all 25 price readbacks remained unchanged. A negative-price member also returned
400 with all 25 prices unchanged. These observations are specific protocol cases,
not a promise that every error leaves every object untouched. A future durable
worker must retain and reconcile every member even after a rejected response.

The probe then deliberately discarded an accepted 25-member response. The client
reported an uncertain provider failure. Independent retrieval confirmed every
intended price. Replaying the identical saved body/key returned a complete receipt
and did not create items or change versions again. Notes, abbreviation and the
inventory-tracking setting were retained. Unit models additionally preserve tax,
image and custom-attribute request fields; broad real-seller field coverage is
not yet qualified.

The final source must separately qualify the 25-SKU client lookup, complete
receipt/source binding and response-loss/replay proof. Private receipts are under
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-price-v1`.
Preserve failed V1 and successful V2 source archives; never relabel an older
source's proof as verification of a changed source.

A separate retained-fixture probe edited one seller note after taking the price
snapshot. Square accepted the stale price batch, kept the concurrent note, and
changed all 25 prices. Its expectation of whole-request rejection failed and the
failed receipt remains retained. This observed note preservation is useful, but
does not qualify generic rejection or all seller fields under concurrent edits.

The final protocol source passed a 25-SKU lookup in two read requests and a
31,124-byte/50-nested-object price request. An accepted response was deliberately
lost, then all members were read back and the identical body/key replayed without
duplicates. All 169 Square regression tests passed, including 16 new cases for
scope/source/body binding, complete pagination, byte bounds, conflicting items
and partial/foreign/stale receipts. These are functional protocol results, not
actual daily throughput or database acknowledgement authority.

## Reproduction

Run `npm run square:test` for the existing and new regression selections. The
operator protocol runner is `backend/square/qualify_sandbox_price_batch_v2.mjs`:

```powershell
node --use-system-ca backend/square/qualify_sandbox_price_batch_v2.mjs --env-file C:/PRIVATE/sandbox.private.env --fixture-dir C:/PRIVATE/retained-bulk-fixture --out-dir C:/PRIVATE/NEW-bulk-proof
```

It requires the original explicitly synthetic 25-item Sandbox fixture, validates
its seller/app/location and exact test names, and refuses an existing output
directory. Preserve an interrupted directory and its whole saved requests; do
not bypass that refusal or create replacement items to make a retry pass. It has
no production transport or database path. Private source archives/proofs and the
normal/hosted status are tracked in the operator hardening checkpoint.

## Remaining implementation and release gates

There is deliberately no production batch mutation entry point. A new durable
parent operation must bind owner, environment, connection, exact membership,
source, whole body/key/hash and per-member results before production IO. Accepted
response loss, DB receipt loss, source/privacy changes, restart, disablement and
foreground/manual recovery must all reach that retained operation safely.
Never pass a batch body to old single-item recovery or infer POS readiness from
a successful Vault save. The automatic target/receipt bounds need their own
forward-only migration after the current starting-schema proof.

Then qualify actual Auth/tenant/lease/concurrent-clock boundaries, newly added
cards during a pricing backlog, manual overrides, sold/eBay-held copies, varied
catalogs/artwork, and the complete 100,000-copy price-to-POS tail. Hosted clock,
real-provider capacity, exact-head normal/hosted/review and production release
gates remain separate. The reader sale remains owner-deferred. No public daily
freshness promise follows from this transport proof.

## Primary provider references

- [Batch upsert](https://developer.squareup.com/reference/square/catalog-api/batch-upsert-catalog-objects)
  documents full replacement, atomic batches, seller serialization and replay keys.
- [Batch retrieve](https://developer.squareup.com/reference/square/catalog-api/batch-retrieve-catalog-objects)
  describes complete child information in returned items.
- [Update catalog objects](https://developer.squareup.com/docs/catalog-api/update-catalog-objects)
  describes parent/child versions. The actual stale-parent counterexample above
  remains evidence; documentation does not erase an observed result.
