# MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1

## Status

**ACTIVE — OWNER APPROVED FOR LOCAL IMPLEMENTATION**

- Approved: 2026-07-24
- Source baseline: `abb42bddb170fe2ac71a21cc7036269c83c8b9dd`
- Working branch: `codex/mobile-web-native-parity-v1`
- Production authority: none; push, preview deployment, merge, and production
  activation remain separate gates.

## Purpose

Make Grookai Vault mobile web visually and behaviorally match the canonical
Android app inside the application viewport while preserving existing data,
privacy, identity, Binder, auth, and desktop-web contracts.

The installed Android package is the visual reference. The owner-approved dock
amendment in this contract is the one deliberate exception to the captured APK:

```text
Pulse · Wall · Scan · Vault · Search
```

The captured APK showed Vault before Scan. The explicit owner decision dated
2026-07-24 moves Scan to position 3 and Vault to position 4.

## Scope

This contract governs:

- mobile web below `900` CSS pixels;
- the Flutter mobile dock order;
- mobile application chrome and route shell modes;
- primary and secondary collector surfaces;
- deterministic visual and accessibility verification;
- preservation of desktop web at `900` CSS pixels and above.

This contract does not authorize:

- a database migration or SQL change;
- a remote database, RLS, auth, storage, or canonical-data change;
- a new mutation path;
- conversion or deletion of existing data;
- a PWA, service worker, or install-prompt project;
- a push, preview deployment, merge, production deployment, or flag activation.

## Authority and precedence

For mobile visual and navigation decisions, precedence is:

1. Explicit Grookai owner decisions dated 2026-07-24 or later.
2. The frozen installed APK and approved screen catalog.
3. This contract and its route/state manifest.
4. Active domain contracts for their nonvisual data, privacy, security, and
   collaboration rules.
5. Historical audits, checkpoints, and implementation notes.

This contract supersedes only the conflicting navigation clauses in:

- `PULSE_WALL_VAULT_PRODUCT_ARCHITECTURE_V1`;
- `COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1`;
- `MOBILE_JAKOBS_LAW_UX_CONTRACT_V1`.

All non-navigation responsibilities, privacy rules, Binder rules, and
reversibility rules in those contracts remain in force.

## Frozen native-canon manifest

The machine-readable manifest is:

`docs/audits/mobile_web_native_parity_v1/app_canon_manifest.json`

The manifest records:

- APK SHA-256 and package version;
- source baseline;
- device model, Android version, density, logical viewport, locale, timezone,
  font scale, and theme state;
- canonical geometry and token values;
- hashes of local-only private reference captures;
- the observed dock and owner-approved amendment.

Private native captures containing account or collection data must never be
committed. CI uses sanitized deterministic fixtures.

## Primary dock

The mobile dock has exactly five permanently labeled affordances:

| Position | Label | Kind | Canonical web target | Selected state |
| ---: | --- | --- | --- | --- |
| 1 | Pulse | Stateful root | `/network` | Selected on Pulse root and segments |
| 2 | Wall | Stateful root | `/wall` | Selected on the authenticated personal Wall |
| 3 | Scan | Global action | `/scan` | Never retained as a selected tab |
| 4 | Vault | Stateful root | `/vault` | Selected on the Vault root |
| 5 | Search | Stateful root | `/explore` | Selected on the Search root |

Rules:

- Dex, Sets, Compare, Binders, Messages, Account, and Profile never displace a
  dock item.
- Scan is a global action, not a retained shell destination.
- Opening Scan preserves the prior stateful root and its scroll/state.
- Cancel or Back from Scan returns to the prior root.
- A successful local capture may hand off to Search. A card reaches Vault only
  after the collector selects an exact printing through the existing card path.
- The current Scan surface does not claim image recognition; it captures a
  local photo and provides a truthful manual exact-card handoff.
- `/vault/import` remains a Collectr CSV utility and is not the dock Scan
  target. It does not accept card photos.
- The dock is hidden while the keyboard is open and on fullscreen, pushed,
  standalone, bearer-token, and authentication surfaces.
- Mobile dock geometry is a maximum width of `390px`, radius `34px`, normal
  height `58px`, collapsed height `54px`, and safe-area-aware bottom padding.

## Shell modes

Every route must resolve to exactly one shell mode.

### Root

- Compact app bar and mobile dock are visible.
- One of Pulse, Wall, Vault, or Search is selected.
- Pulse segments remain one root destination.

### Pushed

- Contextual Back and route actions are visible.
- The primary dock and web footer are hidden.
- Direct deep links use a documented safe Back fallback.

### Fullscreen

- Used for Scan, authentication, and capability-owned flows.
- Primary dock, global header, and footer are hidden.

### Standalone

- Used for public pages, legal/support pages, and safe shared projections.
- It may use a minimal web header but must not invent a selected dock item.
- Secret and invitation routes never render tokens into global navigation,
  analytics, or footer links.

The machine-readable route/state matrix is:

`docs/audits/mobile_web_native_parity_v1/route_state_matrix.json`

## Canonical visual tokens

Mobile web must derive its mobile-scoped tokens from the app:

