# Pokemon fresh dependency absence V1

This separate read API qualifies the zero-reference invariant for an entirely
fresh ID scope. It creates no production apply authority and does not replace any
existing Classic or World executor/receipt version. Those callers continue using
the complete aggregate reader until a new explicitly bound integration is qualified.

Require an empty retained-ID list, explicit nonpending generated-ID state and
1–1024 unique lossless bigint or lowercase UUID IDs. Never substitute prospective
IDs for journal-reconciled generated IDs. The caller binds actual catalog FKs,
frozen source, independent generated-row reconciliation and transaction fences.
Retained dependencies always use the existing complete count and payload digest.

The parameterized query is exactly SELECT 1 WHERE column=ANY(all IDs) LIMIT 1,
without activity/finish/payload filters. Every call checks an unrestricted role,
statement timeout in (0,30000] milliseconds and lock timeout in (0,5000]. It then
reads fresh index metadata and a nonexecuting EXPLAIN. Only ordinary tables with
a live/ready/valid leading nonexpression B-tree qualify, either full or with the
exact same-column IS NOT NULL predicate. Require precisely Limit -> Index Scan
or Index Only Scan on that relation/index with an index condition, no filters or
subplans, one estimated output row and root total/startup and child startup cost
at most20000. Even small tables need this index path. Reject sort, bitmap, gather,
materialization, sequential access and all other shapes.

Child complete-stream cost/rows do not measure this query's requested output;
only this distinct streaming API permits larger child estimates. The general
aggregate size/cost/row limits are unchanged. LIMIT1 does not guarantee fast
absence: actual execution remains bounded by statement/lock timeouts. Any match
throws; no limited sample is ever hashed or reported as a retained digest.
Return the existing byte-identical EMPTY value only after actual zero-row readback.
An error, EXPLAIN, validated FK or missing parent is never absence evidence.

Absence applies only to the current transaction snapshot. The local concurrency
proof deliberately demonstrates that repeatable read does not observe a later
commit until a new snapshot. This API provides no mutation lock, source freeze,
post-commit readback or relationship repair by itself. Production execution needs
all governing source/catalog locks and independent reconciliation already required.

The new loopback-only proof preserves a250001-row fixture with50000NULLs and an
inactive duplicate. Whole102/92 signed bigint/UUID absence, first/last selected
inactive matches, actual invalid concurrent index, index-removal rollback,
restricted role, concurrent lock timeout, snapshot visibility and independent
full-row preservation must pass. Full Classic/World regression proofs protect
the unchanged aggregate path. A live observation, when qualified, uses two
independent verified-TLS READONLY transactions and fixed fresh UUIDs only;
it is not generated-ID, production writer, PostgreSQL17/Auth or release proof.
