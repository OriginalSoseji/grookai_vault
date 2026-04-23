# QUARANTINE_VISIBILITY_V1

Status: Active runtime support document

## Command

- `npm run contracts:quarantine-report`

## Report Contents

- unresolved quarantine count
- unresolved grouped by reason
- unresolved grouped by contract
- unresolved grouped by source
- unresolved grouped by age bucket
- oldest unresolved items
- stale unresolved count

## Age Buckets

- `0-1 days`
- `2-7 days`
- `8-30 days`
- `30+ days`

## Stale Visibility Rule

Any unresolved item in the `30+ days` bucket is stale and must remain obvious in the report.

## Safety Boundary

This report is visibility only.
It does not:

- resolve quarantine
- promote quarantine
- mutate canon

Quarantine may remain unresolved, but it may not become invisible.
