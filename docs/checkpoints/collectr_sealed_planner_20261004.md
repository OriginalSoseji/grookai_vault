# Collectr sealed identity planner — October 4

## Release-tool Linux validation — October 5

Hosted PR597 found that importing pure scope validators also loaded a Windows-
bound database helper. The gate now loads that helper only inside the actual
workstation-validated gate execution. No importer or SQL bytes changed. All18
Windows boundary checks and14 pure scope checks in isolated Linux pass; normal
hooks, hosted checks and fresh production preflight remain release requirements.
Private LIVE_CHECKPOINT.json records progress; no production apply is implied.


## Combined release baseline — October 5 UTC

Commit b8274c9cc passed the normal hook:7200 contracts and1259 Flutter tests,
10/2 explicit skips, strict web build, full lint/analysis. Final fetch then found
PR594/main499208eab had shipped trade-ins at production427/TestFlight343.
The original PrePush stopped correctly before dry-run or any production write.

Conflicts in staging routing and the entry/playbook notes retain both features.
The sealed SQL hash is unchanged. Candidate428 uses a fresh read-only427 baseline,
new full428 replay and retained427-to428 upgrade on5872x/5874x. Preserve all previous
populated labs and consumed CLI preparations. WEB_CHECKPOINT_V2.json binds the
combined runtime; RELEASE_CHECKPOINT.json records actual final hook, source and
CLI dry-run outcomes. Old426/427 sealed-only proof cannot authorize this release.


## Release preparation continuation — October 5 UTC

Fetched main82dcfa714; the candidate already contains it, so no merge is needed.
Fresh read-only production comparison still passes at426 with1156 matching
security definitions. The known three base-table physical-order differences
remain accounted for by the established comparator; no new drift is suppressed.

The sealed-specific strict gate and CLI inspection package now bind the exact
426-to427 change, qualified source, full replay, retained upgrade,22 SQL assertions
and9 browser scenarios.18 boundary tests pass. PrePush requires the normal full
commit hook and clean current-main source; dry-run checks the exact pending file
and independent before/after live schema. Neither can apply SQL or import data.

Actual release checks, commit, PrePush and CLI dry-run outcomes are recorded in
private `collectr_sealed_save_20261005/RELEASE_CHECKPOINT.json`. Read that receipt
before continuing; source instructions alone do not establish gate success.
The operator playbook records deployment order and flag-off recovery. Production
activation, live readback and the real sealed import remain separate. Purchase
currency is still unconfirmed. Preserve all1375 accounted copies and populated labs.


## Website integration continuation — October 5 UTC

The website now supports V3 preview/save and durable recovery, including separate
card/sealed counts, explicit purchase currency, original-source review/export and
added/already-accounted totals. Existing V1/V2 recovery paths are retained. New
V3 previews/additions require server `GV_COLLECTR_SEALED_IMPORT_V3=1`; default is
off. A disabled flag still allows an already-saved V3 receipt to recover. Broad
sealed ownership remains an independent SQL requirement; no canary bypass exists.

The actual Next route was tested against the dedicated final427 lab, with real
local Auth and service-role calls. Nine HTTP/browser scenarios pass, including:

- Mixed save, explicit currency, original review details and independent readback.
- Concurrent fresh requests adding each source copy only once.
- Same-request recovery, changed-payload conflict and cross-owner read denial.
- V2 request recovery and incremental sealed addition to an earlier V2 import,
  with its original card copy unchanged.
- Recovery after archive, later card-note edits and disabled ownership additions.
- Mobile Chromium at 390×844: choose file/currency, reuse an existing sealed copy,
  lose the successful response, reload, retry the identical stored request and
  clear recovery only after verification. Desktop 1280×900 result also captured.
- Browser recovery of an existing V2 session-storage attempt.

All previously present synthetic inventory, source groups and receipts were
compared by every field and remained unchanged. No retained lab was reset. The
proof creates new synthetic accounts; it never uses the original user CSV.
555 focused contracts, 16 staging-boundary contracts, web TypeScript and targeted
ESLint pass. The private `WEB_CHECKPOINT.json` binds current sources and results;
earlier `CHECKPOINT.json` is the backend-only historical receipt. Final browser
evidence is in `web-1791175336929` under `collectr_sealed_save_20261005`.

Local Next is stopped after proof. Production, TestFlight and the 1,375 accounted
real copies are unchanged. No commit/push or release happened in this step.
Next: reconcile with current main, complete release/build/schema gates, then
prepare the production migration plus web flag activation and verify live readback.
The real file's purchase currency is still unconfirmed; the preview now provides
an explicit choice and never defaults to USD. Native import remains V2.

Historical checkpoints follow.

## Atomic backend continuation — October 5 UTC

The candidate now includes `handler_v3.ts`, sealed metadata/target/readback modules
and additive migration `20261005080000_collectr_sealed_import_v3.sql`. These are
local changes only. V2 website/native routes are unchanged; no further original-
file save, catalog publication, production migration or deployment occurred.

