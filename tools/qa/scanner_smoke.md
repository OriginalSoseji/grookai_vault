# Scanner Smoke Test Guide

Cases:
- Clear EN Pikachu (known): local OCR ≥0.90 → bottom sheet shows correct print → confirm add works.
- Ambiguous art: server scan_resolve raises; if <0.95, chooser shows alternatives.
- Unknown card: [SCAN→LAZY] trigger → importing banner → auto-retry → match found.
- Cooldown: rescan same unknown within window → [SCAN→LAZY] skip (cooldown).
- Permission denied: explainer flow shows; allow → preview starts.
- Timeout: reduce SCAN_EMBED_TIMEOUT_MS to force timeout → snackbar and recover.

Notes: keep logs concise ([SCAN], [RESOLVE], [PERM], [SCAN→LAZY]).
