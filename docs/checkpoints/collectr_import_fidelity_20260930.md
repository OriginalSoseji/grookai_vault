# Collectr importer fidelity — September 30

## Physical contained-import acceptance passed

The rebuilt V4 isolated iPhone app passed preview, interrupted successful-save
recovery, same-request retry, saved-source grade review, and reselecting the
unchanged CSV without duplicates. Independent SQL confirms three exact copies,
one original document and two successful attempt receipts, with prior rows
unchanged. Screenshots were inspected and remain private. The graded row stays
review-only, rather than becoming raw inventory or a verified slab.

This run uses a contained file-picker fixture. Actual iOS Files selection still
needs verification. The native account is consumed and must not be prepared or
launched through the unused-account harness again. Preserve all its evidence.

The full gate passed its contract, runtime, web typecheck and lint phases, then
stopped at the web configuration guard because the local build lacked an explicit
preview mode. The next retry uses a sanitized local read-only build environment,
with no administrative credentials or production target. No complete gate,
source commit, deployment or real collection import is claimed yet.

## Physical preview found and fixed descending cursor reads

The resumed physical iPhone preview failed before saving any rows. A native
service probe against the actual contained API reproduced the error: implicit
`order` calls requested descending IDs, while the greater-than cursor and
progress guard required ascending IDs. Catalog sets/cards and saved group
readback now request ascending order explicitly. Saved-history tie ordering is
also explicit.

The HTTP fixtures now honor the requested sort direction; seven existing tests
failed before the repair and passed after it. The focused suites plus the real
contained-API preview pass 29 checks (the private export replay is separately
opt-in). The first broad contract run passed 5,817 checks before the commit gate
was stopped to repair this device finding; it is not a full shipcheck pass.
Source V4 is frozen for a rebuilt isolated iPhone app. Device save/retry/history
acceptance and all production/release work remain pending.

## September 30 continuation: storage recovered and main reconciled

The Windows storage blocker is resolved. The candidate now includes main
`26a531320610edbd51ac25fc717a94359d1aa5fc` (the unrelated Trainer Kit pricing
change); the importer source and migration payload are unchanged. The prior
staged candidate is preserved privately and in a retained Git stash. Existing
410 labs and their evidence remain intact. The normal commit hook is being
retried; its actual result belongs in the private continuation receipt.

The Mac sees the physical iPhone, but its lock-state readback requires a
passcode. No new phone test has launched. Independent local readback confirms
the native fixture still has no copies, documents or receipts, with prior rows
unchanged. Physical acceptance and release remain open.

## Latest: source-aware save candidate and native integration

The preview-only checkpoint below is superseded. Additive migration
`20260930010000_collectr_import_fidelity_v2.sql` and Edge endpoint
`vault-import-collection-v2` now preserve private source documents, exact-copy
group mappings and owner/request-bound atomic receipts. The server parses the
CSV and verifies canonical parent/child identity. Normal, holo, reverse and foil
stay distinct. A zero Collectr Price Override is retained without blocking rows;
nonzero overrides need review. Old V1 clients and their endpoint remain intact.

The default native importer uses V2 with stable retry UUIDs and independent
owner-authenticated source/mapping/copy readback. Saved imports exposes retained
original rows and review status. Source portfolios are retained privately, not
automatically created as binders. Grades lacking certificate identity, unresolved
editions/treatments, numberless/sealed products and missing catalog matches remain
review rows, not owned inventory or fabricated raw/graded identities.

Qualification now includes complete410 replay/no-op push, a separate retained-data
409-to410 upgrade and zero schema/security delta between them (1,107 security
objects). Rollback-only SQL proof covers metadata, retries, request conflicts,
late failure rollback, source retention, grade guards, archive replay and RLS.
Real local Auth/HTTP passed six journeys plus the parent test, including concurrent
retries and independent owned-copy/source readback. Existing fixture rows remain
unchanged. Source/handler and legacy endpoint tests pass; native service/widget
coverage includes retry, review/history and the default phone screen.

