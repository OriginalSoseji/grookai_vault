# Square catalog sync checkpoint — November 10, 2026

## Dependency security refresh — November 11, 2026, 07:55 Denver

This section supersedes earlier progress. Production remains483; no production
schema, inventory, payment, website deployment or Samsung install has changed.
The normal commit/push hooks passed at5dcdee889 and again at69ef7c2c7, with1,979
Flutter tests,50 Square tests and the complete web/contract checks. PR897 is open.
Its original CodeQL alert602 was reviewed and dismissed as a false positive:
the alleged password source always throws; reachable lookup digests consume
random32-byte OAuth tokens, not passwords. The key guard remains enabled.

An additional production dependency audit found existing critical Next.js and
high image/archive/source-map advisories. Deployment is held for the patched
runtime: Next/eslint-config-next16.4.6, sharp0.35.5, adm-zip0.6.1 and
source-map-js1.2.2. Backend and web `npm audit --omit=dev` both report zero
advisories. Existing dependency-floor tests now pin the patched releases.
The updated linter exposed one existing internal checkout navigation call;
`PurchaseReview` now uses the App Router rather than `window.location.assign`.
Primary advisories include GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr and
GHSA-wq5f-xc86-pv6w. No scanner/model API upgrade was required.

The patched runtime passed all8 actual local-Auth HTTP commerce stages in
`local-fresh-v1/http-commerce-1794408807137.json`, retaining84 execution source
hashes, and all3 browser/API/desktop/phone-layout tests. The synthetic canary was
paused at catalog revision6/commerce revision4 with empty allowlists and no
released claims; receipt `local-fresh-v1/runtime-controls-paused-v4.json`.
Fresh committed-source qualification and ordinary hooks must pass again before
this changed dependency tree can ship. All eight applied local SQL files and
previous proof receipts remain unchanged; release manifest V5 receives a new
source/evidence revision for the same exact483-to491 SQL payload.

Vercel production now has only the prepared Square app ID, exact URLs, one stable
server-only sensitive encryption key and all three enable flags explicitly false.
The same key is configured for the GitHub recovery worker, whose enabling variable
is explicitly false. Existing Supabase configuration was preserved. Private
readbacks: `host-default-off-v1/readback-v2.json` and
`worker-default-off-v1/readback.json`. The prior production deployment remains
`dpl_5xmhpiKPe8XeGN3gX1tBUo45u8q8` at main71aeeba6f. Verified-TLS official CLI
dry runs accepted exactly8 pending migrations; no remote schema was applied.
Those packages are bound to older source and cannot authorize the security refresh.

Both Android531 artifacts are built and signature-verified. Official signed run
43036247806 succeeded at5dcdee889. The same-package Samsung QA artifact retains
the installed certificate; the official production certificate differs and must
not replace the installed app by uninstalling it. Native source is unchanged by
the dependency patches. Samsung is still530 with its existing data/session.

The desktop/browser host still reports a missing native pipe. Restoring that
connection is necessary for the existing production app secret, webhook setup
and real seller OAuth. Automatic approval review separately rejected opening the
Square developer console through the Samsung browser, stating "blocked by policy";
that route is not retried. Live unchanged-QR Samsung checkout and grookai sale
readback remain mandatory and unproven. No production-ready completion is claimed.

## Final candidate freeze — November 11, 2026, 06:40 Denver

This is the latest state; earlier sections are retained historical evidence.
Production is still483. Live Square seller OAuth and physical Samsung checkout
are still unproven because both browser/computer access hosts are unavailable.
No production schema, credentials, stock, payment, app install or web deployment
has changed. No source commit/push has completed yet.

Both isolated labs are now491 with eight immutable applied migrations. The final
exact admission is `-SquareCommerceReleaseV5`; its AuditLinkedSchema passed in
`release-gate-audit-v5-a/qualification.json`. Production483 has zero baseline
drift, and fresh/retained491 have empty public/private schema diffs and exact
security, function definitions and owners. Existing data was preserved at every
upgrade/no-op. The last three repairs add private run context/stage diagnostics,
priority for a saved interrupted catalog request, and an immutable payment-time
boundary so an old payment/refund cannot dispose a later allocated copy.

