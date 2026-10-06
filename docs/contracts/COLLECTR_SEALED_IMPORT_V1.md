# Collectr sealed import

Status: identity planner, atomic V3 backend and website integration are implemented
and locally tested. Web V3 is off by default behind server
`GV_COLLECTR_SEALED_IMPORT_V3=1`; native clients remain V2. V3 is not deployed and
no further real collection import has occurred. Existing card import behavior
and the completed Surge Foil release remain unchanged.

## Website and recovery

The cookie-authenticated route retains its same-origin check and owner-write
boundary. It accepts existing V2 attempts unchanged and validates V3 through the
shared handler, then verifies card and sealed mappings independently. Completed
V3 receipts recover before current-catalog checks even if new additions are off.
Original group/source evidence stays immutable; subsequent owner edits to card
notes/condition do not make recovery recreate copies or fail solely on old metadata.
The V2 readback's original metadata verification remains the default for V2 callers.

Preview uses the authenticated complete sealed catalog and a server-read broad
ownership flag. It never treats canary capability as permission to bulk import.
Unlabeled purchase costs, including zero, stay held until the owner chooses a
currency. Source-recorded currency conflicts stay in review. Original source
details and every unresolved row remain downloadable regardless of UI filtering.

The UI freezes CSV, card/sealed selections, currency and request UUID in a distinct
owner-bound V3 session-storage key. It recovers V1/V2 keys without rewriting their
attempts, prevents replacement of an uncertain request, and clears storage only
after server verification. Results separate cards added, sealed copies added,
already-accounted copies and review rows. Browser network loss/reload and legacy
V2 recovery are exercised against the real local website.

## Implemented save boundary

`handler_v3.ts` authenticates the owner, bounds the original CSV, rejects overlapping
source selections, and derives card/sealed targets on the server. It reads the
owner's durable request receipt before consulting the current catalog, so a lost
successful response can recover even after a release or rollout change. The
existing V2 handler behavior is unchanged; only its validation helpers are exported.

Trailing decimal zeroes such as `45.0000` are formatting and may normalize to the
same exact cent amount. Any nonzero sub-cent digit still requires review; no
rounding is allowed. The original cost string remains in the saved source.

`sealed_metadata.ts` preserves purchase cost, explicit currency, timestamp precision
and notes. Zero is a real cost and needs currency. A dollar symbol is not evidence
of USD. A conflicting currency, fractional cents, conflicting aliases or unknown
meaningful columns remain review cases. The original portfolio and condition stay
in the private source document; neither creates a binder or establishes a seal.

Candidate migration `20261005080000_collectr_sealed_import_v3.sql` adds an owner-
locked mixed transaction and private receipt book. V2 card saves run inside its
rollback boundary; a late sealed failure removes all writes from that attempt,
including the inner V2 receipt. Sealed groups share the existing document/group
mapping tables without modifying previously saved groups. Exact compatible copies
are reused once per source; new copies and their lifetime-add journal are atomic.

The writer rechecks active frozen membership, exact mapping, variant dimensions,
both game visibility controls and broad sealed-ownership enablement. It holds the
relevant control/release locks through commit. Canary-only additions are deliberately
unsupported, so this path cannot bypass an account canary budget. Already mapped
groups remain recoverable when rollout is disabled or their copies are archived.

Authenticated RPCs expose a complete released catalog snapshot, an owner-bound
request receipt, and only sealed copies mapped to that owner's source. The writer
is service-only. `sealed_readback.ts` verifies the unchanged document, immutable
group metadata and exact copy identities, including archived copies; combine it
with existing card readback at integration. Later owner edits do not erase the
original source evidence or make an old receipt create replacement inventory.

Local evidence includes 555 focused contracts, 16 staging-boundary contracts,
strict TypeScript, targeted ESLint, 22 real SQL checks and nine real web/HTTP/browser
scenarios. The checkpoint identifies exact replay/upgrade hashes. Concurrent
requests, independent readback and prior-copy preservation are verified locally.
Current-main reconciliation, full release/build/schema gates and production
deployment remain; this candidate is not yet release-qualified.

