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
Multi-target rows, duplicate products, duplicate proposed parents, and rows past
the batch limit stay in the measured backlog with explicit held reasons. They do
not turn a successful coverage measurement into a failed agent run.

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

The production direct-reader role is not activated. If the optional exact
planner rejects its connection or cannot produce a plan, the agent records a
fixed error code, reports zero newly verified exact candidates, and continues
the independent backlog measurement and founder-review lane. The failure does
not weaken the planner connection policy and does not use the broad production
credential as a substitute reader.

## Founder dashboard

The operations page reads the latest `operations_agent_runs.summary` for
`tcgplayer-pricing-completion-v1` and displays these Pokemon states separately:

- missing price rows and affected products;
- products queued for identity repair;
- single-target identities ready for founder review;
- exact candidates that passed the automatic structural gate.

The dashboard is observational. Missing telemetry is shown as unavailable and
does not imply that coverage is complete.
