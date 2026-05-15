import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import 'embedding_service_v1.dart';
import 'lock_artifact_export_v1.dart';
import 'vector_candidate_service_v1.dart';

class ScannerV3IdentityPipelineV8 {
  ScannerV3IdentityPipelineV8({
    ScannerV3ImageEmbeddingServiceV1? embeddingService,
    ScannerV3VectorCandidateServiceV1? vectorCandidateService,
    this.topPerCrop = 15,
    this.topUnified = 50,
    this.topRerankInput = 10,
    this.topOutput = 5,
  }) : _embeddingService =
           embeddingService ?? ScannerV3ImageEmbeddingServiceV1(),
       _vectorCandidateService =
           vectorCandidateService ?? ScannerV3VectorCandidateServiceV1(),
       _batchResolveService = _ScannerV3IdentityBatchResolveServiceV1();

  static const int cropOutputSize = 224;
  static const double _fastPathMaxAcceptedDistance = 0.195;
  static const int _fastPathMinCropSupport = 2;
  static const double _stableFastResultMaxDistance = 0.245;
  static const double _priorityArtworkGrayMaxDistance = 0.205;
  static const String _priorityArtworkGrayIdentitySignalCropType =
      'priority_artwork_gray_top';
  static const String _priorityFullCardIdentitySignalCropType =
      'priority_full_card_top';
  static const String _priorityFullCardUpperIdentitySignalCropType =
      'priority_full_card_upper_top';
  static const String _priorityCenterTightIdentitySignalCropType =
      'priority_center_tight_top';
  static const String _priorityCoreIdentityConsensusCropType =
      'priority_core_identity_consensus';
  static const String _priorityIdentitySupportCropType =
      'priority_identity_support';
  static const String _visualFullCardAlignmentCropType =
      'visual_full_card_alignment';
  static const String _crossViewTitleBandSignalCropType =
      'cross_view_title_band_match';
  static const String _fullCardIdentityAnchorCropType =
      'full_card_identity_anchor';
  static const String _fullCardCoreCropType = 'full_card_core';
  static const String _fullCardCoreTightCropType = 'full_card_core_tight';
  static const String _fullCardInnerCoreCropType = 'full_card_inner_core';
  static const Set<String> _identityAnchoredCropTypes = <String>{
    _priorityArtworkGrayIdentitySignalCropType,
    _priorityCenterTightIdentitySignalCropType,
    _priorityFullCardUpperIdentitySignalCropType,
    _priorityIdentitySupportCropType,
    _visualFullCardAlignmentCropType,
    'artwork_zoom_in_10_gray',
    'center_tight',
    _fullCardIdentityAnchorCropType,
    'title_band',
    'full_card_trimmed',
    'full_card_upper',
    'full_card_middle',
    'full_card',
    _fullCardCoreCropType,
    _fullCardCoreTightCropType,
    _fullCardInnerCoreCropType,
    _priorityFullCardIdentitySignalCropType,
  };
  static const Set<String> _priorityIdentityCropTypes = <String>{
    'artwork_zoom_in_10_gray',
  };
  static const Set<String> _priorityFullCardCropTypes = <String>{'full_card'};
  static const Set<String> _priorityCenterTightCropTypes = <String>{
    'center_tight',
  };
  static const Set<String> _coreConsensusCropTypes = <String>{
    _fullCardCoreCropType,
    _fullCardCoreTightCropType,
    _fullCardInnerCoreCropType,
    _fullCardIdentityAnchorCropType,
  };
  static const Set<String> _fallbackPriorityIdentityCropTypes = <String>{
    'full_card_upper',
  };
  static const List<String> queryCropTypes = <String>[
    'title_band',
    'full_card_trimmed',
    'full_card_upper',
    'full_card_middle',
    _fullCardCoreCropType,
    _fullCardCoreTightCropType,
    'artwork_zoom_in_10',
    'artwork_zoom_in_10_gray',
    'artwork',
    'shift_left',
    'shift_right',
    'shift_up',
    'shift_down',
    'center_tight',
    _fullCardIdentityAnchorCropType,
    'full_card',
    _fullCardInnerCoreCropType,
  ];

  final ScannerV3ImageEmbeddingServiceV1 _embeddingService;
  final ScannerV3VectorCandidateServiceV1 _vectorCandidateService;
  final _ScannerV3IdentityBatchResolveServiceV1 _batchResolveService;
  final int topPerCrop;
  final int topUnified;
  final int topRerankInput;
  final int topOutput;

  Future<void> warmUp() => _batchResolveService.warmUp();

