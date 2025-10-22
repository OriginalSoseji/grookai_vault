import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';
import 'package:flutter/foundation.dart';

/// Calls your Edge Functions:
///  - search_cards (returns stub results; hydrates on tap)
///  - hydrate_card (fills in full details when needed)
class CardsService {
  final _client = Supabase.instance.client;

  Future<List<Map<String, dynamic>>> search(String query, {int limit = 20}) async {
    if (kDebugMode) debugPrint('[HTTP] FUNC search_cards q="$query" limit=$limit');
    final res = await _client.functions.invoke('search_cards', body: {
      'query': query,
      'limit': limit,
    });

    final data = res.data;
    if (data is! Map<String, dynamic>) return <Map<String, dynamic>>[];
    final list = (data['results'] as List?)?.cast<Map<String, dynamic>>() ?? <Map<String, dynamic>>[];
    return list;
  }

  Future<Map<String, dynamic>> hydrate({String? printId, String? setCode, String? number, String? name, String lang = 'en'}) async {
    final body = <String, dynamic>{
      if (printId != null && printId.isNotEmpty) 'print_id': printId,
      if (setCode != null && setCode.isNotEmpty) 'set_code': setCode,
      if (number != null && number.isNotEmpty) 'number': number,
      if (name != null && name.isNotEmpty) 'name': name,
      'lang': lang,
    };
    if (kDebugMode) debugPrint('[HTTP] FUNC hydrate_card body=${body.toString()}');
    Future<Map<String, dynamic>> callFn() async {
      try {
        final res = await _client.functions.invoke('hydrate_card', body: body);
        final data = res.data;
        if (data is Map<String, dynamic>) return data;
        return <String, dynamic>{'ok': false, 'code': 'bad_response', 'message': 'Unexpected response'};
      } catch (e) {
        final msg = e.toString();
        return <String, dynamic>{'ok': false, 'code': 'invoke_error', 'message': msg};
      }
    }
    final delays = <Duration>[
      const Duration(milliseconds: 400),
      const Duration(milliseconds: 1200),
      const Duration(milliseconds: 2500),
      const Duration(milliseconds: 4000),
    ];
    for (var i = 0; i < delays.length; i++) {
      final out = await callFn();
      final ok = out['ok'];
      // Success or structured failure; if booting and retries remain, retry.
      if (ok == true) return out;
      final msg = (out['message'] ?? '').toString();
      if (kDebugMode) debugPrint('[HTTP] FUNC hydrate_card error=$msg');
      final isBoot = msg.contains('503') || msg.contains('BOOT_ERROR') || msg.contains('Service Unavailable');
      if (!isBoot || i == delays.length - 1) return out; // give up with structured error
      await Future.delayed(delays[i]);
      if (kDebugMode) debugPrint('[HTTP] FUNC hydrate_card retrying...');
    }
    return <String, dynamic>{'ok': false, 'code': 'max_retries', 'message': 'Service unavailable'};
  }
}

