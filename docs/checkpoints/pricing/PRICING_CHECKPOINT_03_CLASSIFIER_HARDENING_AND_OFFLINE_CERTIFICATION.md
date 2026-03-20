# PRICING_CHECKPOINT_03_CLASSIFIER_HARDENING_AND_OFFLINE_CERTIFICATION

## Date / Phase Context

Date context: `2026-03-19`

Phase context:

- `PRICING_OBSERVATION_LAYER_V1` had been implemented
- live validation was blocked by real eBay throttling and quota pressure
- the system now had the architecture needed for traceability, but the classifier still needed proof that it was separating raw listings from slab listings correctly

This checkpoint captures the decision to use offline certification, not additional live spend, as the hardening path.

## Why We Needed Offline Certification

Live eBay validation was insufficient for classifier hardening because every incremental debugging attempt consumed scarce Browse calls and still depended on upstream throttling behavior that Grookai does not control.

The system needed:

- deterministic inputs
- repeatable outputs
- zero external API dependence
- a way to prove classifier behavior before live traffic returned

That is what the fixture harness provided.

By using `backend/pricing/run_pricing_observation_fixture_v1.mjs` plus `backend/pricing/fixtures/pricing_observation_fixture_v1.json`, Grookai gained a controlled environment where the production classifier could be tested against synthetic but representative listings without spending quota.

## The First Offline Result And What It Proved

The first offline result was `PARTIAL`, not `FAIL`.

That distinction mattered.

What the first run proved:

- the observation layer itself was safe
- accepted rows stayed mapped
- rejected and staged rows stayed out of `v_pricing_observations_accepted`
- persisted comps were explainable

What it also revealed:

- the classifier still contained real logic defects

That was encouraging, because it showed the architecture was working while the logic above it still needed hardening. A `PARTIAL` result here meant the system was fixable through classifier refinement rather than architectural reversal.

## The Two Real Bugs We Found

The first `PARTIAL` run exposed two concrete bugs:

1. `Light Play` normalized to `mp` instead of `lp`
2. `Gyarados Base Set 6 Mint` falsely classified as graded

Later fixture expansion also exposed a related title-guard issue:

3. `Blastoise Base Set 2/102 Moderately Played` falsely hit the `wrong_set` path because `base set 2` was being matched too loosely inside a collector-number phrase

These were not hypothetical edge cases. They were the exact kinds of raw/slab and condition mistakes that would undermine trust if left unresolved.

## Why These Bugs Mattered

These bugs mattered because they hit the two most sensitive pricing boundaries:

- raw vs slab separation
- condition normalization

If `Mint` can accidentally imply grading, the raw lane becomes contaminated by slab semantics.

If `Light Play` collapses to `mp`, the raw lane may remain mapped and accepted while still distorting price quality.

These are precisely the kinds of subtle failures that make a pricing system look functional while degrading its trustworthiness.

## The Classifier Hardening Decision

The hardening decision was to keep the harness reusing production classifier helpers from `backend/pricing/ebay_browse_prices_worker.mjs` and to fix the production logic itself, not to create a separate test-only interpretation layer.

That led to several changes:

- exported reusable production classifier helpers
- reordered condition phrase evaluation from more specific to more generic
- split slab detection into explicit signal tiers
- tightened the `base set 2` guard so a real `2/102` collector-number phrase would not be mistaken for the different set name
- expanded fixture coverage to include raw-safe mint language, strong slab phrases, and ambiguous grade-like edge cases

This preserved one of the most important integrity rules of the harness:

- the harness certifies production behavior, not a copy of production behavior

## Why This Decision Mattered

This decision mattered because it converted the fixture harness from a debugging convenience into a certification gate.

Once the harness reuses the same classifier logic the worker uses in production, a passing offline result becomes meaningful architectural evidence. It is no longer a toy test. It becomes proof that the production classifier behaves correctly against the defined fixture pack.

That is why the final `PASS` result is durable. It certifies the actual logic path, not an imitation.

## Slab Signal Rules We Locked

The hardening pass locked three slab-detection classes:

1. Strong direct slab signals
   - `PSA`
   - `BGS`
   - `CGC`
   - `SGC`
   - `TAG`
   - `Beckett`
   - `graded`
   - `slab`
   - `cert`
   - `certificate`
   - `black label`
   - `pristine`

2. Grade-pattern slab phrases
   - `Gem Mint 10`
   - `Gem MT 10`
   - `Mint 10`
   - `Pristine 10`
   - `Black Label 10`
   - grader acronym + numeric score patterns such as `BGS 9.5`

3. Raw-safe condition words that must not imply graded by themselves
   - `Mint`
   - `Near Mint`
   - `NM`
   - `LP`
   - `Light Play`
   - `Lightly Played`
   - `Moderately Played`

This distinction is critical. A standalone raw-safe condition adjective must never be treated as slab evidence, while a true grade-pattern phrase must.

## Condition Normalization Rules We Locked

The hardening pass also locked ordering and meaning for condition normalization.

Important preserved rules:

- longer and more specific phrases must be checked before shorter and more generic ones
- `Light Play` and `Lightly Played` map to `lp`
- `Moderately Played` and related variants map to `mp`
- `Heavily Played` maps to `hp`
- `Damaged` and `DMG` map to `dmg`
- `Near Mint`, `NM`, and raw-safe `Mint` map to `nm`

The reason ordering matters is simple:

- if `played` is matched too early, `Light Play` collapses incorrectly

That exact failure occurred once and is now part of the certified regression boundary.

## Why The Harness Is Now A Certification Gate

After the hardening pass, the fixture harness became more than a debugging script.

It now acts as a certification gate because it proves:

- accepted rows remain fully mapped
- rejected and staged rows remain out of the accepted lane
- raw-safe mint language does not falsely imply slab
- strong slab phrases do imply slab
- condition normalization behaves correctly for the key phrase families Grookai depends on

The final offline result was `PASS` with:

- fixture mismatch count = `0`
- accepted observations fully mapped
- raw vs slab separation behaving as intended for the targeted pattern set

That makes the harness a durable guardrail future maintainers should run before changing classifier behavior.

## Alternatives We Rejected

This checkpoint explicitly rejected:

- spending more eBay calls to debug classifier behavior
  - rejected because quota scarcity and upstream throttling made live debugging wasteful and noisy

- keyword-only slab detection
  - rejected because generic condition words like `Mint` would create false slab classifications

- trusting live behavior without repeatable offline proof
  - rejected because the whole point of this checkpoint was to certify behavior independently of eBay availability

- duplicating classifier logic inside the harness
  - rejected because it would have created false confidence by testing a shadow implementation instead of production logic

## Final Result Of This Checkpoint

The final result was a `PASS` offline certification outcome for the observation layer plus classifier hardening path.

That means:

- the observation architecture is sound
- the original classifier defects were real and were repaired
- the fixture pack now covers key raw/slab and condition nuances
- future classifier edits have a repeatable certification harness available

This did not prove live eBay behavior end to end, but it did prove that the system’s internal interpretation logic could be certified independently of live source availability.

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- the fixture harness as a first-class certification tool
- reuse of production classifier helpers inside the harness
- the slab signal tiers
- the condition normalization ordering rules
- regression coverage for raw-safe mint language and grade-pattern slab phrases
- the principle that classifier hardening should be proven offline before it is trusted live

If future work weakens the harness or replaces it with ad hoc manual testing, it will undo one of the most important trust guardrails created in this phase.

