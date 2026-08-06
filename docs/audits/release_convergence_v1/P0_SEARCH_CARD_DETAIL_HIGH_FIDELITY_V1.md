# P0 Search and Card Detail High-Fidelity Report V1

## Scope

This bounded pass implements the first two release-critical journeys approved by the Release Convergence inventory:

- Search and Discover result hierarchy.
- Card Detail identity, artwork, collection-action, and evidence hierarchy.

It does not change search resolution, canonical grouping, pricing authority, exact-printing selection, ownership mutations, privacy, or image-truth policy.

## Evidence-Producing Commit

- Branch: `release/8-week-convergence-v1`
- Commit: `831492d12bfbbc930600784adc3e202977fe1164`
- Parent checkpoint commit: `327bf859b955a9ec2fa0a078eb4d974f27b082b9`

## Search Decisions

- Exact card identity, set, collector number, rarity, finish, price, and primary Vault action remain visible without opening diagnostics.
- Technical result provenance now uses one shared `Why this result` disclosure across grid, list, and detail-table modes.
- The canonical list result is a responsive row: compact image and identity on mobile, dedicated price/action column on desktop.
- Missing or representative image truth remains explicit.
- Discovery uses a quiet operational heading instead of a marketing-scale hero.
- Empty results use the shared product-state contract and provide bounded example searches.
- Search-to-Vault still routes through Card Detail and its existing exact-version mutation boundary.

## Card Detail Decisions

- Artwork remains the primary visual object but uses a smaller mobile stage so collection actions arrive earlier.
- Card name typography is reduced from legacy hero scale.
- Exact set, collector number, rarity, finish, language, and ownership context remain visible.
- The existing `CardPageMarketVaultPanels` workflow is ordered before optional version narrative and evidence.
- Version explanation is collapsed by default.
- Grookai ID, illustrator, and provenance controls remain available under `Card evidence`.
- Lower information sections are unframed bands rather than decorative floating cards.
- Missing, representative, or blocked image labels remain unchanged and authoritative.

## Shared Repairs

- Added `ExploreResultEvidence` as the single result-provenance disclosure.
- Corrected dark-mode contrast for visible pricing labels and shared card-grid badges.
- Made the Playwright fixture port configurable so isolated worktrees do not interfere with active development servers.

## Visual Evidence

All screenshots are under `apps/web/tests/parity/__screenshots__/canonical-samsung/`.

| Screenshot | SHA-256 |
| --- | --- |
| `p0-search-result-mobile.png` | `37d64b4901082e9cbd090a294a1ecfd2ac672390def37ef41be187232b74785a` |
| `p0-search-result-desktop.png` | `6eb01db11cd786327be41e195ca54d0394789fc6e073ea4fd15ca42740e9bdb9` |
| `p0-card-detail-mobile.png` | `202494ed7edf322964209153a57eb03a973667ef74fc237e900d0bf16245470d` |
| `p0-card-detail-desktop.png` | `50ceffaae58847e91efab076cbd65cfa6d4d30e9e0587da084615a99c60929a6` |

## Verification

- Web typecheck: pass.
- Web lint: pass.
- Next.js 16.2.12 production build: pass.
- Checked-in set-count validation: `691/691` pass.
- Full contract suite: `1,487/1,487` pass.
- Samsung parity, accessibility, geometry, and visual suite: `35/35` pass.
- Existing native-canon visual baselines: `6/6` unchanged.
- New P0 visual baselines: `4/4` pass.
- Full repository pre-commit shipcheck: pass.
- Flutter tests: `565/565` pass.
- Runtime preflight: zero critical failures; known deferred debt remains reported.

## Boundaries Preserved

- No database or Storage access.
- No migration, pricing, ownership, or privacy changes.
- No deployment, push, merge, or feature activation.
- No new brand identity or replacement interaction model.
- The original dirty pricing worktree remains untouched.

## Remaining Propagation

The approved grammar is not yet propagated to every adjacent surface. The next bounded gate is Vault and exact-copy hierarchy:

1. Reuse the approved card identity and evidence grammar.
2. Keep variant and finish visible on every card occurrence.
3. Separate family-level collection context from exact-copy actions.
4. Add loaded, empty, private, partial-error, duplicate-copy, and offline fixtures.
5. Preserve ownership IDs and existing mutation paths.

Pulse/Wall/Profile and the desktop shell remain separate P0 gates after Vault.
