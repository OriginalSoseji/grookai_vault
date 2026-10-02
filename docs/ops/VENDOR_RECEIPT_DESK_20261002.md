# In-person receipt desk — October 2, 2026

The user reprioritized receipts because they are selling in person today.
Online payment notification work is paused in priority, not discarded. It remains
in C:/gv_store_reconcile_414_20261001 with its last status checkpoint intact.

Current receipt branch: feature/vendor-receipts-20261002 in
C:/gv_vendor_receipts_20261002, based on verified origin/main
7e938b945dbb6f3f0af199005f5cf2570bc57f18. Main contained414 migrations. No migration,
production data write, payment activation or release was performed for this tool.

## Website qualification update

Reconciled main6363e12ee5401c48347107db641126c42ca2aa60 before release.
Actual cookie Auth, compiled Next, PostgREST and owner RLS passed on the isolated
414xx runtime lab (schema435 superset; this branch still has unchanged414 SQL).
Owner source-sale prefill passed; buyer and anonymous source access was denied.
Creating/reopening device receipts produced no HTTP mutation and left the source
sale unchanged. Desktop/mobile proof and cleanup receipt:
.local/receipt-release/web-proof-1790972360153/receipt.json.
The original auth-startup failure is retained; only task services were started.
Normal commit/push checks and production deployment are pending.

## Usable today

Open **Grookai-Receipt-Desk.html** from the Windows Desktop in Chrome. The built
artifact also lives in artifacts/receipts/. It has no external script or network
dependency. Keep using the same file location and browser profile. Do not use a
private/incognito window or clear browser storage while relying on saved records.

1. Enter the seller name and one or more items, quantities and actual prices.
2. Enter any discount and tax actually collected; select the payment method.
3. Optionally add the customer's name, phone/email, buying interests and notes,
   or select an existing customer. Walk-up sales need no customer data.
4. Confirm payment was received, then save the sale and receipt.
5. Print/save PDF, download HTML, share a text receipt or copy its text. Email/SMS
   actions open drafts in the user's own apps. The user reviews and sends them.
6. Back up records after the selling session. The JSON backup contains private
   customer data. Restore is permitted into an empty book only; it does not
   silently overwrite an existing book. Receipt totals are validated on restore.

Storage is device-local, with explicit backup/restore. It is not an authoritative
cloud transaction ledger, tax service or delivery provider. It does not update
inventory, collect payments, verify a terminal payment, send marketing, confirm
message delivery or claim Stripe has confirmed the sale. Notes and contact details
remain off the customer receipt (only customer name is included). Correct an email
or phone in the send panel before opening a draft; that alone does not rewrite
the saved customer record. Selecting a customer during the next sale updates the
customer record while existing receipt snapshots remain unchanged.

Use one receipt desk tab at a time. A stale tab detects changed stored data and
refuses to overwrite it, but localStorage is not a cross-device transactional
database. Reusing an imported backup on two devices creates separate books.
No automatic contact merging occurs. Existing source-sale IDs cannot be issued
twice within the same book. Keep backups and original receipt files for recovery.

## Website candidate

The same implementation is mounted at /account/store/receipts, behind existing
account authentication. A Store workspace entry and a Create customer receipt
link on completed Vault sales are added. Source-sale prefill reads only the
authenticated user's existing USD sale disposition. It never changes the source
sale, archives another copy, or grants manager access. Website records are scoped
by account in this browser; this does not make browser storage a server ACL.
This candidate has not been deployed and no working public URL is claimed.

The first full CRM release remains outstanding: server persistence and cloud sync,
customer editing/prospects independent of a sale, shared staff permissions,
receipt correction/refund history, public/private receipt delivery links, configured
email/SMS providers, delivery attempts/status and retry. The immediate tool is a
usable local receipt path, not completion of that broader scope.

## Proof and reproducibility

- node --test tests/contracts/vendor_receipt_book_v1.test.mjs:21 pass.
- node scripts/receipts/build_offline_receipt_desk.mjs builds the self-contained file.
- node scripts/receipts/prove_receipt_desk.mjs exercises actual Chromium file access,
  multiple items, exact cents, receipt download/print popup, device persistence,
  customer reuse, search, backup/restore, overwrite refusal, storage-write failure,
  and desktop/mobile layout without external requests. Only synthetic data is used.
- TypeScript and lint pass. Build proof uses synthetic local configuration and an
  explicit empty sitemap fixture; it is compilation proof, not database/Auth proof.
  The initial build without a sitemap service failed at prerendering; retain logs.
- Browser receipts/screenshots and logs: artifacts/receipts/ (ignored artifacts).
  The source, tests and builder are the reviewable files. No shared services were
  restarted or modified. No production-connected browser was used.

Next: finish website release qualification and build durable customer/receipt
storage plus real message delivery. Do not present draft launch as delivered SMS
or email. Do not ship the unrelated435-migration checkout candidate with this tool.
