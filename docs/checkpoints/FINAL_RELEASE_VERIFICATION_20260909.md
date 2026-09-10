# Final Release Verification - September 9, 2026

Scope: complete the unfinished collector crawl, operational repair, privacy and
store work. Calendar waits remain waived; correctness is not waived. Build318
remains externally available in TestFlight, not the public App Store.

## New Evidence

- Frozen production web `27d81439926b57432c5e09de72c6f5ee390b6520`, deployment
  `dpl_7CfGkbhWiTfNXfgMpny2L2jatn1H`: 48 signed-in mobile/desktop route cases
  passed page/access/error checks. Four early image samples remained incomplete
  and require follow-through; route success is not image or business-write proof.
- Guest web: 22 routes and two sign-in-boundary actions passed on the repeat.
  Preserve the initial transport timeout on `/vault`; independent curl returned
  the correct login redirect in 627 ms. No freshness or timeout policy relaxed.
- Sealed SQL lifecycle: 36 rollback-only checks passed; independent local
  concurrent mutation and Auth/Storage round trips passed. Full isolated strict
  migration replay and post-replay rollback tests passed. No production fixtures.
- 35 targeted Node contracts and 59 targeted Flutter tests passed. Coverage
  includes memory routing/printing, chat policy, notification routes, founder UI,
  collection totals and sealed lots. Tests are not claims of complete device UX.
- Samsung318: actual collection total and explicit unpriced sealed condition
  rendered; Charizard151 shows three correct cards, finishes, images and prices;
  One Piece set navigation shows61 sets and release-year filters, not Pokemon eras.
- iPhone simulator318: compiled guest search and authenticated exact search,
  card detail, Vault and Sets walkthrough passed XCTest. Initial selector
  failures remain in the evidence. iPad navigation needs tablet-specific test
  selectors; its initial harness failures are not a passed tablet journey.
- Pricing recheck at 2026-09-10T00:21:42Z passed unchanged production health
  policy: 548687 warehouse prices, 164135 eligible/current snapshots, 105032
  parents, zero broken traces or findings. The scheduled run published and
  reconciled successfully; its final health query timed out. The independent
  read-only recheck took 49.7 seconds; no publication or ingestion was rerun.
- MEE's latest systemd execution exited successfully. Worker disk remains
  91% used (11GB free), below the operational reserve target. No cleanup executed.
- Full first commit check: 3267 Node contracts passed; Flutter709 passed with
  two test-file loader transport failures. Both files passed unchanged (9 tests)
  independently. Full hook rerun remains required, not bypassed.
- Capacity audit34403948826: healthy Medium,320GB,80.93% used,600GB maximum.
  This does not establish CPU/latency/restore/billing completion.

## Repairs In This Change

1. MTG incremental writer now records detached Git checkout as `branch: HEAD`
   with `detached_head: true`; exact SHA and tracked-clean checks remain. The
   previous empty branch broke control-plane run34409066713 on `mtg:slz`.
   A real temporary Git repository regression covers attached, detached and dirty
   states. No frozen command was rewritten, retried or marked successful.
2. Login's fixed dark background now has a local dark theme in both system
   modes. The clean simulator exposed black form copy on the dark surface.
   Two actual widget tests verify light/dark parent themes and field colors.
3. Privacy worksheet reconciles coarse location and transaction/collection-value
   collection; public privacy copy names the existing features. No new collection.

## Remaining Release Boundaries

- These source changes need hooks, merge, web deployment and a separately
  identified native build before claiming them deployed. Do not relabel318.
- App Store privacy answers are unpublished. Both available Apple browser
  sessions were signed out; login was requested, not guessed. API submission
  envelope `af3bb6bc-ad94-41dc-8ef8-1d04a9bfe531` is still unsubmitted.
- Native screenshot capture, remaining device/lifecycle matrix, slow-network
  evidence, independent recovery proof and current MEE yield remain distinct.
- Approved catalog commands bind a source SHA. The new source repair does not
  authorize changing an old command's fingerprint or resubmitting arbitrary jobs.
- Preserve source issues426/450, adm-zip advisory61, isolated runtime archives
  and all historical failure evidence. No cleanup, schema or canonical apply.

Evidence root:
`C:/grookai_vault_operator_artifacts/release_closeout/20260909/final_completion/`.
Execution readbacks recorded there supersede progress observations here only
when they explicitly identify the tested/deployed artifact. No gate is inferred
from elapsed time or from a green workflow that did no work.