Final full HTTP/Auth proof `local-fresh-v1/http-commerce-1794404383141.json`
passes all8 stages, records84 unchanged source-file hashes and real local SDK
Auth, and explicitly labels its loopback provider as synthetic. Three concurrent
owner wakeups create one SKU/stock unit. A forced provider503 records the failed
connection/target/stage and recovers the same saved request when a different
card wakes sync. Duplicate notifications create one disposition. A missed refund
webhook is recovered even when the order is omitted from the order update feed.
Refund leaves stock0 and the old sale; confirmed return creates one private GVVI.
The canonical authority rollback test also proves that a payment created before
the allocation cannot archive it. Full source execution is distinct from native
Edge add and live physical checkout acceptance.

Square's actual Sandbox read-only V3 qualification passed at13:32:41UTC using the
existing completed V2 sale/refund. It verifies payment creation facts and the
independent updated-refund feed with no provider mutations. Receipt:
`real-sandbox-reconciliation-proof-v3.json`; original private source remains under
`.codex/private/square_sandbox_20261110/reconciliation-proof-v3`.
All50 Square backend tests and all3 real local-Auth browser/API/phone-layout tests
pass. The first ordinary full shipcheck passed1,979 Flutter tests. The subsequent
normal commit hook passed contracts/web/analyze but failed four test-worker IPC
loads before any test assertions ran; it made no commit. Those exact four files
then passed all18 tests in isolation; the observed collector/search files also
passed192 tests. A complete ordinary hook rerun is required, never bypassed.
Local Next dev and build now use separate generated directories, and synthetic
provider state readback uses atomic replacement. Production paths are unchanged.

Existing Vercel project/API access was reverified read-only; no Square env keys
exist there. Private production configuration was prepared outside every checkout
with flags OFF and one stable32-byte encryption key. Existing production Square
app secret and webhook subscription signature remain missing; do not substitute
Sandbox values. Public-only mobile defines preserve current repository feature
flags. Samsung build530's APK and matching certificate were backed up/read-only;
its certificate is e9575fdd80e4bc1b4e5a80e3638c76f963ae2618db4f71f95d5a0022bc7089c2.
The private build helper prepares release-mode QA531 with that installed debug
certificate, explicitly not the production signing key, and does not install it.

Next: pause the synthetic canary without releasing retained claims, commit through
ordinary hooks, reconcile PR894 ancestry, committed-source PrePush, push/CI/PR and
qualified gated deployment. Build/install the same-certificate Samsung QA update
in place and separately build the production-signed artifact. Live configuration,
seller authorization, recovery activation and actual unchanged-QR checkout remain
mandatory before declaring the requested process complete.

## Current qualified candidate — November 11, 2026, 06:05 Denver

This section supersedes the historical progress entries below. The owner has
authorized completing production and Samsung without routine micro approvals.
The complete flow is still **not released or accepted on the physical register**.

The ordinary full `shipcheck` passed on the complete source checkout: secret
packaging, preflight, contract tests, eBay tests, runtime health/quarantine/deferred
reports, web typecheck/lint/strict build, Flutter analysis and1,979 Flutter tests
(two skipped). Additional Square transport/service/scheduler tests pass46, and
all3 actual local-Auth desktop/phone browser/API tests pass after commerce tests.
Full output is retained at `source-checks-v2/shipcheck-1794400826299.log`.

Real HTTP/Auth qualification caught a legacy scalar-role dependency while
recording a paid order. It left a durable review and no partial inventory write.
Forward migration `20261111130000_square_inventory_anchor_core_v3.sql` creates
an inaccessible owner-parameterized anchor core and redirects the two existing
private/server calls to it. It never forges owner claims or broadens public grants.
All five migrations are now locally applied and immutable. Both retained labs
upgrade487→488/no-op with all413 existing table data hashes unchanged. The exact
SHA pins and original four migration pins are in the release manifest and receipts.

