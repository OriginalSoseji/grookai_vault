# RUNTIME_COMMANDS_V1

Status: Active runtime support document

| command | automatic_or_manual | purpose | failure meaning |
| --- | --- | --- | --- |
| `npm run grookai:preflight` | manual before important work | drift + runtime health + coverage sanity | critical drift or runtime coverage failure |
| `npm run contracts:drift-audit` | automatic in CI + manual when needed | DB drift gate | critical drift present |
| `npm run contracts:runtime-health` | automatic in CI + manual when needed | scope registry + audit/policy/proof alignment | runtime coverage drift present |
| `npm run contracts:test` | automatic in focused runtime CI + manual when needed | targeted runtime regression suite | protection regression present |
| `npm run contracts:quarantine-report` | manual on review cadence | unresolved quarantine visibility | command failure means report could not be produced |
| `npm run contracts:deferred-report` | manual on review cadence | deferred runtime gap visibility | command failure means audited gap report could not be produced |

## What runs automatically inside writes

- in-scope canon writes run scope validation, pre-write validation, shared executor, and post-write proofs inline
- protected ownership/trust mutations run their proof guards inline

## What still requires explicit human invocation

- quarantine resolution
- human-approved canon promotion from ambiguous states
- repair or reconciliation flows that mutate truth
