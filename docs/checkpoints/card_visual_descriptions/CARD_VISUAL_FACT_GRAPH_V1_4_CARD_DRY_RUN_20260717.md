# CARD_VISUAL_FACT_GRAPH_V1_4_CARD_DRY_RUN_20260717

## Status

COMPLETE.

This checkpoint records the pivot from prose-first visual descriptions to Card Visual Facts V1: an exhaustive observable fact graph stored under `visual_attributes.fact_graph`.

## Context

The Visual Language V1 prose system proved the infrastructure, cost telemetry, branch routing, review statuses, and safety boundaries. Human review then showed the strategic need had changed: Grookai should first capture directly observable reusable facts, then optionally build prose, story, semantic search, Taste Engine, Grookai Signature, cameo detection, and future visual generation from those facts.

The active source of truth for this build is now `visual_attributes.fact_graph`, not AI-authored prose.

## Problem

Prose descriptions were trying to fix the story being told. The new requirement is to record the facts shown on the card:

- primary subjects
- secondary subjects and cameos
- subject counts
- anatomy and visible physical features
- pose, orientation, action/state
- foreground, midground, and background elements
- visible objects, props, symbols, and visual effects
- environment, terrain, sky, ground, weather, and time cues when visibly supported
- lighting, palette, composition, motifs
- reliable card border, surface, and scan cues only when visible
- uncertainty and abstentions
- fact-grounded search terms with observation support

## Decision

Implement `CARD_VISUAL_FACT_EXTRACTION_PROMPT_V1` and `CARD_VISUAL_FACT_GRAPH_SCHEMA_V1` without a database migration.

Rows still target the existing private `card_print_visual_descriptions` table, but the model response now stores:

```json
{
  "visual_attributes": {
    "fact_schema_version": "CARD_VISUAL_FACT_GRAPH_SCHEMA_V1",
    "fact_graph": {}
  }
}
```

`artwork_description` is generated deterministically as a compatibility digest. It is not authored by the model and is not the source of truth.

## Risk

The main risk is subject-kind confusion: the model may place non-living environment facts, visual effects, symbols, or props into `subjects`. This build added deterministic review routing for those cases through `potential_subject_kind_classification_confusion`.

Other risks remain review-routed:

- body parts described as separate held objects
- canonical metadata leaking into visual output
- speculative setting language
- unsupported physical surface claims
- unsupported search terms
- missing observation references

## Alternatives Rejected

- Continue broad prompt tuning for prose quality.
- Treat cameos as the center of the system.
- Add a new migration before proving the graph shape.
- Generate embeddings or semantic search from the first graph run.
- Store story, inferred emotion, or lore inside the fact graph.

## Migration Applied

No migration was created or applied for this gate.

The existing `card_print_visual_descriptions` table remains the storage target for future apply gates.

## Dry Run

Final 4-card OpenAI dry run:

- Run directory: `docs/audits/card_visual_fact_graph_v1_4_card_dry_run/2026-07-17T04-33-25-912Z_dry_run_b6bbb14f7e60`
- Mode: `dry_run`
- Provider: `openai`
- Model: `gpt-4o-mini`
- Response model: `gpt-4o-mini-2024-07-18`
- Image detail: `high`
- Sample strategy: branch-stratified
- Branches represented: Pokemon, Stadium, Energy, Item / Tool / Supporter
- Eligible: `4`
- Validated: `4`
- Failed: `0`
- Skipped: `0`
- Database writes: `0`
- Approvals: `0`
- Embeddings: `0`

Rows:

| GV-ID | Name | Branch | Status | Flags |
|---|---|---|---|---|
| `GV-PK-JPN-M5-113` | Mega Chandelure ex | pokemon | needs_review | body-part-as-held-object, metadata/identity, speculative setting |
| `GV-PK-JPN-TCGCOLLECTOR11526-019` | Magnetic Storm | stadium | needs_review | subject-kind classification confusion |
| `GV-PK-JPN-TCGCOLLECTOR11541-013` | Psychic Energy | energy | needs_review | canonical metadata / identity language |
| `GV-PK-JPN-M5-106` | Tremendous Bomb | item_tool_supporter | pending | none |

