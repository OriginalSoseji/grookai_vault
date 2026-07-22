# Card Visual Search Remote Review Portal V1

Date: 2026-07-21
Status: COMPLETE LOCALLY; REMOTE DEPLOYMENT PENDING

## Context

The visual-search calibration packet contains `200` calibration queries, `753` exact saved visual records, and source images. Remote human review is needed without exposing the sealed holdout or allowing reviewer actions to mutate Grookai data.

## Problem And Risk

A public static packet would expose private calibration evidence. A normal review form would create a database write path and could turn untrusted reviewer work into application state before founder review. A browser-only packet without authentication would not be appropriate for remote access.

## Decision

- Serve the immutable calibration dashboard through `/review/visual-search` and authenticated API route `/api/review/visual-search/dashboard`.
- Authorize the founder, the built-in PokeJavi auth user ID, and optional IDs configured through `GROOKAI_VISUAL_SEARCH_REVIEWER_USER_IDS`.
- Return not-found for unauthorized authenticated users and require sign-in for anonymous users.
- Keep all draft judgments in browser `localStorage`.
- Allow work to leave the browser only through an explicit JSONL download.
- Keep founder review and offline evaluator validation as later gates.

## Alternatives Rejected

- Public static hosting: rejected because it exposes the packet without authentication.
- A separate reviewer credential system: rejected because the existing Grookai login is sufficient for this reviewer.
- Direct Supabase judgment writes: rejected because the user required a strict no-write portal and later founder review.
- Bundling the sealed holdout: rejected because human calibration must not expose or execute holdout queries.

## Implementation

- Portal implementation commit: `d5df056636e351ca0993e725a197e49f46e1c848`.
- Approved producer-branch guard commit: `4c2146c40d7ce2c59e82ae1c40f633e660c26381`.
- Evidence-layout producer commit: `bf0ac663e945460d77f1b506a329431c0671f0bb`.
- Pinned packet builder commit: `fff624f4357b0562e45c36c82d6c6cb3e9c66575`.
- Private bundle commit: `bf6257284ad90c2cb5fd98a85f89f88a8f09001d`.
- Contract: `docs/contracts/CARD_VISUAL_SEARCH_REVIEW_PORTAL_V1.md`.
- Private bundle: `apps/web/private/review/visual-search/CALIBRATION_REVIEW_DASHBOARD.html.br`.
- Bundle manifest: `apps/web/private/review/visual-search/manifest.json`.

## Packet Provenance

- Source packet: `docs/audits/card_visual_search_judgment_packet_v1/2026-07-22T05-22-02-356Z_packet_13bc0f5043d5`.
- Source producer SHA: `bf0ac663e945460d77f1b506a329431c0671f0bb`.
- Packet run key: `13bc0f5043d574246c739c89953b43c07df991d717ff1bdd39f991ba24cc5f0e`.
- Calibration queries: `200`.
- Holdout queries: `0`.
- Saved visual records/images: `753/753`.
- Missing images: `0`.
- Source HTML SHA-256: `7ab735665eb1d25f14c2bbfc916d64179c1602d91cedaed6b7ea3bb654b998c3`.
- Brotli bundle SHA-256: `2bbf5cd1fa816c0d6635a3c78416406a05bee6ca6ac4bc300eb1370891ee0316`.
- Brotli bundle size: `1,358,764` bytes.

## Write Boundary

- Server writes: `false`.
- Database table access in the dashboard route: none.
- Provider calls: none.
- Approvals: none.
- Embeddings or persistent search-index writes: none.
- Browser persistence: localStorage only.
- Export: reviewer-initiated JSONL download only.

## Verification

- `node --test tests/contracts/card_visual_search_review_portal_v1.test.mjs tests/contracts/card_visual_search_judgment_packet_v1.test.mjs`: `10/10` passed.
- `npm --prefix apps/web run typecheck`: passed.
- `npm --prefix apps/web run lint`: passed with zero warnings or errors.
- `npm run web:build:strict`: passed; both portal routes are present in the production route manifest.
- Bundle validation proved `200` calibration queries, `0` holdout queries, `753` saved visual records, local-only progress, JSONL-only export, and no dashboard network or mutation code.
- Local HTTP proof: anonymous page access redirected to `/login?next=%2Freview%2Fvisual-search`; anonymous dashboard API access returned `401` without bundle bytes.
- Browser proof: reviewer hint populated `PokeJavi`; clicking search evidence opened the card image beside the complete saved Fact Graph and exact-row controls; long schema and prompt identifiers wrapped within their summary tiles.

## Current Truths

- The portal is implemented, bundled, and production-build verified on `feature/card-visual-search-review-portal`.
- It is not yet deployed to a remotely accessible Grookai environment.
- PokeJavi can use the existing Grookai login after deployment.
- Review work is not durable across browsers or devices until JSONL is exported.
- Exported work remains untrusted until founder review and offline calibration validation.

## Invariants

- The reviewer must never be able to write Grookai database, storage, canonical, description, approval, embedding, or search-index state from this portal.
- The sealed holdout must never be bundled, served, or executed during calibration review.
- Search-match evidence must remain separate from the complete saved Fact Graph.
- Clicking evidence must continue to show the source image beside the exact saved visual record.
- Authentication and explicit reviewer authorization must remain server-enforced.

## Explicit Next Gate

Deploy this frozen branch to an authenticated Grookai environment, verify anonymous and unauthorized access are denied, verify PokeJavi and founder access, complete desktop/mobile visual smoke checks, and confirm a JSONL export without any server-side mutation. Do not import the export or run holdout evaluation in the deployment gate.