| Token | Canonical value |
| --- | ---: |
| Control radius | `10px` |
| Surface radius | `16px` |
| Artwork/tap radius | `22px` |
| Floating surface radius | `26px` |
| Pill radius | `999px` |
| Spacing scale | `4, 8, 12, 16, 22px` |
| App bar height | `46px` |
| Dock content gap | `104px` |
| Grid gap | `6px` |
| Grid outer padding | `10px` |
| Card-art aspect ratio | `2.5 / 3.5` |
| Mobile/desktop boundary | `<900px / >=900px` |

Mobile presentation must use the app's compact Material hierarchy, restrained
surfaces, low-alpha borders, limited shadow, and locally bundled icons.
Decorative gradients and glow must not replace canonical app surfaces.

## Primary surfaces

Implementation and approval order:

1. Pulse
2. Wall
3. Scan
4. Vault
5. Search

Each surface must cover:

- loading;
- populated;
- empty;
- partial error;
- full error;
- offline/degraded;
- permission denied where applicable;
- long text and enlarged text;
- hosted, fallback, and missing image states;
- drawer, sheet, dialog, snackbar, and long-press/menu states where applicable.

Restyling the current `/network` stream and calling it Pulse is insufficient if
its presentation or meaning remains different. Wall must reuse existing Wall
and public-profile loaders. Vault must preserve its existing canonical loader.
Search must preserve bounded resolver behavior. Scan must use a real,
route-scoped browser capability surface; it must not masquerade as CSV import.

## Secondary surfaces

Secondary work follows the primary surfaces:

- card detail and zoom;
- owned-copy and GVVI detail;
- Dex root and species detail;
- Sets and set detail;
- Compare;
- Binders library, creation, workspace, invitation, collaboration, public
  projection, and sharing;
- Inbox, thread, Nearby, and collector relationships;
- Account, onboarding, and secondary drawer/tools;
- login and account recovery.

Secondary destinations must not appear in the five-item dock.

## Binder integration

`COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1` remains authoritative for Binder
data, privacy, roles, consent, moderation, invitation, sharing, and offline
behavior.

Required mobile discoverability remains:

- the named Vault card **Binders — What you're building**;
- a named secondary-menu destination;
- species and set actions;
- exact-copy **Add to Binder** actions;
- invitation and collaboration states.

The dock amendment does not weaken any Binder boundary and does not place
Binders in the dock.

## Accessibility

Required:

- zero critical or serious axe violations;
- WCAG 2.2 AA contrast;
- `44px × 44px` minimum interactive targets;
- semantic landmarks, headings, labels, `aria-current`, live status, and
  alerts;
- visible keyboard focus, focus trapping, and focus restoration;
- no horizontal overflow at `320px`;
- 200% browser zoom and enlarged-text support;
- reduced-motion support;
- a visible, keyboard-accessible alternative for every long-press action.

Accessibility is an allowed platform-specific visual exception when it is
necessary to preserve access.

## Browser-capability exceptions

The following may differ from Flutter while preserving hierarchy and intent:

- Android system bars versus browser chrome;
- browser camera and permission prompts;
- share, OAuth, and file/photo picker sheets;
- browser history mechanics;
- minor Flutter/Chromium text rasterization differences.

These exceptions do not permit different labels, destination meaning, content
hierarchy, or hidden actions.

## Performance budgets

- LCP `<= 2.5s`
- INP `<= 200ms`
- CLS `<= 0.10`
- no key-route regression greater than 10% from its recorded baseline;
- shell JavaScript increase `<= 8KB` gzip;
- route JavaScript increase `<= 15KB` gzip or 10%, whichever is smaller;
- no additional global auth/server read;
- no duplicate primary-route query;
- no scroll-handler layout thrashing;
- useful core-surface content on the canonical Samsung in `<= 2s`;
- Dex species useful content in `<= 3s`.

## Deterministic verification

The parity harness must:

- run only against local synthetic fixture data;
- expose fixture routes only when `GROOKAI_VISUAL_TEST_MODE=1`,
  `VERCEL!=1`, and `NODE_ENV!=production`;
- make no Supabase or other external network request;
- use fixed locale, timezone, theme, viewport, reduced motion, and content;
- generate sanitized screenshots;
- fail serious/critical accessibility violations;
- verify dock order, names, touch targets, focus, and horizontal overflow;
- require an explicit local baseline-update command;
- never auto-approve screenshots in CI.

Native-to-web review targets:

- required components, labels, order, destinations, and actions: 100%;
- 95th-percentile anchor deviation `<= 4px`, maximum `<= 8px`;
- dimension deviation `<= 4px` or 2%;
- full-screen SSIM `>= 0.97`;
- static non-text structural SSIM `>= 0.985`.

Approved web regression goldens use a maximum pixel-difference ratio of 0.5%
for the foundation harness, tightening to 0.2% after each surface is approved.

## Release and rollback gates

Before any push:

- contract tests, typecheck, lint, production build, Flutter analyze/tests, and
  parity tests pass;
- migration/SQL/backend/auth/RLS scope diff is empty;
- desktop regression checks pass;
- no private screenshots or secrets are staged;
- the local screenshot gallery and diff report are reviewed.

A draft PR or Vercel preview is an external deployment event. It requires a
separate approval. Merge to `main` and production activation each require
explicit approval.

Rollback is flag-off or one revert. This project has no data rollback because
it must not change data or schema.

## Change control

Changes to dock membership, order, breakpoint, route meaning, shell modes,
visual thresholds, migration boundary, or release gates require an explicit
owner-approved contract amendment.
