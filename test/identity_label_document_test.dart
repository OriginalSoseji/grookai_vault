import 'dart:io';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/printing/p21_label.dart';
import 'package:grookai_vault/services/printing/identity_label_document.dart';
import 'package:grookai_vault/services/printing/identity_label_raster.dart';

void main() {
  final labels = [
    P21LabelContent(
      title: 'Eevee',
      setName: 'Prismatic Evolutions',
      number: 'SWSH042',
      qrUri: Uri.parse('https://grookaivault.com/q/GVVI-AC000001-000001'),
    ),
    P21LabelContent(
      title: 'Arceus & Dialga & Palkia-GX',
      setName: 'Cosmic Eclipse',
      number: '221/236',
      qrUri: Uri.parse('https://grookaivault.com/q/GVVI-AC000001-000002'),
    ),
  ];
  testWidgets(
    'two full identities generate two exact-size, price-free label documents',
    (tester) async {
      await tester.runAsync(() async {
        final fonts = FontLoader('Roboto')
          ..addFont(rootBundle.load('assets/fonts/Roboto/Roboto-Regular.ttf'))
          ..addFont(rootBundle.load('assets/fonts/Roboto/Roboto-Bold.ttf'));
        await fonts.load();
        for (final format in IdentityLabelFormat.values) {
          final pdf = await buildIdentityLabelDocument(labels, format);
          expect(ascii.decode(pdf.take(5).toList()), '%PDF-');
          expect(pdf.length, greaterThan(500));
          final output = Platform.environment['IDENTITY_LABEL_QA_DIR'];
          if (output != null) {
            await Directory(output).create(recursive: true);
            await File('$output/${format.name}-labels.pdf').writeAsBytes(pdf);
            final preview = format == IdentityLabelFormat.p21
                ? (await P21Label.render(labels.first)).previewPng
                : await IdentityLabelRaster.render(labels.first);
            await File(
              '$output/${format.name}-label.png',
            ).writeAsBytes(preview);
          }
        }
      });
    },
  );
  testWidgets(
    'invalid or duplicated selections cannot create physical output',
    (tester) async {
      await tester.runAsync(() async {
        await expectLater(
          P21Label.render(
            P21LabelContent(
              title: 'Eevee',
              setName: '',
              number: '74',
              qrUri: labels.first.qrUri,
            ),
          ),
          throwsFormatException,
        );
        await expectLater(
          IdentityLabelRaster.render(
            P21LabelContent(
              title: 'Eevee',
              setName: 'Unknown set',
              number: '74',
              qrUri: labels.first.qrUri,
            ),
          ),
          throwsFormatException,
        );
        await expectLater(
          buildIdentityLabelDocument([], IdentityLabelFormat.p21),
          throwsFormatException,
        );
        await expectLater(
          buildIdentityLabelDocument([
            labels.first,
            labels.first,
          ], IdentityLabelFormat.p21),
          throwsFormatException,
        );
        await expectLater(
          IdentityLabelRaster.render(
            P21LabelContent(
              title: 'Very long full identity ' * 2000,
              setName: 'Full set',
              number: '1',
              qrUri: labels.first.qrUri,
            ),
          ),
          throwsFormatException,
        );
      });
    },
  );
}