The failed paid order recovered from the same saved provider order after that
repair. A fresh full HTTP run then passed all six stages: canonical private add,
public For sale → automatic unchanged-QR catalog item and stock1, protected claim,
signed webhook → one canonical sale despite duplicates, completed refund with
stock0 and old archive retained, confirmed return → one new private GVVI.
`local-fresh-v1/http-commerce-1794401210662.json` retains this synthetic-provider
proof. Existing native Edge add is a separate device acceptance gate; the helper
uses its service-only add authority after actual SDK owner verification.

Strict `-SquareCommerceReleaseV3` AuditLinkedSchema passed from live483 to the
exact five pending migrations. Live sanity is172,427 cards/3,412 sets/47,409 traits.
The current production baseline matches all2,450 security/definition objects;
fresh/retained488 public, grookai_square and grookai_inventory schema diffs are
empty, with exact owners/ACLs/RLS/function definitions and no exposed private
helpers. Receipt `release-gate-audit-v3-b/qualification.json`. The first comparison
failure was equal default-ACL rows ordered without owner tie-breaking; all actual
objects were identical. The query now orders by owner as well, without suppressing
any object or definition. PrePush additionally requires committed frozen source.

Square's actual Sandbox transport sale/refund proof remains separate and passed;
it does not prove production seller OAuth or a live Samsung checkout. A five-minute
GitHub recovery workflow is implemented alongside immediate post-save/webhook
processing. It is not installed/activated until source and secrets are deployed.

The machine restarted between turns. All database data survived; task-owned
loopback relays were restarted without resets. Both computer-use and browser
access now report unavailable hosts, including one reset/retry. This blocks the
existing signed-in developer console, production credential capture/configuration,
seller OAuth and physical checkout acceptance. The user was asked asynchronously
to reconnect access. ADB still sees Samsung R5CT3291F6E at build530/debug signer.
Preserve its package, certificate, data and session; no uninstall or replacement
package is permitted. No production schema, environment, stock or payment changed.

Remaining work: committed-source PrePush, normal source integration/CI, production
default-off migration and hosted release, existing Square app callback/webhook and
server credential setup, real seller authorization, independent recovery activation,
same-certificate Samsung update plus separately signed production artifact, and
actual unchanged QR checkout with verified grookai sale readback. Never label a
debug-certificate QA APK or a synthetic payment as production acceptance.

## Active overnight completion run — November 11

Latest progress (08:18UTC, November11): V2 migration is now APPLIED LOCALLY and
IMMUTABLE in both labs, SHA256
2f35fb4833e4c6e43c44d7d530c9689cf8ff56ca7d247ced463a19d73caf7419.
The fresh commerce-fresh-v2 project genuinely reset/replayed483 and applied all4
Square candidates to487, preserving394 table hashes and passing CLI no-op. The
retained local-fresh-v1 upgraded486→487, preserving401 table hashes including all
owner/copy/operation data, then passed no-op. New controls remain OFF. Receipts
commerce-upgrade-result-v2.json in each lab pin every applied candidate. Do not
edit any of these4 SQL files; subsequent fixes need a forward migration.

Applied authority tests pass via
node scripts/schema/test_square_commerce_candidate_v2.mjs --applied.
The default diagnostic DDL mode is only for an unapplied draft; its post-apply
source-drift rejection was retained as expected failed evidence. Actual Square
Sandbox commerce transport passed at07:54:27UTC: stock1→completed USD20 sale→0,
same payment request recovered the same payment, full refund completed and stock
remained0. No real card or production account was charged. Private proof is
C:/Users/ccabr/.codex/private/square_sandbox_20261110/commerce-proof-v2/proof.json.
The first attempt observed inventory propagation delay; explicit --resume reused
the retained request keys and completed without another sale. OAuth remains a
separate unproven gate.

