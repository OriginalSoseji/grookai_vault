# Combined search release review

Status: local release preparation; no deployment or store submission authorized by this record.

## Candidate and scope

Branch: feature/combined-search-20260922. Base: origin/main a98dd26f7.
The base update from c28f2eea8 contains only Pokemon Master Index audit data;
it has no overlap with the search changes. Preserve the existing artist equality
and complete-pagination fixes already on main.

The candidate adds a shared deterministic interpretation and matching service,
editable web/native filters, complete printing-specific results, preserved back
navigation, and search deep-link routes. It includes regression and native
integration tests. It has no SQL migrations, catalog ingestion, billing changes,
or changes to production accounts or permissions. Vendor Mode remains separate.

Implementation and acceptance details: ../checkpoints/combined_search_20260922.md.
Private receipts remain outside the repository in the checkpoint's evidence folder.

Release preparation restored the stopped Docker backend without resetting or
reseeding the sandbox, installed root dependencies independently from the committed
lockfile, and updated four older tests to the agreed constraint-preserving behavior.
It also corrected a stale native failure message that promised fallback results.
The native recordings precede this shared message change; the final Flutter gate
covers it. Prior feature source and receipts remain available for comparison.

## Gate ledger

| Gate | Outcome |
| --- | --- |
| Reconcile current main | PASS: a98dd26f7 fast-forward, no conflicts |
| Feature acceptance | PASS on c28f2eea8 plus candidate: 53 API cases, 39 JS contracts, 21 Flutter tests, four runtime cases on each native platform |
| Browser journeys | PASS: mobile Chromium/WebKit and desktop Chromium; exact printing, full pagination, back restoration, interpretation controls |
| Full repository shipcheck after reconciliation | PASS at 2026-09-22T13:48:59Z: 4,046 contracts passed, four skipped, zero failed; web typecheck/lint/strict build; Flutter analysis and all 736 tests |
| Local review availability | RESTORED: Docker/database healthy; port 3202 returns 168 exact reverse-holo fixture matches; all 12 core API readbacks pass after restart |
| Full signed-in application shell | OPEN; owner/visitor API fixtures and actual native screens were tested, not the entire authentication shell |
| Physical Android / iPhone | OPEN; current native evidence is emulator/simulator only |
| Production catalog completeness and latency | OPEN; synthetic fixtures prove algorithm behavior, not live catalog coverage or scale |
| Deployed universal/app links | OPEN; source changes are tested, live associations, older installed clients, and OS refresh require release verification |
| Deployment / store approval | NOT REQUESTED by this local preparation step |

Do not mark an unavailable check as passing. The four contract skips cover the
host-specific iOS config check and three opt-in SQL suites (market activation
coverage, One Piece printing promotion, Pokemon sealed additive catalog);
they are not passing results.
The private shipcheck.log records their exact names and the unchanged skip rules.

A local checkpoint commit does not certify deployment readiness. The exact source
commit, file hashes, and gate receipt are in the private release-source-manifest.json.
The recorded gate used only local API/SQL addresses, with inherited service secrets
removed. The commit intentionally uses the documented --no-verify operator path
in docs/contracts/AUTOMATED_SHIP_GUARDS_V1.md to avoid rerunning this completed gate.
This does not waive a failed check; the final gate exited zero before the commit.

## Deployment sequence for separate review

1. Record the currently deployed web artifact, native version/build numbers,
   environment, and rollback target by read-only inspection. Recheck main drift.
   Keep local fixtures and local URLs out of production build settings.
2. Complete full shipcheck and unresolved signed-in/native release checks against
   the frozen source. Inspect representative live catalog records read-only to
   assess artist/finish coverage and broad-query latency before enabling rollout.
   Do not infer that missing finish metadata establishes absence of a printing.
3. Present the exact web artifact and native builds for deployment approval.
   Confirm rollout scope explicitly: web/service and native distribution are
   separate release actions. No deployment is authorized by this document.
4. Release the web resolver/UI first through the existing production workflow.
   Gate association-file publication separately: verify that older installed iOS
   versions handle newly claimed search paths safely before publishing expanded
   AASA paths. If they do not, retain the deployed association file in the web
   artifact and resolve link compatibility before publishing that expansion.
   Verify artist-only, name-only, mixed query, typo undo, ambiguous artist,
   no-match/error states, every result page, and exact printing navigation.
   Confirm older native clients retain complete matching results.
5. Publish native builds through the established store process after approval.
   Verify real signed-in and guest journeys, cold/warm search links, artist-link
   refinement, explicit filters, and back state on physical Android and iPhone.
   Verify deployed AASA/Android associations and refreshed OS link handling.
6. Record source, artifact IDs, checks, failures, and rollback targets. Monitor
   search errors and broad-query latency through existing operational tooling.
   Then resume the broader app/website audit without losing its open inventory.

## Rollback and acceptance

Any lost constraint, incomplete page set, wrong printing, permission regression,
or sustained resolver failure blocks release or triggers rollback to the captured
prior web artifact. No database rollback is needed for this code-only change.
Do not roll the service back blindly after new native builds ship: their visible
filters depend on the new response metadata. Verify both native generations
against the rollback target and pause native distribution if necessary.

Acceptance requires all requested constraints on every result, distinct recorded
finishes, stable complete pagination, reversible interpretation, visible service
failures, unchanged permissions, and cross-platform query/back-state preservation.
Current limitations must remain visible: ownership is card-wide across printings;
language is governed for Pokemon; artist auto-recognition uses the Pokemon snapshot.
