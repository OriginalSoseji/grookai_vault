# MY WALL FOLLOWER COUNT FIX V1

## Purpose
Fix the signed-in My Wall header so follower/following counts reflect real relationship totals.

## My Wall Count Path Audit
- My Wall owner file: `lib/main_shell.dart` via `_MyWallTab`
- service method used:
  - `PublicCollectorService.resolveOwnEntry()` to resolve the signed-in user's slug
  - `PublicCollectorScreen(slug: ..., showAppBar: false)` for the actual wall surface
  - `PublicCollectorService.loadBySlug()` inside `PublicCollectorScreen`
- whether it reuses public profile count path: yes
- whether it uses the new RPC: yes, through `loadBySlug()` -> `loadPublicProfileBySlug()` -> `_loadFollowCounts()` -> `public_collector_follow_counts_v1`
- likely mismatch point:
  - not a separate My Wall service path
  - likely stale runtime/widget state, stale build, or an environment/runtime that had not yet picked up the new RPC-backed service path when the `0 followers` screenshot was observed

## Truth Comparison
- slug: `imnotcesar`
- user id: `03e80d15-a2bb-4d3c-abd1-2de03e55787b`
- raw truth: `1 follower`, `2 following`
- RPC result: `follower_count=1`, `following_count=2`
- My Wall service result:
  - `resolveOwnEntry()` resolves the signed-in slug
  - `PublicCollectorScreen` then uses the same RPC-backed `loadBySlug()` path as public profiles
- UI result: user-reported `0 followers` on My Wall before this pass
- mismatch owner: retained My Wall state in the shell, not a separate count query

## Self Path Audit
- separate self path exists: yes, but only for slug resolution via `resolveOwnEntry()`
- stale mapping exists: no separate self-only count mapping found
- zero fallback exists: no My Wall-specific hardcoded zero count path found
- shell retention risk: yes; `MainShell` keeps `_MyWallTab` inside an `IndexedStack`, so stale profile data can persist until the tab reloads
