import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

import 'package:camera/camera.dart';

import 'convergence_state_v1.dart';

class ScannerV3LiveLoopController {
  ScannerV3LiveLoopController({
    this.sampleInterval = const Duration(milliseconds: 250),
  });

  static const double targetAspectRatio = 0.716;
  static const int normalizedHeight = 1024;
  static const int normalizedWidth = 733;
  static const double minBlurScore = 0.006;
  static const double minBrightnessScore = 0.12;
  static const double maxBrightnessScore = 0.90;
  static const double maxGlareRatio = 0.18;
  static const double minCardFillRatio = 0.08;
  static const int candidateDistanceThreshold = 26;
  static const int minAcceptedFramesToLock = 3;
  static const double lockScoreGap = 6.0;

  final Duration sampleInterval;

  DateTime _lastSampleAt = DateTime.fromMillisecondsSinceEpoch(0);
  int _frameCount = 0;
  int _sampledFrameCount = 0;
  int _acceptedFrameCount = 0;
  int _rejectedFrameCount = 0;
  int _nextCandidateIndex = 1;
  bool _locked = false;
  String? _lockedCandidateId;
  ScannerV3LiveLoopState _state = ScannerV3LiveLoopState.initial;
  final Map<String, _TrackedCandidate> _candidates =
      <String, _TrackedCandidate>{};

  ScannerV3LiveLoopState get state => _state;

  ScannerV3LiveLoopState? processCameraFrame({
    required CameraImage image,
    required int sensorRotation,
    required List<Offset>? quadPointsNorm,
  }) {
    _frameCount += 1;
    final now = DateTime.now();
    if (now.difference(_lastSampleAt) < sampleInterval) {
      return null;
    }
    _lastSampleAt = now;
    _sampledFrameCount += 1;

    final stopwatch = Stopwatch()..start();
    final normalized = _normalizeFrame(
      image: image,
      sensorRotation: sensorRotation,
      quadPointsNorm: quadPointsNorm,
    );

    if (normalized == null) {
      _rejectedFrameCount += 1;
      _decayCandidates();
      return _publishState(
        quality: const ScannerV3QualitySnapshot(
          blurScore: 0,
          brightnessScore: 0,
          glareRatio: 0,
          cardFillRatio: 0,
          accepted: false,
          rejectionReasons: <String>['normalization_failed'],
        ),
        decisionReason: 'normalization_failed',
        elapsedMs: stopwatch.elapsedMilliseconds,
      );
    }

    final quality = _measureQuality(normalized);
    if (!quality.accepted) {
      _rejectedFrameCount += 1;
      _decayCandidates();
      return _publishState(
        quality: quality,
        decisionReason: quality.rejectionReasons.join(','),
        elapsedMs: stopwatch.elapsedMilliseconds,
      );
    }

    _acceptedFrameCount += 1;
    final fullHash = _dHash(
      normalized.bytes,
      normalized.width,
      normalized.height,
      const _NormRect(left: 0, top: 0, right: 1, bottom: 1),
    );
    final artworkHash = _dHash(
      normalized.bytes,
      normalized.width,
      normalized.height,
      const _NormRect(left: 0.08, top: 0.12, right: 0.92, bottom: 0.60),
    );

    final candidate = _matchOrCreateCandidate(
      fullHash: fullHash,
      artworkHash: artworkHash,
    );
    _rewardCandidate(candidate, fullHash: fullHash, artworkHash: artworkHash);
    _decayCandidates(exceptId: candidate.id);
    _tryLock();

    return _publishState(
      quality: quality,
      decisionReason: _locked ? 'locked' : 'accepted_frame_clustered',
      elapsedMs: stopwatch.elapsedMilliseconds,
    );
  }

  void reset() {
    _lastSampleAt = DateTime.fromMillisecondsSinceEpoch(0);
    _frameCount = 0;
    _sampledFrameCount = 0;
    _acceptedFrameCount = 0;
    _rejectedFrameCount = 0;
    _nextCandidateIndex = 1;
    _locked = false;
    _lockedCandidateId = null;
    _candidates.clear();
    _state = ScannerV3LiveLoopState.initial;
  }

