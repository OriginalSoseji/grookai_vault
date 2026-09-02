# Unified Collector Search UX V1

## Purpose

Grookai Search is one collector-facing product search. Collectors should not
need to understand resolver modes, canonical tables, or product pipelines to
find an exact item.

The interaction model is informed by established collector catalog search:

1. Start with one search field.
2. Show useful visual suggestions while the collector types.
3. Make identity differences visible before a result is opened.
4. Keep filters compact and optional.
5. Let the collector act without navigating through unnecessary screens.

This contract governs the web and Flutter search surfaces.

## Search Entry

The primary search control contains:

- a TCG selector;
- a free-text query;
- a clear action when text is present;
- a submit action where the platform requires one.

The query may contain a card name, set, collector number, Grookai ID, finish,
stamp, language, artist, or supported visible-artwork concepts. Technical
resolver vocabulary is never required.

## Live Suggestions

After at least two non-whitespace characters, web search returns a bounded
list of visual suggestions. Each suggestion must show, when available:

- card image;
- exact display name;
- TCG;
- set;
- collector number;
- rarity;
- finish or printing discriminator.

Suggestion selection opens the canonical card route and preserves an exact
printing reference when the resolver supplied one. Suggestions never mutate
the Vault.

## Result Identity

Every result must distinguish the card without requiring a detail-page visit.
At minimum, results show:

- image;
- display name;
- set;
- collector number;
- rarity;
- finish or variant when known;
- governed market price when the viewer is entitled;
- ownership state when the viewer is signed in.

Representative artwork must remain labeled. A representative image cannot be
presented as proof of an exact stamp, finish, error, or parallel.

## TCG Scope

V1 exposes the currently governed searchable catalogs:

- Pokemon;
- One Piece;
- Magic: The Gathering.

The selected TCG is a filter on one search experience, not a separate search
application. Set browsing may still provide a TCG > sets > cards hierarchy.

## Collection Actions

Quick add is allowed only when Grookai can preserve exact identity. When more
than one printing is possible, the action opens the existing exact-version
selection boundary. Search must never silently choose a finish or variant.

## Filter Model

Secondary filters remain behind a compact filter control. Supported filters
may include:

- TCG;
- language;
- card identity or variant family;
- rarity;
- ownership state;
- price range;
- image confidence;
- sort order;
- result view.

Active filters must be visible and removable. Empty states must explain which
constraints produced zero results without substituting partial matches.

## Product-Type Boundary

Collectr demonstrates the value of searching raw cards, sealed products, and
graded inventory together. Grookai must not imitate that visually before the
data contract is ready.

V1 searches canonical card products only. Sealed products and slabs may enter
the same interface only after each has:

- a canonical product identity;
- exact variant or grade identity;
- image authority;
- governed pricing;
- ownership integration;
- a shared search-document contract;
- a canonical detail route.

Until then, the UI must not display inactive product-type controls or merge
warehouse-only rows into collector results.

## Safety Invariants

- Search never writes to canonical identity tables.
- Suggestions never write to the Vault.
- Search results never infer an exact printing without evidence.
- Semantic similarity cannot satisfy hard identity constraints.
- Candidate or provisional evidence stays visibly separated.
- Signed-in catalog boundaries remain enforced.
- Raw observations, governance codes, and internal evidence IDs stay out of
  the ordinary collector UI.

## Acceptance

V1 is acceptable when:

- live suggestions are keyboard and pointer accessible;
- suggestions preserve exact-printing routes;
- Pokemon, One Piece, and MTG can be selected from the primary search flow;
- every suggestion exposes set and collector-number identity when available;
- ordinary submit behavior still reaches the governed resolver;
- empty, loading, failure, and no-image states do not shift the control layout;
- no search interaction mutates collection data without an explicit action.
