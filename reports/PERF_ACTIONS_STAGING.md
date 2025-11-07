Flutter (staging runtime focus)

- Search:
  - Add 300ms debounce on search text input.
  - Enforce `limit` (<= 50) and paging with `offset`.
  - Timeout network calls at 10s with user-visible retry.
- Feed:
  - Use 3:4 thumbnails (`cacheWidth: 720, cacheHeight: 960`) in lists.
  - Use placeholders and `errorBuilder` to avoid jank.
  - Defer full-size loads to detail only; optional prefetch on settle.
- Widgets:
  - Add `const` where possible; avoid heavy work in builders.
  - Avoid `BuildContext` after async gaps; guard with `if (!context.mounted) return;`.

Database (observability from staging)

- Measure latency of `search_cards`; consider indexes on search columns or materialized search view.
- Feed joins: confirm indexes on join keys and `created_at` ordering.
- MV refresh: if used, prefer scheduled refresh or trigger + rate limit.

