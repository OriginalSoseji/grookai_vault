import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class ScannerV5IdentityService {
  ScannerV5IdentityService({http.Client? client, String? endpoint})
    : _client = client ?? http.Client(),
      endpoint = endpoint ?? _resolveEndpoint();

  final http.Client _client;
  final String endpoint;

  Future<ScannerV5IdentifyResult> identify(Uint8List imageBytes) async {
    final uri = Uri.parse(endpoint);
    final response = await _client
        .post(
          uri,
          headers: const <String, String>{'content-type': 'image/jpeg'},
          body: imageBytes,
        )
        .timeout(const Duration(seconds: 18));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ScannerV5IdentityException(
        'scanner_v5_http_${response.statusCode}',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map) {
      throw const ScannerV5IdentityException('scanner_v5_invalid_response');
    }
    return ScannerV5IdentifyResult.fromJson(Map<String, dynamic>.from(decoded));
  }

  static String _resolveEndpoint() {
    const compileTimeEndpoint = String.fromEnvironment(
      'SCANNER_V5_IDENTIFY_ENDPOINT',
    );
    final envEndpoint =
        dotenv.maybeGet('SCANNER_V5_IDENTIFY_ENDPOINT') ??
        dotenv.maybeGet('SCANNER_V5_ENDPOINT');
    final value = compileTimeEndpoint.trim().isNotEmpty
        ? compileTimeEndpoint
        : (envEndpoint ?? '').trim();
    if (value.isNotEmpty) {
      return value.endsWith('/identify')
          ? value
          : '${value.replaceFirst(RegExp(r'/$'), '')}/scanner-v5/identify';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8795/scanner-v5/identify';
    }
    return 'http://127.0.0.1:8795/scanner-v5/identify';
  }
}

class ScannerV5IdentifyResult {
  const ScannerV5IdentifyResult({
    required this.ok,
    required this.mode,
    required this.candidates,
    required this.latencyMs,
    this.retakeHint,
    this.ocr,
    this.rectification,
  });

  factory ScannerV5IdentifyResult.fromJson(Map<String, dynamic> json) {
    final rawCandidates = json['candidates'];
    return ScannerV5IdentifyResult(
      ok: json['ok'] == true,
      mode: (json['mode'] ?? 'unknown').toString(),
      candidates: rawCandidates is List
          ? rawCandidates
                .whereType<Map>()
                .map(
                  (row) => ScannerV5Candidate.fromJson(
                    Map<String, dynamic>.from(row),
                  ),
                )
                .toList(growable: false)
          : const <ScannerV5Candidate>[],
      latencyMs: _numToDouble(json['latency_ms']) ?? 0,
      retakeHint: _trimmedOrNull(json['retake_hint']),
      ocr: json['ocr'] is Map
          ? Map<String, dynamic>.from(json['ocr'] as Map)
          : null,
      rectification: json['rectification'] is Map
          ? Map<String, dynamic>.from(json['rectification'] as Map)
          : null,
    );
  }

  final bool ok;
  final String mode;
  final List<ScannerV5Candidate> candidates;
  final double latencyMs;
  final String? retakeHint;
  final Map<String, dynamic>? ocr;
  final Map<String, dynamic>? rectification;

  Map<String, dynamic> toSessionJson() => <String, dynamic>{
    'ok': ok,
    'mode': mode,
    'latency_ms': latencyMs,
    'retake_hint': retakeHint,
    'candidates': candidates
        .map((candidate) => candidate.toSessionJson())
        .toList(growable: false),
  };
}

class ScannerV5Candidate {
  const ScannerV5Candidate({
    required this.id,
    required this.name,
    this.cardId,
    this.gvId,
    this.setCode,
    this.number,
    this.imageUrl,
    this.distance,
    this.score,
    this.reason,
  });

  factory ScannerV5Candidate.fromJson(Map<String, dynamic> json) {
    final id =
        _trimmedOrNull(json['id']) ??
        _trimmedOrNull(json['gv_id']) ??
        _trimmedOrNull(json['card_id']) ??
        '';
    return ScannerV5Candidate(
      id: id,
      cardId: _trimmedOrNull(json['card_id']),
      gvId: _trimmedOrNull(json['gv_id']) ?? (id.startsWith('GV-') ? id : null),
      name: _trimmedOrNull(json['name']) ?? 'Unknown card',
      setCode: _trimmedOrNull(json['set_code']) ?? _trimmedOrNull(json['set']),
      number: _trimmedOrNull(json['number']),
      imageUrl: _trimmedOrNull(json['image_url']),
      distance: _numToDouble(json['distance']),
      score: _numToDouble(json['score']),
      reason: _trimmedOrNull(json['reason']),
    );
  }

  final String id;
  final String? cardId;
  final String? gvId;
  final String name;
  final String? setCode;
  final String? number;
  final String? imageUrl;
  final double? distance;
  final double? score;
  final String? reason;

  String get vaultCardPrintId => (cardId ?? id).trim();

  Map<String, dynamic> toSessionJson() => <String, dynamic>{
    'id': id,
    'card_id': cardId,
    'gv_id': gvId,
    'name': name,
    'set_code': setCode,
    'number': number,
    'distance': distance,
    'score': score,
    'reason': reason,
  };
}

class ScannerV5IdentityException implements Exception {
  const ScannerV5IdentityException(this.message);

  final String message;

  @override
  String toString() => 'ScannerV5IdentityException($message)';
}

String? _trimmedOrNull(dynamic value) {
  final text = (value ?? '').toString().trim();
  return text.isEmpty ? null : text;
}

double? _numToDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse((value ?? '').toString());
}
