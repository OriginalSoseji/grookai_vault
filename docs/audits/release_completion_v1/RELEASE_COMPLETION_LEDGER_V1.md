# Grookai Eight-Week Release Completion Ledger V1

## Decision

Status: `IN_PROGRESS`

The product-convergence implementation and exact-printing/App-Link repair are merged to `main`. Production web, signed Android build `23`, and TestFlight build `289` are frozen to application source `a8ec3d2`. Synchronized-candidate Journey C and Journey F now pass on physical TestFlight build `289`, and Journey A's signed-out device path is proven. Journey A remains partial only for genuine fresh-human comprehension. The entire August 5 release contract is not yet complete. Completion remains prohibited until the synchronized candidate satisfies the remaining state, store, fresh-user, and soak gates.

## Authority

- Plan: `Grookai Vault - 8-Week Product Completion Plan`
- Plan date: `2026-08-05`
- Plan SHA-256: `216d012a9b4d1544654021a0ccb781c5bf1aa9b533b324fbf71b149f0697c423`
- Release baseline: `e8fcbdbb47b97a9db215d3874ea9ae83ce075adf`
- Final-candidate source: `a8ec3d27808fd100cbb8e544032ee479e9632f24`
- Candidate verifier: `e343879a5dc247958f77f37562e7f29ad8a50cfd`
- Production web deployment: `5816529955`
- Signed Android artifact: `9034580292`
- Signed Android APK SHA-256: `deda3271c92258870a8abbeffce163ba39fb9a5e6d3142aca8907ff969ddb7f6`
- TestFlight build: `1.0.0 (289)` / `dc5801e6-e1fd-42ef-b476-768e5ff5d411`
- iOS IPA SHA-256: `27619987ad4121347dbbfa2ef68a840d4ccc5139757f6f14d28a31a3660a09e1`
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
- Physical-iPhone Journey C functionally passed on TestFlight build `288` from source/verifier SHA `09300d858fd8de2b23e0d3540e8ee6940181a426`. One clean-account Want produced one scheduled exact match for `GV-PK-CEC-214`, visible Poke Javi owner/trade context, one exact card-centered message, product-UI opt-out, one stale historical match, zero active matches, zero stale Pulse rows, zero invalid deliverable or post-opt-out notifications, and zero verifier findings. This proves behavior but does not close the release gate because build `288` is not the manifest's frozen candidate.
- Synchronized candidate `a8ec3d2` is now distributed across production web, signed Android `1.0.0 (23)`, and TestFlight `1.0.0 (289)`. Signed-out web passed `22/22` routes and `2/2` continuation cases. Android package/signature/install and emulator exact-printing smoke passed. TestFlight build `289` is `VALID`, approved, internally and externally testing, and present in all three intended groups. No public store release or soak start occurred.
- Candidate-scoped signed-in production web passed `26/26` routes, `2/2` exact-card message-context cases, and `5/5` unchanged database assertions while blocking ten non-read requests. The first pre-authentication navigation attempt timed out, production immediately read back HTTP `200`, and the unchanged verifier passed one controlled retry.
- The initial build `289` physical preflight was blocked while the connected iPhone still held build `288` and later entered a locked state. That blocker was subsequently resolved. Play Console still resolves to `/console/signup`, so developer enrollment and listing verification remain external prerequisites.
- The physical iPhone 17 Pro now has TestFlight build `289` installed. TestFlight preflight passed `1/1`, direct candidate launch passed `1/1`, and eight additional read-only tests passed `8/8` across Search, exact card detail, the full card page, Account, Messages, and Pulse. This closed the install/launch prerequisite; the subsequent evidence below closes Journeys C/F and the device portion of Journey A.
- Physical TestFlight build `289` completed the Journey A signed-out exploration and exact-card continuation path and proved Journey F's action-specific locked-feature behavior. The combined raw harness ended on a post-success terminal assertion because it expected a global Account control while the restored exact-card surface was active; retained screenshots prove the product states, and no mutation-producing rerun was performed. Journey A remains partial only for genuine fresh-human comprehension.
- Synchronized-candidate Journey C passed its authoritative read-only verifier with zero findings: one exact Want, one scheduled match, one available event, one exact card-centered message, one product-UI opt-out, final Want false, one stale historical match, zero stale Pulse rows, zero invalid or post-opt-out notification deliveries, and zero event-emission failures. Journey C and Journey F are now proven.

## Remaining Gates

1. Complete Journey A genuine fresh-user ten-second comprehension evidence.
2. Execute the synchronized-candidate route-state matrix across desktop web, narrow web, Android build `23`, and iPhone build `289`, including loading, empty, error, offline, private, signed-out, text-scaling, and recovery states.
3. Establish or identify the intended Google Play developer account and verify the current Play listing and assets. App Store Connect distribution is proven.
4. Reconcile every non-soak gate to `proven`, then start a new non-backdated 72-hour soak. Observe at least 72 continuous hours and produce the final production report with zero unresolved P0 defects.

## Completion Rule

Elapsed calendar time does not complete this plan. A gate changes to `proven` only when its final-candidate evidence is available and internally consistent. The release is complete only when every manifest gate is `proven` and `completion_allowed` is `true`.

## Boundaries

- No new product islands.
- No weakening canonical identity, ownership, pricing, privacy, or messaging authority.
- No production mutation solely to manufacture release evidence.
- No reuse of stale build evidence for a different final candidate.
- No shortening or backdating the 72-hour soak.

## Exact Next Gate

Complete the synchronized-candidate state matrix on iPhone build `289` and Android build `23`, obtain genuine fresh-user comprehension evidence, and establish Google Play account/listing readback. Reconcile all non-soak gates before starting the 72-hour soak.
