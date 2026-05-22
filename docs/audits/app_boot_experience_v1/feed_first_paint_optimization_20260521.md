# FEED_FIRST_PAINT_OPTIMIZATION_V1

Date: 2026-05-21

## Scope

Mobile Feed perceived-speed pass only.

Implemented:

- Feed skeleton for true cold starts.
- Per-mode/per-intent first-page cache using local `SharedPreferences`.
- Cached rows remain visible while a fresh feed RPC runs.
- Refresh banner distinguishes cached content from live refresh.
- Refresh failure keeps cached cards visible and shows a small status banner.

No feed RPC, ranking, DB, scanner, pricing, Species Dex, or identity behavior changed.

## Cache Boundary

Cache key:

```text
grookai_network_feed_cache_v1:<feedMode>:<intent>
```

Stored data:

- first page rows only
- safe feed display fields
- in-play copy summary fields needed by existing card actions

Not stored:

- Supabase secrets
- auth tokens
- raw RPC payloads
- pricing objects
- ownership state

## UX Behavior

Cold start with no cache:

```text
skeleton cards -> live feed
```

Cold start with cache:

```text
cached cards + "Showing recent cards while refreshing" -> live feed
```

Refresh failure with cache:

```text
cached cards + "Showing recent cards. Refresh failed."
```

Filter changes:

```text
clear current rows -> restore matching cache if available -> refresh matching feed
```

## Device Smoke

Device:

```text
SM S908U
```

Second launch without reinstall:

```text
network_feed_cache_restored around 1.4s
network_feed_initial_render_ready around 4.4s
```

Result:

- Cached feed rows restored immediately after first shell frame.
- Live feed still refreshed in the background.
- Perceived feed availability moved from live network completion to local cache restore on repeat launch.

## Safety Confirmation

- No DB writes.
- No migrations.
- No scanner changes.
- No pricing changes.
- No Species Dex changes.
- No identity route changes.
- No feed resolver/RPC changes.
