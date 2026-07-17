# CARD_VISUAL_FACT_GRAPH_V1_DENSITY_REPAIR_20260717

## Status

COMPLETE.

This checkpoint records the first Fact Graph V1 quality repair after human review found the 4-card pivot packet structurally valid but too shallow and insufficiently grounded.

## Context

The previous Fact Graph V1 run proved the pivot from prose descriptions to observable fact extraction was correct. It also exposed that schema validity alone was not enough. The model could still produce valid JSON while collapsing images into a few broad labels, leaving environment/design fields unsupported, misusing subject ontology, and producing inconsistent counts.

## Problem

The failed quality patterns were:

- sparse graphs that summarized rather than inventoried visible facts
- nontrivial environment and visual-design fields without support IDs
- nonliving phenomena or title concepts placed in `subjects`
- object material claims such as `metal` or `plastic`
- exact/range/`many` count inconsistencies
- visible object count references set to `not_visible`
- coverage reviews that contradicted nonempty sections
- Energy visuals using canonical card identity rather than visible shape language

## Decision

Keep the architecture and schema version stable, but add deterministic Fact Graph V1 enforcement:

- branch-specific observation density floors
- environment and visual-design support requirements
- coverage review consistency checks
- count consistency checks
- visible object count-reference checks
- material-overclaim checks
- branch-aware ontology checks
- Energy canonical-identity search-term checks

The prompt was tightened to describe the work as an inventory task rather than a summary task.

## Repair Scope

No schema migration.

No database writes.

No approvals.

No embeddings.

No semantic search.

No Taste Engine, Listing Resolver, or story generation.

## Final Dry Run

Final same-four OpenAI dry run:

- Run directory: `docs/audits/card_visual_fact_graph_v1_density_repair_4_card_dry_run/2026-07-17T04-57-29-387Z_dry_run_7001a87aacf5`
- Mode: `dry_run`
- Provider: `openai`
- Model: `gpt-4o-mini`
- Response model: `gpt-4o-mini-2024-07-18`
- Image detail: `high`
- Sample strategy: branch-stratified
- Eligible: `4`
- Validated: `4`
- Failed: `0`
- Skipped: `0`
- Database writes: `0`
- Approvals: `0`
- Embeddings: `0`

Rows:

| GV-ID | Name | Branch | Status | Observations | Counts | Objects | Flags |
|---|---|---|---|---:|---:|---:|---|
| `GV-PK-JPN-M5-113` | Mega Chandelure ex | pokemon | needs_review | 10 | 0 | 0 | metadata/identity, subject-kind classification |
| `GV-PK-JPN-TCGCOLLECTOR11526-019` | Magnetic Storm | stadium | pending | 8 | 0 | 0 | none |
| `GV-PK-JPN-TCGCOLLECTOR11541-013` | Psychic Energy | energy | pending | 7 | 3 | 0 | none |
| `GV-PK-JPN-M5-106` | Tremendous Bomb | item_tool_supporter | pending | 8 | 2 | 2 | none |

## Remaining Quality Truth

The repair materially improved fact density, but Chandelure still correctly routes to `needs_review`.

Known Chandelure concerns:

- body/flame component observations still use subject-like language
- `dark forest background` remains questionable and must be visually reviewed
- the graph no longer passes as clean pending, which is the correct safety boundary

This gate proves the stricter validator can block or review unsafe graphs while allowing denser, grounded outputs for simpler abstract/environment/object cards.

## Token And Cost Result

Final run usage:

- Requests: `4`
- Retries: `0`
- Input tokens: `100,618`
- Output tokens: `4,377`
- Total tokens: `104,995`
- Cached input tokens: `0`
- Estimated cost: `$0.0177189`
- Average estimated cost per validated card: `$0.00442972`

Projected cost from this run:

- 500 cards: `$2.21486`
- 1,000 cards: `$4.42972`
- Full eligible catalog count: `53,227`
- Full eligible catalog: `$235.78070644`

## Artifact Hashes

Final run artifacts:

| Artifact | SHA-256 |
|---|---|
| `summary.json` | `5C7FAB30EE817CB88824285D25728B5229A1236AC487D7FA521FEEC05577E702` |
| `generated_outputs.jsonl` | `A5B255230657EC9362AB7E59053AB9B88CDEACFBF14F388A6378D98138FA0D29` |
| `FACT_GRAPH_V1_REVIEW_PACKET.md` | `4D0D1BE78EB0B185352EAA9B234962CAA6DF9E0C563BC5D2CCC59C4714F1F374` |
| `validation_failures.jsonl` | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` |

## Tests

Targeted tests passed:

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs`
- `node --check tests\contracts\card_visual_description_agent_v1.test.mjs`
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs`

Contract result: `35/35` passing.

## Invariants

- `visual_attributes.fact_graph` remains source truth.
- `artwork_description` remains deterministic compatibility text only.
- Subject, depicted subject, and character representation boundaries remain separate.
- Count, search-term, environment, and visual-design claims must cite observations.
- No story, lore, interpreted expression, embeddings, public reads, or downstream integrations are allowed in this gate.

## Explicit Next Gate

Human-review the density-repair 4-card packet:

`docs/audits/card_visual_fact_graph_v1_density_repair_4_card_dry_run/2026-07-17T04-57-29-387Z_dry_run_7001a87aacf5/FACT_GRAPH_V1_REVIEW_PACKET.md`

Specifically review whether the three `pending` rows are truly safe as fact graphs, and whether Chandelure should remain `needs_review` with a targeted ontology/background repair.

Do not run 25-card or 125-card calibration, database apply, approval updates, embeddings, semantic search, Taste Engine, Listing Resolver, or story generation until this density-repair packet is reviewed.
