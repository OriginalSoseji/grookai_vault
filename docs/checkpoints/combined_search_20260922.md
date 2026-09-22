# Combined catalog search — local implementation and acceptance

Source: origin/main a98dd26f7 plus the combined-search candidate on branch
feature/combined-search-20260922, in C:/grookai_vault_combined_search_20260922.
The matching Mac native candidate is /Users/cesarcabral/grookai_vault_combined_search_20260922.
SHA-256 comparisons confirmed identical native production files and integration test
for the recorded emulator/simulator runs. Release preparation subsequently corrected
the shared search failure message in lib/main.dart; that small follow-up is covered
by the final Windows Flutter gate, not by the earlier native runtime recordings.
The earlier artist equality and complete pagination changes from main are retained.
The Vendor Mode candidate and broader app/web audit are unchanged and remain separate.
Local acceptance below was recorded against c28f2eea8. Release preparation fast-forwarded
to a98dd26f7 (Pokemon Master Index data only, no overlapping search changes).
See docs/release/COMBINED_SEARCH_RELEASE_REVIEW_20260922.md for the release gate ledger.

## Review

- Application: http://127.0.0.1:3202/explore?q=Yuka+Morri+Wurmple+reverse+holo
- Evidence report: http://127.0.0.1:3203/
- Private evidence: C:/grookai_vault_operator_artifacts/combined_search_20260922/
- This is a labeled synthetic local catalog. Fixture counts are not production card counts.
- Implementation and local acceptance are complete. No deployment or production mutation.

## Behavior delivered

One shared deterministic resolver combines recognized artist credits, names/text,
set aliases/current codes, collector numbers and fractions, exact recorded finishes,
stamp/identity variants, rarity, year/range, game, supported language, image status,
and signed-in card ownership. Different constraints combine with AND; explicit
alternative finishes (including any holo) match any selected recorded finish.

Yuka Morri is reversibly interpreted as Yuka Morii. Yuka includes both known
matching artists and offers a choice. Correction is limited to an unambiguous
single edit in a full multiword credit. Artist auto-recognition uses the existing
Pokemon credit snapshot; unfamiliar text stays searchable without invented credits.
Other-game artist words can match recorded metadata, with explicit illustrator
filters also supported. Master Ball, Rare Candy, quoted literal words, exact IDs,
and numeric fractions have regression protection.

Web and native show removable server-supplied filters, correction undo, artist
choices, and no-match guidance. Shared URLs preserve query and explicit filters.
Native text searches use the same service for guests and signed-in accounts;
service errors preserve the query instead of silently switching parsers.
Artist credits on native card detail open a refinable search page.

Complete parent keyset scans and complete child reads precede response pagination.
Set metadata and ownership lookups are chunked to stay within request URI limits.
Finish matches require the recorded child key; selected results open that printing.
Failures/timeouts remain failures, rather than apparently complete partial lists.
Catalog reads retain request-scoped RLS and game release gates.

## Acceptance ledger

| Requirement | Verified evidence |
| --- | --- |
| Examples, case/comma/order/surname variations | Parser contracts; real API manifest comparison; Android/iOS repository and UI |
| High-confidence correction and ambiguous Yuka | JS and Flutter cases; three browser journeys; two native journeys |
| Normal, holo, reverse, any holo | Exact fixture identity comparisons across all pages; 168 reverse matches, 235 any-holo matches |
| No artist pagination gaps/duplicates | 1,005 fixture artist parents plus two prior records = 1,007 across 21 API pages; legacy limit=32 still receives all 168 matches |
| Sets, set aliases, code/name ordering and fractions | Extended and variant API receipts, including bs / Base Set, 7/1019 and deliberately wrong denominators |
| Year/range, game/language, image constraints | Real API fixtures, including 2007/2008, reversed range, English/Japanese, missing/exact imagery |
| Stamps and variants combine with AND | First edition + shadowless; GameStop; conflicting stamp combination returns zero |
| Rarity is a rarity-field constraint | Common excludes uncommon; Ultra in the card name cannot satisfy Ultra Rare |
| Unicode and unknown text | Japanese fixture matches; unknown Japanese and unsupported English descriptions return zero |
| Ownership and permissions | Isolated owner/visitor accounts; archived copy excluded; guest warning; hidden/signed-in/public game gates |
| Exact printing and artist refinement | Desktop/mobile Chromium and WebKit; Android API 36 emulator and iOS 26.5 simulator |
| Back preserves query, filters, count and position | Web restores 168 visible results and scroll within 100px; native restores 48 visible results and scroll within 2px |
| Shared links | Web URL roundtrips; native canonical/custom URI parsing; explicit illustrator/finish opening and removal on both native runtimes |
| Failure and recovery | Persistent later-page failure contract; native zero fallback database reads; browser interrupted API retains query and recovers |
| Accessibility/layout | Scoped axe: zero violations on three browser layouts; 320px controls at 200% text; Flutter 320px at 2x text |
| Build and regressions | 39 JS contracts; 21 Flutter unit/widget/routing tests; four runtime cases each on Android/iOS; scoped ESLint, TypeScript, Flutter analysis; optimized Next build |