Native Square service/route tests (7 with eBay route regressions), Flutter analyze,
web typecheck, ESLint and optimized local web build pass. Focused Node checks
pass51. Ordinary preflight now passes against the matching local SQL/API lab.
The initial ordinary preflight/contract attempts failed because the sparse
checkout excluded required historical checkpoint/fixture files. The sparse
checkout was disabled (own worktree only); no gate was skipped. All source is
now present. A partial pre-expansion contract run was stopped and its log retained;
rerun the full ordinary shipcheck on the complete checkout before committing.

Current-main PR894 artwork changes are carried into the candidate source using
its exact patch; reconcile commit ancestry with origin/main before push. Samsung
is actually version530/debuggable, not the earlier528 snapshot. Preserve that
current signer/data and choose a higher build code at installation time.
Vercel existing project API authentication works (metadata read only, no changes):
private CLI auth at AppData/Roaming/com.vercel.cli/Data/auth.json. No Square
production env keys exist there yet. Never emit its token or any env values.

Next: local real-Auth/API/browser integration with a strictly local synthetic
provider transport; full fresh/retained/schema/security qualification and exact
PrePush; normal source checks; production credentials/OAuth, hosted deployment,
durable worker/webhook and Samsung real QR sale acceptance. Source added since
the first checkpoint paragraph includes immediate post-save native/server wakeups,
durable copy-change queue, guarded canonical return intake, native adoption and
withdrawal controls, background webhook processing and a bounded commerce CLI.
Production remains483 and no production release or Square stock write occurred.

The owner now explicitly authorizes completing the entire production list,
website and Samsung, without routine micro approvals. The acceptance is actual
add-for-sale → automatic Square item → unchanged QR scan in Square → completed
sale → grookai reconciliation. This supersedes the earlier preparation-only
authorization boundary below. Passing local checks still does not prove release.
No production schema/deployment/stock/payment has yet changed in this run.

Current main advanced to 2e6aff31c (PR894 exact printing artwork). This checkout
has fetched it but has not integrated it yet; carry that fix before release.
Samsung R5CT3291F6E / SM_S908U is attached via
C:/Users/ccabr/AppData/Local/Android/Sdk/platform-tools/adb.exe.
Preserve com.grookai.vault, its signer/session and current device data.

The separately named SquareCommerceBaselineV2 read-only strict starting audit
passed against fresh production483 with all1395 security objects and zero schema
diff, while admitting only the three byte-pinned local catalog candidates.
Receipt: baseline-commerce-v2-a/baseline.json in the existing private artifact
root. It is not a PrePush/candidate apply gate and cannot admit the new V2 SQL.
SquareBaselineV1 remains exact483 and unchanged in its admission semantics.

New active contract SQUARE_COMMERCE_SYNC_V2 covers exclusive stock, auto-enrollment,
provider settlement, safe refunds/returns and complete release/device acceptance.
New migration 20261111080000_square_commerce_sync_v2.sql is **UNAPPLIED and still
an editable draft**. It factors the existing canonical archive/disposition
implementations into private owner-parameterized cores, preserving public Auth
wrappers and grants; no owner JWT is forged. It adds default-off commerce
controls, consent/preferences, durable exclusive allocations/stock operations,
minimal webhook hints, order observations, sale/refund/return ledgers and guarded
service authority. Both other-channel claim paths are protected by triggers.

The diagnostic helper test_square_commerce_candidate_v2.mjs executes draft DDL
and real authority tests in one transaction that always rolls back. It never
changes the migration ledger. Latest diagnostic passed: competing web/eBay
claims, protected archive, pending payment, exactly-once canonical sale, no
refund-driven resurrection, confirmed distinct return, private-core grants.
Logs commerce-diagnostic-*.log are retained in local-fresh-v1. Historical applied
SQL and the populated486 lab remain unchanged. Do not freeze/apply this draft
until its expanded behavior and remaining failure/concurrency cases are tested.

