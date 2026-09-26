# Vendor batch intake V1

Status: Active in the isolated vendor pilot. Receipt-backed commit is enabled only
there; production release is separate. See the latest batch and backup receipts.

September26: the user chose Simulator verification instead of waiting for a
physical phone. The normal-origin V31 feature-cache candidate is now released
to the existing shared isolated-pilot alias after direct-origin browser checks.
See ../audits/vendor_scan_pilot_release_20260926/RELEASE_20260926.md. Earlier
unreleased/physical-phone prerequisite statements below are historical. Native
picker, touch and TestFlight-container behavior remain unverified, not implied
by Simulator proof. Production release and payment activation remain separate.

September25 V32 adds an opt-in exact device-QA origin for a separate preview.
Each build still accepts only its own Origin. QA mode requires pilot, preview,
exact configured host, the isolated DB, telemetry off and payments absent.
The shared origin remains the default; no wildcard/forwarded-host authority.
Direct HTTPS and browser upload/review/reload proof pass on the QA alias.
Physical iPhone acceptance now awaits the user's TestFlight 328 workflow test;
manual testing supersedes the earlier Safari Web Inspector setup path.
See ../audits/vendor_scan_device_v32/IMPLEMENTATION_20260925.md.

September25 V31 completes the unshared hosted cache comparison. Seven reused
cases per build preserve output with observed median21.6→15.7seconds. Access,
cancellation, first retry,16MP limits and browser draft persistence are proven;
the browser final DB readback failure is retained and separately reconciled.
Feature serving remains off the shared alias until physical-phone qualification
and governed activation. The fixed pilot origin must not be weakened to make
unshared URLs testable. See ../audits/vendor_scan_runtime_v31/IMPLEMENTATION_20260925.md.

September25 V30 provisions the private pilot feature bucket and stages the pinned
objects with individual hash readback and denial tests for anonymous/two owners.
Staging does not enable any flag or waive target-runtime qualification. The full
Linux qualification passes all20,079 references and320 reused scans after the
requested DB-process review and controlled Docker recovery.17 Windows real-storage
worker cases pass. Hosted comparison and physical-device proof remain separate. See `../audits/vendor_scan_runtime_v30/IMPLEMENTATION_20260925.md`
for current upload status, resume commands and remaining release gates.

September24 V29 adds default-OFF `GROOKAI_STORE_SCAN_FEATURES_V29_ENABLED` within
the existing pilot/V24 gate. It selects a complete pinned feature manifest, V27
parent metadata, authorized feature delivery and an independently validating
disposable worker; it supersedes experimental V26 pipelining. It does not weaken
current anonymous canonical/public-printing authority, final public readback,
byte/time/concurrency/cancellation bounds or human review. No client-provided
feature arrays, IDs or flags can establish manifest or publication authority.
Missing/corrupt cache data fails closed. The expected private feature bucket is
not provisioned in this turn; do not enable the flag before target-runtime,
storage access and hosted resource/latency qualification. Windows local proof
passes; full Linux proof is blocked by Docker's unavailable engine. See
`../audits/vendor_scan_runtime_v29/IMPLEMENTATION_20260924.md` and proof.

September24 V28 is an offline reference-feature cache experiment. Its codec binds
exact pixels/keypoints/descriptors to a source-image hash and pinned preparation
contract; decoding requires an independently trusted artifact digest and bounded
validation before native allocation. Embedded image identity is not authorization.
No serving import, flag or delivery route is added. 320 reused cases retain exact
results; a 28-reference Linux check passes. Local CPU savings are not hosted proof:
cache transfer is larger. Future integration must preserve current canonical and
public-printing authorization before private delivery, final visibility checks,
deadlines, byte budgets, cancellation, isolated workers and human confirmation.
See `../audits/vendor_scan_runtime_v28/IMPLEMENTATION_20260924.md` and proof.

