import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'p21_label.dart';
import 'identity_label_raster.dart';

enum IdentityLabelFormat {
  p21('P21 · 14 × 40 mm', 40, 14),
  munbyn('Munbyn · 102 × 152 mm', 102, 152);

  const IdentityLabelFormat(this.label, this.widthMm, this.heightMm);
  final String label;
  final double widthMm, heightMm;
  PdfPageFormat get page => PdfPageFormat(
    widthMm * PdfPageFormat.mm,
    heightMm * PdfPageFormat.mm,
    marginAll: 0,
  );
}

/// Reusable physical identity only. No seller-price or condition inputs exist.
Future<Uint8List> buildIdentityLabelDocument(
  List<P21LabelContent> labels,
  IdentityLabelFormat format,
) async {
  if (labels.isEmpty ||
      labels.length > 50 ||
      labels.map((label) => label.qrUri.toString()).toSet().length !=
          labels.length) {
    throw const FormatException('Choose between 1 and 50 physical copies.');
  }
  final document = pw.Document();
  for (final content in labels) {
    if (format == IdentityLabelFormat.p21) {
      final rendered = await P21Label.render(content);
      // Preserve the qualified 203-dpi integer-module raster at physical size.
      final image = pw.MemoryImage(rendered.previewPng);
      document.addPage(
        pw.Page(
          pageFormat: format.page,
          build: (_) => pw.Center(
            child: pw.Image(
              image,
              width: P21Label.feedDots / 203 * 25.4 * PdfPageFormat.mm,
              height: P21Label.headDots / 203 * 25.4 * PdfPageFormat.mm,
            ),
          ),
        ),
      );
    } else {
      final raster = await IdentityLabelRaster.render(content);
      final image = pw.MemoryImage(raster);
      document.addPage(
        pw.Page(
          pageFormat: format.page,
          build: (_) => pw.Center(
            child: pw.Image(
              image,
              width: IdentityLabelRaster.width / 203 * 25.4 * PdfPageFormat.mm,
              height:
                  IdentityLabelRaster.height / 203 * 25.4 * PdfPageFormat.mm,
            ),
          ),
        ),
      );
    }
  }
  return document.save();
}
