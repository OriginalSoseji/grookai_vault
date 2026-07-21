# Card Visual Search Projection V1.5 Lock

Status: COMPLETE - OFFLINE PROJECTION LOCKED

Date: 2026-07-21

## Context

The locked eligibility and artwork-grouping layers provide `9,532` search-eligible non-Energy artworks across `9,702` card printings. Search needs compact subject, scene, and style/composition documents while retaining exact links to the Fact Graph V2 evidence that produced every term.

## Problem

Fact graphs intentionally preserve broad raw evidence, including card UI and inconsistent model taxonomies. Directly indexing those graphs would leak HP, attack text, illustrator credits, set symbols, print logos, and other non-artwork evidence. Generic observation kinds could also route anatomy into scene documents or environment evidence into subject documents.

## Risk

UI leakage would make visual search return cards for mechanics or printing metadata rather than artwork. Role confusion would degrade queries such as `black eyes`, `blue sky`, or `trainers wearing gloves`. Silent projection changes would make retrieval results unauditable.

## Decision

Lock `CARD_VISUAL_SEARCH_PROJECTION_V1_5` at producing commit:

`34cc15ee13d485e648bb9162856b8a85718ab0b2`

Each artwork has exactly three deterministic documents:

- `subject`
- `scene`
- `style_composition`

Every projected entry retains valid supporting observation IDs. Canonical identity remains separate context and is never recast as visual evidence. Empty documents remain explicit instead of receiving invented fallback content.

## Repairs Before Lock

- V1 structurally reconciled but leaked `16,840` card-UI entries and misrouted subject-linked generic observations.
- V1.1 added source-taxonomy UI exclusion and evidence-linked subject routing, but independent inspection found UI evidence hidden under generic artwork modules.
- V1.2 propagated raw-observation UI classification to all derived facts, concepts, counts, relationships, and search terms; one explicit `printed on card` observation remained.
- V1.3 removed that residual and reached zero UI scan matches, but branch inspection exposed substring routing collisions: `ground` in `fact_grounded` and `face` in `surface`.
- V1.4 introduced controlled token-boundary routing, then inspection found unnormalized underscore-separated observation kinds.
- V1.5 normalizes every routing input before classification and gives explicit subject/scene/style evidence taxonomy precedence over conflicting derived context.

All failed artifacts remain immutable evidence and are not search locks.

## Alternatives Rejected

- Index the full graph JSON: too noisy and would blend evidence, metadata, review state, and compatibility fields.
- Use a flat banned-word list: the same text or logo can be valid inside artwork and invalid as card UI.
- Rewrite source facts: projection must not mutate the derived evidence record.
- Treat every object as scene evidence: body components and clothing are frequently emitted with generic object kinds.
- Treat structural reconciliation as semantic approval: V1 proved that counts and hashes can reconcile while content remains unsafe.

## Locked Result

- Artwork groups: `9,532`
- Card printings: `9,702`
- Tier A artworks: `2,634`
- Guarded Tier B artworks: `6,898`
- Pokémon artworks: `8,520`
- Trainer artworks: `581`
- Item/Tool/Supporter artworks: `351`
- Stadium artworks: `80`
- Energy artworks: `0`
- Documents: `28,596`, exactly three per artwork
- Complete documents: `22,766`
- Explicit empty documents: `5,830`
- Evidence entries: `357,413`
- Recorded exclusions: `168,046`
- Projection failures: `0`
- Duplicate artwork, printing, or document IDs: `0`
- Input hash mismatches: `0`

## Semantic Cleanliness Proof

An independent scan over every saved evidence entry returned zero matches for:

- explicit card interface/frame/border text;
- attacks, abilities, HP, weakness, resistance, retreat, and evolution mechanics;
- set, rarity, stage, regulation, type, or Energy metadata symbols;
- illustrator, copyright, legal, and collector-number evidence;
- unhosted Pokémon League, Strike, or WB Kids print logos; and
- unhosted overlaid text modeled as artwork effects.

Host-backed artwork text and logos on signs, books, paper, screens, boards, buildings, walls, or clothing remain eligible.

