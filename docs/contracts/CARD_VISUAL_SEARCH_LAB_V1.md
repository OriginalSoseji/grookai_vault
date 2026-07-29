# CARD_VISUAL_SEARCH_LAB_V1

Status: Active - local sandbox only

Date: 2026-07-21

## Purpose

The Visual Search Lab makes the locked Card Visual Fact Graph corpus usable for local product testing without activating public search or changing production data.

It provides deterministic query parsing, artwork-first retrieval, printing expansion, Grookai-hosted card images, and evidence-backed explanations over the reconciled V1.5 search projection.

## Inputs

- Locked projection: `CARD_VISUAL_SEARCH_PROJECTION_V1_5`
- In-memory index: `CARD_VISUAL_SEARCH_CANDIDATE_INDEX_V1`
- Corpus inventory: `CARD_VISUAL_CORPUS_SOURCE_INVENTORY_V1`
- Parser: `CARD_VISUAL_SEARCH_QUERY_PARSER_V1`

The lab must not read the sealed 50-query holdout or human judgment submissions.

## Query Behavior

The parser keeps these dimensions separate:

- canonical card subject
- card branch
- explicit set code using `set:<code>`
- visual concepts
- scene-subject, depicted-subject, and character-representation roles
- exact visible counts
- evidence-gated query aliases
- unrecognized terms

Unrecognized terms remain visible. A strict query with an unrecognized term returns zero results rather than silently dropping that constraint.

Canonical subject matching and image-derived subject matching are evaluated as separate deterministic alternatives. Explicit subject-role language disables canonical-name-only matching so a represented subject cannot be replaced by a physically present subject.

## Alias Policy

Aliases are query intent, not stored facts.

- `ghostly` requires one strong ghost-form cue or two distinct weak spectral cues.
- `Halloween` requires two distinct visible cue families such as pumpkins, bats, tombstones, candles, ghost forms, ghost flames, or wisps.
- `stoner`, `high`, `smoked out`, and `under the influence` map to `altered_state_visual_cues` only when smoke or vapor co-occurs with red-eye or eyelid cues, or an explicit smoking-object cue is visible.

Every alias match cites stored observation IDs. Circular alias labels do not count as evidence. The result explains the visible cues and does not claim identity, intoxication, personality, lore, or real-world condition.

## Retrieval And Results

Retrieval remains strict AND across supported constraints.

Results are unique artwork groups. Each result includes:

- representative card and Grookai-hosted image
- all legitimate matching printings
- decomposed score components
- eligibility tier
- matched subject roles
- matched evidence terms
- source document, fact, and observation references
- evidence-gated alias decisions when present

The normal search path remains model-free. No query-time prose or new visual facts are generated.

## Runtime Boundary

The server binds only to a loopback address and uses Node's built-in HTTP server.

Card images pass through a same-origin local proxy. The proxy accepts only source keys approved by the existing Grookai image allowlist, permits PNG, JPEG, and WebP responses, and rejects empty or oversized payloads. It cannot fetch an arbitrary user-supplied host.

The lab has no path for:

- provider calls
- database connections or writes
- description approvals
- embeddings
- persistent index writes
- holdout execution
- query analytics retention
- public release

The index and image metadata caches exist only in process memory.

## Verification

Required checks:

- parser contract tests
- strict zero-result tests
- subject-role separation tests
- exact-count tests
- alias evidence tests
- artwork grouping and printing expansion tests
- HTTP boundary tests
- syntax/import checks
- visual inspection at desktop and mobile widths

## Exact Next Gate

Use the local lab to inspect real searches and complete the 200-query human calibration packet. Public activation, embeddings, database-backed index storage, and the sealed holdout remain separate gated work.