  _NormalizedFrame? _normalizeFrame({
    required CameraImage image,
    required int sensorRotation,
    required List<Offset>? quadPointsNorm,
  }) {
    if (image.format.group != ImageFormatGroup.yuv420 || image.planes.isEmpty) {
      return null;
    }

    final displayQuad = quadPointsNorm != null && quadPointsNorm.length == 4
        ? quadPointsNorm
        : _centerDisplayCardQuad();
    final imageQuad = _orderedImageQuad(displayQuad, sensorRotation);
    if (imageQuad == null) {
      return null;
    }

    final fillRatio = _polygonArea(displayQuad).abs();
    if (fillRatio < minCardFillRatio * 0.5) {
      return null;
    }

    final yPlane = image.planes.first;
    final source = _LumaSource(
      bytes: yPlane.bytes,
      width: image.width,
      height: image.height,
      rowStride: yPlane.bytesPerRow,
    );
    final output = Uint8List(normalizedWidth * normalizedHeight);
    final topLeft = imageQuad[0];
    final topRight = imageQuad[1];
    final bottomRight = imageQuad[2];
    final bottomLeft = imageQuad[3];

    for (var y = 0; y < normalizedHeight; y += 1) {
      final v = (y + 0.5) / normalizedHeight;
      final left = _lerpOffset(topLeft, bottomLeft, v);
      final right = _lerpOffset(topRight, bottomRight, v);
      for (var x = 0; x < normalizedWidth; x += 1) {
        final u = (x + 0.5) / normalizedWidth;
        final point = _lerpOffset(left, right, u);
        output[(y * normalizedWidth) + x] = source.sample(point.dx, point.dy);
      }
    }

    return _NormalizedFrame(
      bytes: output,
      width: normalizedWidth,
      height: normalizedHeight,
      cardFillRatio: fillRatio,
    );
  }

  List<Offset> _centerDisplayCardQuad() {
    const width = 0.76;
    const height = width / targetAspectRatio;
    const left = (1 - width) / 2;
    const top = 0.02;
    final bottom = math.min(0.98, top + height);
    return <Offset>[
      const Offset(left, top),
      const Offset(left + width, top),
      Offset(left + width, bottom),
      Offset(left, bottom),
    ];
  }

  List<Offset>? _orderedImageQuad(List<Offset> displayQuad, int rotation) {
    final imagePoints = displayQuad
        .map((point) => _displayNormToImageNorm(point, rotation))
        .toList(growable: false);
    final ordered = _orderQuad(imagePoints);
    if (ordered == null || _polygonArea(ordered).abs() < 0.01) {
      return null;
    }
    return ordered;
  }

  Offset _displayNormToImageNorm(Offset point, int rotation) {
    final normalizedRotation = ((rotation % 360) + 360) % 360;
    return switch (normalizedRotation) {
      90 => Offset(point.dy, 1 - point.dx),
      180 => Offset(1 - point.dx, 1 - point.dy),
      270 => Offset(1 - point.dy, point.dx),
      _ => point,
    };
  }

  List<Offset>? _orderQuad(List<Offset> points) {
    if (points.length != 4) return null;

    Offset? topLeft;
    Offset? topRight;
    Offset? bottomRight;
    Offset? bottomLeft;
    var minSum = double.infinity;
    var maxSum = -double.infinity;
    var minDiff = double.infinity;
    var maxDiff = -double.infinity;

    for (final point in points) {
      final sum = point.dx + point.dy;
      final diff = point.dx - point.dy;
      if (sum < minSum) {
        minSum = sum;
        topLeft = point;
      }
      if (sum > maxSum) {
        maxSum = sum;
        bottomRight = point;
      }
      if (diff < minDiff) {
        minDiff = diff;
        bottomLeft = point;
      }
      if (diff > maxDiff) {
        maxDiff = diff;
        topRight = point;
      }
    }

    if (topLeft == null ||
        topRight == null ||
        bottomRight == null ||
        bottomLeft == null) {
      return null;
    }

    return <Offset>[topLeft, topRight, bottomRight, bottomLeft];
  }

  Offset _lerpOffset(Offset a, Offset b, double t) {
    return Offset(a.dx + ((b.dx - a.dx) * t), a.dy + ((b.dy - a.dy) * t));
  }

  double _polygonArea(List<Offset> points) {
    if (points.length < 3) return 0;
    var sum = 0.0;
    for (var i = 0; i < points.length; i += 1) {
      final next = points[(i + 1) % points.length];
      sum += (points[i].dx * next.dy) - (next.dx * points[i].dy);
    }
    return sum / 2;
  }

  ScannerV3QualitySnapshot _measureQuality(_NormalizedFrame frame) {
    final brightness = _meanBrightness(frame);
    final glare = _highlightRatio(frame);
    final blur = _blurScore(frame);
    final reasons = <String>[];

    if (blur < minBlurScore) {
      reasons.add('blur_below_threshold');
    }
    if (brightness < minBrightnessScore) {
      reasons.add('brightness_too_low');
    }
    if (brightness > maxBrightnessScore) {
      reasons.add('brightness_too_high');
    }
    if (glare > maxGlareRatio) {
      reasons.add('glare_above_threshold');
    }
    if (frame.cardFillRatio < minCardFillRatio) {
      reasons.add('card_fill_ratio_below_threshold');
    }

    return ScannerV3QualitySnapshot(
      blurScore: blur,
      brightnessScore: brightness,
      glareRatio: glare,
      cardFillRatio: frame.cardFillRatio,
      accepted: reasons.isEmpty,
      rejectionReasons: reasons,
    );
  }

