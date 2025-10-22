import 'package:supabase_flutter/supabase_flutter.dart';

String _normSet(String s) => s.trim().toLowerCase();

String _normNum(String n) {
  final left = (n.trim().split('/').first);
  final core = left.replaceAll(RegExp(r'[^0-9a-zA-Z]'), '');
  final m = RegExp(r'^(\d+)([a-zA-Z]+)$').firstMatch(core);
  if (m != null) {
    final parsed = int.tryParse(m.group(1) ?? '') ?? 0;
    final suf = (m.group(2) ?? '').toLowerCase();
    return parsed.toString().padLeft(3, '0') + suf;   // 1a -> 001a
  }
  if (RegExp(r'^\d+$').hasMatch(core)) {
    final v = int.tryParse(core) ?? 0;
    return v.toString().padLeft(3, '0'); // 1 -> 001
  }
  return core.toLowerCase();
}

/// Join-aware pricing service using v_latest_print_prices
/// View columns: set_code, number, print_id, condition, grade_agency, grade_value, source, price_usd, observed_at
class PriceService {
  final SupabaseClient _supa;
  PriceService(this._supa);

  /// Newest price row for a set/number (optionally filter by condition/grade).
  Future<Map<String, dynamic>?> latestPrice({
    required String setCode,
    required String number,
    String? condition,
    String? gradeAgency,
    String? gradeValue,
  }) async {
    final set = _normSet(setCode);
    final num = _normNum(number);

    dynamic q = _supa
        .from('v_latest_print_prices')
        .select()
        .eq('set_code', set)
        .eq('number', num)
        .order('observed_at', ascending: false)
        .limit(1);

    if (condition != null && condition.isNotEmpty) {
      // ignore: cascade_invocations
      q.eq('condition', condition);
    }
    if (gradeAgency != null && gradeAgency.isNotEmpty) {
      // ignore: cascade_invocations
      q.eq('grade_agency', gradeAgency);
    }
    if (gradeValue != null && gradeValue.isNotEmpty) {
      // ignore: cascade_invocations
      q.eq('grade_value', gradeValue);
    }

    final rows = await q as List;
    return rows.isNotEmpty ? rows.first as Map<String, dynamic> : null;
  }

  /// Distinct sources available for a print, newest first.
  Future<List<String>> availableVariants({
    required String setCode,
    required String number,
  }) async {
    final set = _normSet(setCode);
    final num = _normNum(number);

    final rows = await _supa
        .from('v_latest_print_prices')
        .select('source,observed_at')
        .eq('set_code', set)
        .eq('number', num)
        .order('observed_at', ascending: false)
        .limit(20) as List;

    final out = <String>[];
    for (final r in rows) {
      final s = (r['source'] ?? '').toString();
      if (s.isNotEmpty && !out.contains(s)) out.add(s);
    }
    return out;
  }
}
