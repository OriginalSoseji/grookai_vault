import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'embedding_service_v1.dart';
import 'lock_artifact_export_v1.dart';
import 'vector_candidate_service_v1.dart';

class ScannerV3IdentityPipelineV8 {
  ScannerV3IdentityPipelineV8({
    ScannerV3ImageEmbeddingServiceV1? embeddingService,
    ScannerV3VectorCandidateServiceV1? vectorCandidateService,
    this.topPerCrop = 50,
    this.topUnified = 50,
    this.topRerankInput = 10,
    this.topOutput = 5,
  }) : _embeddingService =
           embeddingService ?? ScannerV3ImageEmbeddingServiceV1(),
       _vectorCandidateService =
           vectorCandidateService ?? ScannerV3VectorCandidateServiceV1();

  static const int cropOutputSize = 512;
  static const List<String> queryCropTypes = <String>[
    'artwork',
    'artwork_zoom_in_10',
    'shift_left',
    'shift_right',
    'shift_up',
    'shift_down',
    'center_tight',
    'full_card',
  ];

  final ScannerV3ImageEmbeddingServiceV1 _embeddingService;
  final ScannerV3VectorCandidateServiceV1 _vectorCandidateService;
  final int topPerCrop;
  final int topUnified;
  final int topRerankInput;
  final int topOutput;

  Future<ScannerV3IdentityFrameResult> resolveFrame({
    required ScannerV3ExportImage normalizedFullCard,
    required ScannerV3ExportImage artworkRegion,
  }) async {
    final frameWatch = Stopwatch()..start();
    final crops = _generateQueryCrops(
      normalizedFullCard: normalizedFullCard,
      artworkRegion: artworkRegion,
    );

    final cropResults = await Future.wait(
      crops.map(_resolveCrop),
      eagerError: false,
    );

    final successful = cropResults
        .where((result) => result.error == null)
        .toList(growable: false);
    final errors = cropResults
        .where((result) => result.error != null)
        .map((result) => '${result.cropType}:${result.error}')
        .toList(growable: false);
    final unified = _unionCandidates(successful);
    final rerankWatch = Stopwatch()..start();
    final reranked = _rerankTopCandidates(unified);
    final rerankElapsedMs = rerankWatch.elapsedMilliseconds;

    return ScannerV3IdentityFrameResult(
      candidates: reranked.take(topOutput).toList(growable: false),
      unifiedCandidateCount: unified.length,
      cropCount: crops.length,
      successfulCropCount: successful.length,
      cropTypes: crops.map((crop) => crop.type).toList(growable: false),
      embeddingElapsedMs: _maxMs(
        successful.map((result) => result.embeddingElapsedMs),
      ),
      vectorSearchElapsedMs: _maxMs(
        successful.map((result) => result.vectorSearchElapsedMs),
      ),
      rerankElapsedMs: rerankElapsedMs,
      totalElapsedMs: frameWatch.elapsedMilliseconds,
      errors: errors,
      signalSource: successful.isEmpty
          ? 'v8_multicrop_identity_no_successful_crops'
          : 'v8_multicrop_vector_rerank',
    );
  }

  Future<_IdentityCropResult> _resolveCrop(_IdentityCrop crop) async {
    try {
      final pngBytes = await _encodePng(crop.image);

      final embeddingWatch = Stopwatch()..start();
      final embedding = await _embeddingService.embedImage(
        pngBytes,
        input: 'scanner_v3_v8_${crop.type}',
      );
      final embeddingElapsedMs = embeddingWatch.elapsedMilliseconds;

      final vectorWatch = Stopwatch()..start();
      final candidates = await _vectorCandidateService.getTopCandidates(
        embedding,
        topK: topPerCrop,
        queryCropType: crop.type,
      );
      final vectorSearchElapsedMs = vectorWatch.elapsedMilliseconds;

      return _IdentityCropResult(
        cropType: crop.type,
        candidates: candidates,
        embeddingElapsedMs: embeddingElapsedMs,
        vectorSearchElapsedMs: vectorSearchElapsedMs,
      );
    } catch (error) {
      return _IdentityCropResult(
        cropType: crop.type,
        candidates: const <Candidate>[],
        embeddingElapsedMs: null,
        vectorSearchElapsedMs: null,
        error: error,
      );
    }
  }

