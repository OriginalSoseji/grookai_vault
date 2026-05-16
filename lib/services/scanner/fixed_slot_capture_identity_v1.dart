import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import 'package:grookai_vault/services/scanner_v3/vector_candidate_service_v1.dart';

class FixedSlotCaptureGeometryV1 {
  FixedSlotCaptureGeometryV1._();

  static const double cardAspectRatio = 0.716;

  static ui.Rect oneCardSlotRect(ui.Size viewportSize) {
    final width = viewportSize.width;
    final height = viewportSize.height;
    final safeTop = 104.0;
    final safeBottom = 178.0;
    final availableHeight = (height - safeTop - safeBottom)
        .clamp(260.0, math.max(260.0, height))
        .toDouble();
    final centerY = safeTop + availableHeight / 2;

    final preferredWidth = (width * 0.74).clamp(220.0, width - 40.0);
    final preferredHeight = preferredWidth / cardAspectRatio;
    final slotHeight = math.min(preferredHeight, availableHeight);
    final slotWidth = slotHeight * cardAspectRatio;

    return ui.Rect.fromCenter(
      center: ui.Offset(width / 2, centerY),
      width: slotWidth,
      height: slotHeight,
    );
  }

  static ui.Rect mapPreviewSlotToImage({
    required ui.Rect slotRect,
    required ui.Size previewViewportSize,
    required ui.Size decodedImageSize,
  }) {
    if (previewViewportSize.width <= 0 ||
        previewViewportSize.height <= 0 ||
        decodedImageSize.width <= 0 ||
        decodedImageSize.height <= 0) {
      throw const FixedSlotCaptureException('invalid_mapping_size');
    }

    // The camera preview is rendered as a center-cropped cover view. The still
    // image is mapped through the same cover transform, then the visible slot is
    // projected back into decoded-image coordinates.
    final scale = math.max(
      previewViewportSize.width / decodedImageSize.width,
      previewViewportSize.height / decodedImageSize.height,
    );
    final displayedWidth = decodedImageSize.width * scale;
    final displayedHeight = decodedImageSize.height * scale;
    final offsetX = (previewViewportSize.width - displayedWidth) / 2;
    final offsetY = (previewViewportSize.height - displayedHeight) / 2;

    final projected = ui.Rect.fromLTRB(
      (slotRect.left - offsetX) / scale,
      (slotRect.top - offsetY) / scale,
      (slotRect.right - offsetX) / scale,
      (slotRect.bottom - offsetY) / scale,
    );

    final padded = ui.Rect.fromLTRB(
      projected.left - projected.width * 0.035,
      projected.top - projected.height * 0.025,
      projected.right + projected.width * 0.035,
      projected.bottom + projected.height * 0.025,
    );

    return _fitCardAspect(
      padded,
      decodedImageSize.width,
      decodedImageSize.height,
    );
  }

  static ui.Rect _fitCardAspect(
    ui.Rect rect,
    double imageWidth,
    double imageHeight,
  ) {
    var left = rect.left.clamp(0.0, imageWidth - 1);
    var top = rect.top.clamp(0.0, imageHeight - 1);
    var right = rect.right.clamp(left + 1, imageWidth);
    var bottom = rect.bottom.clamp(top + 1, imageHeight);

    var width = right - left;
    var height = bottom - top;
    final aspect = width / height;

    if (aspect > cardAspectRatio) {
      final targetHeight = width / cardAspectRatio;
      final extra = targetHeight - height;
      top -= extra / 2;
      bottom += extra / 2;
    } else {
      final targetWidth = height * cardAspectRatio;
      final extra = targetWidth - width;
      left -= extra / 2;
      right += extra / 2;
    }

    if (left < 0) {
      right -= left;
      left = 0;
    }
    if (right > imageWidth) {
      left -= right - imageWidth;
      right = imageWidth;
    }
    if (top < 0) {
      bottom -= top;
      top = 0;
    }
    if (bottom > imageHeight) {
      top -= bottom - imageHeight;
      bottom = imageHeight;
    }

    left = left.clamp(0.0, imageWidth - 1);
    top = top.clamp(0.0, imageHeight - 1);
    right = right.clamp(left + 1, imageWidth);
    bottom = bottom.clamp(top + 1, imageHeight);

    return ui.Rect.fromLTRB(left, top, right, bottom);
  }
}

class FixedSlotStillProcessorV1 {
  FixedSlotStillProcessorV1._();

