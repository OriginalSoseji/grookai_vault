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

The current-main migration-order repair, local replay, schema-equivalence
audit, and targeted rollback writer are implemented by commit
`6ac7ade2356779388852916335d072fe6b15e999`.

The unfinished Official Japanese catalog expansion remains preserved on the
separate branch `catalog/jpn-master-index-v5-official-global-catalog` at
`4c0489f161c69660e968eec195e783b9d0701f3b`. It is not a dependency of this
V4 write gate.

## Problem

The prior writer was internally safe but incomplete. Applying it would have
inserted only the original direct and set-dependent lanes and omitted all
additional final-adjudication cards. Production also contains the two
Japanese review tables that were created out of band. The original repair
version `20260726100000` was absent from migration history and conflicted in
sequence with the later current-main remote-schema snapshot. The unapplied
repair is now version `20260805100000`. Writing rows before reconciling that
history would violate the clean migration-chain requirement.

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
- Migration version: `20260805100000`
- Migration SQL SHA-256:
  `2cd8c70026d74296a469afdb5017944bb37c3a640e064288e4d55d140c037fb6`
- The function definition preserves the final security contract with
  `search_path = pg_catalog`.
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
- Full `jpn-master-index:test`: 112/112 passed.
- V2 production preflight completed in a proven read-only transaction.
- Production schema fingerprint:
  `4f569964c6347c60745bb5d68cb908aacc11bcf26334154e01c49f231e7a761a`
- `node --check` passed for V1/V2 preflight and writer modules.
- `git diff --check` passed.
- Local `supabase db reset --local --no-seed` passed through the complete
  current migration chain after retimestamping the repair.
- The V2 writer plan used verified local artifacts only and made no database
  connection.
- Local and production schema/security contracts are exactly equivalent at
  fingerprint
  `6f319dc8805fc871c4da5339814372015f0bdec0f796d0ae6bfa18458557147c`.
- The targeted schema-history rollback proof passed. All 35 statements and
  the exact migration-ledger row were visible inside the transaction, then
  rolled back. Production ledger rows remained zero.
- Governed production row counts were unchanged by the rollback proof:
  116,589 source-evidence rows and 28,161 family-review rows before, inside,
  and after the transaction.

## Artifact Hashes

- `payload_preflight_v2/jpn_payload_preflight_v2.json`:
  `7b8e265d2022a17c865ef92ca5d3fea290e9c401fbd6b23b0b57dccc763736b4`
- `payload_preflight_v2/jpn_payload_target_schema_contract_v2.json`:
  `0fd3735b2858b4096959414d6f0d6f2eba4db12501d4c6c7994936f4e064d333`
- `payload_writer_v2/jpn_payload_writer_v2.json`:
  `eabb998bba325220300d3d81c6e57e6f4ea7e3766e942ee932732e5dc35833cc`
- `schema_history_preflight_v1/jpn_schema_history_preflight_v1.json`:
  `86bde594cb391df58e94dd658faf03fd1512d19958178a1801c39a2a71a465d6`
- `schema_history_writer_v1/jpn_schema_history_writer_v1.json`:
  `dbe2614af410540559f8e3acdc93360dcc3614c6ed3e678ad1378d53645fa407`

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

1. From the committed branch, apply only migration version
   `20260805100000` through the exact approval-gated schema-history writer.
   Do not use global `db push`.
2. Verify the one-row migration ledger and complete schema/security readback.
3. Run `payload_writer_v2.mjs --dry-run` against production. It must insert
   all scoped rows inside one transaction, reconcile exact counts, prove the
   English family fingerprint unchanged, roll back, and read back zero
   durable rows.
4. Regenerate the read-only preflight after the rollback proof. It must remain
   collision-free and retain the pinned payload or the writer must be
   re-frozen and reviewed.
5. Stop for explicit approval of the exact V2 writer message before any
   durable parent-row apply.
6. After apply, read back every row count and fingerprint. Public child
   printing, image-hosting, and visibility work remains a later project.

## Stop State

V4 is database-write prepared but not database-applied. The migration repair
and rollback proof are complete; production still requires the separately
approved migration apply, rollback-only payload proof, and durable payload
approval. No durable production data was changed by this checkpoint.
