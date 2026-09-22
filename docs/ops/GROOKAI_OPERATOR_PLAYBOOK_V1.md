# Grookai Operator Playbook V1

## Combined Search — September 22

Follow `docs/checkpoints/combined_search_20260922.md` for the isolated implementation
and requirement-by-requirement verification ledger. Source is current main plus
the shared parser/resolver and web/native presentation changes; preserve the
separate Vendor Mode candidate. Normal searches remain deterministic and read-only.
Use the existing local audit sandbox for synthetic fixtures, never a development
server connected to production. Complete local cross-platform proof before the
separate deployment review. The checkpoint records completed local acceptance and separate release checks.
Use `docs/release/COMBINED_SEARCH_RELEASE_REVIEW_20260922.md` for the frozen-candidate
gate ledger, web-before-native rollout, association compatibility, and rollback checks.

## Pokemon Artist Search - September 20

Artist search uses the shared web resolver, including native Pokemon search.
Known full names and surnames are resolved through the checked-in
`apps/web/src/lib/search/pokemonArtistNames.json`, then cards are read with the
ordinary public/session client and existing visibility checks. Do not replace
this with unrestricted admin reads or a broad artist ILIKE scan: the latter
hits the public statement timeout. Refresh the name snapshot with
`node scripts/generate_pokemon_artist_names.mjs` in the verified canonical
environment after artist metadata changes. It is a read-only database operation;
review and commit the generated snapshot. New artists can use the explicit
artist filter with exact stored spelling until the snapshot is refreshed.
See `docs/checkpoints/artist_search_20260920.md` for source and release evidence.
Keep current exact-GV-ID, bounded-set, nickname, and other-game search paths.

Artist completeness follow-up: see `docs/checkpoints/artist_pagination_20260920.md`.
Artist requests opt into server paging with `pagination=1`, `offset`, and `limit`;
the response includes `pagination.total_count`, `next_offset`, and `has_more`.
Filters and ordering precede pagination. Clients without the opt-in receive the
complete matching artist result, because the installed mobile app's Show more
only reveals downloaded rows. Do not restore a silent artist result cap. Verify
all Yuka Morii IDs and an artist exceeding 1,000 records, not just the first page.

## One Piece Incremental Printing Admission

Use the V2 writer registry key `one_piece_incremental_printing_promotion_v2`.
Every admitted parent must carry source-backed exact children and truth reviews
in the same transaction. Read `ONE_PIECE_INCREMENTAL_PRINTING_PREVENTION_20260919.md`.
Plan mode is read-only; unresolved evidence yields holds, not guessed finishes.
Founder packages bind child/review counts and producer version. Preserve existing
V1 package semantics, verified TLS, frozen source bytes and unknown-commit receipts.
After release, verify the actual GitHub plan run and its artifacts. Local tests
alone do not establish deployed prevention. Do not replay already applied data
or the recorded One Piece Foil registry migration.

## Prismatic Evidence Refresh - September 19

Read `PRISMATIC_MASTER_CORROBORATION_20260919.md`. Normalize accents only in
finish labels; preserve original card names and raw source bytes. Qualified or
combined Pokeball/Masterball products cannot prove an unqualified parallel.
The 162 corroborated facts are a master-evidence change, not a database repair.
Five unmatched names remain unresolved, and duplicate copies of a source never
count as independent confirmation. Do not overwrite newer main evidence from an
older worktree snapshot. Production applies still require source-bound manifests,
fresh collision/dependency preflight, rollback proof and independent readback.

## Master Index Evidence Scope

Read `MASTER_INDEX_SOURCE_INDEPENDENCE_20260917.md`. TCGplayer catalog mirrors
and its preserved PokemonTCG price-guide path count as one authority, not separate
confirmation. Keep ordinary PokemonTCG API identity data separate. Prize Pack
Normal/Holo/Cosmos evidence requires exact stamped-variant parent binding and is
review-only in the unqualified index. Preserve records and references; do not
mint base children, relabel finishes or replay historical applies to clear flags.
Source-outage baseline copies must retain the new scope-review status. A successful
data-only refresh does not authorize database mutation or collector readiness.

## Legacy Set SQL Tools

Read `LEGACY_SET_SQL_REVIEW_CHECKPOINT_20260917.md`. Both
`backend/tools/set_repair_runner.mjs` and `backend/tools/tcgdex_canonize_set.mjs`
require `--set <exact-code> --dry-run`. Apply, implicit modes and all-auto-safe
are retired. Review uses the shared backend client and GET-only reads, not the
historical PostgreSQL pool. Configure the canonical backend environment and
verify its identity before using production reads; do not print credentials.
Limit defaults to 50 and caps at 500 per evidence collection, with explicit
lookahead/truncation and a 15-second per-request deadline. At most seven reads
are made. Exact set lookup is limited to two returned candidates plus lookahead.
Source flags, observed children and existing mappings remain unreviewed evidence.
No checkpoint or other database row is written. Results are not an apply snapshot;
use a reviewed Master Index plan and separate frozen executor for writes.

## Pokemon Legacy Admission

Read `POKEMON_LEGACY_ADMISSION_CHECKPOINT_20260917.md` before any PokemonAPI or
TCGdex legacy worker. Enrichment, mapping backfill and TCGdex normalization now
require `--dry-run`, default to 50 raw rows and allow at most 500. TCGdex's limit
covers sets and cards together, sets first; use `--kind=card` for card-only review.
No raw statuses, mappings, traits, sets or printings are written. Source finish
flags and existing matches remain review evidence. The older PokemonAPI normalizer
has no safe dry-run and rejects all execution. The remote import wrapper and
new-set `--apply` reject before staging/acquisition. Discovery-only source intake
is not a replacement for a governed Master Index apply. Runtime deployment and
fresh reviewed write paths remain separate work; never replay old command blocks.

The standard npm aliases `tcgdex:normalize`, `pokemon:enrich` and
`pokemon:backfill-mappings` supply dry-run and default to 50 selected rows. Append
`-- --limit=25` to narrow a review. The existing backfill `:dry` alias explicitly
selects at most 200; use the base alias to choose another limit. Appending apply
never restores legacy writes.

## Source-Backed JustTCG And Historical Batches

Read `SOURCE_BACKED_MAPPING_REVIEW_CHECKPOINT_20260917.md`. The legacy source-backed
CLI is review-only, defaults to 50 selected rows and caps explicit batches at 500.
Input identity differences and conflicting mapping history are review conflicts,
not permission to reassign a source ID. Ten old Prize Pack batches reject replay
before database/file setup; preserve their embedded approvals and output as history.
Use a fresh reviewed Master Index plan and applicable transactional executor for
future stamped mappings. The base TCGPlayer executor does not authorize this lane.

## Legacy JustTCG Discovery

Read `JUSTTCG_MAPPING_REVIEW_CHECKPOINT_20260917.md`. The TCGPlayer bridge,
TCGdex bridge and direct-structure JustTCG scripts are review-only. Apply is
retired, including through the maintenance launcher. Preserve JSON row output
and review source/Master Index evidence before using a governed mapping writer.
The default 50-card selection limit does not bound all database metadata reads.
Do not confuse these local safeguards with deployed runtime enforcement.

## Master Mapping Evidence Packages

Read `MASTER_MAPPING_AUTHORITY_CHECKPOINT_20260917.md` and
`docs/contracts/MASTER_INDEX_MAPPING_AUTHORITY_V1.md`. Use the offline packaging
command with exact selected candidates and already-reviewed manifests/source
bytes. It cannot approve a candidate and must not invent review evidence.
Missing authority blocks the mapping writer even in dry-run mode. The local
candidate is not released; frozen local apply/readback is complete and linked
in the checkpoint. Release checks and remote read-only TLS verification remain.
A lost commit response requires
independent readback, never automatic retry. Do not substitute this writer for
the separately frozen printing repair executor.

## Legacy TCGdex Mapping Discovery

Read `TCGDEX_MAPPING_REVIEW_CHECKPOINT_20260917.md`. Do not run the historical
bridge with `--apply`: direct promotion based on price-bucket agreement is retired.
The repaired CLI writes local immutable review artifacts only, defaults to 50
cards, and supports `--limit=1..500 --output=<new-directory>`. Existing matching
mappings still require evidence review. Complete source/Master Index adjudication
before generating a fresh exact-mapping plan. No automatic finish inference,
mapping reassignment or production authority is granted by a discovery report.

## Exact Mapping Plan Identity

Read `EXACT_MAPPING_IDENTITY_CHECKPOINT_20260917.md` before preparing another
TCGPlayer exact-mapping batch. Plan policy V1.2 preserves trailing source labels
and rejects older plans at apply admission. Regenerate with fresh read-only
source/target evidence; never change a historical plan's version or fingerprint
to pass the new gate. The live writer also checks set UUID/code against the frozen
target. Label differences require source adjudication, not automatic remapping.
These safeguards do not adjudicate Pokemon GO aliases or close legacy bridge
writers. Deployment and all-active-writer verification remain separate work.

## Warehouse Printing Evidence Handoff

