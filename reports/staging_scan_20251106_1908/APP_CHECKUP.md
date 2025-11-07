# App Checkup (Read-Only)

Executive Summary: YELLOW

Top 10 Issues (ranked)
- P0: Staging REST connectivity unresolved (use Actions probe + gate). Effort: S. Owner: ci
- P1: Wall feed exposure may be missing (VIEW 403/404 probable). Effort: M. Owner: db (SQL staged in _hold)
- P1: Ensure thumbnails in all lists (Image.network count=23; thumb refs=13). Effort: S. Owner: app
- P1: Add 10s timeouts on reads (current matches=13). Effort: S. Owner: app
- P2: Debounce search inputs to 300–450ms (matches=4). Effort: S. Owner: app
- P2: Validate RLS policies and grants for views/RPCs (static audit only). Effort: M. Owner: db
- P2: CI guardrails in place; keep staging-probe manual & read-only. Effort: S. Owner: ci
- P3: Accessibility and placeholders in lists (loading/error). Effort: S. Owner: app
- P3: Avoid context across async gaps (lint infos present). Effort: S. Owner: app
- P3: Confirm storage bucket policies for thumbs (static check). Effort: M. Owner: db

Fast Wins
- Add cacheWidth/cacheHeight + errorBuilder to Image.network in list tiles (search list, any remaining).
- Apply 300ms debounce to all search inputs (unified/search_screen etc.).
- Ensure all Supabase calls in UI paths have .timeout(Duration(seconds:10)).
- Run 'Grookai: Refresh Stage Gate (PROBE + PARSE)' and capture codes in gate.

Signals
- Image.network calls: 23
- thumb_url refs: 13; image_url refs: 81
- Timeouts present: 13; Debounce points: 4

Repo References
- lint_analyze: C:/grookai_vault/reports/staging_scan_20251106_1908/lint_analyze.txt
- ci_presence: C:/grookai_vault/reports/staging_scan_20251106_1908/ci_presence.txt
- functions_list: C:/grookai_vault/reports/staging_scan_20251106_1908/functions_list.txt
- sql_views/sql_rpcs/sql_rls in C:/grookai_vault/reports/staging_scan_20251106_1908/
