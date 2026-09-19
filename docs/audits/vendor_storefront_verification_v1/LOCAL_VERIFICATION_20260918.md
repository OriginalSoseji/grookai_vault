# Storefront verification follow-up — September 18, 2026

Continues the existing uncommitted candidate in
`C:/grookai_vault_storefronts_v1`, branch `feature/vendor-storefronts-v1`.
Starting HEAD and GitHub main both resolve to
`a14388f689235d62b3165c1dd88aaa4c562ab186`.
`starting-source.json` records the 85 pre-existing changed files; the preceding
custom implementation's 84 source hashes matched before this work began.
Previous storefront and custom receipts are historical evidence and remain intact.

## Isolated Supabase gate

`scripts/tests/prepare_storefront_supabase_verification_v1.mjs` prepared a separate
project `grookai-storefront-verification-20260918` under
`.local/storefront/supabase-verification`. It copied all 396 migrations with
byte hashes, checked unused ports 16421/16422/16423/16424/16428, disabled seed and
migration execution, and copied no credentials or linked-project metadata.
Preparation is not migration replay.

Docker Desktop is running but its daemon did not answer bounded 10-second
checks through either Windows named pipe or a direct `_ping` on its internal
Unix socket in the dockerd namespace. WSL itself answered. A task-specific
Supabase status process also hung and was stopped. Shared listeners 54321 and
54330 remain present. No Docker/WSL restart, container reset, volume deletion,
new container start or real Supabase migration was performed.

Full historical replay and actual GoTrue/Storage/refresh/policy verification
remain blocked. Before replay, the dedicated project's preparation manifest
requires an internal network with outbound access disabled and verified
`cron.launch_active_jobs=false` on its PostgreSQL cluster. Historical migrations
must not activate scheduled workers. Do not enable migrations before those
controls are established. Restarting the shared Docker engine needs explicit
coordination because the user required preserving shared services.

## Read-only integration review

PR #473 remained open at head
`6e747bb1561354fc56b62c73be39f258da506f15`.
A temporary three-way combination of its `lib/main.dart` with the candidate's
route changes returned exit 0 without conflicts. Only comparison files under
`.local/storefront/pr473-comparison` were written. This establishes textual
compatibility for that file, not full combined-client runtime acceptance.

The active mapping worktree remained at
`208ddd290c61ca0dae4d2b56e2eaeca4dd04024b` with its staged fixtures, search changes
and repair evidence preserved. No catalog/printing/warehouse writer or Vault-add
source was changed by this follow-up.

Integration must account for new dependencies on `auth.users`,
`vault_item_instances` and `wall_sections` from the original storefront migration.
The custom migration adds dependencies on the new storefront tables. No foreign
key targets a canonical card or printing table, but the additive schema can still
invalidate a frozen repair fingerprint. Recompute and reconcile that fingerprint
before any separately authorized schema release; this work did not contact another
operator or change repair evidence.

## Physical native proof

Device: Samsung SM-S908U. `device-journey.log` records one passing physical test:
actual production widgets create a draft, save price 42.50 and quantity 2,
open Android's gallery picker, upload the synthetic PNG through the pinned Dart
Storage SDK, render its owner preview, explicitly publish, verify the visitor
response excludes the private SKU, and unpublish. The test saved product
`36cc45aa-0bf7-4271-9abe-f241b42885bf`. Earlier attempts failed on test-driver
scrolling and the adapter's multipart limitation; neither is recorded as a pass.

An ordinary debug build of the same isolated shell passed three observed
intent journeys: cold product owner-preview link, warm authenticated visitor store
link, and denied visitor link to the unpublished product. Five inspected PNGs
record preview, deep-link rendering, distinct sibling GVVIs in the mixed grid,
seller-provided custom details and the generic unavailable state. Synthetic rows
without stored image bytes show the honest missing-image placeholder.

The 49-test synthetic SQL suite was rerun before the device journey. After the
adapter correction, all nine custom API/browser scenarios passed again, including
upload rejection, cross-owner access, stale saves, media revocation and app/web
parity. The focused two-file shell analysis passed. Logs and JSON receipts are
stored alongside this report. This follow-up changes no product logic or migration.

