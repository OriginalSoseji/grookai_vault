# Visual Language V1 Validation

Date: 2026-07-16

## Objective

Establish `CARD_VISUAL_LANGUAGE_V1` as Grookai's governing visual description contract and validate a minimal V6 prompt refinement against the same four branch cards used for Prompt V6.

This was not a Prompt V7 project. The branch architecture stayed V6. The prompt version used for artifact isolation is:

```text
CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1
```

## Scope Boundary

Performed:

- created `docs/contracts/CARD_VISUAL_LANGUAGE_V1.md`
- registered `CARD_VISUAL_LANGUAGE_V1` in `docs/CONTRACT_INDEX.md`
- refined V6 prompt wording to align with the visual language contract
- ran dry-run validation on Pokemon, Trainer, Stadium, and Energy cards
- generated local artifacts only

Not performed:

- no schema changes
- no migrations
- no database writes
- no approvals
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no production sample
- no canonical identity changes
- no model change

## Artifacts

Contract:

```text
docs/contracts/CARD_VISUAL_LANGUAGE_V1.md
```

Final validation run:

```text
docs/audits/card_visual_language_v1/2026-07-16T06-15-27-544Z_dry_run_6bda46e5a548
```

Console output:

```text
docs/audits/card_visual_language_v1/visual_language_v1_four_card_dry_run_console_final.txt
```

No-write DB readback:

```text
docs/audits/card_visual_language_v1/visual_language_v1_no_db_write_readback.json
```

Earlier calibration runs that exposed terminology drift:

```text
docs/audits/card_visual_language_v1/2026-07-16T06-12-16-358Z_dry_run_1393f9a39391
docs/audits/card_visual_language_v1/2026-07-16T06-13-48-788Z_dry_run_c8fafe4a8653
```

## Validation Cards

| Card | GV-ID | Branch | Result |
|---|---|---|---|
| Chandelure VMAX | `GV-PK-JPN-S8-116` | `pokemon` | validated, pending |
| Misty's Vitality | `GV-PK-JPN-M5-108` | `trainer` | validated, pending |
| Fairy Garden | `GV-PK-WCD-2014-CRAZY_PUNCH-13-XY-117-FAIRY_GARDEN` | `stadium` | validated, pending |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | `energy` | validated, pending |

## Terminology Changes

Prompt wording now explicitly references `CARD_VISUAL_LANGUAGE_V1`.

The prompt now tells the model to describe artwork like:

- a museum curator
- an accessibility specialist
- a collector

The prompt now explicitly discourages:

- novelist-style interpretation
- reviewer language
- marketing language
- unsupported atmosphere labels
- unnecessary synonym drift

The prompt now adds the contract observation hierarchy:

1. subject
2. structure
3. pose
4. composition
5. environment
6. lighting
7. palette
8. mood

The prompt now standardizes preferred terminology such as:

- glass body
- curved arms
- rounded face
- radiating lines
- soft gradients
- abstract forms
- scattered light points
- glowing highlights
- central symbol
- foreground
- background

The prompt now includes an explicit prohibited-term warning for this visual-language pass:

```text
magical, enchanted, enchanting, mystical, ethereal, dreamlike, dreamy, aura, twilight, fantasy, stars, starry, dusk, night
```

It also strengthens card-surface language by warning against overclaiming:

```text
foil texture visible, glossy finish, gloss present, standard print
```

## Consistency Improvements

Trainer:

- Misty's Vitality stayed in the `Trainer:` branch.
- The description used person-first visual details: hair, clothing, face, expression, raised arm, pose, and water-like background.
- It did not describe the trainer as a humanoid creature.
- Surface cues were restrained: no foil or gloss was asserted.

Energy:

- Psychic Energy stayed in the `Symbolic Artwork:` branch.
- The output used stable abstract-symbol language: central symbol, stylized eye, purple gradients, radiating lines, circular motifs, scattered light points.
- It did not invent a creature.
- Surface cues were restrained: printing treatment uncertain.

Stadium:

- Fairy Garden stayed in the `Environment:` branch.
- It did not create a character section.
- The description focused on garden, white flowers, trees, background elevations, circular motif, soft glow, and layered composition.
- The previous explicit `stars` wording was removed.

Pokemon:

- Chandelure stayed in the `Character:` branch.
- The output used stable Chandelure vocabulary: rounded glass body, curving arms, flickering flames, face not clearly visible, diagonal composition.
- It did not describe body anatomy as a held object.

## Remaining Inconsistencies

The final dry run still shows that prompt instructions alone do not fully enforce Grookai Visual Language.

Chandelure VMAX still used interpretive vocabulary:

- `mystique`
- `ethereal`
- `enchantment`

Chandelure also overclaimed the physical card surface:

- `shimmering finish`

Fairy Garden still used interpretive vocabulary:

- `ethereal beauty`

The final run's deterministic review status remained `pending` for all four rows, because the existing review-flag logic does not yet enforce the new Visual Language prohibited vocabulary or surface-overclaim vocabulary.

This is the key validation finding: the Visual Language contract is correct, but the next quality improvement should be enforcement and review-flag alignment, not a Prompt V7 redesign.

## Token And Cost Result

Final validation run:

- model requested: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `4`
- retry count: `0`
- input tokens: `121066`
- output tokens: `1623`
- total tokens: `122689`
- estimated cost: `$0.01913370`
- average estimated cost per validated description: `$0.00478343`

Projected costs at this pricing snapshot:

- 500 cards: `$2.391715`
- 1,000 cards: `$4.78343`

## Boundary Proof

`visual_language_v1_no_db_write_readback.json` confirms:

- `visual_language_description_rows`: `0`
- `visual_language_run_rows`: `0`

No V6 Visual Language rows were inserted into the database.

## Tests

Passed:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
git diff --check
```

Focused contract suite result:

- 9 tests passed
- 0 failed

Full suite was not run.

## Decision

`CARD_VISUAL_LANGUAGE_V1` should stand as the governing contract for Grookai card visual descriptions.

Prompt V6 plus Visual Language V1 is directionally correct, but prompt wording alone is not sufficient to guarantee compliance.

## Explicit Next Gate

Add deterministic Visual Language review flags before any larger dry run or apply.

The next gate should flag:

- prohibited speculative vocabulary
- unsupported time-of-day or setting claims
- physical surface overclaims
- semantic tags that use atmosphere words instead of visible search concepts

Do not run a production sample, apply rows, approve rows, generate embeddings, build semantic search, or integrate Grookai Signature before that enforcement gate is accepted.
