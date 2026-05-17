import 'dart:async';
import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class Candidate {
  const Candidate({
    required this.cardId,
    required this.distance,
    required this.rank,
    this.name,
    this.setCode,
    this.number,
    this.gvId,
    this.imageUrl,
    this.sourcePath,
    this.similarityOverride,
    this.aggregateScore,
    this.rerankScore,
    this.cropContributionCount,
    this.referenceViewContributionCount,
    this.bestQueryCropType,
    this.bestReferenceViewType,
    this.contributingCropTypes = const <String>[],
    this.queryCropType,
    this.rawRank,
    this.viewType,
    this.cropType,
  });

  final String cardId;
  final double distance;
  final int rank;
  final String? name;
  final String? setCode;
  final String? number;
  final String? gvId;
  final String? imageUrl;
  final String? sourcePath;
  final double? similarityOverride;
  final double? aggregateScore;
  final double? rerankScore;
  final int? cropContributionCount;
  final int? referenceViewContributionCount;
  final String? bestQueryCropType;
  final String? bestReferenceViewType;
  final List<String> contributingCropTypes;
  final String? queryCropType;
  final int? rawRank;
  final String? viewType;
  final String? cropType;

  double get similarity =>
      (similarityOverride ?? (1 - distance)).clamp(0.0, 1.0).toDouble();

  Candidate copyWith({
    double? distance,
    int? rank,
    double? similarityOverride,
    double? aggregateScore,
    double? rerankScore,
    int? cropContributionCount,
    int? referenceViewContributionCount,
    String? bestQueryCropType,
    String? bestReferenceViewType,
    List<String>? contributingCropTypes,
    String? queryCropType,
    int? rawRank,
    String? viewType,
    String? cropType,
  }) {
    return Candidate(
      cardId: cardId,
      distance: distance ?? this.distance,
      rank: rank ?? this.rank,
      name: name,
      setCode: setCode,
      number: number,
      gvId: gvId,
      imageUrl: imageUrl,
      sourcePath: sourcePath,
      similarityOverride: similarityOverride ?? this.similarityOverride,
      aggregateScore: aggregateScore ?? this.aggregateScore,
      rerankScore: rerankScore ?? this.rerankScore,
      cropContributionCount:
          cropContributionCount ?? this.cropContributionCount,
      referenceViewContributionCount:
          referenceViewContributionCount ?? this.referenceViewContributionCount,
      bestQueryCropType: bestQueryCropType ?? this.bestQueryCropType,
      bestReferenceViewType:
          bestReferenceViewType ?? this.bestReferenceViewType,
      contributingCropTypes:
          contributingCropTypes ?? this.contributingCropTypes,
      queryCropType: queryCropType ?? this.queryCropType,
      rawRank: rawRank ?? this.rawRank,
      viewType: viewType ?? this.viewType,
      cropType: cropType ?? this.cropType,
    );
  }
}

class ScannerV3VectorCandidateServiceV1 {
  ScannerV3VectorCandidateServiceV1({
    String? endpoint,
    http.Client? client,
    this.topK = 50,
    this.timeout = const Duration(seconds: 4),
  }) : endpoint = endpoint ?? _defaultEndpoint,
       _client = client ?? http.Client();

  static String get _defaultEndpoint =>
      dotenv.env['SCANNER_V3_VECTOR_ENDPOINT'] ??
      dotenv.env['SCANNER_V3_CANDIDATE_ENDPOINT'] ??
      const String.fromEnvironment('SCANNER_V3_VECTOR_ENDPOINT');

  final String endpoint;
  final int topK;
  final Duration timeout;
  final http.Client _client;

