# CONTRACT_RUNTIME_LAYER_V1

Status: Active checkpoint

## Context

Grookai already had contract documents, checkpoints, and worker-specific fail-closed logic, but enforcement was fragmented:

- some rules lived only in docs
- some lived only in worker code
- some relied on DB constraints
- some drifted into non-authoritative names that never entered `docs/CONTRACT_INDEX.md`

The result was partial protection, weak traceability, and no single runtime layer that could block, quarantine, and log canon-affecting violations consistently.

## Problem

Without a runtime layer:

- a canon-affecting write could run without declared contract scope
- a worker could reference invented contract names
- ambiguous payloads could fail silently or get handled inconsistently
- post-write proof could be skipped
- compatibility drift could hide behind stale docs

## Risk

The system risks two failures at once:

1. under-enforcement: invalid canon writes slip through
2. overreach: automation starts deciding ambiguous canon truth on its own

The second failure is not acceptable. Runtime may protect canon truth. It may not define ambiguous truth.

## Decision

Introduce `CONTRACT_RUNTIME_LAYER_V1` with these components:

- audited contract scope registry
- pre-write validation
- deterministic precedence resolution
- violation ledger
- quarantine lane
- post-write proof execution
- drift audit scripts
- contract-to-code enforcement map

## Alternatives Rejected

### 1. Keep contracts as docs only

Rejected because documented-only rules do not stop invalid writes.

### 2. Add blind DB constraints everywhere

Rejected because live data debt is real:

- 11,852 active identity gaps
- 3,559 missing `gv_id`
- 152 duplicate `(source, card_print_id)` mapping groups

Blind constraints would break production behavior without a compatible migration path.

### 3. Let runtime auto-resolve ambiguous canon conflicts

Rejected because Grookai doctrine keeps ambiguous canon-shaping decisions under explicit human authority.

## Authority Boundaries

Runtime may:

- require declared contract scope
- verify scope names against `CONTRACT_INDEX`
- enforce audited invariants
- block invalid writes
- quarantine preservable ambiguous payloads
- log violations with evidence
- require post-write proof before execution is complete

Runtime may not:

- invent contract names
- treat non-index docs as authority
- promote quarantine into canon
- silently reconcile ambiguous canon conflicts
- redefine canonical truth outside approved contract scope

## Current Truths

- authoritative contract names come from `docs/CONTRACT_INDEX.md`
- exact checkpoint names come from real files under `docs/checkpoints` and `docs/release`
- `vault_item_instances` remains canonical ownership truth under `STABILIZATION_CONTRACT_V1`
- active identity uniqueness and `gv_id` uniqueness already have DB support
- several stronger invariants are still deferred because live debt exists

## Mandatory Invariants

1. no canon-affecting execution without declared contract scope
2. no invented contract names in runtime scope
3. no blind DB constraints
4. quarantine is not canon
5. ambiguous canon-shaping decisions remain under explicit human authority
6. post-write audit is required for canon-affecting writes
7. runtime scope must map only to real enforcement points

## Why It Matters

This layer changes contracts from passive guidance into active protection while keeping canon authority bounded:

- truth gets protected automatically
- ambiguity still gets escalated instead of guessed
- drift becomes visible
- enforcement becomes traceable
- production writes become safer without pretending the machine owns canon