New in-progress code: order_evidence_v2.mjs, webhook_v2.mjs,
commerce_service_v2.mjs, commerce_backend_v2.mjs, new thin web webhook/native
return routes and expanded owner API; Flutter SquareService/SquareScreen and
Account tile. These latest changes are **not yet fully qualified or deployed**.
OAuth can request the implemented commerce scopes only when explicitly enabled.
Secrets contract documents the webhook signature key before use; no actual
webhook subscription/key or production OAuth credential has been configured.

Immediate continuation: meaningful normalizer/webhook/orchestration tests; finish
website commerce/withdraw/return controls; native return routing and post-save
sync notification; persistent worker/reconciliation with monitoring; exact
draft/candidate fresh+retained replay/security qualification; integrate PR894;
full normal source checks and release gates; real Square OAuth/server secrets,
Sandbox sale/refund proof and actual production Samsung QR checkout acceptance.
The remaining sections record the preceding catalog phase and retained evidence.

## Outcome and current boundary

The owner wants one grookai-created QR to open a public card page in a phone
camera and find that exact copy in Square, with automatic item creation instead
of manual per-card entry. The owner reported the single Android Square pilot
works and authorized implementation and developer-app creation.

**Local implementation and real Square Sandbox catalog transport are verified.
Production sync is not enabled or released.** No production schema, seller OAuth
binding, worker timer, stock allocation, payment, commit, push or deployment has
occurred. The public QR payload remains unchanged.

The intended flow is Connect Square once → choose a location → select public
vendor cards → confirm sync. Optional ongoing sync applies to that selection.
Private collection additions never become automatic publication. This phase
creates catalog entries and updates names, condition labels and asking prices.
It does not reconcile sales or allocate sellable quantities.

## Source and isolation

- Worktree: C:/grookai_square_sync_20261110.
- Branch: feat/square-catalog-sync-v1; base origin/main 1dc5297a3.
- Preserve the dirty C:/grookai_vault and all previous labs/worktrees.
- Historical feasibility evidence remains in
  C:/grookai_vault_square_investigation_20261110/docs/audits/square_pos_integration_20261110.
  Its old feature-branch inspection does not override current-main Stripe,
  eBay, stock reservations or custom-product authority.
- No applied historical migration bytes were changed. Three new migrations
  applied only to the task-owned local lab are now immutable there.
- Current web UI preserves bundled Roboto, lowercase branding, original logo
  and shared Winter accents. No native application was rebuilt or changed.

## Production sanity and starting-baseline qualification

Read-only canonical production sanity passed at
https://ycdxbpibncqcchqiihfz.supabase.co: card_prints 172427, sets 3412,
card_print_traits 47409 and v_vault_items 317. Its last observed ledger has
483 migrations, latest 20261110090000. Three Square migrations remain unapplied
remotely. Reverify these facts before any release.

The ordinary required AuditLinkedSchema was run before schema work. It failed
empty shadow replay at 20261012010000_card_print_identity_aliases_v1.sql:
alias evidence pairs 0/ambiguous 0, SQLSTATE 23514. This was a historical
data-prerequisite failure, not evidence of production data loss.

A separately documented **read-only starting-baseline** scope subsequently
passed. See GV_MIGRATION_MAINTENANCE_CONTRACT.md, -SquareBaselineV1,
verify_square_baseline_v1.mjs and its pinned manifest. It permits exact483 only,
not PrePush, pending candidates, arbitrary targets or production writes.
It pins twelve retained proofs from the protected catalog-482-v3-20261110 lab,
checks unchanged migration bytes, reads production through the official CLI
with verified TLS, compares all 1395 existing public security objects, and
requires zero remaining schema diff after the already-qualified three-table
physical column-order reconciliation.

Receipt:
C:/grookai_vault_operator_artifacts/square_sync_20261110/baseline-483-v1/baseline.json.

