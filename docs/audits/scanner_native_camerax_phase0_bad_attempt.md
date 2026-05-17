# Scanner Native CameraX Phase0 Bad Attempt Archive

Branch: `scanner-v4-card-present-gate`

Date: 2026-05-09

Status: archived bad attempt. Do not repeat this route.

## What Happened

CameraX was wired into the existing Android `NativeScannerPhase0Screen` path as a real native `PreviewView` and basic `ImageCapture` implementation. It was installed with:

```text
SCANNER_NATIVE_PHASE0_ANDROID=true
```

The native camera preview did render, but the user-facing result was wrong for the scanner product.

## Why This Failed

The CameraX work was surfaced through the old Phase0 capture/review UI instead of the production scanner surface.

Observed failure:

- The screen showed the legacy Phase0 review flow.
- The app showed a large white review area and Android system bars.
- The UI showed `Failed` even though the native preview/capture path could return a file.
- The production scanner overlay, card lock boxes, scan memory, hidden-until-shutter behavior, and identity loop were not present.
- This route did not preserve the stable scanner behavior the user had already accepted.

## Stable Baseline

The stable installed scanner build immediately after this attempt used the default build path with Android native phase0 disabled:

```text
SCANNER_NATIVE_PHASE0_ANDROID=false
```

Stable installed timestamp:

```text
2026-05-09 11:26:51
```

That build returned to the accepted Flutter camera scanner path and restored the working identification behavior.

## Rule Going Forward

Do not ship or test CameraX by routing the Scan action through `NativeScannerPhase0Screen`.

Future native camera work must be integrated as an internal camera engine inside the existing production scanner experience:

```text
ConditionCameraScreen
  -> existing immersive scanner UI
  -> existing card lock/selection overlay
  -> existing scanner V3/V4 live behavior
  -> existing hidden-until-shutter identity flow
```

CameraX may be used only behind that scanner surface, with the same behavioral contracts and real-device identity evidence required before replacing the stable camera path.

## Guardrail

Any future CameraX/native preview branch must prove all of the following before it can replace the stable scanner camera:

- The Scan action still opens the production scanner UI, not Phase0 review UI.
- Android status/navigation bars remain hidden in the scanner.
- Card lock boxes and tap selection still work.
- Identification remains correct on the known real-card set.
- The no-card/background identity block still passes.
- Preview quality/smoothness improves without regressing identity.
