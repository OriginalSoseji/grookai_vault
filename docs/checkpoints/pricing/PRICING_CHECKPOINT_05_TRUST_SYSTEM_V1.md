# PRICING_CHECKPOINT_05_TRUST_SYSTEM_V1

## Severity

L2

## Date / Phase Context

Date context: `2026-03-19`

Phase context:

- the observation layer had already been implemented
- offline validation had already passed
- the first live validation had failed closed on a real `429`
- the card detail page already had a comps panel, but pricing trust still required opening the evidence surface to understand whether the market was active, thin, stale, or absent

This checkpoint records the decision to move pricing trust into the at-a-glance price surface itself.

## What Problem This Checkpoint Solves

Before this checkpoint, Grookai had:

- a displayed price
- a persisted evidence layer
- a comps panel

But a user still had to open the comps surface before understanding whether the price had:

- enough evidence
- recent evidence
- a real market behind it
- or no accepted comps at all

That was not good enough for a truth-first pricing surface. Trust needed to be visible at the same level as the price, not buried in a secondary panel.

## Why The Comps Panel Alone Was Not Enough

The comps panel was necessary, but not sufficient.

It solved evidence visibility once a user opened it. It did not solve glance-level trust comprehension.

That meant the product could still force a user to do interpretive work before answering basic trust questions:

- Is this market active or thin?
- Is this evidence fresh or stale?
- Does this price have strong support or weak support?

A trust-first system should not require a user to inspect all rows before understanding whether the price deserves confidence.

## Why Trust Had To Be Visible At A Glance

Trust had to be visible at a glance because the price itself is a truth surface.

If the product shows a number without immediate market-state context, the user is asked to infer certainty that the system may not actually have.

This is why the trust system was not treated as visual polish. It is part of pricing correctness because it turns the surface from:

- “here is a number”

into:

- “here is a number, here is how much evidence exists, here is how recent it is, and here is whether the market is active, thin, or absent”

## The Decision We Made

The decision was to add a deterministic trust-state helper and a compact trust summary on card detail, backed only by persisted observation data already in the repo.

The trust summary was placed near the displayed price on signed-in card detail because that was the smallest truthful placement that fit current product structure without inventing a broader new admin system.

The comps panel remains the evidence layer.

The trust summary is now the glance-level interpretation layer above it.

## Why This Decision Mattered

This decision mattered because it prevents the main price from overclaiming certainty when market evidence is sparse or stale.

The trust summary makes the product say, immediately and honestly:

- active vs thin vs none
- high vs medium vs low vs none
- fresh vs aging vs stale vs unknown

That turns trust into a system-level property of the card detail page instead of leaving it hidden in a lower evidence panel.

## Trust Rules We Locked

The trust system locked these deterministic rules:

### Market-state rules

- `active`
  - accepted comps >= 3

- `thin`
  - accepted comps = 1 or 2

- `none`
  - accepted comps = 0

### Confidence rules

- `high`
  - accepted comps >= 8
  - and latest accepted observation <= 3 days old

- `medium`
  - accepted comps between 3 and 7
  - and latest accepted observation <= 7 days old

- `low`
  - accepted comps between 1 and 2
  - or accepted comps exist but the latest accepted observation is older than 7 days

- `none`
  - accepted comps = 0

### Freshness rules

- `fresh`
  - latest accepted observation <= 2 days old

- `aging`
  - latest accepted observation between 3 and 7 days

- `stale`
  - latest accepted observation > 7 days

- `unknown`
  - no accepted observations

### Honest empty / thin / stale states

- zero accepted comps must show:
  - `No active market`
  - `No accepted live comps yet`

- one or two accepted comps must show:
  - `Thin market`
  - `Low confidence`

- stale accepted evidence must show:
  - `Stale`
  - and must not be masked as fresh

These rules are intentionally simple. They are deterministic trust labels, not a fake-scientific scoring engine.

## Alternatives We Rejected

This checkpoint explicitly rejected:

- showing only a price
  - rejected because the main surface would still hide whether the market had real support

- hiding thin-market conditions
  - rejected because low evidence density is important truth, not embarrassing UI noise

- pretending stale data is fresh
  - rejected because freshness is part of defendability

- fake precision scoring without evidence
  - rejected because the repo does not yet support a trustworthy high-resolution trust score

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- the locked deterministic market-state rules
- the locked confidence rules
- the locked freshness rules
- honest empty, thin, and stale labeling
- the rule that trust labels come only from persisted observation evidence
- the distinction between the trust summary and the deeper comps evidence layer

If a future revision overstates certainty, hides thin markets, or invents precision beyond the persisted evidence, it will directly violate the trust-first doctrine this checkpoint exists to protect.

