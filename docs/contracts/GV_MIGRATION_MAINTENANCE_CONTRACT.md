# Grookai Vault — Migration Maintenance Contract (v1)

## Jungle integration with the live sales cart — October 3, V34

Current main fe3e4b23f includes PR586 and its completed production migration
20261003100000. The authoritative ipad_sales_cart_20261003/CHECKPOINT.json
records production416, enabled sales cart and TestFlight341. Preserve that
completed release and its648xx labs; do not repeat its migration or activation.
All eight Jungle SQL bodies, pricing worker and publication policy are unchanged.
The combined candidate has424 migrations. The historical415/423 release gates
remain historical evidence and must not authorize this combined release.

JungleSalesCartBaselineAudit is a new read-only416-to424 source/schema audit,
using the exact full416 replay from the cart release and the original eight
hash-pinned Jungle migrations. PrePush, combined scopes and overrides reject.
Fresh424 replay and retained-data upgrade proofs are separate prerequisites.
The external recovery checkpoint records actual outcomes; source integration
alone does not qualify schema application, catalog admission or publication.
Preserve every populated Jungle lab and immutable prior proof. Prices NOT LIVE.


Local V34 qualification passed: full424 CLI reset/no-op push and a separate
416-to424 retained-data CLI upgrade/no-op push converge exactly at
1153 security definitions. All330 existing public-table digests,
two synthetic saved copies and a populated receipt book remain unchanged.
New labs: full424 on53800/53801/internal10.248.25, retained upgrade on
53820/53821/internal10.248.26. The upgrade lab is now POPULATED; never reset
or reseed it. All prior labs remain unchanged.31 focused gate/integration
checks pass. Normal hook/push outcomes are recorded in the external checkpoint.
The424 catalog executor, exact release gate and production application remain
unqualified; this local proof does not publish prices.

## Jungle release qualification V32 — October3

Main b066c1164 (Collectr review workspace, receipt-sale flow and language indexes)
is integrated. PrePush correctly refused the earlier source when this main landed;
V31 commit9960fec and its bundle/proofs remain preserved. The rebased candidate
is fce2dc8e5. Production is415; the exact eight unchanged Jungle SQL files lead
to423. Receipt cloud is already live and must not be replayed.

Separate catalog V3 accepts423 only and fixed isolated53600/10.248.23 rehearsal,
retaining V2 guards unchanged.24 rollback checks preserve all332 public tables,
five synthetic saved copies and a populated receipt book. Actual639-row commit,
observed competing lock wait/safe40001 rejection, zero-insert retry and independent
readback pass.128 identity links remain STAGED; bindings/publication remain empty.
full-423-v31 is now POPULATED; never reset or reseed it. The large populated V30
lab53400 remains untouched at423 with164804 snapshots.

Refresh V2 uses a fresh415 production capture. Original83 parents/84 children,
151 species and84 FK definitions are unchanged. All historical dependency bytes
remain intact. Exactly252 new rows in each of three pricing tables are bound to
the verified October2/3 runs. Exactly272 rows in each of two reference tables are
hash-pinned, linked and non-publishing; no missing acquisition-run provenance is
invented.42 hostile-evidence checks pass. Source review V2 validates128/128 quotes
against actual October3 source244bc6f7-bb9f-4b6d-a154-246393c61b8e. The previous
208279-decision durable worker proof remains historical October2 evidence; worker,
publication policy, physical manifest and eight SQL bodies are unchanged.

JungleReleaseV32 accepts only AuditLinkedSchema/PrePush with the exact eight IDs;
PrePush requires clean committed current-main source, its normal hook receipt,
qualified source/proof hashes, fresh live415 schema, and actual423 schema/readback
of both preserved labs. It never applies SQL. prepare_jungle_cli_v32 supports only
prepare/dry-run, always read-only, with include-all for the tested backdated IDs.
V4 review packages the exact pending files,639 staged rows and128 reviewed bindings.
The external recovery checkpoint records actual hook/PrePush/dry-run outcomes.

Production catalog mutation still requires a fresh actual423 plan, exact bounded
authority and same-plan production rollback. Binding activation, governed pricing
publication and deployed client readback remain separate. Existing-copy correction
stays later opt-in; slab OFF. No production write or Jungle price publication yet.


## Jungle receipt baseline V10 (2026-10-03)

JungleReceiptBaselineAudit permits AuditLinkedSchema only for fixed production415,
the qualified PR582 full415 replay and exactly eight unchanged pending Jungle
files to423. PrePush, combined modes and custom targets/IDs reject before SQL.
It does not extend old414 audit or apply authority. Fresh423 CLI replay/no-op push
and populated422-to423 CLI upgrade converge with1,147 security objects, preserving
all330 old public-table digests/five copies/164,804 price snapshots. Do not reset
the populated V30 lab or reapply the independently completed receipt migration.
A423-specific production apply gate remains separate qualification work.

## In-person sales cart qualification (2026-10-03)

SalesCartBaselineV1 is read-only audit against the qualified415 schema/security.
SalesCartReleaseV1 admits only AuditLinkedSchema/PrePush with20261003100000.
It rejects target overrides/combined scopes, preserves duplicate timestamp/object
checks, and freshly compares production415 to the governed replay. PrePush binds
clean source containing main, normal hooks, dedicated full416 reset/no-op push,
retained415→416 upgrade, real Auth/RPC/concurrency/rollback proof, iPad native Auth
and website receipt-reopening proof. Every tested source hash must still match.
Both controls must be OFF in retained labs at release inspection. The prepared
CLI package/dry-run cannot apply. Authorized production application needs a fresh
consumed intent and independent schema/ledger/security readback. Never reset
populated task or shared labs, or import the separate checkout candidate.


## Account receipt cloud qualification (2026-10-02)

ReceiptCloudV1 admits only AuditLinkedSchema/PrePush and migration20261002220000
over the exact414 baseline. It rejects combined modes/target overrides, checks
timestamp/object duplication and compares current production schema/security
read-only against qualified414. PrePush additionally binds clean committed main,
normal hooks, V3 full415 reset/no-op push, retained414-to415 upgrade, and actual
Auth/Next/SDK/cross-device/conflict/retry/capacity proof. Controls remain OFF, private books
remain owner-only, and no canonical/inventory/payment rows are changed.
prepare_receipt_cloud_v1.mjs only prepares a source-bound CLI inspection package
and dry-run. Actual application requires a fresh consumed intent and independent
ledger/schema/privilege/data-boundary readback. Never reset populated V1/V2/V3 labs.

