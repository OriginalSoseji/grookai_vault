# Account receipt books V1

This extends the live device receipt desk from PR580. It is a manual in-person
receipt book, not an online order, payment-confirmation service or inventory writer.

- One private book per authenticated account. No caller-supplied owner ID.
- `vendor_receipt_books` holds the versioned book, revision and last operation ID.
  Receipt/customer UUIDs from the device format are retained for future migration.
- No base-table grants to clients. Only authenticated governed RPC reads/saves.
  RLS remains enabled; security-definer functions use an empty search path.
- The database control defaults OFF. Web availability also requires the explicit
  server flag `GROOKAI_RECEIPT_CLOUD_ENABLED=true`; client flags grant nothing.
- A book is bounded to 10 MB, 10,000 receipts and 10,000 customers. This first
  version loads a bounded book as a whole; it is not an unbounded CRM search API.
- A row lock and expected revision make each save atomic. A stale revision uses
  application SQLSTATE `PT409`, never PostgreSQL retryable `40001`. PostgREST may
  retry the latter indefinitely. The same operation ID and payload return the
  prior result; a different payload cannot reuse that ID.
- Existing receipt snapshots and their customer links cannot be edited/deleted.
  Customer identity records remain; their current contact and buying notes may
  change. Corrections/refunds need a later explicit history design.
- USD totals use integer cents and are rechecked at the API and database.
  New source-sale references must belong to the caller and refer to a USD sale.
  They do not confer Stripe verification or mutate the source sale.
- Saves acknowledge success only after the server returns the expected revision
  and book. Timeouts/conflicts retain the visible draft; retries never silently
  adopt another device's revision. Controls are disabled during an active save.
- Device books remain untouched. Importing a backup is an explicit action into
  an empty account book, preserving the original file/device copy. No silent
  contact merging, overwrites, background upload or deletion.
- All HTTP reads/writes are private/no-store. Cookie writes enforce same-origin
  JSON requests and bounded streaming input. Backend errors do not disclose data.
- Email/SMS remain user-sent drafts. No messages, marketing subscription or
  external contact sharing is authorized merely by saving a customer.
- No staff sharing in this version. Future staff access must be explicitly
  delegated; a manager's token must not impersonate the owner.

Rollback disables the database control and web flag with data retained. Account
deletion retains the existing ownership convention: its private book cascades
with the account. This is not a regulated payment or tax ledger.

Release requires exact-source full replay/no-op push, retained-data upgrade,
real Auth/Next/HTTP/cross-device tests, current production schema/security parity,
normal repository hooks, hosted checks and the governed migration apply path.
Supplementary SQL proof and local passing tests are not production qualification.