Read `WAREHOUSE_PRINTING_AUTHORITY_CHECKPOINT_20260917.md` and
`docs/contracts/WAREHOUSE_PRINTING_AUTHORITY_V1.md`. The JSON authority package
preserves actual source bytes, exact candidate/printing identity and the existing
reviewed Master Index projection. It is evidence, not execution approval. The
local runtime now validates staging and execution, inserts raw evidence before
the child/review, and checks exact readback. Use an explicit authority JSON file
with the exact candidate ID; legacy queues must not be given invented evidence.
The complete claim/event wrapper and concurrency checks passed locally. PR #479
release verification remains pending. Review found a cross-parent negative-fact
gap; the candidate now queries all forbidden/suppressed tuples at every admission
and readback gate. Never limit negative-fact checks to the target card's siblings.
The isolated rehearsal database is `grookai_warehouse_printing_20260917_v1` on
localhost:54330. Preserve it and the original McDonald's rehearsal database.
An uncertain commit/rollback returns `reconciliation_required`; never retry it
blindly or mark a later self-consistent snapshot as the frozen baseline.
Read-only run `35193527355` is terminal; its source-access repair passed live,
while catalog publication remains blocked by reported gaps. Preserve that result
rather than restarting discovery to seek a green workflow.

## Master Printing Executor Rehearsal

Read `docs/ops/MASTER_PRINTING_EXECUTOR_CHECKPOINT_20260917.md` before the
McDonald's repair. The full local PostgreSQL rehearsal includes raw evidence,
reviews, public RPC, real collision rollback, independent readback and zero-write
repeat execution. Local plan fingerprints are not production authority. Preserve
existing databases; do not reset a shared local backend to repeat this proof.
The read-only production runner is `scripts/audits/master_index_printing_execution_v1.mjs`.
Read `docs/contracts/MASTER_PRINTING_EXECUTION_V1.md` for target/TLS checks,
immutable input hashes, explicit write authority and rollback receipt rules.
Use the existing Linux execution host and its verified pooler environment;
connection paths are in private operator receipts, never copy credentials into
the repo. HTTP source outages and actual printing mismatches are distinct alerts.
Exact-state readback and zero-write replay must still match the frozen dependency
footprints. Investigate later ownership/mapping drift; do not silently rebaseline
it. The PR #476 review repair changes the producer fingerprint, so its prior
pending approval request and frozen producer are not valid for the repaired code.

## Catalog Source Access Denials

Read `docs/ops/CATALOG_SOURCE_ACCESS_CHECKPOINT_20260917.md` for HTTP 401/403
handling in catalog discovery. Source access denial is reported separately from
bad evidence and database errors. Do not bypass a denied endpoint, infer missing
cards from the outage, or turn a denied source into an approved candidate fallback.

## Printing-Complete Ingestion - September 17

Current checkpoint: `MASTER_INDEX_TOP_DOWN_REPAIR_CHECKPOINT_20260917.md`.
Use `docs/playbooks/MASTER_INDEX_FIRST_INGESTION_V1.md` for the source-to-index-to-
database order. Source bytes and a projection-bound review are required before
collector plans. The Pokemon selection fix now has read-only live SQL proof,
but remains local and must not be described as a deployed scheduled protection.
The next follow-up has a full passing local shipcheck and a bounded McDonald's
candidate with dependency inventory and temporary-table rollback proof. Preserve
the distinction between that simulation and an authorized production executor.

The read-only retrospective is in `RETROSPECTIVE_PRINTING_AUDIT_20260917.md`.
It identifies missing children/GV-IDs and the default-public Pokemon selection
gap repaired by the current local candidate. Read it before deployment or repair;
structural gaps and historical master discrepancies are not blanket write authority.

Read `docs/contracts/INGESTION_PRINTING_COMPLETENESS_V1.md` and
`INGESTION_PRINTING_GATE_CHECKPOINT_20260917.md`. Parent-only intake is not a
collector-ready release, even for a single-finish set. Prepare reviewed printing
manifests before writes, preserve unresolved product variants, and verify exact
child GV-IDs plus public options. The offline planner and read-only scheduled
coverage audit do not authorize canonical mutation. The existing 161-card 30th
Celebration Holo repair is complete; do not repeat it. Check the checkpoint for
deployment state rather than assuming local code is scheduled in production.

## Native Anniversary Delivery - September 16

Read `NATIVE_ANNIVERSARY_RELEASE_20260916.md` for the isolated release candidate.
The Windows desktop helper can report a missing native pipe while the Mac is
reachable through the existing SSH key. `tailscale ping` discovered the Mac at
LAN `192.168.86.22:41641` on September 16; SSH to that LAN address succeeded with
the existing `HostKeyAlias=100.118.59.67`. The old `.35` address was stale.
Always rediscover the route before reuse. Do not replace keys, weaken host-key
checks or ask the founder to repeat setup merely because Tailscale SSH fails.
Preserve the primary Mac checkout and use an isolated release worktree. Apple
build availability, tester-group membership and physical installation are
separate verification steps. Never use a broad metadata/apply command just to
distribute a TestFlight update.

## Additive Pokemon Sealed Admission

Read `docs/contracts/POKEMON_SEALED_ADDITIVE_CATALOG_V1.md` and
`docs/ops/ANNIVERSARY_SEALED_CHECKPOINT_20260916.md`. The additive command reuses
an exact existing family and creates an inactive bounded release. Never run the
original hidden-lane writer against live Pokemon or activate the nine-product
release as a replacement catalog. Freeze source, run preflight and rollback
canary, bind its receipt, apply once and independently read back. A lost COMMIT
response requires readback, not a retry. Publication and baseline expansion
remain separate from this admission.

## Post-Publication Health Timeouts

Read `MARKET_HEALTH_READ_REPAIR_20260916.md`. A failed scheduled wrapper can
follow successful publication. Verify the ledger and active pointer before
retrying anything. Run the bounded health reader alone for recovery evidence;
never rerun source ingestion/publication or overwrite a failed historical summary
to clear a health-query incident. Preserve runtime rollback and producer pins.

## Verified Catalog Image Sources

Read `docs/ops/VERIFIED_CATALOG_IMAGE_DELIVERY_20260916.md` for the 30th
Celebration image delivery repair. The explicit verified self-hosted source
uses the existing bounded canonical proxy, not public Storage. Source delivery
recognition does not change image_status, finish evidence or publication gates.
Freeze and deploy this narrow client change separately from the intake writer.

## Numeric Set Pagination - September 13, 2026

The presentation release and eight Japanese exception writes are complete.
Continue from `CATALOG_NUMERIC_PAGINATION_CHECKPOINT_20260913.md`, not older
pre-release or image-preparation instructions. The ordering repair reads a
lightweight exact-set index before paging full metadata, with caller-scoped
visibility and explicit completeness checks. It does not mutate printed numbers.
Read `docs/contracts/CATALOG_NUMERIC_PAGINATION_V1.md` before changing it.

## Catalog Presentation Candidate - September 13, 2026

Read `docs/ops/CATALOG_PRESENTATION_RELEASE_CHECKPOINT_20260913.md`.
Candidate tree: `C:/grookai_vault_catalog_presentation_release_20260913`.
Preserved design tree: `C:/grookai_vault_collector_release`.
The import manifest and exact original files are in operator artifacts under
`catalog_presentation_20260913`. Only source-hashed display/cover changes were
imported; no previous image executors or private DB snapshots were imported.
Card detail must use its canonical printed_set_abbrev/printed_total before set
fallbacks; a hash-named set code is not a printed abbreviation. Unknown finishes
remain qualified. No new identity or pricing authority comes from presentation.

The six numbered image faces and two source-name conflicts are separate work in
`catalog_presentation_20260912/japanese-exceptions-8`; preparation is NOT Storage
or DB publication. Do not conflate this website release with resolving those rows.

Visual parity uses explicit local read-only collector mode on loopback, with
inherited production credentials removed. Do not enable production credentials
or relax the production release guard to start the visual fixture server. A
Vercel branch preview without the existing production target is intentionally
rejected; use a staged production-target candidate with preserved live rollback.

## Collector Rollout And Canonical Activity Reads (September 12)

Read the latest top section of `COLLECTOR_WEB_PRODUCTION_RELEASE_CHECKPOINT_20260912.md`.
MTG scheduled paired publication is now enabled and its real hosted run passed.
Do not confuse older OFF/pending notes below with the current worker state.
The website rollout was rolled back on a live activity timeout also reproduced
on the original build. Keep original production and approved staging preserved.

Card activity must select bounded active `vault_item_instances` for the verified
owner before catalog enrichment. Reuse `getRecentOwnedCards` with the authenticated
client. Never return to the globally limited legacy `v_recently_added` projection,
silently turn timeouts into empty-success feeds, or use admin access as a fallback.
Sealed activity remains separate; price and Vault total authority are unchanged.

For staged production promotion, preserve live deployment ID, source SHA and
environment metadata, disable automatic custom-domain assignment, and use the
Vercel promotion/rollback endpoints with readback. A successful mutation can have
an empty HTTP body: never retry it just because JSON parsing failed. Reconcile the
live pointer first. Restore automatic domain assignment only after healthy smoke
or a deliberate abort. Source/receipt recovery belongs in the existing private
recovery repository, not the public application repository.

## Collector Backend Release Blockers (September 12)

Full 394-migration isolated reset and both strict preflight phases now pass.
Use `-CollectorCameoIsolatedReplay -ExpectedLocalOnlyIds 20260912050000` only as
documented in the migration contract. Replay project is
`collector-cameo-replay-20260912`, port 56530. Never reset the working preview on
54330. Evidence is under operator artifacts `collector_polish/cameo_full_replay_20260912`.