## Token And Cost Result

Final run usage:

- Requests: `4`
- Retries: `0`
- Input tokens: `98,610`
- Output tokens: `2,906`
- Cached input tokens: `5,760`
- Total tokens: `101,516`
- Estimated cost: `$0.0161031`
- Average estimated cost per validated card: `$0.00402577`

Projected cost from this run:

- 500 cards: `$2.012885`
- 1,000 cards: `$4.02577`
- Full eligible catalog count: `53,227`
- Full eligible catalog: `$214.27965979`

Pricing snapshot:

- Input per million: `$0.15`
- Output per million: `$0.60`
- Cached input per million: `$0.075`
- Image cost rule version: `gpt-4o-mini-standard-2026-07-17`

## Current Truths

- Fact Graph V1 is now the active build direction.
- `visual_attributes.fact_graph` is the only source truth for visual facts.
- `artwork_description` is compatibility-only derived text.
- The graph validates observation ID references, coverage reviews, subject-kind separation, count support, search-term support, and the no-story/no-expression boundary.
- The final 4-card dry run produced a review packet with `4/4` validated rows and `0` database writes.
- The review boundary held: risky rows routed to `needs_review`; one simple object row remained `pending`.

## Invariants

- Every meaningful visible fact must be represented by an observation when practical.
- Subjects, depicted subjects, character representations, counts, relationships, and search terms must reference observations.
- `scene_subject`, `depicted_subject`, and `character_representation` are separate concepts.
- Facial evidence is allowed; interpreted expression labels are not facts in V1.
- Counts must cite what was counted.
- Empty categories require explicit coverage review.
- Search terms must be fact-grounded and observation-backed.
- Canonical metadata may guide branch routing, but cannot create visual facts.
- No story, lore, market data, Taste Engine integration, Listing Resolver integration, embeddings, public reads, or approvals in this gate.

## Why The Visual Layer Remains Derived Intelligence

The fact graph is generated from card images and canonical context. It is useful derived intelligence, but it is not canonical identity truth, card-image truth, pricing truth, market truth, or app-facing public truth. Human review remains required before any generated row can become approved knowledge or power downstream product behavior.

## What Must Never Be Broken

- Do not overwrite approved or current human-reviewed rows without an explicit future gate.
- Do not treat model output as canonical identity.
- Do not mix physically present scene subjects with depicted subjects or character representations.
- Do not store story or interpreted emotion as facts.
- Do not generate embeddings or semantic search until Fact Graph V1 is reviewed and approved.
- Do not resume 25-card or 125-card calibration until this 4-card packet is reviewed.

## Artifact Hashes

Final run artifacts:

| Artifact | SHA-256 |
|---|---|
| `summary.json` | `693A6AF8A1031127A67EFB92B5189E84542724C72ADA0D35D800E58278DDD1C2` |
| `generated_outputs.jsonl` | `DA4B3733FBBC08C23BD52CA3CD82BBD8007792192F67901844882081EAF6A2C5` |
| `FACT_GRAPH_V1_REVIEW_PACKET.md` | `E78F84CA9AAF31944CE8C33EC38D3476D46FDC72A288815D449B5AF79EA8050D` |
| `validation_failures.jsonl` | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` |

## Tests

Targeted tests passed:

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs`
- `node --check tests\contracts\card_visual_description_agent_v1.test.mjs`
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs`

Contract result: `34/34` passing.

## Explicit Next Gate

Human-review the 4-card Fact Graph V1 review packet:

`docs/audits/card_visual_fact_graph_v1_4_card_dry_run/2026-07-17T04-33-25-912Z_dry_run_b6bbb14f7e60/FACT_GRAPH_V1_REVIEW_PACKET.md`

Do not run 25-card or 125-card calibration, database apply, approval updates, embeddings, semantic search, Taste Engine, Listing Resolver, or story generation until this Fact Graph V1 packet is reviewed and approved.
