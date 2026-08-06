# Grookai Release Convergence Baseline Inventory V1

Generated: 2026-08-05T23:33:40.579Z

## Authority

- Release plan: Grookai 8-Week Product Completion Plan, 2026-08-05
- Visual contract: `MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1`
- Boundary: functional bridges and visual consistency; no wholesale redesign
- Content SHA-256 before self-hash: `3b6966322a628e15c7d4d7e62574c146e989847f310300e362daec3ea15ff457`

## Current Inventory

| Measure | Count |
| --- | ---: |
| Web pages | 55 |
| Collector-facing web pages | 44 |
| Internal web pages | 11 |
| Collector routes with local loading boundary | 5 |
| Collector routes with local error boundary | 2 |
| Flutter screen classes | 78 |
| Web component files | 123 |
| Feature-flag files | 28 |
| Public engineering-copy findings | 0 |
| Remaining `3/4` card-art aspect findings | 0 |
| Radial-gradient diagnostics | 40 |
| Radius values above the canonical 26px floating surface | 0 |

## Coverage Interpretation

- Shared root error and not-found boundaries now protect collector routes.
- Local loading and error files remain sparse and must not be treated as proof of complete state behavior.
- The route-state matrix is the required-state contract; runtime screenshots and interaction tests remain necessary evidence.
- Static visual findings identify drift for review. They do not authorize broad restyling.

## Unmapped Collector Routes

- `/` - `apps/web/src/app/page.tsx`
- `/submit` - `apps/web/src/app/submit/page.tsx`

## Matrix Routes Without An Exact Page

These may be redirects, query-state routes, route handlers, or missing implementations and require review.

- Binder share and invitation: `/binder-invites/[inviteToken]`
- Binder share and invitation: `/binder-invites/respond`

## Public Artifact Suppression Candidates

None.

## Evidence Limits

- Static route boundaries do not prove runtime loading, empty, error, private, signed-out, dense, or offline behavior.
- A route-level error file count does not include the shared root error boundary.
- Feature-flag inventory records code references only and does not prove deployed values.
- Visual drift findings are diagnostics, not automatic failures; each occurrence requires surface review.
- Collector-uploaded note photos are not card-art frames and are excluded from canonical card-aspect diagnostics.

The JSON artifact contains the full route, screen, feature-flag, copy, and visual-drift inventories.
