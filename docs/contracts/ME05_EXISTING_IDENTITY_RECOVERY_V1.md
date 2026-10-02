# Existing Pitch Black identity recovery

The October 2 scope repairs the existing 120 ME05 parents, using all 120 verified
English Master identity facts and the database's existing identity projection and
hash functions. It creates no cards or printings and grants no pricing authority.
The existing 199 visible, verified printing reviews are preserved byte for byte.

The checked-in plan freezes the entire set, parents, printings, reviews and 120
original TCGCSV mappings. The only changes are the set's identity-domain default,
the 120 parent domain fields, 120 active identities and 120 source-evidence rows.
UUIDs, GV-IDs, numbers, names, images, external mappings and downstream foreign-key
targets remain intact. Existing identities, collisions, changed evidence or a
partial set stop the whole transaction. Retained discovery candidates stay as
history; this repair does not reclassify their source as JustTCG.

Run `backend/identity/me05_existing_identity_repair_v1.mjs` only through the
existing explicit identity-maintenance entrypoint. Plan/verify are read-only.
Rollback/apply require a fresh recorded user instruction, exact producer and plan
bytes, and a unique pending receipt. Apply additionally requires a matching
rollback receipt less than one hour old. Maintenance authorization is necessary
but does not replace the frozen package or evidence checks.

The transaction locks the identity lanes and protected children/reviews/mappings,
then locks the set and existing parents. It rechecks the full snapshot and real
database projections immediately before writing. It asserts the complete expected
state before commit. A separate read-only process must verify after commit. An
unknown COMMIT response is unresolved until independent readback; never retry it.
A completed repair cannot be applied again because the required pre-state no
longer exists. Preserve all pending and terminal receipts.

Warehouse reconciliation recognizes `tcgcsv:<group>:<product>` only for TCGCSV,
with the exact source group. A recognized relationship does not prove language,
retailer stamping, finish completeness, or a TCGplayer pricing mapping. Existing
language and variant gates still apply. Numeric provider IDs retain their prior
behavior. This reader change needs an independently verified runtime rollout.
