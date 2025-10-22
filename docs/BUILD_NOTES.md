## Scanner P0 and P0.5

This document tracks the scanner build notes (tracked in Git for history).

Highlights:
- Live camera preview with reticle (ScanFrame)
- OCR via ML Kit → name/number/lang hints, concise logs
- Resolver aligned to number/lang with confidence scoring and fallbacks
- Bottom-sheet confirmation UI with top-3 disambiguation
- Runtime camera permission handling (Android/iOS)
- Env flags to gate feature and telemetry
- Telemetry logs with optional DB insert when enabled

P0.5 specifics:
- Confidence scoring: strict number+lang+name ≈0.97; number+lang ≈0.90; name+lang ≈0.80; name-only ≈0.60. Alternatives within 0.05 of best are shown.
- Timeout guards for OCR/resolve (8s), user feedback.

Staging (P1c)
- See `configs/staging_flags.json` for safe defaults used in staging.
- Rollout guide: `docs/ROLL_OUT_SCANNER.md`.
- See repo for implementation details in lib/features/scanner/* and lib/services/*.
