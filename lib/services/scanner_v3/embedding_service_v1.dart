import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class ScannerV3ImageEmbeddingServiceV1 {
  ScannerV3ImageEmbeddingServiceV1({
    String? endpoint,
    http.Client? client,
    this.timeout = const Duration(seconds: 6),
  }) : endpoint = endpoint ?? _defaultEndpoint,
       _client = client ?? http.Client();

  static String get _defaultEndpoint =>
      dotenv.env['SCANNER_V3_EMBEDDING_ENDPOINT'] ??
      const String.fromEnvironment('SCANNER_V3_EMBEDDING_ENDPOINT');

  final String endpoint;
  final Duration timeout;
  final http.Client _client;

  Future<List<double>> embedImage(
    Uint8List imageBytes, {
    String input = 'scanner_v3_artwork_region',
  }) async {
    if (imageBytes.isEmpty) {
      throw const ScannerV3EmbeddingException('empty_image_bytes');
    }
    final resolvedEndpoint = endpoint.trim();
    if (resolvedEndpoint.isEmpty) {
      throw const ScannerV3EmbeddingException(
        'embedding_endpoint_not_configured',
      );
    }

    final uri = Uri.tryParse(resolvedEndpoint);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw ScannerV3EmbeddingException(
        'invalid_embedding_endpoint:$resolvedEndpoint',
      );
    }

    final response = await _client
        .post(
          uri,
          headers: const <String, String>{
            'content-type': 'application/json',
            'accept': 'application/json',
          },
          body: jsonEncode(<String, Object?>{
            'image_b64': base64Encode(imageBytes),
            'input': input,
            'mode': 'scanner_v3_option_a_embedding_v1',
          }),
        )
        .timeout(timeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ScannerV3EmbeddingException(
        'embedding_http_${response.statusCode}',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const ScannerV3EmbeddingException('embedding_response_not_object');
    }
    final rawEmbedding = decoded['embedding'];
    if (rawEmbedding is! List || rawEmbedding.isEmpty) {
      throw const ScannerV3EmbeddingException(
        'embedding_response_missing_vector',
      );
    }

    final vector = <double>[];
    for (final value in rawEmbedding) {
      final number = value is num
          ? value.toDouble()
          : double.tryParse('$value');
      if (number == null || !number.isFinite) {
        throw const ScannerV3EmbeddingException(
          'embedding_response_non_numeric',
        );
      }
      vector.add(number);
    }
    return vector;
  }
}

class ScannerV3EmbeddingException implements Exception {
  const ScannerV3EmbeddingException(this.message);

  final String message;

  @override
  String toString() => 'ScannerV3EmbeddingException($message)';
}
