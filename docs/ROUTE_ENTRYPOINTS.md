# Route Entry Points

Feature | How to reach | Deep link | Programmatic
--- | --- | --- | ---
Home | Bottom nav | — | —
Search | Bottom nav; `/search`; unified sheet `/unified-search-sheet` | `/search` | Various `Navigator.pushNamed` calls
Vault | Bottom nav | — | `/vault-ext` for effective list via actions
Profile | Bottom nav | — | —
Scanner (ScanPage) | Center FAB/pill; `RouteNames.scanner`; `/scan` | `/scan` | `Navigator.pushNamed(RouteNames.scanner)`
Scan History | Profile → Scan History | `/scan-history` | From Profile
Card Detail | From lists/cards | `/card-detail` | `Navigator.pushNamed(RouteNames.cardDetail, args)`
Explore Feed | Home → Explore card | `/explore` | From Home card
Alerts | Hidden; Profile menu item (when enabled) | `/alerts` | From Profile button
Dev Admin/Health/Diagnostics | Dev routes only | `/dev-*` | From Dev Admin
Create Listing | Dev/profile only | `/create-listing` | From Dev Admin

No Entry
- Scan History (suggest add from ScanPage result sheet and Profile)
- Alerts (flag off by default)
