import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

typedef NativeConditionCameraFrameCallback =
    Future<void> Function(
      CameraImage image,
      int sensorRotation,
      Map<String, dynamic>? nativeQuadResponse,
    );

typedef NativeConditionCameraDetectionCallback =
    Future<void> Function(NativeConditionCameraDetection detection);

class NativeConditionCameraDetection {
  const NativeConditionCameraDetection({
    required this.width,
    required this.height,
    required this.sensorRotation,
    this.nativeQuadResponse,
  });

  final int width;
  final int height;
  final int sensorRotation;
  final Map<String, dynamic>? nativeQuadResponse;
}

class NativeConditionCameraMetrics {
  const NativeConditionCameraMetrics({
    required this.engine,
    required this.status,
    this.error,
    this.previewWidth,
    this.previewHeight,
    this.analysisWidth,
    this.analysisHeight,
    this.analysisFps,
    this.nativeDetectionFps,
    this.frameBridgeFps,
    this.nativeDetectionIntervalMs,
    this.fullFrameBridgeIntervalMs,
    this.lastFrameAtMs,
  });

  factory NativeConditionCameraMetrics.fromMap(Map<Object?, Object?> map) {
    return NativeConditionCameraMetrics(
      engine: (map['engine'] as String?) ?? 'unknown',
      status: (map['status'] as String?) ?? 'unknown',
      error: map['error'] as String?,
      previewWidth: (map['preview_width'] as num?)?.toInt(),
      previewHeight: (map['preview_height'] as num?)?.toInt(),
      analysisWidth: (map['analysis_width'] as num?)?.toInt(),
      analysisHeight: (map['analysis_height'] as num?)?.toInt(),
      analysisFps: (map['analysis_fps'] as num?)?.toDouble(),
      nativeDetectionFps: (map['native_detection_fps'] as num?)?.toDouble(),
      frameBridgeFps: (map['frame_bridge_fps'] as num?)?.toDouble(),
      nativeDetectionIntervalMs: (map['native_detection_interval_ms'] as num?)
          ?.toInt(),
      fullFrameBridgeIntervalMs: (map['full_frame_bridge_interval_ms'] as num?)
          ?.toInt(),
      lastFrameAtMs: (map['last_frame_at_ms'] as num?)?.toInt(),
    );
  }

  final String engine;
  final String status;
  final String? error;
  final int? previewWidth;
  final int? previewHeight;
  final int? analysisWidth;
  final int? analysisHeight;
  final double? analysisFps;
  final double? nativeDetectionFps;
  final double? frameBridgeFps;
  final int? nativeDetectionIntervalMs;
  final int? fullFrameBridgeIntervalMs;
  final int? lastFrameAtMs;

  Size? get previewSize {
    final width = previewWidth;
    final height = previewHeight;
    if (width == null || height == null || width <= 0 || height <= 0) {
      return null;
    }
    return Size(width.toDouble(), height.toDouble());
  }

  Size? get analysisSize {
    final width = analysisWidth;
    final height = analysisHeight;
    if (width == null || height == null || width <= 0 || height <= 0) {
      return null;
    }
    return Size(width.toDouble(), height.toDouble());
  }
}

class NativeConditionCameraPrewarmMetrics {
  const NativeConditionCameraPrewarmMetrics({
    required this.engine,
    required this.status,
    this.error,
    this.startedAtMs,
    this.firstFrameAtMs,
    this.timeToFirstFrameMs,
    this.frameCount,
  });

  factory NativeConditionCameraPrewarmMetrics.fromMap(
    Map<Object?, Object?> map,
  ) {
    return NativeConditionCameraPrewarmMetrics(
      engine: (map['engine'] as String?) ?? 'unknown',
      status: (map['status'] as String?) ?? 'unknown',
      error: map['error'] as String?,
      startedAtMs: (map['started_at_ms'] as num?)?.toInt(),
      firstFrameAtMs: (map['first_frame_at_ms'] as num?)?.toInt(),
      timeToFirstFrameMs: (map['time_to_first_frame_ms'] as num?)?.toInt(),
      frameCount: (map['frame_count'] as num?)?.toInt(),
    );
  }

  final String engine;
  final String status;
  final String? error;
  final int? startedAtMs;
  final int? firstFrameAtMs;
  final int? timeToFirstFrameMs;
  final int? frameCount;
}

class NativeConditionCameraPrewarmFrame {
  const NativeConditionCameraPrewarmFrame({
    required this.image,
    required this.sensorRotation,
    this.nativeQuadResponse,
  });

  final CameraImage image;
  final int sensorRotation;
  final Map<String, dynamic>? nativeQuadResponse;
}

class NativeConditionCameraBridge {
  NativeConditionCameraBridge._();

  static const previewViewType = 'grookai/scanner_condition_camera_preview';
  static const _channel = MethodChannel('grookai/scanner_condition_camera');
  static NativeConditionCameraFrameCallback? _frameCallback;
  static NativeConditionCameraDetectionCallback? _detectionCallback;

