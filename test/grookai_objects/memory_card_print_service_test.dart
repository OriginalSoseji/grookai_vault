import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/grookai_objects/memory_card_print_service.dart';
import 'package:pdf/pdf.dart';

void main() {
  test('card placement is exactly 2.5 by 3.5 inches and centered', () {
    final placement = MemoryCardPrintService.placementFor(PdfPageFormat.letter);

    expect(
      placement.width,
      MemoryCardPrintService.cardWidthInches * PdfPageFormat.inch,
    );
    expect(
      placement.height,
      MemoryCardPrintService.cardHeightInches * PdfPageFormat.inch,
    );
    expect(placement.left, (PdfPageFormat.letter.width - placement.width) / 2);
    expect(placement.top, (PdfPageFormat.letter.height - placement.height) / 2);
  });

  test('Memory insert PDF has one page', () async {
    final service = MemoryCardPrintService();
    final bytes = await service.buildPdf(
      pageFormat: PdfPageFormat.letter,
      memorySidePng: _onePixelPng,
      mode: MemoryCardPrintMode.memoryInsert,
    );

    expect(_pdfPageCount(bytes), 1);
    expect(ascii.decode(bytes.take(4).toList()), '%PDF');
  });

  test('front-and-back PDF has two aligned pages', () async {
    final service = MemoryCardPrintService();
    final bytes = await service.buildPdf(
      pageFormat: PdfPageFormat.a4,
      memorySidePng: _onePixelPng,
      cardSidePng: _onePixelPng,
      mode: MemoryCardPrintMode.frontAndBack,
    );

    expect(_pdfPageCount(bytes), 2);
    final placement = MemoryCardPrintService.placementFor(PdfPageFormat.a4);
    expect(placement.width, 180);
    expect(placement.height, 252);
  });

  test('print uses the printer-selected paper format', () async {
    Uint8List? printedBytes;
    String? printedName;
    final service = MemoryCardPrintService(
      layoutPdf: ({required name, required onLayout}) async {
        printedName = name;
        printedBytes = await onLayout(PdfPageFormat.a4);
        return true;
      },
    );

    final accepted = await service.printMemory(
      memorySidePng: _onePixelPng,
      mode: MemoryCardPrintMode.memoryInsert,
      documentName: 'grookai-memory-pikachu.pdf',
    );

    expect(accepted, isTrue);
    expect(printedName, 'grookai-memory-pikachu.pdf');
    expect(printedBytes, isNotNull);
    expect(_pdfPageCount(printedBytes!), 1);
  });

  test('front-and-back mode requires a card-side image', () {
    final service = MemoryCardPrintService();

    expect(
      () => service.printMemory(
        memorySidePng: _onePixelPng,
        mode: MemoryCardPrintMode.frontAndBack,
        documentName: 'memory.pdf',
      ),
      throwsArgumentError,
    );
  });
}

int _pdfPageCount(Uint8List bytes) {
  final content = latin1.decode(bytes, allowInvalid: true);
  return RegExp(r'/Type\s*/Page(?!s)').allMatches(content).length;
}

final Uint8List _onePixelPng = base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
);
