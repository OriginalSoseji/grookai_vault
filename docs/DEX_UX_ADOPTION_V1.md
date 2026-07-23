# Dex UX Adoption V1 — Implementation and Verification Report

Date: 2026-07-23
Branch: `codex/dex-ux-adoption-v1`
Starting commit: `88712278`
Product: Grookai Vault (`grookaivault.com`)

## Executive summary

All seven approved Dex-inspired phases were implemented in order across the
Flutter app and the web application on the isolated
`codex/dex-ux-adoption-v1` branch. The work keeps Pulse, Wall, and Vault as
first-class Grookai surfaces while adopting the useful collection patterns from
Dex: species browsing, exact completion truth, prominent copy-level actions,
collection views and filters, private collection projects, canonical deep
links, and an explicit Wall showcase workflow.

The previously pending Samsung visual crawl was completed after the owner
unlocked the connected SM-S908U. The crawl was intentionally read-only: it
opened navigation, filters, layouts, comments, comparison, scanner, project,
Vault, Wall-review, card-family, related-card, and Android share surfaces, then
backed out without a purchase, outbound share, collection mutation, comment,
project mutation, Wall assignment, or other backend write.

The live pass also found issues that automated tests had not exposed: a
92-pixel quick-action-sheet overflow, duplicate rarity choices, missing
generation/type metadata in live filters, and serialized reads that made the
Dex root take about 12 seconds and Pikachu take about 4–6 seconds. The
quick-sheet, filter-normalization, metadata-ingestion, and read-orchestration
repairs are complete. The metadata upsert passed its production gate and
checkpoint for all 1,025 species without a migration. A rebuilt APK was then
installed in place and accepted on the same SM-S908U: root content was fully
useful by the scheduled 2-second capture, Pikachu by the scheduled 3-second
capture, all generation/type choices populated, rarity labels were
case-deduplicated, Reverse Holo was present, and the long-press sheet no longer
overflowed.

This branch adds no Supabase migration, does not implement P8, does not purchase
anything, does not send a share, and does not copy Dex branding or proprietary
visual assets. Existing root-worktree changes were not modified.

## What was adopted and why

| Dex-inspired decision | Grookai implementation | Product benefit |
| --- | --- | --- |
| Collection progress is visible at a glance | Species and printing completion summaries on mobile and web | Users can understand what they own and what is missing without opening every card |
| Collection lists have purpose-specific views | Collection, Owned, Missing, Additional, and Cameos | Completion cards are not mixed with cameos or non-checklist variants |
| Filters and layouts are close to the collection | Generation/type/progress filters at the Dex root; set/rarity/finish/ownership filters at species level; detailed/compact/grid layouts | Faster scanning for both casual and power collectors |
| Common card actions are immediately available | Add/Manage, Want, Compare, Scan, Share, exact Vault scope, and long-press quick actions | Fewer navigation steps while preserving explicit confirmation |
| Collection routes preserve exact context | Canonical `/dex` and `/dex/{speciesSlug}` paths on web, in-app routing, and native custom schemes | Pulse, notifications, web, and native navigation share one path model |
| Collection goals are persistent | Private set and species projects backed by existing owner-RLS watch rows | Users can resume a goal across devices without exposing it publicly |
| Showcase curation starts with review | Explicit exact-copy Wall selection with zero copies preselected and final confirmation | Strong privacy defaults and no accidental public sharing |

## Phase 1 — Collection truth and performance

Completed.

- Added generation/type metadata support and exact species summary counts.
  After the Samsung crawl exposed empty deployed metadata, the build-time seed,
  worker, checkpoint, and production rows were repaired for all 1,025 species.
- Separated completion, additional, and cameo cards.
- Added explicit unassigned-printing counts instead of guessing a finish.
- Counted direct and slab-only ownership.
- Resolved slab certificate rows back to exact owned instances and printings.
- Preserved explicit `null` finish truth; a missing finish is not relabeled as
  Normal or Holo.
- Scoped all root ownership mappings to the exact requested card IDs.
- Parallelized independent detail reads.
- Replaced network-backed “Load more” behavior with local progressive reveal.
- Virtualized long mobile lists with sliver builders.
- Kept hosted Grookai artwork primary with provider artwork only as fallback.
- Added equivalent direct/slab ownership and finish truth to the web data
  helpers.