`scripts/preview/check_collector_producer_local.ps1` runs the normal shipcheck with
backend SQL checks on the isolated schema DB and web rendering on the local
preview API. It removes inherited external credentials. Optional `-Commit` uses
the installed, unchanged pre-commit hook, not a bypass. Its local dependency
resolver loads genuine pinned @pgkit 0.6.1 packages from the existing identical-lock
installation without changing any shared node_modules junction or package files.
Do not deploy that local resolver or treat local checks as production readback.
The local Supabase `start.log` includes generated development credentials; do not
publish it or copy it into release assets.

Read `COLLECTOR_BACKEND_REPAIR_CHECKPOINT_20260912.md` and the corresponding
backend release-repair contract before resuming. Both repairs are applied from
producer `ff0884c91dabb2077019327758bdd8d82a8eff1b`: 2,103 MTG sealed products passed
paired publication/readback and zero-write idempotency; the confirmed-only cameo
reader is live with zero promoted confirmations. Scheduled refresh is still OFF
and the website has not switched. Do not repeat the migration apply.
Baseline diagnosis is now complete: see `COLLECTOR_SCHEMA_RECONCILIATION_20260912.md`.
Only three table column orders differed; all 891 security objects match and the
reconciled baseline SQL diff is empty. Never execute the broad raw view-replacement
output. A successful refresh plan is not published pricing. Preserve
the approved website. The checkpoint records actual canary/apply/readback receipts;
deployment and scheduled operation remain distinct outstanding gates.

## Collector Website Release Candidate - September 12, 2026 UTC

Tree `C:/grookai_vault_collector_release`, branch
`release/collector-web-production-20260912`. Read
`docs/contracts/COLLECTOR_WEB_PRODUCTION_RELEASE_V1.md` and the matching checkpoint.
Preserved design/staging stays in `C:/grookai_vault_collector_authenticated` and
`https://grookai-collector-staging.vercel.app`. Current live remains unchanged until
source parity, production compatibility and critical workflow gates pass. Recover
both sources from private `OriginalSoseji/grookai-collector-recovery`, not the public
main repo. Never move staging credentials or synthetic data into production.

Release follow-up (September 9, 2026): see
`docs/checkpoints/FINAL_RELEASE_VERIFICATION_20260909.md` and
`docs/release/APP_STORE_PRIVACY_BUILD318_20260909.md`. A clean detached CI checkout
must preserve its exact SHA and report `HEAD`, not invent a branch or bypass
frozen approval checks. The old August privacy worksheet is not current evidence.
Incremental MTG payload authority uses the exact `HEAD` commit and tracked clean
state, independent of attached/detached checkout topology. Actual branch and
detached status stay in `run_plan.json`; they must not change the approved row
fingerprint. Source, migration, row or cleanliness changes still invalidate it.

**Status:** Active

**Purpose:** This is the first operational reference for Grookai work. It
reduces reliance on chat history and prevents repeated setup, wrong-account
conclusions, stale-state decisions, and avoidable founder handoffs.

Read this before asking the founder for access, repeating a setup step, or
declaring that an account, app, device, database object, worker, or deployment
does not exist.

## Living Document Rule

Update this playbook whenever a change introduces or materially changes any of
the following:

- a recurring operational procedure;
- an account, console, browser profile, or authentication route;
- a workstation, remote host, connected-device, build, or deployment workflow;
- a scheduled worker, ingestion lane, pricing lane, or monitoring process;
- a production-write boundary, approval boundary, rollback path, or release
  gate;
- an authoritative status artifact, contract, checkpoint, runbook, or command.

The playbook update belongs in the same commit as the process change whenever
practical. Preserve detailed domain instructions in their dedicated document
and add or update the concise pointer here. New operational knowledge must not
exist only in chat, an unindexed audit, or one person's memory.

## 1. Source-Of-Truth Order

### Active market-release closeout

The consolidated final App Store checklist is
`docs/release/APP_STORE_FINAL_LAUNCH_CHECKLIST_20260909.md`.
Use it for the finite launch gates; preserve older receipts as history rather
than treating every green observer workflow as fresh business-health evidence.
The September 9 pricing-canary job exits the already-completed August window.

Security dependency evidence and the remaining installer-only archive advisory
are recorded in `docs/checkpoints/RELEASE_SECURITY_CLOSEOUT_20260909.md`.
Recheck deployed worker dependencies separately from merged web source.

Use `docs/checkpoints/RELEASE_CLOSEOUT_20260909.md` as the finite cross-domain
release checklist. It separates tested sealed implementation, deployed clients,
bounded ownership activation and live business-health evidence. Complete
existing release gates before adding collectible or presentation scope.

September 9 direct host readback found the pinned publication worker OOM-killed
and retention failing Git ownership checks. Pricing memory-repair scope and
verification: `docs/checkpoints/pricing/PRICING_MEMORY_REPAIR_20260909.md`.
Green GitHub observation jobs alone do not override failed systemd runs. Preserve
scanner availability and old publication evidence; do not rerun retention deletes
or replay publication without the relevant frozen execution checks.

The separate MEE reference-refresh memory failure and bounded artifact-selection
repair are recorded in `docs/checkpoints/pricing/MEE_REFERENCE_MEMORY_REPAIR_20260909.md`.
Neither source repair is a receipt for production worker deployment.

Actual MEE deployment and exact missing-row recovery are now recorded in
`docs/checkpoints/pricing/MEE_REFERENCE_RUNTIME_PARITY_20260909.md`. The active
runtime is pinned to ed7414b98034641632ad378d3c5766095a6d53f7. Reference producers
must share MEE_RUNTIME_ARTIFACT_ROOT and normalize the latest input per source,
not the newest two files globally. Main parity covers this reference lane only;
do not overwrite the full nightly runtime from main until its separate policy
differences are reconciled. Original failed runs and the old unit are preserved.
The verification script must resolve `/opt/grookai_mee_current` and
`MEE_RUNTIME_ARTIFACT_ROOT`, never the retired nightly checkout. REST fallback
lookups use 40-key URL chunks; direct PostgreSQL keeps 500-key array chunks.
Keep the MEE/pricing rollback-current pins until their separate retirement gate.
Pricing run 34314680975 now has independent publication/readback proof in that
checkpoint; this does not close the outstanding retention or observation gates.

For current release execution details, read the checkpoint's external
`C:/grookai_vault_operator_artifacts/release_closeout/20260909/FINAL_GATE_STATUS.md`.
It includes physical-device attempts, store listing readback, pricing receipts
and archive restoration evidence. Do not substitute old store metadata for a
current console readback. The Mac's observed LAN route `192.168.86.35` also
worked when its Tailscale SSH address refused connection; retain the existing
`HostKeyAlias=100.118.59.67` verification and the configured Mac key. Re-discover
the LAN address through Tailscale before reuse; never disable host-key checking.
For large Linux recovery archives, create and compare the archive on the source
host, transfer via SCP, verify its hash independently, then restore in an isolated
Linux environment. A streamed Windows SSH tar capture failed byte verification;
that failed artifact is not restoration authority and has been preserved.

### Pokemon language source recovery

The daily `pokemon-master-index-refresh.yml` worker can recover a catastrophic
TCGdex API card-count regression using the existing pinned official GitHub
snapshot adapter. It reuses the unchanged merge guards and never admits a
candidate directly into canon. Rejected API and fallback snapshots, hashes and
recovery status are retained in the workflow artifacts. A recovered candidate
scope is not a healthy primary API: issue 260 remains open for that debt and
all quarantined source anomalies. Offline fixture sources never use network
fallback. Do not guess German set owners or resolve Chinese collisions by count.
Contract: `docs/contracts/POKEMON_LANGUAGE_MASTER_INDEX_AUTOMATION_V1.md`.
Live evidence and next steps:
`docs/checkpoints/catalog_discovery/2026-09-07_POKEMON_LANGUAGE_REGRESSION_RECOVERY_V1.md`.

The daily refresh also runs `pokemon_language_anomaly_evidence_v1.mjs` as a
bounded, read-only diagnostic. It checks explicit card-detail owners for German
orphans and retains Chinese set collisions; it never uses a card-ID prefix or
repository filename as identity authority. At most 300 requests, three workers,
no retries, no redirects, with a circuit stop on access/rate-limit responses.
Evidence lives under the language report's `anomaly_evidence/`, outside candidate
apply paths, and issue 260 reports its outcome without automatically clearing
quarantine. Resume command, evidence and upstream defects:
`docs/checkpoints/catalog_discovery/2026-09-07_POKEMON_LANGUAGE_ANOMALY_EVIDENCE_V1.md`.

### Pokemon sealed production work

September 9 source-containment repair:
`docs/checkpoints/POKEMON_SEALED_SOURCE_CONTAINMENT_20260909.md`.
Changed supplier identities remain excluded from paired refresh releases, not
remapped. Contained drift stays an operator issue; active drift remains a failed
health check. Never fix a supplier hash mismatch by copying the new hash into an
existing exact mapping without identity review.

September 9 signed-in ownership activation and build318 release receipts:
`docs/checkpoints/APP_LAUNCH_PROGRESS_20260909.md`. The global Add control is now
enabled; the prior founder-only grant is historical, not the ordinary-account
release boundary. Never infer a holding's physical condition to fill its value.

