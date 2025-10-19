import 'package:supabase_flutter/supabase_flutter.dart';

String _normSet(String s) => s.trim().toLowerCase();

String _normNum(String n) {
  final left = (n.trim().split('/').first);
  final core = left.replaceAll(RegExp(r'[^0-9a-zA-Z]'), '');
  final m = RegExp(r'^(\d+)([a-zA-Z]+)$').firstMatch(core);
  if (m != null) {
    final num = int.parse(m.group(1)!);
    final suf = m.group(2)!.toLowerCase();
    return num.toString().padLeft(3, '0') + suf;   // 1a -> 001a
  }
  if (RegExp(r'^\d+$').hasMatch(core)) {
    return int.parse(core).toString().padLeft(3, '0'); // 1 -> 001
  }
  return core.toLowerCase();
}

class PriceService {
  final SupabaseClient _supa;
  PriceService(this._supa);

  /// Return the newest price row for the print.
  /// Tries [variant] first; if not found, falls back to any available variant.
  Future<Map<String, dynamic>?> latestPrice({
    required String setCode,
    required String number,
    String? variant,
  }) async {
    final set = _normSet(setCode);
    final num = _normNum(number);

    // 1) Try requested variant
    if (variant != null && variant.isNotEmpty) {
      final rows1 = await _supa
          .from('latest_prices')
          .select()
          .eq('set_code', set)
          .eq('number', num)
          .eq('variant', variant)
          .order('observed_at', ascending: false)
          .limit(1) as List;
      if (rows1.isNotEmpty) {
        return rows1.first as Map<String, dynamic>;
      }
    }

    // 2) Fallback: any available variant
    final rows2 = await _supa
        .from('latest_prices')
        .select()
        .eq('set_code', set)
        .eq('number', num)
        .order('observed_at', ascending: false)
        .limit(1) as List;
    return rows2.isNotEmpty ? rows2.first as Map<String, dynamic> : null;
  }

  /// Discover available variants for this print, newest first (deduped).
  Future<List<String>> availableVariants({
    required String setCode,
    required String number,
  }) async {
    final set = _normSet(setCode);
    final num = _normNum(number);

    final rows = await _supa
        .from('latest_prices')
        .select('variant,observed_at')
        .eq('set_code', set)
        .eq('number', num)
        .order('observed_at', ascending: false)
        .limit(20) as List;

    final out = <String>[];
    for (final r in rows) {
      final v = (r['variant'] ?? '').toString();
      if (v.isNotEmpty && !out.contains(v)) out.add(v);
    }
    return out;
  }
}
