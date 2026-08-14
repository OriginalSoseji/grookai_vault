# One Piece Canonical Import Staging And Rollback Canary V1

## Status

Design and local artifact contract only. The SQL is an unapplied migration draft.
This gate authorizes no database connection, schema apply, durable staging row,
canonical row, publication, Storage operation, image change, deployment, pricing
write, Vault write, or active MTG worktree change.

## Frozen Authority

- Readiness manifest logical SHA-256:
  `e55e334b828db7b3a45e4b09cb34a51c81731cf309f3959c08052edb5cf4abf9`
- Candidate version: `ONE_PIECE_CANONICAL_CATALOG_CANDIDATE_V1`
- Staging schema: `ONE_PIECE_CANONICAL_IMPORT_STAGING_SCHEMA_V1`
- Canary plan: `ONE_PIECE_CANONICAL_CATALOG_ONE_GROUP_ROLLBACK_CANARY_V1`

The manifest is the complete evidence input for this gate. A different logical
fingerprint requires a new readiness artifact and plan. The planner verifies the
uncompressed JSONL bytes before selecting a group.

## Immutable Service-Only Staging

The unapplied draft defines two isolated tables:

- `one_piece_canonical_import_batches` stores producer provenance, exact
  fingerprints, the selected group, counts, boundaries, rollback mode, and zero
  durable-row authorization.
- `one_piece_canonical_import_rows` stores each exact source product payload plus
  a deterministic row ID and payload hash.

`anon` and `authenticated` receive no privileges. `service_role` receives only
`SELECT` and `INSERT`. RLS permits only those operations, and update/delete
triggers reject mutation even by a privileged caller. The tables have no client
RPC, canonical trigger, release pointer, or publication path.

The draft lives in `supabase/migration_drafts`, not `supabase/migrations`. Normal
migration tooling therefore cannot apply it. A later execution gate must bind
the exact draft hash and must not silently edit or promote the file.

## Preserved Source States

Every staged row retains the complete readiness-manifest payload. Indexed wrapper
fields make boundaries auditable without changing the source evidence:

- record class: exact single, sealed product, or ambiguous quarantine;
- exact-single kind: numbered card or DON!! card;
- language key and language authority in the payload;
- current, future/presale, inactive, sealed-catalog, or quarantine promotion state;
- source group and product IDs;
- release/presale evidence;
- source price lanes and source payload hash.

Missing `Number` does not imply sealed. DON!! remains an exact single-card kind.
A sealed starter deck and cards inside it remain separate source identities.
Sealed and quarantine rows are evidence lanes, not canonical-write authority.
Future and presale rows remain preserved holds, never current candidates.

## Deterministic Group Selection

The one-group canary selection policy requires:

1. no more than 25 source products;
2. at least one exact single, numbered card, DON!! card, and sealed product;
3. zero quarantine rows;
4. zero future or presale rows;
5. every row active and released by the frozen as-of date;
6. smallest qualifying group by row count, then numeric group ID.

The frozen manifest selects group `3189`, **Starter Deck 1: Straw Hat Crew**:

| Preserved lane | Rows |
|---|---:|
| Numbered single cards | 17 |
| DON!! single cards | 1 |
| Sealed products | 3 |
| Quarantine | 0 |
| Future/presale | 0 |
| Total source products | 21 |

All 21 rows are English-source-default evidence and carry release date
`2022-12-02`. The group exercises the important ontology boundaries without
authorizing any of the rows for canonical or sealed publication.

## Rollback-Only Proof Boundary

This gate creates only a future execution plan. It does not execute these steps.
The separately approved execution gate must perform exactly one transaction:

1. begin a transaction;
2. apply the exact draft body inside that transaction, excluding its outer
   `BEGIN` and `COMMIT` delimiters;
3. insert exactly one batch and the 21 selected source rows;
4. verify exact transaction-local row and payload hashes;
5. verify RLS, grants, and update/delete rejection;
6. prove protected canonical, sealed, publication, pricing, Vault, and release
   counts are unchanged;
7. roll back;
8. independently prove both draft tables and all staged rows are absent;
9. prove protected-domain counts remain unchanged after rollback.

Expected transaction-local rows are one batch and 21 staged source rows.
Expected durable rows are zero batch rows and zero staged source rows. A commit,
durable schema, canonical write, sealed write, or publication event is a failed
canary.

## Fingerprints And Validation

The plan fingerprint covers producer commit/branch, manifest hash, migration
draft hash, selected group, every exact payload and payload hash, counts,
rollback proof, and all zero-write boundaries. IDs use deterministic UUID v5.

Validation rejects:

- missing, duplicate, or changed source product IDs;
- payload hash or wrapper/payload mismatches;
- classification, DON, language, release, sealed, or quarantine drift;
- a selected future/presale/inactive row;
- any source payload that authorizes publication, canonical writes, or sealed
  writes;
- nonzero durable-row authorization;
- a plan-fingerprint mismatch.

## Exact Next Gate

The exact production rollback execution and independent verification behavior
is frozen in
`ONE_PIECE_CANONICAL_IMPORT_PRODUCTION_ROLLBACK_CANARY_V1.md`. Execute it only
through its exact hash-bound local commands. A passing run must end with zero
durable schema objects and zero durable rows. Stop before any durable staging
migration or canonical promotion.
