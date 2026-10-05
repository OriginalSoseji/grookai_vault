# Direct receipt delivery candidate — October 5

## Receipt delivery combined integration — October 5

PR598 source is being integrated with PR597/main62d287019. The Collectr release
receipt reports production428; verify fresh baseline before receipt schema work.
The combined receipt candidate is429 on fresh full/upgrade3270x/3272x labs.
Earlier428 receipt labs and all Collectr fixtures are retained and must not reset.
Receipt product/SQL bytes stay unchanged; only proof routing and integration change.
External receipt_delivery_20261005/CHECKPOINT.json owns current proof/release state.
Sending remains disabled; no receipt migration or sender activation in production.

Historical isolated candidate and receipts follow. The fresh combined proof
supersedes the earlier427-to428 qualification for future release work.

The combined full429 replay is `full-429-v1/replay-result.json`; actual local
Auth/RPC proof is `runtime-1791214142285/receipt.json` (eight checks, mocked
providers, users removed and switches off). `BASELINE_428.json` records the fresh
read-only production comparison. Upgrade evidence is retained under
`upgrade-429-v1`; normal integration commit/push and real Next HTTP receipts are
tracked by the external checkpoint. The new API is32701, web proof32710, and
upgrade API32721. An occupied65444 port was rejected before fixture creation;
that service and all earlier654xx labs were left untouched.

PR598 is a draft. The original receipt product/SQL from a5817e645 is unchanged;
the integration preserves the merged Collectr implementation and both operator
histories. Do not rerun any consumed Collectr migration or deployment intent.

Source: C:/gv_receipt_delivery_20261005, feature/receipt-delivery-20261005, from
main a186a9bb2a891d7e36752afb12f1a5041331d080. PR595 is merged; TestFlight344 is
already available. Never replay its consumed merge/upload/configuration intents.

This candidate adds a receipt-only outbox, owner APIs, email/SMS adapters and
direct-send/status controls to the web account receipt desk. Read
[the behavior contract](../contracts/RECEIPT_DELIVERY_V1.md). It is NOT live.
Native Sales desk adds the same direct-send controls after a recorded sale and
retains Share/copy. Native HTTP/widget proof is separate from device proof; there
is no new TestFlight package in this batch. Build344 does not include this panel.

External evidence/checkpoint:
C:/grookai_vault_operator_artifacts/receipt_delivery_20261005.
Strict read-only427 baseline passed with zero normalized schema/security drift.
The additive candidate is20261005150000; no production schema/data change was made.
It needs a fresh production release gate before any remote application. Active
catalog/Collectr work and its schema fingerprints must be reconciled at integration.

Dedicated labs: full-428-v2 (API65401/DB65400) and upgrade-428-v2
(API65421/DB65420), internal networks10.246.42/43. Both worker process counts are
zero. Retain populated upgrade fixtures; never reset an existing proof database.
The initially considered10.245.136 subnet was already occupied; the guard stopped
before any fixture creation. No shared service/network was changed.

Full reset/no-op push and retained two-copy/receipt upgrade passed. Actual local
Auth/RPC proof verified isolation, concurrent request/claim deduplication, status
poll throttling, uncertain-claim behavior, disable-before-dispatch, and unchanged
receipt/inventory. Synthetic users were removed and controls turned off. Provider
responses are mocked; no customer messages were sent. Desktop/phone DOM proof
covers consent, duplicate clicks, stable retry IDs, status and recipient changes.
External receipts bind exact source; recheck them after later edits.

Production configuration (server-only): GROOKAI_RECEIPT_DELIVERY_ENABLED=true;
RECEIPT_EMAIL_FROM (verified plain email), RECEIPT_RESEND_API_KEY;
RECEIPT_TWILIO_ACCOUNT_SID, RECEIPT_TWILIO_AUTH_TOKEN,
RECEIPT_TWILIO_MESSAGING_SERVICE_SID. Only enable a channel after sender setup,
authorized real test delivery, schema/API/browser release qualification, and
confirmation of that channel's status-read permissions. Keep keys out of logs.

An existing-provider question is pending. No provider account purchase, DNS change,
SMS registration, remote migration, production switch, deployment, or real test
message is implied by this candidate. Failure to configure delivery does not block
receipt storage or existing Share/draft options. Do not claim receipts were sent
from a mailto/sms link or from mock acceptance.