- Reads slab ownership owner-first, pages the active exact instances, and
  resolves only the owner’s certificate IDs instead of scanning every
  certificate for a popular card or species.
- Starts root catalog, direct ownership, and slab ownership reads together.
- Fetches the two 1,000-row catalog windows concurrently and merges them in
  deterministic offset order.
- Reads child-printing artwork and finish options in one paged
  `card_printings` pass while preserving the finish-key fallback and the known
  Legendary Treasures RC5 child-art guard.
- Reads root completion mappings directly from canonical
  `card_print_species` truth instead of the heavier joined view.
- Reuses slab-aware completion truth across Dex, set detail, Collection
  Projects, and client-side Pulse crossings.
- Runs independent set/species reads concurrently and derives the direct-add
  post-state from the retained pre-state, avoiding a second full ownership scan
  around Add to Vault.

Important rule: parent cards that genuinely have no child printing rows are not
reported as ingestion errors. Cards with printing rows but unresolved ownership
remain explicitly unassigned so the UI cannot overstate completion.

## Phase 2 — Exact copy actions

Completed.

- Added visible Add/Manage actions to species cards.
- Added an exact finish picker when a card has multiple finishes.
- Passes the selected `cardPrintingId` into the ownership flow.
- Added Want, Compare, Scan, and Share entry points.
- Added long-press quick actions.
- Added management for copies whose finish is still unassigned.
- Added exact species-to-Vault filtering on mobile and web.
- The Vault filter uses canonical card-print IDs; it does not infer membership
  from a card name.

No test action purchased a card or sent a share to another person.

## Phase 3 — Navigation and Pulse

Completed.

- Added canonical mobile handling for `/dex` and `/dex/{speciesSlug}`.
- Added the Dex host to the existing Android custom-scheme contract
  (`grookai://` and `grookaivault://`).
- Added `/dex` and `/dex/*` to Apple universal-link association.
- Wired shell callbacks for scanner and exact Vault navigation.
- Routed species-completion Pulse events to the exact species.
- Batch-resolved legacy species IDs before building Pulse destinations.
- Added future-compatible set and species completion payloads.
- Preserved Scan and exact-species Vault actions when a species is opened from
  Pulse or from Collection Projects.
- Uses only `grookaivault.com`; no `grookai.com` route was introduced.

Android does not currently publish a verified `assetlinks.json` or declare
verified `https://grookaivault.com` App Links for any canonical route. Shared
HTTPS Dex URLs therefore remain web-first on Android, while in-app routing and
the existing custom schemes open the native Dex screen. Production Android App
Links require the authorized release-certificate fingerprint and are not
fabricated in this branch. iOS universal-link coverage is present through the
existing AASA contract.

## Phase 4 — Collection intelligence and layouts

Completed on mobile and web.

Dex root:

- Generation, type, and progress filter controls. Live generation/type option
  coverage now comes from 1,025 metadata-complete production species rows.
- National number, name, completion, and biggest-gap sorts.
- Detailed, compact, and grid layouts.

Species:

- Set, rarity, finish, and ownership filters.
- Set/number, name, rarity, copy-count, and missing-first sorts.
- Detailed, compact, and grid layouts.
- Separate Collection, Owned, Missing, Additional, and Cameos views.
- Query-preserving web pagination.
- Virtualized mobile rendering and 48-card web pagination.
- Punctuation-safe PostgREST species search.
- Out-of-range web pages clamp to a real page instead of rendering dead
  pagination.
- Grookai theme-token coverage for light and dark modes.
- Card artwork without a GV ID is non-interactive instead of linking to `#`.
- Mobile printing-option reads use stable, 1,000-row paging for every
  250-parent chunk, so large sets cannot silently lose reverse-holo or other
  finish rows at the Supabase response ceiling.

## Phase 5 — Private collection projects

Completed without a migration.

- Added persistent set and species projects using the existing owner-RLS
  `watches` contract.
- Project rows use set/character subjects, manual reason, and active
  `muted_at = null` state.
