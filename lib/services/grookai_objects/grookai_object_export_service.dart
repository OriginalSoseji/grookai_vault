import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:share_plus/share_plus.dart';

class GrookaiObjectExportService {
  const GrookaiObjectExportService();

  Future<Uint8List> capturePng(
    GlobalKey repaintBoundaryKey, {
    double pixelRatio = 3,
  }) async {
    WidgetsBinding.instance.ensureVisualUpdate();
    await WidgetsBinding.instance.endOfFrame.timeout(
      const Duration(milliseconds: 250),
      onTimeout: () {},
    );
    final context = repaintBoundaryKey.currentContext;
    final renderObject = context?.findRenderObject();
    if (renderObject is! RenderRepaintBoundary) {
      throw StateError('Grookai object export boundary is not ready.');
    }

    final image = await renderObject.toImage(pixelRatio: pixelRatio);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    if (data == null) {
      throw StateError('Grookai object export did not produce PNG data.');
    }
    return data.buffer.asUint8List();
  }

  Future<ShareResult> sharePng({
    required Uint8List bytes,
    required String fileName,
    String? text,
    String? subject,
  }) {
    return SharePlus.instance.share(
      ShareParams(
        files: [XFile.fromData(bytes, mimeType: 'image/png', name: fileName)],
        fileNameOverrides: [fileName],
        text: text,
        subject: subject,
      ),
    );
  }

  static String fileNameFor({required String type, required String title}) {
    final slug = _slug(title);
    final typeSlug = _slug(type);
    return 'grookai-$typeSlug-${slug.isEmpty ? 'card' : slug}.png';
  }

  static String _slug(String value) {
    final lower = value.trim().toLowerCase();
    final normalized = lower.replaceAll(RegExp(r'[^a-z0-9]+'), '-');
    return normalized.replaceAll(RegExp(r'^-+|-+$'), '');
  }
}
