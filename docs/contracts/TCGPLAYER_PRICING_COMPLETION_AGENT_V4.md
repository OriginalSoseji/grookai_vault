# TCGPlayer pricing completion agent V4

## Purpose

The scheduled production agent measures pricing coverage every 15 minutes and
reports Magic and Pokemon identity-mapping lanes independently. The latest
successful measured run summary is the production source for the founder
operations dashboard; running and failed partial summaries cannot replace it.

## Pokemon review publication

When the read-only candidate enrichment step finds exactly one proposed
canonical parent for a Pokemon TCGPlayer product, the agent publishes one
bounded founder review item for the source-sync run. A batch contains at most
50 products. It binds the source pricing run, source sync, producer commit,
source observations, proposed parent identities, and candidate evidence.
For mixed promo groups that cannot inherit one group-level set, enrichment may
search the active Pokemon catalog by the exact printed coordinate and a
base-name alias derived from the untouched source title. This search is
review-only: it preserves source modifiers, never chooses between multiple
cross-set targets, and grants neither mapping nor publication authority.
Multi-target rows, duplicate products, duplicate proposed parents, and rows past
the batch limit stay in the measured backlog with explicit held reasons. They do
not turn a successful coverage measurement into a failed agent run.

Founder-adjudicated unsafe leads are retained in a checked-in reviewed-hold
registry. The scheduler suppresses a held lead only while its source product,
printed coordinate, subtype evidence, and proposed parent identity produce the
same frozen evidence fingerprint. A changed fingerprint reopens the lead for a
new review. Unchanged holds remain counted in telemetry but cannot repeatedly
occupy a new founder review batch.

Repeated schedules with identical evidence reuse the same work-item key and
fingerprint. The GitHub Actions run URI is retained as provenance but is not
part of the fingerprint, so a new scheduler invocation cannot create a new
review version by changing only its run URL.

The item is review-only. Approval records the founder's evidence decision and
does not queue an executor, insert an external mapping, create a canonical card
or printing, publish a price, or write customer state. Multi-target candidates,
empty batches, and batches larger than 50 fail closed. Exact mappings that pass
the existing deterministic planner continue through its separately governed
authority and apply gates.

An evidence upgrade may publish a versioned review item under the same source
sync after source adjudication. That item must bind the complete exact planner
records and a validating `MASTER_INDEX_MAPPING_AUTHORITY_V1` bundle. Its key
uses the `:master-authority-batch-01` suffix so the earlier identity-only review
remains auditable. Source subtypes must identify the reviewed Master Index
finish. Rows whose title implies a stamped or event variant while the source
subtype would route to Normal or Holo remain held, as do unnumbered rows without
exact printed-coordinate evidence.

The production direct-reader role is not activated. If the optional exact
planner rejects its connection or cannot produce a plan, the agent records a
fixed error code, reports newly verified exact candidates as unavailable, and continues
the independent backlog measurement and founder-review lane. The failure does
not weaken the planner connection policy and does not use the broad production
credential as a substitute reader.

Every run also preserves a credential-free Pokemon diagnostic export for all
queued products, including source metadata, bounded catalog context, and one
explicit no-candidate reason when no review target is found. This export has no
mapping or publication authority. It exists so the repair agent can advance the
entire queue without discarding products that failed candidate discovery.
When an otherwise matching parent is already mapped, is a variant, lacks unique
identity, or remains cross-set ambiguous, the diagnostic row includes bounded
reference targets and explicit blockers. Reference targets are evidence for a
later child-printing repair lane and can never enter the parent-mapping review
batch.

For the 2008 Countdown Calendar source group, every run also derives a frozen,
read-only special-printing proposal from those diagnostic references. The
proposal resolves the underlying expansion parent by exact name, number, and
verified printed total; ignores already-variant targets; and requires a matching
`stamped` fact in the checked-in English Master Index. It proposes a distinct
variant parent for the gold snowflake cards and for the silver Holo Pikachu,
rather than attaching the source product to the already-mapped base parent.
The proposal has no mapping, canonical-write, approval, or publication
authority. A separate guarded plan, rollback simulation, and production
readback remain mandatory before any database mutation.

The worker then attempts a separate read-only live plan for those proposed
Countdown Calendar rows. It verifies the base parent and finish child still
exist, the TCGPlayer product is still unmapped, the target parent/child IDs and
GV-ID do not collide, the finish key is active, and the canonical identity
projection has no active hash collision. Passing rows are ready only for a
transactionally rolled-back rehearsal. A plan outage is reported as
`COUNTDOWN_VARIANT_PLAN_UNAVAILABLE` and does not erase the pricing backlog or
weaken any gate.
The scheduled Countdown plan uses the agent's existing backend-only Supabase
secret through HTTPS for a bounded read-only service snapshot. It pins project
`ycdxbpibncqcchqiihfz`, enforces the rulebook maturity counts before reading any
proposed row, and contains no Supabase mutation call. It does not use the broad
database login as a substitute for the disabled exact-mapping reader. Because
the HTTPS reads do not share one database snapshot, the artifact records that
limit and can authorize only a transactional rollback rehearsal that rechecks
every invariant.

## Founder dashboard

The operations page reads the latest `operations_agent_runs.summary` for
`tcgplayer-pricing-completion-v1` and displays these Pokemon states separately:

- missing price rows and affected products;
- products queued for identity repair;
- single-target identities selected for founder review and candidates held for
  ambiguity or identity collisions;
- exact candidates that passed the automatic structural gate.

The dashboard is observational. Missing telemetry is shown as unavailable and
does not imply that coverage is complete.
