# Reviewed mapping price quarantine V1

Duraludon's stamped parent was linked to unstamped TCGplayer product214239.
Its current price and historical snapshots therefore do not establish a price
for the GameStop card. Correct product247362 has separate physical evidence.

Migration20261001190000 adds an exclusion to the current-price view, history view,
and both parent/printing paths of the shared pricing RPC. It recognizes the exact
reviewed_invalidation reason PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT on the
snapshot's original mapping. It does not depend on active=false: reactivating a
rejected mapping must not restore its discredited prices. Ordinary inactive
mappings, unrelated metadata, permissions and publication pointers are unchanged.
Original candidates, assignments, decisions and snapshots remain immutable.

The existing manual GameStop mapper still denies referenced mapping invalidation
unless the Master review explicitly binds a separate pricing adjudication artifact.
That artifact names one rejected mapping, its exact dependency digest and retained
references, the installed migration and exact reader-definition hashes, the frozen
publication pointer, and the expected unavailable current/history price outcome.
Only references from the three pricing candidate/decision/snapshot ledgers are
admitted. Any other mapping dependency requires another review. The
guard also requires mapping-ID reference digests to equal the exact parent/child
digests, rejecting mixed historical ownership before a mapping-wide exclusion.
The serializable executor holds the publication advisory lock, checks those guards before mutation,
then verifies withdrawal and complete dependency preservation before commit.
It never transfers a mapping ID, rewrites pricing history, or activates a price.

Qualification requires full isolated413 replay/no-op push, retained412-to413
upgrade, real authenticated local HTTP for current/history/ranked pricing, and
actual mapping insert/invalidation rollback, commit/readback and zero-write repeat.
Synthetic fixture failures and consumed intents remain preserved. The local shadow
worker runs from a clean unchanged main checkout; local publication fixture setup
is reader qualification, not production publication authority.

Use strict migration preflight ReviewedMappingPriceQuarantineV1 with sole pending
20261001190000. AuditLinkedSchema compares production412 to the qualified412
baseline. PrePush additionally binds clean source containing main, normal hook
proof, qualified labs and runtime/executor source hashes. The exact-pending
Supabase CLI inspection package is prepared and dry-run separately. It has no
apply operation. Production schema application and the later reviewed mapping
transaction each require fresh one-use receipts and independent readback.
