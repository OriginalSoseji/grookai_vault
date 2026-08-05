# Grookai Release Visual Completion Report V1

## Status

**Bounded visual convergence complete; high-fidelity redesign remains a separate approval gate.**

This report implements the visual boundary approved for the release-convergence run. It applies the existing app canon, repairs functional bridges, completes shared states, and records the remaining redesign work without inventing a new brand or product model.

## Authority

- Release plan: `Grookai_8_Week_Release_Plan.md`, dated 2026-08-05.
- Release-plan SHA-256: `216d012a9b4d1544654021a0ccb781c5bf1aa9b533b324fbf71b149f0697c423`.
- Product rule: build no new islands; build only bridges required to complete the existing product.
- Visual authority: `MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1`.
- Canonical mobile dock: Pulse, Wall, Scan, Vault, Search.
- Source baseline: `3c7c5eff3b4a15aef395c8546771167c85aa9970` on `origin/main`.
- Evidence-producing implementation commit: `6258f020ff0da6ef06d1874816af0ccec3ab5608`.
- Implementation branch: `release/8-week-convergence-v1`.

## Outcome

The run closed four bounded release gaps:

1. The production mobile web shell now renders the same approved dock component as the deterministic native-canon fixtures.
2. Search results now expose a direct bridge to the existing exact-version Vault workflow without introducing a second mutation path.
3. Root errors, not-found pages, Binder failures, and private-state fixtures use one restrained product-state presentation.
4. Canonical card art now uses the approved `2.5 / 3.5` (`5 / 7`) frame across the repaired web and Flutter collector surfaces.

No database, Supabase, pricing, storage, auth, canonical-identity, deployment, or production-flag change occurred.

## Implemented Work

### Shared application shell

- Reused `MobileParityDock` in the actual production mobile navigation.
- Preserved the approved five-item order and Scan semantics.
- Added Pulse unread support to the shared presentation.
- Preserved unavailable-Wall behavior as disabled rather than fabricating a route.
- Hide the dock while the software keyboard is open.
- Kept route-family suppression for Scan, Binder pushed routes, and secret routes.

### Search to Vault bridge

- Added a clear `Add to Vault` action to grid, list, and details search results.
- The action preserves the current card URL and targets `#vault-actions` on card detail.
- The card detail page anchors the existing `CardPageMarketVaultPanels` workflow.
- Exact printing selection, authentication continuation, and the existing Vault mutation remain authoritative.
- The bridge itself performs no fetch, insert, update, or Supabase mutation.

### Product states

- Added one shared `ProductState` component for neutral, error, and private states.
- Added root `error.tsx` and `not-found.tsx` coverage.
- Reused the component for Binder failure handling.
- Error copy explicitly states that the collection was not changed.
- Not-found copy covers old, private, and no-longer-shared links without exposing internal terminology.

### Card imagery and layout stability

- Standardized repaired canonical card-art frames to `5 / 7` on web.
- Standardized repaired Flutter card-art frames to `2.5 / 3.5`.
- Preserved `3 / 4` where the content is a collector-uploaded note photo, warehouse evidence, or a scanner viewport rather than canonical card art.
- Reduced nested image padding and decorative framing so artwork remains the primary signal.
- Stabilized loading skeletons to the same geometry as loaded card art.

### Tokens and customer language

- Aligned shared spacing and radius tokens to the approved app contract.
- Removed body-level decorative gradients and excessive shared card shells.
- Removed six remaining customer-surface radii above the canonical `26px` ceiling.
- Removed obvious decorative gradients from Search discovery, collector activation, and the public collector placeholder.
- Removed public implementation language such as `collector intelligence layer`, `canonical mapping`, `reconciled catalog`, `signed-in canary`, and `image worklist` from the repaired entry surfaces.

## Deterministic Inventory

The generated inventory is stored in:

- `baseline/current_state_inventory_v1.json`
- `baseline/current_state_inventory_v1.md`

Current counts after repair:

