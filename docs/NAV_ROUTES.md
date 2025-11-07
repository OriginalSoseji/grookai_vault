# Navigation and Routes

- Route `RouteNames.scanner` (`/scanner`) → `ScanPage` (production, canonical).
- Route alias `/scan` → `ScanPage` when `gvFeatureScanner` is enabled; otherwise shows `ScanEntry` placeholder.
- Advanced scanner (dev‑only) is not on the public route map. It can be exposed behind a dev flag if needed.

