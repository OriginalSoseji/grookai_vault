# Pricing Checkpoint 23: TCGPlayer Exact Mapping Plan V1

## Context

Product V1.1 scope repair established a fixed eligible denominator of `32,700`
TCGPlayer product/subtype rows and `95.177%` mapped coverage. The remaining
`1,577` gaps include `1,416` rows whose source product has no active canonical
mapping.

Aggregate coverage already passes its threshold, but Product V1 still benefits
from repairing ordinary exact-printing gaps. Mapping repair must not collapse
distinct TCGPlayer finishes, promos, or distribution variants onto one
canonical base card merely because their names and collector numbers match.

## Problem

The source warehouse contains strong but uneven mapping evidence:

- some canonical cards embed an exact `tcgcsv:<group>:<product>` identifier
- some TCGPlayer groups already map consistently to one canonical set
- Shrouded Fable has duplicate canonical set records and needs reviewed set
  authority
- some products lack printed collector-number evidence
- some exact name/number matches have no active standard identity
- multiple TCGPlayer products can share one apparent canonical base target

A repair planner therefore needs to identify provable one-to-one candidates
without applying them and quarantine every ambiguous case.

## Risk

- mapping multiple finishes or promo distributions to one base card
- treating a unique name as sufficient without collector-number evidence
- targeting inactive or nonstandard canonical identities
- mapping products already represented elsewhere
- using a duplicate canonical set without reviewed authority
- turning projected coverage into a claimed production result
- allowing a planning command to mutate canonical or customer state

## Decision

`TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1` is the deterministic candidate
policy. It permits a candidate only when:

- Product V1.1 classifies the source product in scope
- the source has printed collector-number evidence
- the source has no active TCGPlayer mapping
- normalized card name and collector number both match
- the target is the canonical base variant
- the target has exactly one active `pokemon_eng_standard` identity
- the target has no active TCGPlayer mapping
- one exact source product resolves to one exact canonical target

Set authority can come from:

- an embedded TCGCSV identity
- a unique existing group-to-set consensus
- an explicit reviewed group-to-set authority

When multiple source products resolve to the same target, every colliding
candidate is blocked as
`multiple_source_products_match_same_canonical_target`. The planner does not
choose a winner.

## Alternatives Rejected

- applying every normalized name/number match
- mapping Pitch Black before active standard identities exist
- choosing between duplicate Shrouded Fable sets implicitly
- mapping multiple source products to one base card
- inferring a finish from source subtype labels without an exact child identity
- editing mappings while discovering candidates
- treating the projected coverage gain as completed production coverage

## Validation

- policy and planner syntax checks pass
- targeted planner contracts pass `8/8`
- the planner rejects `--apply`
- a static contract rejects mapping-write SQL
- the production scan runs inside `begin read only`
- final candidate source IDs, target IDs, and fingerprints are unique
- final planner findings: `0`

The first complete scan exposed `30` target collisions covering `60` source
products. That failed result is preserved. The policy was repaired to
quarantine those rows, and the same frozen evidence was replayed successfully.

## Read-Only Result

Frozen source evidence:

- source sync ID: `52068f31-2f07-4ad4-9000-83c4054d5b4a`
- coverage gap rows: `1,577`
- missing-mapping gap rows: `1,416`
- distinct source products reviewed: `1,066`

Final disposition:

- exact candidates: `274`
- blocked products: `792`
- projected covered gap rows: `443`
- database writes: `0`

Candidate lanes:

- reviewed group/set authority: `99`
- unique group/set consensus: `175`

Blocked reasons:

- missing printed number evidence: `208`
- missing unique set authority: `186`
- no exact set/name/number target: `205`
- target already has an active TCGPlayer mapping: `13`
- target lacks one active standard identity: `120`
- multiple source products share one canonical target: `60`

If every candidate passes a future apply/readback gate, the same fixed
denominator would project to `31,566 / 32,700`, or approximately `96.532%`.
That is a projection, not current production state.

## Current Truths

- the exact-mapping planner is read-only and passes its production evidence scan
- `274` candidates have deterministic one-to-one evidence
- no candidate has been applied or approved
- `792` source products remain visibly blocked
- Pitch Black remains blocked because its cards lack active standard identities
- special printing and finish collisions remain quarantined
- current production coverage remains `95.177%`
- the active canary remains unchanged and its 72-hour time gate is incomplete
- the current canary still contains two legacy Product V1.1 scope mismatches
- broader signed-in rollout remains blocked

## Invariants

1. Name matching alone never establishes canonical identity.
2. Collector number, set authority, identity status, and mapping state are
   required evidence.
3. One source product maps to one canonical printing, and one canonical target
   cannot silently absorb multiple source products.
4. Finish ambiguity remains blocked until exact child identity exists.
5. Planning and evidence collection never mutate mappings.
6. Projections never replace post-apply coverage and publication readback.

## What Must Never Be Broken

- exact card, language, printing, and finish authority
- Product V1 versus V1.1 scope separation
- one-to-one mapping integrity
- append-only, provenance-bearing mapping repair
- preservation of blocked evidence and failed planner results
- the frozen canary scheduler and current publication pointer

## Evidence

Passing permanent audit:

`docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_plan_v1/2026-07-28T10-38-25-697Z`

Preserved collision-failed audit:

`docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_plan_v1/2026-07-28T10-36-39-812Z`

Both contain row-level candidate/block evidence and SHA-256 artifact hashes.

## Explicit Next Gate

Build an explicit append-only apply/readback command, but do not run it before:

- all `274` candidates are re-read against current mapping and identity state
- before fingerprints reconcile with the frozen plan
- the command proves no source or target collision
- every insert carries source, method, confidence, run, and artifact provenance
- rollback is deterministic
- targeted mapping, RLS, and publication contract tests pass

Apply first to a bounded sample. Read back every mapping and rerun Product V1.1
coverage in shadow. Do not alter the active publication, deploy the repaired
policy to the scheduler, or start a new full shadow before the current 72-hour
canary window completes.
