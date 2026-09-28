import 'dart:async';

import 'package:http/http.dart' as http;

/// Retry only a transient read failure, retaining the exact URL and account.
/// Catalog resolution can exceed ten seconds on a cold server/mobile network.
Future<http.Response> getSearchResolver(
  Uri uri, {
  required Map<String, String> headers,
  Duration timeout = const Duration(seconds: 20),
  Duration retryDelay = const Duration(milliseconds: 300),
}) async {
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      final response = await http.get(uri, headers: headers).timeout(timeout);
      if (attempt == 1 ||
          !const {502, 503, 504}.contains(response.statusCode)) {
        return response;
      }
    } on TimeoutException {
      if (attempt == 1) rethrow;
    } on http.ClientException {
      if (attempt == 1) rethrow;
    }
    await Future<void>.delayed(retryDelay);
  }
  throw StateError('Search request did not complete.');
}
