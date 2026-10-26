# Pokemon TCGPlayer Mapping Outcome V1

**Status:** Active
**Domain:** Pricing / external identity mapping
**Version:** V1

## Purpose

This contract converts a completed founder review of single-target Pokemon
TCGPlayer identity leads into a separate execution decision. The review
approval remains review-only. It never gains mapping authority retroactively.

The scheduled outcome publisher finds approved review items, reconstructs their
frozen plan payload, performs a read-only production preflight, and publishes a
new execution-enabled founder outcome. A second explicit approval authorizes
only the exact insert-only mapping batch shown in that outcome.

## Admission

An outcome may be built only when all of these conditions hold:

- the source work item is in `approved` state;
- its agent, work-item type, action, proposal kind, version, and plan
  fingerprint match the Pokemon pricing-review contract;
- it contains between one and fifty candidates;
- every candidate has exactly one target, complete source and target identity
  coordinates, and at least one bound source observation;
- the approved review also contains the complete exact-mapping candidate records
  and a `MASTER_INDEX_MAPPING_AUTHORITY_V1` bundle whose reviewed source bytes,
  parent manifests, mapping assertions, and candidate fingerprints validate;
- source product IDs and target `card_print_id` values are unique in the batch;
- the live preflight finds the source sync complete and reconciled, every source
  and target unchanged, every standard target identity unique, every evidence
  observation bound to the source sync, and no active-publication overlap;
- the live mapping state is either entirely absent or already present as the
  exact complete outcome. Partial or conflicting state fails closed.

The publisher paginates every approved review and existing outcome before it
applies its bounded run limit. It skips a review when an outcome with the same
source-sync key already exists. A legacy identity-only approval without the
reviewed Master Index mapping bundle is preserved and reported as blocked; it
cannot starve newer eligible approvals or become a write outcome. The publisher
may not replace, widen, or silently version an existing outcome.

## Founder decision boundary

The executable item uses the registered `founder_outcome_workflow_v1` command
path and requires recent founder authentication. Its two frozen stages are:

1. validate the package, source revision, review fingerprint, row count, and
   workflow scope;
2. apply and reconcile the exact mapping batch.

The command payload cannot introduce a script, SQL statement, endpoint, secret,
or environment override. Runtime behavior comes only from the reviewed code
registry at the frozen source commit.

## Write boundary

The writer may insert only active `source = 'tcgplayer'` rows in
`public.external_mappings` for the approved source-product and target-parent
pairs. It may not update or delete mappings, create cards or printings, write
prices or publications, alter customer state, or touch Vault data.

The writer runs through `run_canon_maintenance_v1`, requires the explicit apply
confirmation, verifies the production project, requires a clean frozen commit,
accepts only the canonical project's verified direct database host or session
pooler route, normalizes the direct route to the session pooler, uses a
serializable transaction, and shares the exact-mapping advisory lock.
Before opening a database connection it validates the embedded reviewed Master
Index mapping bundle. It validates the same authority against live parent rows
during preflight and immediately before commit, and binds the candidate,
manifest, review, mapping-source, and authority fingerprints into each inserted
mapping. It also verifies that the authority file did not change during the
transaction. It performs pre-commit readback, commits once, and then performs a
fresh durable readback. A complete already-applied batch with the same authority
and Master Index fingerprints is idempotent success. Any partial, foreign,
inactive, unreviewed, or changed mapping state fails closed and is not
automatically retried as a broader write.

## Pricing consequence

Mapping completion makes the reviewed products eligible for a later pricing
publication. This command does not write prices or move the current publication
pointer. Pricing coverage is complete only after a subsequent production price
run publishes eligible observations and the completion agent reports the
reduced backlog.

## Continuous operation

The outcome publisher runs every fifteen minutes behind
`FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE`. It processes bounded approved review
batches, preserves 90-day workflow evidence, and publishes no canonical write
by itself. The existing operations maintenance schedule claims an approved
outcome command, checks out its frozen commit, and runs the registered executor.

## Stop conditions

Stop without writing when any fingerprint, source revision, source sync,
identity coordinate, evidence observation, target uniqueness, mapping state,
publication overlap, TLS, project, transaction, or durable readback check does
not match the frozen authority.