Collection totals must load independently of inventory panels and sum only
governed owned values, never asking prices or factory-sealed references for
unknown/opened/damaged copies. September 9's Blooming Waters total diagnosis,
refresh repair and exact delivery boundary are in
`docs/checkpoints/COLLECTION_SEALED_TOTALS_20260909.md`.
For local Android delivery, read the installed version code first. The public
environment builder accepts `-BuildNumber` so a stale checkout version cannot
silently become a downgrade. Preserve app data with normal replacement install;
never uninstall or force a downgrade to get a test build onto the device.

When the founder chooses a real product for account-only Add testing, use the
explicit selection workflow in
`docs/checkpoints/SEALED_BLOOMING_WATERS_ADD_20260909.md`. The planner accepts
`--selection-file` containing one or two exact game/variant/query selections;
the frozen plan replays those exact selections under lock. Never reuse the old
alphabetic sample or silently substitute a product. Client build 317 does not
itself enable Add: server capability and account enrollment must be read back
first. Preparing a plan creates neither enrollment nor inventory.

Sealed ownership is required product scope across released games. Contract:
`docs/contracts/SEALED_OWNED_COLLECTIBLES_V1.md`. Current implementation,
local acceptance evidence and exact release boundary:
`docs/checkpoints/SEALED_OWNERSHIP_LOCAL_ACCEPTANCE_20260907.md`.
Current production schema receipt:
`docs/checkpoints/SEALED_OWNERSHIP_SCHEMA_APPLIED_20260907.md`.
All four migrations plus the separately approved photo-revision migration are
applied. The separately approved account-canary migration now brings exact
ledger parity to 393/393; do not reapply any of them. PR #440 is merged and
default-off clients are deployed. Current receipt and remaining acceptance:
`docs/checkpoints/SEALED_OWNERSHIP_CLIENTS_316_20260908.md`.
Enabled emulator share/print acceptance and the unpriced lot-export repair:
`docs/checkpoints/SEALED_OWNERSHIP_NATIVE_ACCEPTANCE_20260908.md`.
Latest browser section repair, local sale/trade readback, cleanup and separate
scheduled failure findings:
`docs/checkpoints/SEALED_OWNERSHIP_WEB_SECTIONS_20260908.md`.
The production ownership switch is global, not account-scoped. Never enable it
and describe that as a single-owner canary. Local acceptance is not activation.
The account-scoped canary schema is now applied, default off and grant-empty:
`docs/contracts/SEALED_OWNERSHIP_ACCOUNT_CANARY_V1.md`. Its consumed authority,
independent readback, final 393-migration parity and remaining gates are recorded
in `docs/checkpoints/SEALED_OWNERSHIP_CANARY_SCHEMA_APPLIED_20260908.md`.
The latest isolated browser acceptance uses a separate headless Playwright test
process against local3157, not the founder's browser session. Front/back upload,
QR print rendering, lot downloads, mixed totals and Wall disappearance have
local receipts. The three remaining native gates are now confirmed in the
checkpoint's "Native Completion" section and the external
`20260908_native_completion/README.md` evidence packet: two-copy lot PNGs and
native share sheet, back revision/rendering, and Wall membership/removal/history.
Inspect-only XCTest passes do not close gates; retain assertions, screenshots
and independent readback. The final three native tests passed without failures.
Native fixtures must be rebound after replay. Never ship local-only build316.
The account-canary read-only producer is
`node scripts/schema/sealed_ownership_account_canary_plan_v1.mjs --out-dir=<new-private-directory>`.
Use `--discover` only for investigation; a normal plan requires a clean exact
commit. Current preparation evidence lives outside git at
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_account_activation_preparation/`.
The frozen output is `frozen/activation_plan.json`, with preflight and artifact
hashes. Confirm it exists and hashes reconcile before claiming a plan was emitted.
Its owner UUID is private; do not commit the JSON. Proposed variants do not prove
ownership. This script cannot enroll accounts, activate additions or deploy.
The frozen plan has a 24-hour window; refresh expired evidence without changing
production. The schema-only authority remains consumed. The bounded transition
executor is implemented with rollback-only local SQL proof:
`docs/checkpoints/SEALED_OWNERSHIP_CANARY_EXECUTOR_20260908.md`.
Use `sealed_ownership_account_canary_execute_v1.mjs --mode=prepare` for read-only
fresh preflight/execution-envelope generation, or the default `readback` mode.
Provide `--plan-dir` and a new external `--out-dir`. Actual activate/rollback
modes require their own exact execution envelope, fingerprint and authority.
Never delete start markers, automatically retry an unknown COMMIT, or ship the
local debug defines. Production-configured deployment and real owner canary
remain release gates, not consequences of successful executor tests.
The `sealed_owned_instances_v1.mjs` runner now replays historical migrations
inside a rollback-only transaction, stripping their transaction wrappers, and
asserts exact current function definitions before lifecycle fixtures. Older
worktrees lacking this fix can overwrite newer local policies; do not use them
after the final full replay. The repaired runner passes 36 rollback checks.
Its SQL integration runner `tests/integration/sealed_account_canary_v1.mjs`
requires disposable sealed fixtures and commits local racing-test data. Always
finish with the isolated replay cleanup; never run it against production.
New sealed uploads must use unique revision paths, never overwrite a shared path.
The separate two-function revision migration was independently authorized and
applied; preserve its single-use marker and exact plan receipt.
iOS archive 315 predates this repair and must not be uploaded as the fixed build.
The bounded executor's start marker is preserved outside the checkout. Ownership
is disabled, with no sealed copies or journal rows. Older worktrees/main lacking
these committed migrations must reconcile before any later schema operation.
Release preflight and the subsequent service-role default-grant repair:
`docs/checkpoints/SEALED_OWNERSHIP_RELEASE_PREFLIGHT_20260907.md`.
The original `6d46b8c2c` migration plan is historical and must not authorize the
repaired SQL. Freeze fresh hashes after the repair commit. For new service-only
tables/views, explicitly revoke service-role defaults before bounded grants;
test actual privileges, not only the presence of GRANT statements in source.
Ownership clients are deployed with ownership OFF, not activated. Production
now has the real sealed anchor; never insert sealed UUIDs into card columns.
The repeatable local evidence runner is
`node tests/integration/sealed_verification_v1.mjs checks|fixtures|android|replay`
(choose one phase). It writes logs and hashes outside the checkout. `fixtures`
commits disposable local data and requires the final isolated `replay` phase.
After the six migrations were applied, replay requires zero pending migrations;
do not reuse the historical four-pending-ID expectation. Local UI signed Storage
URLs may require emulator-only `adb reverse tcp:55429 tcp:55429`; remove that
temporary forwarding afterward. Stop the local web harness before final replay.
The final x64 APK points to local emulator Supabase, not production; never ship it.
For isolated native iOS acceptance when Chrome automation is unavailable, use a
separate Mac worktree and dedicated simulator, with local publishable defines
and a loopback-only SSH reverse tunnel to API55429. Preserve existing simulators
and production/TestFlight builds. Xcode UI tests and screenshots can verify
local lifecycle, share, print and picker behavior without a physical phone.
Exact setup, source provenance, results and remaining gaps are in
`docs/checkpoints/SEALED_OWNERSHIP_CANARY_SCHEMA_APPLIED_20260908.md`, section
"Native iOS Follow-Up". Never ship that local debug build. Close its tunnel and
shut down only its dedicated simulator before the mandatory final replay.
Flutter AX frames may lag a resized dialog; retain screenshot evidence instead
of treating failed coordinate targeting as an application failure or a pass.
Sealed checkboxes now expose exact-GVVI semantic labels. After scrolling, wait
for layout to settle and verify checked values; taps can stop scrolling without
selecting. Reveal controls above the bottom navigation on shell screens, but
allow the lower safe area on standalone pricing routes. iOS share-sheet actions
are cells (for example `Save 2 Images`), not necessarily buttons. Copy labels
can be merged; visible screenshot/readback evidence remains required.
`scripts/schema/sealed_ownership_rollout_plan_v1.mjs` creates a commit/hash-bound
read-only release plan. It cannot apply SQL, activate flags or grant authority.
Strict linked-schema preflight originally found a non-empty diff and a pending
dimension repair. The comparison is now reconciled; never execute the broad
generated diff. Preserve the populated local Supabase instance when replaying.

Current prerequisite proof and exact resume command:
`docs/checkpoints/SEALED_SCHEMA_BASELINE_RECONCILED_20260907.md`.
The scoped `AuditLinkedSchema -ReconciledReplayAudit` and isolated PrePush pass
for exactly `20260905120000,20260907160000`. The image-dimension repair and the
32-function source reconciliation were subsequently applied with the ownership
batch recorded above. Three table column-order
differences explain all 41 view proposals; 873 security objects match and 126
tests pass. Never rebuild the card table or drop views to satisfy the raw diff.
This is a baseline prerequisite pass, not deployed sealed ownership or write
authority. The audit uses pinned development-only `@pgkit` 0.6.1 packages;
retain raw/reconciled SQL and evidence in a fresh directory for every audit.
Use the separate `sealed-ownership-replay-20260907` project on ports 55430/55431,
not the populated local project on 54330. A cold isolated Deno dependency cache
can reuse the existing project's cache through a read-only source mount; never
disable certificate verification or modify the original cache to make tools run.

Deferred presentation work: `docs/plans/SEALED_PRODUCT_IMAGE_ISOLATION_V1_20260907.md`.
The founder requested saving this for later, not executing it. Resume with a
20-product local before/after preview; preserve original evidence and use separate
transparent display derivatives only after quality and access checks. No job is scheduled.

The signed-in Pokemon release is active. Web enablement is declared in
`apps/web/vercel.json`; Android builds use `-EnablePokemonSealed` with the existing
public-environment build script. Preserve `-EnableMtgSealed` when building both.
The signed APK workflow reads the matching repository variables (default off).
The daily `pokemon-sealed-health-v1.yml` workflow inventories source products,
builds a read-only refresh proposal, verifies pointers/coverage/access, and opens
one deduplicated GitHub issue for failures, source drift, new candidates or prices
approaching expiry. `POKEMON_SEALED_REFRESH_ACTIVE=true` enables the separate
bounded paired-release refresh before the read-only audit. Keep this variable
off until the exact worker's rollback, durable apply and idempotency proofs pass.
The worker `pokemon_sealed_refresh_v1.mjs` operates only over frozen baseline
`0bf7970b-842e-556c-9c6f-d541d1456212`: no new identities or Storage writes.
It stops on source drift, more than five percent coverage loss, or a price ratio
outside one-third to three times the prior quote. It preserves original image
retrieval dates and moves price/image pointers atomically. Existing seven-day
stale-price exclusion remains enforced; never extend timestamps. Maintenance-only
source gaps open/update an issue without falsely reporting pipeline execution as
failed. Actual refresh failures retain their failing job result and artifacts.
The health check also creates a short-lived session for the existing non-founder
App Review identity, calls the deployed authenticated signer, verifies three
complete image byte hashes, and revokes only that new session. It never creates
an account, changes credentials, sends email, or logs session tokens. The workflow
uses existing canonical Supabase secrets. `pokemon_sealed_web_smoke_v1.mjs` uses
the same bounded identity for signed-in SSR checks without reading browser cookies.

Price-maintenance alerts include `aging_prices.json`: exact product names/source
IDs, observation dates, and the first date each quote is withheld. Manual workflow
dispatch with `audit_only=true` skips publication without changing the global
automatic-refresh variable. Its authentication probe still creates/revokes only
its bounded test session. Use this mode to verify monitoring changes without
creating another immutable price/image release.
`scripts/audits/pokemon_sealed_maintenance_v1.mjs` performs a separate bounded,
artifact-only gap investigation: original image failures (maximum 50), at most
32 source price groups, one attempt per frozen URL, no redirects, four workers,
and per-origin circuit stopping after 401/403/429. It must not evade source access
blocks, substitute similar products, or treat locally recovered image bytes as
uploaded/published. Keep original failure artifacts unchanged and use a new output
directory. Source endpoint access failure is not proof a product or price is absent.
Maintenance and health validate the actual direct/pooler database project against
the API project before connecting; noncanonical targets and connection overrides
fail closed even if a different database has plausible record counts.
Follow-up evidence: `docs/checkpoints/POKEMON_SEALED_SOURCE_MAINTENANCE_20260907.md`.

Freshness diagnosis (2026-09-07): compare each aging published quote against its
latest exact warehouse observation before rerunning publication. A completed
full sync does not imply every product supplied a price. When direct source
access is blocked, inspect already-retained warehouse response archives over the
existing operator SSH route, read-only, and require exact database artifact hash
and byte-size parity before parsing. Never extend observation timestamps from
the retrieval date. The eight-file proof for 16 missing source quotes and the
day-seven/day-eight regression tests are recorded in
`docs/checkpoints/POKEMON_SEALED_FRESHNESS_PROOF_20260907.md`.

Mobile loading amendment (2026-09-07): sealed image signing uses a rolling pool
of at most eight requests, not fixed groups of four. It retains per-image
authorization, response order, and whole-page withholding on signing failure.
The bounded 96-request production comparison had zero failures and reduced
24-image signing time from about 3.55s to 3.07s. This is network-phase evidence,
not a claim about all app routes or end-to-end device rendering.
Current evidence and remaining gates:
`docs/checkpoints/SEALED_CLIENT_CLOSEOUT_20260907.md`.

The end-to-end founder authority and scope are in
`docs/contracts/POKEMON_SEALED_PRODUCTION_V1.md` (2026-09-07).
Worktree: `C:/grookai_vault_pokemon_sealed`; branch:
`agent/pokemon-sealed-production-v1`. Immutable operator evidence is under
`C:/grookai_vault_operator_artifacts/pokemon_sealed/`.
Use `pokemon_sealed_inventory_v1.mjs`, `pokemon_sealed_plan_v1.mjs`, and
`pokemon_sealed_apply_v1.mjs` in `scripts/audits` for inventory, frozen planning,
rollback canary, exact apply, and readback. Storage uses
`pokemon_sealed_image_acquisition_v1.mjs` followed by
`pokemon_sealed_storage_v1.mjs`: content-addressed Pokemon-only paths,
upsert disabled, exact byte readback, and resumable journals. Never infer that
downloaded local bytes have been uploaded or that an inactive release is visible.
Keep MTG/One Piece pointers and all card/Vault records outside this authority.

Use evidence in this order:

1. Fresh direct readback from the actual system being discussed.
2. Current machine-readable status or audit artifact.
3. Current domain checkpoint and governing contract.
4. Repository implementation and configuration.
5. Historical checkpoints and chat context.

Historical checkpoints preserve what was true at a point in time. They do not
override a newer direct readback. When direct evidence changes current truth,
update the current status artifact and add a new checkpoint; do not rewrite an
immutable historical record.

## 2. First Five Minutes Of Any Task

1. Confirm the intended repository and worktree.
2. Run `git status --short`, `git branch --show-current`, and
   `git rev-parse HEAD`.
3. Read this playbook, `docs/GROOKAI_RULEBOOK.md`, and the relevant domain
   checkpoint/index.
4. Inspect existing automation, artifacts, browser sessions, devices, and
   remote access before requesting setup.
5. State the exact boundary: read-only, dry-run, local write, production write,
   deployment, or external submission.
6. Define the direct readback that will prove completion before changing
   anything.

Do not use a dirty worktree blindly. Preserve unrelated user changes and use an
isolated worktree when the active checkout belongs to another workstream.

## 3. Access And Environment Map

### Windows repository work

- Inspect all worktrees with `git worktree list` before assuming the current
  folder is the correct branch.
- Never discard unrelated changes to make a branch clean.
- Record the commit that actually produced a build, run, or audit. A later
  documentation commit is not its provenance.

### Chrome and external consoles

- Use the Chrome window/profile labeled `Work` when a task depends on an
  existing Grookai signed-in session.
- Verify the displayed organization, app, package, and environment before
  drawing conclusions or editing anything.
- A signup page can mean the wrong Google profile is active. It is not proof
  that no developer account exists.
- Prefer account switching and direct readback over creating any new account,
  app, project, or listing.

### Google Play Console

Verify all four identifiers before working:

- developer account: `Grookai`;
- account type: organization;
- app: `Grookai Vault`;
- package: `com.grookai.vault`.

Current machine-readable truth lives at:

- `docs/audits/store_release_readiness_v1/external_console_status.json`

Prepared Android metadata and data-safety answers live at:

- `docs/release/google_play_android_1_0.json`
- `docs/release/google_play_data_safety_android_1_0.md`

Prepared media and hashes live at:

- `docs/audits/store_release_readiness_v1/store_media_manifest_v1.json`
- `artifacts/store/google_play/`

Never create a second Play app because the existing app is hidden by the wrong
profile. Do not accept IARC or other legal terms, send a draft for review, or
publish without explicit authorization for that action.

Current August 17 readback:

- Content ratings is actioned after the submitted IARC request.
- Advertising ID and photo/video permission declarations remain under
  `Need attention`.
- Store listing media remains a separate release gate.

### Collector chat safety

The active product contract is:

- `docs/contracts/CHAT_SAFETY_CONTRACT_V1.md`

Normal web and Flutter message paths apply `CHAT_SAFETY_POLICY_V1`, while
`trust_blocks` and `trust_reports` preserve the existing database-backed block
and report boundaries. Founder report review is available at
`/founder/trust-safety`.

Do not claim bypass-proof database moderation yet. Strict migration preflight is
blocked by the unrelated pending local-only migration
`20260816160000_mtg_tcgplayer_market_publication_v1.sql`. Resolve that ledger
state first, then use a separately approved forward-only database enforcement
gate. Never delete or rewrite existing messages while adding moderation.

### App Store Connect and Mac

Sealed iOS builds require explicit `MTG_SEALED_CLIENT_V1_ENABLED=true` and
`POKEMON_SEALED_CLIENT_V1_ENABLED=true` in the release environment. The shared
ownership UI additionally requires `SEALED_OWNERSHIP_V1_ENABLED=true`, now
carried by both the iOS generator and signed Android workflow. It defaults off;
this compile-time switch never enrolls an account or bypasses the database gate.
Verify all three defines in an intended ownership release, not just browse.
The shared
`scripts/write_ios_xcode_secrets.rb` now validates and carries both flags into
generated xcconfig files; absent flags remain false. Check decoded flag names
and values without printing other defines before archive. The existing Mac SSH
account is `cesarcabral`; use the key and Tailscale discovery below, not a guessed
account or changes to the primary checkout.

The automation contract and commands are in:

- `docs/app_store_connect_automation.md`
- `docs/release/app_store_connect_ios_1_0.json`
- `docs/release/app_store_privacy_ios_1_0.md`

Use the existing Tailscale Mac route for Xcode, native iOS builds, simulators,
archives, and TestFlight. Discover its current address from Tailscale rather
than relying on an old IP. The known host is `cesars-macbook-pro-2`, and the
existing SSH key is `~/.ssh/grookai_mac_remote_ed25519`.

If SSH signing fails with `errSecInternalComponent`, inspect the actual
keychain error before replacing certificates or asking for setup again. An
unlocked desktop login keychain can still deny the SSH security session.
Build 313 succeeded by running the unchanged archive command in a new Terminal
window in the existing Mac desktop session through AppleScript. Use a dedicated
window, log and exit-status file; monitor it to completion. Do not weaken
keychain permissions, save a password, or automate an authentication dialog.
If the desktop keychain itself is locked, the founder must unlock it.
The operator scripts/readback are in the sealed closeout artifact root recorded
in `docs/checkpoints/SEALED_CLIENT_CLOSEOUT_20260907.md`.
Build 316 is now the latest processed default-off ownership compatibility build
for the existing internal group; use the client release checkpoint above.
It includes the photo privacy repair, verified symbols and simulator startup.
No physical iPhone ownership acceptance or public store submission is implied.
Build 314 was the previous processed sealed candidate for the existing internal
Friends and Family group, from source
`736f15c1fa866fad3616a4a55d9a46dc566ae0e5`. It includes the Samsung-verified
search keyboard fix and retains both sealed flags. Actual internal membership,
automatic-notification setting and testing notes were read back from Apple.
Source/archive/signature/dSYM and simulator proof:
`docs/checkpoints/SEALED_IOS314_RELEASE_20260907.md`.
Build 313 and its archive remain preserved. This is not public App Store or
external-beta publication, nor proof that the physical phone installed 314.
Later same-day installed-device readback and signed-in Pokemon/MTG sealed
inspection are now complete in
`docs/checkpoints/SEALED_IOS314_PHYSICAL_ACCEPTANCE_20260907.md`.
Use that checkpoint for current device acceptance; preserve the earlier locked
probe as history. For Xcode automation, inspect screenshots as well as hierarchy:
TestFlight overlays can cover the underlying app tree. Resolve the sealed search
arrow by exact label and visible upper-screen bounds, not the ambiguous Search
identifier shared with the native keyboard. Wait for rendered results, not just
an enabled Reload button. Bound owned test processes and preserve failed logs;
incomplete xcresult bundles and inspection-only exit codes are not passing proof.
CoreDevice may acknowledge launching TestFlight while Xcode subsequently reports
the phone locked. Stop the owned probe on that explicit evidence; never infer
physical acceptance from the launch acknowledgement. The 314 probe was stopped
with exit 143 and verified absent; simulator startup passed separately.

For TestFlight readback, enumerate each existing beta group's `builds` relation;
the build's `betaGroups` related GET is not supported by Apple's API. Verify
processing state and actual group membership independently. Preserve the prior
audience; uploading a build does not authorize public beta links or an App Store
submission. Check Mac free space before native builds; build 313 left roughly
16 GiB before simulator verification. Do not delete prior archives to make room.

Before touching the Mac checkout:

1. inspect its branch, commit, status, and worktrees;
2. preserve a dirty primary checkout;
3. create or reuse an isolated worktree at the intended commit;
4. confirm the build number and bundle identity before archive/upload;
5. record the exact commit and artifact that were uploaded.

API key files and review credentials stay on the operator machine and outside
git. Uploading a build is not the same as attaching it to a release or
submitting it for review.

### Android devices and emulators

Start with:

```powershell
flutter devices
adb devices -l
```

Use an emulator for repeatable flows that do not require a physical device.

Sealed acceptance follow-up (2026-09-07):
`docs/checkpoints/SEALED_SAMSUNG_ACCEPTANCE_20260907.md` records the physical
Samsung in-place update and search-focus repair. Before installing, compare APK
signing certificate fingerprints with the installed base APK. Never uninstall
the founder's app just to replace a development certificate with a CI beta key.
Use the existing public-env profile build with the matching certificate instead.
On Windows, ADB is under `%LOCALAPPDATA%/Android/Sdk/platform-tools/adb.exe` when
absent from PATH. Hidden `.android/debug.keystore` files require `-Force` during
PowerShell discovery; an unqualified listing is not proof a key is missing.
For iPhone acceptance, CoreDevice availability and `passcodeRequired=false` are
not sufficient: honor Xcode's actual locked-device error. Cancel the owned test
process and preserve logs rather than leave a probe waiting indefinitely.

Use Samsung/physical Android only for hardware, signing, deep-link, camera, or
real-device acceptance evidence. The unattended locked-device harness is
documented in `docs/runbooks/ANDROID_LOCKED_ACCEPTANCE_DEBUG.md`.

Do not ask the founder to reconnect or unlock a device until checking ADB,
Flutter device discovery, emulator availability, and whether a stale process
owns the connection.

## 4. Operational Workflow Map

| Workstream | Start here | Completion evidence |
|---|---|---|
| Engineering and Supabase | `docs/GROOKAI_RULEBOOK.md` | Governing tests plus direct environment/DB readback |
| Contracts | `docs/CONTRACT_INDEX.md` | Relevant contract tests and unchanged invariants |
| Checkpoints | `docs/checkpoints/CHECKPOINT_INDEX.md` | New current-state checkpoint linked from its domain index |
| Store readiness | `docs/release/STORE_RELEASE_READINESS_V1.md` | `npm run release:store:require` and direct console readback |
| Store media | `docs/checkpoints/product/STORE_MEDIA_PREPARATION_20260817_V1.md` | Manifest hashes, dimensions, and uploaded-console readback |
| App Store automation | `docs/app_store_connect_automation.md` | Status readback for exact build/version and screenshot set |
| Current app candidate | `docs/checkpoints/product/APP_CANDIDATE_312_MTG_SIGNED_IN_RELEASE_PARITY_COMPLETE_20260906_V1.md` | Build 312 has exact web, signed Android, valid TestFlight, governed pricing, and signed-in MTG release parity; App Store review/public release remains separate |
| Release readiness | `docs/release/PRODUCTION_READINESS_GATE_V1.md` | `npm run release:completion:require` and required soak evidence |
| Pricing/MEE definition | `docs/contracts/MEE_PRICING_PLATFORM_PRODUCTION_V1_DEFINITION_OF_DONE.md` | Every frozen release gate reconciled |
| Pricing resume | `docs/system/RESUME_PRICING_V1.md` | Current pricing checkpoint and production readback |
| MTG market pricing publication | `.github/workflows/mtg-pricing-publication-runner.yml` and `docs/checkpoints/pricing/PRICING_CHECKPOINT_131_MTG_FRESH_VIEW_PRODUCTION_GUARD_REPAIRED.md` | Exact reconciled shadow, indexed freshness-aware Pokemon baseline, production guard artifact, and final run reconciliation |
| MTG sealed world | `docs/checkpoints/pricing/PRICING_CHECKPOINT_130_MTG_SEALED_MOBILE_PROFILE_CANARY_PASSED.md` | Signed-in production web is active and flag-reversible; Android profile performance passed; TestFlight/iPhone and the separately prepared dimension constraint repair remain future gates |
| MEE nightly operations | `docs/runbooks/MEE_NIGHTLY_DROPLET_WORKER_V1.md` | Live-ops verifier plus newest run artifacts |
| TCGCSV warehouse | `docs/runbooks/TCGCSV_FULL_SOURCE_WAREHOUSE_V1.md` | Warehouse reconciliation with no public-price mutation |
| New Pokemon sets | `docs/playbooks/NEW_POKEMON_SET_RELEASE_INGESTION_PLAYBOOK_V1.md` | Manifest-backed canon, mapping, and image readback |
| Migration maintenance | `docs/contracts/GV_MIGRATION_MAINTENANCE_CONTRACT.md` | Strict preflight, replay, remote readback, and clean history |
| GitHub/CI | `.github/workflows/` and the current checkpoint | Required checks green for the exact commit |
| System parity and serial integration | `docs/contracts/SYSTEM_PARITY_CRAWL_V1.md` | Immutable current-main crawl, artifact hashes, and zero unexplained candidate regressions |

Use `docs/INDEX.md` when the workstream is not listed above. Do not invent a
new procedure until checking for an existing contract, playbook, runbook,
checkpoint, or script.

### System parity and convergence prevention

Before integrating multiple deferred domains, capture current `origin/main`
with:

```powershell
npm run system:parity:baseline
npm run system:parity:test
```

Parallel read-only research and fixture generation are allowed, but production
integration remains serial: one bounded capability, one fresh-main branch, one
reviewable PR, then rebaseline. Do not combine MTG sealed, multilingual Pokemon,
sealed automation, collectible adapters, and Visual Search into one candidate.
Candidate parity runs must use the same crawler version and the recorded
baseline directory. A missing migration, route, workflow, entrypoint, database
object, policy, or previously healthy product case blocks the lane unless the
active contract permits an explicit versioned disposition; migration mutation
is never waivable.

### MTG market pricing publication gate

September 15 activation-timeout repair:
`docs/ops/MARKET_ACTIVATION_GUARD_REPAIR_20260915.md`. Worker V1_8 materializes
the staged/current release slices before the coverage join. The guard's six
counts, loss policy, truth exclusions, and 120/125-second limits are unchanged.
Local PostgreSQL parity and a bounded production read-only query are proven;
deployment and successful publication are separate, still-required gates.
Never resume a frozen V1_7 run under V1_8 or mutate its provenance to permit it.

Operate MTG market pricing only through
`.github/workflows/mtg-pricing-publication-runner.yml` from an exact merged
`main` SHA. Production requires a shadow run at that SHA with state
`shadow_verified`, reconciliation state `reconciled`, policy
`TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3`, and a source sync reused by the
production worker.

The production guard computes last-known MTG and Pokemon baselines plus the
currently fresh Pokemon subset through the indexed active publication pointer,
snapshots, decisions, and truth-review quarantine. It does not aggregate the
broad `v_market_price_current_v1` client view or count unscoped historical
decisions. The shadow may reduce either baseline by at most `0.1%`, rounded
down; a larger reduction blocks even when the Pokemon fresh subset is empty or
expired. The baseline query is bounded by a 120-second database timeout.

Both shadow and baseline coverage are counts of distinct canonical
`card_printing_id` values; source-row duplication cannot satisfy the guard.
The workflow writes a `preflight_started` artifact before database access and a
`blocked` artifact for lookup, query, evaluation, or timeout errors, preserving
prior counts/findings without a stack trace.

The shadow comparison is an early provenance gate. Production worker
`TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_6` performs the authoritative second
comparison inside the activation transaction using the actual staged
publication snapshots and the then-current indexed MTG and Pokemon baselines. It must
complete before `activate_market_price_publication_set_v1` can move the
publication pointer. The final artifact must report guard stage
`production_pre_activation` and evidence scope
`production_publication_snapshots`.

The worker must preserve the completed shadow preflight artifact on startup.
Any production worker failure then converts the latest artifact to `blocked`
and records `worker_error`; do not accept a run whose artifact remains only
`preflight_started`. The authoritative activation query is limited to a
120-second transaction-local statement timeout and a 125-second client timeout
before the worker restores its normal publication timeout.

The production workflow creates its initial `preflight_started` artifact as the
first executable job step, before checkout, repository verification, contract
tests, or dependency installation. The always-running evidence upload therefore
classifies failures that occur before the publication worker starts.

When a retry resumes a production run already committed as `verified`, the
worker must not trust the existing local guard file. It opens a read-only
transaction, proves that run still owns the active publication pointer,
re-evaluates the guard against committed snapshots and current baselines, and
restores the resulting artifact before reporting success.

The established MTG and Pokemon publication lanes must each have a nonzero
active-publication baseline. A missing pointer or broken publication/run join
produces zero baselines and blocks both shadow preflight and production
pre-activation. This workflow has no implicit bootstrap exception.

Every production preflight writes
`mtg-pricing-production-guard.json` into the workflow artifact. Read that file
alongside the worker summary and reconciliation artifacts before classifying a
run. Never bypass a material-loss finding, substitute a different shadow, or
compare against stale raw publication decisions.

### MTG sealed world gate

Current authority is
`docs/checkpoints/pricing/PRICING_CHECKPOINT_130_MTG_SEALED_MOBILE_PROFILE_CANARY_PASSED.md`.
Its immutable predecessor is
`docs/checkpoints/pricing/PRICING_CHECKPOINT_129_MTG_SEALED_PRODUCTION_WEB_ACTIVE.md`.
Operate the lane only through `.github/workflows/mtg-sealed-world-runner.yml`
and `.github/workflows/mtg-sealed-visibility-boundary.yml` from an exact merged
`main` SHA supplied as `expected_sha`.

The durable catalog, image evidence, image pointer, pricing, and signed-in web
surface are active. The Android production-profile canary passed after the set
catalog was made viewport-lazy and game-scoped. TestFlight/iPhone proof is the
current client gate. The separately prepared dimension constraint repair
remains unapplied and requires its own authority.

The two initial sealed schema migrations and the durable MTG payload are applied.
Steps 1-13 are complete and remain below as immutable operation history. Do not
replay them. The single-use `apply` authority for producer
`800d41e65fbaaaf52f1e32b5cde1ae0367e1a976` is consumed. A future mutation
requires a new contract, producer, fingerprints, rollback proof, and explicit
authority. Do not repeat the completed Android profile canary.

The complete operation order is:

1. `migration_dry_run` - remote ledger and sole-pending proof, zero writes.
2. Obtain explicit authority for the exact migration SHA-256.
3. `migration_apply` - apply only the proven per-game release migration.
4. `mtg-sealed-visibility-boundary.yml` `migration_dry_run` - prove the
   sealed-specific visibility migration is the sole pending migration. This
   gate is required when MTG card-catalog visibility is already `signed_in`.
5. Obtain explicit authority for the exact sealed-visibility migration SHA-256.
6. `mtg-sealed-visibility-boundary.yml` `migration_apply` - apply the isolated
   visibility boundary and run its complete readback automatically.
7. `migration_readback` - independently verify both exact migration hashes and
   ledger row, constraint definitions, function definitions and ACLs, table
   grants, RLS/policies, preserved One Piece release data, empty MTG target,
   and hidden MTG visibility. Dispatch it from the merged producer SHA:

   ```powershell
   gh workflow run mtg-sealed-world-runner.yml --ref main `
     -f operation=migration_readback -f expected_sha=<merged-main-sha>
   ```

   Preserve the `mtg-sealed-migration_readback-<run-id>` workflow artifact;
   its `mtg-sealed-migration-readback/` directory contains `run_plan.json`,
   `migration_readback.json`, `summary.json`, `REPORT.md`, and
   `artifact_hashes.json`.