  Future<List<Candidate>> getTopCandidates(
    List<double> embedding, {
    int? topK,
    String? queryCropType,
  }) async {
    if (embedding.isEmpty) return const <Candidate>[];
    final requestedTopK = topK ?? this.topK;

    final resolvedEndpoint = endpoint.trim();
    if (resolvedEndpoint.isEmpty) {
      throw const ScannerV3VectorCandidateException(
        'vector_endpoint_not_configured',
      );
    }

    final uri = Uri.tryParse(resolvedEndpoint);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw ScannerV3VectorCandidateException(
        'invalid_vector_endpoint:$resolvedEndpoint',
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
            'embedding': embedding,
            'top_k': requestedTopK,
            'mode': 'scanner_v3_option_a_vector_v1',
            if (queryCropType != null) 'query_crop_type': queryCropType,
          }),
        )
        .timeout(timeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ScannerV3VectorCandidateException(
        'vector_http_${response.statusCode}',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const ScannerV3VectorCandidateException(
        'vector_response_not_object',
      );
    }
    final rawCandidates = decoded['candidates'];
    if (rawCandidates is! List) {
      throw const ScannerV3VectorCandidateException(
        'vector_response_missing_candidates',
      );
    }

    final candidates = <Candidate>[];
    for (var i = 0; i < rawCandidates.length; i += 1) {
      final raw = rawCandidates[i];
      if (raw is! Map) continue;
      final cardId = (raw['card_id'] ?? raw['cardId'] ?? '').toString().trim();
      if (cardId.isEmpty) continue;
      final rawDistance = raw['distance'];
      final distance = rawDistance is num
          ? rawDistance.toDouble()
          : double.tryParse('$rawDistance');
      if (distance == null || !distance.isFinite) continue;
      final rawRank = raw['rank'];
      final rank = rawRank is num ? rawRank.toInt() : i + 1;
      candidates.add(
        Candidate(
          cardId: cardId,
          distance: distance,
          rank: rank <= 0 ? i + 1 : rank,
          name: _optionalString(raw['name']),
          setCode: _optionalString(raw['set_code'] ?? raw['setCode']),
          number: _optionalString(raw['number']),
          gvId: _optionalString(raw['gv_id'] ?? raw['gvId']),
          imageUrl: _optionalString(raw['image_url'] ?? raw['imageUrl']),
          sourcePath: _optionalString(raw['source_path'] ?? raw['sourcePath']),
          similarityOverride: _optionalDouble(raw['similarity']),
          aggregateScore: _optionalDouble(
            raw['aggregate_score'] ?? raw['aggregateScore'],
          ),
          rerankScore: _optionalDouble(
            raw['rerank_score'] ??
                raw['rerankScore'] ??
                raw['final_score'] ??
                raw['visual_score'],
          ),
          cropContributionCount: _optionalInt(
            raw['crop_contribution_count'] ?? raw['cropContributionCount'],
          ),
          referenceViewContributionCount: _optionalInt(
            raw['reference_view_contribution_count'] ??
                raw['referenceViewContributionCount'],
          ),
          bestQueryCropType: _optionalString(
            raw['best_query_crop_type'] ?? raw['bestQueryCropType'],
          ),
          bestReferenceViewType: _optionalString(
            raw['best_reference_view_type'] ?? raw['bestReferenceViewType'],
          ),
          contributingCropTypes: _optionalStringList(
            raw['contributing_crop_types'] ?? raw['contributingCropTypes'],
          ),
          queryCropType: queryCropType,
          rawRank: _optionalInt(raw['raw_rank'] ?? raw['rawRank']),
          viewType: _optionalString(raw['view_type'] ?? raw['viewType']),
          cropType: _optionalString(raw['crop_type'] ?? raw['cropType']),
        ),
      );
    }

    candidates.sort((a, b) {
      if (a.rank != b.rank) return a.rank.compareTo(b.rank);
      if (a.distance != b.distance) return a.distance.compareTo(b.distance);
      return a.cardId.compareTo(b.cardId);
    });
    return candidates.take(requestedTopK).toList(growable: false);
  }

  String? _optionalString(Object? value) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  double? _optionalDouble(Object? value) {
    if (value == null) return null;
    final number = value is num ? value.toDouble() : double.tryParse('$value');
    return number == null || !number.isFinite ? null : number;
  }

  int? _optionalInt(Object? value) {
    if (value == null) return null;
    final number = value is num ? value.toInt() : int.tryParse('$value');
    return number == null || number <= 0 ? null : number;
  }

  List<String> _optionalStringList(Object? value) {
    if (value is! List) return const <String>[];
    return value
        .map((item) => item.toString().trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
  }
}

class ScannerV3VectorCandidateException implements Exception {
  const ScannerV3VectorCandidateException(this.message);

  final String message;

  @override
  String toString() => 'ScannerV3VectorCandidateException($message)';
}
