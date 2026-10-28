import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'p21_label.dart';

/// Content for a small lot label. This is intentionally separate from the
/// exact-copy label: it identifies a lot for sale tracking and makes no card
/// identity claim.
class LotP21LabelContent {
  const LotP21LabelContent({
    required this.lotName,
    required this.groupName,
    required this.price,
    required this.condition,
    required this.qrUri,
    this.includeLogo = true,
    this.includeQr = true,
  });

  final String lotName;
  final String groupName;
  final String price;
  final String condition;
  final Uri qrUri;
  final bool includeLogo;
  final bool includeQr;
}

class LotP21Label {
  const LotP21Label._();

  static const _logoAsset =
      'ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png';

  static Future<P21Label> render(LotP21LabelContent content) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawColor(Colors.white, BlendMode.src);
    final ink = Paint()
      ..color = Colors.black
      ..isAntiAlias = false;

    final qrLeft = content.includeQr ? 188.0 : P21Label.feedDots.toDouble();
    final textLeft = content.includeLogo ? 57.0 : 7.0;
    final textWidth = qrLeft - textLeft - 7;

    if (content.includeQr) {
      _drawQr(canvas, ink, content.qrUri, left: 188, top: 0, size: 96);
    }

    if (content.includeLogo) {
      final logoData = await rootBundle.load(_logoAsset);
      final codec = await ui.instantiateImageCodec(
        logoData.buffer.asUint8List(),
      );
      final logo = (await codec.getNextFrame()).image;
      canvas.drawImageRect(
        logo,
        Rect.fromLTWH(0, 0, logo.width.toDouble(), logo.height.toDouble()),
        const Rect.fromLTWH(9, 25, 42, 42),
        Paint()..filterQuality = FilterQuality.high,
      );
      logo.dispose();
      codec.dispose();
    }

    _drawText(
      canvas,
      content.lotName,
      x: textLeft,
      y: 5,
      width: textWidth,
      size: 18,
      height: 22,
      bold: true,
    );
    _drawText(
      canvas,
      content.groupName.isEmpty ? 'Lot' : content.groupName,
      x: textLeft,
      y: 29,
      width: textWidth,
      size: 11,
      height: 16,
    );
    _drawText(
      canvas,
      content.price,
      x: textLeft,
      y: 48,
      width: textWidth,
      size: 27,
      height: 31,
      bold: true,
    );
    _drawText(
      canvas,
      content.condition,
      x: textLeft,
      y: 79,
      width: textWidth,
      size: 11,
      height: 14,
      bold: true,
    );

    final picture = recorder.endRecording();
    final image = await picture.toImage(P21Label.feedDots, P21Label.headDots);
    picture.dispose();
    try {
      final rgba = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      if (rgba == null || png == null) {
        throw StateError('Could not render the lot label.');
      }
      return P21Label(
        previewPng: png.buffer.asUint8List(),
        bitmap: P21Label.packLandscape(rgba.buffer.asUint8List()),
      );
    } finally {
      image.dispose();
    }
  }

  static void _drawText(
    Canvas canvas,
    String value, {
    required double x,
    required double y,
    required double width,
    required double size,
    required double height,
    bool bold = false,
  }) {
    final painter = TextPainter(
      text: TextSpan(
        text: value.trim().isEmpty ? ' ' : value.trim(),
        style: TextStyle(
          color: Colors.black,
          fontFamily: 'Arial',
          fontSize: size,
          height: 1.0,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: width);
    painter.paint(canvas, Offset(x, y));
    painter.dispose();
  }

  static void _drawQr(
    Canvas canvas,
    Paint ink,
    Uri uri, {
    required int left,
    required int top,
    required int size,
  }) {
    final qr = QrImage(
      QrCode.fromData(
        data: uri.toString(),
        errorCorrectLevel: QrErrorCorrectLevel.L,
      ),
    );
    final modules = qr.moduleCount + 8;
    final scale = size ~/ modules;
    if (scale < 2) {
      throw const FormatException(
        'This lot link is too long for a readable 14 × 40 mm label.',
      );
    }
    final actual = modules * scale;
    final offsetX = left + (size - actual) ~/ 2;
    final offsetY = top + (size - actual) ~/ 2;
    for (var row = 0; row < qr.moduleCount; row++) {
      for (var col = 0; col < qr.moduleCount; col++) {
        if (qr.isDark(row, col)) {
          canvas.drawRect(
            Rect.fromLTWH(
              (offsetX + (col + 4) * scale).toDouble(),
              (offsetY + (row + 4) * scale).toDouble(),
              scale.toDouble(),
              scale.toDouble(),
            ),
            ink,
          );
        }
      }
    }
  }
}
