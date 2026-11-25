# Released stock during unresolved price recovery

Exact-head review of d5675664 identified a stale-price checkout path: a released
copy was truthy as an allocation, so both unresolved-price guards let it reach
stock allocation even while catalog synchronization was blocked. Stock correctly
treats released copies as eligible for a new allocation, which could expose the
old Square asking price after reselection.

The commerce worker now classifies null and released allocations consistently
at both barriers. It leaves the original stock service and SQL authority intact.
Existing preparing, active, review, withdrawing and sold handling remains
reachable. The release authority requires confirmed zero stock and no retained
stock operation, or cancellation of an unsent allocation. Saved uncertain
operations therefore remain recoverable in their existing allocation states.

Six real-service regression cases exercise stock preparation and the provider
adapter. The previous exact source fails all three new released-stock cases
(unresolved review, pause and a racing barrier), while withdrawal, accepted
operation readback and normal post-price allocation remain available. The fixed
source passes all43 focused commerce/stock tests with zero skips or failures.
The fixture provider is synthetic; no actual inventory or payment is created.

Evidence is versioned under the Square current-main1055 operator root:
`released-stock-before-v1.log`, `released-stock-fixed-v1.log`, and
`released-stock-regression-v1.json`. Full original commit/push hooks and
exact-head hosted/security/review qualification must rerun on the final fix.
All six SQL payloads, the615-file producer composition, branch preview blocks,
pricing freshness/coverage gates and schema-first release ordering are unchanged.
This fix grants no production migration or publication activation authority.