  List<_IdentityCrop> _generateQueryCrops({
    required ScannerV3ExportImage normalizedFullCard,
    required ScannerV3ExportImage artworkRegion,
  }) {
    return <_IdentityCrop>[
      _IdentityCrop(
        type: 'artwork',
        image: _normalizedRectCrop(
          artworkRegion,
          const _RectNorm(left: 0, top: 0, right: 1, bottom: 1),
        ),
      ),
      _IdentityCrop(
        type: 'artwork_zoom_in_10',
        image: _normalizedRectCrop(
          artworkRegion,
          _rectFromCenter(0.50, 0.50, 0.90, 0.90),
        ),
      ),
      _IdentityCrop(
        type: 'shift_left',
        image: _normalizedRectCrop(
          artworkRegion,
          _rectFromCenter(0.44, 0.50, 0.90, 0.92),
        ),
      ),
      _IdentityCrop(
        type: 'shift_right',
        image: _normalizedRectCrop(
          artworkRegion,
          _rectFromCenter(0.56, 0.50, 0.90, 0.92),
        ),
      ),
      _IdentityCrop(
        type: 'shift_up',
        image: _normalizedRectCrop(
          artworkRegion,
          _rectFromCenter(0.50, 0.44, 0.92, 0.90),
        ),
      ),
      _IdentityCrop(
        type: 'shift_down',
        image: _normalizedRectCrop(
          artworkRegion,
          _rectFromCenter(0.50, 0.56, 0.92, 0.90),
        ),
      ),
      _IdentityCrop(
        type: 'center_tight',
        image: _normalizedRectCrop(
          artworkRegion,
          _rectFromCenter(0.50, 0.50, 0.72, 0.72),
        ),
      ),
      _IdentityCrop(
        type: 'full_card',
        image: _normalizedRectCrop(
          normalizedFullCard,
          const _RectNorm(left: 0, top: 0, right: 1, bottom: 1),
        ),
      ),
    ];
  }

  List<Candidate> _unionCandidates(List<_IdentityCropResult> cropResults) {
    final byCard = <String, _CandidateAccumulator>{};

    for (final cropResult in cropResults) {
      for (final candidate in cropResult.candidates) {
        final current = byCard.putIfAbsent(
          candidate.cardId,
          () => _CandidateAccumulator(candidate),
        );
        current.add(candidate, cropResult.cropType);
      }
    }

    final unified = byCard.values
        .map((accumulator) {
          final cropCount = accumulator.cropTypes.length;
          final frequencyBonus = math.min(
            0.12,
            math.max(0, cropCount - 1) * 0.025,
          );
          final rankConsensusBonus = math.min(
            0.08,
            accumulator.rankSignal * 0.015,
          );
          final aggregateScore =
              (accumulator.bestSimilarity + frequencyBonus + rankConsensusBonus)
                  .clamp(0.0, 1.0)
                  .toDouble();

          return accumulator.bestCandidate.copyWith(
            distance: accumulator.bestDistance,
            similarityOverride: aggregateScore,
            aggregateScore: aggregateScore,
            cropContributionCount: cropCount,
            referenceViewContributionCount:
                accumulator.referenceViewTypes.length,
            bestQueryCropType: accumulator.bestQueryCropType,
            bestReferenceViewType: accumulator.bestReferenceViewType,
            contributingCropTypes: accumulator.cropTypes.toList(growable: false)
              ..sort(),
          );
        })
        .toList(growable: false);

    unified.sort((a, b) {
      final aScore = a.aggregateScore ?? a.similarity;
      final bScore = b.aggregateScore ?? b.similarity;
      if (aScore != bScore) return bScore.compareTo(aScore);
      if (a.distance != b.distance) return a.distance.compareTo(b.distance);
      final aCrops = a.cropContributionCount ?? 0;
      final bCrops = b.cropContributionCount ?? 0;
      if (aCrops != bCrops) return bCrops.compareTo(aCrops);
      return a.cardId.compareTo(b.cardId);
    });

    return unified.take(topUnified).toList(growable: false);
  }

