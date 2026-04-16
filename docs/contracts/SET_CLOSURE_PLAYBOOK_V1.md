# SET_CLOSURE_PLAYBOOK_V1

Status: ACTIVE  
Scope: one-set closure after governed canon promotion

## Purpose

This playbook defines the repeatable sequence for closing a newly promoted set without widening into unsafe global repair or bypassing founder authority.

## Sequence

1. Source audit
   - prove the set lane exists
   - classify singles vs product rows
   - confirm whether source presence is lawful for promotion planning

2. Singles/product classification
   - isolate valid singles
   - exclude product and misc noise
   - document exact counts

3. Collision rule definition if needed
   - detect same-set + same-number + same-name collisions
   - classify finish-only vs identity-bearing splits
   - require deterministic `variant_key` for identity-bearing rows

4. External discovery bridge
   - bridge source-backed candidates into `canon_warehouse_candidates`
   - preserve claimed identity, reference hints, provenance, and proposed variant identity
   - keep the bridge dry by default and one-set scoped

5. Warehouse source-backed intake
   - classify source-backed candidates lawfully without image evidence when identity is structurally proven
   - keep base rows at `variant_key = NULL`
   - block unresolved collision groups instead of collapsing them

6. Founder-gated staging
   - prepare write plans and staging rows
   - do not auto-simulate founder approval
   - founder approval must remain explicit

7. Canonical promotion
   - bootstrap the set only after approval is explicit
   - run bounded dry run first
   - run bounded apply only against the approved set scope
   - verify collision integrity immediately after apply

8. Mapping closure audit/repair
   - count active mappings by source
   - identify unmapped canon rows
   - use the narrowest existing one-set mapping worker
   - preserve `variant_key` identity during mapping

9. Image closure audit/repair
   - audit canon image coverage
   - prove whether the governing source actually exposes usable image fields
   - use only an existing one-set image repair path
   - if no scoped governed path exists, stop and record the blocker

10. Final set checkpoint
   - record counts
   - record exact repair surfaces used
   - record bounded blockers if any remain
   - do not claim closure unless the blocker state is explicit

## Stop Rules

Stop immediately if:

1. the only available repair path is global
2. a repair would collapse collision rows
3. a repair requires guessing instead of audited source truth
4. founder approval would be bypassed or simulated
5. image closure would assign identity-incorrect images
6. pricing visibility would require an unapproved global write

## No-Global-Run Rule

One-set closure work must remain one-set scoped. If the only available worker for a repair step is global-only, do not run it implicitly as part of closure. Record the blocker or seek explicit approval for the global operation.

## No-Auto-Promotion Rule

Source-backed or user-backed candidates may be auto-classified and prepared, but canon execution must remain founder-gated. Staging is not approval.

## Variant Key Null Rule

Base identity is represented as:

- `variant_key = NULL`

Never use:

- `variant_key = ''`

Collision-resolved identity-bearing rows must carry deterministic non-null snake_case keys.

## Collision Handling Rule

If rows share:

- same set
- same printed number
- same printed name

and are still distinct real cards because of identity-bearing rarity/illustration differences, they must become separate canonical rows with:

- unchanged base `name`
- same printed number
- distinct `variant_key`

Do not collapse them. Do not demote them into child printings.

## Closure Checklist

A set is closure-ready only when all of the following have been audited:

1. `sets` row exists exactly once
2. canonical `card_prints` count is sane and documented
3. promoted warehouse candidates are all in terminal success state
4. collision rows remain split correctly
5. blank-string `variant_key` rows are zero
6. product leakage is zero
7. mapping coverage is complete or the exact blocker is documented
8. image coverage is complete or the exact blocker is documented
9. pricing visibility is either repaired safely or explicitly documented as non-blocking
10. a final checkpoint captures what was done and what remains
