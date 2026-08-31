# Founder Operations Manual Discovery And Maintenance Proof

## Result

The production control plane remains correctly disabled. Manual discovery and
maintenance are operational, but the review-item activation gate cannot be
completed until discovery produces a genuine authority-complete candidate.

## Discovery

- Production `main`: `1bda773a28d1fc444a6180a4cb27d29cb6b981eb`
- Workflow run: `33382816387`
- Run status: `completed`
- Source sets reconciled: `1,258`
- Source failures: `0`
- Apparent catalog gaps: `8`
- Canonical promotion candidates: `0`
- Founder review items: `0`
- Database, canonical, Storage, and writer-dispatch writes: `0`

The eight apparent gaps were all blocked by Pokemon Master Index authority.
They include incomplete Trainer Kit or promo shells and legacy source rows that
do not yet have independently complete card evidence. They are not eligible to
be presented as ready-for-approval sets.

## Source Reliability Repair

PR `#340` restored TCGdex availability resilience without changing source
authority. The v2 API remains preferred. If the API is unavailable, discovery
uses a sparse clone of TCGdex's official `cards-database` repository and pins
every result to the exact provider commit.

The live fallback proof returned `199` English paper sets in `16.09` seconds,
excluded all Pokemon TCG Pocket sets, and produced no missing total counts.

## Maintenance

The service-only maintenance RPC ran once at
`2026-08-31T10:40:27.915199+00:00`.

- Expired work items: `0`
- Expired commands: `0`
- Expired leases: `0`
- Stale incidents opened: `0`
- Stale incidents recovered: `0`

Post-readback remained zero for work items, decisions, commands, agents,
incidents, agent runs, and command attempts.

## Preserved Boundary

`FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE` remains unset. Scheduled review-item
publication and scheduled maintenance remain disabled. No test candidate was
fabricated, no founder decision was impersonated, and no canonical writer was
enabled.

## Exact Next Gate

1. Let scheduled artifact-only discovery continue.
2. When it emits an authority-complete canonical promotion candidate, freeze
   the source run, candidate, evidence hashes, and plan fingerprint.
3. Publish exactly one review-only work item.
4. Inspect it in an authenticated mobile client and record a review-only
   fingerprint-bound decision.
5. Prove the decision creates no command and invokes no canonical writer.
6. Only then enable the repository activation variable.
