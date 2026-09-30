import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

class P21LabelContent {
  const P21LabelContent({
    required this.title,
    required this.setName,
    required this.number,
    required this.qrUri,
  });

  final String title;
  final String setName;
  final String number;
  final Uri qrUri;
}

class P21Label {
  const P21Label({required this.previewPng, required this.bitmap});
  static const widthMm = 14;
  static const lengthMm = 40;
  // Tested P21 printable area, leaving the roll's physical margins clear.
  static const headDots = 96;
  static const feedDots = 284;
  final Uint8List previewPng;
  final Uint8List bitmap;

  static Future<P21Label> render(P21LabelContent content) async {
    final qr = QrImage(
      QrCode.fromData(
        data: content.qrUri.toString(),
        errorCorrectLevel: QrErrorCorrectLevel.L,
      ),
    );
    final modules = qr.moduleCount + 8; // Four-module quiet zone on each side.
    final scale = headDots ~/ modules;
    if (scale < 2) {
      throw const FormatException(
        'This QR link is too long for a readable 14 × 40 mm label. Use AirPrint.',
      );
    }
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawColor(Colors.white, BlendMode.src);
    final ink = Paint()
      ..color = Colors.black
      ..isAntiAlias = false;
    final qrOffset = (headDots - modules * scale) ~/ 2;
    for (var row = 0; row < qr.moduleCount; row++) {
      for (var col = 0; col < qr.moduleCount; col++) {
        if (qr.isDark(row, col)) {
          canvas.drawRect(
            Rect.fromLTWH(
              (qrOffset + (col + 4) * scale).toDouble(),
              (qrOffset + (row + 4) * scale).toDouble(),
              scale.toDouble(),
              scale.toDouble(),
            ),
            ink,
          );
        }
      }
    }
    void text(
      String value,
      double y,
      double size,
      double height, {
      double width = feedDots - headDots - 7,
      bool bold = false,
    }) {
      TextPainter? fitted;
      for (var candidate = size; candidate >= 9; candidate -= 0.5) {
        final painter = TextPainter(
          text: TextSpan(
            text: value,
            style: TextStyle(
              color: Colors.black,
              fontFamily: 'Arial',
              fontSize: candidate,
              height: 1.05,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: width);
        if (painter.height <= height && painter.width <= width) {
          fitted = painter;
          break;
        }
        painter.dispose();
      }
      if (fitted == null) {
        recorder.endRecording().dispose();
        throw const FormatException(
          'The full card identity will not fit legibly on this label. Use AirPrint.',
        );
      }
      fitted.paint(canvas, Offset(headDots + 4, y));
      fitted.dispose();
    }

    text(content.title, 0, 38, 42, bold: true);
    text(content.setName, 44, 16, 28);
    text('#${content.number}', 75, 18, 20, width: 146, bold: true);
    final logoData = await rootBundle.load(
      'ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png',
    );
    final codec = await ui.instantiateImageCodec(logoData.buffer.asUint8List());
    final logo = (await codec.getNextFrame()).image;
    canvas.drawImageRect(
      logo,
      const Rect.fromLTWH(250, 230, 510, 610),
      const Rect.fromLTWH(253, 64, 27, 32),
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
    final image = await picture.toImage(feedDots, headDots);
    picture.dispose();
    logo.dispose();
    codec.dispose();
    try {
      final rgba = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      if (rgba == null || png == null) {
        throw StateError('Could not render the label.');
      }
      return P21Label(
        previewPng: png.buffer.asUint8List(),
        bitmap: packLandscape(rgba.buffer.asUint8List()),
      );
    } finally {
      image.dispose();
    }
  }

  /// Rotates the landscape preview counterclockwise into the printer's feed
  /// direction. P21 TSPL bitmaps use 1 for white and 0 for black, MSB first.
  static Uint8List packLandscape(Uint8List rgba) {
    if (rgba.length != feedDots * headDots * 4) {
      throw ArgumentError('Unexpected label pixel dimensions.');
    }
    final result = Uint8List(headDots ~/ 8 * feedDots)
      ..fillRange(0, headDots ~/ 8 * feedDots, 255);
    for (var row = 0; row < feedDots; row++) {
      for (var column = 0; column < headDots; column++) {
        final source = (column * feedDots + (feedDots - 1 - row)) * 4;
        final luminance =
            (rgba[source] * 299 +
                rgba[source + 1] * 587 +
                rgba[source + 2] * 114) ~/
            1000;
        if (rgba[source + 3] >= 128 && luminance < 160) {
          result[row * (headDots ~/ 8) + column ~/ 8] &= ~(128 >> (column % 8));
        }
      }
    }
    return result;
  }

  // Stable, non-sensitive receipt metadata, never a copy ID or printed payload.
  String get layoutVersion => 'p21_14x40_v2';
}
