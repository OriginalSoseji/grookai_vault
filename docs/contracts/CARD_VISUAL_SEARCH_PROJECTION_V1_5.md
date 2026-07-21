# CARD_VISUAL_SEARCH_PROJECTION_V1_5

Status: Active - offline projection construction only

Date: 2026-07-21

## Purpose

V1.5 preserves Projection V1.4 and normalizes observation-kind separators before token-aware document routing.

## Rule

Modules, categories, field paths, and observation kinds all pass through the same normalization before controlled routing vocabulary is evaluated. An observation kind such as `environment_sky` is evaluated as `environment sky`; `body_region` is evaluated as `body region`.

Explicit evidence taxonomy takes precedence over conflicting derived routing context:

- environment evidence remains scene evidence even if a subject semantic fact cites it;
- body-region evidence remains subject evidence even if a color/light fact also cites it.

## Preserved Contracts

All V1 through V1.4 evidence, UI propagation, host-context, guard, token-boundary, hashing, reconciliation, and no-write requirements remain binding.

## Acceptance Criteria

- Full locked corpus reconciliation and independent UI residual scans pass.
- Representative branch routing passes manual inspection.
- Environment-backed search terms do not route to subject through context alone.
- Body/anatomy-backed search terms do not route to style through context alone.
- Same-input semantic artifacts are byte-identical.

## Exact Next Gate

Run the fixed offline lexical and structured evaluation suite. No embeddings or database migration are authorized by this contract.