## Jungle422 local replay qualification (2026-10-02)

V25 fresh full422 CLI start/reset/no-op push passes and converges exactly with
the preserved retained421-to422 upgrade (public schema and1,141 security objects).
Fresh runtime inspection preserves all329 existing table digests and two copies.
V24's Windows-reserved port rejected before fixture creation; V25 is a separate
one-use project at53200/internal10.248.19.0/24. Preserve every consumed intent.
Read-only production414 baseline remains matched with exactly eight pending
files. These local proofs do not expand PrePush or authorize production apply.
Real Auth/HTTP/concurrency and bounded release authority remain required.

## Jungle slab baseline audit V9 (2026-10-01)

JungleSlabBaselineAudit allows AuditLinkedSchema only against fixed production414
and the qualified PR572 replay. Exactly eight pending files/422 unique versions
are allowed; every pending body is pinned to V23 immutable source evidence.
All414 applied files must match the replay freeze. PrePush, custom target/deps,
custom expected IDs and mixed scopes reject before connection. Historical V8
remains seven-file scoped and must reject422. This read-only mode is not apply
authority. Retained421-to422 CLI/no-op push and exact schema boundary pass with
the original414 saved fixture unchanged. Fresh full422 replay/parity still needs
the local10GiB capacity prerequisite; no empty-lab reset intent was consumed.

## Jungle slab candidate422 (2026-10-01)

The additive20261002010000 atomic slab migration is the eighth pending file over
live414. Read-only seven-file baseline passed before drafting it. Historical
JungleEditionSearchBaselineAudit intentionally rejects the new scope; no422
PrePush/apply gate is qualified. Keep earlier421 CLI receipts and all seven SQL
bodies unchanged. Rollback-only DDL tests on retained419 do not qualify a full422
replay, retained upgrade or deployment. A new bounded audit/release scope and
fresh CLI proof are required before production application.

## Jungle integration over live414 (2026-10-01)

JungleEditionSearchBaselineAudit is strictly READ ONLY AuditLinkedSchema against
the hash-qualified414 PR572 replay and fresh production metadata. Exactly seven
Jungle files may be pending, through20261001224000. Duplicate versions reject.
PrePush and combined flags reject before inspection. This does not claim a live
retained-runtime inspection or authorize applying a421 candidate. Renumbered
unapplied artifact-date SQL20261001211000 preserves its original body; applied
20261001210000 belongs to search V5. Prior419 fixtures/ledgers stay untouched.
New v19 full421/retained414-to421 CLI proof is still required; Docker API timeout
must not be bypassed by relabeling old receipts or editing migration history.

## Bounded name search qualification (2026-10-01)

SearchNamePlanV1 permits AuditLinkedSchema/PrePush for only 20261001210000
against the qualified413 baseline. The already-applied413 pricing migration is
recovered byte-exact from its full replay, not reapplied. Initial audit may omit
the pending ID. Duplicate checks, target/combined-mode rejection, pinned schema
and security comparison, clean committed source, normal hooks, fresh full414
replay/no-op push and retained-copy413-to414 upgrade remain required. Real
Auth/HTTP tests compare V4/V5 full fields and order across roles and scopes.
The only new SQL object is the bounded V5 read function; V4 is unchanged.
Use prepare_search_name_plan_v1.mjs for the sole-pending CLI inspection package.
Application needs a fresh intent, CLI apply and independent schema/data readback.
Never reset populated labs or replay consumed intents.
## Jungle actual-source baseline (2026-10-01)

JungleEditionSourceBaselineAudit permits only AuditLinkedSchema and compares live
413 against the retained qualified413 replay. Exactly foundation,reader integration,
current-artifact date,artifact-date lineage,scoped lineage andresolved readiness
may be pending. PrePush/combined flags reject. The old alias and412/411 modes keep
their prior scope. The complete local sequence through419 and populated415-to419
upgrades converge; prior bytes/rows are preserved. This is not a production apply
gate. Read the current Jungle operator note before using any retained fixture.

## Jungle edition baseline (2026-10-01)

Current V17: production413 independently includes20261001190000 reviewed mapping
price quarantine. Preserve that exact applied file. New20261001203000 combines
both overlapping price-reader protections and the exact #64 source-name alias.
Full415 replay and retained413-to415 upgrade converge with unchanged fixture rows.
JungleEditionAliasBaselineAudit compares the qualified mapping-pricing413 replay
to production, allowing only the two pending Jungle files. AuditLinkedSchema only;
PrePush/mixed switches reject. Older baseline routes reject newer production.
No production apply gate exists yet for415; normal release qualification remains.

V16 now integrates main bc4b80629 and qualifies combined413 full replay plus
retained412-to413 upgrade with zero schema/security diff and unchanged copies.
The pending Jungle file and the applied search migration are unchanged. The
backdated pending Jungle timestamp is tested with isolated CLI include-all;
it is never manually inserted into the registry. Production remains412.

JungleEditionBaseline412Audit permits only fixed read-only AuditLinkedSchema,
comparing all412 applied source hashes and schema/security against the retained
qualified search412 replay. Duplicate timestamp/object checks remain. Only the
Jungle candidate is permitted beyond that baseline. PrePush, target overrides
and combined scopes fail closed. The separate old411 audit remains unchanged
and rejects the newer state. Both modes have zero production apply authority.
See the V16 operator section for frozen source, new labs and runtime proofs.

Production advanced independently to412 on October1 through PR568 and migration
20261001150000_search_database_latency_v1. Jungle's new tables are still absent.
The reviewed canonical preparation uses a fresh read-only412 snapshot. The source
now includes the newer search release and combined413 local qualification;
production deployment still needs the release gate. The fixed411 baseline route
must reject this drift. No catalog manifest validation grants schema apply rights.

Historical V15 qualifies the source-selector paging fix at642xx/643xx in internal
networks10.248.0.0/24 and10.248.1.0/24. SHA256
`8f999fe06e70c73e45c27ea573213e4a6c0bce4e6210ffe69696edb77e330c93`
is pinned by baseline-411-1790868839327. Full replay and retained-copy upgrade
PASS, preserving all18,817 V14 metadata rows except the private candidate view
body. Production read-only full-source parity passes with empty edition relations;
this is not schema apply or populated publication authority. Preserve the V14
query timeout, V15 pre-fixture subnet rejection, and every earlier lab/intention.

