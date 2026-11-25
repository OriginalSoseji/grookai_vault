# Warehouse atomic promotion batch V1

Status: integrated bulk repair candidate under qualification; no release closure.

One prepared batch consumes exact, already approved warehouse stages. It creates
no founder decisions. One programme decision may be materialized in all of its
candidate approval records; those records are internal audit facts, not separate
user checkpoints. Each stage, candidate, original approval event and mutation
expectation is frozen in the batch plan. A fresh locked reconstruction must
match before execution. Pending stages must be unconsumed, with one stage per
candidate. Dependent mutations require separate internal batches.

The existing promotion executor owns all canonical DML and original evidence,
identity, finish and post-write proofs. Its claim and execution cores now accept
an explicit external transaction; ordinary single-stage callers retain their
existing wrapper transactions. The external-transaction guard proves an
assigned PostgreSQL transaction ID survives a second statement. Mutation
execution requires writable SERIALIZABLE isolation. The batch API requires a
dedicated idle PostgreSQL client and explicit boolean apply for write modes.

All claims, canonical changes, success events and candidate/stage transitions
commit together or roll back together. BEGIN acknowledgement failure still
requires rollback. Unknown commit or rollback stops for independent readback;
there is no automatic retry. Exact committed receipts support read-only replay
and independent full-row readback. Source scope or before-state drift cannot
be silently refreshed into an approved plan.

All298 parents in the149-pair stamp conflict frontier are excluded by the
byte-bound existing hold manifest. This component provides no flag, alias,
reparent or identity-equivalence clearance. Existing source holds and consumed
repair attempts remain binding.

New reviewed generic Play parents also require
[active registry admission](WAREHOUSE_PARENT_REGISTRY_V1.md). The batch rejects
a new-parent mutation lacking that admission. This enforces the frozen one
active printed-identity record rule within the new bulk path.

Every additive parent/printing batch freezes whole-set invariant profiles:
exact before/after parent, printing and per-finish counts, zero duplicate
identities, reviewed negative facts and full-row digests of retained parents,
identities, printings and reviews. Existing mapping, Vault and Binder footprints
must remain exact. Profiles are rebuilt during planning and locked preflight,
checked immediately before commit and checked again by independent committed
receipt readback. New UUID exclusions come only from exact planned inserts.

Local proof uses separately owned `stamped_bulk_promotion_qualification_v1` and
`stamped_bulk_promotion_registry_qualification_v1` databases on loopback56230.
Both are copies of the retained synthetic intake fixture; no original lab was
reset and no real accounts, sessions or collections were copied. The actual
PostgreSQL harness covers449 protected relations, independent rollback after
the ninth parent/identity insert fails, full commit/readback and zero-write
receipt replay. Failed qualification attempts remain retained.

Finish source qualification, physical finish and mapping composition, durable production outcomes and the
ordinary consolidated exact programme decision before production execution.
The current local proof is not production acceptance or global completion.
