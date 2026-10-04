# Sales desk trade-ins — October 3, 2026

## October 4 native qualification and source integration

Current source baseline is `82f7c6cce7a61166bf07168779c2384adf3407de` (PR592).
Its Collectr changes are retained without modifying this candidate's migration.
The prior stash and the new `main-82f7-stash.txt` stash are already applied; retain
both as backup and never reapply them to this worktree.

Mac cache cleanup reclaimed 40.19 GiB, leaving 40.3 GiB, with source, scans,
archives, symbols and release evidence preserved. The active printing project
and its Dart process were not stopped. `mac-space-cleanup.json` is the receipt.

New native proof code uses only the retained full427 lab and synthetic users.
The independent Mac source directory is `~/grookai_sales_trade_20261004`; the
fixture manifest and private defines are in external `native-v1`. A task-created
iPad simulator is `CC83C7DB-E6F5-4509-9034-060BCCF8983D`. Its proof must complete
and receive an independent database readback before release. The first attempt
stalled in the Dart loader before any Flutter output; external checkpoint records
diagnosis and cleanup. Never infer native success from the existing widget tests.

`SalesTradeReleaseV1` is the read-only scoped release qualification path for
`20261004160000` only. It rejects combined flags/migrations, requires a fresh
426 baseline, exact427 lab source and retained upgrade, normal hooks and matching
native/web/runtime evidence. It applies no SQL and performs no resets.

## October 4 continuation — checkout prices, outbound references and local proof

The native Sales desk now shows **Your price** (the copy's saved asking price and
currency) on inventory tiles, cart lines and the edit dialog. **Checkout** is
separate and remains the actual negotiated amount. Editing a cart copy retains
its saved asking-price reference; an unset price is explicit. No asking price,
receipt calculation or inventory state is changed by viewing either amount.

TCGplayer buttons open the existing canonical parent's numeric `tcgplayer_id`
when present, otherwise a clearly labeled search with name, set and card number.
These are catalog references, not verified finish/condition matches or new market
quotes. Malformed IDs fall back to encoded search on a fixed HTTPS host. Catalog
quick-add and trade valuation also offer search links. Browser-launch failures
preserve the cart. This adds no scraping, API credential, price import or schema.

Latest local evidence under the external `sales_trade_ins_20261003` directory:
- `full-427-v2/replay-result.json`: complete replay and no-op push passed.
- `upgrade-427-v2/upgrade-result.json`: retained copies/book unchanged; full and
  upgraded schemas match exactly, with 1,160 security definitions.
- `runtime-1791126484543/receipt.json`: real Auth/RPC ownership, atomicity,
  concurrency, quarantine, rollback, recovery and receipt parity passed.
- `web-auth-1791127934847/receipt.json`: real website login, mobile/desktop
  trade receipt, exact backup, reload and two-account isolation passed. Synthetic
  users removed and local controls disabled afterward. Mobile screenshot reviewed.
- `flutter-full-427-v1.log`: 1,244 passed, two skipped before the price/link change.
- `contracts-full-427-v1.log`: 7,047 passed, ten skipped; strict web build passed.
- `price-reference-tests-v4.log`: 20 focused Flutter tests passed after the
  price/link change, including phone/tablet negotiated prices and launcher failure.
- `price-reference-analyze-v2.log`: final full analysis result.

Trade-ins and these UI changes are not released. Next: native runtime proof,
normal source/release gates, web compatibility release and TestFlight. The last
Mac disk check found only 123 MiB free; inspect active work and free only suitable
generated build data before archiving, preserving previous archives and evidence.
No production trade writes, payments or messages were made.

## Current state — October4 Docker recovery and main426 integration

The user explicitly said "restart docker". Normal restart timed out on the
crashed backend; Docker's force-stop followed by start recovered engine28.4.0.
Windows PostgreSQL processes retained their original PIDs/start times; no volumes
or existing lab data were removed. Docker restored roughly497 prior containers.

