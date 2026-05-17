import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/scanner/scanner_native_camera_guardrail.dart';

void main() {
  test('Android Scan Card cannot use archived native Phase0 route', () {
    expect(
      ScannerNativeCameraGuardrail.legacyPhase0AllowedForScanCard(
        TargetPlatform.android,
      ),
      isFalse,
    );
    expect(
      ScannerNativeCameraGuardrail.scanCardSurfaceForPlatform(
        TargetPlatform.android,
      ),
      ScannerScanCardCameraSurface.conditionCamera,
    );
  });

  test('native condition camera flag is Android-only and off by default', () {
    expect(
      ScannerNativeCameraGuardrail.nativeConditionCameraRequestedForScanCard(
        TargetPlatform.android,
      ),
      isFalse,
    );
    expect(
      ScannerNativeCameraGuardrail.nativeConditionCameraRequestedForScanCard(
        TargetPlatform.iOS,
      ),
      isFalse,
    );
  });

  test('legacy iOS Phase0 behavior remains unchanged for now', () {
    expect(
      ScannerNativeCameraGuardrail.scanCardSurfaceForPlatform(
        TargetPlatform.iOS,
      ),
      ScannerScanCardCameraSurface.legacyNativePhase0,
    );
  });
}
