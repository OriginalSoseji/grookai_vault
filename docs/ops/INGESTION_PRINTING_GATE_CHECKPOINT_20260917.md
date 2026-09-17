# Printing-Complete Ingestion Checkpoint

Date: 2026-09-17 UTC (September 16 local)
Request: Make supported variants, finishes and corresponding printing GV-IDs a
standard ingestion requirement rather than a post-release repair.

## Repository State

- Worktree: `C:/grookai_vault_ingestion_printing_gate_20260917`
- Branch: `fix/ingestion-printing-completeness-20260917`
- Base main: `8bf503314431c0de89d362f15d2c0a48e62cb4b6`
- This is a local tested candidate, not a deployed worker or migration.
- No commit, push, production data mutation, Storage write or release occurred
  during this process-repair task. Preserved worktrees were not modified.

## Root Cause

The existing contract already required printing truth. Enforcement was uneven:
the legacy new-set runner could report generic completion after parent/mapping/
image work, without child printing readback. The shared printing writer also
accepted a null printing GV-ID. A parent identity or provider finish flag does
not prove a collector can select or own an exact printing.

The 161-card anniversary Holo database repair was completed previously. This
task verifies and preserves it; it does not repeat the repair.

## Implemented

- Versioned, fingerprinted per-set printing completeness manifests with exact
  parents, finish counts, expected printing GV-IDs and bound source evidence.
- Offline deterministic admission plans that retain existing child IDs and
  reject conflicting GV-IDs, duplicate identities and collisions.
- Explicit outside-base review leads; unresolved in-scope variants block.
  No fabricated Normal/Reverse children for a Holo-only base release.
- The shared three-finish writer requires reviewed, source-hashed evidence,
  exact parent/finish identity, matching provenance and canonical-parent readback.
  Price buckets, provider variant flags and missing GV-IDs fail before writing.
- The legacy runner requires a manifest before acquisition. Collector-scope
  apply requires existing exact verified children before any write-capable work.
  It does not gain a new atomic parent/child writer. New parent intake remains
  explicit `--identity-only` with `identity_only_printings_pending` status.
- Exact post-apply child/public-option readback; never generic `complete`.
- The existing six-hour shadow workflow now checks read-only printing coverage
  even if discovery fails. Gaps update the existing GitHub issue and fail the
  audit, without hiding cards or changing catalog state.
- Contract, ingestion playbook, operator index and agent entrypoint updated.

## Verification

- 86/86 tests passed across nine contract files.
- All changed JavaScript files passed `node --check`.
- New gate, publication evaluator and printing writer imported successfully.
- `git diff --check` passed.
- Production read-only check at `2026-09-17T04:17:37.611Z` verified canonical
  environment: 170,658 cards; 3,399 sets; 32,903 traits.
- Exact `30c` base readback: 161 parents, 161 verified Holo children and 161
  public options. No missing/provisional/unproven/misbound printing identities.
- Offline CLI replay from that snapshot: zero inserts, 161 retained IDs, two
  preserved outside-base review leads; no network requests or database writes.
- Full application shipcheck and a production scheduled execution were not run.
  No app UI changed; no new Samsung or iPhone build is required by this code.

Evidence root:
`C:/grookai_vault_operator_artifacts/ingestion_printing_gate_20260917/`

Important files:

- `read-plan.json`, `live-readback.json`, `verification.json`: frozen live read.
- `offline-replay/manifest.json`: replay scope with the two outside-base leads.
- `offline-replay/plan/printing_plan.json`: zero-row admission delta.
- `offline-replay/plan/readiness.json`: exact printing readback.
- `local-verification/results.json`: commands, syntax/import/test outputs.
- `local-verification/source_hashes.json`: code tested by that receipt.

The earlier `verification.json` covers the base-printing readback, not the
complete special-product review queue. The later offline replay explicitly
retains the two original exclusions. Neither receipt approves those variants.

## Remaining Release Boundaries

Retrospective follow-up: read `RETROSPECTIVE_PRINTING_AUDIT_20260917.md` before
merging. The catalog-wide audit found the scheduled worker skips default-public
Pokemon because of its inner join to game controls. The subsequent local repair
has live read-only SQL parity across 3,399 sets and eight visibility cases;
see `MASTER_INDEX_TOP_DOWN_REPAIR_CHECKPOINT_20260917.md`. It is not deployed.

1. Review and merge this isolated code through the normal repository checks;
   do not bypass hooks or combine the dirty intake/release worktrees.
2. Run the deployed read-only publication audit and retain its per-set gaps.
   The bounded live SQL was tested on `30c`, not the entire catalog in this task.
3. For each new release, produce a reviewed language-specific printing manifest
   and use its governing bounded child writer before collector release. The
   planner is not an automatic production apply and does not discover finishes.
4. Existing direct SQL writers still require their own pre-commit printing-truth
   checks. The scheduled audit is diagnostic, not a database-wide interceptor.
5. Complete Vault/client smoke for each new release. `printing_ready` is not
   interchangeable with `collector_ready`; no pricing presence requirement is
   introduced by this gate.

Legacy normalizer finish flags already yield no children and remain evidence
only. Historical one-off printing repair scripts are unchanged; without the new
writer arguments and reviewed evidence they now fail closed if rerun. Do not
alter or rerun those frozen repair authorities to make tests pass.

No new founder/Pulse routing or automatic canonical mutation was deployed.
Do not report the scheduled protection as live until its merged run is verified.
