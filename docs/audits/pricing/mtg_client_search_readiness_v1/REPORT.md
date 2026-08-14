# MTG Client And Search Readiness V1

- Result: **BLOCKED_BEFORE_MTG_CLIENT_RELEASE**
- Surfaces audited: `8`
- Capability checks: `68`
- Ready: `35`
- Partial: `8`
- Blocked: `25`
- Release blockers: `4`
- Database access/writes: `0/0`

## Release Gates

| Gate | Status | Reason |
|---|---|---|
| `game_scoped_client_read_model` | blocked | Search and catalog queries need an explicit game scope before MTG can be released beside Pokemon. |
| `multiface_identity_and_image_model` | blocked | Structured face names and face images are absent from the frozen payload and both clients. |
| `exact_mtg_collector_number_search` | blocked | Exact search must preserve suffix, symbol, dagger, and other nonnumeric collector tokens. |
| `explicit_language_contract` | blocked | Current language scope relies on Pokemon identity conventions instead of a canonical language field. |
| `hidden_release_boundary` | ready | Restrictive RLS and the wrapped search RPC must remain the authority. |

## Surface Matrix

| Surface | Capability | Status | Gap |
|---|---|---|---|
| Web set catalog | Game-scoped identity | blocked | The surface cannot distinguish MTG from another game before matching or grouping rows. |
| Web set catalog | Set code | ready | none |
| Web set catalog | Explicit language | partial | Language is inferred from Pokemon-specific IDs instead of carried as canonical card language. English MTG V1 can render, but language truth is not generic. |
| Web set catalog | Hidden-release fallback | ready | none |
| Web catalog search | Game-scoped identity | blocked | The surface cannot distinguish MTG from another game before matching or grouping rows. |
| Web catalog search | Set code | ready | none |
| Web catalog search | Exact collector number | partial | Structured search only recognizes numeric or prefix-numeric tokens; suffix, symbol, dagger, and other MTG collector numbers are not exact-search safe. |
| Web catalog search | Normal, foil, and etched finishes | ready | none |
| Web catalog search | Multi-face names | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Web catalog search | Multi-face images | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Web catalog search | Artist | ready | none |
| Web catalog search | Rarity | ready | none |
| Web catalog search | Explicit language | partial | Language is inferred from Pokemon-specific IDs instead of carried as canonical card language. English MTG V1 can render, but language truth is not generic. |
| Web catalog search | Hidden-release fallback | ready | none |
| Web card detail | Game-scoped identity | partial | Identity domain is visible in part of the path, but the client has no first-class game scope. |
| Web card detail | Set code | ready | none |
| Web card detail | Exact collector number | ready | none |
| Web card detail | Normal, foil, and etched finishes | ready | none |
| Web card detail | Multi-face names | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Web card detail | Multi-face images | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Web card detail | Artist | ready | none |
| Web card detail | Rarity | ready | none |
| Web card detail | Explicit language | blocked | The surface carries no explicit or safely inferred language. |
| Web card detail | Hidden-release fallback | ready | none |
| Web set card grid | Game-scoped identity | blocked | The surface cannot distinguish MTG from another game before matching or grouping rows. |
| Web set card grid | Set code | ready | none |
| Web set card grid | Exact collector number | ready | none |
| Web set card grid | Normal, foil, and etched finishes | ready | none |
| Web set card grid | Multi-face names | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Web set card grid | Multi-face images | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Web set card grid | Artist | blocked | Artist is not carried or rendered by this surface. |
| Web set card grid | Rarity | ready | none |
| Web set card grid | Explicit language | blocked | The surface carries no explicit or safely inferred language. |
| Web set card grid | Hidden-release fallback | ready | none |
| Flutter set catalog | Game-scoped identity | blocked | The surface cannot distinguish MTG from another game before matching or grouping rows. |
| Flutter set catalog | Set code | ready | none |
| Flutter set catalog | Explicit language | partial | Language is inferred from Pokemon-specific IDs instead of carried as canonical card language. English MTG V1 can render, but language truth is not generic. |
| Flutter set catalog | Hidden-release fallback | ready | none |
| Flutter catalog search | Game-scoped identity | blocked | The surface cannot distinguish MTG from another game before matching or grouping rows. |
| Flutter catalog search | Set code | ready | none |
| Flutter catalog search | Exact collector number | partial | Structured search only recognizes numeric or prefix-numeric tokens; suffix, symbol, dagger, and other MTG collector numbers are not exact-search safe. |
| Flutter catalog search | Normal, foil, and etched finishes | ready | none |
| Flutter catalog search | Multi-face names | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Flutter catalog search | Multi-face images | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Flutter catalog search | Artist | blocked | Artist is not carried or rendered by this surface. |
| Flutter catalog search | Rarity | ready | none |
| Flutter catalog search | Explicit language | partial | Language is inferred from Pokemon-specific IDs instead of carried as canonical card language. English MTG V1 can render, but language truth is not generic. |
| Flutter catalog search | Hidden-release fallback | ready | none |
| Flutter card detail | Game-scoped identity | blocked | The surface cannot distinguish MTG from another game before matching or grouping rows. |
| Flutter card detail | Set code | ready | none |
| Flutter card detail | Exact collector number | ready | none |
| Flutter card detail | Normal, foil, and etched finishes | ready | none |
| Flutter card detail | Multi-face names | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Flutter card detail | Multi-face images | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Flutter card detail | Artist | ready | none |
| Flutter card detail | Rarity | ready | none |
| Flutter card detail | Explicit language | blocked | The surface carries no explicit or safely inferred language. |
| Flutter card detail | Hidden-release fallback | ready | none |
| Flutter set card grid | Game-scoped identity | blocked | The surface cannot distinguish MTG from another game before matching or grouping rows. |
| Flutter set card grid | Set code | ready | none |
| Flutter set card grid | Exact collector number | ready | none |
| Flutter set card grid | Normal, foil, and etched finishes | ready | none |
| Flutter set card grid | Multi-face names | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Flutter set card grid | Multi-face images | blocked | The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model. |
| Flutter set card grid | Artist | blocked | Artist is not carried or rendered by this surface. |
| Flutter set card grid | Rarity | ready | none |
| Flutter set card grid | Explicit language | partial | Language is inferred from Pokemon-specific IDs instead of carried as canonical card language. English MTG V1 can render, but language truth is not generic. |
| Flutter set card grid | Hidden-release fallback | ready | none |

