# CARD_VISUAL_FACT_GRAPH_V2_SEMANTIC_CLEANLINESS_REPAIR_20260717

Status: COMPLETE

Date: 2026-07-17

## Context

The prior V2 semantic facts gate failed because the model produced structurally useful fact graphs but validation still blocked three rows. The failure exposed two different classes:

- evidence-only facial details were being placed in `semantic_visual_facts`
- unsafe artwork search terms such as physical print treatment or card UI symbols could survive when the model misclassified their support observations

The repair was scoped to semantic cleanliness only. It did not change schema storage, migrations, database state, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation.

## Problem

The previous validator treated all unsupported semantic labels as hard failures, but did not distinguish evidence-only details from reusable semantic facts. It also relied too heavily on observation kind to remove card UI search terms, so a misclassified observation could leave terms such as `dark energy symbol` in the artwork search layer.

## Risk

If this stayed unfixed, the fact graph could mix:

- low-level evidence (`open eyes`, `neutral eyebrows`) with reusable meaning facts
- physical print claims (`gold foil`) with artwork facts
- card UI / mechanics (`energy symbol`, HP, attacks, weakness, retreat cost) with artwork search

That would weaken semantic search, Taste Engine, visual matching, and future Grookai Signature features.

## Decision

Keep `semantic_visual_facts` as the meaning-level lane, but make the boundary stricter:

- evidence-only facial labels are filtered from `semantic_visual_facts`
- those details remain available through raw observations, facial evidence, or semantic-fact evidence fields
- useful environment/object concepts such as `traffic cones`, `coniferous trees`, `reflective water`, and `blue sky with clouds` may remain when evidence-backed
- physical print treatment terms and card UI/mechanics terms are removed from artwork search terms
- if those unsafe terms survive a future normalization path, validation rejects them

## Alternatives Rejected

- Rejected broad allow-list expansion: it would have made the four-card run pass while allowing unsafe terms.
- Rejected semantic-facts removal: the layer is still useful for search and downstream systems when grounded.
- Rejected treating evidence-only labels as semantic facts: those labels are evidence, not reusable meaning.
- Rejected another database apply: this was dry-run-only repair work.

## Compatibility Behavior

`artwork_description` remains a deterministic compatibility digest. It is generated from the normalized fact graph and does not become authoritative.

Search terms are derived from normalized `fact_grounded_search_terms`, after unsafe terms and UI-only terms are removed.

## Current Truths

- Active prompt version: `CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2`.
- Active schema version: `CARD_VISUAL_FACT_GRAPH_SCHEMA_V2`.
- Controlled vocabulary version: `CARD_VISUAL_CONTROLLED_VOCABULARY_V1`.
- Energies remain deferred.
- No database writes were performed.
- No approvals, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation were performed.
- Latest four-card OpenAI dry run passed structural validation: `4/4`.
- All four rows routed to `needs_review`.

## Invariants

- `visual_attributes.fact_graph` remains the source of truth.
- Every semantic visual fact must cite valid observation IDs and evidence.
- Evidence-only details stay evidence unless they support a reusable semantic label.
- Artwork search terms must not contain physical print treatment, card UI text, card mechanics, or type-symbol claims.
- Card UI / print markers remain in `card_ui_and_print_markers`.
- Failed or review-routed rows are not approved and are not embedded.

## Tests

Local checks:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
git diff --check

Tests: 39/39 passing
```

Offline replay:

```text
latest failed payloads replayed: 3/3 ok
Mega Darkrai ex normalized search terms: floating Pokemon
Misty's Vitality normalized semantic facts: smiling, standing, indoor swimming pool
Turffield Stadium normalized semantic facts: stadium environment, traffic cones, coniferous trees, reflective water, blue sky with clouds
```

## Dry Run

Final run:

```text
docs/audits/card_visual_semantic_facts_v2_4_card_dry_run/2026-07-17T20-26-09-641Z_dry_run_f9d59350922d/
```

Result:

```text
attempted: 4
validated: 4
failed: 0
skipped: 0
pending: 0
needs_review: 4
database writes: 0
```

Selected cards:

- `GV-PK-JPN-M5-118` - Mega Darkrai ex - `needs_review`
- `GV-PK-JPN-M5-108` - Misty's Vitality - `needs_review`
- `GV-PK-JPN-S6A-100` - Turffield Stadium - `needs_review`
- `GV-PK-JPN-M5-105` - Dark Bell - `needs_review`

Final review packet:

```text
docs/audits/card_visual_semantic_facts_v2_4_card_dry_run/2026-07-17T20-26-09-641Z_dry_run_f9d59350922d/FACT_GRAPH_V2_REVIEW_PACKET.md
```

Artifact hashes:

```text
docs/audits/card_visual_semantic_facts_v2_4_card_dry_run/2026-07-17T20-26-09-641Z_dry_run_f9d59350922d/artifact_hashes.json
```

## Token And Cost Result

```text
request_count: 4
retry_count: 0
input_tokens: 35466
output_tokens: 15697
total_tokens: 51163
cached_input_tokens: 8320
estimated_cost_usd: 0.0368056
average_cost_per_validated_card_usd: 0.0092014
projected_500_cards_usd: 4.6007
projected_1000_cards_usd: 9.2014
projected_full_eligible_catalog_usd: 481.5276648
```

## Why The Visual Layer Remains Derived Intelligence

The graph is still AI-derived from image evidence. Passing structural validation means the graph is shaped and grounded well enough for review. It does not mean facts are human-approved, canonical, embedded, or app-facing.

## What Must Never Be Broken

- Do not write dry-run rows to the database.
- Do not approve these rows automatically.
- Do not embed or expose these rows publicly.
- Do not move card UI / print-marker evidence into artwork modules.
- Do not let print treatment terms become artwork search terms.
- Do not treat compatibility digest text as authoritative.

## Exact Next Gate

Human-review the final four-card V2 semantic facts packet.

Review whether the fact graphs are visually correct, useful, and sufficiently complete for:

- dense Pokemon artwork
- Trainer/person artwork
- environment-heavy Stadium artwork
- object-heavy Item artwork

Do not run a 25-card sample, 125-card sample, production apply, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation until this packet is reviewed and accepted.
