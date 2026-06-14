# English Canon Completion Retrospective V1

Date: 2026-06-14

## Status

This is institutional memory for the English Master Index and live DB reconciliation milestone.

This document is not an apply plan. It does not authorize database writes, migrations, cleanup, quarantine, public hiding, or future global reconciliation.

## Why This Was Needed

The original problem was not one bad import, one bad set, or one bad finish. The original problem was that Grookai did not yet have a complete independent English reference system strong enough to govern canonical printing truth.

The visible symptoms were:

- APIs disagreed or had incomplete finish detail.
- Fake finishes existed in the database.
- Legacy workers had overgenerated printings.
- Reverse holo and holo rows existed where the evidence did not support them.
- Stamped variants were inconsistent.
- First Edition modeling was inconsistent.
- Source aliases and subset identities could drift between providers.

The deeper risk was credibility. Grookai could not safely tell collectors what existed until Grookai had a source-backed answer for what should exist.

## What We Built

The English Master Index became the governed reference layer for English Pokemon card identity and printing truth.

The workflow evolved into:

1. Build external evidence.
2. Preserve volatile source evidence.
3. Classify facts through the Verified Master Set Index contract.
4. Separate card identity truth from finish truth.
5. Compare Grookai read-only against the index.
6. Prepare narrow transaction artifacts.
7. Execute rollback-only dry runs.
8. Apply only approved packages.
9. Verify post-apply state.
10. Checkpoint the result.

The key milestone is that live physical English reconciliation reached:

| metric | value |
| --- | ---: |
| unsupported_rows | 0 |
| set_unmapped_rows | 0 |
| candidate_printings | 0 |
| conflicts | 0 |
| master_verified_cards | 21,511 |
| master_verified_printings | 38,893 |
| current reconciliation support printings | 38,901 |

Metric note: `master_verified_printings` comes from the current source agreement report. `current reconciliation support printings` comes from the live unsupported-reconciliation lane report and includes the final routed support facts used by the DB reconciliation check.

## What We Learned

First Edition is a parent identity modifier, not a finish.

That decision prevented a bad finish taxonomy expansion. First Edition cards still have finishes like normal or holo. First Edition changes the printed identity, not the physical finish key.

Generic stamped is not a finish.

Stamped is an identity or product/distribution modifier. The active child finish still needs to be normal, holo, reverse, cosmos, cracked ice, or another real finish. Treating generic `stamped` as a finish would have hidden the real problem instead of modeling it.

Source preservation matters.

Live APIs and web pages are volatile. A source disappearing or returning fewer rows cannot be allowed to erase previously validated evidence. Cached source rows and preservation fixtures were not convenience artifacts; they were governance infrastructure.

Volatile sources require preservation fixtures.

Price guides, marketplace pages, checklist pages, and API responses can all move. Preserved fixtures let the pipeline remain deterministic while still allowing live sources to add evidence.

Guardrails prevented multiple regressions.

Non-regression floors, candidate/conflict ceilings, rollback-only dry runs, fingerprints, SQL hashes, and post-apply readbacks repeatedly stopped unsafe assumptions from becoming canonical.

Reconciliation must separate identity truth from finish truth.

Many hard cases looked like finish problems at first. They were actually identity problems: suffix cards, subset aliases, First Edition, stamped variants, prize pack variants, host/subset rows, and parenthetical trainer qualifiers.

## What Almost Went Wrong

PKG-02B collision lane almost turned a broad beta package into an unsafe write. Splitting it into non-colliding work, dependency transfer, and number-key identity modifier work kept the apply path controlled.

Staging rebuild regressions almost caused source evidence loss. The fix was the live-plus-snapshot union invariant: live source availability may add rows, but live volatility must not delete or hide cached snapshot evidence.

Source volatility repeatedly threatened determinism. PokemonTCG aliases, web page availability, marketplace titles, and local TLS behavior all proved that the pipeline could not depend on a single current fetch.

Fixture metadata failures mattered. Evidence without URL, source kind, set key, card number, card name, finish key, and retrieval context is not durable enough to govern truth.

Stamped taxonomy uncertainty could have created a fake `stamped` finish. The correct model was stamped identity plus active real finish.

First Edition could have become a fake finish family. The correct model was parent identity modifier plus normal/holo child finishes.

