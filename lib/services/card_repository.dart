import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';

class CardRepository {
  final SupabaseClient _sb;
  CardRepository(this._sb);

  Future<Map<String, dynamic>?> getOrImportCard({
    required String setCode,
    required String number,
    String lang = 'en',
  }) async {
    final localList = await _sb
        .from('card_prints') // switch to your view if preferred
        .select('id, set_code, name, number, image_url, name_local, lang')
        .eq('set_code', setCode)
        .eq('number', number)
        .limit(1);
    final local = List<Map<String, dynamic>>.from(localList as List);
    if (local.isNotEmpty) return local.first;

    final resp = await _sb.functions.invoke(
      'import-card',
      body: {'set_code': setCode, 'number': number, 'lang': lang},
    );

    final againList = await _sb
        .from('card_prints')
        .select('id, set_code, name, number, image_url, name_local, lang')
        .eq('set_code', setCode)
        .eq('number', number)
        .limit(1);
    final again = List<Map<String, dynamic>>.from(againList as List);
    if (again.isNotEmpty) return again.first;

    try {
      final dynamic d = resp.data;
      final Map<String, dynamic> m = d is Map<String, dynamic>
          ? d
          : (d is String
                ? (json.decode(d) as Map<String, dynamic>)
                : <String, dynamic>{});
      if (m['card'] != null) return Map<String, dynamic>.from(m['card']);
    } catch (_) {}
    return null;
  }
}
