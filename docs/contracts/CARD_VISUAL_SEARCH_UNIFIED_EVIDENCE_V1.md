# Card Visual Search Unified Evidence V1

## Status

Active local-search contract. No production activation is authorized.

## Purpose

Grookai search presents one result set assembled from three governed evidence
lanes:

1. canonical card identity and regular metadata;
2. observable Card Visual Fact Graph evidence;
3. curated cameo relationships.

Collectors do not need to choose a search mode before asking a question.
The result must preserve which lane matched and the authority behind it.

## Evidence Authorities

### Canonical identity

Canonical card name, set, number, branch, printing, and related identity fields
come from Grookai's canonical catalog. A direct canonical-name match ranks above
an indirect cameo-only match for the same unqualified query.

### Visual Fact Graph

Pose, anatomy, clothing, objects, environment, composition, counts, depicted
subjects, and character representations require observation-backed Fact Graph
evidence.

### Curated and human-reviewed evidence

An exact canonical reconciliation proves only which card an external source
references. It does not prove that the named character is visible or establish
its appearance role.

Searchable external evidence must be human image-confirmed or explicitly
role-confirmed. Approved but role-unresolved rows remain review-only.
`external_exact_candidate` rows are reviewer-queue inputs and never reach
collector results.

Every external result carries:

- external source record ID;
- source authority;
- evidence authority and governance status;
- confirmed appearance role;
- source card-print ID;
- explicit display mode, when present;
- `proves_fact_graph_observation: false`.

## Query Behavior

Collector-style multi-subject, representation, relationship, alias, and
minimum-count grammar is governed by
`CARD_VISUAL_SEARCH_COLLECTOR_QUERY_V1`.

### Unqualified identity

`Pikachu` may return:

- canonical Pikachu cards;
- cards with observation-backed Pikachu scene, depicted, or representation
  facts;
- cards with human-confirmed or role-confirmed Pikachu appearances.

Results are grouped as canonical cards, independent artwork appearances,
depictions on another surface, and verified character-shaped objects.

### Explicit cameo

`Pikachu cameo` requires a search-eligible, role-confirmed appearance. A direct
Pikachu card without separate artwork evidence does not satisfy the query.

### Explicit representation or depicted form

`Pikachu pillow`, `Pikachu plush`, `Pikachu statue`, `Pikachu poster`, and
`Pikachu on a screen` require role-and-form evidence bound to Pikachu.

That evidence may come from:

- one observation-backed Fact Graph relationship; or
- one human image-confirmed or explicitly role-confirmed external assertion.

Intrinsic anatomy cannot become a separate represented identity. For example,
Mimikyu's Pikachu-like costume is a `visual_resemblance_reference`; it does not
prove that Pikachu is present in the artwork.

### Mixed semantic facts

Subject-scoped facts must bind to the same subject evidence.

A curated Pikachu association plus an unrelated sleeping human does not satisfy
`Pikachu sleeping`.

Artwork-level constraints may combine across authorities when the query asks
for co-occurrence rather than a subject relationship. The result explanation
must show each independent source.

### Unsupported specificity

The engine returns zero rather than weakening the query.

For example, `Pikachu shaped cookie` remains zero when the source proves a
Pikachu cameo and visible cookies but does not prove that a specific cookie is
Pikachu-shaped.

## Ranking

The local deterministic order is:

1. direct canonical identity;
2. canonical metadata plus supported constraints;
3. observation-backed visual evidence;
4. human image-confirmed evidence;
5. explicitly role-confirmed external evidence;
6. lower-confidence observation-backed lexical evidence.

Role-unresolved and candidate evidence has no collector-facing rank because it
is not eligible for retrieval.

Multiple independent evidence lanes may add a bounded score boost. They may not
replace a missing required relationship.

## Result Contract

Each result exposes:

- artwork group and matching printings;
- `matched_sources`;
- `why_matched`;
- `retrieval_modes`;
- matched evidence terms;
- observation IDs or external evidence IDs;
- authority and governance status for curated evidence;
- deterministic score components.

No external evidence ID is presented as an observation ID.

## Immutable Boundaries

This gate:

- performs no provider calls;
- performs no database reads or writes;
- does not mutate paid Fact Graph payloads;
- does not mutate the immutable projection release;
- creates no embeddings;
- grants no approvals;
- does not activate public or production search.

The imported curated candidates remain reviewable evidence, not canonical
identity truth.

## Next Gate

Run mixed-query human calibration against the unified local lab. Freeze ranking
and authority thresholds only after direct identity, visual discovery, curated
cameos, strict role queries, and valid-zero cases are reviewed together.

Production activation remains downstream of the existing sealed holdout,
private persistence, staged load, and signed-in rollout gates.
