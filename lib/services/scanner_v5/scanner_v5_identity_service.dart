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
    late final http.Response response;
    try {
      response = await _client
          .post(
            uri,
            headers: const <String, String>{'content-type': 'image/jpeg'},
            body: imageBytes,
          )
          .timeout(const Duration(seconds: 18));
    } on TimeoutException {
      rethrow;
    } on SocketException catch (error) {
      throw ScannerV5UnreachableException(endpoint, cause: error);
    } on http.ClientException catch (error) {
      throw ScannerV5UnreachableException(endpoint, cause: error);
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ScannerV5HttpException(
        endpoint: endpoint,
        statusCode: response.statusCode,
        responseBody: response.body,
      );
    }

    try {
      final decoded = jsonDecode(response.body);
      if (decoded is! Map) {
        throw const FormatException('scanner_v5_response_not_object');
      }
      return ScannerV5IdentifyResult.fromJson(
        Map<String, dynamic>.from(decoded),
      );
    } on FormatException catch (error) {
      throw ScannerV5ProtocolException(endpoint, cause: error);
    } on TypeError catch (error) {
      throw ScannerV5ProtocolException(endpoint, cause: error);
    }
  }

  static String _resolveEndpoint() {
    const compileTimeEndpoint = String.fromEnvironment(
      'SCANNER_V5_IDENTIFY_ENDPOINT',
    );
    if (compileTimeEndpoint.trim().isNotEmpty) {
      return _normalizeEndpoint(compileTimeEndpoint);
    }

    final envEndpoint = dotenv.isInitialized
        ? dotenv.maybeGet('SCANNER_V5_IDENTIFY_ENDPOINT') ??
              dotenv.maybeGet('SCANNER_V5_ENDPOINT')
        : null;
    final value = (envEndpoint ?? '').trim();
    if (value.isNotEmpty) {
      return _normalizeEndpoint(value);
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8795/scanner-v5/identify';
    }
    return 'http://127.0.0.1:8795/scanner-v5/identify';
  }

  static String _normalizeEndpoint(String value) {
    final normalized = value.trim();
    return normalized.endsWith('/identify')
        ? normalized
        : '${normalized.replaceFirst(RegExp(r'/$'), '')}/scanner-v5/identify';
  }
}

class ScannerV5IdentifyResult {
  const ScannerV5IdentifyResult({
    required this.ok,
    required this.mode,
    required this.candidates,
    required this.latencyMs,
    this.requestId,
    this.retakeHint,
    this.ocr,
    this.rectification,
    this.uploadDebugPath,
    this.rectifiedDebugPath,
    this.ocrDebugDir,
  });

  factory ScannerV5IdentifyResult.fromJson(Map<String, dynamic> json) {
    final rawCandidates = json['candidates'];
    final latency = json['latency_ms'] is Map
        ? Map<String, dynamic>.from(json['latency_ms'] as Map)
        : null;
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
      latencyMs:
          _numToDouble(latency?['total_ms']) ??
          _numToDouble(json['latency_ms']) ??
          0,
      requestId: _trimmedOrNull(json['request_id']),
      retakeHint: _trimmedOrNull(json['retake_hint']),
      ocr: json['ocr'] is Map
          ? Map<String, dynamic>.from(json['ocr'] as Map)
          : null,
      rectification: json['rectification'] is Map
          ? Map<String, dynamic>.from(json['rectification'] as Map)
          : null,
      uploadDebugPath: _trimmedOrNull(json['upload_debug_path']),
      rectifiedDebugPath: _trimmedOrNull(json['rectified_debug_path']),
      ocrDebugDir: _trimmedOrNull(json['ocr_debug_dir']),
    );
  }

  final bool ok;
  final String mode;
  final List<ScannerV5Candidate> candidates;
  final double latencyMs;
  final String? requestId;
  final String? retakeHint;
  final Map<String, dynamic>? ocr;
  final Map<String, dynamic>? rectification;
  final String? uploadDebugPath;
  final String? rectifiedDebugPath;
  final String? ocrDebugDir;

  Map<String, dynamic> toSessionJson() => <String, dynamic>{
    'ok': ok,
    'request_id': requestId,
    'mode': mode,
    'latency_ms': latencyMs,
    'retake_hint': retakeHint,
    'ocr': ocr,
    'rectification': rectification,
    'upload_debug_path': uploadDebugPath,
    'rectified_debug_path': rectifiedDebugPath,
    'ocr_debug_dir': ocrDebugDir,
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
    this.displayName,
    this.setCode,
    this.number,
    this.imageUrl,
    this.confidence,
    this.rank,
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
      displayName: _trimmedOrNull(json['display_name']),
      name:
          _trimmedOrNull(json['display_name']) ??
          _trimmedOrNull(json['name']) ??
          'Unknown card',
      setCode: _trimmedOrNull(json['set_code']) ?? _trimmedOrNull(json['set']),
      number: _trimmedOrNull(json['number']),
      imageUrl: _trimmedOrNull(json['image_url']),
      confidence: _numToDouble(json['confidence']),
      rank: _numToInt(json['rank']),
      distance: _numToDouble(json['distance']),
      score: _numToDouble(json['score']),
      reason: _trimmedOrNull(json['reason']),
    );
  }

  final String id;
  final String? cardId;
  final String? gvId;
  final String? displayName;
  final String name;
  final String? setCode;
  final String? number;
  final String? imageUrl;
  final double? confidence;
  final int? rank;
  final double? distance;
  final double? score;
  final String? reason;

  String get vaultCardPrintId => (cardId ?? id).trim();

  Map<String, dynamic> toSessionJson() => <String, dynamic>{
    'id': id,
    'card_id': cardId,
    'gv_id': gvId,
    'display_name': displayName,
    'name': name,
    'set_code': setCode,
    'number': number,
    'confidence': confidence,
    'rank': rank,
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

class ScannerV5UnreachableException extends ScannerV5IdentityException {
  const ScannerV5UnreachableException(this.endpoint, {this.cause})
    : super('scanner_v5_unreachable');

  final String endpoint;
  final Object? cause;

  @override
  String toString() => 'ScannerV5UnreachableException($endpoint, $cause)';
}

class ScannerV5HttpException extends ScannerV5IdentityException {
  const ScannerV5HttpException({
    required this.endpoint,
    required this.statusCode,
    this.responseBody,
  }) : super('scanner_v5_http');

  final String endpoint;
  final int statusCode;
  final String? responseBody;

  @override
  String toString() => 'ScannerV5HttpException($statusCode, $endpoint)';
}

class ScannerV5ProtocolException extends ScannerV5IdentityException {
  const ScannerV5ProtocolException(this.endpoint, {this.cause})
    : super('scanner_v5_protocol');

  final String endpoint;
  final Object? cause;

  @override
  String toString() => 'ScannerV5ProtocolException($endpoint, $cause)';
}

String? _trimmedOrNull(dynamic value) {
  final text = (value ?? '').toString().trim();
  return text.isEmpty ? null : text;
}

double? _numToDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse((value ?? '').toString());
}

int? _numToInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse((value ?? '').toString());
}
