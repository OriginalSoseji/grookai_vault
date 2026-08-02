# Pricing Checkpoint 42: Canary Source-Gap Policy Repair

## Status

Implementation and read-only proof complete. Deployment and canary restart are
not complete.

The July 31 replacement canary window is failed historical evidence. Its
August 1 and August 2 unattended publication cycles could not resolve one of
the 100 frozen exact source identities. The old worker aborted the entire
publication when that single current source row disappeared.

This checkpoint records a bounded source-gap policy that preserves all 100
frozen canonical identities while allowing currently unavailable source rows
to be accounted for explicitly. It does not declare the canary healthy, does
not deploy the repair, and does not start a new 72-hour window.

## Context

Canary V2 froze 100 reviewed card-printing identities. Its ordinal 7 is:

| Field | Value |
| --- | --- |
| Card | Alolan Ninetales SM128 |
| GV-ID | `GV-PK-SM-SM128` |
| Printing GV-ID | `GV-PK-SM-SM128-HOLO` |
| Card printing ID | `69886a4a-0514-40ac-85f4-3a8aabac1750` |
| TCGPlayer product ID | `168245` |
| Source subtype | `Holofoil` |

The exact identity was available when the July 31 replacement activation was
created. It was absent from the subsequent current source runs. The source
warehouse itself remained healthy; this was a current-feed availability
change, not a failed warehouse acquisition.

## Problem

The publication worker treated the fixed canary as both:

- a canonical denominator of 100 reviewed identities; and
- a requirement that all 100 exact source rows exist in every daily feed.

Those are different contracts. A source can temporarily remove an exact
product/subtype row without invalidating the other 99 identities. Aborting the
whole batch made all current prices age past the 36-hour publication window,
so a single missing source identity reduced the governed current read model
from 100 rows to zero.

The failed production evidence is:

| Evidence | Identifier |
| --- | --- |
| August 1 publication run | `157ed56d-f208-4680-8b3d-d0629b449dc1` |
| August 2 publication run | `a883b18b-c398-4fad-891d-de7fea0fdcb8` |
| Latest failed GitHub observer run | `30750934231` |

## Risk

Silently dropping the identity would mutate the frozen canary. Substituting a
sibling subtype or a historical row would publish unsupported evidence.
Continuing to abort all 100 would make the canary and current pricing read
model operationally brittle whenever an upstream product/subtype disappears.

A tolerant policy is safe only if it proves exact current-source absence,
keeps the canonical denominator fixed, bounds the number of gaps, and treats
mapping or provenance drift as fatal.

## Decision

### Preserve the fixed 100-identity denominator

Every canary definition entry must resolve to exactly one outcome:

- `resolved`: one exact current source candidate matches the frozen canonical
  and source identity; or
- `source_missing`: the exact product/subtype has zero rows in the same frozen
  current source run.

The 100 identities are not removed, replaced, or renumbered.

### Permit only bounded, proven current-source gaps

The maximum accepted source-missing count is five of 100. A sixth gap fails
closed. The limit is explicit in the publication worker, pipeline, scheduled
runner, run plan, artifacts, reconciliation, and observer policy.

### Forbid substitution

A missing exact source identity cannot be replaced by:

- a sibling subtype;
- a different finish;
- a historical source observation;
- a different canonical printing; or
- a similarly named product.

`source_missing` means not observed in the current exact source run. It does
not mean the printing does not exist.

### Keep mapping and provenance drift fatal

If the raw exact source row exists but no candidate is produced, the condition
is mapping drift, not source absence. Duplicate candidates, canonical identity
drift, source identity drift, and provenance drift remain fatal.

### Reconcile the active count to current availability

The canary definition count remains 100. Publication decisions, snapshots,
traces, and the governed current read-model count must reconcile to the latest
healthy run's `resolved` count. The observer must also reconcile all 100
ordinal outcomes and verify that each source-missing outcome contains current
source-run evidence.

## Alternatives Rejected

### Replace Alolan Ninetales again

Rejected because repeated membership replacement hides normal upstream
availability changes and destroys the fixed-denominator audit trail.

### Reuse the last known price

Rejected because Production V1 requires fresh current TCGPlayer marketPrice
evidence. Historical presence does not authorize current publication.

### Substitute another product subtype

Rejected because finish and subtype are part of the exact printing contract.

### Ignore any number of missing rows

Rejected because broad source degradation must still invalidate the run. The
bounded ceiling separates isolated availability gaps from systemic failure.

## Implementation

