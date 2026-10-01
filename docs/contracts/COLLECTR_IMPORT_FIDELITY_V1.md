# Collectr import fidelity repair

Status: PR560, backend V2/version4 and internal TestFlight339 are released.
Production has411 migrations. The unchanged original-export physical preview
passed on339 without saving. The finish-resolution follow-up below is local
work, not a released build. No real collection save occurred. Private
terminal release/preview evidence supersedes historical preparation notes.
Catalog/grade/sealed coverage remains incomplete; retained review is not ownership.

## Finish-aware parent resolution

Source-aware native preview reads all governed printing pages for every matching
parent before classifying ambiguity. An explicit supported finish can exclude a
candidate only when that candidate has active printing evidence and none matches
the requested finish. A candidate with no active printing evidence stays in the
comparison. Blank or unsupported finishes cannot narrow parent identity; no
default, unstamped, rarity or artwork preference is allowed.

One remaining parent still requires exactly one active child for the requested
finish and every existing grade, edition and source-metadata check. Multiple
matching parents or children remain held. If no candidate supports the finish,
all candidates remain available for review. Failed, repeated or unrelated
printing pages fail the preview. Legacy V1 stays unchanged. The existing V2
server independently validates the selected parent, child and original source;
this native ordering fix changes no server, schema or catalog truth.

The private full-export replay must preserve every previously ready parent,
printing and quantity and all source fields. Local qualification does not establish
physical-device behavior, distribution or a real collection save.

## Pokemon name-format follow-up

Source-aware V2 preview and Edge additionally recognize the separator before a
terminal EX/GX and one repeated collector-number suffix, such as `Synthetic EX`
versus `Synthetic-EX` or `Synthetic (007)` at number7. This fallback requires the
Pokemon game and `pokemon_eng_standard` identity domain; the source and catalog
number must agree. A prefixed number must keep its prefix. It never strips art,
stamp, edition, language, cheek, rarity or finish labels. Multiple matching
candidates remain ambiguous, including an exact-name candidate competing with a
formatting-equivalent candidate. Legacy V1 matching is unchanged.

Both runtimes share `test/fixtures/collectr_pokemon_name_v1.json`. Game, set,
governed child finish, grade, source metadata and atomic save checks still apply
independently. Original names and numbers are retained byte-for-value as parsed.
Local qualification is not deployment or permission to call a partial import
complete; all retained unsupported rows remain visible.

## Explicit set-label follow-up

Native preview and Edge recognize the same finite Pokemon set-label aliases in
`test/fixtures/collectr_set_aliases_v1.json`. Aliases only reconcile the set name:
parent name, collector number, game, governed child finish and supported source
metadata must still match independently. Original set labels remain in retained
source. No fuzzy matching, generic prefix removal, language substitution, edition
stripping, arbitrary candidate selection or new catalog records are introduced.
Duplicate catalog sets remain candidates; multiple matching parents stay in review.

The opt-in private replay preserves all previously ready parent/child selections.
The isolated full410 HTTP fixture also saves every alias, independently reads back
source labels and exact children, and retries without creating duplicate copies.
Grade rejection remains enforced. This qualifies local behavior; it does not prove
a deployed backend, a new native build or import of the founder's collection.

## Governed MTG name matching follow-up

Source-aware V2 may resolve an English MTG decorated name only against exactly
one active `MTG_ENG_PAPER_PRINT_IDENTITY_V1` record bound to the parent, Scryfall
print ID, set code, collector number, language and full catalog name. Extended Art
requires `frame_effects: extendedart`, Showcase requires `showcase`, and Borderless
requires `border_color: borderless`. A numeric name suffix must equal the source
and catalog collector number. Transform/modal DFC front-face names require the
governed full two-face name and layout. Back-face-only and other layout guesses,
unknown or duplicate suffixes, special foil labels and conflicting evidence stay
held. No source field is rewritten and no catalog/printing is created.

Both native preview and Edge validate the same synthetic fixture corpus. Candidate
parents remain game/set/number scoped; multiple proven candidates stay ambiguous.
The identity read uses ascending empty-page cursor completion and fails the whole
operation on failed, repeated or unrelated pages. Finish/grade/source-size rules
remain independent requirements. Legacy V1 does not use the fallback.

Private replay, sandbox Auth/HTTP/save/retry/readback, the real iPhone Files
preview/save/interruption/reopen flow and distribution release qualified this MTG
repair in build337. Its consumed release package does not qualify later changes;
include `mtg_identity.ts` in fresh source/deployment verification for each release.

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
