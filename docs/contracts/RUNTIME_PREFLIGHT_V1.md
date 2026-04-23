# RUNTIME_PREFLIGHT_V1

Status: Active runtime support document

## Command

- `npm run grookai:preflight`

## What it runs

- contracts drift audit
- contract scope registry sanity
- runtime coverage sanity against `RUNTIME_WRITE_PATH_AUDIT_V1`

## Output States

- `PASS`
  - no critical drift
  - no runtime health failures
  - no known deferred debt or deferred runtime gaps
- `PASS_WITH_DEFERRED_DEBT`
  - no critical failure
  - deferred debt or explicitly deferred runtime gaps remain visible
- `FAIL`
  - critical drift exists
  - or runtime health / scope / coverage sanity failed

## Guarantees

Running preflight tells the truth about:

- whether critical drift currently blocks safe progression
- whether runtime scope and runtime coverage still match the audited write-path inventory
- whether deferred debt remains present

## Non-Guarantees

Preflight does not:

- mutate canon
- repair drift
- promote quarantine
- replace targeted worker or product testing

## Operational Rule

Important work should start from `npm run grookai:preflight`, not from remembering separate safety commands by hand.