8. `plan` - freeze a fresh live payload and fingerprint after schema apply.
9. `preflight` - read-only live boundary proof.
10. `rollback_canary` - full transaction with zero committed residue.
11. Obtain separate explicit authority for the exact sealed-world payload,
    including the producer SHA, plan fingerprint, source fingerprint, and exact
    payload counts JSON.
12. `apply` - durable MTG sealed catalog/qualification/release operation. Pass
    all separately approved values; the workflow and writer both fail closed on
    drift:

    ```powershell
    gh workflow run mtg-sealed-world-runner.yml --ref <exact-producer-ref> `
      -f operation=apply -f expected_sha=<exact-producer-sha> `
      -f expected_plan_fingerprint=<approved-plan-fingerprint> `
      -f expected_source_fingerprint=<approved-source-fingerprint> `
      -f 'expected_counts_json=<approved-compact-counts-json>'
    ```
13. `readback` - independent payload, release, cross-game, and visibility
    reconciliation.

Steps 12 and 13 completed in workflow runs `33828154527` and `33829699266`.
The separate readback regenerated the exact payload, reconciled every durable
projection and the MTG pointer, and wrote zero rows. Do not dispatch `apply`
again with the checkpoint 101 values. The aggregate write-count telemetry
repair described in checkpoint 103 is complete and did not mutate production.
Merged-main readback run `33834897002` passed with zero writes. Checkpoint 105
records the subsequent complete Gate A audit while
`MTG_SEALED_PRODUCTIZATION_GATES_V1` keeps self-hosted image mutation,
governed pricing refresh, and signed-in visibility as separate future gates.

