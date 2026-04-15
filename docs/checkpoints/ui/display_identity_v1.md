# DISPLAY_IDENTITY_V1

## Context

- Grookai currently stores the canonical `card_prints.name` as a base card name.
- Users often cannot distinguish identity splits from text alone on search, set, vault, and detail surfaces.
- Identity-distinguishing truth already exists in canonical fields such as `variant_key`, `printed_identity_modifier`, and set identity behavior, but that truth is not surfaced consistently in product UI.

## Decision

- Derive display identity at runtime from existing canonical fields.
- Keep canonical `name` unchanged everywhere in persistence and identity logic.
- Introduce one shared resolver on web and one matching resolver on Flutter so presentation stays deterministic across surfaces.
- Apply the resolver in card-heavy UI surfaces only; do not modify schema, migrations, uniqueness, or ingestion.

## Invariants

- Display identity must be deterministic for the same card payload.
- Display identity must never overwrite or mutate canonical `name`.
- Resolver output must be derived from existing truth already present in the read model.
- Resolver output must not introduce a new identity system or hidden schema contract.
- If no meaningful suffix can be derived, display identity must fall back to the base name unchanged.

## Runtime Visibility Audit

- The intended Display Identity V1 code exists in the local worktree across web and Flutter surfaces.
- Runtime behavior has not yet proven that the edited source is what the current app and web processes are rendering.
- This audit pass exists to find the exact failure gate before any further implementation changes.

## Coverage Cleanup Pass

- Runtime proof succeeded on both web and Flutter, so stale builds are no longer the active blocker.
- The primary bug was DTO shape loss in the web explore/search path, where identity fields were not surviving to the resolver.
- The remaining work in this pass is to remove raw-name title render paths on web surfaces and complete the adjacent/related DTO tails so resolver coverage is consistent.