  double _meanBrightness(_NormalizedFrame frame) {
    final step = math.max(1, frame.height ~/ 180);
    var sum = 0;
    var count = 0;
    for (var y = 0; y < frame.height; y += step) {
      for (var x = 0; x < frame.width; x += step) {
        sum += frame.bytes[(y * frame.width) + x];
        count += 1;
      }
    }
    return count == 0 ? 0 : (sum / count) / 255;
  }

  double _highlightRatio(_NormalizedFrame frame) {
    final step = math.max(1, frame.height ~/ 180);
    var highlighted = 0;
    var count = 0;
    for (var y = 0; y < frame.height; y += step) {
      for (var x = 0; x < frame.width; x += step) {
        if (frame.bytes[(y * frame.width) + x] >= 245) {
          highlighted += 1;
        }
        count += 1;
      }
    }
    return count == 0 ? 0 : highlighted / count;
  }

  double _blurScore(_NormalizedFrame frame) {
    final step = math.max(1, frame.height ~/ 220);
    var sum = 0.0;
    var count = 0;
    for (var y = step; y < frame.height - step; y += step) {
      for (var x = step; x < frame.width - step; x += step) {
        final center = frame.bytes[(y * frame.width) + x];
        final left = frame.bytes[(y * frame.width) + x - step];
        final right = frame.bytes[(y * frame.width) + x + step];
        final up = frame.bytes[((y - step) * frame.width) + x];
        final down = frame.bytes[((y + step) * frame.width) + x];
        sum += ((center * 4) - left - right - up - down).abs();
        count += 1;
      }
    }
    return count == 0 ? 0 : (sum / count) / 255;
  }

  String _dHash(Uint8List bytes, int width, int height, _NormRect rect) {
    var hash = BigInt.zero;
    var bitIndex = 0;
    for (var y = 0; y < 8; y += 1) {
      for (var x = 0; x < 8; x += 1) {
        final left = _sampleRect(bytes, width, height, rect, x, y);
        final right = _sampleRect(bytes, width, height, rect, x + 1, y);
        if (left > right) {
          hash |= BigInt.one << bitIndex;
        }
        bitIndex += 1;
      }
    }
    return hash.toRadixString(16).padLeft(16, '0');
  }

  int _sampleRect(
    Uint8List bytes,
    int width,
    int height,
    _NormRect rect,
    int sampleX,
    int sampleY,
  ) {
    final xNorm = rect.left + (((sampleX + 0.5) / 9) * rect.width);
    final yNorm = rect.top + (((sampleY + 0.5) / 8) * rect.height);
    final x = (xNorm * (width - 1)).round().clamp(0, width - 1);
    final y = (yNorm * (height - 1)).round().clamp(0, height - 1);
    return bytes[(y * width) + x];
  }

  _TrackedCandidate _matchOrCreateCandidate({
    required String fullHash,
    required String artworkHash,
  }) {
    _TrackedCandidate? best;
    var bestDistance = 129;
    for (final candidate in _candidates.values) {
      final distance =
          _hammingDistance(fullHash, candidate.fullCardHash) +
          _hammingDistance(artworkHash, candidate.artworkHash);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }

    if (best != null && bestDistance <= candidateDistanceThreshold) {
      best.lastDistance = bestDistance;
      return best;
    }

    final id =
        'v3_${(_nextCandidateIndex++).toString().padLeft(2, '0')}_'
        '${fullHash.substring(0, 4)}${artworkHash.substring(0, 4)}';
    final candidate = _TrackedCandidate(
      id: id,
      score: 0,
      occurrences: 0,
      lastSeenFrame: _frameCount,
      fullCardHash: fullHash,
      artworkHash: artworkHash,
      lastDistance: 0,
    );
    _candidates[id] = candidate;
    return candidate;
  }

  void _rewardCandidate(
    _TrackedCandidate candidate, {
    required String fullHash,
    required String artworkHash,
  }) {
    final closeness =
        1 -
        (candidate.lastDistance / candidateDistanceThreshold).clamp(0.0, 1.0);
    candidate
      ..score += 5.0 + (closeness * 3.0)
      ..occurrences += 1
      ..lastSeenFrame = _frameCount
      ..fullCardHash = fullHash
      ..artworkHash = artworkHash;
  }

