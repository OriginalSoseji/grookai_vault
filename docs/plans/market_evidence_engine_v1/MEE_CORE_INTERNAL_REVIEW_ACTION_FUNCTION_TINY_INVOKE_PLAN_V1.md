# MEE Core Internal Review Action Function Tiny Invoke Plan V1

Status: plan only

## Objective

Prepare the smallest possible controlled invocation package for `public.apply_market_evidence_review_action_v1`.

## Selected Action

`confirm_monitor_only` against exactly one `low_signal_monitor` disposition that is already `resolved / monitor_only`.

## Safety

- The apply SQL is not executed by this plan.
- The apply SQL includes the captured `expected_updated_at` optimistic-lock value.
- The action payload is package-tagged for exact readback and rollback targeting.
- The rollback candidate targets only the package-tagged action event and captured disposition row.

## Next Step After This Plan

Approve a tiny apply only if the preflight SQL still returns `eligible_target_rows = 1`.
