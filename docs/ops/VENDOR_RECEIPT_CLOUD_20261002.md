# Account receipt cloud — October 2, 2026

The device-only receipt desk is LIVE from PR580, merge8dffbf8a. Its authoritative
release checkpoint is C:/grookai_vault_operator_artifacts/vendor_receipts_20261002/
release-checkpoint.json. Do not repeat its release or label it unfinished.

New work: C:/gv_vendor_receipt_cloud_20261002, feature/vendor-receipt-cloud-20261002,
based on that merge. Read ../contracts/VENDOR_RECEIPT_CLOUD_V1.md. This adds one
disabled-by-default migration20261002220000 over the unchanged414 baseline.
No catalog, ownership, checkout, production entitlement or customer message work.
Keep the separate435-migration checkout candidate and every repair lab untouched.

Account UI: /account/store/receipts/cloud. Existing /account/store/receipts keeps
device records and gains a link only when the cloud server flag is enabled.
Moving a device book requires the user to export/import into an empty account
book. It does not clear or silently merge either book.

Local proof uses dedicated internal networks and loopback-only services. V1
full/upgrade labs and their evidence are superseded, retained and stopped after
the actual HTTP test found PostgREST retrying SQLSTATE40001 indefinitely. V2 uses
PT409 for a permanent application conflict. Do not replay/reset populated V1 labs.

- Full V2: receipt-cloud-full-415-v2-20261002, database64600, API64601,
  internal10.249.248.0/24.
- Retained upgrade V2: receipt-cloud-upgrade-415-v2-20261002, database64620,
  API64621, internal10.249.249.0/24.
- Website15450. NEXT_PUBLIC_RECEIPT_CLOUD_LOCAL_TEST admits only64601 with
  isolated staging, disabled telemetry and no Vercel target. Production rejects it.
- Supplementary SQL container: gv-receipt-cloud-sql-v2-20261002, network none.
- Operator artifacts: C:/grookai_vault_operator_artifacts/vendor_receipt_cloud_20261002.
- Current work logs, synthetic screenshots and private local runtime settings:
  .local/receipt-cloud/. Never publish private settings or JWTs.

The first strict schema audit failed because this new worktree is deliberately
unlinked. Preserve that log; do not link it to production or use the generic
reset path. A fixed-source read-only baseline/release gate must precede remote
apply. The live website and database have not received this cloud candidate.

Runtime proof removes only its synthetic account IDs (and cascading books),
restores cloud OFF, and verifies no copies/orders were created. Tests must not
use production-connected browsers or send receipts to real customers.

Remaining qualification is tracked in the local/external checkpoint. Automated
delivery, standalone prospect editing, staff sharing, and correction/refund
history remain separate work after durable storage.

## Qualified candidate

Main fd2f4675c (PR581) was incorporated before normal release checks; no receipt
runtime or migration overlap. The retained local stash is a recovery copy only.
Full 415 replay/reset/no-op push and populated 414-to-415 upgrade pass in V2.
Actual Auth/Next browser proof passes six checks: cross-device persistence and
owner isolation; stale-tab draft retention; direct RPC immutability/table denial;
lost-successful-reply retry exactly once; legacy device save/explicit empty-book
import; rollback retaining data and desktop/mobile rendering. Synthetic accounts
were removed, no orders/copies created, and cloud restored OFF.

Final runtime receipt: .local/receipt-cloud/web-1790978145473/receipt.json,
also copied to external runtime-result.json. Supplementary five-group SQL proof,
43 targeted contracts, TypeScript, lint and strict build pass. Read-only production
414 schema/security baseline comparison passes. Migration SHA256:
1cdfdc0d5f2f518570a3b310ae975461054933d7f545821a610107437f6e6922.
Normal hooks, hosted checks, fresh exact-source preflight/dry-run, production apply,
activation and live readback still follow; this paragraph is not a live claim.
Use external CHECKPOINT.json for subsequent release state.

## PR582 review hardening (V3)

The automated review identified quadratic snapshot retention and request-envelope
capacity overhead. Both are fixed before production. SQL retention uses set
difference; customer/source lookups are indexed JSON objects, and client customer
validation uses a Set. A 9,999-to-10,000 receipt save with 10,000 customers passes
a 15-second SQL deadline in 1,022 ms locally (initial save 930 ms). This is local
measurement, not a production performance guarantee. The request permits 1 KiB
of bounded envelope overhead and separately checks canonical UTF-8 book bytes.

V2 source is retained at 45026cc19; its labs and cli-package are superseded, not
reset. V3 uses full/upgrade-415-v3, ports64700/64720 (APIs64701/64721), internal
10.250.246.0/24 and10.250.247.0/24, and fresh cli-package-v3. Supplementary proof:
.local/receipt-cloud/sql-proof-v3.json. Exact revised migration SHA256:
9ad5b30182f9d51678f018c5a2a2cb941796aeb828b6979a1e1775886eec09b2.

A Docker backend fatal fault interrupted the first normal push. Normal vendor
backend startup recovered it; no manual WSL shutdown, database reset or volume
deletion occurred. The V2 normal push then passed, and the recovery browser proof
passed. Fresh V3 source requires new replay, runtime, hooks and release gates.

### Hosting payload boundary

The subsequent Vercel limits review found its 4.5 MB request/response ceiling.
V3 removes the unpublished Next receipt-book proxy entirely and uses the existing
authenticated Supabase browser SDK for governed RPC reads/saves. The database
remains the sole owner/immutability/rollout authority. A local initial-session
binding additionally refuses a stale editor save after account switching. This
supersedes the earlier envelope-overhead workaround: no browser receipt book is
proxied through Vercel. The 10 MB canonical UTF-8/database JSON bounds remain;
metadata overhead is outside the client book check. The real browser test imports
9,999 receipts/10,000 customers, then saves receipt10,000 through this SDK path.
Reference: https://vercel.com/docs/functions/limitations#request-body-size.

V3 final browser proof PASSED at22:59UTC:
.local/receipt-cloud/web-1790981950388/receipt.json. Seven actual SDK/Auth/Next
checks include importing9,999 receipts and10,000 customers then savingreceipt10,000
from the UI, each within20seconds. Cleanup removed all three synthetic accounts
and their books; rollout restoredOFF, no orders/copies created.31 targeted
contracts and final strict build pass. The release gate now explicitly requires
actual browser capacity proof. Normal hooks and release follow on these bytes.

The large-book backup follow-up changes export to compact JSON. Pretty output
can exceed the importer limit while the saved canonical book still fits. The
browser capacity proof now downloads all10,000 receipts/customers and verifies
exact round-trip equivalence and file size. Migration bytes and V3 replay/upgrade
proof are unchanged. The eef03b2d push was stopped during its normal hook before
remote publication to qualify this final fix; no hook was bypassed. Preserve
push-hook-v3.log/result and use final-named normal hook receipts next.
Final compact-backup browser proof PASSED:
.local/receipt-cloud/web-1790983041227/receipt.json. All eight scenarios pass,
including exact equality between the downloaded10,000-record backup, its parsed
restoration, and the saved database book. All synthetic users/books removed;
cloudOFF restored and no inventory/orders created. Final source is frozen for
normal commit/push and release; no further feature work belongs to this release.