Historical V14 publication integration was qualified in fresh V14 full/upgrade labs
at640xx/641xx, networks10.249.77.0/24 and10.249.89.0/24. Migration SHA256
`a5084781b0fb9f921685f7a6ac87db10b416532bfc494b829c3b0dddc7e0a473` is pinned by
read-only baseline-411-1790865616947. Replay and retained-copy upgrade PASS.
The explicit schema boundary preserves18,730 prior metadata rows, accounting
only for the reviewed current-price predicates, snapshot lane constraint changes
and new edition column entries. No historical migration changed. V13's snapshot
lineage alias failure is retained with diagnostics; V14 corrects the alias.
Never reset retained fixtures or replay consumed intents. This local qualification
does not authorize production apply. Schema precedes V1_10 worker/client release.

Historical qualification below describes earlier bytes, not the current candidate.
The immutable assignment extension uses fresh V12 full/upgrade fixtures at
636xx/637xx, internal networks10.249.29.0/24 and10.249.41.0/24. The prior V10
bytes no longer qualify the candidate. V11 full replay passed but assignment
proof caught missing raw-payload binding; retain that rolled-back attempt and
populated foundation. V12 adds only a private assignment ledger, two readers,
two functions and supporting metadata. All18,676 prior V10 metadata rows are
unchanged. See the Jungle operator note for final replay/upgrade/test receipts.
Assignment preparation is not publication or production apply authority.

The search/server-completion extension now qualifies412 in V10 fresh632xx/633xx
fixtures with100 SQL/role and24 real HTTP checks. Two read-only security-invoker
discovery views are additive; six further reader overloads change only reviewed
discovery predicates. Existing security metadata and all other reader bodies are
preserved. V6 no longer qualifies the current migration bytes. Retain V7/V8
failed rehearsal intents and V9 superseded replay/upgrade unchanged. See the
Jungle operator note for exact hashes, failure history and deployment order.

The set-discovery extension qualifies revised412 bytes in V6 fresh624xx/625xx
fixtures, with79 SQL/role and12 real HTTP checks. V4 and the superseded V5 full
replay remain historical evidence and must not be reset. Only the two public
set-count reader definitions change; existing direct/owned readers and security
metadata remain intact. See the Jungle operator note for current hashes and
remaining discovery callers. This local proof grants no production apply authority.

`JungleEditionBaselineAudit` permits only the fixed read-only AuditLinkedSchema
comparison in the isolated Jungle worktree. It verifies all411 applied migration
hashes against the retained qualified Cosmos411 replay, fresh production ledger
and schema/security parity, and unchanged duplicate timestamp/object checks.
It permits only the candidate `20261001050000_jungle_edition_foundation_v1.sql`
in addition to that baseline. PrePush, combined modes and overrides are rejected.
No production apply authority is granted. Separate one-use full412 replay and
retained411-to412 upgrade fixtures qualify the candidate locally; revisionV2
uses fresh fixtures rather than rewriting historicalV1 migration copies or
replaying populated labs. See `JUNGLE_EDITION_PRICING_V1.md` and the external
worker recovery checkpoint for the current source hashes and qualification.
The consumer extension still uses this unapplied sole-pending migration; V4
fresh620xx/621xx qualification supersedes V1/V2/V3 bytes. It adds a public bounded
catalog resolver and intake guards without altering existing read definitions.
Retain every populated earlier lab and consumed reset intent as history.

## Search database latency qualification (2026-10-01)

`SearchDatabaseLatencyV1` accepts AuditLinkedSchema/PrePush for exactly
20261001150000 over411. The initial baseline audit may omit the pending ID.
Duplicate timestamp/object checks remain mandatory. PrePush binds the V2 full412
replay/no-op push, retained411-to412 upgrade, real Auth/HTTP visibility and query
plan proof, fresh production411 schema/security parity, and successful normal
hooks on clean committed source containing main. All preexisting set fields and
copy rows must be unchanged; the new generated case-folded key must equal
lower(code). There is no policy relaxation or canonical data repair. The private
CLI prepare/dry-run helper admits only the exact pending migration. Neither gate
nor inspection helper applies changes; authorized application needs fresh intent
and independent schema, data-boundary and permissions readback.

## Cosmos pricing qualification (2026-09-30)

`CosmosPricingReleaseV1` accepts only AuditLinkedSchema/PrePush with exactly
`20260930233000`. It preserves timestamp/object duplicate checks, rejects combined
modes and target overrides, binds a fresh read-only production410 schema/security
comparison to the qualified replay, and verifies isolated full411 reset/no-op push
and retained-data410-to-411 upgrade. Existing populated labs are never reset.
PrePush also requires clean committed source containing main and a fresh normal
hook receipt. The gate performs no production writes or migration application.
Use an exact sole-pending Supabase CLI package and independent schema/ledger,
permissions, publication-pointer and data-boundary readback for the subsequent
authorized apply. The prepared ad hoc registry-writing helper is not that path.

## Collectr review-qualified inspection (2026-09-30)

The revised unapplied migration 20260930010000 is qualified against fresh review
labs. Release inspection now binds the exact 410 migration hashes, full replay,
retained 409-to-410 upgrade, real Auth/HTTP/RLS proof, export-sized rollback proof,
physical V16/V17, archived-copy readback, and the signed build 336 source/IPA.
Old 335 and its original CLI package remain superseded and must not be reused.

Use CollectrImportFidelityReleaseV1 only with AuditLinkedSchema or PrePush and
-ExpectedLocalOnlyIds 20260930010000. The populated review labs are inspected
read-only, never reset. Production 409 schema/security is freshly compared using
the unchanged pinned engine. PrePush also requires clean source containing main
and a fresh successful normal hook receipt. All tested source hashes are exact.

scripts/release/prepare_collectr_import_v1.mjs prepares a fresh one-use private
inspection package under collectr_import_release_20260930. Its dry-run requires
fresh PrePush evidence, unchanged source/tree/tool hashes, the exact sole pending
filename, and unchanged production schema/ledger with read-only DB defaults.
Neither inspection tool applies migrations, deploys Edge, or distributes builds.
Physical/runtime and signed-build evidence remains in collectr_import_review_20260930.
Production release outcomes and any apply authority must be recorded separately.

## Existing seller adoption baseline (2026-09-28)

