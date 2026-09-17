# Exact Mapping Identity Preservation

Date: 2026-09-17
Status: Local candidate; full hook retry pending after ENOSPC. No deployment.
Base: `600112f9fcf5ca348ccfeb6cabe6b4dea6540d5a` (merged warehouse safeguards).
Branch: `fix/exact-mapping-identity-preservation-20260917`.
Worktree: `C:/grookai_vault_mapping_identity_20260917`.

## Findings And Repair

The current exact mapping planner already rejects nonempty variant keys. Do not
claim the old incorrect Luxray mapping came from this current writer. Its saved
producer metadata names an older producer that has not yet been traced.

Two independently identified gaps in the current code are repaired here:

- Collector-number normalization stripped arbitrary parenthetical suffixes,
  including unknown event/treatment labels. It now removes only the printed
  coordinate while retaining every trailing parenthetical label.
- Live preflight loaded set UUID and code but did not compare them to the frozen
  target. A shared, tested target validator now checks both before insertion,
  along with the existing ID, name, number, variant and mapping constraints.

Candidate admission recomputes name/number normalization from raw fields and
checks canonical identity rather than accepting self-consistent fingerprints
alone. Plan policy is now `TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_2`;
the writer rejects V1.1 plans. Existing source files, applies and hashes remain
unchanged. Regeneration requires fresh evidence and existing apply authority.
No finish authority is inferred from these string comparisons.

## Verification

Two regressions were observed failing on the original code before repair.
The focused suite has 18 passing tests, including label preservation, old-plan
rejection, malformed hash-valid plans and independent live target mutations.
The broader mapping/publication/provenance/Master Index/maintenance set has
344 passing tests. Syntax checks pass for the planner and writer.

Artifacts: `C:/grookai_vault_operator_artifacts/mapping_identity_guard_20260917/`.
The first broad test invocation lacked the fresh worktree's `pg` dependency;
`npm ci --ignore-scripts --no-audit --no-fund` installed the lockfile dependencies.
The subsequent 344-test run passed without changing package metadata.

Normal commit first stopped on missing local DB configuration. Its second attempt
used local read-only PostgreSQL and passed preflight, then ran out of disk during
contracts. `commit-v2.log` is partial; no commit receipt was written. The child
Git/test processes were confirmed absent afterward. No hook bypass occurred.
Cleanup of this turn's installed dependencies was denied by tool policy and was
not retried. C: had zero free bytes. Preserve staged code, source artifacts and
all existing worktrees. Free disk before repeating the normal hook; do not treat
the partial run as passing. The full goal remains active and incomplete.

Continuation rechecked C: at 18.8 GB free and confirmed no prior commit/test
process remains. Retry uses a new log and the same local read-only target.

Offline replay preserves original artifact bytes and records SHA-256:

- July 28 candidate packet: 276 rows; 12 source labels were formerly discarded.
- July 28 applied selection: 25 rows; three have those label differences:
  84162 Champions Festival BW95 (Worlds 13), 84293 Chimecho 024 (e-League),
  85523 Flygon 025 (e-League).
- All old-policy rows are correctly rejected for new execution. Other identity
  checks differ only on the 12/three label-bearing records in these packets.

These historical findings require source adjudication. Some event labels may
describe the only valid printing of a promo; neither keep nor reassign an
existing mapping based on string difference alone. No live read was performed
for those three during this repair, and no current-price claim is made.

## Still Required

1. Review/release this code and verify the actual deployed mapping executors.
2. Trace legacy TCGdex/JustTCG bridge writers and their runtime callers. Static
   workflow search found no direct calls to these two scripts; that is not proof
   that remote timers/manual commands cannot run them.
3. Adjudicate the historical suffix-bearing mappings and the existing Luxray,
   Tyranitar, Lugia and Pokemon GO cases under issue #481.
4. Complete the remaining dependency inventory and bounded MEP review package.
5. Execute the separately frozen McDonald's repair only under its exact approval;
   this branch neither changes nor authorizes that executor.
6. Continue the full retrospective and public options/Vault verification.

Do not claim the DB-wide goal, all ingestion bypasses or live collector parity
complete. There were no DB, Storage, pricing, identity or ownership writes.