  Future<ScannerV3IdentityFrameResult> resolveFrame({
    required ScannerV3ExportImage normalizedFullCard,
    required ScannerV3ExportImage artworkRegion,
  }) async {
    // The detector/guide has already normalized the card slot. Additional
    // foreground trimming can remove identity-bearing card regions on holo and
    // full-art frames, which makes visually similar cards outrank the target.
    final identityFullCard = normalizedFullCard;
    final identityArtworkRegion = _cropIdentityArtworkRegion(
      identityFullCard,
      fallback: artworkRegion,
    );
    final frameWatch = Stopwatch()..start();
    final fastCropGenerationWatch = Stopwatch()..start();
    final fastCrops = _generateFastQueryCrops(
      untrimmedFullCard: normalizedFullCard,
    );
    final fastCropGenerationElapsedMs =
        fastCropGenerationWatch.elapsedMilliseconds;

    final fastResolvedCrops = await _resolveCrops(fastCrops);
    final fastCropResults = fastResolvedCrops.results;
    final fastResult = _buildFrameResult(
      cropResults: fastCropResults,
      cropTypes: fastCrops.map((crop) => crop.type).toList(growable: false),
      totalElapsedMs: frameWatch.elapsedMilliseconds,
      cropGenerationElapsedMs: fastCropGenerationElapsedMs,
      cropEncodeElapsedMs: fastResolvedCrops.cropEncodeElapsedMs,
      batchRequestElapsedMs: fastResolvedCrops.batchRequestElapsedMs,
      cropTransportFormat: fastResolvedCrops.transportFormat,
      signalSource: 'v8_fast_visual_vector',
    );
    if (_fastFrameResultUsable(fastResult)) {
      return fastResult;
    }

    final fallbackCropGenerationWatch = Stopwatch()..start();
    final fallbackCrops = _generateFallbackQueryCrops(
      normalizedFullCard: identityFullCard,
      artworkRegion: identityArtworkRegion,
    );
    final fallbackCropGenerationElapsedMs =
        fallbackCropGenerationWatch.elapsedMilliseconds;
    final fallbackResolvedCrops = await _resolveCrops(fallbackCrops);
    final fallbackCropResults = fallbackResolvedCrops.results;
    return _buildFrameResult(
      cropResults: <_IdentityCropResult>[
        ...fastCropResults,
        ...fallbackCropResults,
      ],
      cropTypes: <String>[
        ...fastCrops.map((crop) => crop.type),
        ...fallbackCrops.map((crop) => crop.type),
      ],
      totalElapsedMs: frameWatch.elapsedMilliseconds,
      cropGenerationElapsedMs:
          fastCropGenerationElapsedMs + fallbackCropGenerationElapsedMs,
      cropEncodeElapsedMs: _sumMs(
        fastResolvedCrops.cropEncodeElapsedMs,
        fallbackResolvedCrops.cropEncodeElapsedMs,
      ),
      batchRequestElapsedMs: _sumMs(
        fastResolvedCrops.batchRequestElapsedMs,
        fallbackResolvedCrops.batchRequestElapsedMs,
      ),
      cropTransportFormat:
          fastResolvedCrops.transportFormat ==
              fallbackResolvedCrops.transportFormat
          ? fastResolvedCrops.transportFormat
          : '${fastResolvedCrops.transportFormat}+${fallbackResolvedCrops.transportFormat}',
      signalSource: 'v8_multicrop_vector_rerank',
    );
  }

