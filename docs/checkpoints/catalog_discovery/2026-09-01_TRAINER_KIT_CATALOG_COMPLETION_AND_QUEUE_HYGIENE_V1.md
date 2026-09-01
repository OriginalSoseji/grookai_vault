# Trainer Kit Catalog Completion And Queue Hygiene V1

## Status

`LOCKED_PARENT_IDENTITY_COMPLETE`

The HS Trainer Kit Raichu and Gyarados parent catalog identities are complete at
30/30, their phone-approved outcome commands succeeded with exact production
readback, stale founder reviews are superseded deterministically, and the final
read-only discovery reports zero actionable catalog gaps.

This checkpoint does not declare child printings, external mappings, exact
images, family-link review, pricing, or app publication complete for these sets.

## Context

Universal discovery found incomplete English Pokemon Trainer Kit sets even
though source evidence and parts of their canonical data already existed. The
founder workflow also accumulated older review-only and executable work items
for the same targets, which made the phone queue ambiguous.

The intended system boundary is:

1. sources and the Pokemon Master Index establish identity evidence;
2. discovery produces one current frozen outcome;
3. the founder approves that outcome from the phone;
4. an allowlisted executor applies only the frozen payload;
5. durable readback closes the command;
6. a new discovery proves the catalog gap is gone.

## Problem

- Two Trainer Kit sets remained incomplete at the parent identity layer.
- Superseded founder review items remained visible beside the current outcome.
- TCGdex's `miscp` source shell falsely appeared to be a missing set even though
  Ancient Mew already existed under Grookai's governed `misc` owner.
- Scheduled maintenance was active, but the two live commands were manually
  dispatched to avoid waiting for the next delayed GitHub schedule tick.

## Risk

An unsafe repair could duplicate existing cards, widen a phone decision into
unreviewed writes, create a second Ancient Mew catalog lane, overwrite existing
human-reviewed data, or claim unattended execution without evidence.

## Decision

- Supersede stale founder reviews without deleting their audit history.
- Execute only the two current, frozen, phone-approved Trainer Kit outcomes.
- Reconcile exact existing coordinates instead of rewriting them.
- Register `miscp -> misc` as a governed source alias, not as a new canonical set.
- Require a final read-only discovery from merged `main` to prove closure.
- Preserve the distinction between scheduled idle proof and manually dispatched
  live command execution.

## Alternatives Rejected

- Deleting old founder work items.
- Treating all prior approvals as current executable authority.
- Creating a second Miscellaneous Promos set or duplicate Ancient Mew row.
- Inferring child printings, finishes, mappings, images, or publication state
  from parent identity completion.
- Describing the manually dispatched commands as unattended schedule proof.

## Migration Applied

Migration:

`supabase/migrations/20260901190000_catalog_founder_review_supersession_v1.sql`

SHA-256:

`4fbb481ec28c8caad648876ea37e019cbe0f6695fabe97161ae8e115121fdabd`

Implementation:

- Pull request: `https://github.com/OriginalSoseji/grookai_vault/pull/369`
- Merged commit: `fe85ae18396abc3bd8d98b5a012b048adb13f49b`
- Migration dry run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33542893286`
- Migration apply/readback:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33543020276`
- Post-migration discovery:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33543190424`

The migration changed operations queue state only. It did not write canonical
cards, images, mappings, pricing, Vault data, or publication state.

## Phone Approval And Apply Proof

### HS Trainer Kit Raichu

- Work item: `92a90653-0f63-43a3-8f4d-e0b174299e49`
- Command: `78811e8a-f857-4788-bd3b-cb057fc9b8d9`
- Apply run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33544218883`
- Command status: `succeeded`
- Attempt count: `1`
- Durable reconciliation: `true`

### HS Trainer Kit Gyarados

- Work item: `f792d509-3f3c-4d59-9164-5da0ef0f9558`
- Command: `521cc34c-c82f-4173-b920-0fdbf4f25260`
- Apply run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33544496268`
- Command status: `succeeded`
- Attempt count: `1`
- Durable reconciliation: `true`

Each command expected and reconciled:

- 29 newly applied parent `card_prints`
- 29 newly applied active `card_print_identity` rows
- 58 newly applied active `card_print_identity_source_evidence` rows
- 29 newly applied active `card_print_family_review_queue` rows

Whole-set production readback after both applies:

| Set | Parent cards | Active identities | Active evidence | Active family reviews |
| --- | ---: | ---: | ---: | ---: |
| `tk-hs-r` | 30 | 30 | 58 | 29 |
| `tk-hs-g` | 30 | 30 | 58 | 29 |

The difference between 29 applied rows and 30 final parent rows is the exact
pre-existing parent coordinate that each writer reconciled rather than
duplicated.

The approved apply scope created no child printings, external mappings, Vault
rows, image pointers, pricing rows, publication snapshots, or release-control
rows.

## Ancient Mew Alias Repair

TCGdex exposes one card under `miscp`: Ancient Mew `001`. Production already
contained:

- canonical set: `misc`, Miscellaneous Cards & Products;
- canonical card: `GV-PK-MISC-001`, Ancient Mew;
- independent governed source evidence for the English movie promo lane.

The repair registered `miscp -> misc` as source ownership. It created no database
row and changed no canonical identity.

- Pull request: `https://github.com/OriginalSoseji/grookai_vault/pull/370`
- Merged commit: `ceb5874e405c88ff950d59416e808b145f2007c2`
- Targeted tests: `38/38` passed
- Protected GitHub checks: passed