  List<Candidate> _rerankTopCandidates(List<Candidate> unified) {
    final top = unified.take(topRerankInput).toList(growable: false);
    if (top.isEmpty) return const <Candidate>[];

    final maxCropCount = top
        .map((candidate) => candidate.cropContributionCount ?? 1)
        .fold<int>(1, math.max);
    final scored = top
        .map((candidate) {
          final aggregate = candidate.aggregateScore ?? candidate.similarity;
          final cropScore =
              ((candidate.cropContributionCount ?? 1) / maxCropCount)
                  .clamp(0.0, 1.0)
                  .toDouble();
          final externalRerankScore = candidate.rerankScore;
          final finalScore = externalRerankScore == null
              ? ((aggregate * 0.60) + (cropScore * 0.40))
              : ((aggregate * 0.30) +
                    (externalRerankScore.clamp(0.0, 1.0) * 0.50) +
                    (cropScore * 0.20));
          return candidate.copyWith(
            rerankScore: finalScore.clamp(0.0, 1.0).toDouble(),
            similarityOverride: finalScore.clamp(0.0, 1.0).toDouble(),
          );
        })
        .toList(growable: false);

    scored.sort((a, b) {
      final aScore = a.rerankScore ?? a.aggregateScore ?? a.similarity;
      final bScore = b.rerankScore ?? b.aggregateScore ?? b.similarity;
      if (aScore != bScore) return bScore.compareTo(aScore);
      final aCrops = a.cropContributionCount ?? 0;
      final bCrops = b.cropContributionCount ?? 0;
      if (aCrops != bCrops) return bCrops.compareTo(aCrops);
      if (a.distance != b.distance) return a.distance.compareTo(b.distance);
      return a.cardId.compareTo(b.cardId);
    });

    return scored
        .asMap()
        .entries
        .map((entry) => entry.value.copyWith(rank: entry.key + 1))
        .toList(growable: false);
  }

  ScannerV3ExportImage _normalizedRectCrop(
    ScannerV3ExportImage source,
    _RectNorm rect,
  ) {
    final leftNorm = rect.left.clamp(0.0, 1.0);
    final topNorm = rect.top.clamp(0.0, 1.0);
    final rightNorm = rect.right.clamp(0.0, 1.0);
    final bottomNorm = rect.bottom.clamp(0.0, 1.0);
    final left = math.max(
      0,
      math.min(source.width - 1, leftNorm * source.width),
    );
    final top = math.max(
      0,
      math.min(source.height - 1, topNorm * source.height),
    );
    final right = math.max(
      left + 1,
      math.min(source.width.toDouble(), rightNorm * source.width),
    );
    final bottom = math.max(
      top + 1,
      math.min(source.height.toDouble(), bottomNorm * source.height),
    );
    final cropWidth = right - left;
    final cropHeight = bottom - top;
    final bytesPerPixel = source.format == ScannerV3ExportImageFormat.rgba8888
        ? 4
        : 1;
    final output = Uint8List(cropOutputSize * cropOutputSize * bytesPerPixel);

    for (var y = 0; y < cropOutputSize; y += 1) {
      final srcY = (top + (((y + 0.5) / cropOutputSize) * cropHeight))
          .floor()
          .clamp(0, source.height - 1);
      for (var x = 0; x < cropOutputSize; x += 1) {
        final srcX = (left + (((x + 0.5) / cropOutputSize) * cropWidth))
            .floor()
            .clamp(0, source.width - 1);
        final srcIndex = ((srcY * source.width) + srcX) * bytesPerPixel;
        final outIndex = ((y * cropOutputSize) + x) * bytesPerPixel;
        if (bytesPerPixel == 1) {
          output[outIndex] = source.bytes[srcIndex];
        } else {
          output[outIndex] = source.bytes[srcIndex];
          output[outIndex + 1] = source.bytes[srcIndex + 1];
          output[outIndex + 2] = source.bytes[srcIndex + 2];
          output[outIndex + 3] = source.bytes[srcIndex + 3];
        }
      }
    }

    return ScannerV3ExportImage(
      bytes: output,
      width: cropOutputSize,
      height: cropOutputSize,
      format: source.format,
    );
  }

  Future<Uint8List> _encodePng(ScannerV3ExportImage image) async {
    final pixelCount = image.width * image.height;
    final rgba = image.format == ScannerV3ExportImageFormat.rgba8888
        ? Uint8List.sublistView(image.bytes, 0, pixelCount * 4)
        : _grayscaleToRgba(image, pixelCount);
    final completer = Completer<ui.Image>();
    ui.decodeImageFromPixels(
      rgba,
      image.width,
      image.height,
      ui.PixelFormat.rgba8888,
      completer.complete,
    );
    final decoded = await completer.future;
    final byteData = await decoded.toByteData(format: ui.ImageByteFormat.png);
    decoded.dispose();
    if (byteData == null) {
      throw StateError('scanner_v3_v8_png_encode_failed');
    }
    return byteData.buffer.asUint8List(
      byteData.offsetInBytes,
      byteData.lengthInBytes,
    );
  }

