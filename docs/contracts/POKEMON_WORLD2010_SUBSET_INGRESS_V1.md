# Pokemon World2010 bounded anthology subset ingress V1

This is a new automated qualification policy and local SQL executor. It cannot
apply to production. It does not change whole-group V1 or the hourly worker.
The original four deck checklists are replayed with the existing relationship
review policy; no old printing approval supplies new identity or finish authority.

The complete TCGCSV category3/group2282 inventory has 2,001 products. The four
2010 decks select109:83 new raw/discovery candidates, nine retained lineages,
and17 explicit held identities. All1,892 outside source products are fenced,
along with the whole group's77 original discovery/raw lineages (68 outside the
selected subset). Changed inventory requires a new policy/reconciliation rather
than silently dropping rows or relabeling a partial group complete.

The offline staging CLI accepts exactly `--relationship-dir`, `--ingress-dir`,
and a new `--out-dir`. Each observation must have two independent verified-TLS
read-only connections, sanity counts and an exact snapshot hash. The checked-in
original bytes are hash-verified by source replay. Every selected source,
coverage status, parent UUID/GV-ID, existing child/review and raw receipt is bound.
Generated comparison hints retain their review-only meaning. TCGCSV remains
TCGCSV; no identity, mapping, finish, source-product or promotion writer exists.

`applyWorld2010SubsetLocal` requires a SERIALIZABLE read/write transaction,
a server-reported loopback address and a new `grookai_world2010_subset_*` database.
It takes the existing hourly/group locks and its own subset lock, then a bounded
source-table SHARE fence to exclude source phantoms. All2,001 source rows and77
retained raw/discovery rows are compared; retained rows are locked through commit.
New numeric, category-qualified and group-qualified mappings (including inactive
ones), direct parent references, promotions, sealed links and candidate IDs stop
the batch. Orphan or contradictory raw receipts require reconciliation.

Exactly83 raw and83 AMBIGUOUS/PRINTED_IDENTITY_REVIEW discovery rows are inserted
in one transaction, with a single succeeded ingestion_jobs receipt. The receipt
binds exact generated decimal-string raw IDs and candidate UUIDs. New candidates
retain null canonical set/parent/finish pointers. A repeat only validates the
existing complete journal and rows; it inserts nothing. Missing or partial
journals, changed payloads and replacement IDs fail closed. An immutable pending
receipt must be independently compared with the committed ledger ID and all83
generated identities after a lost response; no blind retry follows an unknown
outcome. The executor never commits on behalf of its caller.

The isolated proof uses captured source/raw/discovery/job columns and constraints.
Relationship collision tables are synthetic: this is not full schema, canonical,
Auth or application replay. It proves167 inserts in three tables, zero updates
or deletes, whole-group preservation, rollback at both insert boundaries,
competing locks, source phantoms, independent lost-response recovery, exact repeat
and mutated journal/candidate rejection. Failed fixtures are retained in new labs.

No production CLI or release is introduced. The next92 existing-parent identity/
TCGCSV mapping executor needs active Master/source replay, fresh global collisions,
real dependencies, an atomic journal, normal committed producer, new qualified
package and independent production/public readback. All17 held cases and Classic
remain unresolved. Historical World/ME05 executors are never reusable authority.