## Final Discovery Proof

Final run:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/33549351887`

Producer commit:

`ceb5874e405c88ff950d59416e808b145f2007c2`

Results:

- run status: `completed`
- database mode: `read-only transaction`
- source requests: `126`
- source sets reconciled: `1,258`
- source failures: `0`
- actionable gaps: `0`
- canonical promotion candidates: `0`
- outcome targets: `0`
- founder work items published: `0`
- canonical writes: `false`
- Storage writes: `false`
- writer dispatches: `false`

Exact reconciliation:

- `tk-hs-r`: `exact_complete`, 30 expected, 30 canonical
- `tk-hs-g`: `exact_complete`, 30 expected, 30 canonical
- `miscp`: `exact_complete`, canonical owner `misc`, 1 expected, 1 canonical
- `miscp` promotion decision: `no_write_existing_canonical_owner`

Permanent artifact hashes:

- `summary.json`:
  `18479e98dc1c8382f51a750fecf29b484c42cfdd996fe103d00c527a93dd8393`
- `catalog_reconciliation.json`:
  `1d5c084adb67ee188606a83b2932a47ec51364f9cc596177640a3d6fa94378f9`
- `pokemon_master_index_reconciliation.json`:
  `5464b85cf5d83ac5c1adc984b0942f369a18b3017c384d6adf760a21c0b5edfc`
- `actionable_gaps.json`:
  `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`
- `canonical_promotion_candidates.json`:
  `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`

## Scheduled Maintenance Proof

The repository variable `FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE` is `true`.
The workflow is scheduled every 15 minutes.

A genuine scheduled run completed successfully:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/33536314567`

- event: `schedule`
- maintenance job: `success`
- dispatcher job: `success`
- queue state: idle
- command found: `false`
- executor invocation: skipped as designed

This proves unattended maintenance and idle command polling. It does not prove
that the Raichu and Gyarados commands were picked up by a schedule tick; those
two commands were manually dispatched after phone approval.

## Current Truths

- Both HS Trainer Kits are parent-identity complete at 30/30.
- Universal catalog discovery currently has zero actionable gaps across its
  governed source set.
- Ancient Mew already existed; `miscp` was an alias defect, not missing canon.
- No catalog work item or approved command remains for these three source codes.
- Queue history is preserved while stale reviews are no longer active work.
- Scheduled maintenance is enabled and has completed unattended idle cycles.

## Invariants

- The Pokemon Master Index precedes canonical reconciliation.
- A source alias never authorizes a duplicate canonical owner.
- Phone decisions authorize only their frozen work item and payload.
- One command attempt may not widen into adjacent sets or data surfaces.
- Existing exact coordinates are reconciled, not recreated.
- Discovery remains read-only and cannot apply canonical data.
- Command success requires exact durable readback.

## What Must Never Be Broken

- No deletion of audit history to clean a founder queue.
- No automatic execution of old review-only approvals.
- No duplicate `miscp` set or Ancient Mew identity.
- No inferred printings, finishes, mappings, images, or pricing from parent rows.
- No claim that manual workflow dispatch proves scheduled command execution.
- No app publication merely because parent identities are complete.

## Remaining Non-Launch-Critical Work

1. Resolve the 58 pending family reviews without inventing species links for
   non-species cards.
2. Acquire and self-host exact image evidence for parent-only rows.
3. Propose child printings only from exact finish and variant evidence.
4. Add external mappings only when exact printing identity is proven.
5. Reconcile set cover art, release metadata, and release controls separately.
6. Run signed-in search, set browser, and card-detail smoke tests after any
   future enrichment apply.
7. Upgrade GitHub actions that still target the deprecated Node 20 runtime.

## Explicit Next Gate

Return to launch-critical production readiness. Leave these Trainer Kit rows at
their current governed parent state. For the catalog automation itself, the next
proof is to let a future naturally generated, writer-ready command wait for the
scheduled dispatcher and verify unattended apply plus durable readback without
a manual workflow dispatch.
