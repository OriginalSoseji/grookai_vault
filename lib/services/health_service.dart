import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';

class EdgeHealth {
  final _client = Supabase.instance.client;

  Future<int> pingImportPricesPost() async {
    try {
      final res = await _client.functions.invoke('import-prices', body: {'ping': true});
      final data = (res.data is String) ? jsonDecode(res.data as String) : res.data;
      if (data is Map && data['ok'] == true) return 200;
      return 200; // reachable
    } catch (_) {
      return 500;
    }
  }

  Future<int> pingWallFeed() async {
    try {
      // The function accepts limit via query for HTTP; via invoke we pass a body
      await _client.functions.invoke('wall_feed', body: {'limit': 1});
      return 200;
    } catch (_) {
      return 500;
    }
  }
}

