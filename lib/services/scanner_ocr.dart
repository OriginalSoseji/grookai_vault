import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrResult {
  final String name;
  final String collectorNumber;
  final String? languageHint; // e.g., 'en'
  OcrResult({required this.name, required this.collectorNumber, this.languageHint});
}

class ScannerOcr {
  final TextRecognizer _text = TextRecognizer(script: TextRecognitionScript.latin);

  Future<OcrResult> extract(File imageFile) async {
    final input = InputImage.fromFile(imageFile);
    final recognized = await _text.processImage(input);
    final lines = <String>[];
    for (final block in recognized.blocks) {
      for (final line in block.lines) {
        final t = line.text.trim();
        if (t.isNotEmpty) lines.add(t);
      }
    }
    final text = lines.join('\n');
    if (kDebugMode) debugPrint('[SCAN] ocr.lines=${lines.length}');

    // Heuristic: find collector number like "12/190" or alphanum like "RC12/RC"
    String number = _extractCollectorNumber(text) ?? '';

    // Heuristic for name: take the first long-ish alpha line without '/'
    String name = _extractName(lines) ?? '';

    // Basic language guess (very naive): look for small language tag strings
    String? lang = _guessLang(text);

    return OcrResult(name: name, collectorNumber: number, languageHint: lang);
  }

  String? _extractName(List<String> lines) {
    for (final l in lines) {
      final s = l.trim();
      if (s.length < 3) continue;
      if (s.contains('/')) continue;
      // Prefer alphabetic-rich lines
      final alpha = RegExp(r'[A-Za-z]{3,}');
      if (alpha.hasMatch(s)) return s;
    }
    // fallback: longest line
    return lines.isEmpty ? null : (lines..sort((a,b)=>b.length.compareTo(a.length))).first.trim();
  }

  String? _extractCollectorNumber(String text) {
    final t = text.replaceAll('\n', ' ');
    // Match N/D form e.g., 12/190 or 3/102
    final m = RegExp(r'\b([A-Z]*\d{1,3}\s*/\s*\d{1,3})\b', caseSensitive: false).firstMatch(t);
    if (m != null) return m.group(1)!.replaceAll(' ', '');
    // Fallback: standalone like RC23 or SV-P
    final m2 = RegExp(r'\b([A-Z]{0,3}\d{1,3}[A-Z]{0,2})\b').firstMatch(t);
    if (m2 != null) return m2.group(1)!
      .replaceAll(' ', '')
      .toUpperCase();
    return null;
  }

  String? _guessLang(String text) {
    final lc = text.toLowerCase();
    if (lc.contains('pokemon')) return 'en';
    return null;
  }
}