`VendorSellerAdoptionReleaseV1` adds read-only AuditLinkedSchema/PrePush for exactly
`20260928213000`. It rejects combined modes and target overrides, preserves
duplicate checks, verifies the full409 replay and five retained seller states,
compares the current isolated schema/security to qualified409, and refreshes the
production408 baseline. PrePush additionally requires clean committed source
containing origin/main and matching clean-source real Auth/Next/webhook and normal
shipcheck receipts. It neither resets labs nor applies a migration. The separate
baseline-only switch below still rejects PrePush.

`VendorSellerAdoptionBaselineAudit` permits only fixed read-only AuditLinkedSchema
in the seller-link worktree against the current408 source hashes and qualified
full408 replay. It uses the existing schema/security comparator and three-table
column-order reconciliation. PrePush, combined modes and overrides are denied.
Re-auditing may retain only the exact pending candidate
`20260928213000_vendor_seller_adoption_v1.sql`; it is excluded from the unchanged
408 baseline comparison. Any other pending file or baseline hash change fails.
No new production migration or payload authority is granted by this baseline.
Supplementary PostgreSQL16 subset tests do not replace Supabase17 full replay.

## Native import exact-pending inspection (2026-09-28)

`NativeImportRecoveryReleaseV1` accepts AuditLinkedSchema and PrePush only with
the exact pair `20260926230000,20260928020000`. It preserves duplicate checks,
rejects combined modes and overrides, and binds the unchanged 408-file replay,
both retained-data upgrades, actual endpoint/Android proof, fresh read-only
production406 schema/security comparison and paused catalog checkpoint. PrePush
also requires a clean committed tree and a fresh successful normal commit hook.
It neither resets fixtures nor applies a migration. The baseline-only switch
continues to reject PrePush.

`scripts/release/prepare_native_import_v1.mjs` accepts only prepare and dry-run.
Its fixed private CLI package is linked to the existing canonical project; the
dry run requires fresh PrePush evidence, exact source/tool/tree hashes and fresh
before/after remote schema/ledger parity. `--include-all` is required because the
atomic migration predates already-applied store migrations; only the exact two
SQL filenames may appear. PostgreSQL defaults to read-only for this inspection.
There is deliberately no apply operation. Production application, Edge release,
native distribution and iOS/device qualification remain separate gates. Private
receipts live in `native_import_predeploy_20260928` under operator artifacts.

## Native import recovery baseline (2026-09-27)

`NativeImportRecoveryBaselineAudit` permits fixed read-only AuditLinkedSchema
against production406 and the preserved294xx406 replay. It accepts no pending
version or only the unchanged20260926230000 atomic import migration. It retains
duplicate timestamp/object scanning and the pinned schema/security comparison,
with the existing governed column-order reconciliation. PrePush, combined modes
and target overrides are rejected. This grants no apply or reset authority.
Fresh407 replay and data-retaining406→407 upgrade are separate local proof;
all older populated fixtures and consumed intents must be preserved.
The same read-only gate additionally accepts the exact pair20260926230000 and
20260928020000 for the import receipt follow-up. The second migration is bound to
its private source intent, with a separate408 replay and407-to-408 upgrade.
Receipt-only, extra migrations, PrePush and apply remain rejected. This extension
adds no release authority and preserves the historical407 fixtures.

## Store manager workflows baseline (2026-09-27)

VendorStoreTeamWorkflowsBaselineAudit permits only fixed, read-only
AuditLinkedSchema at404 against the dedicated294xx replay. It rejects combined
modes, target overrides and apply. Existing manager rollout remains unchanged.
This baseline grants no migration/application authority; fresh workflow replay,
authorization tests and an exact-pending release gate are separately required.

## Store team review hardening (2026-09-27)

Production403 is applied with team disabled and retained-data/schema proof.
`VendorStoreTeamHardeningV1` permits only20260927070000 over that403 baseline,
with unchanged duplicate checks, fresh403 audit, dedicated404 upgrade/full replay,
direct-role/HTTP regressions and normal hooks. Only the new team copy function,
manager upload INSERT policy and new upload-budget function change. No owner
policy, catalog data or payment control changes. Never rewrite/replay applied403.
Gates remain private; the separate one-use hardening CLI package/readback requires
team disabled and zero real memberships/invitations before activation.

## Store team baseline (2026-09-27)

`VendorStoreTeamBaselineAudit` permits only the fixed read-only AuditLinkedSchema
comparison of production402 and the preserved290xx baseline. Combined modes,
target overrides and PrePush are rejected. It changes no apply authority.
The separate294xx synthetic lab has403 replay proof, preserving10355 existing
objects and adding73 team objects. Original preparation bytes remain preserved;
final replay uses a new one-use directory. See STORE_TEAM_CHECKPOINT_20260927.md.

`VendorStoreTeamReleaseV1` additionally permits AuditLinkedSchema/PrePush with
only20260927060000. The unchanged duplicate-object scan remains mandatory. It
binds403 replay,11 role/concurrency tests,6 real HTTP/Auth/Storage tests, browser
source hashes, the normal commit-hook receipt, fresh402 production schema and
paused catalog checkpoint. The gate performs no apply. The separate one-use CLI
package allows only this migration, keeps team disabled, preserves other rollout
controls and verifies retained data plus403 schema/security parity afterward.
Release gate receipts are private generated evidence under
`.local/integration/store-team-v1`. The final source uses a fresh V2 apply directory;
the unapplied V1 package is retained, superseded, and cannot authorize V2.

## Production storefront package (2026-09-26)

`-StorefrontProductionTrialsV1` separately permits only `20260926200000` over
the now-applied 401 baseline. It retains the same strict pending-object scan,
read-only pinned schema/security comparison and fixed production target. The
dedicated 402 upgrade changes one entitlement reader and adds 26 invitation
objects; all other objects and existing permissions are retained. Full402 replay,
seven real permission/concurrency/expiry tests, eighteen intake regression checks,
HTTP handler checks and normal shipcheck are required. It never grants access or
creates invitations itself. Production application remains a separate one-use
CLI push with retained-data readback and disabled controls.

