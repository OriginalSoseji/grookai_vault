# CARD_VISUAL_FACT_GRAPH_V2_DETERMINISTIC_CLEANUP_20260717

Status: COMPLETE

Date: 2026-07-17

## Context

The V2 semantic-cleanliness repair produced a structurally valid four-card packet, but human review found deterministic vocabulary drift in otherwise valid facts:

- duplicate canonical visual concepts with different support sets
- exact subject identity inside generic search phrases
- broad visual-design support assigning concepts to unrelated observations
- style/surface residue such as `comic style drawing`, `holographic foil`, and `magical`
- `water scene` wording where `water body` is the stable visual term

This gate is deterministic cleanup only. It does not change the prompt architecture, schema, migrations, database state, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation.

## Problem

The ontology was stable, but downstream search would still inherit avoidable language variance:

- `floating Mega Darkrai` and `yellow and black Mega Darkrai` mixed identity with visual concepts.
- Duplicate concepts such as `floating`, `water`, `building`, and `tree` appeared multiple times.
- A single broad `visual_design.supporting_observation_ids` list could attach `water` to non-water observations.
- Visual-design fields could retain style or print-treatment terms that are not stable artwork facts.

## Risk

If this remained unchanged, semantic search and future taste/signature systems would have to normalize preventable variance later. Worse, canonical visual concepts could appear evidence-backed while citing observations that only mentioned a concept incidentally.

## Decision

Implement `FACT_GRAPH_V2_DETERMINISTIC_CLEANUP_V1`:

- canonical concepts dedupe by concept name and union valid support IDs
- exact known subject identity is removed from redundant generic search phrases
- supported semantic/cameo compounds such as `happy Pikachu`, `Pikachu pillow`, and `Pikachu cameo` remain intact
- `water scene` normalizes to `water body`
- visual-design cleanup removes style/surface residue from visual-design fields
- environmental concept support for `water`, `tree`, `building`, `sky`, and `cloud` requires the supporting observation itself to carry that concept
- broad fallback support is disabled for those environmental concepts

## Alternatives Rejected

- Rejected another prompt rewrite: the issue was deterministic language variance, not extraction architecture.
- Rejected dropping raw observation labels: raw labels remain audit evidence.
- Rejected stripping all identity compounds: some supported semantic/cameo terms are useful search concepts.
- Rejected broad design support for concept derivation: it overattached concepts to unrelated observations.

## Current Truths

- Active prompt version: `CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2`.
- Active schema version: `CARD_VISUAL_FACT_GRAPH_SCHEMA_V2`.
- Controlled vocabulary version: `CARD_VISUAL_CONTROLLED_VOCABULARY_V1`.
- `visual_attributes.fact_graph` remains source truth.
- `artwork_description` remains deterministic compatibility digest only.
- Energies remain deferred.
- No OpenAI calls were made for this cleanup.
- No database writes, approvals, embeddings, app-facing reads, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation were performed.

## Invariants

- Raw observation labels must be preserved.
- Normalization must not introduce observations, typed facts, subjects, counts, or relationships.
- Search terms must remain visual and evidence-backed.
- Card UI / print-marker evidence must stay out of artwork modules.
- Canonical concepts are derived intelligence and must cite existing observation IDs.
- Human review remains required before approval or downstream use.

## Tests

Local checks:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs

Tests: 40/40 passing
```

The new regression covers:

- concept deduplication
- `water scene` -> `water body`
- redundant exact identity removal from generic search terms
- preservation of supported semantic/cameo identity compounds
- visual-design style/surface cleanup
- false-positive concept support prevention

## Offline Replay

Source run:

```text
docs/audits/card_visual_semantic_facts_v2_4_card_dry_run/2026-07-17T20-26-09-641Z_dry_run_f9d59350922d/
```

Final cleanup artifact:

```text
docs/audits/card_visual_controlled_vocabulary_v1_cleanup/2026-07-17T20-56-57-949Z_deterministic_cleanup/
```

Replay result:

```text
replayed: 4
structurally_validated: 4/4
validation_failures: 0
raw_observation_label_changes: 0
duplicate_canonical_concept_extra_entries_before: 15
duplicate_canonical_concept_extra_entries_after: 0
redundant_identity_search_terms_after_cleanup: 0
review_status_changes: 0
database_writes: 0
openai_calls: 0
```

Selected row changes:

```text
Mega Darkrai ex:
  floating Mega Darkrai -> floating
  yellow and black Mega Darkrai -> yellow and black

Turffield Stadium:
  water concept support reduced to obs_env_lake_001 only
  sky concept support reduced to obs_env_sky_001 only
  tree concept support reduced to obs_env_trees_001 only
```

Artifact hashes:

```text
replay_results.json: 12707bed90d11ed37c216e3be37b377018720ec22c9af418bd9c15183c5f380e
review_sample_after_cleanup.jsonl: a356174577bf2b02ac008505fdf29531196318f34321ffe22da36f94d501658c
VOCABULARY_DRIFT_REPORT.md: 2cb7c0e198664b9b5d82d8917ffcba428530993a861e6f6feaa395141a4bc3ed
```

## Token And Cost Result

This gate made no OpenAI calls and spent no model tokens.

The source four-card dry run remains:

```text
request_count: 4
retry_count: 0
input_tokens: 35466
output_tokens: 15697
total_tokens: 51163
cached_input_tokens: 8320
estimated_cost_usd: 0.0368056
```

## Why The Visual Layer Remains Derived Intelligence

The cleanup improves deterministic consistency of AI-derived facts. It does not make any row human-approved, canonical, embedded, public, or downstream-authoritative.

## What Must Never Be Broken

- Do not treat canonical visual concepts as raw facts.
- Do not let broad visual-design support attach concepts to unrelated observations.
- Do not use exact subject identity as generic search padding.
- Do not remove supported semantic/cameo compounds that are intentionally searchable.
- Do not expose these private rows to app-facing reads before an explicit gate.

## Explicit Next Gate

Run one launch-value 25-card OpenAI dry run with Energies excluded, using the frozen V2 architecture and deterministic vocabulary cleanup. Do not patch midway. The run must remain dry-run only: no DB writes, approvals, embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation.