This consumed starting proof is not a candidate release gate. The flag now
correctly rejects the checkout's 486 files. Never widen it to admit candidates
or edit historical SQL to manufacture an ordinary replay pass.

## Owned local replay and retained-data proof

New, unlinked lab:
C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1.
Project square-fresh-483-20261110; database 61840, API 61841, web 61850.
The database has workers disabled, an internal Docker network and loopback
relay. No production credential is used.

The actual CLI reset of the empty owned lab passed to the pre-alias prefix.
An explicit synthetic fixture provided the historical alias evidence shape:
1294 test parents, 647 pairs. Unchanged historical migrations then completed
through483, with a second CLI no-op. No populated lab was reset or repurposed.
Retain freeze.json, reset-prefix-result.json and replay-result.json.

Local-only immutable candidate migrations:

| Migration | SHA256 |
| --- | --- |
| 20261111051000_square_catalog_sync_v1.sql | 3e6103471137049e5bb74634ea1e93f425a1e64994f17ca60513b1953287171b |
| 20261111060000_square_catalog_worker_runs_v1.sql | Recorded in worker-candidate-intent.json |
| 20261111063000_square_catalog_retry_controls_v1.sql | 2ddc15cdba912d132d10a4d7351fff51b0332935bc9b90685b8509fefafe338d |

Each applied with the CLI and a no-op. The retry upgrade retained exact digests
of eleven populated tables, including two actual local Auth users, three copies,
encrypted synthetic connections, mappings and operation journals. Receipts:
candidate-result.json, worker-candidate-result.json, retry-candidate-result.json.
Do not rerun consumed apply helpers or reset this now-populated lab.

Real role/RLS SQL authority proofs ran inside rollback transactions at484/486.
The runtime fixture uses official local Auth/PostgREST/RPC with a **fake provider
transport**, two owners, three synthetic copies and two mapped test targets.
Three worker ticks produced two creates and a no-op without real Square calls.
runtime-proof.json records this distinct proof.

Local canary controls were enabled only for the synthetic owner to exercise
the API/UI. After verification, the service-only CAS controls RPC paused both
flags and emptied the allowlist at revision2. runtime-paused-v1.json records
the shutdown. The owned dev server was stopped; no timer is installed. Retain
fixtures rather than resetting them. Browser tests require an explicit local
canary re-enable before rerunning. Production controls were not created/enabled.

## Implemented code

backend/square now contains the pure planner/offline CSV preview, fixed-origin
bounded HTTPS client pinned to Square API2026-09-16, authenticated credential
envelopes, durable OAuth/catalog orchestration, service RPC adapter, fenced
worker loop and explicit once/health CLI. Requests are persisted before provider
IO. Ambiguous creates recover the same request/key; duplicate SKUs require
review. Existing same-SKU items require explicit adoption. Whole objects and
versions preserve taxes, modifiers, siblings and stock settings. Persisted
backoff survives restarts; authorization failures pause new writes.

The default-off database authority uses private grookai_square tables for
controls, connections, hashed single-use browser-bound OAuth attempts, exact
targets, immutable operations and worker history. Eligibility reuses existing
owner/vendor/public-copy/printing authority. No canonical inventory is duplicated.

Thin web routes implement owner-verified workspace/selection/configuration,
launch/callback, active locations, adoption and candidate paging.
Account → Connect Square provides explicit batch selection, confirmation,
optional ongoing updates, pause/disconnect and adoption review. The page works
on desktop and phone widths. No native Square connection screen is added yet.

The actual local web environment has only synthetic Square credentials.
Never replace it with real operator keys. Its wrapper clears inherited
production routing; an unwrapped typecheck correctly rejected a mismatched
inherited target. This is an isolation guard, not a reason to weaken it.

## Developer app and real Sandbox transport

