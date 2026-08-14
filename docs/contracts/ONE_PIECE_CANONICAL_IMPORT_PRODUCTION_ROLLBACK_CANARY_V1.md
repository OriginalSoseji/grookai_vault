# One Piece Canonical Import Production Rollback Canary V1

## Status

Execution contract and tooling only. This implementation gate does not connect
to production or run the canary. The executor may run only through the exact
local command in this contract after the implementation commit is reviewed.

## Frozen Inputs

- Manifest logical SHA-256:
  `e55e334b828db7b3a45e4b09cb34a51c81731cf309f3959c08052edb5cf4abf9`
- Migration draft SHA-256:
  `7eece6ff093de56b5cbea6a0a1f03a5a9b469789f11de233ac9fab90b4e80591`
- Canary plan fingerprint:
  `174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90`
- Selected group: `3189`, Starter Deck 1: Straw Hat Crew
- Exact transaction-local rows: one batch and 21 source rows
- Authorized durable rows: zero

Any input, SHA, plan, selected source row, source payload hash, source lane,
classification, language, release state, group, or row-count drift blocks the
canary before mutation.

## Protected Boundaries

Before mutation, the executor opens a read-only connection and captures exact
row counts for these domains:

- canonical games, sets, parent cards, identity, printings, and mappings;
- current and future sealed-domain tables;
- market-price publication and qualification tables;
- pricing observations, rollups, jobs, and watches;
- Vault owners, items, and item instances;
- catalog release controls;
- MTG canonical scope and immutable MTG staging rows;
- the Supabase migration ledger.

It separately verifies the current category `68`, group `3189`, all 21 source
product payload hashes, classifications, and exact source price lanes against
the frozen plan. A source refresh that changes these selected facts is a new
input and blocks this old plan.

## Transaction Contract

The executor has no commit path. It must:

1. verify all local files before creating a database client;
2. verify the branch and clean tracked worktree;
3. require the exact rollback-only approval token;
4. capture the protected read-only baseline;
5. require all One Piece staging objects and migration-ledger entries to be
   absent;
6. begin one serializable write-capable transaction;
7. remove only the exact draft's outer `BEGIN` and `COMMIT` delimiters;
8. execute only that inner body;
9. insert exactly one immutable batch and 21 exact source payload rows;
10. read back every field and payload hash;
11. prove RLS, policies, grants, trigger/function presence, and service-only
    select/insert access;
12. attempt update and delete under savepoints and require both to fail;
13. prove protected boundaries and selected source evidence remain unchanged;
14. always issue `ROLLBACK`, including on any failure;
15. close the write-capable connection;
16. create a new read-only connection and prove all staging tables, function,
    policies, triggers, indexes, and migration-ledger entries are absent;
17. prove protected boundaries and selected source evidence equal the baseline;
18. preserve run plan, baseline, transaction proof, post-rollback proof, summary,
    report, failure details when applicable, and SHA-256 artifact hashes.

An inability to prove rollback is a failed canary. A failed transaction still
requires the fresh post-rollback readback when the baseline and rollback attempt
exist.

## Independent Verification

The standalone verifier accepts only a successful executor `summary.json`. It
revalidates all frozen local inputs before connecting, opens another fresh
read-only transaction, and independently checks:

- executor status and exact fingerprints;
- transaction-local one-batch/21-row evidence;
- successful rollback;
- absence of every temporary staging object;
- protected boundaries equal the executor's baseline;
- selected source evidence still matches the frozen plan.

It performs no writes and produces its own run plan, production readback,
summary, report, and artifact hashes.

## Local Execution Commands

Run from `C:\grookai_vault_one_piece_readiness` with the production database URL
available through the repository's existing local environment configuration.

```powershell
$env:ONE_PIECE_ROLLBACK_CANARY_APPROVAL='EXECUTE_ROLLBACK_ONLY_ONE_PIECE_CANARY:174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90:7eece6ff093de56b5cbea6a0a1f03a5a9b469789f11de233ac9fab90b4e80591:ZERO_DURABLE_ROWS'
node scripts/audits/one_piece_canonical_import_rollback_canary_v1.mjs --execute-rollback-canary --out-dir=docs/audits/pricing/one_piece_canonical_import_staging_and_canary_v1/production_rollback_manual
```

Only after the first command reports
`rollback_canary_passed_zero_durable_change`, run:

```powershell
node scripts/audits/one_piece_canonical_import_post_rollback_verify_v1.mjs --verify-post-rollback --execution-summary=docs/audits/pricing/one_piece_canonical_import_staging_and_canary_v1/production_rollback_manual/summary.json --out-dir=docs/audits/pricing/one_piece_canonical_import_staging_and_canary_v1/production_rollback_manual/independent_verify
```

Unset the approval token afterward:

```powershell
Remove-Item Env:ONE_PIECE_ROLLBACK_CANARY_APPROVAL
```

## Stop Condition

Stop after the independent verifier reports `rollback_independently_verified`.
Do not promote the migration draft into the applied migration directory, commit
the transaction, retain staging rows, create One Piece canonical/sealed rows,
publish prices, change release controls, access Storage, repoint images, alter
Vault data, mutate MTG state, or deploy clients.

## Exact Next Gate

After successful execution and independent verification artifacts are reviewed,
design a separately governed durable service-only staging migration/apply gate.
That later gate requires explicit durable-write authority and remains separate
from canonical promotion or publication.