478 focused contracts and strict TypeScript pass. The rollback-only integration
proof passes 22 assertions against a dedicated current-baseline database: mixed
card/sealed save, exact reuse, original-source retention, same/new UUID retry,
V2 request collision, late rollback, stale release/mapping, source overlap,
graded/numbered rejection, disabled/canary-only rollout, hidden/signed-in game
access, pause errors, distinct metadata, archive recovery, RLS and unchanged cards.

Private evidence: `C:/grookai_vault_operator_artifacts/collectr_sealed_save_20261005`.
`baseline.json` records read-only426 parity, including 1,156 security objects and
zero normalized differences under the established historical column-order handling.
The ordinary CLI preflight could not run because this worktree is unlinked;
the authoritative management-query comparison is preserved, not a release bypass.
The initial full427 replay is retained; `full-427-v2` uses the final SQL hash and
passes fresh replay/reset/no-op push. The independent 426→427 retained upgrade
also passes: two saved copies and all fixture rows are unchanged, with zero schema
differences and 1,161 identical security objects. `CHECKPOINT.json` binds both
proofs to the final candidate SQL; it grants no production-apply authority.

Docker's backend exited during proof preparation. It was restored without pruning
data or resetting populated labs. All SQL test fixtures were rolled back. Final
full/upgrade labs use5868x/5870x and internal10.245.138/139 networks; preserve them.

Next: connect V3 preview/save/recovery to the website, expose the explicit purchase
currency choice, show separate card/sealed additions and reuse, then verify through
real local HTTP/browser workflows and concurrent requests. Preserve existing V2
attempts and all 1,375 accounted real copies. Currency clarification is pending;
do not assume USD. Review current main/migration drift again before release.

The sections below retain the earlier planner-only checkpoint as historical evidence.

The previous Surge Foil release is complete: PR592/main
`82f7c6cce7a61166bf07168779c2384adf3407de`, 14 additional real copies saved,
1,375 export copies accounted for, and 678 source rows retained for review.
Its external `collectr_review_coverage_20261004/release-and-import-checkpoint.json`
supersedes the historical local-only status. Never replay those consumed intents.

Current branch: `feature/collectr-sealed-planner-20261004`, based on current main
`82dcfa714` in `C:/gv_collectr_adventure_20261001`. Production read-only inspection
confirms 426 migrations, 171,053 cards, 3,401 sets and 32,903 traits. No schema or
production mutation is included. Follow `COLLECTR_SEALED_IMPORT_V1.md`.

## Completed

- Captured all 5,828 sealed variants and the active frozen releases in one
  database snapshot. Released members: 1,651 Pokémon, 2,046 MTG and 332 One Piece.
  Source group and reviewed mapping bindings accompany each released member.
- Added a deterministic shared identity planner and offline CLI. The CLI checks
  complete original-source coverage, excludes already-selected card rows, pins
  input/source hashes and refuses to write private evidence into the repository.
- Replayed the unchanged export. Of 678 unresolved source rows, 493 stay on the
  numbered-card path and 185 have no number. The earlier primary classification
  counted 183 numberless rows because two others were classified as graded.
- 118 rows / 225 source items match exact released identities. These are not
  newly saved or fully metadata-qualified copies; all planner results remain
  explicitly unsaveable until the atomic writer exists.

| Numberless outcome | Source rows |
| --- | ---: |
| Exact released identity | 118 |
| No exact name in this game's catalog | 48 |
| Catalog identity not in active release | 3 |
| Source/catalog set disagreement | 5 |
| Unsupported game | 4 |
| Graded | 2 |
| Unsupported finish | 2 |
| Region/edition/wave requires review | 3 |
| Total | 185 |

The five set disagreements include collection products whose source sets differ
from the catalog group; they are deliberately not treated as aliases. Three
otherwise matching products carry a nonempty catalog wave and remain held.
Missing-number card and multipart names stay visible; no sealed inference is made.

Focused planner/CLI/source contracts and strict TypeScript checks pass. The
private receipt records exact test counts and file hashes. No web UI, native
distribution, database apply or further real import occurred in this step.

## Original planner continuation (superseded by the backend section above)

Implement the atomic sealed save described in the contract, including source
metadata, existing-copy reconciliation and loss/retry recovery. The existing
`vault_add_sealed_copies_v1` alone cannot retain the original document, group
mappings, notes and source dates atomically. Do not loop over Add calls or invent
card IDs. Preserve the existing 1,375 imported card mappings and retained410 lab.

Private evidence: `C:/grookai_vault_operator_artifacts/collectr_sealed_planner_20261004`.
`catalog-bound.private.json` is the authoritative single-snapshot capture; the
earlier paged capture is diagnostic only. The final checkpoint identifies the
current source-bound replay. All prior receipts are immutable.
