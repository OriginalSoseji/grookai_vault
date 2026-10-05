# Direct receipt delivery candidate — October 5

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
