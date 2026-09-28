# Native import receipts — September 27

## Result

Release review found that the qualified atomic import had no persisted record of
failed attempts. `docs/release/PRODUCTION_READINESS_GATE_V1.md` requires durable
outcomes and traceability for changes affecting user data. The new receipt wrapper
closes that implementation gap without rewriting the tested atomic writer or
changing the native request contract. This is local qualification, not deployment.

The Edge route assigns each admitted attempt a server-owned UUID. One service RPC
saves a terminal receipt with a payload hash, timestamps, stage, counts or sanitized
failure. Successful copies and the receipt commit together. Late failure rolls back
all copies but commits its failure receipt. Receipt insertion failure rolls back
the copies. A lost response remains unconfirmed to the client; retry safely
reconciles the saved total and produces its own receipt. Raw CSV, notes, prices,
emails and tokens are not stored in the receipt.

## Source and schema

Same isolated branch/worktree as the preceding qualification. Base remains
`f44dcfeaca56d6d0cd9f446420cee238d12485e1`; fetched current main remains
`b86fee84fa0314dc143cd3cd6e7ce919e4fd435b`, with identical native/schema baseline.
Existing atomic migration20260926230000 remains byte-exact. New additive migration
20260928020000 adds the receipt table and wrapper. The package now contains408
migrations: production406 plus these two pending versions. No other pending audit
migration, production write, remote deployment, commit or push is included.

## Evidence

Private root:
`C:/grookai_vault_operator_artifacts/native_import_receipts_20260927`.

| Verification | Outcome | Evidence |
| --- | --- | --- |
| Fresh read-only production406 baseline | Exact baseline/schema/security match; 1,095 security objects; no writes | `baseline.log`, `baseline-latest.json` |
| Fresh408 replay | Complete reset while empty and no-op local push passed | `full-408/replay-result.json` |
| Retained407-to-408 upgrade | Both existing copies and fixture rows unchanged; schema/security equal full408 with 1,098 security objects | `upgrade-408/upgrade-result.json` |
| Schema footprint | All10,457 existing407 objects unchanged;23 objects added solely for receipts/table/wrapper | `footprint-result.json` |
| Actual Auth/Edge/database acceptance | 13 scenarios/14 tests passed, including old import regressions and new durable outcomes, reordered replay, conflict, failure recovery, redaction, receipt-write rollback and role denial | `endpoint-final.log`, `acceptance-1790561752970/result.json` |
| Endpoint/baseline guards | 38 passed | `focused.log` |
| Deno type check | Passed | `deno-check-attempt2.log` |
| Full Node contracts | 5,575 passed, four skipped, zero failures | `contracts-full.log` |
| Android emulator | Five copies, lost response, zero-add retry, reopened CSV already saved; two succeeded receipts independently read back | `emulator-test.private.log`, `emulator-result.json` |

The existing760 Flutter test result remains applicable to unchanged product Dart
source. No skipped case is counted as passing. iOS and physical
device qualification remain open.

Initial test-harness failures are retained: the first Deno helper used the old
port and was denied network access before fixture creation; the second run had a
SQL quoting defect in the rollback fault injection. That run's subtest failure
invalidates its generated success-labelled JSON. Only the final13-scenario run is
acceptance evidence. The harness now requires all13 scenarios before writing a
success receipt. Earlier synthetic copies/receipts remain unchanged. The first
Deno-check command used an unsupported CLI flag; the normal type check passed.

## Local inspection and continuation

The normal Android407 APK is unchanged from prior qualification and restored on
emulator5580. The acceptance harness temporarily replaced only the isolated
`com.grookai.vault.lockedacceptance` package. Gateway57550 now forwards to the new
full408 lab57741 and Deno57950. Its guarded resume command is
`node scripts/tests/native_import_receipts_emulator_fixture_v1.mjs serve`.
Both preparation commands and replay/upgrade intents are one-use; do not rerun
them or reset any populated lab. Older407/411 fixtures are retained.

Next release work: normal repository release checks/commit, exact-pending remote
PrePush and apply gates for both migrations, coordinated RPC/Edge deployment, and
production readback before native distribution. The baseline-only gate does not
authorize these actions. iOS/device qualification, separate slab/provider repairs
and the original audit deliverables remain open. No production-ready or completed
cross-platform audit claim is made by this checkpoint.