  static void attachFrameListener(
    NativeConditionCameraFrameCallback callback, {
    NativeConditionCameraDetectionCallback? onDetection,
  }) {
    _frameCallback = callback;
    _detectionCallback = onDetection;
    _channel.setMethodCallHandler(_handleNativeMethodCall);
  }

  static void detachFrameListener() {
    _frameCallback = null;
    _detectionCallback = null;
    _channel.setMethodCallHandler(null);
  }

  static Future<Object?> _handleNativeMethodCall(MethodCall call) async {
    if (call.method == 'nativeDetection') {
      final callback = _detectionCallback;
      if (callback == null) return null;
      final args = call.arguments;
      if (args is! Map) return null;
      final detection = _detectionFromNativeMap(args);
      unawaited(
        callback(detection).catchError((Object error) {
          if (kDebugMode) {
            debugPrint(
              '[scanner_native_camera] detection callback skipped: $error',
            );
          }
        }),
      );
      return null;
    }

    if (call.method != 'nativeFrame') return null;
    final callback = _frameCallback;
    if (callback == null) return null;
    final args = call.arguments;
    if (args is! Map) return null;
    final rawImage = args['image'];
    if (rawImage is! Map) return null;
    final sensorRotation = (args['sensorRotation'] as num?)?.toInt() ?? 0;
    final nativeQuadResponse = _dynamicMap(args['quadDetection']);
    final image = _cameraImageFromNativeMap(rawImage);
    unawaited(
      callback(image, sensorRotation, nativeQuadResponse).catchError((
        Object error,
      ) {
        if (kDebugMode) {
          debugPrint('[scanner_native_camera] frame callback skipped: $error');
        }
      }),
    );
    return null;
  }

  static NativeConditionCameraDetection _detectionFromNativeMap(
    Map<dynamic, dynamic> args,
  ) {
    return NativeConditionCameraDetection(
      width: (args['width'] as num?)?.toInt() ?? 0,
      height: (args['height'] as num?)?.toInt() ?? 0,
      sensorRotation: (args['sensorRotation'] as num?)?.toInt() ?? 0,
      nativeQuadResponse: _dynamicMap(args['quadDetection']),
    );
  }

  static Map<String, dynamic>? _dynamicMap(Object? value) {
    if (value is! Map) return null;
    return Map<String, dynamic>.from(value);
  }

  static CameraImage _cameraImageFromNativeMap(Map<dynamic, dynamic> rawImage) {
    // The camera package keeps this constructor for method-channel image data.
    // ignore: deprecated_member_use
    return CameraImage.fromPlatformData(rawImage);
  }

  static Future<NativeConditionCameraMetrics> getMetrics() async {
    final result = await _channel.invokeMapMethod<Object?, Object?>(
      'getMetrics',
    );
    if (result == null) {
      throw StateError('Native condition camera returned no metrics.');
    }
    return NativeConditionCameraMetrics.fromMap(result);
  }

  static Future<NativeConditionCameraPrewarmMetrics> prewarmSession({
    Duration ttl = const Duration(minutes: 2),
  }) async {
    final result = await _channel.invokeMapMethod<Object?, Object?>(
      'prewarmSession',
      <String, Object?>{'ttl_ms': ttl.inMilliseconds},
    );
    if (result == null) {
      throw StateError('Native condition camera returned no prewarm metrics.');
    }
    return NativeConditionCameraPrewarmMetrics.fromMap(result);
  }

  static Future<NativeConditionCameraPrewarmMetrics> getPrewarmMetrics() async {
    final result = await _channel.invokeMapMethod<Object?, Object?>(
      'getPrewarmMetrics',
    );
    if (result == null) {
      throw StateError('Native condition camera returned no prewarm metrics.');
    }
    return NativeConditionCameraPrewarmMetrics.fromMap(result);
  }

  static Future<NativeConditionCameraPrewarmFrame?>
  consumePrewarmFrame() async {
    final result = await _channel.invokeMapMethod<Object?, Object?>(
      'consumePrewarmFrame',
    );
    if (result == null) return null;
    final rawImage = result['image'];
    if (rawImage is! Map) return null;
    return NativeConditionCameraPrewarmFrame(
      image: _cameraImageFromNativeMap(rawImage),
      sensorRotation: (result['sensorRotation'] as num?)?.toInt() ?? 0,
      nativeQuadResponse: _dynamicMap(result['quadDetection']),
    );
  }

  static Future<NativeConditionCameraPrewarmMetrics>
  stopPrewarmSession() async {
    final result = await _channel.invokeMapMethod<Object?, Object?>(
      'stopPrewarmSession',
    );
    if (result == null) {
      throw StateError('Native condition camera returned no prewarm metrics.');
    }
    return NativeConditionCameraPrewarmMetrics.fromMap(result);
  }

  static Future<void> stopSession() async {
    await _channel.invokeMethod<void>('stopSession');
  }
}
