# Catalog Numeric Pagination V1

September 13, 2026. Follow-up to the completed catalog presentation release.

The standard set route currently pages the text column number_plain. As a
result, card 100 can precede card 11. Sorting only the returned page cannot fix
the global ordering. Canonical card numbers and all identity fields stay unchanged.

## Read Contract

Resolve visible set references with the existing game scope and caller identity.
Read only id, number and number_plain for those exact set IDs using UUID keyset
pages of at most 1,000 rows. Exact remaining counts distinguish server row caps
from completion. Stop on errors, duplicate/unordered UUIDs, count drift,
incomplete results or more than 50,000 rows in a single set index.

Natural printed-number order precedes pagination. Preserve prefixes, suffixes,
leading-zero identities, and variant siblings. Ignore the printed denominator
for position; null/blank numbers sort last. Equal numbers use the canonical UUID
as a deterministic tie breaker. Numeric comparison never converts to floating
point, so long numeric tokens remain exact.

Fetch full metadata only for the requested window, in batches of at most 100
UUIDs to stay below URL limits, retaining exact set and visibility filters.
Require every selected identity exactly once, then restore index order. Printing,
pricing and ownership enrichment remain unchanged. Existing Base Set special
print-run merging stays on its separate established path.

Caching remains React request-scoped. Never place caller-dependent visibility in
a global cache. No service-role client, database migration/write, image update,
finish inference or production access-policy change is part of this repair.

## Proof

Test cross-page ordering, all 113 M6 positions, duplicate-number variants,
TG/OP prefixes, MTG suffixes, leading zeroes, denominators, nulls, numeric tokens
beyond JS safe integers, lower server row caps, count drift and missing detail
rows. Replay read-only live set indices through the same implementation and
verify selected IDs are conserved. Typecheck, lint and relevant contracts must
pass. Runtime smoke remains required before a later deployment is reported live.

## Bounded Read Latency Follow-up

Once the exact ordered page IDs are selected, metadata and printing reads may
overlap. This changes dependency scheduling, not authority or data selection.
Keep metadata chunks sequential at 100 IDs, page size at most 500, and the
existing printing reader's 250-ID/1,000-row limits. At most two transport reads
are active within the page read operation. Both branches settle before any
error is surfaced; never return a partial page. Metadata identity/order
reconciliation remains mandatory. Empty/duplicate/oversized selections cannot
launch unnecessary reads. Do not add cross-request caller caches or write data.
