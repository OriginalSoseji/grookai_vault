import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../navigation/grookai_web_route_service.dart';

const List<String> kPsaGradeOptions = <String>[
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
];

class SlabUpgradeVerificationResult {
  const SlabUpgradeVerificationResult({
    required this.grader,
    required this.certNumber,
    required this.verified,
    required this.parserStatus,
    this.grade,
    this.title,
    this.imageUrl,
    this.errorCode,
  });

  final String grader;
  final String certNumber;
  final bool verified;
  final String parserStatus;
  final String? grade;
  final String? title;
  final String? imageUrl;
  final String? errorCode;

  factory SlabUpgradeVerificationResult.fromJson(Map<String, dynamic> json) {
    return SlabUpgradeVerificationResult(
      grader: (json['grader'] ?? '').toString().trim(),
      certNumber: (json['cert_number'] ?? '').toString().trim(),
      verified: json['verified'] == true,
      parserStatus: (json['parser_status'] ?? '').toString().trim(),
      grade: _nullable(json['grade']),
      title: _nullable(json['title']),
      imageUrl: _httpUrl(json['image_url']),
      errorCode: _nullable(json['error_code']),
    );
  }
}

class SlabUpgradeResult {
  const SlabUpgradeResult({
    required this.gvviId,
    required this.slabCertId,
    required this.grade,
    required this.certNumber,
  });

  final String gvviId;
  final String slabCertId;
  final String grade;
  final String certNumber;

  factory SlabUpgradeResult.fromJson(Map<String, dynamic> json) {
    return SlabUpgradeResult(
      gvviId: (json['gvvi_id'] ?? '').toString().trim(),
      slabCertId: (json['slab_cert_id'] ?? '').toString().trim(),
      grade: (json['grade'] ?? '').toString().trim(),
      certNumber: (json['cert_number'] ?? '').toString().trim(),
    );
  }
}

class SlabUpgradeService {
  static String? normalizePsaGradeValue(String? input) {
    if (input == null) {
      return null;
    }

    final normalized = input.trim();
    if (normalized.isEmpty) {
      return null;
    }

    final match = RegExp(r'(\d+(?:\.\d+)?)\s*$').firstMatch(normalized);
    return match?.group(1);
  }

  static Future<SlabUpgradeVerificationResult> verifyPsaCert({
    required String certNumber,
  }) async {
    final response = await http.post(
      GrookaiWebRouteService.buildUri('/api/slabs/verify/psa'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode(<String, dynamic>{'cert_number': certNumber.trim()}),
    );

    final payload = _decodeJsonMap(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return SlabUpgradeVerificationResult.fromJson(payload);
    }

    throw Exception(
      _nullable(payload['message']) ??
          _nullable(payload['error']) ??
          (response.statusCode == 404
              ? 'PSA verification is unavailable on this environment.'
              : null) ??
          'PSA verification failed.',
    );
  }

  static Future<SlabUpgradeResult> submit({
    required SupabaseClient client,
    required String sourceInstanceId,
    required String cardPrintId,
    required String gvId,
    required String cardName,
    required String grader,
    required String selectedGrade,
    required String certNumber,
    required String certNumberConfirm,
    required bool ownershipConfirmed,
    String? setName,
    String? cardImageUrl,
  }) async {
    final session = client.auth.currentSession;
    if (session == null || session.accessToken.isEmpty) {
      throw Exception('Sign in required.');
    }

    final response = await http.post(
      GrookaiWebRouteService.buildUri('/api/slabs/upgrade'),
      headers: <String, String>{
        'Authorization': 'Bearer ${session.accessToken}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(<String, dynamic>{
        'source_instance_id': sourceInstanceId.trim(),
        'grader': grader.trim(),
        'grade': selectedGrade.trim(),
        'cert_number': certNumber.trim(),
        'cert_number_confirm': certNumberConfirm.trim(),
        'ownership_confirmed': ownershipConfirmed,
        'card_print_id': cardPrintId.trim(),
        'gv_id': gvId.trim(),
        'card_name': cardName.trim(),
        'set_name': _nullable(setName),
        'card_image_url': _nullable(cardImageUrl),
      }),
    );

    final payload = _decodeJsonMap(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final result = SlabUpgradeResult.fromJson(payload);
      if (result.gvviId.isEmpty) {
        throw Exception('Slab upgrade returned no exact copy id.');
      }
      return result;
    }

    throw Exception(
      _nullable(payload['message']) ??
          _nullable(payload['detail']) ??
          _nullable(payload['error']) ??
          (response.statusCode == 404
              ? 'Native slab upgrade is not available on this environment yet.'
              : null) ??
          'Slab upgrade failed.',
    );
  }
}

Map<String, dynamic> _decodeJsonMap(String body) {
  if (body.trim().isEmpty) {
    return const <String, dynamic>{};
  }

  dynamic decoded;
  try {
    decoded = jsonDecode(body);
  } catch (_) {
    return const <String, dynamic>{};
  }
  if (decoded is Map<String, dynamic>) {
    return decoded;
  }
  if (decoded is Map) {
    return Map<String, dynamic>.from(decoded);
  }
  return const <String, dynamic>{};
}

String? _nullable(dynamic value) {
  final normalized = (value ?? '').toString().trim();
  return normalized.isEmpty ? null : normalized;
}

String? _httpUrl(dynamic value) {
  final normalized = _nullable(value);
  if (normalized == null) {
    return null;
  }

  final uri = Uri.tryParse(normalized);
  if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
    return null;
  }

  return normalized;
}