`-StorefrontProductionReleaseV1` permits only `20260926190000`, the fixed
`ycdxbpibncqcchqiihfz` target, and AuditLinkedSchema/PrePush. Combined modes,
other IDs and target/output overrides fail before access. The unchanged pending
object scanner runs. The gate compares a fresh read-only production snapshot
with the recovered 400-file baseline, including owner/ACL/RLS/configuration;
only the already-governed three-table column-order reconciliation is permitted.
It verifies the dedicated 290xx full 401-file replay, exact equality with the
tested 419-file development schema, six shared-admission checks, eighteen real
Auth/Storage/HTTP checks and the normal repository shipcheck. It binds source,
payload, current production footprint and the paused catalog checkpoint.
The nineteen unapplied originals remain byte-exact in the package audit archive.
This gate performs no apply. Production application still requires the exact
package through `supabase db push`, disabled rollout controls, fresh binding,
post-apply schema/security/readback proof, and separate web activation.

## Isolated cancellation overlay (2026-09-23)

`VendorBatchCancellationBaselineAudit` is read-only against the new276xx lab,
with exactly17 pending prerequisites and optionally20260923060000. Its full418
replay passes. `PrePush -VendorBatchCancellationPilotApply` accepts only that
one cancellation migration and the fixed hrtbjchobencariqclab bootstrap pilot.
It binds current empty/off local state,418 frozen migrations, application proof,
payload/tool hashes and the complete remote schema footprint. Wrong modes,
targets, combined exceptions and extra IDs fail before access. The one-use apply
changes2 functions and adds14 objects, preserves owner data and existing receipt
rows, and invents no ledger entries. It grants no production apply authority.
See docs/audits/vendor_batch_cancellation_v1/IMPLEMENTATION_20260923.md.

## Isolated batch pilot overlay (2026-09-23)

`PrePush -VendorBatchCommitPilotApply` accepts only IDs `20260923040000,20260923050000`
and the fixed `hrtbjchobencariqclab` bootstrap pilot. The gate binds the frozen 417-file
replay, current empty/off local guard, tested application hashes, exact payload,
tool and remote schema fingerprints. Combined exceptions and arbitrary targets
fail before access. The one-use apply retains profiles, copies, stores and grants,
keeps batch control disabled, and verifies all 28 additions against the local
replay while preserving every previous schema object. No ledger rows are invented.
This is not production application or catalog integration authorization.

## Batch intake development baselines (2026-09-23)

VendorBatchCommitBaselineAudit is read-only and fixed to new260xx, the exact
15 pending prerequisites and optionally 20260923040000. VendorBatchPrivateCopyBaselineAudit
is fixed to new264xx, the exact16 prerequisites and optionally 20260923050000.
Neither accepts PrePush, other IDs, target overrides or combined exceptions.
Both compare the400-row linked baseline with the unchanged inspection/security
engine. Complete416 and417 local resets pass. The first preserves10,248 prior
objects and adds28 intake objects. The correction changes only the finalization
function, preserves its permissions and all10,275 other objects, and leaves earlier
migration bytes intact. Both prepared resets are consumed. The264xx initial start
mistakenly included one pending migration; a hash-bound recovery preserved its
failed log and removed only that copied file before completing the400-file baseline.
No remote apply authority or catalog fingerprint exemption is introduced.
See docs/audits/vendor_batch_commit_v1 and vendor_batch_private_copy_v1.

## Order notifications after catalog recovery (2026-09-22)

AuditLinkedSchema -VendorOrderNotificationsV2BaselineAudit uses only the new240xx
400-row baseline with the exact eleven prior pending storefront IDs. Apply,
arbitrary targets/IDs and combined exceptions fail before remote access. The
fresh read-only comparison passes with895 security objects and no normalized
schema delta. Full412 replay preserves411 source files and10,132 schema objects;
six function definitions change with grants preserved and25 objects are added.
Preparation/reset are consumed. See VENDOR_ORDER_NOTIFICATIONS_V1.md; this grants
no remote application or catalog dependency exemption.

## Storefront recovered catalog baseline (2026-09-21)

AuditLinkedSchema -VendorStoreCatalogBaselineAudit uses only new236xx400-row
baseline and the exact eleven pending storefront IDs through20260920090000.
PrePush, arbitrary IDs/targets, and combined exceptions fail before remote access.
Three already-applied migrations are recovered byte-exact from the ledger, with
408 earlier source files retained. Strict comparison passes with895 security
objects and no normalized schema delta. Full411 reset preserves10,133 objects;
only the two recovered function definitions, three additions, and one replaced
constraint differ. Existing function permissions remain unchanged. Preparation
and full reset are consumed. See VENDOR_STORE_CATALOG_RECOVERY_V1.md; no remote
apply, catalog execution, shared reset, or release authorization is introduced.

## Durable refund baseline (2026-09-20)

AuditLinkedSchema -VendorOrderRefundsBaselineAudit checks only new228xx397-row
baseline read-only, accepting ten prior pending IDs through20260920080000 and
optionally20260920090000. PrePush/arbitrary/combined modes fail before remote
access. Full408 replay retains407 files and10,067 objects, changes two fulfillment
definitions without permission changes, and adds67 refund objects. Prepare/reset
are consumed. No remote apply or catalog fingerprint gate is relaxed.

## Order fulfillment baseline (2026-09-20)

AuditLinkedSchema -VendorOrderFulfillmentBaselineAudit compares only the new224xx
397-row baseline. Exactly nine prior pending IDs through20260919210000, optionally
20260920080000, are accepted. PrePush, arbitrary and combined modes fail before
remote access. Full407 replay retains406 prior files and10,035 objects, adding34
fulfillment objects. No remote apply gate or repair fingerprint rule is relaxed.
Preparation/baseline/full reset are complete; preserve all preceding projects.

## Order retry queue baseline (2026-09-19)

AuditLinkedSchema -VendorOrderRetryBaselineAudit compares the final220xx397-row
baseline read-only with the pinned inspection/security engine. Exactly eight prior
pending IDs through200000, optionally210000, are accepted. PrePush, arbitrary and
combined exceptions fail before remote access. Full406 replay preserves405 prior
files and9,967 objects, adding68 queue objects. The earlier216xx draft is retained
after lock-order review; completed resets must not be rerun. No remote apply gate
is relaxed. Recheck catalog dependency fingerprints before separate integration.

## Unstarted order cancellation baseline (2026-09-19)

AuditLinkedSchema -VendorUnstartedOrderBaselineAudit compares the fixed212xx397-row
baseline read-only. Exactly seven prior pending IDs through180000, optionally
200000, are accepted; arbitrary/combined/PrePush exceptions fail before CLI access.
Inspection/security authority is unchanged. Full405-file replay preserves404 prior
source files and9940 unrelated objects; only two stock constraints and the stock
transition function change, with24 cancellation additions. Completed208xx and
earlier databases remain untouched. No remote apply authorization.

