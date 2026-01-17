import 'dart:async';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class NativeQuadDetector {
  static const _channel = MethodChannel('gv/quad_detector_v1');
  DateTime _lastCall = DateTime.fromMillisecondsSinceEpoch(0);

  Future<Map<String, dynamic>?> detect(CameraImage image, int rotation) async {
    final now = DateTime.now();
    if (now.difference(_lastCall).inMilliseconds < 200) return null;
    _lastCall = now;

    if (image.format.group != ImageFormatGroup.yuv420) return null;

    try {
      final yPlane = image.planes[0];
      final uPlane = image.planes[1];
      final vPlane = image.planes[2];

      final args = {
        'width': image.width,
        'height': image.height,
        'rotation': rotation,
        'y': Uint8List.fromList(yPlane.bytes),
        'u': Uint8List.fromList(uPlane.bytes),
        'v': Uint8List.fromList(vPlane.bytes),
        'yRowStride': yPlane.bytesPerRow,
        'uvRowStride': uPlane.bytesPerRow,
        'uvPixelStride': uPlane.bytesPerPixel ?? 1,
      };

      final res = await _channel.invokeMethod<dynamic>('detectQuadYuv420', args);
      if (res == null) return null;
      if (res is Map) {
        return Map<String, dynamic>.from(res);
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[quad] detect error: $e');
      }
      return null;
    }
  }
}