## Findings

- The hidden release boundary is already authoritative: restrictive RLS covers games, sets, parents, identities, and child printings, while the identity-search RPC filters every result by parent visibility.
- Set code, card name, rarity, artist on detail/search, and generic child-printing labels are reusable across games.
- Foil and etched labels are now explicit in web and Flutter controlled finish vocabulary; web natural-language intent recognizes both.
- The clients do not carry a first-class game scope. Releasing MTG beside Pokemon would permit ambiguous cross-game matches and Pokemon-specific grouping/filter behavior.
- Exact collector-number display is string-safe, but structured search is numeric-oriented and cannot guarantee every MTG suffix, symbol, dagger, or other nonnumeric token.
- The frozen payload keeps combined names such as `Front // Back` and a layout value, but it does not preserve structured face names or per-face images. This is an upstream canonical payload gap as well as a client gap.
- Language filtering is Pokemon-specific inference. English MTG V1 can appear under the English lane, but the client cannot prove language from canonical data.
- Set catalog filters and labels remain Pokemon-era-specific. They require a game-scoped taxonomy before an MTG client can be activated.

## Decision

Do not activate MTG in web or Flutter yet. Build one versioned, game-scoped read model that exposes exact collector tokens, explicit language, structured faces, per-face image truth, artist, rarity, and child finishes while continuing to rely on the existing release-control RLS. Then rerun this audit against offline fixtures before any hidden client canary.

Exact next gate: **build_game_scoped_client_read_model_and_multiface_contract_offline**.

## Boundaries

- This audit read repository files and synthetic fixtures only.
- It did not access or mutate Supabase.
- It did not deploy, run Vercel, activate release controls, publish MTG, or touch the ingestion worktree.
