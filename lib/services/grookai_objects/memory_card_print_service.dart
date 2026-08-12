import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

enum MemoryCardPrintMode { memoryInsert, frontAndBack }

typedef MemoryCardPdfLayout =
    Future<bool> Function({
      required String name,
      required Future<Uint8List> Function(PdfPageFormat format) onLayout,
    });

typedef MemoryCardPdfShare =
    Future<bool> Function({required Uint8List bytes, required String filename});

class MemoryCardPrintPlacement {
  const MemoryCardPrintPlacement({
    required this.left,
    required this.top,
    required this.width,
    required this.height,
  });

  final double left;
  final double top;
  final double width;
  final double height;
}

class MemoryCardPrintService {
  MemoryCardPrintService({
    MemoryCardPdfLayout? layoutPdf,
    MemoryCardPdfShare? sharePdf,
  }) : _layoutPdf = layoutPdf ?? _systemLayoutPdf,
       _sharePdf = sharePdf ?? _systemSharePdf;

  static const double cardWidthInches = 2.5;
  static const double cardHeightInches = 3.5;
  static const double cardWidthPoints = cardWidthInches * PdfPageFormat.inch;
  static const double cardHeightPoints = cardHeightInches * PdfPageFormat.inch;

  static const double _cropMarkGap = 2;
  static const double _cropMarkLength = 6;
  static const double _cropMarkThickness = 0.5;
  static const double _cropMarkExtent = _cropMarkGap + _cropMarkLength;

  final MemoryCardPdfLayout _layoutPdf;
  final MemoryCardPdfShare _sharePdf;

  static MemoryCardPrintPlacement placementFor(PdfPageFormat pageFormat) {
    return MemoryCardPrintPlacement(
      left: (pageFormat.width - cardWidthPoints) / 2,
      top: (pageFormat.height - cardHeightPoints) / 2,
      width: cardWidthPoints,
      height: cardHeightPoints,
    );
  }

  Future<bool> printMemory({
    required Uint8List memorySidePng,
    Uint8List? cardSidePng,
    required MemoryCardPrintMode mode,
    required String documentName,
  }) {
    if (mode == MemoryCardPrintMode.frontAndBack && cardSidePng == null) {
      throw ArgumentError.notNull('cardSidePng');
    }
    return _layoutPdf(
      name: documentName,
      onLayout: (format) => buildPdf(
        pageFormat: format,
        memorySidePng: memorySidePng,
        cardSidePng: cardSidePng,
        mode: mode,
        title: documentName,
      ),
    );
  }

  Future<bool> shareMemoryPdf({
    required Uint8List memorySidePng,
    Uint8List? cardSidePng,
    required MemoryCardPrintMode mode,
    required String fileName,
    PdfPageFormat pageFormat = PdfPageFormat.letter,
  }) async {
    if (mode == MemoryCardPrintMode.frontAndBack && cardSidePng == null) {
      throw ArgumentError.notNull('cardSidePng');
    }
    final bytes = await buildPdf(
      pageFormat: pageFormat,
      memorySidePng: memorySidePng,
      cardSidePng: cardSidePng,
      mode: mode,
      title: fileName,
    );
    return _sharePdf(bytes: bytes, filename: fileName);
  }

  Future<Uint8List> buildPdf({
    required PdfPageFormat pageFormat,
    required Uint8List memorySidePng,
    Uint8List? cardSidePng,
    required MemoryCardPrintMode mode,
    String title = 'Grookai Memory',
  }) async {
    final document = pw.Document(
      title: title,
      author: 'Grookai Vault',
      creator: 'Grookai Vault Memory Print V1',
    );

    if (mode == MemoryCardPrintMode.frontAndBack) {
      document.addPage(_page(pageFormat: pageFormat, imageBytes: cardSidePng!));
    }
    document.addPage(_page(pageFormat: pageFormat, imageBytes: memorySidePng));
    return document.save();
  }

  pw.Page _page({
    required PdfPageFormat pageFormat,
    required Uint8List imageBytes,
  }) {
    final image = pw.MemoryImage(imageBytes);
    return pw.Page(
      pageFormat: pageFormat,
      margin: pw.EdgeInsets.zero,
      build: (_) => pw.Center(child: _cardWithCropMarks(image)),
    );
  }

  pw.Widget _cardWithCropMarks(pw.ImageProvider image) {
    final canvasWidth = cardWidthPoints + (_cropMarkExtent * 2);
    final canvasHeight = cardHeightPoints + (_cropMarkExtent * 2);
    final cardLeft = _cropMarkExtent;
    final cardTop = _cropMarkExtent;
    final cardRight = cardLeft + cardWidthPoints;
    final cardBottom = cardTop + cardHeightPoints;

    pw.Widget horizontal(double left, double top) => pw.Positioned(
      left: left,
      top: top,
      child: pw.Container(
        width: _cropMarkLength,
        height: _cropMarkThickness,
        color: PdfColors.grey700,
      ),
    );
    pw.Widget vertical(double left, double top) => pw.Positioned(
      left: left,
      top: top,
      child: pw.Container(
        width: _cropMarkThickness,
        height: _cropMarkLength,
        color: PdfColors.grey700,
      ),
    );

    return pw.SizedBox(
      width: canvasWidth,
      height: canvasHeight,
      child: pw.Stack(
        children: [
          pw.Positioned(
            left: cardLeft,
            top: cardTop,
            child: pw.SizedBox(
              width: cardWidthPoints,
              height: cardHeightPoints,
              child: pw.Image(image, fit: pw.BoxFit.fill),
            ),
          ),
          horizontal(0, cardTop),
          horizontal(cardRight + _cropMarkGap, cardTop),
          horizontal(0, cardBottom),
          horizontal(cardRight + _cropMarkGap, cardBottom),
          vertical(cardLeft, 0),
          vertical(cardRight, 0),
          vertical(cardLeft, cardBottom + _cropMarkGap),
          vertical(cardRight, cardBottom + _cropMarkGap),
        ],
      ),
    );
  }

  static Future<bool> _systemLayoutPdf({
    required String name,
    required Future<Uint8List> Function(PdfPageFormat format) onLayout,
  }) {
    return Printing.layoutPdf(name: name, onLayout: onLayout);
  }

  static Future<bool> _systemSharePdf({
    required Uint8List bytes,
    required String filename,
  }) {
    return Printing.sharePdf(bytes: bytes, filename: filename);
  }
}