September24 V27 parent projection: `GROOKAI_STORE_SCAN_METADATA_V27_ENABLED`
defaults OFF and changes only the server's identity lookup. The generated gzip
binds all 20,079 exact reference identities to the frozen catalog hash, with
pinned artifact hash/size and bounded decompression. Current anonymous canonical
and public-printing authorization is still required before signing/delivery.
Bad or missing metadata fails closed without falling back to the full catalog.
The matching worker, ambiguity checks, deadline and human confirmation remain
unchanged. Hosted comparison demonstrates lower parent RSS, not faster matching.
See `../audits/vendor_scan_runtime_v27/IMPLEMENTATION_20260924.md` and proof.

September24 V26 experiment: `GROOKAI_STORE_SCAN_VISUAL_V26_ENABLED` defaults
OFF inside the existing pilot/V24/V2 authority and uses the same 30-second
budget and frozen matching rules. It overlaps reference delivery with scan
preparation, preserving full-catalog ambiguity decisions for selected IDs.
`GROOKAI_STORE_SCAN_RESOURCE_DIAGNOSTICS` separately defaults OFF and logs only
bounded own/child memory numbers and lifecycle outcome, never scan/user/image
identities. Unknown host limits remain unknown; the child V8 heap bound is not
an RSS limit. Hosted results do not demonstrate a performance improvement; do
not promote V26 on that basis. Read
`../audits/vendor_scan_runtime_v26/IMPLEMENTATION_20260924.md` for evidence,
failed attempts and the remaining resource/device gates.

September24 hosted V25 candidate: an additional default-OFF V25 flag selects
exact top-k evaluation of the frozen V19 distances inside the existing V24 gate.
V23 geometry and V20 ambiguity rules remain unchanged. V25 has one 30-second
matching budget; V24 and V2 retain 20 seconds. Reference delivery stays bounded
at 7 seconds. Browser cancellation is 40 seconds and the function ceiling 45 seconds,
allowing upload and final public authorization. Explicit caller cancellation
still disposes the worker through the existing protocol. No earlier-stage
completion resets the budget. Only the scan route opts into Vercel request
cancellation; `after()` keeps cleanup alive until the worker exits and its slot
is released. This does not change cancellation behavior on payment or other
mutation endpoints. See `../audits/vendor_scan_runtime_v25/IMPLEMENTATION_20260924.md`
for failed hosted attempts and the current unshared candidate's qualification.

September24 visual runtime candidate: V24 uses the frozen V19/V23/V20 visual
retrieval, geometry and ambiguity guards behind a separate default-OFF flag.
The worker receives no credentials or network capability; the server delivers
only hash-checked, bounded reference bytes after anonymous current canonical and
public-printing checks. One deadline spans startup, retrieval, delivery and
matching. Final route visibility/printing checks and human confirmation remain.
This is locally proved integration, not hosted activation. See
`../audits/vendor_scan_runtime_v24/IMPLEMENTATION_20260924.md` for bounds, evidence,
packaging, consumed plans and the unshared hosted release gate.

September24 search recovery: inventory catalog search uses the existing anonymous
`search_game_card_prints_v4` boundary, followed by an anonymous bounded-ID read
and the public printing reader. Each page retains a20-row window from each
supported game (up to60 rows); advancing offset by20 must not skip rows by
truncating the merged result. Manual catalog expansion does not enable expanded
recognition. Read `../audits/vendor_scan_expansion_v13/RELEASE_CHECKPOINT_20260924.md`
for the current pilot deployment and outstanding recognition/device limits.

The original image-only matcher failed real scan validation and remains retired.
V2 suggestions passed the bounded isolated-pilot real-corpus gate and use a separate
server flag. See `../audits/vendor_batch_intake_v1/SCAN_MATCHING_V2_20260923.md`
for evidence, retained abstentions, 321-reference coverage and rollback.

The desktop vendor inventory workspace owns scan intake. Each reviewed item is
one physical copy; matching artwork or hashes never collapse distinct copies.
Front/back pairs produce one item. Missing backs require explicit correction or
the per-copy front-only choice. Sellers confirm the canonical card and an existing
eligible printing; the client never invents printing identities or finishes.

