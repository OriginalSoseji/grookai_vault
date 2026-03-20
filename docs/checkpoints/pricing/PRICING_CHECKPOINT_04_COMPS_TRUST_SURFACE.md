# PRICING_CHECKPOINT_04_COMPS_TRUST_SURFACE

## Date / Phase Context

Date context: `2026-03-19`

Phase context:

- observation-layer persistence had been implemented
- offline validation had passed
- live validation had failed closed on the first real eBay `429`
- the system still could not prove live comps from current source traffic, but it could already read persisted observations and expose them honestly

This checkpoint records the decision to build the comps trust surface before live pricing was fully proven.

## Why A Comps Surface Was Worth Building Before Full Live Proof

The comps surface was worth building before full live proof because the value of the observation layer is not only that it stores data. Its value is that it makes pricing evidence inspectable.

Waiting until live ingestion was fully stable would have delayed the exact surface needed to explain pricing once live comps were available.

The strategic insight was:

- trust surfaces should be built as soon as persisted evidence exists, not only after perfect market coverage exists

That allows Grookai to mature the language, grouping, and honesty of its pricing evidence display while the live source path is still being hardened.

## The User Trust Problem We Were Solving

Before the comps panel, the card detail page could show a price but not its evidence.

That meant a user or founder could not easily answer:

- what listings support this number?
- what listings were filtered out?
- is the market thin?
- is the system rejecting suspicious rows or just averaging everything it sees?

This is not a cosmetic trust problem. It is a pricing correctness problem. A number without evidence is harder to defend against both honest skepticism and manipulation narratives.

## The Product Decision We Made

The decision was to place a founder-safe comps panel directly on the signed-in card detail surface rather than wait for a larger admin redesign.

That gave Grookai a practical trust surface using current persisted data only:

- current displayed price
- accepted comps
- staged rows
- rejected rows
- empty / thin states

This was intentionally scoped as a trust/debug panel, not a polished marketing surface.

## Why This Decision Mattered

This decision mattered because it changed pricing from “a number the system shows” into “a number the system can begin to defend.”

Even when live ingestion is sparse or temporarily blocked, the existence of a comps panel forces the system to be honest about its evidence quality.

That is strategically important. A pricing system becomes stronger when it can visibly admit:

- there are no accepted comps yet
- the market is thin
- listings were filtered out for reasons

Those are not weaknesses to hide. They are signs that the system is taking correctness seriously.

## What The Surface Shows

`PRICING_COMPS_SURFACE_V1` added a normalized server read model and a card detail panel that show:

- current displayed price
- current price source and timestamp where available
- accepted comp count
- accepted price range
- latest observed timestamp
- accepted comps with:
  - title
  - price
  - shipping
  - condition bucket
  - observed timestamp
  - listing URL when available
- filtered rows grouped into:
  - staged
  - rejected
- filtering context such as:
  - `mapping_status`
  - `exclusion_reason`

This is backed by persisted DB truth only:

- `public.pricing_observations`
- `public.v_pricing_observations_accepted`
- the active card detail pricing read surface

## Why Honest Empty States Matter

Honest empty states matter because missing evidence is itself meaningful information.

If a card has:

- zero accepted comps
- only staged rows
- only rejected rows
- or no persisted observations at all

the UI must say that directly.

That is why messages like:

- `No accepted live comps yet`
- `No persisted pricing observations exist for this card yet`

are features, not deficiencies.

They prevent Grookai from implying certainty where the system does not yet have evidence.

## Why Filtered Rows Matter

Filtered rows matter because they prove the system is exercising judgment rather than blindly ingesting listings.

If the panel showed only accepted comps, the user could still assume:

- maybe the system just accepted everything
- maybe there was no real filtering logic

Showing staged and rejected rows with `mapping_status` and `exclusion_reason` makes the filter boundary visible.

That is important for:

- internal debugging
- founder review
- future user trust
- defending the system against accusations of naïve ingestion

## Why This Helps Defend Against Inflation

Inflation concerns are not solved only by better formulas. They are also mitigated by visible evidence and visible filtering.

The comps panel helps defend against inflation narratives because it shows:

- what was accepted
- what was rejected
- whether the accepted market is thin
- whether suspicious or mismatched rows were filtered out

That makes it harder for a price to look like an arbitrary black-box number.

It also creates a visible path for future outlier-control work: once suspicious accepted comps can be seen, they can be audited and tightened without pretending the system was already perfect.

## Why This Matters For Long-Term Grookai Value

Long-term Grookai value depends on more than market coverage. It depends on whether Grookai can become a pricing system that users believe is interpreting the market honestly.

The comps trust surface matters because it begins that relationship:

- the system shows its evidence
- the system shows what it filtered out
- the system admits when data is thin

That is the beginning of a closed-loop pricing system where:

- ingestion is persisted
- classification is explainable
- pricing is defensible
- trust is earned through visible evidence rather than opaque authority

## Alternatives We Rejected

This checkpoint explicitly rejected:

- showing only a number
  - rejected because a price without evidence is not a trustworthy pricing surface

- hiding sparse evidence
  - rejected because thin markets are real and should be shown honestly

- pretending missing market data is failure
  - rejected because an honest empty state is better than fabricated certainty

- waiting for perfect live proof before building trust UX
  - rejected because the trust surface itself is part of the system hardening path

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- the distinction between accepted comps and filtered rows
- honest empty and thin-market states
- the rule that the panel reflects persisted truth only
- the rule that missing evidence must never be replaced by fabricated evidence
- placement of pricing trust information close to the displayed price

If future revisions hide filtered rows, hide emptiness, or overstate evidence quality, they will weaken the exact trust property this checkpoint was created to protect.

