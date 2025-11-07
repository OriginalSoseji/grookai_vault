# Hidden or Dormant Features

Item | Why Hidden | How to expose | Risk | Priority
--- | --- | --- | --- | ---
AlertsPage (lib/features/alerts/alerts_page.dart) | Flag `gvFeatureAlerts=false` | Exposed under Profile when flag true | Low | P2 (Exposed when flagged)
Dev Admin/Health/Diagnostics | Debug/profile gated | Keep dev-only; add launcher in Profile for testers | Low | P3
Create Listing | Debug/profile gated route | Add guarded menu item in Profile when in dev | Medium | P3
Explore Feed | Previously low discoverability | Exposed via Home → Explore card | Low | P2 (Exposed)
Advanced Scanner | Dev-only prototype | Keep gated | Low | P3
Scan History | Previously no obvious entry | Exposed under Profile → Scan History | Low | P2 (Exposed)
Price Import (Dev) | Dev tooling | Keep hidden | Low | P3

Backend without direct UI
- tools/price_importer.dart: CLI tooling only (OK).
- services/edge_warmup.dart: background utility; no direct UI (OK).
