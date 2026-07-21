# CARD_VISUAL_SEARCH_PROJECTION_V1_2

Status: Active - offline projection construction only

Date: 2026-07-21

## Purpose

V1.2 preserves Projection V1.1 and closes the residual card-UI path found during independent inspection of its full-corpus artifact. Some raw card UI observations used generic artwork modules such as `objects_and_props`, `visual_effects`, `composition`, or `color_and_light`. Their derived facts and concepts could therefore appear clean when judged without the raw observation label.

## Evidence Propagation

Every raw observation is classified before projection. When a raw observation is card UI or print-marker evidence, all typed facts, semantic facts, counts, relationships, search terms, and canonical concepts that cite it are excluded as well.

The classification uses:

- explicit source taxonomy and observation ID namespaces;
- direct card-interface language such as card frame, border, interface, HP, rules, mechanics, or metadata symbols;
- unhosted overlaid text modeled as a visual effect;
- known card-mechanic or promotional logos when no illustrated host is identified.

Circular relabeling cannot convert excluded UI evidence into artwork evidence.

## Artwork Text And Logos

Visible text and logos remain eligible when evidence identifies an illustrated host such as a sign, poster, book, paper, screen, game board, building, wall, shirt, jacket, cloak, garment, or banner.

Examples:

- `SALE sign` in an environment remains scene evidence.
- printed text on an illustrated book remains object evidence.
- a character logo on clothing remains subject evidence.
- a floating Rapid Strike logo or unhosted Pokemon League promo logo is excluded.
- an attack name rendered across the foreground is excluded and exclusion propagates to its derived search terms.

## Preserved Contracts

All V1 and V1.1 evidence, routing, guard, hashing, reconciliation, and no-write requirements remain binding. Source fact graphs are immutable; V1.2 changes only deterministic projection inclusion and routing.

## Acceptance Criteria

- Full locked corpus reconciliation passes with zero failures or hash mismatches.
- No raw or derived card UI evidence enters artwork documents.
- Host-backed artwork text and logos remain available.
- Subject-linked facts continue to route correctly.
- Independent residual scans contain no high-confidence card-interface or mechanics leakage.
- Replay from the same source hashes produces identical artwork, printing, document, evidence, exclusion, and failure artifacts.

## Exact Next Gate

Run the fixed offline lexical and structured evaluation suite only after V1.2 passes full-corpus semantic-cleanliness and deterministic replay checks. No embeddings or database migration are authorized by this contract.
