# Card Visual Search Persistence V1

Status: UNAPPLIED DESIGN CONTRACT

## Purpose

Persist the governed Card Visual Search V1 projection without exposing raw
generated descriptions, changing canonical identity, or activating search.

## Authority

- `card_prints` remains canonical printing identity authority.
- `card_print_visual_descriptions.visual_attributes.fact_graph` remains the
  source generated evidence.
- The immutable external corpus release is the load authority.
- Projection tables are derived, release-scoped search intelligence.
- Snapshot names, set codes, numbers, and GV-IDs are provenance fields only.

## Release Model

Each load creates an immutable row in `card_visual_search_releases` and
release-scoped rows in:

- `card_visual_search_artworks`
- `card_visual_search_printings`
- `card_visual_search_documents`
- `card_visual_search_evidence`
- `card_visual_search_index_entries`

The tables must reconcile against the frozen artifact counts and hashes before
the release can become `validated`.

`card_visual_search_active_release` is a singleton pointer. The schema
migration inserts no pointer row. Activation is a separate write gate with
separate evidence.

## Search Runtime

The production runtime preserves the existing architecture:

```text
query
-> deterministic JavaScript intent parser
-> service-only exact candidate prefilter
-> bounded group/document hydration
-> governed JavaScript ranker
-> evidence-backed result explanation
-> printing expansion
```

The database does not replace the governed parser or ranker with approximate
SQL semantics.

`get_card_visual_search_candidates_service_v1` returns the union of exact
candidate-index matches. It does not claim final relevance.

`get_card_visual_search_groups_service_v1` hydrates at most 2,000 selected
artwork groups for final ranking.

## Security

- Every persistence table has RLS enabled.
- `public`, `anon`, and `authenticated` receive no table grants.
- Both RPCs are revoked from `public`, `anon`, and `authenticated`.
- Only `service_role` may load, validate, activate, or call the RPCs.
- A later authenticated product RPC must be separately designed, bounded,
  licensed, tested, and approved.

## Embeddings

PostgreSQL has pgvector available, but Persistence V1 creates no embedding
column or vector index.

Embedding model, dimensions, input construction, cost, refresh policy, hybrid
ranking weight, and evaluation thresholds require a separate gate after human
calibration. Structured/lexical search must remain independently functional.

## Load Invariants

- A release is immutable after validation.
- All artwork IDs, document IDs, hashes, and row counts reconcile exactly.
- Every printing references a canonical `card_prints` row.
- Every document references one release artwork.
- Every evidence row references one document and one artwork.
- Every index entry is derived deterministically from the same projection and
  ranker version.
- No Tier C or Energy row is loaded.
- No release is activated by the migration or loader plan.

## Current Stop Boundary

The migration is intentionally unapplied. The corpus is intentionally unloaded.
No public or authenticated visual-search endpoint exists. PokeJavi's calibration
review remains the human-quality dependency before apply/load/activation gates.
