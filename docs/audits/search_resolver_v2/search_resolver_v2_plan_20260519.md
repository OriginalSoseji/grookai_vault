# Search Resolver V2 Plan

Date: 2026-05-19

## Objective

Create a search system that lets website and app users search by any stable print identity field without weakening public routing rules.

Working lane name:

```text
PRINT_IDENTITY_SEARCH_V1
```

## Non-Goals

- Do not enable `/card/<printing_gv_id>` as a public route.
- Do not change parent `card_prints.gv_id`.
- Do not change Species Dex denominators.
- Do not use AI as ranking authority.
- Do not expose raw UUIDs.
- Do not rewrite pricing or scanner behavior.

## Product Rule

Search may find child printings as distinct collectible objects, but canonical public routing remains parent-based:

```text
/card/<parent_gv_id>?printing=<printing_gv_id>
```

Direct `/card/<printing_gv_id>` remains disabled until a separate public route contract exists.

## Proposed Architecture

### 1. Canonical Search Document Layer

Create a read model, preferably a DB view first:

```text
public.v_print_identity_search_documents_v1
```

Each row represents one searchable identity object:

- `parent_print`
- `child_printing`

Suggested fields:

```text
search_document_id
object_type
card_print_id
card_printing_id
public_id
parent_gv_id
printing_gv_id
route_path
route_query
name
set_code
set_name
printed_set_abbrev
number
number_plain
number_padded
number_slashed
rarity
variant_key
variant_label
printed_identity_modifier
printed_identity_modifier_label
finish_key
finish_label
display_discriminator
print_identity_key
external_ids
search_text
search_tokens
rank_bucket
```

Parent rows should include parent identity only. Child rows should include parent identity plus child finish identity.

### 2. Governed Search Vocabulary

Create a deterministic vocabulary layer, initially code-owned and later table-backed if needed.

It must normalize:

- `reverse holo`, `rev holo`, `rh` -> `reverse`
- `master ball`, `masterball`, `mb` -> `masterball`
- `poke ball`, `pokeball`, `pb` -> `pokeball`
- `holo`, `foil` -> `holo`
- `normal`, `standard`, `base` -> `normal`
- `play pokemon stamp`, `play pokemon`, `pokemon stamp`
- `prerelease`, `pre release`
- `staff prerelease`, `staff`
- `pokemon together`
- `delta species`
- `illustration rare`, `ir`
- `special illustration rare`, `sir`
- `shiny rare`, where this is a lawful parent variant, not a child finish

This vocabulary must feed both parsing and ranking. It should not live as ad hoc UI text matching.

### 3. New Search RPC

Add a new RPC instead of stretching `search_card_prints_v1`:

```text
public.search_print_identity_v1(
  q text,
  set_code_in text default null,
  number_in text default null,
  object_type_in text default null,
  limit_in int default 50,
  offset_in int default 0
)
```

Return a stable payload including:

```text
object_type
card_print_id
card_printing_id
parent_gv_id
printing_gv_id
display_name
display_subtitle
display_discriminator
route_path
route_query
matched_fields
rank_score
```

The RPC should use indexes appropriate to production:

- normalized exact ID indexes
- set/number btree indexes
- trigram index for fuzzy text if extension is available
- `tsvector` generated column or materialized search table if view performance is not enough

### 4. Web Resolver Integration

Wire `/api/resolver/search` to use `search_print_identity_v1` for candidate generation.

Rules:

- Ranked results can include child printing rows.
- Parent cards and child printings must render with different subtitles/badges.
- Selecting a child result opens the parent route with selected printing context.
- Direct `/search` redirect can resolve exact child `printing_gv_id`, but must redirect to parent route with query context.
- Ambiguous queries should go to Explore, not force a redirect.

### 5. Mobile Integration

Mobile should consume the same `/api/resolver/search` contract as web.

Required mobile result additions:

- `object_type`
- `parent_gv_id`
- `printing_gv_id`
- `finish_label`
- `display_discriminator`
- `route_context`

Then deprecate the direct mobile fallback to `search_card_prints_v1` for online search. Keep local browse fallback only for empty/default catalog browsing.

### 6. Explainability and Debugging

Every resolver response should expose safe metadata:

```text
resolver_state
matched_fields
score_components
top_match
candidate_count
search_document_version
```

This is necessary because search will span parent identity, child finish identity, external IDs, and aliases.

## Build Phases

### Phase 0 - Contract and Regression Matrix

Create:

```text
docs/contracts/PRINT_IDENTITY_SEARCH_V1.md
docs/audits/search_resolver_v2/search_resolver_regression_matrix_20260519.json
```

Include required queries:

- `GV-PK-ME03-033`
- `GV-PK-ME03-033-RH`
- `espurr reverse holo`
- `me03 033 reverse`
- `pikachu master ball`
- `pikachu pokeball`
- `sv8pt5 exeggutor pokeball`
- `sv8pt5 exeggutor master ball`
- `leafeon play pokemon stamp`
- `pokemon together pikachu`
- `charizard 4/102`
- `base set charizard`
- external IDs from `external_ids` samples

### Phase 1 - No-Write Search Document Audit

Build a script that generates the proposed search documents without writing:

```text
scripts/audits/print_identity_search_v1.mjs
```

Output:

```text
docs/audits/search_resolver_v2/print_identity_search_documents_preview_20260519.json
docs/audits/search_resolver_v2/print_identity_search_documents_preview_20260519.md
```

Prove:

- parent document count
- child document count
- child documents with `printing_gv_id`
- blocked child documents missing `printing_gv_id`
- duplicate `public_id` count
- top missing identity fields

### Phase 2 - DB View / RPC Draft

Create migration draft only after Phase 1 is clean.

Preferred first migration:

```text
v_print_identity_search_documents_v1
search_print_identity_v1
```

Do not drop `search_card_prints_v1`. Keep it as legacy compatibility until both app and website are migrated.

### Phase 3 - Web Ranked Resolver

Change `getExploreRows` candidate generation to use the new RPC.

Keep existing ranking as a fallback while the new matched-fields payload is validated.

### Phase 4 - Direct Search Routing

Update `/search` behavior:

- Exact parent `gv_id` -> `/card/<parent_gv_id>`
- Exact child `printing_gv_id` -> `/card/<parent_gv_id>?printing=<printing_gv_id>`
- Exact set -> `/sets/<set_code>`
- Ambiguous identity -> `/explore?q=...`

### Phase 5 - Mobile App

Update mobile models and search result handling to display and preserve child printing context.

Search result cards should show:

- parent card name
- set/number
- variant/finish discriminator
- route context

### Phase 6 - Performance Hardening

Run production-like smoke:

- `p95 < 500ms` for exact ID and set/number
- `p95 < 1200ms` for fuzzy text under normal cache
- bounded result count
- no N+1 card_printings loads
- no giant nested JSON payloads

If the view is too slow, promote to a materialized table refreshed by a governed worker.

## Acceptance Criteria

The lane is complete when:

- Website and mobile resolve the same query to the same canonical result contract.
- Parent and child public IDs are searchable.
- Finish labels and variant labels are searchable.
- Search results carry selected child printing context without enabling child public routes.
- Legacy `search_card_prints_v1` is no longer the primary candidate source.
- Regression matrix passes for parent, child, finish, set, number, and external ID examples.

