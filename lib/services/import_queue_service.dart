import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';

class ImportQueueService {
  final _client = Supabase.instance.client;

  Future<Map<String, dynamic>> enqueue({required String setCode, required String number, String lang = 'en'}) async {
    final body = { 'set_code': setCode, 'number': number, 'lang': lang };
    if (kDebugMode) debugPrint('[HTTP] FUNC enqueue_import body=$body');
    try {
      final res = await _client.functions.invoke('enqueue_import', body: body);
      final data = res.data;
      if (data is Map<String, dynamic>) return data;
      return { 'ok': false, 'code': 'bad_response', 'message': 'Unexpected response' };
    } catch (e) {
      return { 'ok': false, 'code': 'invoke_error', 'message': e.toString() };
    }
  }

  Future<String?> getStatus({required String setCode, required String number, String lang = 'en'}) async {
    try {
      final rows = await _client
          .from('catalog_import_queue')
          .select('status')
          .eq('set_code', setCode)
          .eq('number', number)
          .eq('lang', lang)
          .limit(1);
      final list = (rows as List?)?.cast<Map<String, dynamic>>() ?? const <Map<String, dynamic>>[];
      if (list.isEmpty) return null;
      return (list.first['status'] ?? '').toString();
    } catch (_) {
      return null;
    }
  }
}