Originals and JPEG display derivatives are retained in browser IndexedDB, scoped
by store, with one active draft and a local preset per store. They are not cloud
backups or a server authorization boundary. Shared-browser privacy and retention
must be resolved before release. Compare-and-swap revisions prevent stale tabs
overwriting newer drafts, including resurrecting a deleted persisted draft.
Storage failure stops editing. Clearing site data removes these local drafts.

The current limits are 50 copies, 20 MiB per original, 250 MiB originals per batch,
40 megapixels after decode, and 4 MiB per JPEG derivative. HEIC is decoded with
the pinned heic2any package. Derivatives use oriented canvas output; originals
are not overwritten. Invalid or failed decodes stay visible and block review.
These bounds are not evidence of measured 50-copy performance or decoder safety
under every malformed input.

Condition, sale status, manual asking price, currency, sections and private
location are proposed draft values. Bulk defaults preserve per-copy overrides
unless explicitly replaced. Changing identity clears the prior printing and
confirmation. Listing requires explicit selection and a positive asking price.
Market pricing is deferred by the founder; no inferred prices or repricing.

GET /api/stores/owner/intake authenticates and checks the existing database-backed
store access before reporting capabilities. The receipt-backed commit is governed below and enabled only in the isolated pilot. Recognition
requires the V2 flag, Vendor Pilot mode, fixed isolated database and matching index
database. The old V1 flag grants nothing. Returned orientations apply only after
explicit match selection and never rewrite originals or confirm a printing.
Without the new commit gates, POST returns 503 and creates nothing. No environment flag may enable a wrapper
around repeated non-idempotent legacy create requests.

Automatic matching is a still-scan candidate source, never identity authority.
The initial version compares normalized color and image structure with 321 exact
canonical reference images from the pilot's 326-card sample catalog. Non-exact
artwork is excluded. Reference bytes are hashed against retained storage readback;
the serving artifact contains descriptors and public canonical identities only.
The historical 24,821-row CLIP index is not deployed or claimed as current coverage.

The match route requires same-origin, authentication, database-backed store access
and rollout. Bodies are streamed with a 4 MiB cap, raster signatures/decoding,
16-megapixel limit, single-frame requirement, minimum size, card aspect and detail
gates. A process-local concurrency/rate bound is defense in depth, not a distributed
quota. Scans are processed in memory without storage or telemetry. No caller URL
is fetched. Current anonymous card visibility, exact image identity/path and the
quarantine-aware printing reader revalidate every returned candidate. No current
eligible finish means no suggestion. Artifacts must be rebuilt when artwork changes.

Suggestions have no percentage confidence or automatic card/finish assignment.
Weak images and missing references abstain; identical artwork remains ambiguous.
Manual search stays available. Front replacement clears the previous identity.
Client responses are bound to store/copy/front/rotation, aborted and discarded on
navigation; suggestions for another copy must never populate the active review.
Clear tightly cropped fronts are the supported input. Rotate sideways scans using
Photo tools. Broad perspective/glare/camera and multilingual coverage requires a
larger independent physical-card benchmark before production release. The existing
one-real-positive and transformed-reference tests are initial pilot evidence only.

Before commit is enabled, add a governed database receipt keyed by owner/store,
batch and item with atomic copy creation, immutable request identity, concurrency
and timeout reconciliation. Revalidate ownership, package, canonical visibility,
printing parent/GV-ID/quarantine, sections and disclosure eligibility at commit.
Media and metadata failures must not expose incomplete intended listings. Store
selection is last; ordinary pricing's legacy Wall side effects must be accounted
for. A retry must reconcile the same GVVI, never create a replacement copy.

Recognition must follow SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1.md. The
existing fixture-zero-vector artifact is not a recognition backend. Candidate
suggestions need a verified canonical reference artifact, local benchmark and
honest abstention. Human identity/finish confirmation remains required.

Schema work requires the migration contract's fresh strict baseline and isolated
full-chain replay. Preserve prior proof databases and repair dependencies. New
FKs require dependency review before integration. No production apply, scanner
endpoint invocation, worker activation or deployment is implied by this contract.

