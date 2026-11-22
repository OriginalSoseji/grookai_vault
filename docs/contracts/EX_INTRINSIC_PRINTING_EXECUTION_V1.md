# EX Intrinsic Printing Execution V1

Status: bounded implementation under qualification; production mutation not authorized by this file.

This lane adds only the six explicitly reviewed Normal/Reverse finishes for
Metang δ 49 (ex11), Exeggutor δ 41 (ex13), and Seadra δ 28 (ex15). Their exact
parent UUIDs and reviewed manifest fingerprints are fixed in the executor.
The separate prerelease parents and every existing printing remain unchanged.
The preserved retail scans/PDFs stay private; every mode requires their original
bytes and verifies the reviewed source bindings. A generic stamp, price subtype,
provider boolean, or another card's image never authorizes a finish.

The transaction admits one raw evidence row, six children, and six visible,
verified reviews. It performs no updates, deletes, parent/identity/mapping/image,
owner, or pricing writes. All 329 parents and 620 retained children in the three
sets are preserved. The stored child count becomes 626. Actual public options
are captured independently: hidden/provisional rows are never counted as
visible merely because they are stored. Only six options may be added.

Preparation captures the complete source schema, migration ledger, public RPC,
retained rows/reviews/mappings/identities, all incoming UUID FK definitions and
scoped full-row digests, and an inventory of every stored JSON column in the four
application schemas. Owner JSON references receive supplementary scoped digests
using disjoint primary-key batches and globally sorted matched full-row hashes.
All other JSON records are preserved by a separately pinned insert-effect proof:
the exact three write-table definitions have no INSERT triggers, rewrite rules,
generated expressions, custom/default writer calls, or cascading write path.
Every UUID and negative raw bigint is explicit. This proof fails if any reviewed
write-table definition changes. No existing row can be updated through these
three INSERT statements. Global historical supplier-JSON scans are not claimed;
the earlier broad scan timed out and remains failed evidence. Virtual views
are covered by schema definitions and actual public-option assertions.
This is an additive repair: existing assigned and unassigned owner references
stay attached to their original UUIDs, and unassigned copies remain unassigned.
Client default choices for a new entry do not authorize rewriting old copies.

Use serializable transactions, bounded statement/lock timeouts, ordered per-set
advisory locks, retained-row locks, global candidate UUID/GV-ID/review/raw collision
checks, and precommit revalidation. All retained references must match the frozen
plan across executions. Legitimate concurrent activity can require a new review;
never silently refresh a frozen baseline to clear a mismatch. Partial batches
fail closed. An already exact batch makes zero writes, including zero raw rows.
The raw evidence uses a deterministic negative bigint, avoiding sequence changes
during rollback. Uncertain COMMIT or rollback outcomes require independent
readback; never retry blindly or delete attached rows automatically.

The production boundary inherits the exact approval requirements in
[MASTER_PRINTING_EXECUTION_V1](MASTER_PRINTING_EXECUTION_V1.md): an original,
explicit founder approval binding plan and complete producer fingerprints,
counts, zero-write boundaries, modes, and an expiry within 24 hours. General
program instructions and source adjudications do not create that authority.
Apply additionally requires a matching actual production rollback receipt less
than one hour old. Local rehearsal cannot satisfy it.

The separate local qualifier is fixed to loopback port 55240 and database
`ex_intrinsic_qualification_v1`. Its catalog fixture contains no Auth users,
sessions or real owner data. Explicit synthetic assigned/unassigned references
can test preservation, but are not evidence of authenticated application access.
Production completion also requires independent durable readback and actual
collector search/detail/printing/Vault verification. Six finishes do not close
the separate 1,419-parent explicit-stamp queue or all missing supplier quotes.
