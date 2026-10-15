# Private vendor events V1

This extends the existing Reports and immutable receipt history. It is an
implementation contract, not a declaration of release or production activation.
The fresh canonical live429/source433 baseline passes before this work begins.

An event belongs to its authenticated owner and has a name, inclusive local start
and end dates, an IANA time zone, USD currency, notes and open/closed state.
PostgreSQL validates the actual time-zone name and determines receipt local dates
with `createdAt AT TIME ZONE event.timeZone`. It supplies candidate identities and
their local dates. Clients validate request syntax but do not invent a fixed
offset or filter by approximated UTC midnight boundaries: some zones repeat or
skip midnight. Dates suggest candidates; only explicit association determines
saved membership. Test both ordinary DST changes and a repeated/skipped midnight.

Use existing owner receipt UUIDs, including legacy cloud-only records. Do not
require a modern cart row or cost snapshot to associate an old receipt. One
legacy uppercase UUID is matched by UUID value without rewriting its receipt.
Multiple book entries resolving to that same UUID require review and must not
silently become additional event sales. One
receipt has at most one event. A batch lists each receipt's previous event and
the intended destination, including null for unassignment. Validate every member
and both old/new event states before any change. Preserve the original receipt,
customer links, cost snapshots, inventory and transaction authority. Event edits
and changed dates never silently reassign receipts. Closed events require an
explicit reopen before metadata, expense or membership changes.

New authority uses normalized owner-private state and append-only request/change
records. A single owner revision serializes changes. Client tables have no direct
read/write grants; authenticated security-definer RPCs use an empty search path
and auth.uid(), never a caller-selected owner. Foreign and unknown identities
receive the same non-disclosing refusal. Preserve the existing receipt-cloud
access boundary when reading book contents. New event entry defaults off.

Request V1 is exactly `{version, requestId, expectedRevision, operation}`.
The mutation RPC accepts this whole object as `p_request jsonb`, retaining JSON
types for validation rather than coercing a numeric revision to a text argument.
UUIDs are canonical lowercase, and revisions are canonical decimal strings from
0 through 9223372036854775807. Persist the complete owner-bound request before
dispatch. Never replace its payload or revision after an uncertain result.
Identical retries return the stored acknowledgement even after entry is disabled;
changed retries refuse. Unrecorded stale revisions refuse with PT409. Uncertain
transport and local acknowledgement failures retain the exact pending request.
Owner change hides data and invalidates late responses. Reads never create rows.
The UI rollout flag also defaults off. A retained local pending request exposes
recovery even after that flag is disabled; new edits remain disabled. Report
state read failure must not hide a successfully loaded local pending request.

History readers retain exact canonical outer revision strings and validate owner,
event, cursor and descending order. The display projection omits raw before/after
database rows whose internal JSON revisions may arrive as imprecise Numbers;
the server's original append-only audit evidence remains unchanged. Report loaders
require matching event/book revisions, validate every private cost batch, and
stop obsolete batches after selection/account changes. Failed cost reads cannot
be treated as successfully read, missing historical cost.

Operations:

- `event_create` / `event_update`: eventId, name, startDate, endDate, timeZone,
  currency (USD), notes. Create makes an open event; update preserves status.
- `event_close` / `event_reopen`: eventId and a nonempty reason.
- `expense_create`: eventId, expenseId, category, description, amountMinor,
  currency (USD), incurredOn.
- `expense_update`: the same fields plus a nonempty reason. It cannot move an
  expense between events or resurrect a voided expense.
- `expense_void`: eventId, expenseId and a nonempty reason. Retain the original
  expense and change history; never delete it.
- `receipts_assign`: eventId (nullable), receipts containing receiptId and
  previousEventId (nullable), strictly sorted by canonical receipt UUID, 1–100
  distinct entries. No-op assignments refuse rather than consume a new revision.

Every successful mutation advances one revision and returns exactly
`{version, ownerId, requestId, previousRevision, revision, operation}`. The
operation matches the immutable submitted operation. Acknowledgement confirms
that mutation at that revision; clients refresh current state afterward, since
another device may have changed it later. Keep stored acknowledgements bounded;
do not duplicate the full receipt book in each request record.

Amounts are canonical nonnegative decimal-string cents, at most 999999999999.
Known zero is valid. Categories are booth, travel, lodging, meals, supplies, fees
and other; these are organizational labels, not tax classifications. Text limits
count Unicode code points consistently across web, native and PostgreSQL. Names
and descriptions are single-line; notes allow newline/tab. Request size is bounded
to 64 KiB of UTF-8 JSON. Unknown fields and unsupported versions refuse.

Reports validate and deduplicate immutable receipts before filtering/aggregation.
Contradictory duplicates make the report unavailable. Aggregate money uses exact
integer arithmetic and decimal strings. Reuse the qualified cost-at-sale report;
current inventory costs do not repair missing historical evidence. Inventory
purchases and incoming trade credits are separate from operating expenses.
Tax, recorded tender, cash change, money received and payouts are separate from
item sales. Expenses do not imply an additional payment-provider transaction.

A USD100 sale with USD60 known cost and USD10 operating expenses produces USD40
known-cost gross profit and a USD30 known-cost event subtotal. Another USD50 sale
with missing cost increases uncovered sales to USD50, without increasing that
USD30 subtotal. Display partial coverage and exclusions beside the subtotal;
never call it complete net profit. With no qualified sales, preserve unavailable
profit rather than substituting zero. Refunds, online orders and processor
settlements remain explicitly outside the current report. CSV must match the
visible event/filter scope and protect spreadsheet formula cells.

Recorded per-line discounts and later owner-attested historical corrections are
subsequent required R2 work. Existing discounted snapshots without allocation
remain uncovered. Original receipt/cost snapshots remain immutable forever;
later correction must be separately attributable and visible.

Qualification requires shared web/native/server vectors, actual owner isolation,
concurrent retry/stale revision/last-item rollback, closure/reopen and expense
audit, legacy and modern receipt compatibility, DST boundaries, overflow-safe
reports, interrupted/restarted saves, account changes, actual web/Samsung UI and
unchanged prior rows. Fresh full replay, retained upgrade, independent shadow,
ordinary hooks and exact-package release gates remain required. Do not reset
populated labs or infer production permission from local results.