The test shell uses application ID `com.grookai.storefrontproof`, importing actual
candidate screens/services through a path dependency with the candidate's pinned
package versions. It does not initialize the production application, Firebase or
global Supabase session. Owner/visitor tokens are synthetic and HTTP clients allow
only the dedicated loopback ports 15439 and 15440 through ADB reverse forwarding.
The installed `com.grookai.vault` and locked-acceptance apps are not replaced.

The physical run exposed a synthetic-adapter limitation: the pinned Dart Storage
SDK submits multipart uploads with an empty filename. The adapter previously
accepted only raw bytes. Its test-only upload parser now accepts the bounded
multipart format while retaining ownership checks, allowed MIME types and the
5 MiB file limit. No production upload code or migration was altered for this.

Java initially rejected the machine's Norton HTTPS inspection certificate. The
build used a task-local copy of JBR's trust store augmented with the already
Windows-trusted public Norton root. System trust, TLS verification and repository
dependency versions were not changed. The local certificate store is not committed.

### Reproduce the physical check

Start only the verified synthetic cluster, adapter with `--custom` and guarded
Next launcher using the commands in the previous custom implementation receipt.
Do not substitute a production environment. Keep the synthetic fixture PNG local.

1. Create an empty separate shell with
   `flutter create --no-pub --platforms=android --org com.grookai --project-name storefrontproof .local/storefront/device_harness`.
   Preserve an existing shell instead of recreating it.
2. Run `node scripts/tests/prepare_storefront_device_shell_v1.mjs`. This copies the
   checked-in shell template, actual production path dependency, root lockfile and
   test sources; it writes only synthetic tokens into ignored local defines.
3. In the shell run `flutter pub get --offline`. Confirm every common package
   version matches the candidate's lockfile; the executed build had zero version
   differences for production dependencies.
4. Add device-specific ADB reverse mappings for 15439 and 15440. Push only the
   synthetic `GrookaiStorefrontProof-20260918.png` into Pictures and scan that file.
5. Run `flutter test --no-pub --dart-define-from-file=fixture-defines.json -d <device> integration_test/storefront_device_test.dart`.
   At `DEVICE_PICK_PHOTO`, select only the synthetic photo and tap Done in the real
   Android picker. Capture the preview at `DEVICE_PREVIEW_READY`; do not retain
   unrelated gallery contents or device notifications in receipts.
6. For explicit deep links build the normal shell with
   `flutter build apk --debug --no-pub --dart-define-from-file=fixture-defines.json`,
   install only its `com.grookai.storefrontproof` package, and send VIEW intents
   explicitly to `com.grookai.storefrontproof/.MainActivity`. Use
   `grookai://store/test-store`, and `/products/<saved-id>?preview=1` for preview.
7. Stop only owned test services and remove only the task's ADB mappings/app/image.

This shell injects synthetic authenticated identities. It does not prove production
login, OAuth refresh, Universal/App Link association, pending navigation through the
full main shell, camera capture, or a full installed-client branding/setup journey.
Those remain native integration acceptance work after actual local Auth is available.

## Release boundary

No push, merge, deployment, remote migration, production grant, payment or worker
activation is authorized or performed. Existing rollout switches retain the
documented data-preserving rollback. Real Supabase proof, combined native auth
journeys, catalog dependency coordination and a separately reviewed release remain
distinct gates.

## Cleanup and final source

Stopped only this task's PostgreSQL 15438, adapter 15439 and Next 15440 processes.
Removed the separate proof app, its two ADB reverse mappings and its exact fixture
image/UI dump. Both pre-existing Grookai app packages remain installed. Restored
only Next's generated local-dist typing changes; no candidate source was reset.
Local database, build and prepared Supabase project data remain for reproduction.

`final-source.json` records final source hashes and the changes relative to the
starting manifest. Existing implementation migrations and prior audit receipts
remain byte-identical. The follow-up changes the synthetic HTTP adapter, adds
isolated verification harness/preparation files and receipts, and appends pointers
to AGENTS/operator documentation. No release artifact was published.
