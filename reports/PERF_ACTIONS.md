Flutter UI/Perf

- Const usage: Add `const` to static widgets and paddings in high-frequency trees (lists, item tiles) to reduce rebuild costs.
- List virtualization: Ensure all long lists use `ListView.builder`/`GridView.builder` with `cacheExtent` tuned; avoid heavy work in `itemBuilder`.
- Image loading: Use `Image.network` with `cacheWidth`/`cacheHeight` set to 720x960 thumbnails when available; leverage `filterQuality: FilterQuality.low` for lists.
- Debounce search: Apply 250–350ms debounce on text input, enforce `limit` (e.g., 50) and `offset` pagination guards to prevent flood.
- Timeouts: Add 10s timeouts to network calls; surface retry affordances for edge function invocations.
- Avoid context across async gaps: Ensure `if (!context.mounted) return;` before using context after awaits; existing dev scanner is compliant.

Database

- Indexes: Confirm indexes on `listings(status, visibility, created_at)` and on feed view join keys.
- Search: Prefer prebuilt materialized views for heavy joins; restrict `ILIKE '%...%'` to left-anchored or trigram indexes if feasible.
- MV Refresh: If feed freshness matters, add `CONCURRENTLY` refresh or lightweight RPC `refresh_wall_thumbs_3x4()` with rate limit.

