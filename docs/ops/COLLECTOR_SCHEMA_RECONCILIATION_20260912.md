# Collector Schema Reconciliation

September 12, 2026 UTC. Read-only diagnosis completed.

## Finding

The pre-existing baseline difference is physical column order in `card_prints`,
`pricing_jobs`, and `sets`, not a missing column, changed view definition or changed
permission. The raw diff engine proposed rebuilding 41 dependent views and emitted
88,735 bytes of SQL. None of that SQL was executed.

The exact comparison checked every named column's inspection metadata before
aligning only those three table column maps in memory. View output order, function
bodies and all other object definitions were left untouched. The resulting schema
diff was **zero bytes**. This establishes baseline schema parity for this snapshot;
it does not assert that arbitrary future differences are safe to ignore.

Independent owner/ACL/column-grant/forced-RLS/function-security comparison:
**891 objects checked, zero differences**. All **393 applied migration IDs** match
between production and the existing isolated replay on port 55430.

The sole local-only migration remains `20260912050000`, the expected confirmed-cameo
reader. Its SHA-256 is pinned to
`5626c20bf8a422d5143a770478cfb2b2621c8fcac851b85363aafd2d7deef5ad`.
It was deliberately excluded from the baseline replay comparison because it is
not applied to production. That expected new feature is not baseline drift.

## Evidence

Directory:
`C:/grookai_vault_operator_artifacts/collector_polish/schema_reconciliation_20260912_baseline`.

- `run_plan.json`: source/tool hashes, engine versions, bounded targets.
- `raw_diagnostic_diff.sql`: original diagnostic only; never execute.
- `reconciled_diagnostic_diff.sql`: empty after exact order comparison.
- `security_comparison.json`: full owner, grant and RLS comparison.
- `summary.json`: column-order lists, counts, status and zero production writes.
- `artifact_hashes.json`: audit artifact SHA-256 manifest.

21 regression tests passed: 17 reconciliation/audit tests and four pinned-engine
tests. Tests prove that changed types, defaults, nullability, columns, grants, RLS
and view definitions do not disappear under the narrow comparison. The four engine
tests ran in the existing dependency-equipped worktree only after their source and
helper were verified byte-identical to this tree. No dependencies were changed in
the shared installation. Engine versions remain exactly 0.6.1.

## Repeat

Run from `C:/grookai_vault_collector_release`, using a NEW output directory:

```powershell
node --use-system-ca scripts/schema/audit_collector_schema_baseline_v1.mjs `
  --env-file=C:/grookai_vault/.env.local `
  --expected-pending=20260912050000 `
  --inspection-deps=C:/grookai_vault_sealed_apply_baseline `
  --out-dir=<new-operator-artifact-directory>
```

The script validates the replay container/port, production target/maturity, exact
pending migration hash, equal applied ledgers, source stability, SQL definitions
and security attributes. Both connections use repeatable-read, read-only
transactions. It neither mutates a database nor changes the strict apply gate.

## Remaining Work

No repair or rebuilding of the 41 existing views is warranted by this evidence.
The previous checkpoint's unknown-baseline-drift blocker is now investigated and
resolved diagnostically. Preserve this proof for the narrow migration's governed
preflight; do not use the old broad raw diff as an apply plan.

The two actual feature repairs remain unapplied: confirmed-cameo schema and MTG
paired price/image release refresh. Their full migration/producer/canary/apply
gates remain recorded in `COLLECTOR_BACKEND_REPAIR_CHECKPOINT_20260912.md`. This audit
is not a production apply receipt, a successful full shipcheck or permission to
enable scheduled publication. The live website and production database are unchanged.
