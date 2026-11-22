import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'p21_label.dart';

/// Full-size 203-dpi Munbyn label. All text is measured before producing bytes;
/// a long identity fails visibly instead of clipping or silently losing words.
class IdentityLabelRaster {
  static const width = 814, height = 1214;
  static Future<Uint8List> render(P21LabelContent content) async {
    if (content.setName.trim().isEmpty ||
        content.setName.trim().toLowerCase() == 'unknown set') {
      throw const FormatException(
        'The full set name is unavailable. A set code will never be printed. Reload the card after its set name is available.',
      );
    }
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawColor(Colors.white, BlendMode.src);
    void fit(String value, Rect box, double maximum, {bool bold = false}) {
      for (var size = maximum; size >= 20; size -= 1) {
        final text = TextPainter(
          text: TextSpan(
            text: value,
            style: TextStyle(
              fontFamily: 'Roboto',
              fontSize: size,
              height: 1.08,
              color: Colors.black,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: box.width);
        if (text.width <= box.width && text.height <= box.height) {
          text.paint(canvas, box.topLeft);
          text.dispose();
          return;
        }
        text.dispose();
      }
      recorder.endRecording().dispose();
      throw const FormatException(
        'The full card identity cannot fit legibly on this label.',
      );
    }

    fit(content.title, const Rect.fromLTWH(48, 48, 718, 170), 64, bold: true);
    fit(content.setName, const Rect.fromLTWH(48, 238, 718, 120), 40);
    fit(
      '#${content.number}',
      const Rect.fromLTWH(48, 378, 718, 55),
      36,
      bold: true,
    );
    final qr = QrImage(
      QrCode.fromData(
        data: content.qrUri.toString(),
        errorCorrectLevel: QrErrorCorrectLevel.L,
      ),
    );
    final modules = qr.moduleCount + 8;
    final scale = 600 ~/ modules;
    if (scale < 2) {
      recorder.endRecording().dispose();
      throw const FormatException('This QR is too dense for this label.');
    }
    final origin = Offset((width - modules * scale) / 2, 458);
    final ink = Paint()
      ..color = Colors.black
      ..isAntiAlias = false;
    for (var row = 0; row < qr.moduleCount; row++) {
      for (var col = 0; col < qr.moduleCount; col++) {
        if (qr.isDark(row, col)) {
          canvas.drawRect(
            Rect.fromLTWH(
              origin.dx + (col + 4) * scale,
              origin.dy + (row + 4) * scale,
              scale.toDouble(),
              scale.toDouble(),
            ),
            ink,
          );
        }
      }
    }
    final source = await rootBundle.load(
      'ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png',
    );
    final codec = await ui.instantiateImageCodec(source.buffer.asUint8List());
    final emblem = (await codec.getNextFrame()).image;
    canvas.drawImageRect(
      emblem,
      Rect.fromLTWH(0, 0, emblem.width.toDouble(), emblem.height.toDouble()),
      const Rect.fromLTWH(670, 1090, 96, 96),
      Paint()
        ..filterQuality = FilterQuality.high
        ..colorFilter = const ColorFilter.matrix([
          -1,
          0,
          0,
          0,
          255,
          0,
          -1,
          0,
          0,
          255,
          0,
          0,
          -1,
          0,
          255,
          0,
          0,
          0,
          1,
          0,
        ]),
    );
    final picture = recorder.endRecording();
    final image = await picture.toImage(width, height);
    picture.dispose();
    emblem.dispose();
    codec.dispose();
    try {
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      if (png == null) throw StateError('The label could not be rendered.');
      return png.buffer.asUint8List();
    } finally {
      image.dispose();
    }
  }
}
