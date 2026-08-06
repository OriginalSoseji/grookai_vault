# Release Convergence Implementation 20260806 V1

## Context

The August 5 release plan froze new product islands and required Grookai's existing exact-card, Vault, discovery, collector, and messaging capabilities to operate as one coherent product. Work proceeded on `release/8-week-convergence-v1` in a separate worktree so the dirty pricing branch and unrelated user work remained untouched.

## Problem

The product already had the required capabilities, but route hierarchy, desktop/mobile composition, signed-out continuation, state handling, collector language, exact-printing presentation, and responsive behavior were inconsistent. The release risk was fragmentation and trust loss rather than a missing feature pillar.

## Decision

Implement only `Finish`, `Unify`, `Polish`, `Hide`, and bounded `Bridge` work from the frozen plan. Preserve canonical identity, ownership, pricing, privacy, and messaging authorities. Do not add a marketplace, payment system, social primitive, ranking engine, or new schema program.

## Completed Scope

- Search and Discover plus exact-card detail hierarchy
- Vault family and exact-copy presentation
- Pulse, Wall, and Collector Profile grammar
- Desktop application shell and mobile parity
- Binders and invitations
- Sets, Dex, and Compare
- Messages, matches, and notification context
- Scan/add continuity
- Signed-out entry and login return intent
- Support, legal, privacy, account, and deletion surfaces
- Loading, empty, error, private, narrow, dense, and missing-image states covered by deterministic fixtures and route tests
- Customer wording convergence, including `Want Match`
- Scroll-safe exact-printing action sheet on short physical viewports
- Honest legacy message printing disclosure

The detailed device and repository proof is in `docs/audits/release_convergence_v1/FINAL_DEVICE_AND_REPOSITORY_VERIFICATION_20260806_V1.md`.

## Risks Addressed

- Exact variants remain visible whenever evidence exists.
- Unresolved or legacy printing identity is disclosed and never inferred.
- Card images remain hosted-first and uncropped on repaired surfaces.
- Search, Vault, Wall, Messages, Binders, Sets, and Dex were verified against live signed-in Samsung data.
- Physical overflow found during testing was repaired and regression-locked.
- Personal screenshots and message/account XML were excluded from Git.
- No database or production mutation occurred during convergence work.

## Alternatives Rejected

- Building a new feed, marketplace, checkout, reputation, or vendor product
- Adding schema to repair presentation-only gaps
- Fabricating a finish for legacy message threads
- Updating the Mac's global Flutter installation
- Publishing raw physical-device evidence that contains personal content
- Repeated intermediate pushes that would create unnecessary deployment runs

## Current Truths

- Application implementation commit: `4f686f69d3f7169c436c61d2f9a62a4da67e580a`
- Contract-lock commit before checkpoint: `375c866c7`
- Node contracts: `1506/1506`
- Flutter tests: `566/566`
- Flutter analyzer: clean
- Web release-convergence Playwright: `76/76`
- Full web parity Playwright: `99/99`
- Strict Next build and web lint: clean
- Samsung read-only smoke: passed across all primary and secondary release families
- iPhone 17 Pro simulator build and startup: passed with Flutter 3.44.8
- Physical iPhones: paired but offline to Xcode; not claimed as tested
- Database-backed preflight: not run locally because `SUPABASE_DB_URL` is absent

## Invariants

- Exact identity, finish, ownership, intent, collector, and pricing truth may not be weakened for convenience.
- Legacy missing printing identity remains explicit; it cannot become an inferred finish.
- Public and client image presentation remains hosted-first.
- No client receives service-role credentials.
- No release evidence may expose private messages, account data, or unredacted credentials.
- No new product island enters the frozen release branch.
- Database-backed gates must run with the governed connection rather than a substitute.

## What Must Never Be Broken

- Search result to exact printing to Vault continuity
- Want Match to exact card and collector context
- Available card to card-centered messaging
- Vault family versus exact-copy distinction
- Profile and Wall privacy boundaries
- Loading/error states that preserve recovery without raw exceptions
- Five-pillar mobile navigation and its desktop counterpart
- Physical short-viewport scroll behavior for card actions

## Remaining Release Gates

1. Bring a paired physical iPhone online to Xcode and perform the same read-only candidate smoke.
2. Run `npm run preflight` and `npm run contracts:quarantine-report` in the governed DB-capable environment.
3. Review and merge `release/8-week-convergence-v1`.
4. Verify one deployed web candidate without repeated preview churn.
5. Cut the release candidate, run clean and established-account journeys, and complete the normal observation window.
6. Release only when the existing security, canary, support, monitoring, and store gates are satisfied.

## Explicit Next Gate

The next executable gate is physical-iPhone read-only smoke when Xcode reports the device online. In parallel, CI or the governed operator environment should run the two DB-backed reports. No additional feature work is authorized by this checkpoint.