| Measure | Result |
| --- | ---: |
| Web pages | 55 |
| Collector-facing web pages | 44 |
| Internal web pages | 11 |
| Flutter screen classes | 78 |
| Public engineering-copy findings | 0 |
| Canonical card-art `3 / 4` drift findings | 0 |
| Radius values above canonical `26px` | 0 |
| Remaining radial-gradient diagnostics | 40 |

The 40 gradient findings are not declared defects by count alone. Most are legacy global presentation rules. They require surface-level design review and are intentionally recorded in the redesign inventory rather than mechanically removed across unrelated routes.

## Runtime Evidence

New governed screenshots:

- `screenshots/search-vault-mobile.png`
- `screenshots/search-vault-desktop.png`
- `screenshots/error-mobile.png`
- `screenshots/private-mobile.png`

Existing native-canon screenshots remain authoritative:

- `apps/web/tests/parity/__screenshots__/canonical-samsung/pulse-empty.png`
- `apps/web/tests/parity/__screenshots__/canonical-samsung/wall-populated.png`
- `apps/web/tests/parity/__screenshots__/canonical-samsung/scan-ready.png`
- `apps/web/tests/parity/__screenshots__/canonical-samsung/vault-populated.png`
- `apps/web/tests/parity/__screenshots__/canonical-samsung/search-discovery.png`
- `apps/web/tests/parity/__screenshots__/canonical-samsung/menu-open.png`

The new screenshots prove visible exact-version context, stable card geometry, one clear Vault action, dock consistency, and quiet error/private states at the canonical Samsung viewport. The desktop fixture proves the same bridge does not depend on mobile layout.

## Verification

- Web TypeScript check: pass.
- Web ESLint check: pass.
- Next.js 16.2.12 production build (webpack): pass; 691 checked-in set counts validated.
- Targeted Node contract tests: `20/20` pass.
- Release-convergence Playwright tests: `4/4` pass.
- Canonical visual, accessibility, overflow, dock, and geometry tests: `23/23` pass.
- Targeted Flutter analysis: pass, no issues.
- Git diff hygiene: pass.
- Full repository precommit shipcheck: pass.
- Full contract suite: `1,485/1,485` pass.
- Full Flutter suite: `565/565` pass.
- Runtime preflight: `PASS_WITH_DEFERRED_DEBT`, with zero critical failures and 10 known deferred-debt checks.

The canonical six-screen pixel suite remained unchanged. No native-canon golden was rewritten.

## Current Truths

- Mobile shell geometry and dock behavior have deterministic authority.
- Search now reaches the existing exact-version Vault action without a dead end.
- The shared root boundary protects routes that lack a local error file, but does not prove every route-specific partial/offline state.
- The inventory can distinguish canonical card art from collector-uploaded media.
- The release still has 44 collector-facing web pages and 78 Flutter screen classes; this run does not claim every screen has high-fidelity design approval.
- Two route-matrix entries for Binder invitation handling do not map to exact page files and require route-level confirmation.
- The home page and `/submit` remain outside the current route-state matrix.
- Desktop navigation, dense search, card detail, Vault, Pulse/Wall, and Binder composition still need approved high-fidelity designs.
- Existing runtime debt remains outside this visual change: 62 legacy card rows without GV-ID, five historical source/card duplicate groups, and 2,466 canonical non-excluded rows without an active identity row were reported by preflight as known deferred debt.

## Invariants

- Do not add a second Vault mutation path.
- Do not expose secret Binder or invitation tokens in shared chrome.
- Do not place secondary destinations in the five-item mobile dock.
- Do not treat user photos, scanner frames, or warehouse evidence as canonical card art.
- Do not replace the native app canon without explicit owner approval.
- Do not remove working interactions solely for aesthetics.
- Do not present a documented redesign candidate as shipped implementation.

## Explicit Next Gate

Approve the prioritized high-fidelity redesign inventory, then produce screen-level designs for the P0 surfaces before broad compositional changes. Implementation should continue one approved journey at a time, beginning with Search -> exact card -> Vault and Card Detail -> owned copy -> intent.
