# Web Cohesion Link Integrity V1

Generated: 2026-06-17T04:46:07.289Z
Base URL: http://127.0.0.1:3060

This is a read-only web route, link, and cohesion audit. It performs no DB writes, migrations, cleanup, or apply actions.

## Summary

- DB sets in scope: 217
- DB cards in scope: 24600
- DB species in scope: 1025
- Routes visited: 1157
- Canonical set routes tested: 217
- Failed canonical set routes: 0
- Sampled card routes tested: 647
- Failed sampled card routes: 0
- Broken routes: 0
- Dead internal links: 0
- Warnings: 935
- Max pages reached: false

## Route Classifications

- ok: 935
- redirect: 222

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