Read-only current-main/production inspection found nine newly live Jungle
migrations: production426 and main2409d2c3fcafcb9e33b73159aa11229aa570c379.
The implementation branch was advanced to that main, preserving all trade changes
and both histories in the three conflict files. Backup and retained Git stash ID
are in `pre-main-426-backup`; do not reapply that stash. No other worktree changed.
Fresh baseline `baseline-1791126166178/receipt.json` passes at1156security objects,
zero normalized schema difference and171036cards/3400sets/32903traits; no writes.

The old full418 replay/no-op completed successfully but is historical evidence.
Its652xx lab remains retained. The unapplied trade SQL was assigned a new version
after current production: `20261004160000_sales_trade_ins_v1.sql`, candidate427.
New V2 labs use65300/65301 and65320/65321, internal10.245.134/135, project names
`sales-trade-{full,upgrade}-427-v2-20261003`. Follow the external checkpoint for
current replay/integration results; never reset a populated prior lab. New source
qualification is required after main integration. Nothing for trade-ins is live.

The earlier sections below are historical receipts, not current release state.

Candidate `C:/gv_sales_trade_ins_20261003`, branch
`feature/sales-trade-ins-20261003`, starts from main
`81f1e6fe169c65edc305560eafff4a1771e2ac81`. Prior Sales desk release is LIVE:
PR588, production417 and TestFlight342. Its external release-checkpoint.json
supersedes historical local-only notes. Never replay old release intents.

Read [the trade-in contract](../contracts/SALES_TRADE_INS_V1.md). New schema418 is
local candidate/default-off. New v2 completion reuses the receipt journal and
book, adds canonical incoming Hold copies only on explicit selection, and records
quick trades without inventory. Receipts/reporting distinguish consideration from
money received and customer payouts. Catalog and checkout writers are unchanged.

Fresh strict417 read-only baseline passed:171036cards/3400sets/32903traits and
1128security objects, normalized schema difference zero. Planned isolated labs:
`sales-trade-{full,upgrade}-418-v1-20261003`, ports65200/65201 and65220/65221,
internal networks10.245.132/133. Never reset retained prior650xx/648xx labs.

The first full preparation failed before creating any fixture because Docker's
Linux-engine named pipe is missing. Docker Desktop processes still exist; backend
log records monitor exit2 at23:03:44UTC. Standard `docker desktop start` only says
already running. Native PostgreSQL/WSL services were preserved. A question about
restarting Docker is pending because of the user's prior database-work restriction.
No service was stopped/restarted and no production mutation occurred.

External authoritative checkpoint/evidence:
`C:/grookai_vault_operator_artifacts/sales_trade_ins_20261003`.
Do not infer database replay, native runtime proof or live availability from unit
tests. Preserve the separate catalog and checkout work, original Mac builds and
consumed intents. Future releases must use new scoped gates and direct readback.

## Local implementation checkpoint

Native checkout now supports canonical/quick trade lines, explicit percentage,
customer-visible review, optional incoming Hold copy, and durable retry. Reporting
separates gross sales, trade credit, money received and paid to customers. Web
receipt readers, backup/restore, printed/downloaded receipts and message drafts
preserve the complete trade snapshot. Web trade authoring is not added here.
The standalone receipt builder now embeds three isolated modules without network
dependencies or collisions between private helper names.

Passed evidence in the external checkpoint directory:
- `flutter-focused-v3.log`: 14 focused Flutter tests including canonical trade
  selection, no eager creation, confirmation and lost-response retry.
- `receipt-contracts-v1.log`: 36 receipt/cloud/environment contracts.
- `analyze-v2.log`: no analysis issues; final signed-money formatting is also
  covered in the focused tests.
- `web-typecheck-v1.log` and `web-lint-v1.log`: passed.
- `receipt-browser-regression-v1.log`: prior offline receipt journeys passed.
- `trade-browser-v2.log`: actual desktop/mobile browser proof for balance due,
  even exchange, customer payout, escaped text, search, backup, print/download
  and reload, with zero external network requests. Screenshots live under this
  worktree's `artifacts/receipts`; mobile payment receipt was visually inspected.

