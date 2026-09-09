# Pricing Publication Memory Repair - September 9, 2026

## Authoritative Finding

Direct production systemd readback identified September 8 publication failure
as `oom-kill`, not a missing canonical mapping or source-price defect. The host
has 3.8 GiB RAM and no swap; two live scanner processes consume about 1.9 GiB.
The publication unit reported a 1.4 GB memory peak. Do not stop scanners or
loosen price policy to force a successful run.

Full observation `34242326938` retained 164129 valid current prices with no
stale rows, missing provenance or broken traces. Coverage/performance pass,
but interrupted scheduled runs mean the seven-cycle operational gate failed.
Do not relabel those runs or erase historical alerts.

## Repair Scope

Worker V1.7 stages each existing source-product page as it arrives, retaining
only observation IDs for exact cross-page reconciliation. It reads staged
counts through aggregation rather than rehydrating the full payload ledger.
Qualification and artifact export use run-bound composite-key pagination.
Summary and JSONL generation are bounded and repeatable over immutable rows.
The small canary identity path and read-only dry-run output remain compatible.

No schema, qualification, material-loss tolerance, publication scope, source
identity, current pointer, warehouse, Vault or authentication rule changes.
Ordinary unbounded read-only dry-run still materializes its candidate input;
the repaired production/shadow paths stream staging, qualification and export.

## Verification And Next Gate

- 60 targeted source/policy/streaming contracts pass.
- A 300000-row synthetic candidate inventory passes under a 96 MiB Node heap.
  This proves bounded payload retention, not whole-production process RSS.
- Isolated SQL proof passes: 2510 fixture rows, 2505 exact selected rows,
  five other-run rows excluded, tied cursor keys preserved, two identical
  exports, 28 bounded queries, full rollback and verified temporary-table absence.
- Run the full shipcheck before committing.
- Freeze source, then run read-only production parity or a bounded shadow before
  replacing the pinned deployed worker. A local pass is not production activation.
- Preserve the old deployment and incomplete run evidence. Do not automatically
  replay the interrupted run, bypass resume provenance or restart a paid batch.

Artifacts: `C:/grookai_vault_operator_artifacts/release_closeout/20260909/`.
Whole release checklist: `docs/checkpoints/RELEASE_CLOSEOUT_20260909.md`.