Gate A image coverage is operated only through
`.github/workflows/mtg-sealed-image-coverage-v1.yml` from an exact merged
`main` SHA. The workflow requires `SUPABASE_DB_URL`, verifies the production
project ref and canonical minimum counts, queries the active frozen MTG release
inside a read-only transaction, and performs bounded GET requests against exact
allowlisted TCGPlayer image routes. It writes GitHub artifacts only.

```powershell
gh workflow run mtg-sealed-image-coverage-v1.yml --ref main `
  -f expected_sha=<exact-merged-main-sha>
```

Preserve the `mtg-sealed-image-coverage-v1-<run-id>` artifact. Confirm
`summary.json` reports exactly 2,182 selected members, zero reconciliation
mismatches, and zero writes in every boundary. Review `exceptions.jsonl` before
freezing an eligible/excluded member set. Do not upload Storage objects, apply a
migration, write image pointers, refresh pricing, deploy clients, or activate
visibility from this workflow.

Run `33841181449` completed this operation from
`e616615883cb808ad8c870380d9d52da4a4d80bf`. It froze 2,149 eligible members
and 33 explicit exceptions with zero reconciliation mismatches and zero writes.
Permanent compressed member-level evidence is linked from checkpoint 105. Do
not rerun Gate A merely to recreate that evidence; a new audit is justified
only by a separately versioned source or release change.

The reviewed image schema and authenticated one-object signing authorization
were promoted into migration `20260904130000` and durably applied under the
single-use authority recorded in checkpoint 110. The following command is
historical preparation evidence only; do not use it to request or replay the
consumed schema apply:

```powershell
npm run mtg:sealed:image-migration-preflight:v1 -- `
  --expected-head-sha=<exact-current-sha> `
  --out-dir=docs/audits/pricing/mtg_sealed_image_migration_promotion_v1/<timestamp>_preflight