  Uint8List _grayscaleToRgba(ScannerV3ExportImage image, int pixelCount) {
    final rgba = Uint8List(pixelCount * 4);
    for (var i = 0; i < pixelCount; i += 1) {
      final value = image.bytes[i];
      final base = i * 4;
      rgba[base] = value;
      rgba[base + 1] = value;
      rgba[base + 2] = value;
      rgba[base + 3] = 255;
    }
    return rgba;
  }

  _RectNorm _rectFromCenter(
    double centerX,
    double centerY,
    double width,
    double height,
  ) {
    return _RectNorm(
      left: centerX - (width / 2),
      top: centerY - (height / 2),
      right: centerX + (width / 2),
      bottom: centerY + (height / 2),
    );
  }

  int? _maxMs(Iterable<int?> values) {
    int? max;
    for (final value in values) {
      if (value == null) continue;
      max = max == null ? value : math.max(max, value);
    }
    return max;
  }
}

class ScannerV3IdentityFrameResult {
  const ScannerV3IdentityFrameResult({
    required this.candidates,
    required this.unifiedCandidateCount,
    required this.cropCount,
    required this.successfulCropCount,
    required this.cropTypes,
    required this.embeddingElapsedMs,
    required this.vectorSearchElapsedMs,
    required this.rerankElapsedMs,
    required this.totalElapsedMs,
    required this.errors,
    required this.signalSource,
  });

  final List<Candidate> candidates;
  final int unifiedCandidateCount;
  final int cropCount;
  final int successfulCropCount;
  final List<String> cropTypes;
  final int? embeddingElapsedMs;
  final int? vectorSearchElapsedMs;
  final int rerankElapsedMs;
  final int totalElapsedMs;
  final List<String> errors;
  final String signalSource;
}

class _IdentityCrop {
  const _IdentityCrop({required this.type, required this.image});

  final String type;
  final ScannerV3ExportImage image;
}

class _IdentityCropResult {
  const _IdentityCropResult({
    required this.cropType,
    required this.candidates,
    required this.embeddingElapsedMs,
    required this.vectorSearchElapsedMs,
    this.error,
  });

  final String cropType;
  final List<Candidate> candidates;
  final int? embeddingElapsedMs;
  final int? vectorSearchElapsedMs;
  final Object? error;
}

class _CandidateAccumulator {
  _CandidateAccumulator(Candidate candidate)
    : bestCandidate = candidate,
      bestDistance = candidate.distance,
      bestSimilarity = candidate.similarity,
      bestQueryCropType = candidate.queryCropType,
      bestReferenceViewType = candidate.bestReferenceViewType;

  Candidate bestCandidate;
  double bestDistance;
  double bestSimilarity;
  String? bestQueryCropType;
  String? bestReferenceViewType;
  double rankSignal = 0;
  final Set<String> cropTypes = <String>{};
  final Set<String> referenceViewTypes = <String>{};

  void add(Candidate candidate, String cropType) {
    cropTypes.add(cropType);
    for (final type in candidate.contributingCropTypes) {
      cropTypes.add(type);
    }
    final refType = candidate.bestReferenceViewType;
    if (refType != null && refType.isNotEmpty) {
      referenceViewTypes.add(refType);
    }
    rankSignal += 1 / math.max(1, candidate.rank);

    if (candidate.distance < bestDistance ||
        candidate.similarity > bestSimilarity) {
      bestCandidate = candidate;
      bestDistance = candidate.distance;
      bestSimilarity = math.max(bestSimilarity, candidate.similarity);
      bestQueryCropType = candidate.queryCropType ?? cropType;
      bestReferenceViewType = candidate.bestReferenceViewType;
    }
  }
}

class _RectNorm {
  const _RectNorm({
    required this.left,
    required this.top,
    required this.right,
    required this.bottom,
  });

  final double left;
  final double top;
  final double right;
  final double bottom;
}
