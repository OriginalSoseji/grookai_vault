# Visual Language V1 Freeze-Candidate Repair Report

Date: 2026-07-16

## Objective

Implement the narrow deterministic repair authorized after the Visual Language V1 freeze-candidate 25-card dry run found `4` status-level false negatives.

No OpenAI run was performed.

## Scope Boundary

Performed:

- added deterministic phrase-family checks for the four freeze-candidate false-negative classes
- added branch-aware mood checks for `visual_attributes.mood`
- added fixture coverage for the four missed rows
- replayed the saved freeze-candidate pending rows offline
- ran targeted syntax and contract tests

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
- no 25-card resample

## Repair Summary

The repair extends the existing deterministic Visual Language review layer only.

New phrase-family coverage:

- Pokemon action/personality overclaims: `menacing grin`, `aggressive expression`, `aggressive pose`, `intimidating presence`
- Trainer body-language/personality claims: `serious and determined`, `determined expression`, `calling or directing`, `action and determination`
- Stadium interpretive mood/critique language: `awe-inspiring`, `natural awe`, `sense of power`
- Item/Object material/action/mood drift: `glossy black surface`, `spark indicating ignition`, `explosion or heightened action`, `urgency and excitement`

New branch-aware mood checks:

- Pokemon mood: `aggressive`, `intimidating`
- Trainer mood: `determined`, `assertive`, `confident`
- Stadium mood: `awe-inspiring`, `awe`, `powerful`, `sense of power`
- Item / Tool / Supporter mood: `urgent`, `urgency`, `exciting`, `excitement`, `tension`

## Offline Replay Result

Source artifact:

```text
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/generated_outputs.jsonl
```

Replay artifact:

```text
docs/audits/card_visual_language_v1_freeze_candidate_repair/offline_freeze_candidate_pending_replay.json
```

Permanent artifact hashes:

```text
docs/audits/card_visual_language_v1_freeze_candidate_repair/permanent_artifact_hashes.json
```

The saved freeze-candidate `pending` rows were replayed offline with the repaired validator:

| Result | Count |
| --- | ---: |
| originally pending | 7 |
| now routed to needs_review | 4 |
| remained pending | 3 |
| model calls | 0 |
| database writes | 0 |

Rows now routed to `needs_review`:

| Card | GV-ID | Branch | New flags |
| --- | --- | --- | --- |
| Mega Excadrill ex | `GV-PK-JPN-M5-101` | Pokemon | `potential_dramatic_inferred_action_language`, `potential_unsupported_personality_or_species_interpretation` |
| Gladion's Final Battle | `GV-PK-JPN-M5-109` | Trainer | `potential_unsupported_personality_or_species_interpretation` |
| Magnetic Storm | `GV-PK-JPN-TCGCOLLECTOR11526-019` | Stadium | `potential_interpretive_mood_language` |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Item / Tool / Supporter | `potential_dramatic_inferred_action_language`, `potential_object_material_or_card_surface_confusion`, `potential_visual_material_vs_surface_confusion` |

Rows that remained `pending`:

| Card | GV-ID | Branch |
| --- | --- | --- |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer |
| `古びたたての化石` | `GV-PK-JPN-M5-072` | Item / Tool / Supporter |

## Tests Run

| Command | Result |
| --- | --- |
| `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` | pass |
| `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` | pass, `26/26` |

The targeted contract suite includes the relevant migration/RLS smoke in its first test. Full repository contract suite was not run because this was an isolated deterministic validator repair with no migration or downstream integration changes.

## Token And Cost Result

- OpenAI request count: `0`
- retry count: `0`
- input tokens: `0`
- output tokens: `0`
- total tokens: `0`
- estimated cost: `$0`

## Boundary Proof

This gate used only local code changes, fixtures, and saved dry-run artifacts.

- No database writes were performed.
- No migration was created or applied.
- No generated row was approved.
- No embeddings were generated.
- No app-facing or downstream integration was touched.

## Decision

The narrow repair gate is complete.

The repair should now be evaluated with a final branch-stratified 25-card OpenAI dry run only, using the same no-write boundaries as the failed freeze candidate.

## Exact Next Gate

Run one final branch-stratified 25-card OpenAI dry run only.

Required stop conditions:

- `25/25` validated
- `0` operational failures
- `0` database writes
- `0` false positives in first-pass review
- `0-1` false negatives in first-pass review
- no subject-identity failures
- no unflagged physical-surface claims

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, process production cards, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature.