The repair is committed on
`agent/pricing-canary-source-gap-repair-v1` at:

`4eb22a9ea10cb9aa841f969c10ed113c83ee7019`

It adds the source-coverage resolver and carries the policy through the
publication worker, pipeline, scheduled runner, operations classification,
observer, contracts, and tests. Publication worker version is
`TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_4`; observer policy is V3.

No database migration or schema change is required.

## Frozen Read-Only Proof

A dry run was executed from the exact clean commit above against source sync
run `bd51c71b-951a-40ac-8933-9111e541b9a4`.

| Measure | Result |
| --- | --- |
| Frozen identities | `100` |
| Resolved | `99` |
| Source missing | `1` |
| Selected / eligible | `99 / 99` |
| Delayed / suppressed / quarantined / excluded | `0 / 0 / 0 / 0` |
| Reconciliation mismatches | `0` |
| Coverage reconciled | `true` |
| Publication-table writes | `false` |
| Current-publication activation | `false` |
| Canonical/Vault writes | `false` |

The sole `source_missing` outcome is Alolan Ninetales SM128 Holofoil, product
`168245`, with reason
`exact_product_and_subtype_absent_from_current_source_run`. No alternate source
identity was available or substituted.

Local artifact directory:

`.tmp/canary-source-gap-repair-frozen/TCGPLAYER-MARKET-CANARY-SOURCE-GAP-REPAIR-FROZEN-2026-08-02/`

Recorded hashes were recomputed after the run and all five matched:

| Artifact | SHA-256 |
| --- | --- |
| `run_plan.json` | `8f3dbde594049d29ac3f282340440ecc33c8904415f30432bf0ff806bee85725` |
| `summary.json` | `cf2a545f8a9d731cb65769f0da96793b883d712b4cf05803012e80826646eef1` |
| `qualification_decisions.jsonl` | `5f8ccc525c18ea27eb503618f91ff01c4e4f7b8892b71190fa28bd3e4ad0bb75` |
| `reconciliation.json` | `eb8946207c2cac47b2a43307624faa1c3285b3b4dfa639c20538a2b54c1dab4f` |
| `canary_source_outcomes.jsonl` | `7689ef4fd2550a6c74dbe00d0df859952df9d880be48a18d92fce199ce4b987e` |

## Verification

- focused pricing/canary suite: `60/60` passed
- complete contract suite: `903/903` passed
- syntax/import checks: passed
- `git diff --check`: passed before the implementation commit
- required shipcheck pricing, runtime, contract, and web stages: passed
- full shipcheck: did not pass because two unrelated existing Flutter golden
  comparisons failed (`lot ivory front renders and matches golden` and
  `sale ivory front renders and matches golden`)

No Flutter files are part of this repair.

## Current Truths

- The July 31 replacement window did not survive its unattended cycles and is
  failed history.
- The source warehouse is healthy.
- One frozen canary source identity is currently unavailable.
- The repair is committed locally but is not deployed to the production
  runner.
- The canary has not been restarted and has not passed.
- No database row, publication pointer, approval, or migration changed during
  this repair.
- Post-canary migrations and broader signed-in rollout remain blocked.

## Invariants

The following must never be broken:

- keep the frozen canonical denominator separate from current source
  availability
- require one reconciled outcome for every frozen canary ordinal
- prove source absence against the exact frozen current source run
- never substitute subtype, finish, product, printing, or historical evidence
- fail when raw source evidence exists but candidate mapping is absent
- fail on duplicates, identity drift, provenance drift, or more than five
  source gaps
- reconcile current publication and observer counts to the resolved count
- preserve failed windows as immutable history
- start a new 72-hour clock after any failed unattended cycle or runtime change
- do not apply post-canary migrations before a terminal passing artifact
- do not enable anonymous pricing before licensing and display authority pass

## Exact Next Gate

1. Push and review the exact repair commit.
2. Integrate and deploy that exact code lineage to the production pricing
   runner without unrelated changes.
3. Run a fresh preflight and activate a new canary under a new repair run key.
4. Prove the new activation writes exactly the current resolved count and
   records all 100 source outcomes with zero reconciliation mismatches.
5. Update the main-branch GitHub observer workflow to run the deployed V3
   observer and preserve the bounded source-gap setting.
6. Start a new uninterrupted 72-hour observation window. No time from the
   failed July 31 window counts.
7. Keep post-canary migrations, full signed-in rollout, and public access
   blocked until the new window produces a terminal passing artifact.