The private full-export replay retains every original field and quantity and
now identifies usable governed printing matches. Private counts stay in the
external receipt. The isolated iOS app compiled, installed and authenticated
against the dedicated410 lab. Its actual importer screen opens on the physical
iPhone. Full acceptance remains unverified: the Flutter driver stalled, and
direct native UI checks were interrupted by foreground app switching. Preserve
the failed harness attempts separately from product outcomes. No fixture import
has been verified. The user has been asked to leave the test app in the foreground.

Current checks:29 Flutter tests,75 legacy/source/handler tests, seven real local
Auth/HTTP test results and17 rollback-only SQL assertions passed. Static analysis
and Edge typechecking pass. These do not replace the unfinished phone save,
retry and saved-review checks.

A separate export-sized SQL test now passes in the qualified upgrade410 lab:
all synthetic source rows retained, hundreds of distinct metadata/printing groups
saved, receipt replay and a fresh attempt verified without duplicates. Exact
copy metadata and prior retained rows are checked independently. All scale-test
writes roll back. This adds writer-size evidence; it is not a hosted Edge latency
test, phone acceptance, or a real collection import. The physical continuation
reached the screen again but was suspended while the regular app was foreground.

The commit shipcheck is incomplete. Initial dependency resolution was repaired
using existing dependencies with identical lockfiles. Read-only runtime preflight
passed against the contained410 lab. The broad contract run was then interrupted
when the Windows drive had less than1GB free; no full shipcheck or commit is
claimed. Source is staged in the isolated worktree. Owned phone-test gateway,
tunnel and LAN proxy are stopped, temporary Mac settings restored, and the normal
product installation remains334. Preserve all populated labs and private evidence.

Remaining: finish physical acceptance and independent readback, review the
candidate, complete migration/Edge/native release gates, install the corrected
product build, then review the real preview before import. No production write,
Edge deployment, TestFlight upload or real collection import has occurred.
Preserve populated full410/upgrade410 labs, consumed intents and old409 labs.

## Historical preview-only checkpoint

The user explicitly requested repairing the importer before importing their
existing collection on the physical iPhone. Current-main base:
`bb515d3b582b8c6ba40fa2c4c61cde8a3879128e`. Worktree:
`C:/gv_collectr_import_20260930`, branch `fix/collectr-import-fidelity-20260930`.

Read `docs/contracts/COLLECTR_IMPORT_FIDELITY_V1.md`. The native preview now
retains source records and metadata, reads all catalog pages, scopes games,
normalizes collector numbers, applies explicit set aliases and explains review
cases. The original atomic recovery path remains for compatible simple imports.
The loss-prone V1 writer is blocked for source details it cannot preserve.

This is a partial repair, not a completed full importer or released native build.
Backend save fidelity, governed child-printing resolution, grade/portfolio/sealed
handling, sandbox saved-outcome proof, physical iPhone acceptance and release
remain open. Do not commit the founder's collection using build334's old preview.

Local validation: the focused recovery and fidelity suites, including the private
offline export replay, pass 21 tests. Static analysis of the four changed Dart
files passes. A 390x844 widget journey verifies visible source distinctions and
disabled unsafe save; it is not device evidence. The private replay accounts for
every source record, quantity and field; catalog matches do not count as saved
printing identities or import readiness.

The linked migration ledger is clean at409. Ordinary `AuditLinkedSchema` fails
with a nonempty linked schema diff. Follow-up read-only comparison proves these
are the three documented column-order differences: zero remaining schema SQL
and1103 matching security objects. The new separately scoped
`-CollectrImportFidelityBaselineAudit` gate verifies the full409 replay receipt,
source/copy/config hashes, network, workers, ledgers and schema/security parity.
It passes and authorizes no reset, PrePush or production application. No migration
was authored/applied, no backend route changed and no production collection write
occurred. Retain the original raw-diff failure as diagnostic history.

Private task state and exact counts are under `collectr_iphone_import_20260929`
in the external operator-artifact root. Existing iCloud CSV and normal iPhone334
installation remain unchanged. Previous sandbox V6 import proof is historical;
its used account and release/apply intents must not be replayed.