- Added finish-aware set progress.
- Added distinct-card species progress.
- Added milestones and existing Wanted Cards counts.
- Added a private dashboard reachable from Vault.
- Added start/resume and confirmed-stop controls to species and set detail.
- Routes project rows back to the exact set or species.
- Stopping deletes only the exact manual project row instead of muting it, so a
  future owned/inferred event can recreate normal interest.
- Species projects hydrate only the watched species and their active completion
  mappings.
- All tracked set snapshots reuse one owner-first slab/certificate read instead
  of rescanning the owner’s slabs once per project.

Projects do not create Wall posts, Pulse events, public shares, card intent, or
local-only state.

## Phase 6 — Explicit Wall showcase

Completed.

- Starts with zero copies selected.
- Requires an existing public profile and existing Vault sharing.
- Never enables public visibility on the user’s behalf.
- Loads only exact owned instances for canonical species card IDs.
- Supports direct and slab-only copies.
- Displays finish, short GVVI/instance identity, and slab
  grader/grade/certificate context.
- Allows only copies currently marked Showcase, Trade, or Sell.
- Hold copies cannot be selected.
- Supports an existing section or an explicitly named new public section.
- Enforces the existing fallback limits of three active and twenty stored
  custom sections.
- Requires a final review dialog before mutation.
- Writes only exact `vault_item_instances.id` membership through the existing
  section-membership RPC.
- If creation of a new empty section succeeds but assignment fails, the new
  empty section is removed; existing sections are never deleted.

The UI states the privacy model accurately: section membership and copy intent
are separate. Changing a copy to Hold later does not silently remove its public
section membership.

## Phase 7 — Integration, regression protection, and release gate

All seven approved implementation phases are complete. The original automated
and build gates passed, the crawl-prompted repair gates passed, and both the
baseline crawl and final rebuilt-APK Samsung acceptance are recorded below.
This did not reopen or add an eighth implementation phase.

Coverage added for:

- Direct and slab-only ownership.
- Explicit and unresolved finishes.
- Completion/additional/cameo separation.
- Pagination integrity and bounded reads.
- Exact Vault species scope.
- Long-press and card quick actions.
- Canonical app, universal, and Pulse routes.
- Collection filters, sorts, layouts, and views.
- Private project persistence and integration.
- Set-detail project tracking.
- Exact-copy Wall selection, privacy gates, and rollback behavior.

## Safety and data-boundary decisions

- No Supabase migration was created or edited.
- P8 was not implemented.
- No public profile or Vault-sharing setting is automatically enabled.
- No grouped or inferred card identity is written where an exact instance is
  required.
- No third-party artwork is the primary source.
- No purchase or outbound share is part of the implementation or test flow.
- No root-worktree changes were merged into this branch.
- Release signing enforcement remains intact.

## Debug build configuration correction

The first local debug-build attempt did not carry the mobile Supabase client
configuration into the APK. Flutter deliberately does not package the
repository dotenv files as application assets, and the mobile configuration
resolver prefers compile-time values. An APK built without those values could
not initialize the signed-in application correctly; this was a build-input
problem, not evidence that a service-role secret belonged in the client.

The corrected debug build supplied only these public mobile client values as
Flutter `--dart-define` inputs:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

The values were loaded into the build process from ignored local
configuration, and only those two values were passed to Flutter. Their literal
values were not copied into this report, committed, or otherwise exposed. The
broad `.env.local` file must never be passed to
`--dart-define-from-file` because it can contain backend-only credentials.
`SUPABASE_SECRET_KEY`, database URLs, passwords, signing credentials, and other
server secrets must never be compiled into an APK. Only the URL and public
publishable key are client-safe. The successfully crawled baseline APK used
this corrected public-only configuration.

## Prior verification evidence

These are the gates recorded before the live-crawl repair pass. They establish
the completed seven-phase baseline and are retained for comparison with the
final rebuilt-APK evidence later in this report.

