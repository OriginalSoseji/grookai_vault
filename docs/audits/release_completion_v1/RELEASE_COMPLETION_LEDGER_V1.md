# Grookai Eight-Week Release Completion Ledger V1

## Decision

Status: `IN_PROGRESS`

The product-convergence implementation is merged, the isolated release tree passes the complete repository shipcheck, current production operations report zero unresolved quarantines, and pre-candidate web and Samsung smokes pass. The entire August 5 release contract is not yet complete. Completion remains prohibited until the same immutable final candidate proves all six journeys, the complete cross-platform state matrix, store readiness, and a 72-hour release-candidate soak.

## Authority

- Plan: `Grookai Vault - 8-Week Product Completion Plan`
- Plan date: `2026-08-05`
- Plan SHA-256: `216d012a9b4d1544654021a0ccb781c5bf1aa9b533b324fbf71b149f0697c423`
- Release baseline: `e8fcbdbb47b97a9db215d3874ea9ae83ce075adf`
- Completion manifest: `completion_manifest_v1.json`

## Proven

- Week 1 inventory and feature freeze artifacts exist.
- Week 2 P0 high-fidelity completion designs exist.
- Weeks 3-6 product convergence is implemented and merged.
- Web parity, Samsung, iOS simulator, Node, Flutter, and build evidence exists for the convergence implementation.
- The current isolated release tree passes `1,547/1,547` Node contracts and `571/571` Flutter tests, plus strict web typecheck, lint, and production build.
- Production runtime preflight has zero critical failures and zero unresolved quarantine records.
- Signed-out production web and configured Samsung pre-candidate smokes pass.
- TestFlight build `283` and the latest owner acceptance gate were completed outside this ledger and must be linked by the final-candidate evidence package before closeout.
- Want Match current-intent repair `20260807043000` is merged and applied. Production retains both historical rows/events while reporting zero active/current-want mismatches, zero invalid deliverable notifications, and zero stale Want Match Pulse visibility. Dispatcher version 14 carries the final pre-FCM evidence gate, and Android build 284 cold-launch verification passed.
- Physical-Samsung signed-out card exploration, exact-card detail, action-specific login continuation, exact pending-action resume, test-copy cleanup, authenticated shell return, custom-scheme card routing, and bottom-safe-area behavior pass against source commit `ff45bc07c7518daf369970bc7834aacfb2b4849f`.
- Physical-Samsung root-swap repair proof confirms the pending exact-card action survives authentication root replacement and executes once against repair commit `21add8fb8b62808124b57329a28ec922d84a0902`; the disposable copy reconciled to zero and the full shipcheck passed with `577/577` Flutter tests.
- Source commit `1a24a22070d72c5352abe7cb47684229fa8b40dc` closes the fresh-install multi-printing continuation defect: exact child printing is required before authentication, survives the root swap, writes once, opens its private copy, and reconciles to zero after UI cleanup. Android App Link source authority is now tied to the governed release certificate, and the complete shipcheck passes with `579/579` Flutter tests.
- The dedicated-account Android Want Match journey passed every product and database confirmation. Its preserved raw report remains failed only because it was evaluated by an iPhone/TestFlight policy.

## Remaining Gates

1. Push and merge source commit `1a24a22070d72c5352abe7cb47684229fa8b40dc` and its audit through the normal release path.
2. Verify the exact production deployment SHA and read back the deployed Android `assetlinks.json`.
3. Cut Android and iOS builds from that immutable SHA, prove signed Android domain verification, and assign the iOS build to the intended TestFlight groups.
4. Prove all six release journeys from the same final candidate. Mutation journeys require a clean test account and database readback; read-only journeys require production web and physical-device evidence.
5. Execute the route-state matrix across desktop web, narrow web, Android, and iPhone, including loading, empty, error, offline, private, signed-out, text-scaling, and recovery states.
6. Verify final-candidate RLS/privacy, account deletion, deep links, notifications, analytics, Crashlytics, support, terms, monitoring, and store metadata.
7. Observe the immutable candidate for at least 72 continuous hours and produce the final production report. Completion requires zero unresolved P0 crash, privacy, authorization, navigation, or data-truth defects.

## Completion Rule

Elapsed calendar time does not complete this plan. A gate changes to `proven` only when its final-candidate evidence is available and internally consistent. The release is complete only when every manifest gate is `proven` and `completion_allowed` is `true`.

## Boundaries

- No new product islands.
- No weakening canonical identity, ownership, pricing, privacy, or messaging authority.
- No production mutation solely to manufacture release evidence.
- No reuse of stale build evidence for a different final candidate.
- No shortening or backdating the 72-hour soak.

## Exact Next Gate

Merge the exact-printing/App Link candidate, verify production asset authority and the signed Android package, deploy the same immutable candidate across iOS/TestFlight, then use only that exact candidate for journey, state-matrix, store, and soak evidence.
