# Web Cohesion Link Integrity V1

Generated: 2026-07-03T04:55:54.579Z
Base URL: https://grookaivault.com

This is a read-only web route, link, and cohesion audit. It performs no DB writes, migrations, cleanup, or apply actions.

## Summary

- DB sets in scope: 415
- DB cards in scope: 52882
- DB species in scope: 1025
- Routes visited: 1322
- Canonical set routes tested: 415
- Failed canonical set routes: 0
- Sampled card routes tested: 415
- Failed sampled card routes: 0
- Broken routes: 0
- Dead internal links: 0
- Warnings: 900
- Max pages reached: false

## Route Classifications

- ok: 900
- redirect: 422

## Findings

### POLISH - jakobs_law

Core navigation should remain conventional: search, sets, card detail, vault, Dex, and account should all have predictable labels, clear selected state, and stable back paths.

Recommendation: After route integrity is clean, run manual desktop/mobile walkthroughs for search -> card -> add -> vault -> Dex -> set loops.

## Broken Routes

No broken routes found in this run.

## Slowest Routes


## Safety Confirmation

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- mutation_routes_called: false