| Gate | Result |
| --- | --- |
| `flutter analyze` | Passed, no issues |
| Full `flutter test` | Passed, 449 tests |
| Focused Dex/Wall/project Flutter tests | Passed |
| Web typecheck and lint | Passed |
| Full web contract suite | Passed, 816 tests |
| Strict optimized Next.js production build | Passed, 47 routes generated |
| `git diff --check` | Passed |
| Migration diff | Empty |
| Android debug APK | Built successfully after supplying only the public mobile Supabase URL and publishable key |
| Samsung in-place install | Passed on SM-S908U; app data preserved for the crawled baseline |
| Crawled baseline APK SHA-256 | `E727F289B8C2B3B97AB01ED655C6B760D37EB3916D6CA4BFC2D57D2FFDD2EB09` (superseded by the repair build) |
| Samsung baseline cold launch | Passed; Android `TotalTime` 2104 ms and the app’s first-frame marker 868 ms |
| Device crash/ANR log scan | No matching fatal, ANR, Flutter, or unhandled-exception entries |
| Android release APK | Correctly blocked because release keystore secrets are not present on this machine |
| Connected Chrome visual pass | Unavailable because no browser-control surface was connected in this session |
| Managed pre-commit shipcheck | Secret-packaging guard passed; live runtime preflight could not run because `SUPABASE_DB_URL` is absent, so the repository’s documented intentional `--no-verify` commit path was used after the local gates above passed |

The release build was not made to fall back to debug signing. A production APK
must be built in the authorized release environment with
`ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and
`ANDROID_KEY_PASSWORD`.

## Live-device visual acceptance status

The connected Samsung SM-S908U baseline visual crawl was completed after the
earlier device-access blocker was resolved. The table records only interactions
actually exercised in that crawl. “Passed” means the surface opened and the
tested read-only interaction behaved; it does not erase a separately recorded
data-quality, layout, or latency defect.

### Samsung SM-S908U read-only test matrix

| Surface or flow | Baseline installed result | Mutation boundary |
| --- | --- | --- |
| Corrected build launch, app shell, Home, and main menu | Passed after the APK was rebuilt with the two public Supabase client defines | Navigation only |
| Dex root | Passed; species content rendered, but first useful content took about 12 seconds | Read-only |
| Dex root layouts | Detailed, compact, and grid modes opened and rendered | Local presentation state only |
| Dex root filter/sort controls | Generation, type, progress, and sort controls opened; name sorting was exercised | Local query/presentation state only |
| Dex search | Passed; typing and resolving a Pikachu search result was visually verified | Read-only search |
| Pikachu canonical route/species page | Passed through search and direct species navigation; useful content took about 4–6 seconds | Read-only |
| Species views, layouts, filters, and sort controls | Collection plus observed Owned/Missing views, compact/grid layouts, and set, rarity, finish, ownership, and sort sheets opened | Local query/presentation state only |
| Species action row | Scan, Vault, project, Wall-review, and share entry points were reachable | No action that writes was confirmed |
| Collection Projects and Wanted Cards | Both read-only destinations opened and rendered | No project was started, resumed, stopped, or deleted; Wanted state was not changed |
| Exact species Vault scope | Exact Pikachu Vault destination opened and rendered, then was exited | No Vault copy was added, edited, or removed |
| Wall showcase | Privacy-gated showcase/review UI opened, including the lower content area, then was exited | No section was created and no instance membership, visibility, or intent was changed |
| Card detail and image | A Pikachu printing opened; the full-screen card image opened and returned successfully | Read-only |
| Card set/family/related navigation | Set link, card-family view, and a related-card detail route opened and returned successfully | Read-only |
| Card comments | Comments surface opened and rendered | No comment was composed, posted, edited, or deleted |
| Compare add/clear | A card was added to the compare tray and the compare selection was then cleared | Ephemeral compare state only; no backend record was created |
| Long-press quick actions | Sheet opened and exposed View card, Add to Vault, Want, Compare, Scan, and Share; the installed baseline exposed a 92-pixel bottom overflow | Dismissed without selecting a mutating action; final rebuilt-device retest passed with all six actions visible and no overflow |
| Species share | Android share sheet displayed canonical `https://grookaivault.com/dex/pikachu` | Dismissed without choosing a recipient, copying, or sending |
| Exact-card share | Android share sheet displayed a canonical `https://grookaivault.com/card/{gvId}` URL and card preview | Dismissed without choosing a recipient, copying, or sending |
| Scanner open/exit | Scanner opened and returned successfully | No scan result was accepted or saved |
| Scanner history | History control returned the current “History coming soon” notice | Read-only |
| Scanner flash | Flash control was exercised and visually showed its on state | Device-camera state only |
| Scanner photo picker | System photo picker opened and was dismissed | No image was selected or uploaded |
| Scanner-to-Vault exit | Vault destination was opened from the scanner flow and exited successfully | No Vault write |