```

The historical command accepted a topic branch, merged `main`, or detached CI
checkout and proved the exact SHA, tracked-clean state, canonical project,
prerequisites, collisions, migration history, and protected data boundaries.
The durable apply/readback now supersedes that pending-state proof.

The schema-only migration apply/readback named in checkpoint 109 is complete.
Do not replay it. Checkpoint 110 is the durable authority. The next gate is a
separately fingerprinted transient Storage canary; it does not authorize durable
image rows, image releases, pricing, visibility, Vault, or client activation.

Historical preparation used the schema apply operator in its default no-write
mode:

```powershell
npm run mtg:sealed:image-schema-apply:v1 -- `
  --plan `
  --expected-head-sha=<exact-clean-execution-sha> `
  --out-dir=.tmp/mtg-sealed-image-schema-apply-plan-v1
```

This command performs a fresh read-only production preflight, writes the exact
apply-plan fingerprint and authority text, and makes no database mutation. The
single schema apply was completed from execution commit
`3eccc923011be7f399ba1b54d12878361526e7b5`; its authority is consumed. Never
reuse the prior `--apply` invocation or approval token.

Never use `--include-all`. Migration authority does not authorize the MTG
catalog payload, and a plan created before migration apply must be regenerated
before durable data work. A plan produced before an apply-authority workflow
repair is evidence only; rerun plan, preflight, and rollback canary from the
exact merged repair SHA before requesting payload authority.

