import 'package:flutter/services.dart';

class NativeScannerPhase0Capture {
  const NativeScannerPhase0Capture({
    required this.imagePath,
    required this.width,
    required this.height,
    required this.fileSize,
    required this.zoom,
    required this.exposureBias,
    required this.ready,
  });

  factory NativeScannerPhase0Capture.fromMap(Map<Object?, Object?> map) {
    return NativeScannerPhase0Capture(
      imagePath: (map['imagePath'] as String?) ?? '',
      width: (map['width'] as num?)?.toInt() ?? 0,
      height: (map['height'] as num?)?.toInt() ?? 0,
      fileSize: (map['fileSize'] as num?)?.toInt() ?? 0,
      zoom: (map['zoom'] as num?)?.toDouble() ?? 1.0,
      exposureBias: (map['exposureBias'] as num?)?.toDouble() ?? 0.0,
      ready: (map['ready'] as bool?) ?? false,
    );
  }

  final String imagePath;
  final int width;
  final int height;
  final int fileSize;
  final double zoom;
  final double exposureBias;
  final bool ready;

  bool get isPass =>
      imagePath.trim().isNotEmpty && width > 0 && height > 0 && fileSize > 0;
}

class NativeScannerPhase0Readiness {
  const NativeScannerPhase0Readiness({
    required this.ready,
    required this.deviceStable,
    required this.focusStable,
    required this.exposureStable,
  });

  factory NativeScannerPhase0Readiness.fromMap(Map<Object?, Object?> map) {
    return NativeScannerPhase0Readiness(
      ready: (map['ready'] as bool?) ?? false,
      deviceStable: (map['deviceStable'] as bool?) ?? false,
      focusStable: (map['focusStable'] as bool?) ?? false,
      exposureStable: (map['exposureStable'] as bool?) ?? false,
    );
  }

  final bool ready;
  final bool deviceStable;
  final bool focusStable;
  final bool exposureStable;
}

class NativeScannerPhase0Bridge {
  NativeScannerPhase0Bridge._();

  static const previewViewType = 'grookai/scanner_camera_phase0_preview';

  static const _channel = MethodChannel('grookai/scanner_camera_phase0');

  static Future<void> startSession() async {
    await _channel.invokeMethod<void>('startSession');
  }

  static Future<void> stopSession() async {
    await _channel.invokeMethod<void>('stopSession');
  }

  static Future<void> setZoom(double zoom) async {
    await _channel.invokeMethod<void>('setZoom', {'zoom': zoom});
  }

  static Future<void> setExposureBias(double bias) async {
    await _channel.invokeMethod<void>('setExposureBias', {'bias': bias});
  }

  static Future<NativeScannerPhase0Readiness> getReadiness() async {
    final result = await _channel.invokeMapMethod<Object?, Object?>(
      'getReadiness',
    );
    if (result == null) {
      throw StateError('Native scanner readiness returned no result.');
    }
    return NativeScannerPhase0Readiness.fromMap(result);
  }

  static Future<NativeScannerPhase0Capture> capture() async {
    final result = await _channel.invokeMapMethod<Object?, Object?>('capture');
    if (result == null) {
      throw StateError('Native scanner capture returned no result.');
    }
    return NativeScannerPhase0Capture.fromMap(result);
  }
}
