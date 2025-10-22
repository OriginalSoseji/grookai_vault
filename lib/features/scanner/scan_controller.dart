import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/scanner_ocr.dart';
import '../../services/scan_resolver.dart';
import '../../services/scan_metrics.dart';
import '../../config/flags.dart';

enum ScanState { idle, capturing, ocr, resolving, importing, done }

class ScanController extends ChangeNotifier {
  final SupabaseClient supabase;
  final ScannerOcr ocr;
  final ScanResolver resolver;
  late final ScanMetrics metrics;

  ScanController(this.supabase)
      : ocr = ScannerOcr(),
        resolver = ScanResolver(supabase) {
    metrics = ScanMetrics(supabase);
  }

  ScanState _state = ScanState.idle;
  ScanState get state => _state;
  void _setState(ScanState s) { _state = s; notifyListeners(); }
  bool _busy = false;

  OcrResult? _ocr;
  OcrResult? get ocrResult => _ocr;

  List<ResolvedCandidate> _candidates = const [];
  List<ResolvedCandidate> get candidates => _candidates;

  ResolvedCandidate? _chosen;
  ResolvedCandidate? get chosen => _chosen;
  static final Map<String, DateTime> _cooldown = <String, DateTime>{};
  bool _usedLazy = false;

  Future<void> processCapture(File file) async {
    if (_busy) return; // ignore duplicate taps
    _busy = true;
    final t0 = DateTime.now();
    debugPrint('[SCAN] start');
    _setState(ScanState.capturing);
    try {
      debugPrint('[SCAN] capture');
      _setState(ScanState.ocr);
      _ocr = await ocr.extract(file).timeout(const Duration(seconds: 8), onTimeout: () {
        debugPrint('[SCAN] timeout:ocr');
        throw TimeoutException('ocr');
      });
      final name = _ocr?.name ?? '';
      final num = _ocr?.collectorNumber ?? '';
      debugPrint('[SCAN] ocr:$name#$num');

      _setState(ScanState.resolving);
      _candidates = await resolver.resolve(
        name: name,
        collectorNumber: num,
        languageHint: _ocr?.languageHint,
        imageJpegBytes: _ocr?.nameCropJpeg,
      ).timeout(const Duration(seconds: 8), onTimeout: () {
        debugPrint('[SCAN] timeout:resolve');
        throw TimeoutException('resolve');
      });
      if (_candidates.isNotEmpty) {
        debugPrint('[SCAN] resolve:${_candidates.first.cardPrintId}');
      }
      _setState(ScanState.done);
      // Lazy import integration on miss/low confidence
      final low = _candidates.isEmpty || (_candidates.first.confidence < 0.50);
      if (low && GV_SCAN_LAZY_IMPORT) {
        final key = '${name.trim().toUpperCase()}|${num.trim().toUpperCase()}|${(_ocr?.languageHint ?? 'en').toUpperCase()}';
        final until = _cooldown[key];
        if (until != null && until.isAfter(DateTime.now())) {
          debugPrint('[SCAN→LAZY] skip (cooldown) key=$key');
        } else {
          debugPrint('[SCAN→LAZY] trigger key=$key');
          _setState(ScanState.importing);
          _usedLazy = true;
          try {
            await supabase.functions.invoke('import-cards', body: {
              'name': name,
              'number': num,
              'lang': _ocr?.languageHint ?? 'en',
            });
          } catch (_) {}
          _cooldown[key] = DateTime.now().add(Duration(milliseconds: GV_SCAN_LAZY_COOLDOWN_MS));
          await Future.delayed(const Duration(seconds: 3));
          // Retry once
          _setState(ScanState.resolving);
          _candidates = await resolver.resolve(
            name: name,
            collectorNumber: num,
            languageHint: _ocr?.languageHint,
            imageJpegBytes: _ocr?.nameCropJpeg,
          );
          if (_candidates.isNotEmpty) {
            debugPrint('[SCAN] resolve:${_candidates.first.cardPrintId}');
          }
          _setState(ScanState.done);
        }
      }
      // Telemetry
      final elapsed = DateTime.now().difference(t0).inMilliseconds;
      final type = _candidates.isEmpty
          ? 'scan_none'
          : _isAmbiguous(_candidates)
              ? 'scan_ambiguous'
              : 'scan_success';
      await metrics.log(
        type: type,
        candidates: _candidates.length,
        bestConfidence: _candidates.isEmpty ? null : _candidates.first.confidence,
        elapsedMs: elapsed,
        usedServer: resolver.lastUsedServer,
        usedLazy: _usedLazy,
      );
    } catch (e, st) {
      if (kDebugMode) debugPrint('[SCAN] error $e\n$st');
      _setState(ScanState.done);
      rethrow;
    } finally { _busy = false; }
  }

  void choose(ResolvedCandidate c) {
    _chosen = c;
    notifyListeners();
  }

  bool _isAmbiguous(List<ResolvedCandidate> list) {
    if (list.length < 2) return false;
    final best = list.first;
    for (final c in list.skip(1).take(2)) {
      if ((best.confidence - c.confidence).abs() <= 0.05) return true;
    }
    return false;
  }
}
