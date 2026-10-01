# Reviewed GameStop mapping V1

This manual warehouse lane links an existing English GameStop parent to one exact
TCGplayer product. It does not extend the base-only pricing mapper or discover new
cards. Source evidence and the reviewed Master manifest must identify the exact
stamp and existing finish independently of price buckets.

The immutable bundle binds the existing parent and child rows, printing review
history, exact source product, preserved discovery/raw-import lineage, existing
mappings, dependency schema and row digests. A projection-bound Master review
includes the exact product assertion. A source mismatch, stale snapshot, adverse
printing review, other product owner or changed dependency blocks execution.

One proven unstamped-product association on the stamped parent may be explicitly
invalidated by that same review. Its row, ID, source identity, timestamps and
original metadata are retained; only active=false and an appended invalidation
receipt change. Referenced mapping IDs require separate adjudication under
`REVIEWED_MAPPING_PRICE_QUARANTINE_V1.md`, including installed pricing-read guards,
immutable dependency preservation and verified price withdrawal. This is not
an alias cleanup or permission to reassign a mapping to another card.

The caller supplies current execution authorization and a separate approved manual
warehouse review candidate. The original external discovery and raw import remain
unchanged. Execution requires SERIALIZABLE isolation, locked target/source reads,
the shared canon executor, compare-and-swap invalidation, exact post-write readback
and dependency preservation. The candidate is archived with an execution event.
Repeating the successful operation verifies the outcome without further writes.

The controller must freeze the source commit and checked-in manifest, verify the
canonical project/TLS and database sanity, preserve a receipt before COMMIT, and
never automatically retry an unknown COMMIT outcome. Independent committed
readback and public search verification remain mandatory. This lane makes no
parent, child, image, ownership or pricing writes and performs no schema apply.
