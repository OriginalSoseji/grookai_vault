import 'package:flutter/foundation.dart';

enum ScannerScanCardCameraSurface { conditionCamera, legacyNativePhase0 }

class ScannerNativeCameraGuardrail {
  const ScannerNativeCameraGuardrail._();

  static const bool androidNativeConditionCameraRequested =
      bool.fromEnvironment('SCANNER_NATIVE_CONDITION_CAMERA_ANDROID');

  static bool legacyPhase0AllowedForScanCard(TargetPlatform platform) {
    if (platform == TargetPlatform.android) return false;
    return platform == TargetPlatform.iOS;
  }

  static bool nativeConditionCameraRequestedForScanCard(
    TargetPlatform platform,
  ) {
    return platform == TargetPlatform.android &&
        androidNativeConditionCameraRequested;
  }

  static ScannerScanCardCameraSurface scanCardSurfaceForPlatform(
    TargetPlatform platform,
  ) {
    if (legacyPhase0AllowedForScanCard(platform)) {
      return ScannerScanCardCameraSurface.legacyNativePhase0;
    }
    return ScannerScanCardCameraSurface.conditionCamera;
  }
}
