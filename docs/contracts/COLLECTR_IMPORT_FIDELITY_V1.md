# Collectr import fidelity repair

Status: the review-fixed candidate passes local and physical iPhone qualification.
Build 336 is signed and verified; 335 is superseded. The fresh release inspection
package is being prepared. No production deployment or real import is claimed.
Catalog/grade/sealed coverage remains incomplete; retained review is not ownership.

The physical iPhone Collectr preview exposed source fields being discarded,
different copies collapsing into one parent, numberless rows disappearing, and
incomplete native catalog reads. This contract supplements
`NATIVE_IMPORT_RECOVERY_V1.md`; it does not replace the atomic save/retry boundary.

## Source and preview

- Retain every parsed source record, original field value and source record index.
  Aggregation may combine only identical metadata, and must retain the original
  records and their individual quantities. Unknown populated columns need review.
- Grade, variance/finish, portfolio, game, condition, purchase cost, date and notes
  must never silently merge into another row's values. CSV market snapshots are
  not acquisition cost or authority to change catalog prices.
- Numberless products, unknown games, invalid quantities/conditions/costs/dates
  and watchlist entries remain visible with reasons. A missing card number does
  not establish that an item is sealed. Watchlist entries are not owned inventory.
- Source rows already reconciled to existing ownership are counted explicitly.
  Ownership subtraction applies only to unambiguous, save-eligible groups.
- Read sets and candidate cards through an empty cursor page, even when the
  server returns fewer than the requested limit. A failed or nonadvancing page
  fails the preview instead of producing apparently complete partial results.
- Normalize both catalog and CSV collector numbers before comparison. Never
  prefilter stored numbers with normalized exact values. Keep game, language and
  physical identity distinctions. Explicit game-scoped set aliases are permitted;
  fuzzy set guesses and stripping artwork/treatment identity are not.
- The mobile preview shows Ready separately from a catalog parent match, retains
  review reasons, exposes original CSV details and renders an initial 50 entries
  with Show more. A parent match alone does not prove finish/grade compatibility.

## Current save boundary

The deployed V1 writer only accepts one metadata group per canonical parent.
It cannot preserve child printing, grade or portfolio membership. The candidate
therefore withholds those source rows from that writer, even if their parent
matches. Conflicting per-copy metadata is also withheld. The service rechecks
unsupported details before dispatch; the UI is not the sole protection.

This prevents destructive simplification; it is **not** completed support for
importing a full Collectr export. Do not ship or describe this checkpoint as a
faithful full-collection import. Do not work around the limitation with per-copy
writes, raw downgrades, fabricated certificates or notes masquerading as typed
finish/grade/portfolio data.

## Source-aware V2 save boundary

`vault-import-collection-v2` parses the original CSV and derives quantity,
condition, acquisition cost, date and notes on the server. It verifies the selected
canonical parent and governed visible child printing. Normal, holo, reverse and
foil are distinct; ambiguous finishes and edition labels remain held. Unused zero
Price Override is source evidence; nonzero overrides need review.

Private documents retain every original field. Authenticated owners can read
their source and group mappings but cannot write them or invoke the privileged
writer. Receipts bind owner, UUID, original file hash and normalized payload.
Same-file groups reconcile exact compatible copies and retain their IDs, including
after archive/sale. Late failure rolls back the entire document/group/copy save
and retains only a sanitized failure receipt. Older V1 endpoints stay unchanged.

Native uncertain retries keep the same UUID; confirmed failures permit a new
attempt. Independent authenticated reads verify source fields, mappings and exact
copy identities. Missing V2 support must never fall back to V1. Saved imports
exposes original rows and review status; source portfolios do not silently become
binders. Unsupported rows can be retained without creating owned inventory, raw
downgrades, verified certificates or pricing inputs. Retry matching with the
unchanged original CSV.

Blank finishes are saveable only when exactly one active governed child printing
can be selected. Zero or multiple options stay in review; neither Edge nor SQL may
create a parent-only instance to bypass this requirement. Owner copy readback uses
`get_collection_import_copies_v2`, scoped to auth.uid(), original source hash and
at most100 mapped IDs. Archived copies remain verifiable without granting general
archived-inventory access or exposing another owner's copies.

The complete serialized request and expanded PostgreSQL source/target payload are
budgeted before the preview becomes saveable and again before saving. The2MiB
limit includes repeated headers, JSON separators, escaping, UTF-8 and targets;
5000 rows is a separate ceiling, not a guarantee that an export fits. Source dates
retain explicit date-only precision; timestamp sources reconcile exact instants,
including timezone and up to six fractional digits. Higher precision remains
review-only. Never collapse a timestamp to its calendar date during matching.

## Qualification and remaining implementation

1. The baseline is now qualified with the separately scoped read-only
   `AuditLinkedSchema -CollectrImportFidelityBaselineAudit` gate. All409 migration
   hashes/ledgers match; the pinned inspection engine found only the three already
   documented column-order differences and no remaining schema/security delta.
   Preserve the ordinary raw-diff failure. This is not replay or apply authority
   for the pending extension; follow the migration contract for those stages.
2. The V2 path, complete410 replay, retained-data409-to410 upgrade, real local
   Auth/HTTP/RLS/concurrent-retry proof and native service/widget checks are
   implemented. Export-sized SQL save/replay/fresh-attempt coverage runs only in
   the qualified upgrade lab and rolls back every synthetic write. It verifies
   source retention, distinct exact-copy mappings and metadata without consuming
   a phone fixture. It does not establish hosted HTTP latency or device behavior.
   Preserve the source hashes and private receipts.
3. Governed child matching and acquisition readback are implemented. Additional
   art/edition resolution still requires catalog evidence; do not strip
   decorations or infer physical identity to increase match counts.
4. Preserve grades as explicitly unverified owner assertions or request real
   certificate identity through the existing slab flow. Audit downstream readers
   and pricing first: a card carrying grade fields without a slab certificate must
   not be misrepresented as raw or as a verified certificate.
5. Preserve source portfolios without silently creating public content. Resolve
   numberless/sealed identities against released catalog variants; unsupported
   source rows need durable review/recovery, not omission.
6. Qualify real atomic saves in an isolated current-baseline sandbox, including
   authentication denial, concurrent/repeated attempts, response loss, metadata
   conflicts, partial review, and cross-client exact-copy readback. Then perform
   the physical iPhone Files/preview/save flow in a contained test account.
7. Complete the normal release gates, deliver the iPhone build, and only then
   resume the authorized real collection import. No real import has occurred.

Private exports, catalog snapshots, screenshots and replay receipts stay outside
source. Checked-in tests use synthetic fixtures; private replay is explicitly
opt-in and performs no network calls or database writes.
