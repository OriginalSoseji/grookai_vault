# PERFORMANCE AUDIT V1

## Purpose
Audit Grookai Vault mobile for real performance bottlenecks before running an optimization pass.

## Scope Lock
- audit only
- no redesign
- no feature work
- no speculative fixes

## Audit Targets
- main shell
- Explore/Search
- Vault
- Network
- Messaging
- Public GVVI
- Manage Card
- image-heavy shared widgets

## Static Code Audit

### Main Shell
- file: `lib/main_shell.dart`
- risk level: high
- bottleneck type: shell/navigation retention, hidden tab startup work
- evidence:
  - `_shellPages` eagerly instantiates `HomePage`, My Wall, `NetworkScreen`, and `VaultPage` in `initState`.
  - `IndexedStack` keeps all tab trees alive under the active shell.
  - hidden tabs still trigger `initState` work, including network fetches and vault reloads before the user opens those tabs.

### Explore/Search
- file: `lib/main.dart`
- risk level: medium
- bottleneck type: async preloading, per-tile ownership futures, image rendering
- evidence:
  - `_loadTrending()` fetches trending rows, pricing, and primes ownership on first load.
  - results rendering is relatively healthy because it uses `CustomScrollView`, `SliverList`, and `SliverGrid`.
  - tiles still attach `ownershipFuture` work and shared image widgets with no decode-size hints.

### Vault
- file: `lib/main_vault.dart`
- risk level: very high
- bottleneck type: non-lazy grid/list composition, repeated list transforms, eager startup fetch
- evidence:
  - `reload()` runs in `initState`.
  - reload fetches canonical rows, then pricing and shared state in the same startup path.
  - `_buildVaultCards()` uses `GridView.builder(shrinkWrap: true, NeverScrollableScrollPhysics())` inside a parent scrolling surface.
  - list mode renders a full `Column` of all rows.
  - sorting/filter/grouping helpers rebuild derived lists on the UI path.

### Network
- file: `lib/screens/network/network_screen.dart`
- risk level: very high
- bottleneck type: non-lazy feed composition, heavyweight card surfaces, ownership futures per row
- evidence:
  - root screen uses a `ListView(children: [...])`.
  - `_NetworkStreamResults` renders `Wrap` for grid mode and `Column` for list modes, so visible feed pages are built eagerly.
  - every row calls `OwnershipResolverAdapter.instance.get(...)`.
  - cards use large poster images and layered card UI.

### Network Service
- file: `lib/services/network/network_stream_service.dart`
- risk level: medium
- bottleneck type: ranking/session work, repeated page assembly
- evidence:
  - mixed-source candidate selection, suppression, and session bookkeeping all happen per page fetch.
  - this work is off the build path, which helps, but it still contributes to feed refresh latency.

### Messaging Inbox
- file: `lib/screens/network/network_inbox_screen.dart`
- risk level: medium
- bottleneck type: non-lazy list composition, per-thread ownership futures
- evidence:
  - inbox uses `ListView(children: [...])` with a `Column` of tiles instead of lazy builders.
  - ownership is primed and read per thread card.

### Network Thread
- file: `lib/screens/network/network_thread_screen.dart`
- risk level: low to medium
- bottleneck type: detail-screen image cost
- evidence:
  - message list structure is reasonable after the keyboard stability fix.
  - main remaining risk is card/header image decode and refresh work, not list architecture.

### Public GVVI
- file: `lib/screens/gvvi/public_gvvi_screen.dart`
- risk level: medium
- bottleneck type: big hero content, ownership bridge future, detail-screen composition
- evidence:
  - viewer bridge uses `FutureBuilder<OwnershipState>`.
  - screen is detail-heavy, image-heavy, and likely okay in isolation, but still sensitive to large uncapped image loads.

### Public Collector Wall
- file: `lib/screens/public_collector/public_collector_screen.dart`
- risk level: medium
- bottleneck type: non-lazy wall card rendering
- evidence:
  - wall card list uses `Wrap` over all cards.
  - each tile may request viewer ownership state.
  - acceptable for small walls, but scales poorly.

### Manage Card
- file: `lib/screens/vault/vault_manage_card_screen.dart`
- risk level: medium
- bottleneck type: high-quality image decode, detail-screen composition
- evidence:
  - `_CardThumb` uses `Image.network(... filterQuality: FilterQuality.high)`.
  - this is fine for one card, but expensive if reused broadly or rebuilt often.

### Shared Image/Card Widgets
- files:
  - `lib/widgets/card_surface_artwork.dart`
  - `lib/widgets/network/network_interaction_card.dart`
- risk level: high
- bottleneck type: image decode/render cost
- evidence:
  - shared artwork components use `Image.network` without `cacheWidth` or `cacheHeight`.
  - network poster artwork also uses medium filter quality and large image presentation.
  - these widgets sit under Explore, Vault, Network, Public Collector, Messaging, and detail flows, so the cost is multiplied app-wide.