  static const int normalizedWidth = 716;
  static const int normalizedHeight = 1000;
  static const int annCropSize = 224;
  static const int _maxDecodeWidth = 1800;

  static Future<FixedSlotStillArtifactV1> process({
    required Uint8List stillBytes,
    required ui.Size previewViewportSize,
    required ui.Rect slotRect,
  }) async {
    final codec = await ui.instantiateImageCodec(
      stillBytes,
      targetWidth: _maxDecodeWidth,
    );
    final frame = await codec.getNextFrame();
    final image = frame.image;
    try {
      final imageSize = ui.Size(
        image.width.toDouble(),
        image.height.toDouble(),
      );
      final cropRect = FixedSlotCaptureGeometryV1.mapPreviewSlotToImage(
        slotRect: slotRect,
        previewViewportSize: previewViewportSize,
        decodedImageSize: imageSize,
      );

      final normalized = await _renderCrop(
        image: image,
        sourceRect: cropRect,
        width: normalizedWidth,
        height: normalizedHeight,
      );
      final annCrops = <FixedSlotAnnCropV1>[
        FixedSlotAnnCropV1(
          cropType: 'full_card',
          width: annCropSize,
          height: annCropSize,
          rawRgbaBytes: (await _renderCrop(
            image: image,
            sourceRect: cropRect,
            width: annCropSize,
            height: annCropSize,
          )).rawRgbaBytes,
        ),
        FixedSlotAnnCropV1(
          cropType: 'full_card_upper',
          width: annCropSize,
          height: annCropSize,
          rawRgbaBytes: (await _renderCrop(
            image: image,
            sourceRect: _fractionalRect(
              cropRect,
              left: 0,
              top: 0,
              right: 1,
              bottom: 0.50,
            ),
            width: annCropSize,
            height: annCropSize,
          )).rawRgbaBytes,
        ),
        FixedSlotAnnCropV1(
          cropType: 'artwork_zoom_in_10_gray',
          width: annCropSize,
          height: annCropSize,
          rawRgbaBytes: (await _renderCrop(
            image: image,
            sourceRect: _fractionalRect(
              cropRect,
              left: 0.12,
              top: 0.19,
              right: 0.88,
              bottom: 0.58,
            ),
            width: annCropSize,
            height: annCropSize,
            grayscale: true,
          )).rawRgbaBytes,
        ),
      ];

      return FixedSlotStillArtifactV1(
        fullStillBytes: stillBytes,
        decodedImageWidth: image.width,
        decodedImageHeight: image.height,
        previewViewportSize: previewViewportSize,
        slotRect: slotRect,
        cropRect: cropRect,
        normalizedPngBytes: normalized.pngBytes,
        normalizedWidth: normalizedWidth,
        normalizedHeight: normalizedHeight,
        annCrops: annCrops,
      );
    } finally {
      image.dispose();
    }
  }

  static ui.Rect _fractionalRect(
    ui.Rect parent, {
    required double left,
    required double top,
    required double right,
    required double bottom,
  }) {
    return ui.Rect.fromLTRB(
      parent.left + parent.width * left,
      parent.top + parent.height * top,
      parent.left + parent.width * right,
      parent.top + parent.height * bottom,
    );
  }

  static Future<_RenderedCropV1> _renderCrop({
    required ui.Image image,
    required ui.Rect sourceRect,
    required int width,
    required int height,
    bool grayscale = false,
  }) async {
    final recorder = ui.PictureRecorder();
    final canvas = ui.Canvas(recorder);
    final paint = ui.Paint()..filterQuality = ui.FilterQuality.high;
    canvas.drawImageRect(
      image,
      sourceRect,
      ui.Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
      paint,
    );
    final picture = recorder.endRecording();
    final rendered = await picture.toImage(width, height);
    picture.dispose();

    try {
      final rawData = await rendered.toByteData(
        format: ui.ImageByteFormat.rawRgba,
      );
      if (rawData == null) {
        throw const FixedSlotCaptureException('unable_to_encode_raw_crop');
      }
      final raw = Uint8List.fromList(rawData.buffer.asUint8List());
      if (grayscale) {
        _applyGrayscale(raw);
      }
      final png = grayscale
          ? await _rawRgbaToPng(raw, width, height)
          : await _imageToPng(rendered);
      return _RenderedCropV1(rawRgbaBytes: raw, pngBytes: png);
    } finally {
      rendered.dispose();
    }
  }

