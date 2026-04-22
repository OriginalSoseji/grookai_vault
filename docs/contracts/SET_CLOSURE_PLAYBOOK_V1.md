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

10. App / web surfacing and searchability audit/repair
   - verify the set appears in the public web set catalog/list
   - verify the set appears in the app/mobile public set catalog/list
   - verify the public set detail route resolves by canonical set code
   - verify representative-image-backed cards render honestly where applicable
   - verify search works by canonical set code and set name on both web and app
   - verify partial-name-token search works where the current shared local search contract supports it
   - use only a bounded app/web visibility repair path
   - stop if the only available repair is a hardcoded set-specific exception or an unbounded global search refactor

11. Final set checkpoint / closure decision
   - record counts
   - record exact repair surfaces used
   - record bounded blockers if any remain
   - record surfacing/searchability proof alongside canon/mapping/image proof
   - do not claim closure unless the blocker state is explicit
   - example surfacing checkpoint shape: `docs/checkpoints/ui/me03_set_visibility_v1.md`

## App / Web Surfacing and Searchability

This is a formal closure phase, not an optional polish pass.

Before a set can be marked closed, all of the following must be verified.

### Web

- set appears in the public set catalog/list
- set detail route resolves by canonical set code
- representative-image-backed cards render honestly where applicable
- set is searchable by:
  - canonical set code
  - set name
  - partial name tokens where the current shared search contract supports them

### App

- set appears in the app/mobile public set catalog/list
- set detail opens successfully
- set is searchable by:
  - canonical set code
  - set name
  - partial name tokens where the current shared search contract supports them

### Shared rule

Valid canonical sets must not be hidden solely because:

- `release_date` is null
- imagery is representative rather than exact
- source-backed closure was used instead of legacy source lanes

## Closure Definition

A set is not CLOSED simply because canon exists.

A set is CLOSED only when:

- canon is correct
- mappings and images are handled lawfully
- the representative-vs-exact truth boundary is preserved
- the set is surfaced in web and app product surfaces
- the set is searchable by code and name
- the set is routable online by canonical set code
- a final checkpoint records the bounded proof

## Lessons Proven by Perfect Order (me03)

- visibility and discoverability are separate from canon correctness
- search and routing are independent closure surfaces
- representative imagery is sufficient for closure when truth is preserved
- `release_date ?? created_at` may be used as a sort-only fallback without falsifying display metadata
- canonical sets must be searchable by both code and name across web and app

## Stop Rules

Stop immediately if:

1. the only available repair path is global
2. a repair would collapse collision rows
3. a repair requires guessing instead of audited source truth
4. founder approval would be bypassed or simulated
5. image closure would assign identity-incorrect images
6. pricing visibility would require an unapproved global write
7. the set exists in canon but is missing from public web or app set catalogs
8. the set detail route 404s by canonical set code
9. web or app search cannot find the set by code and name
10. a visibility fix would require hardcoding a set-specific exception
11. the only visibility/search fix is a global or otherwise unbounded refactor
12. a valid set is excluded because `release_date` is null or imagery is representative

If a surfacing/searchability stop rule triggers, route the set into a bounded app/web visibility repair before closure.

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

A set is CLOSED only when all of the following are explicitly true:

1. the canonical `sets` row exists exactly once
2. expected canonical `card_prints` rows exist and the count is documented
3. promoted warehouse candidates are all in terminal success state
4. collision rows remain split correctly
5. blank-string `variant_key` rows are zero
6. product leakage is zero
7. mappings are complete or bounded exceptions are documented
8. image coverage is complete under exact/representative truth rules
9. representative-vs-exact truth is preserved
10. the set appears in the public web set catalog
11. the set appears in the app/mobile public set catalog
12. the set detail route resolves online by canonical code
13. search works by code and name on both web and app
14. no product leakage or identity drift occurred
15. a final checkpoint exists