## Order cancellation recovered baseline (2026-09-19)

AuditLinkedSchema -VendorOrderCancellationBaselineAudit compares only the fixed
208xx397-row baseline, including already-applied193000 recovered byte-exact from
the ledger. Exactly seven pending IDs through20260919180000 are allowed. PrePush,
combined exceptions and arbitrary IDs fail before remote access. The inspection
and security engine is unchanged. Full404-file replay preserves all403 prior
source files and permits only the recovered Japanese identity objects to differ
from the prior403-object footprint. No production apply or catalog execution is
authorized. Read VENDOR_ORDER_CANCELLATION_BASELINE_V1.md for exact provenance.

## Private checkout baseline (2026-09-19)

AuditLinkedSchema -VendorCheckoutBaselineAudit compares the new fixed 200xx 396-row
baseline read-only with the unchanged pinned inspection/security engine. Exact
prerequisites are 20260919050000,080000,120000,130000,150000 and170000 (same date),
optionally 20260919180000. Arbitrary IDs, combined exceptions and PrePush fail before
remote access. Full 403-file local reset is separate proof, preserving every prior
object and adding only two private checkout functions. Default gates and duplicate
scanning stay unchanged. Preserve all earlier environments and do not rerun
completed resets. This is not remote apply or catalog integration authorization.

## Private orders baseline (2026-09-19)

AuditLinkedSchema -VendorOrdersBaselineAudit compares only the new fixed 196xx
396-row baseline read-only with the unchanged pinned inspection/security engine.
Exact prerequisites are storefront050000, billing080000, custom120000,
seller130000 and stock150000 on 20260919, optionally order170000. PrePush,
arbitrary IDs and combined exceptions fail before remote access. Default gates
and duplicate scanning remain intact. Full 402-file reset is separate proof;
five exact stock objects change and all others remain preserved. The first
unapplied draft had a SQL quoting error; its bytes/log are retained and the
empty196xx correction is bound to their exact digests. Do not reuse completed
replay/recovery tools. Neither local exception authorizes remote apply or waives
catalog dependencies.
_November 2025_

This document defines how schema changes must be made and validated for Grookai Vault.
The goal is to **never** repeat the migration drift and shadow DB errors we just fixed.

## Migration Drift Guardrail (No-Drift Rule)

- The only source of truth for schema is `supabase/migrations` in git.
- Schema changes never happen directly in Studio or via ad-hoc SQL; they only happen via migrations.
- Before any schema work starts, we must run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`.
- Before any `supabase db push`, we must run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>`.
- `supabase db reset --local` is mandatory proof that the migration chain is replayable.

### No-Drift Checklist (Run Before Any `supabase db push`)

1. `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`
2. `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>`
3. Confirm:
   - No rows where **Remote has a version and Local is blank** (remote-only drift).
   - Local-only rows are exactly the migrations you intend to push.
   - `supabase db reset --local` passed as part of strict preflight.
4. If remote-only drift exists:
   - STOP.
   - Follow `docs/playbooks/REMOTE_SCHEMA_DRIFT_RECOVERY_V1.md`.
5. Only then run: `supabase db push`.

### Forbidden moves

- ❌ No schema edits directly in Supabase Studio.
- ❌ No `ALTER TABLE` / `CREATE TABLE` in random SQL tabs without a migration file.
- ❌ No `db push` without strict preflight passing.
- ❌ No continuing migration work after an emergency remote edit until reconciliation is complete.

## 1. Principles

### Stock reservation baseline (2026-09-19)

`AuditLinkedSchema -VendorStockBaselineAudit` compares the new fixed 192xx
396-migration baseline read-only using the unchanged pinned inspection/security
engine. It accepts exactly the pending storefront, billing, custom-import and
seller-binding IDs, optionally followed by `20260919150000`. PrePush, arbitrary
IDs and combined exceptions fail before CLI access. The full 401-file local reset
is separate proof, with all prior objects preserved and only named stock objects
added. All earlier proof projects remain intact. Neither completed reset helpers
nor this baseline exception authorize remote apply or waive catalog dependencies.

### Seller binding baseline (2026-09-19)

`AuditLinkedSchema -SellerBindingsBaselineAudit` compares the new fixed 188xx
396-migration baseline read-only. It accepts exactly the pending storefront,
billing and custom-import IDs, optionally followed by `20260919130000`. PrePush,
arbitrary IDs and all combined exceptions are rejected before CLI access. The
same pinned inspection/security engine and exact column-order reconciliation
apply; default gates and duplicate scanning are unchanged. The subsequent 400-file
reset is separate local proof. A reproduced first-binding/deauthorization race
required one narrowly bound revision of this new empty development project; its
initial migration, footprint and receipt are retained. All earlier projects remain
untouched. Read `VENDOR_SELLER_BINDINGS_V1.md` and its proof; do not reuse completed
replay commands or treat local proof as remote apply authority.

### Custom-product import baseline (2026-09-19)

`AuditLinkedSchema -CustomImportBaselineAudit` is a read-only comparison against
the new fixed 184xx project. The exact pending set must be storefront `20260919050000`
and billing `20260919080000`, optionally followed by import `20260919120000`.
Other IDs, combined exceptions and PrePush are rejected before remote access.
The 396-row baseline uses the unchanged pinned inspection/security engine and
exact three-table column-order reconciliation. Earlier proof databases are retained.
The subsequent full 399-file local reset and schema footprint are separate proof.
`replay_custom_import_v1.mjs --verify` can finish verification after a proven reset;
it cannot reset anything and requires the exact retained ledger, hashes and log.
Remote PrePush, pending-order and catalog-dependency gates are unchanged.

### Applied catalog index recovery (2026-09-19)

`AuditLinkedSchema -StoreIndexBaselineAudit -ExpectedLocalOnlyIds
20260919050000,20260919080000` compares the fixed empty 180xx baseline with the
396-row production ledger, including recovered applied index `20260919100500`.
It verifies source/copy hashes, pinned image, internal network, empty fixtures,
zero workers and the unchanged schema/security comparison. It rejects PrePush,
other pending IDs and combined exceptions before CLI access. It cannot apply or
reset anything. Read `docs/audits/vendor_storefront_index_reconcile_v1/RECONCILIATION.md`.
The separate one-time 398-file reset proves the complete candidate; 164/168/172/176
proof projects remain intact. Existing remote PrePush and catalog dependency gates
still apply, including explicit handling of the two older pending migrations.

