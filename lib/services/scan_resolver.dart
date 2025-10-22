import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'scanner_embed.dart';

class ResolvedCandidate {
  final String cardPrintId;
  final String setCode;
  final String collectorNumber;
  final String language;
  final double confidence;
  final String name;
  final String? imageUrl;
  ResolvedCandidate({
    required this.cardPrintId,
    required this.setCode,
    required this.collectorNumber,
    required this.language,
    required this.confidence,
    required this.name,
    this.imageUrl,
  });
}

class ScanResolver {
  final SupabaseClient _client;
  final ScannerEmbedService _embed;
  ScanResolver(this._client) : _embed = ScannerEmbedService(_client);
  bool lastUsedServer = false;

  Future<List<ResolvedCandidate>> resolve({
    required String name,
    required String collectorNumber,
    String? languageHint,
    List<int>? imageJpegBytes,
  }) async {
    final lang = _normLang(languageHint);
    final trimmedName = name.trim();
    final normNum = _normalizeNumber(collectorNumber);
    try {
      // Primary: strict by number + name ilike + lang
      final data = await _client
          .from('card_prints')
          .select('id,set_code,name,number,lang,image_url,image_alt_url')
          .eq('number', normNum)
          .eq('lang', lang)
          .ilike('name', '%${_escapeLike(trimmedName)}%')
          .limit(5);
      final rows = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      if (rows.isNotEmpty) {
        final list = rows.map((r) => _mapRow(r, confidence: 0.97)).toList();
        // If still ambiguous/low, try server resolver
        if (_isAmbiguous(list) || list.first.confidence < 0.90) {
          final s = await _embed.resolve(
            imageJpegBytes: imageJpegBytes,
            nameHint: trimmedName,
            numberHint: normNum,
            langHint: lang,
          );
          if (s?.best != null) {
            final b = s!.best!;
            final mapped = _mapRow({
              'id': b['card_print_id'] ?? b['id'],
              'set_code': b['set_code'],
              'name': b['name'] ?? name,
              'number': b['number'],
              'lang': b['lang'],
              'image_url': b['image_url'],
              'image_alt_url': b['image_alt_url'],
            }, confidence: (b['confidence'] ?? 0.90) * 1.0);
            final rest = (s.alternatives).map((r) => _mapRow({
              'id': r['card_print_id'] ?? r['id'],
              'set_code': r['set_code'],
              'name': r['name'] ?? name,
              'number': r['number'],
              'lang': r['lang'],
              'image_url': r['image_url'],
              'image_alt_url': r['image_alt_url'],
            }, confidence: (r['confidence'] ?? 0.80) * 1.0)).toList();
            lastUsedServer = true;
            return [mapped, ...rest];
          }
        }
        return list;
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[SCAN] resolve.strict error $e');
    }

    // Fallback: number only + lang
    try {
      final data = await _client
          .from('card_prints')
          .select('id,set_code,name,number,lang,image_url,image_alt_url')
          .eq('number', normNum)
          .eq('lang', lang)
          .limit(5);
      final rows = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      if (rows.isNotEmpty) {
        final list = rows.map((r) => _mapRow(r, confidence: 0.90)).toList();
        if (_isAmbiguous(list)) {
          final s = await _embed.resolve(
            imageJpegBytes: imageJpegBytes,
            nameHint: trimmedName,
            numberHint: normNum,
            langHint: lang,
          );
          if (s?.best != null) {
            final b = s!.best!;
            final mapped = _mapRow({
              'id': b['card_print_id'] ?? b['id'],
              'set_code': b['set_code'],
              'name': b['name'] ?? name,
              'number': b['number'],
              'lang': b['lang'],
              'image_url': b['image_url'],
              'image_alt_url': b['image_alt_url'],
            }, confidence: (b['confidence'] ?? 0.90) * 1.0);
            final rest = (s.alternatives).map((r) => _mapRow({
              'id': r['card_print_id'] ?? r['id'],
              'set_code': r['set_code'],
              'name': r['name'] ?? name,
              'number': r['number'],
              'lang': r['lang'],
              'image_url': r['image_url'],
              'image_alt_url': r['image_alt_url'],
            }, confidence: (r['confidence'] ?? 0.80) * 1.0)).toList();
            lastUsedServer = true;
            return [mapped, ...rest];
          }
        }
        return list;
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[SCAN] resolve.num-only error $e');
    }

    // Fallback: name + lang (fuzzy)
    try {
      final data = await _client
          .from('card_prints')
          .select('id,set_code,name,number,lang,image_url,image_alt_url')
          .ilike('name', '%${_escapeLike(trimmedName)}%')
          .eq('lang', lang)
          .limit(10);
      final rows = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      if (rows.isNotEmpty) {
        return rows.map((r) => _mapRow(r, confidence: 0.80)).toList();
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[SCAN] resolve.name+lang error $e');
    }

    // Fallback: name-only fuzzy (ilike), any lang, capped
    try {
      final data = await _client
          .from('card_prints')
          .select('id,set_code,name,number,lang,image_url,image_alt_url')
          .ilike('name', '%${_escapeLike(trimmedName)}%')
          .limit(15);
      final rows = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      if (rows.isNotEmpty) {
        return rows.map((r) => _mapRow(r, confidence: 0.60)).toList();
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[SCAN] resolve.name-only error $e');
    }

    // If we reach here means confidence is low. Try server-side resolver (P1)
    try {
      lastUsedServer = true;
      // Import here to avoid cyclic import at top
      // ignore: avoid_dynamic_calls
      final embed = await _embed.resolve(
        imageJpegBytes: imageJpegBytes,
        nameHint: trimmedName,
        numberHint: normNum,
        langHint: lang,
      );
      if (embed?.best != null) {
        final b = embed!.best!;
        final mapped = _mapRow({
          'id': b['card_print_id'] ?? b['id'],
          'set_code': b['set_code'],
          'name': b['name'] ?? name,
          'number': b['number'],
          'lang': b['lang'],
          'image_url': b['image_url'],
          'image_alt_url': b['image_alt_url'],
        }, confidence: (b['confidence'] ?? 0.85) * 1.0);
        final rest = (embed.alternatives).map((r) => _mapRow({
          'id': r['card_print_id'] ?? r['id'],
          'set_code': r['set_code'],
          'name': r['name'] ?? name,
          'number': r['number'],
          'lang': r['lang'],
          'image_url': r['image_url'],
          'image_alt_url': r['image_alt_url'],
        }, confidence: (r['confidence'] ?? 0.75) * 1.0)).toList();
        return [mapped, ...rest];
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[SCAN] server-resolve error $e');
      lastUsedServer = false;
    }
    return const [];
  }

  ResolvedCandidate _mapRow(Map<String, dynamic> r, {required double confidence}) {
    final id = (r['id'] ?? '').toString();
    final sc = (r['set_code'] ?? '').toString();
    final num = (r['number'] ?? '').toString();
    final lang = (r['lang'] ?? 'en').toString();
    final name = (r['name'] ?? 'Card').toString();
    final img = (r['image_url'] ?? r['image_alt_url'] ?? '').toString();
    return ResolvedCandidate(
      cardPrintId: id,
      setCode: sc,
      collectorNumber: num,
      language: lang.toUpperCase(),
      confidence: confidence,
      name: name,
      imageUrl: img.isNotEmpty ? img : null,
    );
  }

  String _normLang(String? hint) {
    final h = (hint ?? '').trim().toLowerCase();
    if (h.isEmpty) return 'en';
    if (h == 'en' || h == 'eng' || h == 'english') return 'en';
    return h;
  }

  String _escapeLike(String s) {
    return s.replaceAll('%', '\\%').replaceAll('_', '\\_');
  }

  // Normalize number to DB format: uppercase, normalize slash, strip spaces,
  // trim leading zeros on left side of slash if present.
  String _normalizeNumber(String number) {
    var n = number.trim();
    if (n.isEmpty) return n;
    // Normalize unicode slashes/dashes
    n = n
        .replaceAll('\u2215', '/') // division slash
        .replaceAll('／', '/') // fullwidth slash
        .replaceAll('⁄', '/') // fraction slash
        .replaceAll('-', '/') // seen in some prints
        .replaceAll('–', '/')
        .replaceAll('—', '/')
        .replaceAll(' ', '')
        .toUpperCase();
    final parts = n.split('/');
    if (parts.length == 2) {
      final left = parts[0].replaceFirst(RegExp(r'^0+'), '');
      final right = parts[1].replaceFirst(RegExp(r'^0+'), '');
      final l = left.isEmpty ? '0' : left;
      final r = right.isEmpty ? right : right; // keep right as-is except zeros removed
      return '$l/$r';
    }
    return n;
  }
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

