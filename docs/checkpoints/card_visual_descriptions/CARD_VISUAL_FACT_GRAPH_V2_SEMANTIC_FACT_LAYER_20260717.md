# CARD_VISUAL_FACT_GRAPH_V2_SEMANTIC_FACT_LAYER_20260717

Status: FAILED GATE

Date: 2026-07-17

## Context

Grookai pivoted from prose-first card descriptions to `visual_attributes.fact_graph` as the authoritative visual knowledge layer. V2 already had raw observations, typed facts, modules, module reviews, controlled vocabulary concepts, and separated card UI / print-marker evidence.

This gate added a second explicit level: reusable `semantic_visual_facts` with supporting evidence. The goal was to preserve obvious meaning-level visual facts such as `happy`, `sleeping`, `smiling`, `forest`, `floating`, `standing`, `stadium`, or `ten trees` without forcing later systems to reconstruct them from low-level geometry.

## Problem

The previous strict V2 graph avoided some hallucination by storing low-level observations, but it underrepresented useful human-level facts. Search, Taste Engine, Grookai Signature, recommendations, cameo detection, matching, and future story generation need both:

- meaningful supported visual facts
- the observable evidence behind those facts

At the same time, semantic facts can reintroduce unsupported story, lore, UI leakage, surface overclaims, and overly loose language if the validator accepts them too broadly.

## Risk

The main risk is letting model-generated semantic labels become accepted visual truth without enough grounding. The latest dry run showed this risk directly: failed payloads included unsupported or risky search output such as `gold foil`, `dark energy symbol`, and broad labels like `eyes not clearly visible`, `neutral eyebrows`, `traffic cones`, and `blue sky with clouds` in the semantic lane.

## Decision

Keep `visual_attributes.fact_graph` authoritative and add `semantic_visual_facts` as a required V2 graph field.

Semantic facts are allowed only when they have:

- a supported category
- a label inside the governed semantic vocabulary
- valid supporting observation IDs
- explicit evidence fields
- no story, lore, intention, personality, or unsupported theme

This gate does not pass until semantic cleanliness holds across the four-card dry run. The implementation and contracts can be kept, but the final OpenAI run is not accepted as a production-ready packet.

## Alternatives Rejected

- Rejected prose-first repair: this would continue optimizing captions instead of building the reusable visual knowledge layer.
- Rejected low-level-only facts: future systems should not need to infer `happy`, `sleeping`, `forest`, or `floating` from raw mouth/eye/body/environment geometry when the concept is visually obvious.
- Rejected broad allow-list expansion: the final run showed that relaxing validation enough to pass would allow risky search terms and UI/surface leakage.
- Rejected database apply: this gate is dry-run only and failed validation.

## Compatibility Behavior

`artwork_description` remains a deterministic compatibility digest generated from the graph. It is not equal authority with the fact graph and must not introduce facts absent from the graph.

The latest diagnostic file derives compatibility digests for failed raw payloads only for review convenience; those failed payloads are not accepted outputs.

## Current Truths

- Active prompt version: `CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2`.
- Active fact graph schema: `CARD_VISUAL_FACT_GRAPH_SCHEMA_V2`.
- Controlled vocabulary version: `CARD_VISUAL_CONTROLLED_VOCABULARY_V1`.
- Energies remain deferred for this gate.
- No database writes were performed.
- No approvals, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation were performed.
- The final OpenAI dry run did not satisfy the gate: `1/4` validated and `3/4` failed validation.

## Invariants

- `visual_attributes.fact_graph` is the source of truth.
- Every meaningful typed fact must cite valid observation IDs.
- Every semantic visual fact must cite valid observation IDs and evidence.
- Search terms must trace to validated visual facts.
- Card UI and print markers stay separate from artwork facts.
- Actual physical card surface claims require reliable visible evidence.
- Unsupported story, intention, lore, personality, and theme remain excluded.
- Failed validation rows are audit material only, not accepted descriptions.

## Test Output

Targeted local checks passed after the semantic repair:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
git diff --check

Tests: 39/39 passing
```

The tests now cover semantic facts such as `happy`, `sleeping`, `forest`, `ten trees`, cameo/representation search, `arms raised`, `eyes closed`, `posing`, and `stadium`.

## Dry Run Output

Latest run:

```text
docs/audits/card_visual_semantic_facts_v2_4_card_dry_run/2026-07-17T19-55-40-341Z_dry_run_2c0a2a1d9265/
```

Result:

```text
attempted: 4
validated: 1
failed: 3
skipped: 0
pending: 1
needs_review: 0
database writes: 0
```

Selected cards:

- `GV-PK-JPN-M5-118` - Mega Darkrai ex - failed validation
- `GV-PK-JPN-M5-108` - Misty's Vitality - failed validation
- `GV-PK-JPN-S6A-100` - Turffield Stadium - failed validation
- `GV-PK-JPN-M5-105` - Dark Bell - validated, `pending`

Readable diagnostic:

```text
docs/audits/card_visual_semantic_facts_v2_4_card_dry_run/2026-07-17T19-55-40-341Z_dry_run_2c0a2a1d9265/SEMANTIC_FACT_DRY_RUN_DIAGNOSTIC.md
```

Review packet for validated rows:

```text
docs/audits/card_visual_semantic_facts_v2_4_card_dry_run/2026-07-17T19-55-40-341Z_dry_run_2c0a2a1d9265/FACT_GRAPH_V2_REVIEW_PACKET.md
```

## Token And Cost Result

Latest OpenAI dry run telemetry:

```text
request_count: 4
retry_count: 0
input_tokens: 34926
output_tokens: 16737
total_tokens: 51663
cached_input_tokens: 13056
estimated_cost_usd: 0.0368328
```

Because only `1/4` validated, the per-validated-card projection is not representative of production economics and must not be used for catalog planning.

## Why The Visual Layer Remains Derived Intelligence

The fact graph is generated from images and model interpretation. It can support search, review, and downstream intelligence only after validation and human review gates. It must not override canonical card identity, pricing, ownership, public app behavior, or approved human knowledge.

## What Must Never Be Broken

- Do not write failed dry-run rows to the database.
- Do not approve generated rows from this gate.
- Do not generate embeddings from failed or unreviewed fact graphs.
- Do not mix card UI evidence into artwork modules.
- Do not copy variant-specific print-marker evidence across variants without that variant image.
- Do not turn unsupported story/lore/personality into search facts.
- Do not treat compatibility digest text as authoritative.

## Exact Next Gate

Do not run a larger sample.

The next gate is an offline semantic-cleanliness repair:

1. Replay the latest three failed payloads.
2. Add validators for UI/search leakage such as `dark energy symbol` in artwork search terms.
3. Add validators or normalizers for physical-surface leakage such as `gold foil`.
4. Decide which semantic labels are allowed facts versus low-level evidence only.
5. Keep validation strict enough that risky search output does not pass.
6. Run contract tests only.
7. Rerun the same four-card OpenAI dry run once the failed payloads replay cleanly offline.

No DB writes, approvals, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, story generation, 25-card sample, 125-card sample, or production apply until the four-card semantic facts gate validates cleanly.
