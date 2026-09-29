import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:grookai_vault/services/printing/p21_label.dart';

void main() {
  test('P21 raster preserves white background, orientation, and MSB order', () {
    final rgba = Uint8List(P21Label.feedDots * P21Label.headDots * 4)
      ..fillRange(0, P21Label.feedDots * P21Label.headDots * 4, 255);
    expect(P21Label.packLandscape(rgba), everyElement(255));
    for (final pixel in [283, 95 * 284]) {
      rgba.fillRange(pixel * 4, pixel * 4 + 3, 0);
    }
    final packed = P21Label.packLandscape(rgba);
    expect(packed.length, 3408);
    expect(packed.first, 127);
    expect(packed.last, 254);
    expect(packed.sublist(1, packed.length - 1), everyElement(255));
    expect(() => P21Label.packLandscape(Uint8List(4)), throwsArgumentError);
  });

  testWidgets(
    'render actual label preview and reject unreadably dense QR links',
    (tester) async {
      await tester.runAsync(() async {
        final fontPath = Platform.environment['P21_PREVIEW_FONT'];
        if (fontPath != null) {
          final loader = FontLoader('Arial')
            ..addFont(
              Future.value(
                ByteData.sublistView(await File(fontPath).readAsBytes()),
              ),
            );
          await loader.load();
        }
        final label = await P21Label.render(
          P21LabelContent(
            title: 'Eevee',
            setName: 'SWSH Black Star Promos',
            number: 'SWSH042',
            qrUri: Uri.parse('https://grookaivault.com/q/GVVI-065CAB28-001386'),
          ),
        );
        expect(label.bitmap.length, 3408);
        expect(label.bitmap.any((byte) => byte != 255), isTrue);
        final output = Platform.environment['P21_PREVIEW_PATH'];
        if (output != null) await File(output).writeAsBytes(label.previewPng);
        await expectLater(
          P21Label.render(
            P21LabelContent(
              title: 'Long link',
              setName: 'Test set',
              number: '123',
              qrUri: Uri.parse('https://example.com/${'x' * 500}'),
            ),
          ),
          throwsFormatException,
        );
      });
    },
  );
}
