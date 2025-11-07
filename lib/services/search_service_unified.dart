// Grookai Vault — Unified search & wall refresh client helpers
import 'dart:convert';
import 'package:http/http.dart' as http;
// import your existing env getters for supabaseUrl and anon/service key.
import '../utils/search_normalizer.dart';

class GVSearchApi {
  final String supabaseUrl;
  final String apiKey; // anon or service (for testing)
  GVSearchApi(this.supabaseUrl, this.apiKey);

  Future<List<Map<String, dynamic>>> searchCardsUnified(String query, {int limit = 50}) async {
    final uri = Uri.parse('$supabaseUrl/rest/v1/rpc/search_cards');
    final body = jsonEncode({'q': query, 'limit': limit});
    final res = await http.post(
      uri,
      headers: {
        'apikey': apiKey,
        'Authorization': 'Bearer $apiKey',
        'Content-Type': 'application/json',
      },
      body: body,
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final data = jsonDecode(res.body);
      return (data as List).cast<Map<String, dynamic>>();
    }
    // Fallback: try normalized view if RPC unavailable
    final parsed = parseSearchInput(query);
    final qs = <String, String>{'select': 'id,name,number,set_code,rarity,supertype,subtypes'};
    if (parsed.name != null) qs['name_norm'] = 'ilike.*${parsed.name}*';
    if (parsed.number != null) qs['number_int'] = 'eq.${parsed.number}';
    final uri2 = Uri.parse('$supabaseUrl/rest/v1/v_cards_search_v2').replace(queryParameters: qs);
    final res2 = await http.get(uri2, headers: {'apikey': apiKey, 'Authorization': 'Bearer $apiKey'});
    if (res2.statusCode >= 200 && res2.statusCode < 300) {
      final data = jsonDecode(res2.body);
      return (data as List).cast<Map<String, dynamic>>();
    }
    throw Exception('Unified search failed: ${res.statusCode} / ${res2.statusCode}');
  }

  Future<bool> refreshWall() async {
    final uri = Uri.parse('$supabaseUrl/rest/v1/rpc/rpc_refresh_wall');
    final res = await http.post(
      uri,
      headers: {'apikey': apiKey, 'Authorization': 'Bearer $apiKey', 'Content-Type': 'application/json'},
      body: jsonEncode({}),
    );
    return res.statusCode >= 200 && res.statusCode < 300;
  }
}

