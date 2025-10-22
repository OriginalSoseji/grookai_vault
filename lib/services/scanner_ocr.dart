import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image/image.dart' as img;

class OcrResult {
  final String name;
  final String collectorNumber;
  final String? languageHint; // e.g., 'en'
  OcrResult({required this.name, required this.collectorNumber, this.languageHint});
}

class ScannerOcr {
  final TextRecognizer _text = TextRecognizer(script: TextRecognitionScript.latin);

  Future<OcrResult> extract(File imageFile) async {
    // Load image and prepare two crops to improve accuracy
    final bytes = await imageFile.readAsBytes();
    final decoded = img.decodeImage(bytes);
    List<String> fullLines = <String>[];
    List<String> numLines = <String>[];
    List<String> nameLines = <String>[];
    if (decoded != null) {
      final h = decoded.height;
      final w = decoded.width;
      final bottomH = (h * 0.26).round().clamp(1, h);
      final numCrop = img.copyCrop(decoded, x: 0, y: h - bottomH, width: w, height: bottomH);
      final topH = (h * 0.36).round().clamp(1, h);
      final nameCrop = img.copyCrop(decoded, x: 0, y: 0, width: w, height: topH);

      // Recognize number band
      try {
        final tmpNum = await _writeTempJpg(numCrop);
        final recNum = await _text.processImage(InputImage.fromFile(tmpNum));
        for (final b in recNum.blocks) {
          for (final l in b.lines) {
            final t = l.text.trim();
            if (t.isNotEmpty) numLines.add(t);
          }
        }
      } catch (_) {}

      // Recognize name band
      try {
        final tmpName = await _writeTempJpg(nameCrop);
        final recName = await _text.processImage(InputImage.fromFile(tmpName));
        for (final b in recName.blocks) {
          for (final l in b.lines) {
            final t = l.text.trim();
            if (t.isNotEmpty) nameLines.add(t);
          }
        }
      } catch (_) {}
    }

    // Fallback: recognize the full image if crops produced nothing
    if (numLines.isEmpty || nameLines.isEmpty) {
      try {
        final input = InputImage.fromFile(imageFile);
        final recognized = await _text.processImage(input);
        for (final block in recognized.blocks) {
          for (final line in block.lines) {
            final t = line.text.trim();
            if (t.isNotEmpty) fullLines.add(t);
          }
        }
      } catch (_) {}
    }

    final allText = [...nameLines, ...numLines, ...fullLines].join('\n');
    if (kDebugMode) debugPrint('[SCAN] ocr.lines name=${nameLines.length} num=${numLines.length} full=${fullLines.length}');

    // Collector number from number-band first, then fallback to all text
    String number = _extractCollectorNumber(numLines.join(' ')) ?? _extractCollectorNumber(allText) ?? '';
    number = _normalizeNumber(number);

    // Name from name-band first, then fallback to all text lines
    String name = _extractName(nameLines.isNotEmpty ? nameLines : fullLines) ?? '';

    final lang = _guessLang(allText) ?? 'en';
    if (kDebugMode) debugPrint('[SCAN] ocr: name="$name" number="$number" lang="$lang"');
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
    // Quick & naive: Japanese kana/kanji
    final hasKana = RegExp(r'[\u3040-\u30ff]').hasMatch(text); // Hiragana/Katakana
    final hasHan = RegExp(r'[\u4e00-\u9fff]').hasMatch(text); // CJK unified
    if (hasKana) return 'ja';
    if (hasHan) return 'zh';
    return null;
  }

  String _normalizeNumber(String n) {
    var s = n.trim();
    if (s.isEmpty) return s;
    s = s
        .replaceAll('\u2215', '/')
        .replaceAll('／', '/')
        .replaceAll('⁄', '/')
        .replaceAll('-', '/')
        .replaceAll('–', '/')
        .replaceAll('—', '/')
        .replaceAll(' ', '')
        .toUpperCase();
    final parts = s.split('/');
    if (parts.length == 2) {
      final left = parts[0].replaceFirst(RegExp(r'^0+'), '');
      final right = parts[1].replaceFirst(RegExp(r'^0+'), '');
      final l = left.isEmpty ? '0' : left;
      final r = right.isEmpty ? right : right;
      return '$l/$r';
    }
    return s;
  }

  Future<File> _writeTempJpg(img.Image im) async {
    final tmpDir = Directory.systemTemp.createTempSync('scan_');
    final f = File('${tmpDir.path}/crop_${DateTime.now().microsecondsSinceEpoch}.jpg');
    final bytes = img.encodeJpg(im, quality: 92);
    await f.writeAsBytes(bytes, flush: true);
    return f;
  }
}