Migration review corrected a JavaScript replacement-string expansion in the
ignored generator before any lab was created. The final candidate has one v2
completion body. No database replay or SQL runtime success is claimed. The lab
now binds the actual417 baseline receipt and retains a prior-format receipt as
well as two copies across upgrade. The first preparation failed before creating
`full-418-v1`, so no reset/start intent was consumed.

Resume after the pending Docker question is answered: preserve existing services
and labs; recover Docker only when authorized; run new full418/retained417 upgrade
and real Auth/RPC concurrency/rollback proof. Then qualify native and authenticated
web runtime, run remaining release checks, create a scoped418 release gate, and
release web receipt compatibility before enabling trades and distributing the
new native build. Production remains417/TestFlight342; source is uncommitted in
the isolated worktree and no production mutation has occurred for trade-ins.

## October 4 continuation

Docker's engine is still unavailable; native PostgreSQL processes remain active.
The user said "next step" but did not answer the shared-service restart question;
it was presented again explicitly. No Docker/WSL/PostgreSQL restart was attempted.

Completed additional independent work:
- Fixed edited canonical trade labels retaining an old printing identity; review
  now also exposes condition. Added unavailable-printing recheck, phone-size
  cancellation and account-change privacy tests.
- `flutter-focused-v4.log`: 16 passed; `analyze-v3.log`: no issues.
- Added exact65201 trade staging validation and rejection of production/mixed
  modes; `receipt-contracts-v2.log`: 38 passed.
- `web-build-v3.log` / `.json`: strict Next build passed using an empty synthetic
  loopback catalog and fake build-only keys. The temporary fixture server closed
  on completion. This is compilation/prerender evidence, not DB/Auth/RPC proof.
  V1 failed for missing build-only admin key; V2 exposed a missing public_profiles
  fixture endpoint; both failed receipts remain preserved. V3 has no unexpected
  requests. No production credentials, real sales or database mutation were used.
- `web-lint-v2.log`: passed. Source remains isolated and uncommitted.

The required real database, native runtime and release sequence above is still
pending. Refresh current main and the production baseline before qualifying any
release; do not treat this synthetic website build as authorization to activate.

## October 4 broad regression checkpoint, 08:25 UTC

The subsequent "next step" still did not answer whether database work is finished.
Docker's Linux engine remains unavailable; native PostgreSQL processes are alive.
Read-only process inspection found no active catalog/repair command, which is not
proof that the user's shared-service restriction has ended. No restart attempted.

Completed the independent full-suite checks:
- `flutter-full-v1.log`: 1179 passed, 2 fixture-dependent skips, no failures.
- `flutter-analyze-full-v1.log`: full app analysis, no issues.
- `contracts-full-v2.log`: 6561 passed, 10 skipped, no failures (6571 total).
  The first helper invocation exceeded Windows command-line length before any
  test process launched. V2 uses the same glob arguments as package.json; there
  were no skipped failed tests or hook bypasses. Production credentials were not
  inherited by the contract subprocess.
- `secret-packaging-v1.log`: passed.
- `runtime-health-v1.log`: both checks passed, seven pre-existing deferred gaps.
- `git diff --check`: passed.

The real RPC test runner now binds the completed full418 replay, config and all
migration hashes, exact running Supabase17 container, isolated network and
loopback relay before reading fixture credentials or making writes. Its syntax
check passed, but the real RPC test has still not run. Do not regenerate this
runner from the older ignored scratch generator, which predates this guard.

These are individual release checks, not a completed shipcheck/commit/release.
The database-dependent preflight, quarantine report, migration replay/upgrade,
Auth/RPC/native integration and release remain pending. Source is uncommitted;
production417/TestFlight342 is the last verified release and has not been changed.