## 5. Release And Store Commands

From the repository root:

```powershell
npm run release:store:media
npm run release:store:status
npm run release:store:require
npm run release:secret-guard
```

`release:store:status` may report external blockers while repository metadata
is valid. `release:store:require` is the fail-closed submission gate. Prepared
metadata, saved drafts, and local assets never satisfy external verification.

Run the full ship gate when the change affects a release candidate:

```powershell
npm run shipcheck
```

For a narrow documentation-only correction, at minimum run `git diff --check`
and any contract test that validates the changed status artifact or index.

## 6. Database And Production-Write Safety

Before any Supabase-backed work, execute the environment sanity process in
`docs/GROOKAI_RULEBOOK.md`. Confirm the project reference and canonical counts;
do not infer data loss from one empty query.

For schema work:

1. audit and classify;
2. follow `docs/contracts/GV_MIGRATION_MAINTENANCE_CONTRACT.md`;
3. run strict migration preflight;
4. prove local replay;
5. freeze exact migration IDs and payload hashes;
6. apply only the authorized set;
7. read back schema, grants/RLS, ledger, and boundary invariants.

No Studio schema edits, ad hoc production SQL, destructive cleanup, or broader
payload is implied by approval for a bounded apply.

For data ingestion, warehouse and candidate staging are not canonical truth.
Follow the governing ingestion contract before promoting identity, pricing,
images, or publication state.

## 7. GitHub, Deployments, And Builds

- Confirm which commit a failed workflow ran before repairing code.
- Inspect the failing job and exact logs; do not restart repeatedly without a
  failure classification.
- Keep generated audit evidence tied to the commit that produced it.
- A green repository build is not proof of production deployment.
- A deployment is not proof of correct rendering; smoke-test the deployed URL
  or installed build.
- A TestFlight or Play upload is not proof that all users received the build.

When preparing a release, reconcile this chain:

```text
source commit
-> build artifact
-> uploaded build
-> selected release
-> deployed/distributed version
-> device or browser readback
```

### Repository reconciliation disposition

After a repository reconciliation merge, rebuild the non-destructive branch and
worktree disposition ledger from a clean topic branch based on current
`origin/main`:

```powershell
node scripts/repository/build_postmerge_disposition_ledger.mjs --authority=origin/main --out-dir=docs/audits/repository_postmerge_disposition_20260902
node --test tests/contracts/repository_postmerge_disposition_v1.test.mjs
```

The durable outputs are:

- `docs/audits/repository_postmerge_disposition_20260902/postmerge_disposition_ledger.jsonl`
- `docs/audits/repository_postmerge_disposition_20260902/REPOSITORY_POSTMERGE_DISPOSITION_REPORT_V1.md`
- `docs/audits/repository_postmerge_disposition_20260902/artifact_hashes.json`

`origin/main` and its recorded SHA are authority. A local branch or worktree
named `main` does not become authority through its name and must be classified
from actual Git ancestry and dirty state.

This process is read-only except for its generated repository artifacts. Every
ledger row must retain `delete_authorized: false`. Its next gate may create an
owner-readable archival candidate packet from clean, main-contained sources,
but it may not delete branches, tags, worktrees, directories, PRs, artifacts,
or recovery objects.

Build that owner-review packet with:

```powershell
node scripts/repository/build_archive_candidate_packet.mjs
node --test tests/contracts/repository_archive_candidate_packet_v1.test.mjs
```

The packet deduplicates local branches, remote branches, and linked worktrees.
It excludes dirty, unreadable, detached, migration-bearing, open-PR, protected,
and automation-referenced sources. Windows scheduled-task and running-process
inventories fail closed: if either cannot be read, no otherwise eligible source
is presented as an owner-review candidate. The output remains planning evidence
only; cleanup still requires a separate exact approval after a fresh verified
recovery bundle.

Prepare that exact recovery evidence with:

```powershell
node scripts/repository/build_prearchive_recovery_plan.mjs `
  --release-tag=<unique-private-recovery-tag> `
  --publish-recovery
node --test tests/contracts/repository_prearchive_recovery_v1.test.mjs
```

The planner revalidates every candidate against current refs, worktree state,
open PRs, repository automation, scheduled tasks, running processes, and
`origin/main`. It creates a Git bundle only for candidates that still pass,
uploads the bundle and manifest to the existing private reconciliation recovery
repository, downloads both into a separate readback directory, and verifies the
hashes and downloaded Git bundle. The resulting execution plan still authorizes
no cleanup. Branch or worktree removal remains a separately approved gate tied
to the exact selection fingerprint and bundle SHA-256.

Build the separately governed cleanup packet in dry-run mode with:

```powershell
node scripts/repository/execute_archive_cleanup_v1.mjs
node --test tests/contracts/repository_archive_cleanup_executor_v1.test.mjs
```

Dry-run is the default and performs no cleanup. Never add `--execute` unless an
owner authorization artifact matches the generated selection fingerprint,
execution fingerprint, action-manifest hash, base and supplement bundle hashes,
and exact action counts. Re-run the dry-run after any authority or target drift;
do not edit the packet to preserve a stale approval.

The executor deliberately passes `--no-verify` only for its governed remote
deletion and restoration pushes because this operator worktree is sparse while
the repository pre-push hook requires a full checkout. Before that bypass, the
executor requires a tracked-clean worktree, exact authorization, recovery
verification, and a second complete live revalidation. Remote deletion remains
atomic and protected by one exact SHA lease per ref. See
`docs/contracts/REPOSITORY_ARCHIVE_CLEANUP_EXECUTION_V1.md`.

On Windows, a clean Git status does not prove that Git can delete a worktree.
Ignored Flutter and Node directories can contain junctions or symbolic links
that make `git worktree remove` unregister the worktree before filesystem
deletion fails. The governed executor must inventory every reparse point, bind
its source and preservation destination into the authorization fingerprint,
relocate it outside the target, and track the worktree before removal starts.
If a partial directory remains, preserve it and reconstruct the exact worktree.
Never use broad `git worktree prune`, `git clean`, or recursive deletion as a
repair shortcut.

## 8. External-Action Boundaries

The following actions require explicit authorization even when repository and
browser access already exist:

- submitting a store release for review;
- publishing to production or broadening audience access;
- accepting legal agreements or rating terms;
- changing account roles, permissions, billing, or credentials;
- transmitting review credentials or personal contact details;
- applying a production database migration or bounded production payload not
  already covered by an explicit approval;
- destructive cleanup or irreversible external mutation.

Drafting metadata, running read-only audits, building locally, and preparing
artifacts do not authorize those actions.

## 9. Current Store Handoff

As of the current `2026-08-17` readback:

- the existing verified Google Play organization account and Grookai Vault app
  were found;
- the package is `com.grookai.vault`;
- the last directly read setup count was `9/11`, before the rating submission;
- Content ratings is now actioned;
- Advertising ID and photo/video permission declarations need attention;
- store listing media remains open;
- descriptions are saved as drafts and have not been sent for review;
- App Store Connect listing and review credentials are not freshly verified;
- all six declared store media assets are prepared and dimension-verified.

The authoritative current detail is:

- `docs/audits/store_release_readiness_v1/external_console_status.json`
- `docs/checkpoints/product/STORE_MEDIA_PREPARATION_20260817_V1.md`

If those facts change, update the status artifact and create a new checkpoint.
Do not edit this dated handoff in place to simulate historical continuity.

## 10. Handoff Standard

Every substantial task ends with:

- branch and exact commit;
- what changed;
- tests and direct readbacks performed;
- artifacts/checkpoint paths;
- production or external state actually reached;
- explicit remaining gates;
- any action the founder truly must perform and why automation cannot perform
  it.

Do not hand back a generic request such as "configure access" or "check the
console." Name the exact screen, account, field, and missing evidence, after
proving the repository and existing sessions cannot answer it.
