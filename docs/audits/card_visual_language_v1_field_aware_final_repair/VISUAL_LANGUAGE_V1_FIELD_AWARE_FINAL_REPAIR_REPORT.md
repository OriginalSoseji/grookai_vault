# Visual Language V1 Field-Aware Final Repair Report

Date: 2026-07-16

## Objective

Implement the narrow deterministic offline repair authorized after the field-aware final 25-card dry run failed freeze lock.

No OpenAI run was performed.

## Scope Boundary

Performed:

- made legacy Trainer expression/personality flags respect visible expression support
- expanded surface-field policy for additional physical card-surface overclaims
- added branch-aware interpretation checks for the exact final-run misses
- replayed the exact final 25-card artifact offline
- added targeted contract coverage for the replay
- ran syntax and targeted contract tests

Not performed:

- no database writes
- no migrations
- no OpenAI calls
- no approvals
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no production apply
- no new 25-card sample

## Repair Summary

The repair stays within deterministic review policy.

Changes:

- Trainer expression/personality language from the legacy flat flag list is suppressed when the generated payload contains visible facial support such as a smile, furrowed brow, visible grin, or similar expression evidence.
- `card_surface_and_printing_cues` now flags more physical card-surface claims, including `smooth surface`, `standard surface`, `without visible texturing`, edge-wear judgments, print-quality judgments, and `printing treatment appears to show ...`.
- Energy branch interpretation now catches `invokes a sense ...` and `abstract representation of ... energy`.
- Item / Tool / Supporter branch interpretation now catches `sense of discovery` and `significance`.
- Pokemon expression policy now catches `fierce intensity` and `intensity and determination`.

## Offline Replay Result

Replay artifact:

```text
docs/audits/card_visual_language_v1_field_aware_final_repair/offline_field_aware_final_repair_replay.json
```

Source artifact:

```text
docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/generated_outputs.jsonl
```

| Status | Original count | Replay count |
| --- | ---: | ---: |
| needs_review | 22 | 23 |
| pending | 3 | 2 |

Status changes:

| Card | GV-ID | Branch | From | To |
| --- | --- | --- | --- | --- |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer | `needs_review` | `pending` |
| Dark Metal Energy | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Energy | `pending` | `needs_review` |
| `古びたたての化石` | `GV-PK-JPN-M5-072` | Item / Tool / Supporter | `pending` | `needs_review` |

Gate checks:

| Check | Result |
| --- | --- |
| Misty likely false positive cleared | pass |
| Dark Metal Energy false negative routed | pass |
| Fossil false negative routed | pass |
| Magnetic Storm clean pending preserved | pass |
| Mega Excadrill surface policy flagged | pass |
| Rainbow Energy surface policy flagged | pass |
| Mega Zeraora personality policy flagged | pass |

## Tests Run

| Command | Result |
| --- | --- |
| `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` | pass |
| `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` | pass, `29/29` |

Full repository contract suite was not run because this is an isolated deterministic validator repair with no migration, schema, app surface, or database behavior changes.

## Token And Cost Result

- OpenAI request count: `0`
- retry count: `0`
- input tokens: `0`
- output tokens: `0`
- total tokens: `0`
- estimated cost: `$0`

## Boundary Proof

This gate used only local code changes, tests, and saved dry-run artifacts.

- No database writes were performed.
- No migration was created or applied.
- No generated row was approved.
- No embeddings were generated.
- No app-facing or downstream integration was touched.

## Decision

The narrow field-aware final repair gate is complete.

The exact failed 25-card artifact now replays with the known false positive cleared, both status-level false negatives routed to `needs_review`, and the known clean pending row preserved.

## Exact Next Gate

Human review this offline repair.

If accepted, run one final branch-stratified 25-card OpenAI dry run only, with code frozen for the duration of the sample.

Required stop conditions:

- `25/25` validated
- exact five-branch coverage
- `0` operational failures
- `0` database writes
- `0` false positives in first-pass review
- `0-1` false negatives in first-pass review
- no subject-identity failures
- no unflagged physical-surface claims

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, process production cards, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature.
