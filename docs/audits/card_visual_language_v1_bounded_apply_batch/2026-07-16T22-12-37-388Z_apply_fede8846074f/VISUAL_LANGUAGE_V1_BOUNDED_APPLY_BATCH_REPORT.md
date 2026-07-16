# Visual Language V1 Bounded Apply Batch Report

Date: 2026-07-16

## Objective

Apply the locked Visual Language V1 behavior to one bounded database batch with a hard ceiling of `25` cards and `$0.25`, then prove the rows and run telemetry by database readback.

Frozen commit at run start:

```text
c28e0bc0d615cedea5758a2af6d2ccff02442e74
```

## Scope Boundary

Performed:

- branch-stratified 25-card OpenAI apply batch
- five cards each for Pokemon, Trainer, Stadium, Energy, and Item / Tool / Supporter
- private `card_visual_description_runs` and `card_print_visual_descriptions` writes
- direct usage and cost recording
- DB readback for run row, description rows, artifact hashes, row statuses, and canonical fingerprints
- embedding boundary readback
- description markdown generation

Not performed:

- no row approvals
- no embeddings
- no semantic search
- no public or app-facing reads
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no 25-card production sample beyond this bounded apply proof
- no unattended timer

## Apply Command

Secrets were excluded from the artifact. The environment file was loaded into process environment before execution.

```text
node scripts/audits/card_visual_description_agent_v1.mjs --apply --provider=openai --model=gpt-4o-mini --branch-stratified-sample --branch-targets=pokemon:5,trainer:5,stadium:5,energy:5,item_tool_supporter:5 --branch-candidate-limit=60000 --limit=25 --max-cards=25 --max-run-cost-usd=0.25 --openai-input-cost-per-million=0.15 --openai-output-cost-per-million=0.6 --openai-cached-input-cost-per-million=0.075 --image-cost-rule-version=gpt-4o-mini-standard-2026-07-16 --out-dir=docs/audits/card_visual_language_v1_bounded_apply_batch
```

## Run Summary

| Field | Value |
| --- | --- |
| Run key | `fede8846074f414722b0a967e52fff7ba1eaeee18d2fe4bea6c8686f9712f1c8` |
| Run ID | `3e7f390a-e372-41ac-be73-b33e94918a8b` |
| Run directory | `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f` |
| Provider/model | `openai` / `gpt-4o-mini` |
| Response model | `gpt-4o-mini-2024-07-18` |
| Prompt version | `CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR` |
| Image detail | `high` |
| Eligible | `25` |
| Validated | `25/25` |
| Failed | `0` |
| Skipped | `0` |
| Inserted | `25` |
| Review statuses | `22 needs_review`, `3 pending`, `0 approved` |
| Apply skipped | `0` |

## Branch Coverage

| Branch | Count |
| --- | ---: |
| Pokemon | 5 |
| Trainer | 5 |
| Stadium | 5 |
| Energy | 5 |
| Item / Tool / Supporter | 5 |

## Token And Cost Result

| Metric | Value |
| --- | ---: |
| request count | 25 |
| retry count | 0 |
| input tokens | 682128 |
| output tokens | 9974 |
| total tokens | 692102 |
| cached input tokens | 0 |
| reasoning output tokens | 0 |
| estimated cost | `$0.1083036` |
| average estimated cost per validated card | `$0.00433214` |
| projected 500 cards | `$2.16607` |
| projected 1,000 cards | `$4.33214` |
| projected full eligible catalog, 53227 cards | `$230.58681578` |

The configured run ceiling was `$0.25` and `25` cards. The run did not stop before the next call.

## DB Readback

Artifacts:

- `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/db_apply_readback.json`
- `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/embedding_boundary_readback.json`

| Check | Result |
| --- | --- |
| run row status | `completed` |
| description rows written | `25` |
| allowed statuses only | `true` |
| approved rows written | `0` |
| generated-to-DB reconciliation | `true` |
| artifact hashes match run row | `true` |
| eligible current approved rows before apply | `0` |
| force version | `false` |
| visual-description embedding vectors | `0` |
| visual-description embedding metadata rows | `0` |
| card_embeddings rows for written cards | `0` |

## Invariants

- `every_written_description_pending_or_needs_review`: `true`
- `no_approved_rows_written`: `true`
- `no_current_approved_human_reviewed_candidate_overwritten`: `true`
- `written_row_count_matches_generated_outputs`: `true`
- `run_telemetry_reconciles`: `true`
- `artifact_hashes_reconcile`: `true`
- `generated_fingerprints_reconcile`: `true`
- `no_embedding_vectors_on_written_visual_description_rows`: `true`
- `no_embedding_metadata_on_written_visual_description_rows`: `true`
- `no_card_embeddings_created_for_written_card_prints_during_apply_window`: `true`
- `embedding_boundary_preserved`: `true`

