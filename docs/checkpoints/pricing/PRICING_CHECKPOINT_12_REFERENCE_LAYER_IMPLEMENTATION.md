# PRICING_CHECKPOINT_12_REFERENCE_LAYER_IMPLEMENTATION

## Severity

L2

## Date / Phase Context

Date context: `2026-03-20`

Phase context:

- the three-lane pricing model had already been checkpointed
- JustTCG had already been restricted to a reference-only role
- the projection lane already existed structurally, but its reference helper was still a placeholder boundary
- live eBay proof was still source-constrained by repeated upstream throttle

This checkpoint records the point where the reference lane stopped being only strategy and became a concrete read path in the product.

## What Problem This Checkpoint Solves

Before this checkpoint, Grookai had already decided that a reference lane was allowed, but it had not yet wired that lane into runtime behavior.

That left two problems unresolved:

- projection had no real external input
- the product had no safe way to show reference context when market truth was honestly empty

This checkpoint solves that by locking a minimal runtime implementation for the reference lane without allowing it to drift into truth authority.

## Why Reference Needed Safe Implementation

Reference needed safe implementation because an unwired lane creates pressure for shortcuts.

Without a formal implementation boundary, future work could easily start:

- blending vendor pricing into raw market truth
- using vendor values as silent fallback when Grookai has no accepted comps
- writing vendor values into the observation layer just because they are convenient

That would violate the exact pricing doctrine the earlier checkpoints were created to protect.

The reference lane needed to become usable without becoming authoritative.

## What Was Implemented

The following was implemented:

- `apps/web/src/lib/pricing/getReferencePricing.ts`
  - now performs a real JustTCG read when `JUSTTCG_API_KEY` is configured
  - resolves reference data as a read-only helper
  - returns a normalized reference contract with:
    - availability
    - source
    - PSA 10 reference value when safe
    - raw reference value when safe
    - updated timestamp
    - conservative reference confidence
    - explicit notes

- `apps/web/src/lib/pricing/getPricingProjectionState.ts`
  - now consumes the real reference helper output instead of a placeholder lane
  - still treats reference input as modeled-only projection input

- card detail trust surface
  - may show a secondary `Reference price` note only when:
    - accepted comps are zero
    - a usable JustTCG reference exists
  - that note is explicitly labeled as reference and does not replace the market price surface

Implementation detail preserved:

- if `JUSTTCG_API_KEY` is not configured, the helper fails soft and returns `referenceAvailable = false`
- the implementation prefers deterministic lookups when possible and only uses constrained search fallback when needed
- if JustTCG does not provide a clearly safe PSA 10-grade value, the helper remains conservative rather than pretending certainty

## Lane Separation Rules Preserved

This implementation preserves these rules:

- reference data never becomes Grookai raw market price
- reference data never enters `pricing_observations`
- reference data never weakens `accepted + mapped`
- reference data never changes trust labels for market truth
- reference data never changes comps semantics
- projection remains visibly modeled and separate from current price

These are structural rules, not wording preferences.

## Why This Decision Mattered

This decision mattered because it turns an architectural idea into a constrained runtime reality.

Grookai now has a usable reference lane that can support projection and secondary context without undoing:

- observation-first pricing
- explainability
- honest empty-market states
- truth/reference/projection separation

That matters because the most dangerous pricing regressions often happen at the first point where a non-authoritative source becomes operationally convenient.

This checkpoint exists to prevent that convenience from silently becoming authority.

## Alternatives We Rejected

This checkpoint explicitly rejects:

- blending reference into market truth
  - rejected because it would contaminate the raw market lane with vendor aggregate data

- using reference as fallback price silently
  - rejected because honest empty-market states are part of Grookai’s trust posture

- writing reference data into observation layer
  - rejected because the observation layer is reserved for Grookai-controlled market evidence

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- `getReferencePricing.ts` is a reference-only helper
- JustTCG remains non-authoritative unless a new audit and contract say otherwise
- reference values must always remain visibly secondary
- projection may consume reference, but market truth may not
- trust and comps stay attached only to the market-truth lane
- missing JustTCG configuration must fail soft, not break the pricing surface

If future work weakens those boundaries, it will violate both the reference-lane checkpoint and the three-lane pricing model.