The crawl made no purchase and performed no backend or user-content write. In
particular, it did not Add to Vault, mark Want, start/stop a project, change
Vault intent, create or assign a Wall section, post a comment, choose a photo,
accept a scan result, copy a share URL, select a share recipient, or send
anything. Compare add/clear changed only temporary on-screen comparison state,
and toggling scanner flash changed only the camera control state.

### Defects found and current repair state

| Finding | Evidence from installed baseline | Current state |
| --- | --- | --- |
| Quick-action-sheet overflow | Long-press sheet reported `BOTTOM OVERFLOWED BY 92 PIXELS` on the SM-S908U | Fixed with short-viewport regression coverage; final rebuilt-device retest showed all six actions and no overflow |
| Duplicate rarity filter choices | Live rarity sheet contained duplicate semantic choices | Fixed case/whitespace-insensitively with all seven observed production case pairs under test; rebuilt-device rarity menu passed |
| Missing generation/type choices | Live Dex data did not provide the expected generation/type coverage | Seed/worker/checkpoint contract repaired and an authorized gated upsert wrote 1,025 rows; production checkpoint confirms 1,025 generation-complete and 1,025 type-complete rows |
| Dex root latency | About 12 seconds to useful root content in the observed run | Bounded concurrent catalog/ownership reads passed; rebuilt device was still loading at the scheduled 1-second capture and fully useful by the scheduled 2-second capture |
| Pikachu species latency | About 4–6 seconds to useful content in the observed runs | Combined child-image/finish paging and concurrent ownership passed; rebuilt device was still loading at the scheduled 2-second capture and fully useful by the scheduled 3-second capture |

The timing observations are visual bounds from the same device, network, and
signed-in account rather than a synthetic benchmark. Screenshot capture and
pull overhead was excluded from the scheduled capture marks.

## Known residual boundaries

- Android verified HTTPS App Links require a production
  release-certificate fingerprint, a matching Android intent-filter contract,
  and a deployed `assetlinks.json`. Verified App Links are absent and were not
  claimed or fabricated in this branch. Canonical `grookaivault.com` HTTPS
  shares are therefore web-first on Android; custom schemes and in-app routing
  remain the native paths currently verified.
- A project intentionally promotes the single interest-graph row for that
  subject to `manual`. Because the existing schema permits only one row per
  user/subject, stopping can safely delete the manual row but cannot restore
  the exact prior inferred/owned row. Future qualifying activity recreates it.
- App direct-add completion crossings use the new slab-aware client truth.
  A slab created by an external writer still relies on the existing
  server-side completion trigger, whose slab-aware correction requires a
  backend migration and is excluded by the explicit no-migration instruction.
- Server-dependent completion backfills cannot be declared complete from a
  client-only Samsung crawl. Species metadata is separate: its authorized
  no-migration upsert and database checkpoint completed for all 1,025 rows.
- A mixed set/species Projects dashboard performs one bounded owner-slab truth
  read for the batched set lane and one for the species lane. It no longer
  performs a slab scan per tracked set.
- The signed-in web Dex overview reads the collector’s complete paged owned set
  because no owner-scoped aggregate exists for global cross-species progress.
- The release keystore variables are absent on this machine. Release signing
  correctly remains blocked; debug signing was not promoted as a release
  substitute.
- A connected Chrome control surface was unavailable, so no new live Chrome
  visual claim is made. The earlier web typecheck, lint, contract, and
  production-build gates remain prior evidence only.
## Final rebuilt-APK acceptance

Status: **PASS for the approved debug-device scope.**

