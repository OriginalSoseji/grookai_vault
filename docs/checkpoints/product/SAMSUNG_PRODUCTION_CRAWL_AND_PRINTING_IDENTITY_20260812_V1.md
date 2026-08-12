# Samsung Production Crawl And Printing Identity Repair V1

Date: 2026-08-12

Status: LOCAL REPAIR VERIFIED / DATABASE AND DISTRIBUTION GATES OPEN

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
- The production Samsung package was not uninstalled, cleared, or replaced.
- A fresh debug build was installed only on the logged-out Android emulator.
- The new database migration was not applied.

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

It remains unapplied at this checkpoint.

## Verification

- Full Flutter suite: `614/614` passed.
- Grookai Object renderer suite: `19/19` passed.
- Static analysis: no issues.
- Diff whitespace validation: passed.
- Fresh Android debug build: passed.
- Emulator startup smoke: passed.
- Emulator startup logcat: no app crash, Flutter exception, overflow, or
  request-failure signature.
- Local Supabase migration/RLS smoke: not run because the Docker Desktop
  Linux engine was unavailable on this machine.

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
- That installed build is stale and does not contain this repair.
- Current source enforces printing visibility across Grookai Objects without
  inventing missing identity.
- Current source and the fresh debug artifact pass the available automated
  and emulator gates.
- The read-only Memory printing migration is locally contract-tested but not
  database-smoke-tested or applied.
- A physical current-build proof is still required after normal signing and
  distribution.

## What Must Never Be Broken

- Never infer an exact printing from card family, image appearance, rarity,
  price, or currently selected family finish.
- Never replace an unresolved printing label with a plausible finish.
- Never expose private Memory rows through the accessible Memory route.
- Never mutate collector data during a crawl or read-model migration.
- Never uninstall or clear the production mobile app merely to bypass a
  signing mismatch.

## Exact Next Gate

1. Run the migration and RLS smoke suite in a DB-capable environment.
2. Apply the read-only migration through the normal governed release path.
3. Build and distribute a newly signed Android/iOS candidate from the repair
   commit.
4. On a signed-in current build, verify one exact printing and one genuinely
   unassigned printing across Memory, Sale, Lot, export/share, and Memory
   detail.
5. Confirm no collector data changed during readback, then close the gate.