DB reconciliation could have drifted from the Master Index. The package system forced every write to prove its scope, fingerprint, rollback behavior, and post-apply state.

## What Worked

The core pattern worked:

```text
Audit -> Contract -> Dry Run -> Apply -> Verify
```

Package-based execution worked because each write had a narrow blast radius. It allowed large catalog convergence without a global apply.

Non-regression floors worked. They kept master-verified counts, evidence rows, candidate counts, and conflicts from silently moving backward.

Rollback artifacts worked. They made each package inspectable before durable writes.

Preservation fixtures worked. They turned volatile source work into repeatable evidence.

Governance-first modeling worked. The biggest wins came from modeling rules correctly before writing rows.

Checkpointing worked. Without checkpoint files, this process would be impossible to understand after the fact.

## Rules We Should Keep

- Build the reference first. Reconcile only after the target is complete enough for the scope.
- Never promote API-only finish truth.
- Never infer finish rows from era, rarity, or broad set rules.
- Do not treat marketplace title text as truth unless it proves exact set, number, name, and finish.
- Do not let live source volatility reduce preserved evidence.
- Model identity modifiers separately from physical finishes.
- Keep suppression/adjudication reports visible.
- Keep dry-run and real-apply scripts separate.
- Require fingerprints and post-apply proof for every write.
- Do not use global apply for catalog convergence.

## If I Had To Do Japanese Tomorrow

I would not start by scraping or importing everything.

I would start by writing a Japanese Master Index contract that defines scope before evidence collection begins:

- language code and release-region scope
- Japanese set identity rules
- promo family rules
- deck/product-only rules
- mirror/reverse/holo terminology
- stamped and tournament distribution identity rules
- parallel taxonomy
- first-edition or edition-mark equivalents, if any
- source priority and preservation rules
- what counts as complete, incomplete, non-standard, or blocked

I would build the set registry before card facts.

Japanese releases have different product structures, promo families, deck releases, gym/tournament distributions, and special packs. The set registry must be governed first, or every later comparison will be polluted by alias problems.

I would build source preservation from day one.

No live-only phase. Every source adapter should produce preserved evidence snapshots immediately, with canonical alias remapping before dedupe. The invariant should be active from the first run:

```text
Live evidence may add rows, but it must not delete or hide preserved evidence.
```

I would separate identity from finish even more aggressively.

Japanese cards will likely expose more product, stamp, event, deck, and campaign identity variants. The default answer should be parent identity modifier unless the source proves a physical finish.

I would not try to reconcile the DB until the Japanese reference is mature.

The English work proved the danger of reconciling against an incomplete target. For Japanese, the first deliverable should be a publishable reference index with explicit blocked lanes, not DB writes.

I would create source-family adapters in priority order:

1. Official Japanese Pokemon card database.
2. Bulbapedia and other human-readable set/checklist pages.
3. TCGCollector/Pokellector-style checklist sources where Japanese coverage is explicit.
4. Marketplace/catalog sources only as secondary evidence.
5. PriceCharting/eBay-style sources only for preserved review lanes unless exact set, number, name, and finish are proven.

I would create a Japanese finish taxonomy review before accepting any finish key expansion.

No finish key should be added because a source label exists. Every finish key needs a canonical display strategy, source-label aliases, and examples.

I would run one hard-mode pilot first.

Pick one complicated Japanese set or promo family with known variants. Complete the full loop:

```text
external evidence -> Japanese Master Index -> read-only comparison -> guarded package plan
```

Only after the pilot proves the model should the rest of Japanese scale.

I would preserve ambiguity instead of forcing completion.

The correct output for uncertain Japanese facts should be `needs_manual_review`, `source_limited`, or `non_standard_reference_lane`, not invented certainty.

Most importantly, I would reuse the English governance pattern, not the English data assumptions.

The workflow transfers. The assumptions do not.

## Final Principle

The Master Index is not just a list of cards.

It is the control system that lets Grookai distinguish collector truth from source noise, legacy drift, and generated assumptions.

The English milestone matters because it proved Grookai can complete the full loop:

```text
external evidence -> governed reference -> safe reconciliation -> verified canonical DB state
```

Future catalog expansion should preserve that discipline.