The owner explicitly approved: “Yes, accept and create grookai.”
During creation the owner changed the display name to **grookai vault**;
that choice was preserved. The app was created under Grookai Vault LLC,
configured for catalog management and use by Square sellers.

Console app identifier: sq0idp-hb32zbfve4nxqcD1pfMU6g.
Console:
https://developer.squareup.com/console/en/apps/sq0idp-hb32zbfve4nxqcD1pfMU6g/oauth.
Sandbox was explicitly selected. Its distinct Sandbox application ID, existing
application secret and existing Default Test Account token were saved only at
C:/Users/ccabr/.codex/private/square_sandbox_20261110/sandbox.private.env.
No secret values were printed, committed, installed into the web runtime or
sent to chat. The temporary Notepad credential tab was saved and closed.

**OAuth redirect remains unset.** No verified deployed HTTPS callback exists for
this candidate. Registering an invented/dead callback would not prove OAuth.
No production seller authorization was granted. The default test-account token
was used only for transport qualification, never to counterfeit owner linking.

qualify_sandbox_catalog_v1.mjs performs explicit prepare/apply against only
https://connect.squareupsandbox.com, with private persisted request/key before
upsert, strict TLS/system CA and verified merchant/location identity.
Real proof at 2026-11-11 06:53:57 UTC passed:

- SKU: https://grookaivault.com/q/GVVI-065CAB28-001441.
- Sandbox-only item: grookai Sandbox QR Test Aerodactyl; Holo - NM; USD20.00.
- Exactly one matching catalog item after creation and repeating the same request.
- Full managed-field and item/variation readback matched.
- Tracked inventory setting true; zero quantity writes, payments or DB requests.

Private proof:
C:/Users/ccabr/.codex/private/square_sandbox_20261110/catalog-proof-v1/proof.json.
Its request/receipt files remain private. No test item was created in production.
The existing manually tested production “QR Test Aerodactyl” is not adopted or
modified by this Sandbox proof. A second QR scan or real sale was not performed.

## Verification and remaining gates

The final focused Node run passed39 planner/client/service/worker, baseline and
environment guard tests, including merchant discovery. Earlier broader runs also
covered existing collector staging and production guards. Web ESLint passes with
only the task-owned .next-square generated directory excluded. Wrapped typecheck
passes after correcting test configuration types. The optimized Next build also
passes in the isolated synthetic local environment. It emits existing Supabase
dynamic-dependency warnings. This is a build proof, not a hosted production check.

Three browser/API checks exercise real owner Auth, tenant isolation, safe DTOs,
origin/body bounds, actual launch/callback denial/replay and desktop/phone
selection/confirmation. Retained fixture JWTs expired on a later rerun; tests now
obtain fresh real local Auth sessions before each worker. The final rerun passed
all3 tests, including the phone primary-action hit target, before controls paused.

Still required before production release:

1. Finish whole candidate public-schema/security comparison and exact pending
   migration release qualification, fresh full486 replay and normal hosted
   checks. Starting483 proof alone is insufficient.
2. Deploy and verify a gated HTTPS candidate with correct private server
   configuration, then register its exact callback and test actual seller OAuth,
   refresh/revocation, browser replay and existing-item adoption.
3. Review the concrete production package and complete the repository's explicit
   high-risk apply authorization and strict PrePush gates. No production apply,
   source push or deployment is currently authorized by a passing local test.
4. Verify the real connected merchant/location, chosen exact-copy selection and
   adoption of any existing pilot SKU before canary catalog creation. Install a
   worker only after its runtime/observability and pause recovery are qualified.
5. Shared stock allocation and Square sale/refund reconciliation are a later
   separately reviewed phase. Catalog availability is not an overselling guarantee.

## Official references

- https://developer.squareup.com/docs/catalog-api/update-catalog-objects
- https://developer.squareup.com/reference/square/catalog/upsert-catalog-object
- https://developer.squareup.com/reference/square/merchants/list-merchants
- https://developer.squareup.com/docs/oauth-api/overview