  static Future<Uint8List> _imageToPng(ui.Image image) async {
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    if (data == null) {
      throw const FixedSlotCaptureException('unable_to_encode_png_crop');
    }
    return Uint8List.fromList(data.buffer.asUint8List());
  }

  static Future<Uint8List> _rawRgbaToPng(
    Uint8List raw,
    int width,
    int height,
  ) async {
    final completer = Completer<ui.Image>();
    ui.decodeImageFromPixels(
      raw,
      width,
      height,
      ui.PixelFormat.rgba8888,
      completer.complete,
    );
    final image = await completer.future;
    try {
      return _imageToPng(image);
    } finally {
      image.dispose();
    }
  }

  static void _applyGrayscale(Uint8List raw) {
    for (var offset = 0; offset + 3 < raw.length; offset += 4) {
      final lum =
          ((raw[offset] * 299) +
              (raw[offset + 1] * 587) +
              (raw[offset + 2] * 114)) ~/
          1000;
      raw[offset] = lum;
      raw[offset + 1] = lum;
      raw[offset + 2] = lum;
      raw[offset + 3] = 255;
    }
  }
}

class FixedSlotStillArtifactV1 {
  const FixedSlotStillArtifactV1({
    required this.fullStillBytes,
    required this.decodedImageWidth,
    required this.decodedImageHeight,
    required this.previewViewportSize,
    required this.slotRect,
    required this.cropRect,
    required this.normalizedPngBytes,
    required this.normalizedWidth,
    required this.normalizedHeight,
    required this.annCrops,
  });

  final Uint8List fullStillBytes;
  final int decodedImageWidth;
  final int decodedImageHeight;
  final ui.Size previewViewportSize;
  final ui.Rect slotRect;
  final ui.Rect cropRect;
  final Uint8List normalizedPngBytes;
  final int normalizedWidth;
  final int normalizedHeight;
  final List<FixedSlotAnnCropV1> annCrops;
}

class FixedSlotAnnCropV1 {
  const FixedSlotAnnCropV1({
    required this.cropType,
    required this.width,
    required this.height,
    required this.rawRgbaBytes,
  });

  final String cropType;
  final int width;
  final int height;
  final Uint8List rawRgbaBytes;

  Map<String, Object?> toRequestJson() {
    return <String, Object?>{
      'crop_type': cropType,
      'raw_b64': base64Encode(rawRgbaBytes),
      'width': width,
      'height': height,
      'format': 'rgba8888',
    };
  }
}

class FixedSlotAnnIdentityClientV1 {
  FixedSlotAnnIdentityClientV1({
    String? endpoint,
    http.Client? client,
    this.topK = 12,
    this.timeout = const Duration(seconds: 5),
  }) : endpoint = endpoint ?? resolveConfiguredEndpoint(),
       _client = client ?? http.Client();

  final String endpoint;
  final int topK;
  final Duration timeout;
  final http.Client _client;

  static String resolveConfiguredEndpoint() {
    final direct = _firstNonEmpty(
      dotenv.env['SCANNER_V3_RESOLVE_ENDPOINT'],
      const String.fromEnvironment('SCANNER_V3_RESOLVE_ENDPOINT'),
    );
    if (direct != null) return direct;

    final base = _firstNonEmpty(
      dotenv.env['SCANNER_V3_IDENTITY_BASE_ENDPOINT'],
      const String.fromEnvironment('SCANNER_V3_IDENTITY_BASE_ENDPOINT'),
    );
    if (base != null) {
      return '${base.replaceFirst(RegExp(r'/+$'), '')}/scanner-v3/resolve-crops';
    }

    final embedding = _firstNonEmpty(
      dotenv.env['SCANNER_V3_EMBEDDING_ENDPOINT'],
      const String.fromEnvironment('SCANNER_V3_EMBEDDING_ENDPOINT'),
    );
    if (embedding != null) {
      return embedding.replaceFirst(
        RegExp(r'/scanner-v3/embed-crop$'),
        '/scanner-v3/resolve-crops',
      );
    }

    return '';
  }