## Implemented identity boundary

`sealed_identity.ts` examines original source rows against a complete catalog
snapshot. The CLI verifies that the prior preview covers the unchanged CSV
exactly, then examines only its unresolved indices. It never adds inventory.

- Missing card numbers alone do not establish sealed identity. Numbered rows
  remain on the card path. Unknown games, grades, watchlist rows, unsupported
  finishes and invalid quantities are held separately.
- Match a complete canonical or reviewed source name within the same game.
  Preserve package size, case/display distinctions, retailer exclusives and art
  labels. Only case, whitespace and NFC normalization are permitted for names.
- Require a frozen active release, exact member/mapping/variant binding and a
  confirmed sealed review. Full release member counts and unique variant IDs
  must agree; incomplete snapshots fail the entire plan.
- Require agreement with the recorded source group. Explicit provider group
  aliases are game scoped. No general prefix removal, fuzzy set match, or
  removal of edition/language qualifiers is allowed.
- An unmarked source name uses the English lane; explicit recognized language
  labels must agree with catalog language. Labels stay in the name comparison.
  Conflicting language labels, unresolved region/edition/wave and multiple
  identities remain held. No default variant preference is permitted.
- Every result retains its original record and index. Source quantity is not a
  new-copy count. All results expose `saveEligible: false`; no card-writer
  selection is produced.

This is catalog identity evidence, not proof of permissions, package condition,
ownership, acquisition currency or a completed import. It must not be connected
directly to the existing per-product Add button/RPC.

## Save requirements and remaining qualification

Extend the existing source-aware transaction through a fresh additive migration,
after the current linked schema audit. Preserve all V2 documents, group keys,
card mappings, receipts and copy IDs. Do not alter an already-applied migration.

1. Add explicit sealed targets with source indices and exact variant identity.
   Parse metadata on the server from original fields. Recheck current release,
   mapping, variant dimensions, game visibility and owner addition permissions.
   The offline snapshot does not grant production-write authority.
2. Keep card condition text as source evidence. `Near Mint` does not establish
   an undamaged package or a factory seal; initially use typed `unknown` states
   unless explicit supported source evidence or owner confirmation exists.
   Preserve cost, currency, date precision, notes and portfolio separately;
   do not treat CSV market values as paid cost or current pricing.
3. Save source/group mappings and exact copies atomically under the owner lock.
   Preserve a group’s immutable target and map its indices only once. Successful
   historical mappings remain recoverable after archive, sale, or rollout changes.
4. Reconcile only compatible existing sealed copies with the exact same variant
   and metadata, excluding copies already assigned within this source. A new UUID
   for the same unchanged file must not create duplicates. Never subtract a copy
   solely because its display name matches.
5. Preserve request UUID and payload across interruption. Changed payloads reject;
   late failures roll back all new copies and mappings and record sanitized
   failure receipts. Owner-visible readback includes mapped archived copies
   without granting general archived-inventory access.
6. Show separate card/sealed counts, original details, unresolved rows and the
   actual added/reused outcome. Keep the unchanged original CSV as the recovery
   input. Do not convert portfolios to public binders or infer certificates.

Qualification requires synthetic mixed card/sealed saves, existing-copy reuse,
multiple source metadata groups, same/fresh-request retry, concurrent requests,
lost response, stale release/mapping, denied owner/game/variant access, late
rollback and readback. Prove all previously saved card copies unchanged. Use
isolated current-baseline labs; no resets of retained populated labs. Production
release and original-file save need their own direct readbacks.

Private CSV, catalog captures and plans remain outside the repository. Tests
use synthetic records. No new catalog product, permission grant, pricing record,
production migration or inventory write belongs to the identity planner.
