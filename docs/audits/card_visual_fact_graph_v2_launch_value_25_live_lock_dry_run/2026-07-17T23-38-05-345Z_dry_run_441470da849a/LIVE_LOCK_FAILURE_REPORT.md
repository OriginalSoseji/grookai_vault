# Fact Graph V2 Launch-Value 25 Live Lock Failure Report

Date: 2026-07-17

## Context

This was the fresh paid launch-value 25-card OpenAI dry run after the deterministic repair replay passed offline.

The run used the same explicit card IDs from the approved launch-value plan, with Energies deferred. It made no database writes, approvals, embeddings, public reads, semantic-search integration, Taste Engine integration, Listing Resolver integration, Grookai Signature integration, or story generation.

## Result

Live lock failed.

- Attempted: 25
- Structurally validated: 18
- Structural validation failures: 7
- Skipped images: 0
- Generated row statuses: 14 `needs_review`, 4 `pending`
- OpenAI requests: 26
- Retries: 1
- Estimated cost: `$0.2393816`
- Cost ceiling: `$0.35`
- Ceiling stopped before next call: false

## Boundary

`run_plan.json` records:

- `db_writes`: false
- `model_calls`: true
- `fixture_generation`: false
- `embeddings`: false
- `card_prints_mutation`: false

## Structural Failures

| GV-ID | Name | Branch | Finding |
|---|---|---|---|
| GV-PK-JPN-M5-113 | Mega Chandelure ex | pokemon | `fact_graph_environment_claim_without_support` |
| GV-PK-JPN-M5-118 | Mega Darkrai ex | pokemon | `fact_graph_semantic_fact_label_not_supported_v1:sem_fact_002` |
| GV-PK-JPN-M5-097 | Mega Chandelure ex | pokemon | `fact_graph_semantic_fact_label_not_supported_v1:sem_fact_003` |
| GV-PK-JPN-M5-063 | メガドリュウズex | pokemon | `fact_graph_semantic_fact_label_not_supported_v1:sem_001` |
| GV-PK-JPN-M5-110 | Rust Syndicate Grunt | trainer | `fact_graph_semantic_fact_label_not_supported_v1:sem_004` |
| GV-PK-JPN-TCGCOLLECTOR11526-019 | Magnetic Storm | stadium | `fact_graph_semantic_fact_label_not_supported_v1:sem_fact_night_001` |
| GV-PK-JPN-TCGCOLLECTOR11525-019 | High Pressure System | stadium | object/module references used IDs not present in the observation backbone |

## Exact Failure Meanings

- Mega Chandelure ex claimed `indoor` in `environment` with empty `supporting_observation_ids`.
- Mega Darkrai ex put `mouth not visible` into `semantic_visual_facts`; that belongs in facial evidence or uncertainty, not as a semantic concept.
- Mega Chandelure ex put `haunted or ghostly environment` into `semantic_visual_facts`; this is interpretive and should route to review or be removed from semantic facts.
- メガドリュウズex put `annoyed expression` into `semantic_visual_facts`; interpreted expression remains disallowed as a fact.
- Rust Syndicate Grunt put `two green palms` into `semantic_visual_facts`; count/object evidence belongs in counts and object modules, not as a semantic fact label.
- Magnetic Storm put `night` into `semantic_visual_facts`; time-of-day labels need stricter support handling or review routing.
- High Pressure System used object IDs such as `obj_palm_trees_left_001` in `objects_and_props` and module references, but those IDs were not observation IDs. The model-created object IDs broke the single observation backbone invariant.

## Validated Row Distribution

| Branch | Pending | Needs Review |
|---|---:|---:|
| pokemon | 1 | 5 |
| trainer | 1 | 5 |
| stadium | 0 | 2 |
| item_tool_supporter | 2 | 2 |

## Pending Rows

These rows structurally validated as `pending`, but they are not approved and should not be treated as production-ready because the live-lock run failed overall.

- GV-PK-JPN-M5-114 - Mega Darkrai ex
- GV-PK-JPN-M5-109 - Gladion's Final Battle
- GV-PK-JPN-M5-074 - リトライバッジ
- GV-PK-JPN-M5-073 - ごうかいボム

## Operational Repair Added Before This Run

The first live-lock attempt exposed that the OpenAI fetch path could hang without a per-request abort. Before this completed run, the runner was updated to support:

- `CARD_VISUAL_DESCRIPTION_OPENAI_REQUEST_TIMEOUT_MS`
- `--openai-request-timeout-ms`
- `openai_request_timeout_ms` in `run_plan.json`
- progress logging per card
- retry logging when a request timeout or transport failure is retried

A one-card timeout probe proved the abort path writes bounded failure artifacts.

## Artifact Hashes

| Artifact | SHA-256 |
|---|---|
| `summary.json` | `bd3b5de52f8bc503f2632b5d9443bc394d6d553d9232b4f07ef9d1a679e2dd72` |
| `run_plan.json` | `a0161a55d96bf7da1d8511a5bd0a63f13862cc6584a2633b286214f87401ef21` |
| `generated_outputs.jsonl` | `986357eb959739e1fbb7c3c6cad4fa2eab84112555517512ef2d24dd40ab7d08` |
| `validation_failures.jsonl` | `9dc6f10635c7ae94d425ecd714eabf5dc04eff878647bae34435e877ae15269a` |
| `FACT_GRAPH_V2_REVIEW_PACKET.md` | `a7b4d2c9561a718dfc7b4ca7979177297bbf1f85d5f32b85609da066529b9f02` |
| live-lock stderr log | `caae2878cf25bad7ace19ed52604231d5c74a791c23d752ba60950defb0eb121` |
| timeout probe `summary.json` | `1e7f41c2aa8104a762bd8ab7e91afbb6728705a67804d76c73242acb68b879a5` |
| timeout probe `validation_failures.jsonl` | `1eab45ee8b8836adb2a857fdb131fb814fe08dda54c63838dd5929962e5d1b45` |

## Decision

Do not proceed to 125 cards or any database apply.

The next gate is a deterministic repair over the seven failed payloads:

1. Convert evidence-only semantic labels into the correct evidence/uncertainty locations or drop them with flags.
2. Route interpreted semantic labels to `needs_review` instead of allowing them as accepted facts.
3. Require environment claims such as indoor/outdoor/time-of-day to cite observations or become abstentions/review flags.
4. Normalize object/module references so every object ID references a real observation ID, or fail offline until the prompt/normalizer preserves the observation backbone.
5. Replay these seven failed payloads offline and confirm no previously validated rows regress.
6. Run targeted contract tests.
7. Only after offline replay passes, run one fresh paid 25-card live-lock dry run with code frozen.