Private receipt files: api-verification.json (12), extended-api-verification.json
(27), variant-api-verification.json (14), browser-verification.json (3 platforms),
narrow-failure-verification.json, contracts-final.log, flutter-unit-final.log,
android-scroll-final.log, ios-scroll-final.log, web-build-final.log.
These total 53 API acceptance cases, with independent expected fixture identities
for the main completeness suite. Read the receipts rather than treating historical
failed harness attempts as passing evidence.

## Catalog and release limits

Ownership currently means the card across printings, as stated in both interfaces;
it is not an inference about owning the particular finish. Guest ownership filters
show a sign-in warning. Language filtering outside Pokemon is not supported by the
current governed catalog; it returns an explicit 422 rather than ignoring language.
Missing finish data never establishes that a printing did not exist.

Native evidence is from an emulator/simulator running the actual HomePage and
CardDetailScreen inside an integration harness. It is not physical-device evidence,
App Store signing, full authentication-shell acceptance, or proof that deployed OS
universal-link associations have refreshed. The Android manifest and iOS association
source include /explore and /search; publishing those associations is part of the
separate deployment. WebKit here is browser-engine evidence, not physical Safari.
Production-scale latency and live catalog completeness are not claimed by fixtures.

## Reproduction and environment

The private fixture and verifier scripts assert loopback API/SQL addresses before
writes. API is 127.0.0.1:54321, SQL 127.0.0.1:54330. Other-game release statuses were
temporarily varied only in this sandbox and restored to hidden. No production
accounts, inventory, permissions, billing, or messages were changed.

Windows Android testing uses Grookai_Catalog_Local_API36 / emulator-5554. The attached
physical Samsung was not used. iOS uses simulator B3B4DF3D-004F-4157-B694-3A4F7B305533.
Mac access uses the existing verified SSH identity through Tailscale nc, with reverse
ports 3202 and 54322 pointing to the Windows local services. Source and defines are
kept in separate private transfer files; never copy credentials into the repository.

Java TLS uses a task-local PKCS12 copy of OS-trusted public roots. TLS verification
remains enabled. A debug-only Guava dependency supplies the compile API required by
Flutter integration_test and existing CameraX code; release dependencies are unchanged.
Next's generated AGENTS.md/CLAUDE.md and next-env.d.ts are tool-generated side effects,
not combined-search features. Release preparation replaced the root node_modules
junction with an independent npm ci installation from the committed root lockfile.
The old junction was moved intact into private operator artifacts; web dependencies
were preserved. The release gate no longer uses a dependency-resolution hook.

Release preparation on the reconciled base passed the complete local shipcheck:
4,046 contract tests passed (four explicitly skipped), 736 Flutter tests passed,
runtime preflight/health and reports, web typecheck/lint/strict build, Flutter analysis,
and secret-packaging checks. The final gate receipt is dated 2026-09-22T13:48:59Z.
Core API readback after Docker recovery passed all 12 cases; mobile preview returned
200 with zero page errors. No sandbox reset or production mutation was performed.

Follow-up is local user review and the remaining release checks in the deployment plan.
Then resume the broader app/website audit checklist.
