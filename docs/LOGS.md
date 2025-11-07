# Logs & Drains

To centralize Edge Function logs, configure a log drain targeting your provider (e.g., Logflare, Datadog).

Suggested filter:
- Contains: `"IMPORT"`
- Levels: `warn`, `error`

Our import-prices logs emit structured JSON via `jlog()` with fields like:

```
{ "t": "2025-11-07T11:06:39.000Z", "level": "warn", "msg": "IMPORT breaker-trip", "fails": 6, "open_until": 1730974059000, "rid": "abc123" }
```

Start/end lines include `rid` for request correlation. Vendor issues include `vendor: "pokemontcg"` and `timeout: true` when applicable.

