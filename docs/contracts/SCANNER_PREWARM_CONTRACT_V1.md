# SCANNER_PREWARM_CONTRACT_V1

## Status

Active.

## Purpose

Define the narrow scope for scanner prewarm work needed to reduce cold Feed-tap to scanner identity lock time without weakening scanner identity, detector, OCR, or UI behavior.

## Scope

Allowed:

- scanner-owned Flutter bridge code under `lib/services/scanner/`
- scanner-owned native camera code under `android/app/src/main/kotlin/com/example/grookai_vault/scanner/`
- minimal app shell calls that only invoke scanner-owned prewarm methods before opening `ConditionCameraScreen`
- scanner docs, audits, contracts, and local verification logs

Forbidden:

- detector threshold changes
- OCR authority or OCR hot-path changes
- identity model, ML model, or Supabase schema changes
- card guide/outline behavior changes
- scanner reveal-state weakening
- pricing, vault, auth, public web, or unrelated worker changes

## Prewarm Rule

Scanner prewarm may prepare expensive scanner resources before the user taps Scan only when the work stays behind a scanner-owned API.

Permitted resources:

- CameraX provider initialization
- Android scanner camera analysis session warmup
- scanner identity service/model warmup where already configured for the scanner path

The app shell may call scanner prewarm, but it must not own scanner camera logic.

## Runtime Constraints

- Prewarm must be best-effort and fail closed.
- Prewarm must not block normal app navigation.
- Prewarm must not replace `ConditionCameraScreen` as the production scanner surface.
- Prewarm must not keep stale scanner identity state across card selections.
- Prewarm must stop or be safely superseded when the real scanner surface opens.
- Prewarm must expose enough debug status to prove whether it is active, skipped, or failed.

## Performance Target

For Android native condition camera builds:

- Feed tap to first scanner frame should target less than `500 ms`.
- Feed tap to identity lock should target less than `2000 ms`.
- Identity correctness and no-card blocking remain higher priority than speed.

## Stop Rules

Stop before continuing if meeting the target appears to require:

- weakening identity guards
- accepting one-frame locks
- detector threshold tuning
- OCR authority
- changing scanner UI reveal semantics
- changing non-scanner app behavior beyond a scanner prewarm call

## Acceptance

This contract is satisfied only when real-device evidence shows scanner prewarm reduces Feed-tap startup latency while preserving the existing scanner surface, correct identity, and guarded reveal behavior.
