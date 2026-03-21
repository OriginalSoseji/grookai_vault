# PRICING_CHECKPOINT_08_PROJECTION_SYSTEM_V1

## Severity

L2

## Date / Phase Context

Date context: `2026-03-20`

Phase context:

- market truth was already locked to the eBay observation-backed lane
- trust summary and comps surfaces already existed on card detail
- JustTCG had already been audited and explicitly restricted to a secondary/reference role

This checkpoint records the decision to create a separate projection lane instead of letting external reference data drift into market truth.

## What Problem This Checkpoint Solves

Before this checkpoint, Grookai could show:

- current raw market truth
- trust state for current market truth
- accepted comps behind current market truth

But it could not cleanly answer a different question:

- what could this card be worth as a PSA 10

That question is useful, but it is not the same as current raw market truth.

This checkpoint solves that by creating a lane-separated projection system.

## Why Projection Needed Its Own Lane

Projection needed its own lane because grading upside is modeled value, not present-market truth.

If Grookai mixes projection and market truth into one number, it breaks the exact trust boundaries the pricing workstream has already locked:

- current market truth must remain explainable from accepted comps
- reference data must remain visibly non-authoritative
- modeled outputs must never masquerade as observed market evidence

The only safe structure was a separate projection lane with separate labels and separate semantics.

## Why JustTCG Could Not Become Market Truth

JustTCG could not become market truth because the JustTCG source audit already proved:

- it is not canonical identity authority
- it is not observation-first
- it is not comps-grade explainability
- it carries real dependency and change-risk as a vendor source

That makes it usable only as a reference input.

Projection can use reference data as one modeled ingredient.
Market truth cannot.

## The Lane Rules We Locked

The projection system locks these lane rules:

- eBay = market truth
  - accepted + mapped only
  - explainable comps only
  - current raw market price only

- JustTCG = reference only
  - optional
  - clearly secondary
  - never blended into market truth

- projection = modeled estimate only
  - may use reference inputs
  - must be visibly labeled as projected
  - must never feed back into raw market truth

- projected values must be visibly labeled
  - the UI must say projection/model/reference-backed clearly
  - it must not present projected PSA 10 value as the card’s current market price

## The Decision We Made

The decision was to add a deterministic projection helper and a separate card-detail projection summary.

V1 projection rules are intentionally simple:

- if raw market truth and PSA 10 reference both exist:
  - show projected PSA 10 value
  - show upside

- if reference exists but raw market does not:
  - show projected PSA 10 value only
  - do not fabricate upside

- if reference does not exist:
  - projection remains unavailable

This is not a grading EV engine.
It is a lane-separation contract.

## Why This Decision Mattered

This decision mattered because it lets Grookai answer a real collector question without weakening its pricing doctrine.

Projection is useful.

But usefulness only matters if the user can still distinguish:

- what the market says now
- what the system is modeling for a PSA 10 outcome

This checkpoint preserves that distinction explicitly.

## Alternatives We Rejected

This checkpoint explicitly rejects:

- blending reference into current market price
  - rejected because it would contaminate market truth with non-authoritative vendor data

- showing projected PSA 10 as current value
  - rejected because it would misstate present-market reality

- silent fallback from no-market to projected value
  - rejected because absence of raw market truth must remain visible

- letting projection influence trust/comps lane
  - rejected because trust/comps must remain tied to observed market evidence only

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- eBay remains the only market-truth lane
- JustTCG remains reference only unless re-audited and re-contracted
- projection remains modeled output only
- projection never feeds back into raw market truth
- projected values stay visibly labeled
- trust summary semantics stay tied to raw market truth only
- comps semantics stay tied to observation-backed current market evidence only
