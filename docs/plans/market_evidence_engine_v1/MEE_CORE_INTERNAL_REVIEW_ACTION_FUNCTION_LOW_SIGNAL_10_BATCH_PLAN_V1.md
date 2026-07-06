# MEE Core Internal Review Action Function Low Signal 10 Batch Plan V1

Status: plan only

## Objective

Prepare a controlled 10-row invocation package for `public.apply_market_evidence_review_action_v1`.

## Selected Action

`confirm_monitor_only` against ten eligible `low_signal_monitor` dispositions.

## Safety

- The apply SQL is not executed by this plan.
- Every function call includes a captured `expected_updated_at` optimistic-lock value.
- Every action payload is package-tagged for exact readback and rollback targeting.
- The rollback candidate targets only package-tagged events and captured disposition rows.
