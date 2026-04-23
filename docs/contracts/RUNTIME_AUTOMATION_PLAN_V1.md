# RUNTIME_AUTOMATION_PLAN_V1

Status: Active runtime support document

Purpose: classify which protections must run automatically, where they trigger, and what still requires explicit human review.

| task_name | current_trigger | desired_trigger | automation_class | fail_behavior | mutates_canon | human_review_required |
| --- | --- | --- | --- | --- | --- | --- |
| `contract_scope_validation` | inline on shared canon executor | inline on every in-scope canon write | `ALWAYS_RUN_INLINE` | hard fail | no | no |
| `pre_write_validation` | inline on shared canon executor | inline on every in-scope canon write | `ALWAYS_RUN_INLINE` | hard fail / quarantine | no | no |
| `execute_canon_write` | inline on enforced canon paths | inline on every in-scope canon write | `ALWAYS_RUN_INLINE` | hard fail / quarantine | yes | no |
| `post_write_proofs` | inline on enforced canon paths | inline on every in-scope canon write | `ALWAYS_RUN_INLINE` | rollback or fail closed | no | no |
| `ownership_trust_proof_guards` | inline in protected owner actions | inline on protected ownership/trust mutations | `ALWAYS_RUN_INLINE` | fail closed | no | no |
| `contracts_drift_audit` | manual command + CI drift workflow | local preflight + CI drift gate | `RUN_ON_PREFLIGHT` and `RUN_ON_CI_OR_DEPLOY` | non-zero on critical drift | no | no |
| `contract_scope_registry_sanity` | tests only | local preflight + focused runtime CI | `RUN_ON_PREFLIGHT` and `RUN_ON_CI_OR_DEPLOY` | non-zero | no | no |
| `runtime_coverage_sanity` | not automated before this pass | local preflight + focused runtime CI | `RUN_ON_PREFLIGHT` and `RUN_ON_CI_OR_DEPLOY` | non-zero | no | no |
| `contracts_runtime_tests` | manual test invocation | focused runtime CI and optional local invocation | `RUN_ON_CI_OR_DEPLOY` | non-zero | no | no |
| `quarantine_visibility_report` | manual DB inspection | repo command on review cadence | `RUN_ON_REVIEW_CADENCE` | visibility only | no | yes |
| `deferred_runtime_gap_report` | manual doc reading | repo command on review cadence | `RUN_ON_REVIEW_CADENCE` | visibility only | no | yes |
| `contract_index_reconciliation_visibility` | doc-only | review cadence via docs + scope sanity | `RUN_ON_REVIEW_CADENCE` | visibility only | no | yes |

## Notes

- `ALWAYS_RUN_INLINE` tasks must not depend on a separate manual command.
- `RUN_ON_PREFLIGHT` tasks are there to reduce founder memory before important work.
- `RUN_ON_CI_OR_DEPLOY` tasks are there to catch regressions before merge/deploy.
- `RUN_ON_REVIEW_CADENCE` tasks surface stale quarantine and deferred coverage debt without silently mutating canon.