### Vendor billing baseline audit (2026-09-19)

The later billing foundation uses a separate 176xx runtime, leaving the reconciled
172xx proof intact. Its 397-file reset is recorded in
`docs/audits/vendor_stripe_billing_schema_v1/FOUNDATION_PROOF.md`. Postgres
17.6.1.113 is pinned per project because .106 crashes on permission-denial tests.
The runtime's explicit internal `--network-id` is mandatory for both start and
reset. Rollback/idempotence and real concurrent-connection tests pass without
changing client permissions. This local receipt does not waive PrePush, authorize
production apply or replace the baseline/security/catalog-dependency gates below.

`AuditLinkedSchema -VendorBillingBaselineAudit -ExpectedLocalOnlyIds 20260919050000`
compares the separately prepared, empty 172xx project with production using the
same pinned inspection engine and exact column-order reconciliation. The audited
baseline includes the already-applied, byte-bound One Piece migration
`20260919054500`; the source recovered from its repair worktree must match the
production ledger's SQL. No catalog data executor is replayed remotely.

This option is read-only and cannot be combined with other exceptions or used
for PrePush. It permits the storefront prerequisite and, once authored, only the
named billing migration `20260919080000`. It checks exact ledger/source hashes,
configuration, isolated internal network, empty local application data and disabled
workers. Both schema SQL and supplementary security attributes must match. It
neither authorizes a production apply nor waives the unchanged PrePush duplicate
checks. The new project's real baseline reset is recorded separately; the preserved
164xx and 168xx proof databases must not be reset.

The added production ledger row invalidates the old 394-row release preflight as
current evidence. Reconcile the applied migration into repository history and
refresh the release gates before production application. The still-unapplied
storefront ID precedes the new remote head; any later apply plan must explicitly
account for that ordering and verify the exact pending set by dry run.

### Collectr fidelity baseline (2026-09-30 UTC)

`AuditLinkedSchema -CollectrImportFidelityBaselineAudit` is a separately bounded
read-only comparison for the Collectr importer repair. It cannot be combined with
other switches, used for PrePush, or authorize reset/application. It verifies the
qualified seller-review409 replay receipt, all409 source/copy migration hashes,
config hash, internal network, stopped workers, exact local/remote ledgers and
canonical production sanity before comparing schema/security snapshots.

Only the existing exact-definition three-table column-order reconciliation is
permitted. Functions, views, grants, owners, RLS and function settings are compared
without suppression. The ordinary raw-diff failure is retained. September30 proof
has zero remaining schema SQL and1103 matching security objects. The script permits
only the optional new `20260930010000_collectr_import_fidelity_v2.sql` beyond the
409 baseline and records its hash; this does not qualify that migration. Fresh
full replay, retained-data upgrade, integration, normal release checks and a
separate exact-pending PrePush gate remain required before any application.

### Storefront Release Isolated Replay (2026-09-19 UTC)

The unapplied storefront candidate consolidates its three historical migrations
into `20260919050000_vendor_storefront_release_v1.sql`. Their original bytes remain
under `docs/audits/vendor_storefront_release_package_v1/historical_migrations`.
This is valid only while none of those three migration IDs has been applied remotely.

For this sole pending release, both strict phases accept
`-StorefrontReleaseIsolatedReplay -ExpectedLocalOnlyIds 20260919050000`.
Combining exceptions or supplying other pending IDs fails before CLI access.
The duplicate-object scanner is unchanged.

The baseline phase uses the pinned 0.6.1 inspection engine in a repeatable-read,
read-only production transaction through authenticated CLI access. It compares
the complete 394-migration local baseline, including a separate security comparison.
Only the existing exact three-table column-order reconciliation is allowed; no
function/view SQL is suppressed. Generated SQL stays private and is never executed.

The replay phase requires a fresh baseline receipt bound to source and tool hashes.
It resets only `C:/gv_store_release_20260919/.local/integration/release-replay`,
project `grookai-storefront-release-20260919`, database port 16822. The configuration,
release hash, 395 source/copy hashes, internal database network, disabled background
workers, and empty application data are checked before reset. The actual CLI command
includes `--local --no-seed --yes`, the explicit workdir and dedicated network.
Afterward the complete ledger, disabled rollout flags, and exact schema/definition/
ACL/policy footprint against the original 397-migration candidate must match.

This path does not reset the populated 164xx proof environment, weaken the default
gate, authorize production application, or replace catalog dependency coordination.
The hard-bound rehearsal is intentionally not a general-purpose database reset tool.

### Collector Cameo Isolated Replay (2026-09-12)

For the sole pending migration `20260912050000`, the strict gate accepts
`-CollectorCameoIsolatedReplay -ExpectedLocalOnlyIds 20260912050000`.
Other pending IDs and combining reconciliation exceptions are rejected.

In `AuditLinkedSchema`, require explicit `-AuditEnvFile` and a new `-AuditOutDir`.
The collector baseline audit compares all 393 applied migrations and requires
zero remaining SQL or security differences. Its three-table column-order
reconciliation uses the same exact column-definition checks described below;
no function/view SQL is suppressed. Optional `-InspectionDeps` must supply the
already pinned 0.6.1 inspection packages.

In `PrePush`, every existing ledger/pending/object check remains mandatory.
Replay resets only the separately created `collector-cameo-replay-20260912`
project on port 56530, never the existing preview database. The verifier checks
its resolved path, project/config hash, running container/port, empty application
data, exact 394-file inventory, and source/copy hashes before running the real
`supabase db reset --local --yes`. It verifies the complete ledger afterward.
An old success receipt alone cannot satisfy this gate. Default behavior is
unchanged. This option grants no production apply or broader reset authority.

### Scoped Replay Comparison (2026-09-07)

For the sealed-ownership prerequisite only, `AuditLinkedSchema` may use
`-ReconciledReplayAudit -ExpectedLocalOnlyIds 20260905120000,20260907160000`
with an explicit `-AuditEnvFile` and new `-AuditOutDir`. This is a read-only
baseline audit, not permission to apply either migration.

