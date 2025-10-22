import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/scanner_ocr.dart';
import '../../services/scan_resolver.dart';

enum ScanState { idle, capturing, ocr, resolving, done }

class ScanController extends ChangeNotifier {
  final SupabaseClient supabase;
  final ScannerOcr ocr;
  final ScanResolver resolver;

  ScanController(this.supabase)
      : ocr = ScannerOcr(),
        resolver = ScanResolver(supabase);

  ScanState _state = ScanState.idle;
  ScanState get state => _state;
  void _setState(ScanState s) { _state = s; notifyListeners(); }

  OcrResult? _ocr;
  OcrResult? get ocrResult => _ocr;

  List<ResolvedCandidate> _candidates = const [];
  List<ResolvedCandidate> get candidates => _candidates;

  ResolvedCandidate? _chosen;
  ResolvedCandidate? get chosen => _chosen;

  Future<void> processCapture(File file) async {
    debugPrint('[SCAN] start');
    _setState(ScanState.capturing);
    try {
      debugPrint('[SCAN] capture');
      _setState(ScanState.ocr);
      _ocr = await ocr.extract(file);
      final name = _ocr?.name ?? '';
      final num = _ocr?.collectorNumber ?? '';
      debugPrint('[SCAN] ocr:$name#$num');

      _setState(ScanState.resolving);
      _candidates = await resolver.resolve(
        name: name,
        collectorNumber: num,
        languageHint: _ocr?.languageHint,
      );
      if (_candidates.isNotEmpty) {
        debugPrint('[SCAN] resolve:${_candidates.first.cardPrintId}');
      }
      _setState(ScanState.done);
    } catch (e, st) {
      if (kDebugMode) debugPrint('[SCAN] error $e\n$st');
      _setState(ScanState.done);
      rethrow;
    }
  }

  void choose(ResolvedCandidate c) {
    _chosen = c;
    notifyListeners();
  }
}

