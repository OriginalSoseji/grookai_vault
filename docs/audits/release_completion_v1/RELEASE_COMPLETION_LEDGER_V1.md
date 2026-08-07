# Grookai Eight-Week Release Completion Ledger V1

## Decision

Status: `IN_PROGRESS`

The product-convergence implementation and exact-printing/App-Link repair are merged to `main`. Production web and the signed Android package are proven from the same final-candidate commit, Journey B has a physical-device write/readback with net-zero cleanup, and signed-in production web now proves the collector-connection path plus the supported collection-depth surfaces. The entire August 5 release contract is not yet complete. Completion remains prohibited until iOS/TestFlight is tied to the same candidate, the remaining state transitions, device, operations, and store gates are proven, and the immutable candidate completes a 72-hour soak.

## Authority

- Plan: `Grookai Vault - 8-Week Product Completion Plan`
- Plan date: `2026-08-05`
- Plan SHA-256: `216d012a9b4d1544654021a0ccb781c5bf1aa9b533b324fbf71b149f0697c423`
- Release baseline: `e8fcbdbb47b97a9db215d3874ea9ae83ce075adf`
- Final-candidate source: `80d30d0ef5f373e8208e01926f276faa705092c9`
- Production web deployment: `5798722633`
- Signed Android artifact: `9002772994`
- Signed Android APK SHA-256: `1ebeba31394e0182b90ec9194e2e62b7ed2ddd8db28edca312da26aaad2eaea4`
- Completion manifest: `completion_manifest_v1.json`

## Proven

- Week 1 inventory and feature freeze artifacts exist.
- Week 2 P0 high-fidelity completion designs exist.
- Weeks 3-6 product convergence is implemented and merged.
- Web parity, Samsung, iOS simulator, Node, Flutter, and build evidence exists for the convergence implementation.
- The final repair branch passed the complete pre-push shipcheck, including strict web/contracts and `579/579` Flutter tests.
- Production runtime preflight has zero critical failures and zero unresolved quarantine records.
- Signed-out production web and configured Samsung pre-candidate smokes pass.
- TestFlight build `283` and the latest owner acceptance gate were completed outside this ledger and must be linked by the final-candidate evidence package before closeout.
- Want Match current-intent repair `20260807043000` is merged and applied. Production retains both historical rows/events while reporting zero active/current-want mismatches, zero invalid deliverable notifications, and zero stale Want Match Pulse visibility. Dispatcher version 14 carries the final pre-FCM evidence gate, and Android build 284 cold-launch verification passed.
- Physical-Samsung signed-out card exploration, exact-card detail, action-specific login continuation, exact pending-action resume, test-copy cleanup, authenticated shell return, custom-scheme card routing, and bottom-safe-area behavior pass against source commit `ff45bc07c7518daf369970bc7834aacfb2b4849f`.
- Physical-Samsung root-swap repair proof confirms the pending exact-card action survives authentication root replacement and executes once against repair commit `21add8fb8b62808124b57329a28ec922d84a0902`; the disposable copy reconciled to zero and the full shipcheck passed with `577/577` Flutter tests.
- Source commit `1a24a22070d72c5352abe7cb47684229fa8b40dc` closes the fresh-install multi-printing continuation defect: exact child printing is required before authentication, survives the root swap, writes once, opens its private copy, and reconciles to zero after UI cleanup. Android App Link source authority is now tied to the governed release certificate, and the complete shipcheck passes with `579/579` Flutter tests.
- The dedicated-account Android Want Match journey passed every product and database confirmation. Its preserved raw report remains failed only because it was evaluated by an iPhone/TestFlight policy.
- PR `#192` merged the final push-registration repair. Main SHA `80d30d0ef5f373e8208e01926f276faa705092c9` passed Flutter CI, signed APK, CodeQL, and legacy-key workflows.
- Vercel production deployment `5798722633` serves the exact final-candidate SHA. The cookie-free final-candidate web harness passed `22/22` routes and `2/2` personal-action continuation cases across narrow and desktop viewports with zero broken visible images.
- Signed Android workflow artifact `9002772994` was installed fresh on the disposable Samsung package. The package certificate matches production `assetlinks.json`; Android reports `grookaivault.com` verified; an HTTPS card URL cold-opened the app to the correct canonical card and all three exact printings.
- Journey B is proven on the signed final-candidate Android package: Normal remained selected through authentication, one exact child copy was written, the private-copy screen showed `Printing: Normal`, the copy was removed through the product UI, and database readback reconciled to zero active test rows.
- The read-only signed-in production web harness passed `28/28` route cases and `2/2` existing exact-card message-context cases across narrow and desktop viewports. It proves collector discovery, active follow state, relevant card activity, owner profile, exact shared copy, card-centered inbox/reply context, Vault, Binders, Dex, Sets, Wall, and profile rendering with zero broken images. A post-authentication request barrier blocked all non-read requests, and all five scoped database assertions were identical before and after.
- Final-candidate production security metadata readback passes for all five governed views with zero security-definer target views, zero unsafe fixed-path findings, and no database writes. Runtime operations remain healthy with zero critical preflight failures, zero failed health checks, and zero unresolved quarantines. Production analytics, public privacy/support/terms/deletion pages, and privacy-safe mobile diagnostics contracts pass; final iOS Crashlytics delivery remains open.

## Remaining Gates

1. Produce or identify an iOS/TestFlight build from final-candidate SHA `80d30d0e`, assign it to the intended tester groups, and record its immutable build identifiers.
2. Complete Journey A fresh-user comprehension and physical-iPhone signed-out continuation proof.
3. Complete Journey C's fresh Want-to-match-to-opt-out state transition, confirm Journey D on a physical final-candidate device, finish Journey E mobile Journeys/Memories context return, and complete Journey F on physical iPhone/TestFlight. Signed-in production web coverage for D and the web-supported portions of C/E is proven.
4. Execute the remaining final-candidate route-state matrix across desktop web, narrow web, Android, and iPhone, including loading, empty, error, offline, private, signed-out, text-scaling, and recovery states.
5. Complete final-candidate RLS/privacy/account-deletion, analytics, Crashlytics, support, terms, monitoring, and current store metadata/assets readback.
6. Start the soak only after web, Android, and iOS identifiers and all prerequisite gates are frozen. Observe at least 72 continuous hours and produce the final production report with zero unresolved P0 defects.

## Completion Rule

Elapsed calendar time does not complete this plan. A gate changes to `proven` only when its final-candidate evidence is available and internally consistent. The release is complete only when every manifest gate is `proven` and `completion_allowed` is `true`.

## Boundaries

- No new product islands.
- No weakening canonical identity, ownership, pricing, privacy, or messaging authority.
- No production mutation solely to manufacture release evidence.
- No reuse of stale build evidence for a different final candidate.
- No shortening or backdating the 72-hour soak.

## Exact Next Gate

Tie an iOS/TestFlight build to final-candidate SHA `80d30d0e` and its intended tester groups. In parallel, finish the remaining automated final-candidate journey, state, security, privacy, support, terms, monitoring, and store-readback evidence. Start the 72-hour soak only after the candidate identifiers and prerequisite gates are complete.
