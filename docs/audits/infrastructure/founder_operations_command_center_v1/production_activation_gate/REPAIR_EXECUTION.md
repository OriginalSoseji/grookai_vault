# Founder Operations Production Repair

## Result

The additive Founder Operations repair migration was applied to production from frozen commit `ea998c1f5ff18d55f8cd701b2bf793c3e2aae464`.

- Migration: `20260831054500_founder_operations_command_center_repair_v1.sql`
- SHA-256: `ce541b5db59618ed223739d3f545da7d1807fe747901721b4dbece55c64aa892`
- Migration ledger: exactly one row, remote head `20260831054500`
- Automation: disabled

## Repairs

1. Decisions that mutate a work item are row-locked and accepted only while the item is `ready_for_review` or `deferred`.
2. A failed command whose execution deadline has passed cannot be retried.
3. `needs_action` counts use the same due-time and viewer-snooze policy as the work-item list.
4. Publisher runs report `running` before work-item publication, `succeeded` only after all items publish, and `failed` after a partial publication error.

## Verification

Disposable PostgreSQL executed the base migration, repair migration, original runtime smoke, and focused repair smoke. The focused proof confirmed:

- queued item remained `queued` after a rejected stale decision attempt;
- expired retry item remained `failed`;
- future-deferred item visibility was `0` in `needs_action`.

Repository checks passed:

- targeted contract tests: `17/17`
- secret-key guard: passed
- full repository shipcheck: passed, including web build, Flutter analysis, and `645` Flutter tests

Production readback confirmed both repaired RPCs, security-definer posture, expected authenticated grants, denied anonymous execution, and zero operational rows except the existing control-state singleton.

## Preserved Boundary

No catalog, pricing, Vault, Storage, work-item, command, approval, or activation data was written. `FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE` remains unset.