  void _decayCandidates({String? exceptId}) {
    final removeIds = <String>[];
    for (final candidate in _candidates.values) {
      if (candidate.id == exceptId) continue;
      candidate.score *= 0.82;
      if (_frameCount - candidate.lastSeenFrame > 12 && candidate.score < 1) {
        removeIds.add(candidate.id);
      }
    }
    for (final id in removeIds) {
      _candidates.remove(id);
    }
  }

  void _tryLock() {
    if (_locked) return;
    final ranked = _rankedCandidates();
    if (ranked.isEmpty) return;
    final best = ranked.first;
    final secondScore = ranked.length > 1 ? ranked[1].score : 0.0;
    final gap = best.score - secondScore;
    final recent = _frameCount - best.lastSeenFrame <= 2;
    if (best.occurrences >= minAcceptedFramesToLock &&
        gap >= lockScoreGap &&
        recent) {
      _locked = true;
      _lockedCandidateId = best.id;
    }
  }

  ScannerV3LiveLoopState _publishState({
    required ScannerV3QualitySnapshot quality,
    required String decisionReason,
    required int elapsedMs,
  }) {
    final ranked = _rankedCandidates();
    final best = ranked.isEmpty ? null : ranked.first;
    final secondScore = ranked.length > 1 ? ranked[1].score : 0.0;
    final gap = best == null ? 0.0 : best.score - secondScore;
    final occurrenceSignal = best == null
        ? 0.0
        : (best.occurrences / minAcceptedFramesToLock).clamp(0.0, 1.0);
    final gapSignal = (gap / lockScoreGap).clamp(0.0, 1.0);
    final confidence = _locked
        ? 1.0
        : ((occurrenceSignal * 0.45) + (gapSignal * 0.55)).clamp(0.0, 1.0);

    _state = ScannerV3LiveLoopState(
      frameCount: _frameCount,
      sampledFrameCount: _sampledFrameCount,
      acceptedFrameCount: _acceptedFrameCount,
      rejectedFrameCount: _rejectedFrameCount,
      locked: _locked,
      currentBestCandidateId: best?.id,
      lockedCandidateId: _lockedCandidateId,
      confidenceScore: confidence,
      candidates: ranked.map((candidate) => candidate.toState()).toList(),
      quality: quality,
      statusText: _locked ? 'Locked' : 'Scanning...',
      lastDecisionReason: decisionReason,
      lastSampleElapsedMs: elapsedMs,
    );
    return _state;
  }

  List<_TrackedCandidate> _rankedCandidates() {
    final ranked = _candidates.values.toList();
    ranked.sort((a, b) => b.score.compareTo(a.score));
    return ranked;
  }

  int _hammingDistance(String first, String second) {
    if (first.length != second.length) return 64;
    var value =
        BigInt.parse(first, radix: 16) ^ BigInt.parse(second, radix: 16);
    var distance = 0;
    while (value > BigInt.zero) {
      if ((value & BigInt.one) == BigInt.one) {
        distance += 1;
      }
      value >>= 1;
    }
    return distance;
  }
}

class _NormalizedFrame {
  const _NormalizedFrame({
    required this.bytes,
    required this.width,
    required this.height,
    required this.cardFillRatio,
  });

  final Uint8List bytes;
  final int width;
  final int height;
  final double cardFillRatio;
}

class _LumaSource {
  const _LumaSource({
    required this.bytes,
    required this.width,
    required this.height,
    required this.rowStride,
  });

  final Uint8List bytes;
  final int width;
  final int height;
  final int rowStride;

  int sample(double normX, double normY) {
    final x = (normX.clamp(0.0, 1.0) * (width - 1)).round();
    final y = (normY.clamp(0.0, 1.0) * (height - 1)).round();
    final offset = (y * rowStride) + x;
    if (offset < 0 || offset >= bytes.length) {
      return 0;
    }
    return bytes[offset];
  }
}

class _NormRect {
  const _NormRect({
    required this.left,
    required this.top,
    required this.right,
    required this.bottom,
  });

  final double left;
  final double top;
  final double right;
  final double bottom;

  double get width => right - left;
  double get height => bottom - top;
}

class _TrackedCandidate {
  _TrackedCandidate({
    required this.id,
    required this.score,
    required this.occurrences,
    required this.lastSeenFrame,
    required this.fullCardHash,
    required this.artworkHash,
    required this.lastDistance,
  });

  final String id;
  double score;
  int occurrences;
  int lastSeenFrame;
  String fullCardHash;
  String artworkHash;
  int lastDistance;

  CandidateState toState() {
    return CandidateState(
      id: id,
      score: score,
      occurrences: occurrences,
      lastSeenFrame: lastSeenFrame,
      fullCardHash: fullCardHash,
      artworkHash: artworkHash,
      lastDistance: lastDistance,
    );
  }
}
