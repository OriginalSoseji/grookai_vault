import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';

class EdgeWarmup {
  static void warm() {
    try {
      final client = Supabase.instance.client;
      if (kDebugMode) debugPrint('[LAZY] warmup-start');
      unawaited(() async {
        try {
          await client.functions.invoke(
            'search_cards',
            body: {'query': 'warmup', 'limit': 1},
          );
        } catch (_) {}
      }());
      unawaited(() async {
        try {
          await client.functions.invoke('hydrate_card', body: {'ping': true});
        } catch (_) {}
      }());
      // Dev-only soft check for RPC presence
      if (kDebugMode) {
        unawaited(() async {
          try {
            await client.rpc('list_set_codes');
          } catch (_) {
            debugPrint('[DEV] list_set_codes not present');
          }
        }());
      }
      if (kDebugMode) debugPrint('[LAZY] warmup-issued');
    } catch (e) {
      if (kDebugMode) debugPrint('[LAZY] warmup-failed $e');
    }
  }
}
