# CARD_VISUAL_SEARCH_PROJECTION_V1_4

Status: Active - offline projection construction only

Date: 2026-07-21

## Purpose

V1.4 preserves Projection V1.3 and repairs document-role classification after full-corpus branch inspection found two substring collisions.

## Token-Aware Routing

Routing vocabulary matches normalized whole tokens and controlled multiword terms. It must not infer:

- `ground` from `fact_grounded_search_terms`;
- `face` from `surface`.

Subject-linked search terms and concepts therefore inherit their supporting subject observation route. Environment surface evidence remains scene evidence.

The subject vocabulary covers subject roles, creature anatomy, human appearance, body regions, physical features, clothing, accessories, pose, orientation, gesture, limbs, appendages, wings, tails, horns, and claws. Scene and style vocabularies use the same token-boundary discipline.

## Preserved Contracts

All V1 through V1.3 evidence, UI propagation, host-context, guard, hashing, reconciliation, and no-write requirements remain binding. Source fact graphs are not modified.

## Acceptance Criteria

- Full locked corpus reconciliation and independent UI residual scan pass.
- Subject-linked anatomy terms do not appear only in scene documents.
- Environment surface, sky, terrain, architecture, and related observations do not route to subject documents through substring collisions.
- Representative Pokémon, Trainer, Stadium, and Item documents pass manual role inspection.
- Same-input semantic artifact replay is byte-identical.

## Exact Next Gate

Run the fixed offline lexical and structured evaluation suite. No embeddings or database migration are authorized by this contract.
