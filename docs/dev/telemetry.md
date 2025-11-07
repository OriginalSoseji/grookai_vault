# App Telemetry

What is collected (non-PII):

- Frame timings → average FPS over last 60s.
- HTTP failures → error rate per 15 minutes.
- Pricing freshness → client-observed staleness distribution.

How to open diagnostics page:

- Debug/profile builds only. Route to `DiagnosticsPage` in dev flows or add a long-press handler on title areas.

Export:

- `lib/telemetry/export.dart` writes a JSON snapshot to the Documents/AppTelemetry folder and returns the path. No PII is included.

Disable in release:

- Do not link the diagnostics page in release builds; guard with `assert(kDebugMode || kProfileMode)`.

