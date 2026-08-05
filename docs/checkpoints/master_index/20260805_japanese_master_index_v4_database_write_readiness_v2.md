# Japanese Master Index V4 Database Write Readiness V2

Date: 2026-08-05

## Context

Japanese Master Index V4 finished evidence acquisition and final no-write
adjudication, but its original V1 database payload covered only 3,888 of the
5,336 promotion-ready cards. The remaining 1,448 resolved cards had to be
integrated without changing the already-reviewed deterministic IDs.

Work was isolated on branch
`catalog/jpn-v4-production-integration-v2`, based on current `origin/main`,
and implemented by commit
`8248ccd2e4ea66280c14a8b9d65218437a547ea1`.

The unfinished Official Japanese catalog expansion remains preserved on the
separate branch `catalog/jpn-master-index-v5-official-global-catalog` at
`4c0489f161c69660e968eec195e783b9d0701f3b`. It is not a dependency of this
V4 write gate.

## Problem

The prior writer was internally safe but incomplete. Applying it would have
inserted only the original direct and set-dependent lanes and omitted all
additional final-adjudication cards. Production also contains the two
Japanese review tables that were created out of band, while migration
`20260726100000` was absent from migration history in the latest successful
ledger read. Writing rows before reconciling that history would violate the
clean migration-chain requirement.

## Risk

- Changing the identifier namespace would create different IDs for 3,888
  already-reviewed candidates.
- Treating additional non-Pokemon cards as species would contaminate family
  identity.
- Applying before collision readback could overwrite or duplicate live rows.
- Marking the migration applied without complete schema, RLS, grant, policy,
  function, trigger, and comment equivalence could hide drift.
- Writing public child printings would imply finish and self-hosted-image
  facts that V4 does not establish.

## Decision

Use `JPN-MASTER-INDEX-PAYLOAD-PREFLIGHT-V2` and
`JPN-MASTER-INDEX-V4-PAYLOAD-WRITER-V2` for the complete package while
retaining the V1 deterministic identifier namespace. The writer remains
insert-only, exact-fingerprint-pinned, collision-failing, and independently
approval-gated.

Public child printings, species-link promotion, image hosting, search,
sitemap, scanner, pricing, vault, and English identity writes remain outside
this gate.

## Current Truths

- Final adjudication fingerprint:
  `0d6998adc0e4220fad27afb9ce2d3913283e68e5d96455de668e1c01c5b26747`
- V2 preflight fingerprint:
  `b269de1cae5bb83113e9b88f27400613fca92508c681950861c62213cd6ec36b`
- V2 writer payload fingerprint:
  `b11c033901f8cb94b641f2c6e7f3586a3db2bc994242f7d8aa28cb2198218e2c`
- Migration SQL SHA-256:
  `AF6EC61966B6A4C428A3FC40CCE76B308BB8380E7F1303CCD0509F14FDA1F262`
- Set rows proposed: 1,041
- Parent `card_prints` proposed: 5,336
- `card_print_identity` rows proposed: 5,336
- Source evidence rows proposed: 5,461
- Family review rows proposed: 5,336
- Deferred public child rows: 5,336
- Blocking collisions: 0
- Non-blocking collisions: 0
- Repository schema drift tables: 0
- The original V1 target rows are preserved byte-for-byte in V2.
- The 1,448 additional cards are resolved non-Pokemon domains: 15 use
  existing sets and 1,433 require set-first insertion.
- Every ready card has image evidence, but images are evidence pointers only;
  this gate does not self-host or publish them.

## Verification

- Targeted V1/V2 preflight and writer contracts: 18/18 passed.
- Full `jpn-master-index:test`: 109/109 passed.
- V2 production preflight completed in a proven read-only transaction.
- Production schema fingerprint:
  `4f569964c6347c60745bb5d68cb908aacc11bcf26334154e01c49f231e7a761a`
- `node --check` passed for V1/V2 preflight and writer modules.
- `git diff --check` passed.
- Local `supabase db reset` was not run because Docker Desktop was not
  available.
- The V2 writer plan used verified local artifacts only and made no database
  connection.
- A later migration-ledger read and rollback writer proof were not run:
  production Postgres timed out before authentication on three bounded
  retries. No transaction opened and no database state changed.

## Artifact Hashes

- `payload_preflight_v2/jpn_payload_preflight_v2.json`:
  `a820143169abc4da6499e5b38b85a79909393e3f8a3228fbe92451d7a776ad8d`
- `payload_preflight_v2/jpn_payload_target_schema_contract_v2.json`:
  `09c6ff0ad7c7f2899c1c64d784b51b9d0b13152585cfe63c42566c317596f437`
- `payload_writer_v2/jpn_payload_writer_v2.json`:
  `e672cacee0ebfb1f5b8bc2d73fbb80531a446f90de5cfdb4c3d90337356b10b3`

## Invariants

- V1 deterministic IDs must never change.
- Existing canonical, English, pricing, vault, and public child rows must not
  be updated, deleted, merged, quarantined, or overwritten.
- All five target tables use insert-only, fail-closed conflict behavior.
- Family review rows remain non-promoted review data.
- `not observed` and `not yet published` must not be converted into printing
  or finish facts.
- The migration ledger must be clean before the parent payload is applied.
- A rollback proof must succeed from the same committed payload that is later
  approved for apply.

## Explicit Next Gate

1. Restore production Postgres connectivity and repeat the read-only ledger
   query for version `20260726100000`.
2. Perform full readback for the migration-owned tables, function, triggers,
   RLS state, policies, grants, indexes, constraints, and comments.
3. If every object is byte/contract equivalent and only history is missing,
   repair only migration version `20260726100000` as applied. If any object
   differs, execute only the targeted idempotent migration and then record
   only that version. Do not use global `db push`.
4. Verify the migration ledger and complete schema/security readback.
5. Run `payload_writer_v2.mjs --dry-run` against production. It must insert
   all scoped rows inside one transaction, reconcile exact counts, prove the
   English family fingerprint unchanged, roll back, and read back zero
   durable rows.
6. Regenerate the read-only preflight after the rollback proof. It must remain
   collision-free and retain the pinned payload or the writer must be
   re-frozen and reviewed.
7. Stop for explicit approval of the exact V2 writer message before any
   durable parent-row apply.
8. After apply, read back every row count and fingerprint. Public child
   printing, image-hosting, and visibility work remains a later project.

## Stop State

V4 is database-write prepared but not database-applied. The exact remaining
blockers are migration-history reconciliation, a rollback-only production
writer proof, and explicit durable-write approval. No production data was
changed by this checkpoint.
