# DEFERRED_RUNTIME_GAPS_V1

Status: Active runtime support document

## Command

- `npm run contracts:deferred-report`

## Source of Truth

- `docs/contracts/RUNTIME_WRITE_PATH_AUDIT_V1.md`

## Reported Classes

- `intentionally_deferred`
- `architecture_blocked`
- `not_yet_audited`
- `should_be_blocked_from_use`

## Report Contents

- deferred canon-affecting paths
- deferred ownership/trust-affecting paths
- source files
- risk level
- blocker type
- next action / reason

## Rule

Known gaps must stay explicit.
Deferred paths are allowed only when they remain audited, named, and visible.