### Secondary Surfaces
- Search results:
  - owner: `lib/main.dart`
  - risk level: medium-low
  - evidence: lazy slivers are already in place; main risk is image and ownership future cost.
- Compare workspace:
  - owner: `lib/screens/compare/compare_screen.dart`
  - risk level: medium-low
  - evidence: secondary surface, ownership and image work present but lower traffic.
- Scanner identify results:
  - owner: `lib/screens/scanner/scan_identify_screen.dart`
  - risk level: medium
  - evidence: candidate list uses `Image.network` without size hints and ownership futures per candidate.

## Runtime Feel Audit

### Launch / Wall
- feel: slight roughness
- probable reason:
  - hidden tab startup work is happening before the user asks for it.
- evidence:
  - debug logs during launch showed network freshness session setup, ownership resolver activity, and vault reload while Wall was the visible tab.

### Explore
- feel: mostly smooth
- probable reason:
  - lazy slivers help; residual cost comes from image decode and ownership signal loading.
- evidence:
  - screenshots: `00_launch_wall.png`, `02_explore.png`, `02_explore_overlay.png`, `03_explore_scrolled.png`
  - debug performance overlay stayed reasonable during the sampled scroll.

### Vault
- feel: slight roughness with highest perceived scaling risk
- probable reason:
  - eager reload, non-lazy nested grid/list composition, and repeated derived list work.
- evidence:
  - screenshots: `08_vault.png`, `12_vault_scrolled.png`
  - surface remained usable in the simulator, but the code path is structurally the riskiest for larger collections.

### Network
- feel: slight roughness
- probable reason:
  - full-card feed items, large poster art, non-lazy row composition, per-row ownership futures.
- evidence:
  - screenshots: `09_network.png`, `11_network_scrolled.png`
  - overlay looked acceptable in the sampled run, but the feed builds whole result groups eagerly.

### Public GVVI
- feel: not freshly runtime-verified in this pass
- probable reason:
  - detail hero image cost and viewer-ownership bridge future
- evidence:
  - static audit only for this pass.

### Manage Card
- feel: not freshly runtime-verified in this pass
- probable reason:
  - large image decode and detail-screen rebuild weight
- evidence:
  - static audit only for this pass.

### Messaging Thread
- feel: layout usability restored; performance not a major hotspot in this pass
- probable reason:
  - main remaining cost is card art / header rendering, not message list architecture
- evidence:
  - static audit only for performance in this pass.

## Bottleneck Priority Map

### P0
- eager hidden-tab startup in `main_shell.dart`
  - why: creates visible launch roughness and does work for Network/Vault before the user asks for it.
- vault non-lazy grid/list architecture in `main_vault.dart`
  - why: most likely to degrade collection browsing as item count grows.
- network non-lazy feed composition in `network_screen.dart`
  - why: full feed pages are built eagerly, and each row is visually heavy.
- missing image decode-size hints in shared card art widgets
  - why: affects almost every premium surface in the app.

### P1
- sequential ownership resolution cost behind `OwnershipResolverService`
  - why: adapter caches futures, but many surfaces still fan out ownership lookups and some flows prime large ID sets.
- explore trending preload and per-tile ownership futures
  - why: not catastrophic, but visible on first-load and search-heavy sessions.
- public collector wall and messaging inbox non-lazy lists
  - why: secondary surfaces with the same structural pattern as Vault/Network, but lower scale.
- network service ranking/page assembly latency
  - why: async-only cost today, but worth tightening after UI-path fixes.

### P2
- const/widget hygiene in stable branches
- shadow/filter polish in card surfaces
- low-traffic detail-screen composition cleanup
- scanner candidate image optimization

## Optimization Pass Plan

### Pass 1
- lazy shell tab initialization in `lib/main_shell.dart`
- lazy/layered Vault rendering in `lib/main_vault.dart`
- lazy/layered Network rendering in `lib/screens/network/network_screen.dart`
- shared image decode hints in:
  - `lib/widgets/card_surface_artwork.dart`
  - `lib/widgets/network/network_interaction_card.dart`

### Pass 2
- reduce ownership fan-out and move expensive ownership work farther from scroll-hot item builds
- memoize or cache Vault derived row transforms where possible
- tighten Explore first-load prefetch behavior

### Pass 3
- clean up secondary list surfaces:
  - public collector wall
  - messaging inbox
  - scanner identify results
- trim lower-impact visual/render overhead

## Runtime Artifacts
- stored in `temp/performance_audit_v1/`
- representative captures:
  - `00_launch_wall.png`
  - `02_explore.png`
  - `02_explore_overlay.png`
  - `03_explore_scrolled.png`
  - `08_vault.png`
  - `09_network.png`
  - `11_network_scrolled.png`
  - `12_vault_scrolled.png`

## Audit Integrity Check
- files intentionally changed:
  - this checkpoint only
- implementation changes made:
  - none
