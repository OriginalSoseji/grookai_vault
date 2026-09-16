# Market Health Read Repair

Date: 2026-09-16. Scope: health reader only; no ingestion or publication rerun.

## Incident

September 16 source ingestion completed with 550274 price rows. Publication run
106e4506-5803-4f69-b9f9-b97d1364c225 verified/reconciled 164103 snapshots, but the
scheduled wrapper subsequently failed in the health query at its 120-second
limit. Preserve that failure and its artifacts; do not rewrite it as success.

Live EXPLAIN showed repeated decision lookups and a historical freshness-index
scan. Simply materializing inputs was insufficient: the planner still chose a
large nested loop around the active-publication join. A bounded probe of that
intermediate form was canceled at the unchanged server limit.

## Repair

- Materialize narrow selected-run decisions once for totals and trace joins.
- Materialize active-release snapshots and active-run publish decisions.
- Join those two batches before applying publication metadata and visibility.
- Keep freshness, eligible/current/publish, reconciliation, trace and hidden
  printing rules. A cross-run corrupt snapshot cannot borrow another run's trace.
- Read within repeatable-read/read-only; rollback on success and failure.
- Keep server timeout 120 seconds; client waits 125 seconds for server cancellation.
- Record query duration in the health artifact. No global planner changes.

## Verification

43 targeted contract tests passed. Local temporary-table integration compares
the frozen original SQL and candidate across healthy and negative cases, plus a
cross-run corruption rejection and a scale fixture with stale statistics.
No permanent local or production fixture rows are written.

Production candidate query: 2609 ms; 207129 decisions, 164103 eligible snapshots,
164103 traced snapshots, 164103 current exact prices, 105025 parents, zero broken
traces, all five required phases succeeded. This timing is a warm live probe,
not a cold-cache benchmark or proof of tomorrow's scheduled completion.

## Deployment And Recovery

Freeze through normal repository checks. Deploy an immutable pricing runtime,
preserve the prior runtime and separately governed MEE runtime, and update the
scheduled producer pin only with exact readback. Run the health command alone
against the existing publication; never rerun the whole pipeline to repair this
post-publication check. Do not edit failed scheduled summaries or reset failure
state to imply a completed unattended cycle.

Next scheduled pipeline remains the proof of unattended recovery. Any later
failure is investigated separately; this patch does not declare all MEE healthy.

Local receipts and final deployment checkpoint:
`C:/grookai_vault_operator_artifacts/pokemon_30th_20260916/`.