  Future<FixedSlotAnnResolutionV1> resolve(
    List<FixedSlotAnnCropV1> crops,
  ) async {
    final resolvedEndpoint = endpoint.trim();
    if (resolvedEndpoint.isEmpty) {
      return FixedSlotAnnResolutionV1.closed(
        endpoint: resolvedEndpoint,
        failureReason: 'scanner_endpoint_not_configured',
      );
    }
    final uri = Uri.tryParse(resolvedEndpoint);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      return FixedSlotAnnResolutionV1.closed(
        endpoint: resolvedEndpoint,
        failureReason: 'invalid_scanner_endpoint',
      );
    }

    final stopwatch = Stopwatch()..start();
    try {
      final response = await _client
          .post(
            uri,
            headers: const <String, String>{
              'content-type': 'application/json',
              'accept': 'application/json',
            },
            body: jsonEncode(<String, Object?>{
              'top_k': topK,
              'mode': 'fixed_slot_capture_scanner_v1',
              'crops': crops.map((crop) => crop.toRequestJson()).toList(),
            }),
          )
          .timeout(timeout);
      stopwatch.stop();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return FixedSlotAnnResolutionV1.closed(
          endpoint: resolvedEndpoint,
          elapsed: stopwatch.elapsed,
          failureReason: 'scanner_http_${response.statusCode}',
        );
      }

      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        return FixedSlotAnnResolutionV1.closed(
          endpoint: resolvedEndpoint,
          elapsed: stopwatch.elapsed,
          failureReason: 'scanner_response_not_object',
        );
      }

      final cropsByType = _parseResolvedCrops(decoded['crops']);
      final decision = _chooseConfidentCandidate(cropsByType);
      return FixedSlotAnnResolutionV1(
        endpoint: resolvedEndpoint,
        elapsed: stopwatch.elapsed,
        candidate: decision.candidate,
        failureReason: decision.failureReason,
        evidence: decision.evidence,
        rawResponse: decoded,
        candidatesByCropType: cropsByType.map(
          (key, value) => MapEntry(
            key,
            value.map((item) => item.candidate).toList(growable: false),
          ),
        ),
      );
    } catch (error) {
      stopwatch.stop();
      return FixedSlotAnnResolutionV1.closed(
        endpoint: resolvedEndpoint,
        elapsed: stopwatch.elapsed,
        failureReason: 'scanner_request_failed:${error.runtimeType}',
      );
    }
  }

  static String? _firstNonEmpty(String? first, String? second) {
    final firstValue = first?.trim();
    if (firstValue != null && firstValue.isNotEmpty) return firstValue;
    final secondValue = second?.trim();
    if (secondValue != null && secondValue.isNotEmpty) return secondValue;
    return null;
  }

  static Map<String, List<_ResolvedCropCandidateV1>> _parseResolvedCrops(
    Object? rawCrops,
  ) {
    final byType = <String, List<_ResolvedCropCandidateV1>>{};
    if (rawCrops is! List) return byType;
    for (final rawCrop in rawCrops) {
      if (rawCrop is! Map) continue;
      final cropType = (rawCrop['crop_type'] ?? rawCrop['cropType'] ?? '')
          .toString();
      final candidates = rawCrop['candidates'];
      if (cropType.trim().isEmpty || candidates is! List) continue;
      byType[cropType] = <_ResolvedCropCandidateV1>[
        for (var i = 0; i < candidates.length; i += 1)
          if (candidates[i] is Map)
            _ResolvedCropCandidateV1(
              candidate: _candidateFromRaw(
                candidates[i] as Map,
                fallbackRank: i + 1,
                queryCropType: cropType,
              ),
              raw: Map<String, Object?>.from(candidates[i] as Map),
            ),
      ];
    }
    return byType;
  }

  static _FixedSlotDecisionV1 _chooseConfidentCandidate(
    Map<String, List<_ResolvedCropCandidateV1>> candidatesByCrop,
  ) {
    final fullCard = candidatesByCrop['full_card'] ?? const [];
    if (fullCard.isEmpty) {
      return const _FixedSlotDecisionV1(
        failureReason: 'no_full_card_candidates',
        evidence: <String, Object?>{},
      );
    }

    final top = fullCard.first;
    final topId = top.candidate.cardId;
    final supportingCropTypes = <String>[];
    for (final entry in candidatesByCrop.entries) {
      if (entry.key == 'full_card') continue;
      final supported = entry.value
          .take(6)
          .any((item) => item.candidate.cardId == topId);
      if (supported) supportingCropTypes.add(entry.key);
    }

    final alignmentSignal =
        top.raw['visual_full_card_alignment_signal'] == true ||
        top.raw['full_card_exact_visual_match'] == true ||
        top.candidate.contributingCropTypes.contains(
          'visual_full_card_alignment',
        ) ||
        top.candidate.contributingCropTypes.contains(
          'full_card_exact_visual_match',
        );
    final contributionCount = top.candidate.cropContributionCount ?? 1;
    final isWildDistance = top.candidate.distance > 0.36;
    final hasSupport =
        supportingCropTypes.isNotEmpty ||
        alignmentSignal ||
        contributionCount >= 2;

    final evidence = <String, Object?>{
      'full_card_rank1_card_id': top.candidate.cardId,
      'full_card_rank1_name': top.candidate.name,
      'full_card_rank1_distance': top.candidate.distance,
      'supporting_crop_types': supportingCropTypes,
      'alignment_signal': alignmentSignal,
      'crop_contribution_count': contributionCount,
    };

    if (isWildDistance) {
      return _FixedSlotDecisionV1(
        failureReason: 'full_card_candidate_too_far',
        evidence: evidence,
      );
    }
    if (!hasSupport) {
      return _FixedSlotDecisionV1(
        failureReason: 'weak_visual_agreement',
        evidence: evidence,
      );
    }

    return _FixedSlotDecisionV1(candidate: top.candidate, evidence: evidence);
  }

  static Candidate _candidateFromRaw(
    Map raw, {
    required int fallbackRank,
    required String queryCropType,
  }) {
    final cardId = (raw['card_id'] ?? raw['cardId'] ?? '').toString().trim();
    final rawDistance = raw['distance'];
    final distance = rawDistance is num
        ? rawDistance.toDouble()
        : double.tryParse('$rawDistance');
    final rawRank = raw['rank'];
    final rank = rawRank is num ? rawRank.toInt() : fallbackRank;
    return Candidate(
      cardId: cardId.isEmpty ? 'unknown' : cardId,
      distance: (distance == null || !distance.isFinite) ? 1.0 : distance,
      rank: rank <= 0 ? fallbackRank : rank,
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
      rerankScore: _optionalDouble(raw['rerank_score'] ?? raw['rerankScore']),
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
    );
  }

  static String? _optionalString(Object? value) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  static double? _optionalDouble(Object? value) {
    if (value == null) return null;
    final number = value is num ? value.toDouble() : double.tryParse('$value');
    return number == null || !number.isFinite ? null : number;
  }

  static int? _optionalInt(Object? value) {
    if (value == null) return null;
    final number = value is num ? value.toInt() : int.tryParse('$value');
    return number == null || number <= 0 ? null : number;
  }

  static List<String> _optionalStringList(Object? value) {
    if (value is! List) return const <String>[];
    return value
        .map((item) => item.toString().trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
  }
}

