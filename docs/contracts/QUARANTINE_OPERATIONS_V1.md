# QUARANTINE_OPERATIONS_V1

Status: Active runtime support document

## Purpose

`public.quarantine_records` is a controlled holding lane for ambiguous or conflicting payloads that are blocked from canon.

Quarantine is preservation, not acceptance.

## Operational Rules

- unresolved quarantine rows must remain queryable
- unresolved rows must be visible by reason, contract, source, and age
- quarantine rows never become canon automatically
- resolution is explicit only
- historical payload snapshots remain immutable

## Service Surface

Runtime helpers live in:

- `backend/lib/contracts/quarantine_service_v1.mjs`

Supported operations:

- `insertQuarantine`
- `fetchUnresolved`
- `resolveQuarantine`
- `appendResolutionMetadata`

## Review Workflow

Use `fetchUnresolved` with grouped filters to inspect backlog by:

- `reason`
- `contract`
- `source`
- `age_bucket`

Expected review questions:

1. Is this payload truly ambiguous?
2. Is the active contract authority correct?
3. Can the payload be repaired through an approved flow?
4. Does a human approval decision need to happen before any canon mutation?

## Allowed Resolution Outcomes

- `rejected_no_action`
- `repaired_via_flow`
- `human_approved_promotion`

`human_approved_promotion` is still explicit human authority. The runtime must not infer it.

## Isolation Rule

Quarantine rows must never appear in:

- canonical reads
- external mappings
- pricing surfaces
- public surfaces
- search results as canon
- wall or section rendering

## Escalation Rule

If unresolved quarantine volume grows by one contract/source pair, that is a signal to audit the producing write path, not a reason to weaken the contract.
