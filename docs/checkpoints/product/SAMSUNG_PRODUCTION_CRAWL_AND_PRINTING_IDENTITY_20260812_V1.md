# Samsung Production Crawl And Printing Identity Repair V1

Date: 2026-08-12

Status: MIGRATION AND SIGNED CANDIDATE VERIFIED / STORE DISTRIBUTION GATE OPEN

## Context

The signed-in Android production build was crawled on a physical Samsung
SM-S908U after a request to exercise the complete app without allowing the
device to time out. The installed production package was
`com.grookai.vault` version `1.0.0 (23)`, last updated on 2026-08-09.

The frozen source baseline for the crawl was:

- branch: `main`
- commit: `26c93a6e1a6d52110fb986716544f4dfcd3833ba`
- worktree: `C:\grookai_vault_memory_link_release`

## Safety Boundary

- No vault, wall, binder, Memory, message, scanner, pricing, or profile data
  was intentionally created, edited, archived, removed, or published.
- The scanner camera permission and live preview were exercised, but no image
  was captured or submitted.
- Theme was temporarily changed to Dark and restored to Auto.
- The production Samsung package was not uninstalled or cleared. It was later
  updated in place with the matching-certificate signed candidate after all
  database and CI gates passed.
- A fresh debug build was installed only on the logged-out Android emulator.
- The new database migration was applied only after strict preflight and full
  local migration replay passed.

## Physical Samsung Coverage

The crawl exercised these signed-in production surfaces:

- startup and session refresh
- Pulse, Discover, and Following
- Wall
- Vault and exact-copy detail
- Search, a constrained Charizard query, and card detail
- Binders, binder detail, Activity, Members, and Settings
- Memories and a Memory entry
- Messages and a thread
- Account and the full application menu
- Nearby and Nearby Map
- Dex and a Pokemon detail
- Sets and an `SV` filter
- Compare
- Grookai Objects: Memory, Sale, and Lot
- Followers and Following
- Getting Started
- Scanner permission and live camera preview
- Vendor Tools
- Light, Dark, and Auto theme rendering

The production build loaded live cards and images on Wall, Vault, Search,
Binders, Memories, Messages, Nearby, Dex, Sets, and Grookai Objects. No app
fatal exception, unhandled Flutter exception, RenderFlex overflow, or
app-request failure was found in the captured session logcat.

## Findings

### Production Build Drift

The installed Samsung build predates current `main`. Tapping a Memory entry
opened the owned-card detail in that installed build. Current source already
contains the dedicated Memory detail route, so this is a distribution drift
rather than a new source defect.

### Exact Printing Visibility

Printing identity was not consistently visible on Memory, Sale, or Lot
objects. This violated the product invariant that every displayed card must
state which variant is being shown, or state honestly that the printing is
unassigned or unavailable.

The crawl also exposed live legacy identity gaps:

- one owned Charizard copy displayed `Printing unassigned`;
- some message contexts displayed `Printing not recorded`;
- another message thread displayed an exact `Printing: Normal` value.

The repair does not infer missing variants. It renders exact evidence when
present and explicit unresolved labels otherwise.

### Backend Coverage Gaps

The production UI honestly surfaced two existing data gaps:

- Vault cards with `Value pending`;
- 509 of 680 Sets with `Date pending` during this crawl.

These are backend coverage tasks, not Android runtime failures, and this
repair does not fabricate either value.

## Repair

The source repair propagates exact-copy printing identity through:

- Memory, Sale, and Lot builder sources;
- persisted Grookai Object fields with backward-compatible fallback values;
- Memory, Sale, and Lot front renderers;
- Lot back item rows;
- destination/social export subtitles;
- Memory owner feed and accessible Memory detail models;
- card-detail Memory and Sale launch actions, resolved from the selected
  owned `gv_vi_id` rather than the family-level finish selection.

The renderer contract is now:

- exact evidence: `Printing: <finish>`;
- linked copy without assignment: `Printing unassigned`;
- legacy object without identity fields: `Printing not recorded`;
- assigned child whose label cannot be read: `Exact printing assigned`.

## Migration

`supabase/migrations/20260812183000_collector_memory_printing_identity_v1.sql`
replaces two read RPCs so they expose only the printing identity already
linked to `vault_item_instances.card_printing_id`:

- `collector_memories_for_owner_v1`
- `collector_memory_accessible_by_id_v1`

The migration:

- performs no insert, update, delete, archive, or cleanup;
- requires the printing child to belong to the same parent `card_print_id`;
- preserves owner-only Memory feed access;
- preserves governed signed-in public Memory visibility;
- revokes `public` and `anon` execution;
- grants execution only to `authenticated`.

It was applied to production on 2026-08-12 after the release worktree proved
that it was the only local-only migration. Post-apply ledger, schema, grant,
security-setting, and authenticated execution readbacks all passed.

## Verification

- Full Flutter suite: `614/614` passed locally and in GitHub CI.
- Grookai Object renderer suite: `19/19` passed.
- Static analysis: no issues.
- Diff whitespace validation: passed.
- Fresh Android debug build: passed.
- Emulator startup smoke: passed.
- Emulator startup logcat: no app crash, Flutter exception, overflow, or
  request-failure signature.
- Strict Supabase migration preflight: passed.
- Full local migration reset/replay through `20260812183000`: passed.
- Production migration ledger readback: reconciled.
- Function signature and return-column readback: passed.
- Function grant readback: authenticated only; `anon` and `public` denied.
- Authenticated read-only owner-feed and detail execution proof: passed and
  rolled back.
- Signed Android artifact GitHub run `31660604012`: passed.
- Physical Samsung matching-certificate in-place install: passed.
- Signed-candidate emulator render and logcat smoke: passed.

Release CI stabilization commit:

- `a12e8a230e5ac6a2ebb2b71088b6cf09888d9c04`

Migration SHA-256:

- `B666D783E06A92A9D6F3DD19FFC3CCD7BA70B2AAE822DFE13009BDB93F26A529`

Signed release APK:

- version: `1.0.0 (23)`
- SHA-256:
  `CE261BB15F8DAE617639A7904F29B6E892D64D342459463A582D2EB42EC31E3D`
- signer certificate SHA-256:
  `51E518EF647B2BD5C1C91D3D00D08E1FE3192AF633B2AF6741A67FDCE872E033`

Permanent migration and signed-build audit:

- `docs/audits/collector_memory_printing_identity_v1/20260812_MIGRATION_AND_SIGNED_ANDROID_PROOF.md`

Fresh debug APK:

- path: `build/app/outputs/flutter-apk/app-debug.apk`
- SHA-256: `89E713546EE62C82AA04DD6CB5237D66BBE8BF84DE9381C0A19ECD6E887BF3F3`

Evidence directory:

- `artifacts/samsung_prod_crawl/2026-08-12T11-30-12/`
- physical-session logcat SHA-256:
  `BD841B7E2EAC5D466E6C46261211D50571E093564C35BCC8911C733651A9DEE1`
- final repaired-emulator logcat SHA-256:
  `207782CE8A205D8215BCA11ACAEC41399649A7F3908599BE0C22C7A06E99055B`

The evidence directory is intentionally local and gitignored because it
contains device screenshots and large runtime logs. This checkpoint is the
permanent repository record.

## Current Truths

- The crawled Samsung production build is broadly functional across the
  tested signed-in surfaces.
- The Samsung now has the matching-certificate signed candidate from commit
  `a12e8a230e5ac6a2ebb2b71088b6cf09888d9c04`, installed in place with app data
  preserved.
- Current source enforces printing visibility across Grookai Objects without
  inventing missing identity.
- Current source and the signed release artifact pass the automated, CI,
  signing, physical-install, and emulator-render gates.
- The read-only Memory printing migration is applied, ledger-reconciled, and
  authenticated-readback proven.
- The physical handset accepted and launched the build without runtime
  failures. Its secure Doze/bouncer state prevented a valid UI screenshot, so
  the emulator supplied the visual-render proof rather than misrepresenting a
  black device screenshot.

## What Must Never Be Broken

- Never infer an exact printing from card family, image appearance, rarity,
  price, or currently selected family finish.
- Never replace an unresolved printing label with a plausible finish.
- Never expose private Memory rows through the accessible Memory route.
- Never mutate collector data during a crawl or read-model migration.
- Never uninstall or clear the production mobile app merely to bypass a
  signing mismatch.

## Exact Next Gate

1. Assign a new mobile build number and distribute the frozen release commit
   through the normal Android/iOS store pipelines.
2. Perform a short signed-in acceptance check on the distributed build for
   one exact and one genuinely unassigned printing.
3. Treat any missing exact printing as a data-coverage issue; never infer it
   in the client.
4. No further schema or implementation change is required for this gate.