class FixedSlotAnnResolutionV1 {
  const FixedSlotAnnResolutionV1({
    required this.endpoint,
    this.elapsed = Duration.zero,
    this.candidate,
    this.failureReason,
    this.evidence = const <String, Object?>{},
    this.rawResponse,
    this.candidatesByCropType = const <String, List<Candidate>>{},
  });

  factory FixedSlotAnnResolutionV1.closed({
    required String endpoint,
    Duration elapsed = Duration.zero,
    required String failureReason,
  }) {
    return FixedSlotAnnResolutionV1(
      endpoint: endpoint,
      elapsed: elapsed,
      failureReason: failureReason,
    );
  }

  final String endpoint;
  final Duration elapsed;
  final Candidate? candidate;
  final String? failureReason;
  final Map<String, Object?> evidence;
  final Map<String, dynamic>? rawResponse;
  final Map<String, List<Candidate>> candidatesByCropType;

  bool get hasConfidentMatch => candidate != null && failureReason == null;
}

class FixedSlotArtifactWriterV1 {
  FixedSlotArtifactWriterV1._();

  static Future<FixedSlotArtifactFilesV1?> writeLatest({
    required FixedSlotStillArtifactV1 artifact,
    required FixedSlotAnnResolutionV1 resolution,
  }) async {
    if (!kDebugMode) return null;
    final directory = await _artifactDirectory();
    await directory.create(recursive: true);

    final fullStill = _fileIn(directory, 'latest_full_still.jpg');
    final normalized = _fileIn(directory, 'latest_fixed_slot_normalized.png');
    final manifest = _fileIn(directory, 'latest_fixed_slot_manifest.json');

    await fullStill.writeAsBytes(artifact.fullStillBytes, flush: true);
    await normalized.writeAsBytes(artifact.normalizedPngBytes, flush: true);
    await manifest.writeAsString(
      const JsonEncoder.withIndent('  ').convert(<String, Object?>{
        'timestamp': DateTime.now().toUtc().toIso8601String(),
        'captured_image_width': artifact.decodedImageWidth,
        'captured_image_height': artifact.decodedImageHeight,
        'preview_viewport': _sizeJson(artifact.previewViewportSize),
        'slot_rect_preview_coordinates': _rectJson(artifact.slotRect),
        'mapped_crop_rect_image_coordinates': _rectJson(artifact.cropRect),
        'normalized_output_width': artifact.normalizedWidth,
        'normalized_output_height': artifact.normalizedHeight,
        'ann_crop_types': artifact.annCrops
            .map((crop) => crop.cropType)
            .toList(growable: false),
        'endpoint_used': resolution.endpoint,
        'ann_elapsed_ms': resolution.elapsed.inMicroseconds / 1000,
        'ann_has_confident_match': resolution.hasConfidentMatch,
        'ann_failure_reason': resolution.failureReason,
        'ann_candidate': _candidateJson(resolution.candidate),
        'ann_evidence': resolution.evidence,
        'mapping_assumption':
            'visible slot mapped to decoded still with center-crop cover transform',
      }),
      flush: true,
    );

    return FixedSlotArtifactFilesV1(
      directoryPath: directory.path,
      fullStillPath: fullStill.path,
      normalizedPath: normalized.path,
      manifestPath: manifest.path,
    );
  }

