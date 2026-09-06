# Pricing Checkpoint 127: MTG Sealed Signed-In Client Canary Passed

## Context

Checkpoint 126 activated the complete MTG sealed backend for signed-in users
while both product clients remained disabled. RPC V3, the trusted image signer,
the active price release, and the active image release were already proven in
production.

## Problem

Collectors still had no bounded product surface for the active backend. Web
and Flutter needed a small, reversible implementation that could prove real
authenticated browsing, self-hosted images, prices, search, and fail-closed
behavior without enabling public access or mutating sealed data.

## Risk

A client could bypass the trusted signer, expose anonymous rows, retain private
Storage paths, accept stale or mismatched evidence, overload the signer, retain
too many decoded images, or make the backend activation inseparable from a
client rollout.

## Decision

Add disabled-by-default web and Flutter flags, a protected web route, and a
bounded Flutter route from MTG Sets. Limit the first page to 24 products, keep
the V3 RPC and trusted signer as the only data interfaces, bound Flutter image
signing to four concurrent requests, and preserve the backend release-control
row as an independent server kill switch.

## Alternatives Rejected

- Enable anonymous browsing: rejected because public/licensing policy remains
  unresolved.
- Read private Storage directly: rejected because the signer is the proven
  object-level authorization boundary.
- Load the full 2,144-row corpus: rejected because the canary needed bounded
  latency and memory.
- Enable web and store clients in production together: rejected because each
  deployment needs an independent rollback and observation gate.

## Implementation Authority

- Branch: `agent/mtg-sealed-image-migration-promotion-v1`
- Parent SHA: `63384d87d220dd678e6444013f7cfe5c933e6740`
- Exact implementation SHA: `2ab018235`
- Contract: `docs/contracts/MTG_SEALED_SIGNED_IN_CLIENT_ROLLOUT_V1.md`
- Backend project: `ycdxbpibncqcchqiihfz`

## Current Truths

- A protected signed-in web route now exists at `/sealed/mtg`.
- Flutter exposes MTG Sealed from the MTG Sets surface when its build flag is
  enabled.
- Both clients default to disabled.
- Web returned 24 real products for a disposable authenticated user.
- Samsung rendered browse and `bundle` search results with self-hosted images
  and exact market prices.
- Anonymous access remains denied.
- No production client deployment or TestFlight release occurred.
- No database, Storage, catalog, price, image, Vault, approval, or embedding
  write occurred.

## Invariants

- RPC V3 and the trusted signer remain the only client data interfaces.
- The backend `signed_in` release-control status remains independently
  reversible.
- Feature flags remain false when omitted.
- Client rows remain bounded to 24 until a separately measured pagination gate.
- Images remain private, self-hosted, evidence-bound, and short-lived when
  signed.
- Anonymous visibility is not implied by signed-in client readiness.

## Device And Web Proof

- Web signed-out redirect: `307` to login.
- Web authenticated catalog: 24 rows.
- Web first row: `10th Edition - Booster Box`, `$824.75`.
- Web exact self-hosted image loaded: true.
- Auth fixture residue: zero.
- Samsung model: SM-S908U.
- Samsung browse: passed.
- Samsung search query `bundle`: passed.
- Final canary fatal exceptions: zero.
- Final process survived sustained browse and search: true.

## Performance Qualification

The physical debug build remained functional but reported high Android debug
graphics accounting. Decode caps, zero offscreen grid prefetch, non-retained
Sets navigation, and four-call signer concurrency prevented the final canary
from reproducing the earlier low-memory exit. This is sufficient for the
bounded functional canary, not for store-distribution performance approval.

## Verification

- Web targeted tests: 7/7.
- Flutter targeted tests: 6/6.
- Updated historical contracts: 20/20.
- Full Node contracts: 2,977/2,977.
- Full Flutter tests: 659/659.
- Web typecheck, lint, strict production build: passed.
- Flutter analyze: passed.
- Runtime preflight critical failures: zero.
- Full pre-commit shipcheck: passed.

## What Must Never Be Broken

Do not expose MTG sealed anonymously, bypass the signer, disclose Storage paths
or signed URLs in durable evidence, remove evidence/freshness validation, turn
the 24-row canary into an unbounded query, or treat a debug-device canary as
store-release performance proof.

## Permanent Evidence

- Audit:
  `docs/audits/pricing/mtg_sealed_signed_in_client_rollout_v1/2026-09-05T21-46-58Z/`
- Web screenshot: `web_signed_in_catalog.png`.
- Samsung browse screenshot: `samsung_signed_in_catalog.png`.
- Samsung search screenshot: `samsung_bundle_search.png`.

## Exact Next Gate

Deploy only the signed-in web client with the web feature flag enabled, prove
the production route and flag rollback, and observe it before mobile release.
Then obtain a release/profile Flutter build with reliable dependency access,
measure memory and latency on a physical device, and prepare TestFlight only if
that production-mode device canary passes. Keep anonymous access disabled.