See ../ops/VENDOR_BATCH_INTAKE_20260923.md for the current checkpoint and proof.

## Receipt-backed submission candidate — September 23

Migrations 20260923040000 and 20260923050000 add a disabled control, owner-readable
receipts and service-only prepare/finalize functions. The server derives owner and
store from authenticated context. No caller may choose an inventory ID or media URL.
Preparation atomically allocates one archived hold GVVI and its immutable request.
Repeated owner/store/batch/item requests reuse it; changed requests return PT409.
A database store lock also enforces the 50-copy bound. Existing Vault identity
allocation remains authoritative. No active inventory or legacy quantity changes
until finalization.

Each photo uploads separately, below the hosted request-body limit, to the existing
private user-card-images bucket. The server checks exact SHA256, full raster decode,
single frame, 40 MP and 4 MiB limits. No overwrite is allowed. Ambiguous uploads
are reconciled by download/hash. Finalization checks both media objects and repeats
current package, section and canonical/printing eligibility, then atomically sets
active ownership, legacy quantity, media, condition, asking price, private location
in notes, section memberships and explicit store selection. Sale intent can make a
copy visible on the existing collector Wall; the confirmation explains this. Store
publication never changes and sections are not implicitly selected for the store.

The browser persists the exact request and derivative Blobs before its first write.
Pending submissions cannot be edited, re-paired or cleared. Reload and retry use
the saved request, even if the current review action chooses a different listing
mode. Completed receipts skip upload and never replace a subsequent owner photo.
An archived or transferred completed copy is never recreated or reactivated.
Owner receipt inspection survives package loss; new writes require current access.

GROOKAI_STORE_BATCH_COMMIT_ENABLED plus the database control enable writes only
against the exact dedicated 26421 local target or isolated vendor pilot. The local
Next mode also requires staging, telemetry off, no Vercel target and its dedicated
output directory. Environment grants cannot replace database package authority.
The pilot flag and control stay off until its separate migration/release proof.
Pending cancellation/edit-after-rejection and cross-device draft recovery are not
implemented; retain the original browser draft and resolve eligibility before retry.
No production activation, catalog mutation, billing or payment action is included.

## Portable backups — September 23

The explicit .gvbatch download preserves originals, derivatives, settings and frozen
submission IDs. It is a private, unencrypted local file, not automatic cloud backup.
Import checks store and database environment, bounded framing and media fingerprints;
it discards remote image URLs and claimed completion. Unsubmitted copies require
review again. Restored pending/completed submissions reconcile through existing
server authority using the same batch/item IDs. No import submits or publishes.

Restore replaces only an empty local workspace under an atomic IndexedDB comparison.
A fresh storage epoch is checked by saves, clears and further restores so old tabs
cannot overwrite restored data even when IDs and numeric revisions coincide.
Backups must be downloaded before data loss. Cancellation of a permanently rejected
server submission remains deferred to a governed server transition.


## Cancellation candidate (2026-09-23, local only)

The additive060000 migration adds owner-readable cancellation tombstones. Only the authenticated owner API may request the service mutation; public, anonymous and authenticated direct mutation grants remain absent. Cancellation takes the same store/receipt/copy locks as finalization. An already completed copy returns its original receipt. A cancelled item ID is permanently rejected by prepare and finish, including requests arriving later from an old tab or backup. Prepared archived instances and private media remain retained for audit.

Correction uses a new item ID after confirmed cancellation and requires identity/settings review again. The database counts at most50 non-cancelled attempts in each batch, including completed copies. Subscription expiry and paused adding do not prevent cancellation or owner recovery. Imported completion/cancellation flags never unlock a new attempt.

The feature requires the separate cancellation environment flag, restricted to the exact276xx local lab or existing isolated pilot; default off. Passing local proof does not enable the pilot or production. See docs/audits/vendor_batch_cancellation_v1/IMPLEMENTATION_20260923.md for current status and failed-fixture receipts.