Representative role checks proved:

- Azumarill eyes, body color, ears, markings, mouth, and tail route to `subject`.
- Cerulean City Gym sky and dome evidence route to `scene`.
- Korrina clothing, hair, body evidence, accessories, and skating gesture route to `subject`; the rink routes to `scene`.
- Pokégear device and map details route to `scene`, with objective device colors available in style/composition.

The final cross-route audit found six mixed-support search terms whose subject route is intentional and defensible, including subject-plus-object phrases such as `Team Aqua Grunt with Poké Ball`, `three headed dragon`, and subject-plus-palette phrases such as `electric yellow Pokemon`. No single-domain environment or body term remained misrouted.

## Deterministic Replay

A same-commit full replay produced byte-identical semantic artifacts:

- `visual_search_artworks.jsonl`: `f709b8ce3804ba79474288b01b3fea6f65d780f05a8fb3803ca5627eebd52e16`
- `visual_search_printings.jsonl`: `4ddbe8770db5ea56d56a22175a2722dacc993b4fb0fc09f19d6dfaf7a043b359`
- `visual_search_documents.jsonl`: `663d4a8a2abdbc3cc3230e4208a3168a7eb92006a8bcfbe56fcf2a58527e721b`
- `visual_search_concept_evidence.jsonl`: `b8161741642d0433f1944dd425ac101e73018c28be94f36f87b32fc89d35d69f`
- `visual_search_projection_exclusions.jsonl`: `dfc59abdaefc75c45a85d6e9436d11e1e44917007bc0ae82207d139d677aba4a`
- `visual_search_projection_failures.jsonl`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

The permanent artifact manifest also verifies every run file.

## Current Truths

- Projection V1.5 is the locked offline search-document source for this corpus.
- Fact Graph V2 remains source evidence; projection is replaceable derived retrieval data.
- Empty style or subject documents can be correct for sparse or nonliving artwork.
- Tier B guards suppress only affected evidence and remain visible in every document.
- Search quality is not yet proven merely because projection is clean and deterministic.

## Invariants

- Every projected fact cites existing artwork observations.
- Card UI and print-marker evidence never enters artwork documents, including through a derived claim.
- Canonical identity is context, not visual evidence.
- Every locked artwork has exactly three records and every printing maps to exactly one artwork group.
- Energy and Tier C rows remain excluded.
- Source facts are never rewritten by projection.

## What Must Never Be Broken

- Never activate documents from an unreconciled or semantically uninspected projection.
- Never remove evidence IDs or exclusion hashes to simplify indexing.
- Never merge subject, scene, and style into one opaque text blob.
- Never infer artwork sharing from vectors or names.
- Never expose Tier B evidence without its rank adjustment and guard metadata.
- Never treat `not observed`, an empty document, or a guard exclusion as proof of absence.

## Boundaries Proven

Projection and replay made no provider calls, database connections or writes, approvals, embeddings, index writes, or public reads.

## Artifacts

Locked V1.5 projection:

`docs/audits/card_visual_search_projection_v1_5/2026-07-21T17-23-42-102Z_projection_c3e708b1cd15/`

Failed inspection artifacts retained under:

- `docs/audits/card_visual_search_projection_v1/`
- `docs/audits/card_visual_search_projection_v1_1/`
- `docs/audits/card_visual_search_projection_v1_2/`
- `docs/audits/card_visual_search_projection_v1_3/`
- `docs/audits/card_visual_search_projection_v1_4/`

## Tests

- Projection, grouping, eligibility, audit, and corpus contracts: `58/58` passed.
- Syntax/import check: passed.
- `git diff --check`: passed.
- Full repository shipcheck was not run because `SUPABASE_DB_URL` is unavailable; no database-dependent result is claimed.

## Explicit Next Gate

Implement and run the fixed offline `CARD_VISUAL_SEARCH_EVALUATION_V1` lexical and structured query suite against this exact projection. Measure relevance, false positives, false negatives, role correctness, Tier B behavior, explanations, and zero-result safety. Do not generate embeddings, write index tables, run a migration, or expose search publicly until evaluation passes.
