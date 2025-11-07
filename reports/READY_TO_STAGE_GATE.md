# Ready-to-Stage Gate (Read-Only)

**Scan folder:** C:\grookai_vault\reports\staging_scan_20251106_1151

| Check | Result |
|---|---|
| RPC /rpc/search_cards | HTTP MISSING |
| View /v_wall_feed | HTTP MISSING |
| Tests | UNKNOWN |
| Analyze | UNKNOWN |
| CI db-smoke.yml | True |
| CI migrations-apply.yml | True |
| Wall feed SQL staged (_hold_) | True |

**VERDICT: FAIL**

- RPC search_cards must return **200** (got MISSING)
- Wall view must be **200/403/404** (got MISSING)

Snapshots: C:\grookai_vault\reports\staging_scan_20251106_1908/APP_CHECKUP.md

