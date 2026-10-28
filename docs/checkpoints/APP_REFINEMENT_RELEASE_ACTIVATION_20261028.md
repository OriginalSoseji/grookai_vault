# Integrated app release and intake activation — October 28

PR826 merged as `34ba25e2633fc329b3a1e68fb6e65623a2ea5959` with its exact
tested tree. Build508 passed normal commit/push checks and the hosted checks.
The production-signed release passed the isolated Android upgrade and recovery
journeys. The matching Samsung update was installed without uninstalling or
clearing account data. Final screen readback on that phone remains pending
because it is locked; installation is not a claim of that final readback.

Actual Android release QA opened a rendered Binder image in the system share
chooser and cancelled without sending. An unknown-condition copy retained SQL
NULL and opened with no condition selected. A failed purchase-lot save retained
its form entries; reconnecting and retrying created exactly one USD1.23 lot.
That saved lot survived a cold restart. This does not claim restart recovery of
an unsaved lot form. These checks did not change the founder's inventory.

Live web review saved exactly one disposable-account copy with the selected
printing, MP condition, USD1.11 cost and January 15, 2020 acquisition day.
Authenticated SDK readback verified those fields and unchanged pre-existing
copies. Refresh retained eleven copies without a duplicate.

PR828 merged as `9e0f1b69341884272ce39110a1b398b43be7cec5` with its exact
tested tree. It repaired the live Binder cover gallery and contribution contrast.
Normal checks passed 8,412 contract tests, 1,953 native tests with two existing
skips, analysis, web type checking, lint and strict build. All 18 applicable
hosted checks passed, including the 143-test browser suite. The native source
index remained identical to build508; no native rebuild was required.

The production domain serves that main commit. Live Binder verification retained
the native cover and order, displayed both artwork choices, and preserved the
4x4 web grid preference across reload. A signed-out request did not disclose
the private Binder title. No Binder mutation was made during this parity check.

Reviewed intake was activated through its existing audited control authority:
revision7 paused with an empty allowlist became revision8 enabled with an empty
allowlist. The ordinary authenticated write path then updated the same existing
QA lot without an allowlist exception or additional lot. Canonical counts were
172,404 card prints, 3,410 sets and 32,903 traits. Founder inventory writes: zero.
The earlier checkpoint's pending qualification and activation statements are
historical and are superseded by this result.

TCGplayer condition destinations and eBay active/sold searches are implemented;
their earlier Samsung verification is separate from the pending final508 screen
readback. Actual eBay seller linking, preparation and publication remain an
isolated, disabled implementation in progress. This checkpoint does not declare
the full app-improvement request complete.
