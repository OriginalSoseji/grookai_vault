# Visual Language V1 Enforcement Comparison

Date: 2026-07-16

## Objective

Add deterministic post-generation Visual Language review flags without changing Prompt V6 architecture, schema, migrations, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, canonical identity, or database write behavior.

This gate tests enforcement, not another broad prompt rewrite.

## Implementation

The agent now preserves:

- `quality_flags`: string flag IDs used for review routing
- `quality_flag_details`: artifact-only matched phrase evidence for reviewers

Example detail shape:

```json
{
  "flag": "potential_surface_overclaim",
  "matched_text": "foil texture is visible",
  "field": "card_surface_and_printing_cues"
}
```

No database schema changed. `quality_flag_details` is written to dry-run artifacts only and is not inserted into `card_print_visual_descriptions`.

## Enforcement Rules Added

The deterministic pass now flags:

- speculative setting language
- overconfident ambiguous celestial or space settings
- interpretive claims such as `symbolizes`, `represents`, `embodies`, and `evokes`
- unsupported emotion or personality claims when the face or expression is not visible
- card-surface overclaims
- creature language on non-Pokemon branches
- generic filler language
- semantic-tag metadata removals and nonvisual semantic-tag concepts

Any non-empty `quality_flags` array routes the row to `needs_review`.

## Validation Runs Compared

Previous Visual Language V1 dry run:

```text
docs/audits/card_visual_language_v1/2026-07-16T06-15-27-544Z_dry_run_6bda46e5a548
```

Enforcement dry run:

```text
docs/audits/card_visual_language_v1_enforcement/2026-07-16T06-39-59-292Z_dry_run_50b91c067444
```

Both runs used the same four card IDs:

| Card | GV-ID | Branch |
| --- | --- | --- |
| Chandelure VMAX | `GV-PK-JPN-S8-116` | Pokemon |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer |
| Fairy Garden | `GV-PK-WCD-2014-CRAZY_PUNCH-13-XY-117-FAIRY_GARDEN` | Stadium |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | Energy |

## Summary Comparison

| Metric | Previous V1 Run | Enforcement Run |
| --- | ---: | ---: |
| eligible | 4 | 4 |
| validated | 4 | 4 |
| failed | 0 | 0 |
| skipped | 0 | 0 |
| pending | 4 | 2 |
| needs_review | 0 | 2 |

## Enforcement Results

| Card | Previous status | Enforcement status | Result |
| --- | --- | --- | --- |
| Chandelure VMAX | `pending` | `needs_review` | True positive |
| Misty's Vitality | `pending` | `pending` | True negative |
| Fairy Garden | `pending` | `needs_review` | True positive |
| Psychic Energy | `pending` | `pending` | True negative |

## Trigger Evidence

Chandelure VMAX:

```text
potential_speculative_setting_language | artwork_description | ethereal
potential_speculative_setting_language | visual_attributes.mood | ethereal
```

Fairy Garden:

```text
potential_speculative_setting_language | artwork_description | ethereal
potential_speculative_setting_language | artwork_description | twilight
```

No flags were produced for Misty's Vitality or Psychic Energy in this enforcement run.

## True Positives

Chandelure VMAX correctly moved to `needs_review` because the model used `ethereal`, which is part of the Visual Language V1 speculative atmosphere vocabulary.

Fairy Garden correctly moved to `needs_review` because the model used `ethereal` and `twilight`. `twilight` is a time-of-day claim and should require review unless directly supported by the image.

## False Positives

No false positives were observed in this four-card enforcement run.

Future review should still watch for cases where a word such as `twilight`, `stars`, or `portal` is literally visible. The current rule intentionally sends those cases to review rather than approving them automatically.

## Covered By Tests

The focused contract test covers cases that did not recur in the live four-card output:

- `potential_surface_overclaim`
- `potential_interpretive_claim`
- `potential_creature_language_on_non_pokemon_branch`
- `potential_generic_filler`
- `potential_semantic_tag_nonvisual_concept`
- `potential_unsupported_emotion_or_personality_claim`

## Token And Cost Result

Enforcement dry run:

- model requested: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `4`
- retry count: `0`
- input tokens: `121066`
- output tokens: `1516`
- total tokens: `122582`
- estimated cost: `$0.01906950`
- average estimated cost per validated description: `$0.00476737`

Projected costs at this pricing snapshot:

- 500 cards: `$2.383685`
- 1,000 cards: `$4.76737`

## Boundary Proof

`visual_language_enforcement_no_db_write_readback.json` confirms:

- `enforcement_artifact_run_rows`: `0`
- `enforcement_prompt_description_rows_since_run_start`: `0`

No database rows were written.

## Tests

Passed before the enforcement dry run:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
```

Focused contract suite result:

- 10 tests passed
- 0 failed

Full suite was not run.

## Decision

The enforcement gate works: questionable Visual Language outputs now become `needs_review` with explainable matched phrase evidence.

## Explicit Next Gate

Human-review the two `needs_review` rows and decide whether the initial enforcement vocabulary is acceptable.

Do not run a larger production sample, apply rows, approve rows, generate embeddings, build semantic search, or integrate Grookai Signature until this enforcement gate is accepted.
