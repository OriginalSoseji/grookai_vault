# CARD_VISUAL_SEARCH_PROJECTION_V1_3

Status: Active - offline projection construction only

Date: 2026-07-21

## Purpose

V1.3 preserves Projection V1.2 and closes its single remaining high-confidence residual: a generic object observation explicitly described as printed on the card.

## Rule

An observation stating that an element is `printed on card` or `printed on the card` is card-UI evidence and is excluded together with every derived fact, concept, count, relationship, or search term that cites it.

This rule does not apply to text printed on an illustrated host such as a book, paper, sign, screen, board, wall, garment, or other in-scene object.

## Preserved Contracts

All V1, V1.1, and V1.2 evidence, routing, guard, host-context, hashing, reconciliation, and no-write requirements remain binding.

## Acceptance Criteria

- Full locked corpus reconciliation passes.
- The independent card-UI/mechanics residual scan returns zero high-confidence matches.
- Artifact hashes verify and a same-input replay produces byte-identical semantic data artifacts.
- No provider, database, approval, embedding, index-write, or public-read boundary changes.

## Exact Next Gate

Run the fixed offline lexical and structured evaluation suite. No embeddings or database migration are authorized by this contract.