All required bounded-apply invariants passed.

## Boundary Proof

- Every written row is `pending` or `needs_review`.
- Zero written rows are `approved`.
- Existing approved/current human-reviewed rows were not eligible for overwrite and `--force-version` was not used.
- The database readback reconciled written row counts, run telemetry, artifact hashes, and generated fingerprints.
- The embedding boundary readback proved no embedding fields were populated on the written visual-description rows and no `card_embeddings` rows exist for the written card prints.
- `card_prints` canonical identity rows were not mutated by this lane.
- The run remained private derived intelligence, not app-facing product behavior.

## Selected Rows

| GV-ID | Name | Branch | Status | DB check |
| --- | --- | --- | --- | --- |
| `GV-PK-JPN-M5-113` | Mega Chandelure ex | Pokemon | `needs_review` | `true` |
| `GV-PK-JPN-M5-118` | Mega Darkrai ex | Pokemon | `needs_review` | `true` |
| `GV-PK-JPN-M5-101` | Mega Excadrill ex | Pokemon | `needs_review` | `true` |
| `GV-PK-JPN-M5-112` | Mega Zeraora ex | Pokemon | `needs_review` | `true` |
| `GV-PK-JPN-M5-096` | Mega Zeraora ex | Pokemon | `needs_review` | `true` |
| `GV-PK-JPN-M5-108` | Misty's Vitality | Trainer | `needs_review` | `true` |
| `GV-PK-JPN-M5-109` | Gladion's Final Battle | Trainer | `needs_review` | `true` |
| `GV-PK-JPN-M5-117` | Gwynn | Trainer | `needs_review` | `true` |
| `GV-PK-JPN-M5-116` | Gladion's Final Battle | Trainer | `needs_review` | `true` |
| `GV-PK-JPN-M5-111` | Gwynn | Trainer | `needs_review` | `true` |
| `GV-PK-JPN-TCGCOLLECTOR11526-019` | Magnetic Storm | Stadium | `needs_review` | `true` |
| `GV-PK-JPN-S6A-100` | Turffield Stadium | Stadium | `needs_review` | `true` |
| `GV-PK-JPN-PMCG6-085` | Cinnabar City Gym | Stadium | `pending` | `true` |
| `GV-PK-JPN-TCGCOLLECTOR11525-019` | High Pressure System | Stadium | `pending` | `true` |
| `GV-PK-JPN-SMG-039` | Dimension Valley | Stadium | `needs_review` | `true` |
| `GV-PK-JPN-TCGCOLLECTOR11541-013` | Psychic Energy | Energy | `needs_review` | `true` |
| `GV-PK-JPN-L1BSS-070` | Rainbow Energy | Energy | `needs_review` | `true` |
| `GV-PK-JPN-TCGCOLLECTOR11194-057` | Water Energy | Energy | `needs_review` | `true` |
| `GV-PK-JPN-TCGCOLLECTOR11515-020` | Dark Metal Energy | Energy | `pending` | `true` |
| `GV-PK-JPN-SM1PLUS-069` | Basic Grass Energy | Energy | `needs_review` | `true` |
| `GV-PK-JPN-M5-106` | Tremendous Bomb | Item / Tool / Supporter | `needs_review` | `true` |
| `GV-PK-JPN-M5-105` | Dark Bell | Item / Tool / Supporter | `needs_review` | `true` |
| `GV-PK-JPN-M5-074` | リトライバッジ | Item / Tool / Supporter | `needs_review` | `true` |
| `GV-PK-JPN-M5-073` | ごうかいボム | Item / Tool / Supporter | `needs_review` | `true` |
| `GV-PK-JPN-M5-072` | 古びたたての化石 | Item / Tool / Supporter | `needs_review` | `true` |

## Tests

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` - pass
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `29/29`
- `git diff --check` - pass
- Full repository contract suite was not run for this isolated bounded Node/database gate.
- Existing unrelated Flutter failures were not evaluated as part of this gate.

## Decision

The bounded apply proof passed. Visual Language V1 remains locked at the row-status trust boundary, and the first 25 private database rows were written with review statuses only.

## Exact Next Gate

Human review of the 25 written rows in an admin/review context. Do not approve rows, generate embeddings, expose app-facing reads, or integrate semantic search until that review gate explicitly approves a bounded next action.
