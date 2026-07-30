# Card Visual Search Persistence V1, V2 Authority Amendment

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
- `card_visual_evidence_assertions`

Candidate and human-review work remains isolated in:

- `card_visual_external_sources`
- `card_visual_evidence_candidates`
- `card_visual_evidence_reviews`
- `card_visual_search_corrections`

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
artwork groups for final ranking. Hydration includes both Fact Graph documents
and immutable release-scoped evidence assertions.

The document set has four isolated types:

- `subject`
- `scene`
- `style_composition`
- `representation_cameo`

`depicted_subject`, `character_representation`, and
`visual_resemblance_reference` evidence belongs in `representation_cameo`.
Resemblance never proves that another character is independently present.

## Evidence Promotion

Every external adapter and import must first resolve to
`card_visual_external_sources`. The registry records acquisition mode,
permission status, allowed uses, authority ceiling, and rights evidence.
Unknown-rights sources cannot enable network acquisition or snapshot imports.

External imports enter `card_visual_evidence_candidates` even when their
canonical card match is exact. An exact candidate is not search authority.

PokeJavi and other first-pass reviewers create draft rows in
`card_visual_evidence_reviews`. Draft decisions do not change active search.
Founder-confirmed or explicitly role-confirmed evidence may be promoted into a
future immutable release as `card_visual_evidence_assertions`.

External evidence references use governed string identifiers such as
`cvr_...` and `founder_review_...`. They must remain strings, must not be
coerced into UUIDs, and must never masquerade as observation IDs.

Search-eligible authority is limited to:

- observation-backed Fact Graph evidence;
- human image-confirmed evidence;
- explicitly role-confirmed external evidence.

Approved but role-unresolved associations and `external_exact_candidate` rows
remain review-only.

## Security

- Every persistence and staging table has RLS enabled.
- `public`, `anon`, and `authenticated` receive no table grants.
- Both search RPCs are revoked from `public`, `anon`, and `authenticated`.
- Only `service_role` may load, validate, activate, or call the RPCs.
- `submit_card_visual_search_correction_v2` is the only authenticated write
  surface. It inserts a bounded report into staging and cannot mutate evidence,
  assertions, releases, or the active pointer.
- Signed-in search uses a server-side adapter and the service-only read RPCs;
  the browser never receives service-role credentials.

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
- Every search-facing evidence row references image observations or governed
  external evidence.
- Appearance role and evidence authority remain explicit.
- Candidate, draft review, and final assertion records are never conflated.
- Every external candidate references a governed source-registry row.
- Network acquisition requires recorded permission evidence and a reviewed
  terms snapshot hash.
- Corrections never alter the active release.
- Every index entry is derived deterministically from the same projection and
  ranker version.
- No Tier C or Energy row is loaded.
- No release is activated by the migration or loader plan.

## Current Stop Boundary

The migration is intentionally unapplied. The corpus is intentionally unloaded.
The migration remains unapplied and no visual-search release is active. The
signed-in product adapter must fail closed to canonical search until a release
has passed calibration, migration, load, and activation gates. Public anonymous
visual search remains outside this release.