  ScannerV3IdentityFrameResult _buildFrameResult({
    required List<_IdentityCropResult> cropResults,
    required List<String> cropTypes,
    required int totalElapsedMs,
    required int cropGenerationElapsedMs,
    required int? cropEncodeElapsedMs,
    required int? batchRequestElapsedMs,
    required String cropTransportFormat,
    required String signalSource,
  }) {
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
      cropCount: cropTypes.length,
      successfulCropCount: successful.length,
      cropTypes: cropTypes,
      embeddingElapsedMs: _maxMs(
        successful.map((result) => result.embeddingElapsedMs),
      ),
      vectorSearchElapsedMs: _maxMs(
        successful.map((result) => result.vectorSearchElapsedMs),
      ),
      rerankElapsedMs: rerankElapsedMs,
      totalElapsedMs: totalElapsedMs,
      cropGenerationElapsedMs: cropGenerationElapsedMs,
      cropEncodeElapsedMs: cropEncodeElapsedMs,
      batchRequestElapsedMs: batchRequestElapsedMs,
      cropTransportFormat: cropTransportFormat,
      cropOutputSize: cropOutputSize,
      errors: errors,
      signalSource: successful.isEmpty
          ? 'v8_multicrop_identity_no_successful_crops'
          : signalSource,
    );
  }

  bool _fastFrameResultAccepted(ScannerV3IdentityFrameResult result) {
    final candidate = result.candidates.isEmpty
        ? null
        : result.candidates.first;
    if (candidate == null) return false;
    if ((candidate.cropContributionCount ?? 0) < _fastPathMinCropSupport) {
      return false;
    }
    return candidate.distance <= _fastPathMaxAcceptedDistance;
  }

  bool _fastFrameResultUsable(ScannerV3IdentityFrameResult result) {
    if (_fastFrameResultAccepted(result)) return true;
    final candidate = result.candidates.isEmpty
        ? null
        : result.candidates.first;
    if (candidate == null) return false;
    if ((candidate.cropContributionCount ?? 0) < _fastPathMinCropSupport) {
      return false;
    }
    return candidate.distance <= _stableFastResultMaxDistance;
  }

  Future<_ResolvedIdentityCrops> _resolveCrops(
    List<_IdentityCrop> crops,
  ) async {
    if (_batchResolveService.configured) {
      try {
        final encodeWatch = Stopwatch()..start();
        final encodedCrops = crops
            .map(
              (crop) => _EncodedIdentityCrop.fromImage(crop.type, crop.image),
            )
            .toList(growable: false);
        final encodeElapsedMs = encodeWatch.elapsedMilliseconds;
        final requestWatch = Stopwatch()..start();
        final results = await _batchResolveService.resolveCrops(
          encodedCrops,
          topK: topPerCrop,
        );
        return _ResolvedIdentityCrops(
          results: results,
          cropEncodeElapsedMs: encodeElapsedMs,
          batchRequestElapsedMs: requestWatch.elapsedMilliseconds,
          transportFormat: encodedCrops.isEmpty
              ? 'raw_empty'
              : encodedCrops.first.transportFormat,
        );
      } catch (_) {
        // Keep the existing per-crop path as a fallback while the local
        // identity service is being restarted during scanner development.
      }
    }

    final results = await Future.wait(
      crops.map(_resolveCrop),
      eagerError: false,
    );
    return _ResolvedIdentityCrops(
      results: results,
      cropEncodeElapsedMs: null,
      batchRequestElapsedMs: null,
      transportFormat: 'png_per_crop_fallback',
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

  List<_IdentityCrop> _generateFastQueryCrops({
    required ScannerV3ExportImage untrimmedFullCard,
  }) {
    return <_IdentityCrop>[
      _IdentityCrop(
        type: 'full_card',
        image: _normalizedRectCrop(
          untrimmedFullCard,
          const _RectNorm(left: 0.00, top: 0.00, right: 1.00, bottom: 1.00),
        ),
      ),
    ];
  }

  List<_IdentityCrop> _generateFallbackQueryCrops({
    required ScannerV3ExportImage normalizedFullCard,
    required ScannerV3ExportImage artworkRegion,
  }) {
    final grayscaleFullCard = _asGrayscale(normalizedFullCard);
    final grayscaleArtworkRegion = _asGrayscale(artworkRegion);
    return <_IdentityCrop>[
      _IdentityCrop(
        type: 'title_band',
        image: _normalizedRectCrop(
          grayscaleFullCard,
          const _RectNorm(left: 0.02, top: 0.00, right: 0.98, bottom: 0.16),
        ),
      ),
      _IdentityCrop(
        type: _fullCardCoreCropType,
        image: _normalizedRectCrop(
          normalizedFullCard,
          const _RectNorm(left: 0.04, top: 0.06, right: 0.96, bottom: 0.88),
        ),
      ),
      _IdentityCrop(
        type: 'artwork_zoom_in_10_gray',
        image: _normalizedRectCrop(
          grayscaleArtworkRegion,
          _rectFromCenter(0.50, 0.50, 0.90, 0.90),
        ),
      ),
    ];
  }

  ScannerV3ExportImage _cropIdentityArtworkRegion(
    ScannerV3ExportImage source, {
    required ScannerV3ExportImage fallback,
  }) {
    if (source.width < 80 || source.height < 80) return fallback;
    return _cropExportImage(
      source,
      const _RectNorm(left: 0.08, top: 0.12, right: 0.92, bottom: 0.60),
    );
  }

  ScannerV3ExportImage _cropExportImage(
    ScannerV3ExportImage source,
    _RectNorm rect,
  ) {
    final leftNorm = rect.left.clamp(0.0, 1.0);
    final topNorm = rect.top.clamp(0.0, 1.0);
    final rightNorm = rect.right.clamp(0.0, 1.0);
    final bottomNorm = rect.bottom.clamp(0.0, 1.0);
    final left = math.max(
      0,
      math.min(source.width - 1, (leftNorm * source.width).floor()),
    );
    final top = math.max(
      0,
      math.min(source.height - 1, (topNorm * source.height).floor()),
    );
    final right = math.max(
      left + 1,
      math.min(source.width, (rightNorm * source.width).ceil()),
    );
    final bottom = math.max(
      top + 1,
      math.min(source.height, (bottomNorm * source.height).ceil()),
    );
    final cropWidth = right - left;
    final cropHeight = bottom - top;
    final bytesPerPixel = source.format == ScannerV3ExportImageFormat.rgba8888
        ? 4
        : 1;
    final output = Uint8List(cropWidth * cropHeight * bytesPerPixel);

    for (var y = 0; y < cropHeight; y += 1) {
      final srcStart = (((top + y) * source.width) + left) * bytesPerPixel;
      final outStart = y * cropWidth * bytesPerPixel;
      output.setRange(
        outStart,
        outStart + (cropWidth * bytesPerPixel),
        source.bytes,
        srcStart,
      );
    }

    return ScannerV3ExportImage(
      bytes: output,
      width: cropWidth,
      height: cropHeight,
      format: source.format,
    );
  }

  List<Candidate> _unionCandidates(List<_IdentityCropResult> cropResults) {
    final byCard = <String, _CandidateAccumulator>{};
    final priorityIdentitySignals = _priorityIdentitySignals(cropResults);

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
          final contributionCropTypes = <String>{...accumulator.cropTypes};
          final priorityIdentitySignal =
              priorityIdentitySignals[accumulator.bestCandidate.cardId];
          if (priorityIdentitySignal != null) {
            contributionCropTypes.add(priorityIdentitySignal);
            contributionCropTypes.add(_priorityIdentitySupportCropType);
          }
          final cropCount = contributionCropTypes.length;
          final identityAnchorCount = _identityAnchorCount(
            contributionCropTypes,
          );
          final frequencyBonus = math.min(
            0.08,
            math.max(0, cropCount - 1) * 0.02,
          );
          final rankConsensusBonus = math.min(
            0.14,
            accumulator.rankSignal * 0.035,
          );
          final identityAnchorBonus = math.min(
            0.06,
            identityAnchorCount * 0.015,
          );
          final genericOnlyPenalty = identityAnchorCount == 0 ? 0.07 : 0.0;
          final crossViewTitleBandPenalty = math.min(
            0.14,
            accumulator.crossViewTitleBandMatchCount * 0.035,
          );
          final aggregateScore =
              (accumulator.bestSimilarity +
                      frequencyBonus +
                      rankConsensusBonus +
                      identityAnchorBonus -
                      genericOnlyPenalty -
                      crossViewTitleBandPenalty)
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
            contributingCropTypes: contributionCropTypes.toList(growable: false)
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
          final identityAnchorScore =
              (_identityAnchorCount(candidate.contributingCropTypes) / 3)
                  .clamp(0.0, 1.0)
                  .toDouble();
          final priorityIdentityScore =
              _hasPriorityIdentitySignal(candidate.contributingCropTypes)
              ? 1.0
              : 0.0;
          final cropScore =
              ((candidate.cropContributionCount ?? 1) / maxCropCount)
                  .clamp(0.0, 1.0)
                  .toDouble();
          final externalRerankScore = candidate.rerankScore;
          final weightedScore = externalRerankScore == null
              ? ((aggregate * 0.42) +
                    (cropScore * 0.18) +
                    (identityAnchorScore * 0.25) +
                    (priorityIdentityScore * 0.15))
              : ((aggregate * 0.30) +
                    (externalRerankScore.clamp(0.0, 1.0) * 0.40) +
                    (cropScore * 0.10) +
                    (identityAnchorScore * 0.10) +
                    (priorityIdentityScore * 0.10));
          final finalScore = weightedScore;
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

  Map<String, String> _priorityIdentitySignals(
    List<_IdentityCropResult> cropResults,
  ) {
    final signalsByCardId = <String, String>{};
    final coreConsensus = _coreIdentityConsensusSignal(cropResults);
    if (coreConsensus != null) {
      signalsByCardId[coreConsensus] = _priorityCoreIdentityConsensusCropType;
      return signalsByCardId;
    }

    for (final cropResult in cropResults) {
      if (!_priorityIdentityCropTypes.contains(cropResult.cropType)) continue;
      if (cropResult.candidates.isEmpty) continue;
      final candidates = cropResult.candidates.toList(growable: false)
        ..sort((a, b) {
          if (a.rank != b.rank) return a.rank.compareTo(b.rank);
          if (a.distance != b.distance) {
            return a.distance.compareTo(b.distance);
          }
          return a.cardId.compareTo(b.cardId);
        });
      final top = candidates.first;
      final second = candidates.length > 1 ? candidates[1] : null;
      final topDistanceAccepted =
          top.distance <= _priorityArtworkGrayMaxDistance;
      final supportingCropCount = _candidateCropSupportCount(
        cropResults,
        top.cardId,
      );
      final hasSeparation =
          second == null || (second.distance - top.distance) >= 0.008;
      final hasCrossCropSupport = supportingCropCount >= 3;
      if (topDistanceAccepted && (hasSeparation || hasCrossCropSupport)) {
        signalsByCardId[top.cardId] =
            _priorityArtworkGrayIdentitySignalCropType;
      }
    }
    if (signalsByCardId.isNotEmpty) return signalsByCardId;

    for (final cropResult in cropResults) {
      if (!_priorityCenterTightCropTypes.contains(cropResult.cropType)) {
        continue;
      }
      if (cropResult.candidates.isEmpty) continue;
      final candidates = cropResult.candidates.toList(growable: false)
        ..sort((a, b) {
          if (a.rank != b.rank) return a.rank.compareTo(b.rank);
          if (a.distance != b.distance) {
            return a.distance.compareTo(b.distance);
          }
          return a.cardId.compareTo(b.cardId);
        });
      final top = candidates.first;
      final second = candidates.length > 1 ? candidates[1] : null;
      final topDistanceAccepted = top.distance <= 0.215;
      final hasSeparation =
          second == null || (second.distance - top.distance) >= 0.022;
      if (topDistanceAccepted && hasSeparation) {
        signalsByCardId[top.cardId] =
            _priorityCenterTightIdentitySignalCropType;
      }
    }
    if (signalsByCardId.isNotEmpty) return signalsByCardId;

    for (final cropResult in cropResults) {
      if (!_priorityFullCardCropTypes.contains(cropResult.cropType)) {
        continue;
      }
      if (cropResult.candidates.isEmpty) continue;
      final candidates = cropResult.candidates.toList(growable: false)
        ..sort((a, b) {
          if (a.rank != b.rank) return a.rank.compareTo(b.rank);
          if (a.distance != b.distance) {
            return a.distance.compareTo(b.distance);
          }
          return a.cardId.compareTo(b.cardId);
        });
      final top = candidates.first;
      final second = candidates.length > 1 ? candidates[1] : null;
      final isLiteralFullCard = cropResult.cropType == 'full_card';
      final referenceViewType = top.bestReferenceViewType ?? top.viewType;
      final topDistanceAccepted =
          top.distance <= (isLiteralFullCard ? 0.245 : 0.235);
      final supportingCropCount = _candidateCropSupportCount(
        cropResults,
        top.cardId,
      );
      final hasSeparation =
          second == null || (second.distance - top.distance) >= 0.008;
      final hasCrossCropSupport = supportingCropCount >= 3;
      if (topDistanceAccepted &&
          (!isLiteralFullCard || referenceViewType == 'full_card') &&
          (hasSeparation || (isLiteralFullCard && hasCrossCropSupport))) {
        signalsByCardId[top.cardId] = _priorityFullCardIdentitySignalCropType;
      }
    }
    if (signalsByCardId.isNotEmpty) return signalsByCardId;

    for (final cropResult in cropResults) {
      if (!_fallbackPriorityIdentityCropTypes.contains(cropResult.cropType)) {
        continue;
      }
      if (cropResult.candidates.isEmpty) continue;
      final candidates = cropResult.candidates.toList(growable: false)
        ..sort((a, b) {
          if (a.rank != b.rank) return a.rank.compareTo(b.rank);
          if (a.distance != b.distance) {
            return a.distance.compareTo(b.distance);
          }
          return a.cardId.compareTo(b.cardId);
        });
      final top = candidates.first;
      final second = candidates.length > 1 ? candidates[1] : null;
      final referenceView = top.bestReferenceViewType ?? top.viewType;
      final hasSeparation =
          second == null || (second.distance - top.distance) >= 0.008;
      if (top.distance <= 0.198 &&
          referenceView == 'full_card' &&
          hasSeparation) {
        signalsByCardId[top.cardId] =
            _priorityFullCardUpperIdentitySignalCropType;
      }
    }
    return signalsByCardId;
  }

  static bool _hasPriorityIdentitySignal(Iterable<String> cropTypes) {
    return cropTypes.contains(_priorityArtworkGrayIdentitySignalCropType) ||
        cropTypes.contains(_priorityCoreIdentityConsensusCropType) ||
        cropTypes.contains(_priorityCenterTightIdentitySignalCropType) ||
        cropTypes.contains(_priorityFullCardIdentitySignalCropType) ||
        cropTypes.contains(_priorityFullCardUpperIdentitySignalCropType) ||
        cropTypes.contains(_visualFullCardAlignmentCropType);
  }

  String? _coreIdentityConsensusSignal(List<_IdentityCropResult> cropResults) {
    final byCard = <String, _CoreConsensusAccumulator>{};
    for (final cropResult in cropResults) {
      if (!_coreConsensusCropTypes.contains(cropResult.cropType)) continue;
      if (cropResult.candidates.isEmpty) continue;
      final candidates = cropResult.candidates.toList(growable: false)
        ..sort((a, b) {
          if (a.rank != b.rank) return a.rank.compareTo(b.rank);
          if (a.distance != b.distance) {
            return a.distance.compareTo(b.distance);
          }
          return a.cardId.compareTo(b.cardId);
        });
      final top = candidates.first;
      if (!_coreConsensusDistanceAccepted(cropResult.cropType, top.distance)) {
        continue;
      }
      final accumulator = byCard.putIfAbsent(
        top.cardId,
        () => _CoreConsensusAccumulator(top.cardId),
      );
      accumulator.add(cropType: cropResult.cropType, distance: top.distance);
    }

    final eligible = byCard.values
        .where((candidate) {
          if (candidate.cropTypes.length < 2) return false;
          if (!candidate.cropTypes.contains(_fullCardCoreCropType) &&
              candidate.cropTypes.length < 3) {
            return false;
          }
          if (candidate.bestDistance > 0.285) return false;
          return candidate.averageDistance <= 0.315;
        })
        .toList(growable: false);
    if (eligible.isEmpty) return null;

    eligible.sort((a, b) {
      if (a.cropTypes.length != b.cropTypes.length) {
        return b.cropTypes.length.compareTo(a.cropTypes.length);
      }
      if (a.averageDistance != b.averageDistance) {
        return a.averageDistance.compareTo(b.averageDistance);
      }
      if (a.bestDistance != b.bestDistance) {
        return a.bestDistance.compareTo(b.bestDistance);
      }
      return a.cardId.compareTo(b.cardId);
    });

    final best = eligible.first;
    if (eligible.length > 1) {
      final second = eligible[1];
      if (best.cropTypes.length == second.cropTypes.length &&
          (second.averageDistance - best.averageDistance).abs() < 0.010) {
        return null;
      }
    }
    return best.cardId;
  }

  bool _coreConsensusDistanceAccepted(String cropType, double distance) {
    if (cropType == _fullCardCoreTightCropType) {
      return distance <= 0.340;
    }
    if (cropType == _fullCardIdentityAnchorCropType) {
      return distance <= 0.310;
    }
    return distance <= 0.300;
  }

  static bool _isCrossViewTitleBandMatch(
    String queryCropType,
    String? referenceViewType,
  ) {
    if (referenceViewType != 'title_band') return false;
    return queryCropType != 'title_band';
  }

  int _candidateCropSupportCount(
    List<_IdentityCropResult> cropResults,
    String cardId,
  ) {
    var count = 0;
    for (final cropResult in cropResults) {
      if (cropResult.candidates.any(
        (candidate) => candidate.cardId == cardId,
      )) {
        count += 1;
      }
    }
    return count;
  }

  int _identityAnchorCount(Iterable<String> cropTypes) {
    var count = 0;
    for (final cropType in cropTypes) {
      if (_identityAnchoredCropTypes.contains(cropType)) {
        count += 1;
      }
    }
    return count;
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
      final srcY = top + (((y + 0.5) / cropOutputSize) * cropHeight) - 0.5;
      for (var x = 0; x < cropOutputSize; x += 1) {
        final srcX = left + (((x + 0.5) / cropOutputSize) * cropWidth) - 0.5;
        final outIndex = ((y * cropOutputSize) + x) * bytesPerPixel;
        if (bytesPerPixel == 1) {
          output[outIndex] = _bilinearSampleChannel(
            source.bytes,
            source.width,
            source.height,
            bytesPerPixel,
            srcX,
            srcY,
            0,
          );
        } else {
          output[outIndex] = _bilinearSampleChannel(
            source.bytes,
            source.width,
            source.height,
            bytesPerPixel,
            srcX,
            srcY,
            0,
          );
          output[outIndex + 1] = _bilinearSampleChannel(
            source.bytes,
            source.width,
            source.height,
            bytesPerPixel,
            srcX,
            srcY,
            1,
          );
          output[outIndex + 2] = _bilinearSampleChannel(
            source.bytes,
            source.width,
            source.height,
            bytesPerPixel,
            srcX,
            srcY,
            2,
          );
          output[outIndex + 3] = _bilinearSampleChannel(
            source.bytes,
            source.width,
            source.height,
            bytesPerPixel,
            srcX,
            srcY,
            3,
          );
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

  int _bilinearSampleChannel(
    Uint8List bytes,
    int width,
    int height,
    int bytesPerPixel,
    double x,
    double y,
    int channel,
  ) {
    final clampedX = x.clamp(0.0, (width - 1).toDouble()).toDouble();
    final clampedY = y.clamp(0.0, (height - 1).toDouble()).toDouble();
    final x0 = clampedX.floor().clamp(0, width - 1).toInt();
    final y0 = clampedY.floor().clamp(0, height - 1).toInt();
    final x1 = math.min(width - 1, x0 + 1);
    final y1 = math.min(height - 1, y0 + 1);
    final xWeight = clampedX - x0;
    final yWeight = clampedY - y0;

    double valueAt(int sampleX, int sampleY) {
      final index = ((sampleY * width) + sampleX) * bytesPerPixel + channel;
      return index >= 0 && index < bytes.length ? bytes[index].toDouble() : 0.0;
    }

    final topValue =
        (valueAt(x0, y0) * (1.0 - xWeight)) + (valueAt(x1, y0) * xWeight);
    final bottomValue =
        (valueAt(x0, y1) * (1.0 - xWeight)) + (valueAt(x1, y1) * xWeight);
    return ((topValue * (1.0 - yWeight)) + (bottomValue * yWeight))
        .round()
        .clamp(0, 255)
        .toInt();
  }

  ScannerV3ExportImage _asGrayscale(ScannerV3ExportImage source) {
    if (source.format == ScannerV3ExportImageFormat.grayscale8) {
      return source;
    }
    final pixelCount = source.width * source.height;
    final expectedBytes = pixelCount * 4;
    final sourceBytes = Uint8List.sublistView(
      source.bytes,
      0,
      math.min(source.bytes.length, expectedBytes),
    );
    final output = Uint8List(pixelCount);
    for (var pixel = 0; pixel < pixelCount; pixel += 1) {
      final sourceIndex = pixel * 4;
      if (sourceIndex + 2 >= sourceBytes.length) break;
      final red = sourceBytes[sourceIndex];
      final green = sourceBytes[sourceIndex + 1];
      final blue = sourceBytes[sourceIndex + 2];
      output[pixel] = ((red * 299 + green * 587 + blue * 114) / 1000)
          .round()
          .clamp(0, 255);
    }
    return ScannerV3ExportImage(
      bytes: output,
      width: source.width,
      height: source.height,
      format: ScannerV3ExportImageFormat.grayscale8,
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

  int? _sumMs(int? left, int? right) {
    if (left == null && right == null) return null;
    return (left ?? 0) + (right ?? 0);
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
    required this.cropGenerationElapsedMs,
    required this.cropEncodeElapsedMs,
    required this.batchRequestElapsedMs,
    required this.cropTransportFormat,
    required this.cropOutputSize,
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
  final int cropGenerationElapsedMs;
  final int? cropEncodeElapsedMs;
  final int? batchRequestElapsedMs;
  final String cropTransportFormat;
  final int cropOutputSize;
  final List<String> errors;
  final String signalSource;
}

class _ScannerV3IdentityBatchResolveServiceV1 {
  _ScannerV3IdentityBatchResolveServiceV1({
    String? endpoint,
    http.Client? client,
  }) : endpoint = endpoint ?? _defaultEndpoint,
       _client = client ?? http.Client();

  static String get _defaultEndpoint {
    final explicit =
        dotenv.env['SCANNER_V3_RESOLVE_ENDPOINT'] ??
        const String.fromEnvironment('SCANNER_V3_RESOLVE_ENDPOINT');
    if (explicit.trim().isNotEmpty) return explicit;

    final baseEndpoint =
        dotenv.env['SCANNER_V3_IDENTITY_BASE_ENDPOINT'] ??
        const String.fromEnvironment('SCANNER_V3_IDENTITY_BASE_ENDPOINT');
    final trimmedBase = baseEndpoint.trim();
    if (trimmedBase.isNotEmpty) {
      return '${trimmedBase.replaceFirst(RegExp(r'/+$'), '')}/scanner-v3/resolve-crops';
    }

    final embedEndpoint =
        dotenv.env['SCANNER_V3_EMBEDDING_ENDPOINT'] ??
        const String.fromEnvironment('SCANNER_V3_EMBEDDING_ENDPOINT');
    final trimmed = embedEndpoint.trim();
    if (trimmed.endsWith('/scanner-v3/embed')) {
      return trimmed.replaceFirst(
        RegExp(r'/scanner-v3/embed$'),
        '/scanner-v3/resolve-crops',
      );
    }
    return '';
  }

  final String endpoint;
  final Duration timeout = const Duration(seconds: 8);
  final http.Client _client;

  bool get configured => endpoint.trim().isNotEmpty;

  Future<void> warmUp() async {
    final resolvedEndpoint = endpoint.trim();
    if (resolvedEndpoint.isEmpty) return;
    final uri = Uri.tryParse(resolvedEndpoint);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) return;
    final healthPath = uri.path.endsWith('/scanner-v3/resolve-crops')
        ? uri.path.replaceFirst(
            RegExp(r'/scanner-v3/resolve-crops$'),
            '/health',
          )
        : '/health';
    final healthUri = uri.replace(path: healthPath, query: null);
    try {
      await _client
          .get(
            healthUri,
            headers: const <String, String>{'accept': 'application/json'},
          )
          .timeout(const Duration(seconds: 2));
    } catch (_) {
      // Warmup is opportunistic; the real resolve path reports service errors.
    }
  }

  Future<List<_IdentityCropResult>> resolveCrops(
    List<_EncodedIdentityCrop> crops, {
    required int topK,
  }) async {
    if (crops.isEmpty) return const <_IdentityCropResult>[];
    final resolvedEndpoint = endpoint.trim();
    if (resolvedEndpoint.isEmpty) {
      throw const ScannerV3BatchResolveException(
        'resolve_endpoint_not_configured',
      );
    }
    final uri = Uri.tryParse(resolvedEndpoint);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw ScannerV3BatchResolveException(
        'invalid_resolve_endpoint:$resolvedEndpoint',
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
            'top_k': topK,
            'mode': 'scanner_v3_option_a_resolve_crops_v1',
            'crops': crops
                .map(
                  (crop) => <String, Object?>{
                    'crop_type': crop.type,
                    'raw_b64': base64Encode(crop.rawBytes),
                    'width': crop.width,
                    'height': crop.height,
                    'format': crop.transportFormat,
                  },
                )
                .toList(growable: false),
          }),
        )
        .timeout(timeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ScannerV3BatchResolveException(
        'resolve_http_${response.statusCode}',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const ScannerV3BatchResolveException('resolve_response_not_object');
    }
    final rawCrops = decoded['crops'];
    if (rawCrops is! List) {
      throw const ScannerV3BatchResolveException(
        'resolve_response_missing_crops',
      );
    }

    return rawCrops
        .map((raw) => _cropResultFromRaw(raw))
        .toList(growable: false);
  }

  _IdentityCropResult _cropResultFromRaw(Object? raw) {
    if (raw is! Map) {
      return const _IdentityCropResult(
        cropType: 'unknown',
        candidates: <Candidate>[],
        embeddingElapsedMs: null,
        vectorSearchElapsedMs: null,
        error: 'resolve_crop_not_object',
      );
    }
    final cropType =
        _optionalString(raw['crop_type'] ?? raw['cropType']) ?? 'unknown';
    final ok = raw['ok'] == true;
    final rawCandidates = raw['candidates'];
    final candidates = rawCandidates is List
        ? _candidatesFromRaw(rawCandidates, cropType)
        : const <Candidate>[];
    return _IdentityCropResult(
      cropType: cropType,
      candidates: candidates,
      embeddingElapsedMs: _optionalInt(
        raw['embedding_ms'] ?? raw['embeddingMs'],
      ),
      vectorSearchElapsedMs: _optionalInt(
        raw['vector_search_ms'] ?? raw['vectorSearchMs'],
      ),
      error: ok ? null : (raw['error'] ?? 'resolve_crop_failed'),
    );
  }

  List<Candidate> _candidatesFromRaw(List rawCandidates, String cropType) {
    final candidates = <Candidate>[];
    for (var i = 0; i < rawCandidates.length; i += 1) {
      final raw = rawCandidates[i];
      if (raw is! Map) continue;
      final cardId = (raw['card_id'] ?? raw['cardId'] ?? '').toString().trim();
      if (cardId.isEmpty) continue;
      final distance = _optionalDouble(raw['distance']);
      if (distance == null) continue;
      final rank = _optionalInt(raw['rank']) ?? i + 1;
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
          queryCropType: cropType,
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
    return candidates;
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
        .map((item) => item?.toString().trim() ?? '')
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
  }
}

class ScannerV3BatchResolveException implements Exception {
  const ScannerV3BatchResolveException(this.message);

  final String message;

  @override
  String toString() => 'ScannerV3BatchResolveException($message)';
}

class _ResolvedIdentityCrops {
  const _ResolvedIdentityCrops({
    required this.results,
    required this.cropEncodeElapsedMs,
    required this.batchRequestElapsedMs,
    required this.transportFormat,
  });

  final List<_IdentityCropResult> results;
  final int? cropEncodeElapsedMs;
  final int? batchRequestElapsedMs;
  final String transportFormat;
}

class _EncodedIdentityCrop {
  _EncodedIdentityCrop.fromImage(this.type, ScannerV3ExportImage image)
    : width = image.width,
      height = image.height,
      transportFormat = switch (image.format) {
        ScannerV3ExportImageFormat.rgba8888 => 'raw_rgba8888',
        ScannerV3ExportImageFormat.grayscale8 => 'raw_grayscale8',
      },
      rawBytes = _rawBytesForTransport(image);

  final String type;
  final Uint8List rawBytes;
  final int width;
  final int height;
  final String transportFormat;
}

Uint8List _rawBytesForTransport(ScannerV3ExportImage image) {
  final expectedBytes =
      image.width *
      image.height *
      (image.format == ScannerV3ExportImageFormat.rgba8888 ? 4 : 1);
  if (image.bytes.length == expectedBytes) return image.bytes;
  return Uint8List.sublistView(image.bytes, 0, expectedBytes);
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
  int crossViewTitleBandMatchCount = 0;
  final Set<String> cropTypes = <String>{};
  final Set<String> referenceViewTypes = <String>{};

  void add(Candidate candidate, String cropType) {
    final refType = candidate.bestReferenceViewType ?? candidate.viewType;
    if (refType != null && refType.isNotEmpty) {
      referenceViewTypes.add(refType);
    }
    final isCrossViewTitleBandMatch =
        ScannerV3IdentityPipelineV8._isCrossViewTitleBandMatch(
          cropType,
          refType,
        );
    if (isCrossViewTitleBandMatch) {
      crossViewTitleBandMatchCount += 1;
      cropTypes.add(
        ScannerV3IdentityPipelineV8._crossViewTitleBandSignalCropType,
      );
    } else {
      cropTypes.add(cropType);
      for (final type in candidate.contributingCropTypes) {
        cropTypes.add(type);
      }
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

class _CoreConsensusAccumulator {
  _CoreConsensusAccumulator(this.cardId);

  final String cardId;
  final Set<String> cropTypes = <String>{};
  double totalDistance = 0;
  double bestDistance = double.infinity;

  void add({required String cropType, required double distance}) {
    if (!cropTypes.add(cropType)) return;
    totalDistance += distance;
    if (distance < bestDistance) {
      bestDistance = distance;
    }
  }

  double get averageDistance =>
      cropTypes.isEmpty ? double.infinity : totalDistance / cropTypes.length;
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