| Gate or observation | Final result |
| --- | --- |
| Branch | `codex/dex-ux-adoption-v1`; final amended commit is recorded in the delivery handoff |
| Debug APK | Built from the final Flutter source; 191,855,345 bytes; SHA-256 `810AE9964618F364ABE1B7DA548376867FF913E751EDB3CA34F3E87850C2E892` |
| Public-only build input | Passed; only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` were supplied from ignored local configuration and their values were not recorded |
| Secret-packaging guard | Passed |
| `flutter analyze` | Passed, no issues |
| Focused Flutter repair suite | Passed, 43 tests |
| Full `flutter test` | Passed, 458 tests |
| Focused Dex truth/metadata Node suite | Passed, 9 tests; the final metadata checkpoint contract also passed 3/3 after privacy hardening |
| Full Node contract suite | Passed, 819 tests |
| Web typecheck/lint/strict build | Not repeated because the final repair diff did not touch web source; the prior pass remains applicable |
| Migration diff | Empty |
| In-place SM-S908U install | Passed with the signed-in app data and existing local state preserved |
| Cold launch | Passed; Android reported `LaunchState: COLD`, `TotalTime: 1963 ms`, and `WaitTime: 1970 ms`; root first frame was logged at 886 ms |
| Dex root timing | Still loading at the scheduled 1-second capture; counts, filters, and species content were fully useful by the scheduled 2-second capture, down from about 12 seconds in the baseline crawl |
| Pikachu timing/truth | Still loading at the scheduled 2-second capture; fully useful by the scheduled 3-second capture, with exact slab-aware `59/611` printings and `638 copies`, down from about 4–6 seconds |
| Generation/type coverage | Passed visually: Generations 1–9 and all 18 canonical types populated after the 1,025-row production metadata apply |
| Rarity/finish filters | Passed visually: observed case duplicates were removed and Reverse Holo was present |
| Long-press quick actions | Passed: View card, Add to Vault, Want, Compare, Scan, and Share all fit on screen; no yellow overflow or log signature remained |
| Long-press Share | Android chooser opened and was dismissed without choosing a recipient, copying, or sending |
| Long-press Scanner | Scanner opened and was exited without capture, result acceptance, upload, or save |
| Unchanged-link regressions | The baseline crawl had already passed search; species views/layouts; card detail/image/set/family/related/comments; compare add/clear; projects; exact Vault; Wall review; scanner history/flash/photo-picker/Vault exit; and canonical species/card sharing. No source in those unchanged flows was modified after that crawl |
| Device log scan | No matching fatal exception, ANR, `E/flutter`, unhandled exception, or RenderFlex overflow entry |
| Species metadata apply | Passed atomically: 1,025 rows written; post-apply checkpoint reports 1,025 generation-complete and 1,025 type-complete species |
| Purchase/share/write audit | Passed: no purchase, outbound share, collection/content/project/Wall write, accepted scan, or photo selection occurred |

The checked-in checkpoint no longer contains or emits an identifiable user
UUID. Its optional smoke-user progress is anonymized and uses the same exact
direct-plus-slab truth as the app; the production Pikachu checkpoint therefore
matches the device at `59/611`, `638 copies`, and `552 missing`.

The remaining external release blockers are unchanged: an authorized release
keystore is required for a release APK, and its certificate fingerprint plus a
deployed `assetlinks.json` are required before verified Android HTTPS App Links
can be claimed. Neither blocker affects the accepted debug-device implementation.

## Intentionally not copied

- Dex branding, wording, icons, artwork, or trade dress.
- Any purchase or marketplace checkout path.
- Any automatic public sharing.
- Any social behavior that would displace Pulse or Wall.
- Any collection behavior that bypasses Vault’s exact-copy and intent model.
- Any P8 scope.

## Expected product impact

The changes should materially improve the app because they reduce repeated
navigation, avoid full-network reloads for progressive browsing, virtualize long
lists, expose exact ownership and finish truth, and give users persistent
collection goals. They also strengthen Grookai’s differentiation: Dex becomes
the collection-navigation layer, Vault remains the exact private inventory,
Pulse remains the activity layer, and Wall remains the explicitly curated
public layer.
