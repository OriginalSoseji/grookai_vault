# APP MILESTONE CHECKPOINT V1

**Date:** 2026-04-07
**Milestone Title:** Grookai Vault Mobile App Milestone - Core Product Parity and Device Install Baseline

## Summary

As of 2026-04-07, Grookai Vault has crossed from a partial Flutter shell into a materially real mobile collector application. The app now covers the core signed-in collector loop across Explore, Wall/Public Collector, Vault, Network, Messaging, Compare, Sets, Account, Import, Submit, and scanner-native flows with live backend reads and writes. Native iPhone build and install paths have also been brought into a workable state, giving the app a credible real-device baseline instead of a simulator-only development posture.

## What Changed

- Closed major mobile parity gaps across Explore, Vault, Card Detail, Network, Public Collector, Compare, Sets, Account, Import, Submit, and GVVI copy flows.
- Expanded the app shell into a broader native product surface with dedicated screens and service layers instead of placeholder-only tabs.
- Added real follow/unfollow, inbox/thread messaging, contact-owner entry points, pricing surface reuse, and public/private exact-copy navigation.
- Added SQL wrapper support for mobile GVVI reads and public copy discovery so the app can consume exact-copy data safely from app-specific entrypoints.
- Brought iOS project state forward to a founder-specific bundle id and development team configuration, with current device builds succeeding.

## What Is Now Real In The App

- Explore curated/search flow with compare selection and card/set navigation.
- Wall home wrapper and public collector family with shared cards, pricing context, contact-owner entry, and follow/unfollow support.
- Vault home with real data, grouped management, recent activity, and GVVI family drill-down entrypoints.
- Card Detail with live pricing context, set navigation, compare entry, contact context, and exact-copy routing hooks.
- Network card stream, collector discover, inbox, thread reply, and card-anchored contact flow.
- Public sets browse/detail and compare workspace.
- Signed-in account/profile tools, following, collection import, and missing-card submission.
- Native scanner/camera capture, quad adjust, and related scanner stabilization flows.

## Major Parity Gaps Closed

- Public collector family moved from partial mobile parity to real profile-plus-card interaction coverage.
- Network experience moved beyond discovery-only work into real stream, inbox, thread, and contact-owner execution.
- Exact-copy/GVVI coverage moved from absent to real mobile route family support.
- Import and submit workflows moved from web-only dependency to native execution paths.
- Follow/unfollow, shared pricing pills, compare, and public sets are now first-class mobile surfaces instead of deferred parity items.

## Engineering Stability Work Completed

- Reduced shell debt by splitting app shell responsibilities and introducing shared widgets and service seams.
- Stabilized scanner/native paths and connected camera-related iOS configuration required for real-device use.
- Added widget-test coverage that validates a stable app frame instead of the default counter scaffold.
- Regenerated CocoaPods/native project integration so Flutter, iOS, and macOS plugin registration are aligned with the current dependency graph.
- Established a working real iPhone build/install baseline with founder-specific signing configuration and successful device build verification.

## What Remains Open

- Card Detail still needs fuller parity for richer market/history depth, related versions depth, and remaining placeholder sections.
- Some web parity surfaces are still thinner or missing on mobile, especially public followers/following depth, pokemon-filtered public routes, and deeper private wall parity.
- Vault smart-view depth and GVVI polish still have room to mature beyond the current milestone baseline.
- Real-device debug-launch automation still depends on local macOS/Xcode permission handoff even though current native build/install paths are working.
- Native dependency cleanup remains desirable, including Podfile platform explicitness and pod deployment target warning cleanup.

## Next Likely Priorities

- Finish the remaining card-detail and market-depth parity gaps.
- Deepen private wall and vault smart-view parity.
- Harden GVVI/public-copy polish and follow-graph route coverage.
- Convert the current real-device baseline into a repeatable founder debug-launch path.
- Expand regression coverage around shell, messaging, import, submit, and scanner flows.

## Related Artifacts

- `docs/audits/WEB_VS_APP_PARITY_AUDIT_V3_REAL_REPO.md`
- `docs/audits/REAL_DEVICE_VALIDATION_V1.md`
- `docs/audits/REAL_DEVICE_INSTALL_UNBLOCK_V1.md`