  static Future<Directory> _artifactDirectory() async {
    final candidates = <Directory>[
      Directory(['.tmp', 'scanner_fixed_slot'].join(Platform.pathSeparator)),
      Directory(
        [
          Directory.systemTemp.path,
          'scanner_fixed_slot',
        ].join(Platform.pathSeparator),
      ),
    ];
    Object? lastError;
    for (final directory in candidates) {
      try {
        await directory.create(recursive: true);
        return directory;
      } catch (error) {
        lastError = error;
      }
    }
    throw FixedSlotCaptureException(
      'artifact_directory_unavailable:${lastError ?? 'unknown'}',
    );
  }

  static File _fileIn(Directory directory, String name) {
    return File([directory.path, name].join(Platform.pathSeparator));
  }

  static Map<String, double> _sizeJson(ui.Size size) {
    return <String, double>{'width': size.width, 'height': size.height};
  }

  static Map<String, double> _rectJson(ui.Rect rect) {
    return <String, double>{
      'left': rect.left,
      'top': rect.top,
      'right': rect.right,
      'bottom': rect.bottom,
      'width': rect.width,
      'height': rect.height,
    };
  }

  static Map<String, Object?>? _candidateJson(Candidate? candidate) {
    if (candidate == null) return null;
    return <String, Object?>{
      'card_id': candidate.cardId,
      'gv_id': candidate.gvId,
      'name': candidate.name,
      'set_code': candidate.setCode,
      'number': candidate.number,
      'distance': candidate.distance,
      'similarity': candidate.similarity,
      'rank': candidate.rank,
      'contributing_crop_types': candidate.contributingCropTypes,
    };
  }
}

class FixedSlotArtifactFilesV1 {
  const FixedSlotArtifactFilesV1({
    required this.directoryPath,
    required this.fullStillPath,
    required this.normalizedPath,
    required this.manifestPath,
  });

  final String directoryPath;
  final String fullStillPath;
  final String normalizedPath;
  final String manifestPath;
}

class FixedSlotCaptureException implements Exception {
  const FixedSlotCaptureException(this.message);

  final String message;

  @override
  String toString() => 'FixedSlotCaptureException($message)';
}

class _RenderedCropV1 {
  const _RenderedCropV1({required this.rawRgbaBytes, required this.pngBytes});

  final Uint8List rawRgbaBytes;
  final Uint8List pngBytes;
}

class _ResolvedCropCandidateV1 {
  const _ResolvedCropCandidateV1({required this.candidate, required this.raw});

  final Candidate candidate;
  final Map<String, Object?> raw;
}

class _FixedSlotDecisionV1 {
  const _FixedSlotDecisionV1({
    this.candidate,
    this.failureReason,
    required this.evidence,
  });

  final Candidate? candidate;
  final String? failureReason;
  final Map<String, Object?> evidence;
}
