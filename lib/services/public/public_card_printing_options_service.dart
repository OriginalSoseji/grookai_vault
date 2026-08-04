import 'package:supabase_flutter/supabase_flutter.dart';

const publicCardPrintingOptionsRpcV1 = 'get_public_card_printing_options_v1';

class PublicCardPrintingOptionsService {
  static const int _maxIdsPerRequest = 250;
  static const int _pageSize = 1000;

  static Future<List<Map<String, dynamic>>> fetch({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final ids = cardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (ids.isEmpty) {
      return const <Map<String, dynamic>>[];
    }

    final rows = <Map<String, dynamic>>[];
    for (var start = 0; start < ids.length; start += _maxIdsPerRequest) {
      final end = (start + _maxIdsPerRequest).clamp(0, ids.length);
      final chunk = ids.sublist(start, end);
      for (var offset = 0; ; offset += _pageSize) {
        final raw = await client.rpc(
          publicCardPrintingOptionsRpcV1,
          params: <String, dynamic>{
            'p_card_print_ids': chunk,
            'p_limit': _pageSize,
            'p_offset': offset,
          },
        );
        final page = raw is List
            ? raw
                  .whereType<Map>()
                  .map((row) => Map<String, dynamic>.from(row))
                  .toList(growable: false)
            : const <Map<String, dynamic>>[];
        rows.addAll(page);
        if (page.length < _pageSize) {
          break;
        }
      }
    }
    return rows;
  }
}
