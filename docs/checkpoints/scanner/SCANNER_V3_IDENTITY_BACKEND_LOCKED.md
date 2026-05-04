# Scanner V3 Identity Backend Locked

Date: 2026-05-04

## Purpose

This checkpoint freezes the current Scanner V3 identity state before controlled Samsung device validation.

Scanner V3 is now in the Option A path:

```text
live camera frame
-> Scanner V3 normalization
-> normalized color artwork crop
-> V8 multi-crop embedding/vector candidate generation
-> V9 temporal confidence guard
-> identity lock only when evidence is stable
```

No AI fallback, OCR, backend identity worker write, schema change, or training capture write is part of this checkpoint.

## Current Architecture

- Scanner V3 live loop samples camera frames at a bounded cadence.
- Native/card-edge detection and fallback normalization produce upright card artifacts.
- The app sends normalized artwork-derived crops to the local identity service.
- The local identity service serves embedding/vector candidate lookup against the current reference index.
- V8 expands recall with multiple query crops and candidate unioning.
- V9 separates visual convergence from accepted identity and blocks weak, unstable, ambiguous, or unknown candidates.

## What Is Proven

- Scanner V3 live loop opens through the debug Scanner V3 route.
- V8 identity plumbing is wired to local embedding/vector endpoints.
- Local identity service can serve the current 188-reference index.
- Backend/internal known-reference validation passes:
  - references tested: 20
  - correct locks: 20
  - wrong locks: 0
  - unknown/ambiguous: 0
  - average frames to lock: 4
  - Recall@5/10/50: 1.0 / 1.0 / 1.0
- V9 guard accepts strong known-reference evidence after temporal agreement.
- V9 guard still retains unknown/ambiguous states for insufficient evidence.

## What Is Not Yet Proven

- Real Samsung device identity accuracy for known in-index physical cards.
- Real Samsung behavior for unknown/out-of-index physical cards.
- Wrong-lock rate under glare, sleeves, motion, skew, and mixed backgrounds.
- Whether the current 188-reference index has enough coverage for expected live tests.
- Whether the lock timing remains acceptable with real endpoint latency during device scanning.

## V9 Guard Thresholds

Current calibrated thresholds:

```text
decayFactor = 0.72
lockScoreGap = 1.2
identityAcceptScoreGap = 1.2
identityAcceptFrameScoreGap = 0.015
minScoreThreshold = 2.0
maxAcceptedDistance = 0.165
minCropTypesToLock = 2
minCropTypesToAccept = 2
minTopFiveFramesToLock = 3
minRecentTopFiveFramesToAccept = 3
recentFrameWindow = 5
```

Acceptance still requires temporal support, crop support, distance quality, score gap, and minimum accumulated score. A scanner-only lock must not create a training label.

## Local Identity Service

Start the local identity service:

```powershell
node backend/identity_v3/run_scanner_v3_identity_service_v1.mjs
```

Health check:

```powershell
curl http://localhost:8787/health
```

For a USB-connected Android device:

```powershell
adb reverse tcp:8787 tcp:8787
```

## App Build Command

Build the debug APK with local identity endpoints:

```powershell
flutter build apk --debug `
  --dart-define=SCANNER_V3_EMBEDDING_ENDPOINT=http://127.0.0.1:8787/scanner-v3/embed `
  --dart-define=SCANNER_V3_VECTOR_ENDPOINT=http://127.0.0.1:8787/scanner-v3/candidates
```

Install:

```powershell
adb install -r build\app\outputs\flutter-apk\app-debug.apk
```

Launch:

```powershell
adb shell monkey -p com.example.grookai_vault -c android.intent.category.LAUNCHER 1
```

## Next Validation Plan

1. Known in-index reference test:
   - Scan at least 3 physical cards confirmed to exist in the current reference index.
   - Record Top-5 behavior, time to first candidate, time to lock, and final identity.

2. Unknown/out-of-index test:
   - Scan at least 3 physical cards not present in the current reference index.
   - Expected result is `candidate_unknown` or `candidate_ambiguous`, not a final wrong lock.

3. Wrong-lock check:
   - Re-test the previous Meloetta/Sneasel scenario.
   - If Meloetta is not indexed, Sneasel must not be accepted as final identity.

4. Stress pass:
   - Repeat known and unknown cards with glare, sleeve, small angle changes, and imperfect hand motion.
   - Do not tune thresholds until wrong locks, blocked correct locks, and endpoint latencies are documented.

## Locked State

This checkpoint preserves the current Scanner V3 backend identity state for controlled device validation. Further changes should be based on device evidence, not backend self-reference results alone.