The pinned CLI inspection engine compares production with the isolated replay
database on port 55430. It may reorder inspection metadata for only
`card_prints`, `pricing_jobs`, and `sets`, and only after every named column's
definition matches exactly. It never alters database column order, normalizes
function text, or suppresses view SQL. View output order remains significant.
Owners, table/column/function grants, forced RLS, and function configuration are
checked separately. The only accepted remaining SQL delta is the exact
fingerprint-bound, still-pending image-dimension constraint repair.

Both reconciliation sources, the full replay ledger, and exact pending IDs must
match. Raw and reconciled SQL are retained as diagnostics and never executed.
Unexpected differences fail closed. The default raw-diff audit is unchanged.
`PrePush`, isolated replay, frozen apply authority, and remote readback remain
required. This exception must not be expanded to unrelated migrations or used
to justify dropping/recreating live views or canonical tables.

1. The **live database** (Supabase project) is the current state of the world.
2. The **migrations in this repo** are the story of how to build that world from scratch.
3. These two must always agree: a brand-new database must be able to replay all migrations
   (and any baseline) without errors and end up identical to prod.

## 2. Rule 1 — No schema changes outside migrations

- If it changes the **schema**, it must be represented in a migration file in
  `supabase/migrations/`.
- Do **not**:
  - Create or alter tables directly in the Supabase UI or SQL editor (except for
    short-lived experiments).
- Do:
  - Convert any UI/SQL experiments into proper migrations before relying on them.
  - Treat migrations as the **single source of truth** for schema evolution.

## 3. Rule 2 — Migrations must be idempotent and fresh-DB-safe

Every migration must be safe to run:

- On an already-migrated DB (no duplicate-column / duplicate-index errors).
- On a **fresh DB** where tables might not exist yet (e.g., `supabase db pull` shadow DB).

### 3.1 Guarding ALTERs and new columns

When altering existing tables or adding columns, always:

- Check that the table exists.
- Check that the column doesn’t already exist.

Example pattern:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'my_table'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = 'my_table'
        AND column_name = 'new_col'
    ) THEN
      ALTER TABLE public.my_table
        ADD COLUMN new_col text;
    END IF;
  END IF;
END $$;
```

### 3.2 Guarding COMMENTs on legacy tables

When commenting on legacy tables (e.g. `cards`):

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cards'
  ) THEN
    COMMENT ON TABLE public.cards IS
      'LEGACY TABLE: superseded by card_prints. Do not build new features on this.';
  END IF;
END $$;
```

### 3.3 Guarding FKs to card_prints (no inline refs in CREATE TABLE)

Do **not** reference `public.card_prints` inline in `CREATE TABLE` in a way that will fail
on a fresh DB.

Instead:

```sql
CREATE TABLE public.external_mappings (
  id            bigserial PRIMARY KEY,
  card_print_id uuid NOT NULL,
  ...
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'card_prints'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'external_mappings'
        AND kcu.column_name = 'card_print_id'
    ) THEN
      ALTER TABLE public.external_mappings
        ADD CONSTRAINT external_mappings_card_print_id_fkey
        FOREIGN KEY (card_print_id)
        REFERENCES public.card_prints(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
```

## 4. Rule 3 — The replay trifecta (must pass before schema changes are “done”)

Whenever we add or modify migrations, the **minimum** validation sequence is:

1. Linked audit before any apply:

   ```bash
   pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
   ```

2. Apply to the target DB (remote or local):

   ```bash
   supabase db push
   ```

3. Fresh local DB replay:

   ```bash
   supabase db reset --local
   ```

4. Strict pre-push proof for the exact pending set:

   ```bash
   pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>
   ```

5. Shadow DB + baseline replay:

   ```bash
   supabase db pull
   ```

All three must succeed with no errors. If any step fails, fix migrations **before**
building additional features on top of that schema.

## 5. Rule 4 — No ad-hoc prod schema edits

* Production schema must be the result of migrations + `supabase db push`, not manual edits.
* In an emergency hotfix:

  * Document the exact change.
  * Stop all other migration work.
  * Run `supabase db pull` immediately in a clean reconciliation worktree.
  * Follow `docs/playbooks/REMOTE_SCHEMA_DRIFT_RECOVERY_V1.md` before any additional migration work.

## 6. Rule 5 — Card-print rules are sacred

Because `card_prints` is the canonical identity for all prints:

* `card_prints.id` is **uuid** and must remain so.
* Any table that references a print must use `card_print_id uuid` referencing
  `public.card_prints(id)`.
* No new migrations may introduce `bigint` print IDs or break the unique
  `(set_id, number_plain, variant_key)` identity.
* Any migration that touches `card_prints` must be carefully guarded and tested with
  the replay trifecta.

## 7. Syncing ChatGPT + Repo Rules

* ChatGPT is used as a co-architect and holds these rules in its long-term memory.
* This file is the **authoritative** copy inside the repo.
* **Whenever we change a rule in ChatGPT memory, we must also update this document and commit it.**
* If there is ever a disagreement between ChatGPT’s memory and this file, this file wins.

## 8. Why this matters

Following this contract guarantees:

* No more “relation does not exist” surprises in migrations.
* No more drift between remote schema and migrations.
* The ability to spin up fresh environments easily.
* Confidence that schema changes are intentional, reproducible, and safe.
* `supabase db reset --local` remains a mandatory gate, not an optional confidence check.

## Notification audit stopped on new catalog index (September20)

The new read-only VendorOrderNotificationsBaselineAudit uses isolated232xx and
exact eleven prior pending IDs, optionally20260920110000. It rejects apply and
combined/arbitrary modes. Its first strict audit FAILED on the printing-reference
index; no notification migration was authored or applied. Source remains408files.
Preparation is consumed; preserve232xx and all preceding projects. Fresh readback
now proves20260920095000 recorded/valid after the catalog build recovered. Exact
applied-ledger source recovery precedes further schema work; no index reapply.
# Store team workflow release boundary (September 27, 2026)

`-VendorStoreTeamWorkflowsV1` is restricted to AuditLinkedSchema and PrePush,
the fixed production project, and exact pending IDs 20260927143000 and
20260927160000. Combined modes and target overrides are rejected. Sequential
replacement functions are validated within each immutable migration, then by
the complete upgrade/replay schema and security comparison. No generated diff
is an apply payload. Production writes use only the fixed CLI migration package;
readback must preserve owner data, grants and payment controls. Rollback disables
the workflow flag and retains metadata. Dormant grants may be retained or
explicitly removed, but cannot be newly granted while disabled.
