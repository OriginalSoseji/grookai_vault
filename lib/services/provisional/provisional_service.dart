import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../models/provisional_card.dart';
import '../../secrets.dart';

class ProvisionalService {
  const ProvisionalService._();

  static Uri _webUri(String path, [Map<String, String>? queryParameters]) {
    final base = grookaiWebBaseUrl.trim().replaceFirst(RegExp(r'/+$'), '');
    return Uri.parse('$base$path').replace(queryParameters: queryParameters);
  }

  // LOCK: App provisional reads must use public-safe web read APIs only.
  // LOCK: Never query raw warehouse tables from Flutter.
  static Future<List<PublicProvisionalCard>> fetchDiscovery({
    int limit = 6,
  }) async {
    final safeLimit = limit.clamp(1, 12).toString();
    final response = await http
        .get(
          _webUri('/api/provisional/discovery', <String, String>{
            'limit': safeLimit,
          }),
          headers: const {'Accept': 'application/json'},
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return const <PublicProvisionalCard>[];
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      return const <PublicProvisionalCard>[];
    }

    final rows = decoded['provisional'];
    if (rows is! List) {
      return const <PublicProvisionalCard>[];
    }

    return rows
        .whereType<Map<String, dynamic>>()
        .map((row) {
          try {
            return PublicProvisionalCard.fromJson(row);
          } catch (_) {
            return null;
          }
        })
        .whereType<PublicProvisionalCard>()
        .toList(growable: false);
  }
}
