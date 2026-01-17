import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';

import '../../services/scanner/condition_scan_service.dart';

class QuadAdjustScreen extends StatefulWidget {
  final String snapshotId;
  final Map<String, dynamic>? initialAnalysis;

  const QuadAdjustScreen({
    super.key,
    required this.snapshotId,
    this.initialAnalysis,
  });

  @override
  State<QuadAdjustScreen> createState() => _QuadAdjustScreenState();
}

class _QuadAdjustScreenState extends State<QuadAdjustScreen> {
  final _service = ConditionScanService();
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _snapshot;
  Map<String, dynamic>? _analysis;
  String _activeFace = 'front';
  String? _frontUrl;
  String? _backUrl;
  double _frontAspect = 3 / 4;
  double _backAspect = 3 / 4;
  final Map<String, List<Offset>> _quads = {};

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final snap = await _service.fetchSnapshot(widget.snapshotId);
      final analysis =
          widget.initialAnalysis ?? await _service.fetchLatestAnalysis(widget.snapshotId);
      if (snap == null) throw Exception('Snapshot not found');

      final images = Map<String, dynamic>.from(snap['images'] ?? {});
      final bucket = images['bucket']?.toString() ?? '';
      final frontPath = images['front'] is Map ? images['front']['path']?.toString() : null;
      final backPath = images['back'] is Map ? images['back']['path']?.toString() : null;

      if (bucket.isEmpty || frontPath == null || backPath == null) {
        throw Exception('Snapshot is missing image paths');
      }

      final storage = Supabase.instance.client.storage;
      final frontUrl = await storage.from(bucket).createSignedUrl(frontPath, 300);
      final backUrl = await storage.from(bucket).createSignedUrl(backPath, 300);

      final Map<String, dynamic> analysisMap =
          analysis == null ? <String, dynamic>{} : Map<String, dynamic>.from(analysis);
      final Map<String, dynamic> measurements =
          analysisMap['measurements'] is Map
              ? Map<String, dynamic>.from(analysisMap['measurements'] as Map)
              : <String, dynamic>{};
      final centering = Map<String, dynamic>.from(measurements['centering'] ?? {});
      final evidence = Map<String, dynamic>.from(centering['evidence'] ?? {});
      final raw = Map<String, dynamic>.from(centering['raw'] ?? {});
      final normSize = Map<String, dynamic>.from(raw['normalized_size'] ?? {});
      final widthPx = (normSize['width_px'] as num?)?.toDouble() ?? 3;
      final heightPx = (normSize['height_px'] as num?)?.toDouble() ?? 4;
      _frontAspect = widthPx > 0 && heightPx > 0 ? widthPx / heightPx : 3 / 4;
      _backAspect = _frontAspect;

      setState(() {
        _snapshot = snap;
        _analysis = analysis;
        _frontUrl = frontUrl;
        _backUrl = backUrl;
        _quads['front'] = _initialQuadForFace(
          face: 'front',
          images: images,
          evidence: evidence['front_outer_bbox'],
        );
        _quads['back'] = _initialQuadForFace(
          face: 'back',
          images: images,
          evidence: evidence['back_outer_bbox'],
        );
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<Offset> _initialQuadForFace({
    required String face,
    required Map<String, dynamic> images,
    dynamic evidence,
  }) {
    final aiOverrides = Map<String, dynamic>.from(images['ai_overrides'] ?? {});
    final quadV1 = Map<String, dynamic>.from(aiOverrides['quad_v1'] ?? {});
    final existing = quadV1[face];
    if (existing is Map && existing['points_norm'] is List) {
      final pts = (existing['points_norm'] as List)
          .map((p) => Offset(
                (p as List)[0].toDouble(),
                (p as List)[1].toDouble(),
              ))
          .toList();
      if (pts.length == 4) return pts;
    }

    if (evidence is Map) {
      final x = (evidence['x'] as num?)?.toDouble();
      final y = (evidence['y'] as num?)?.toDouble();
      final w = (evidence['w'] as num?)?.toDouble();
      final h = (evidence['h'] as num?)?.toDouble();
      if (x != null && y != null && w != null && h != null) {
        return [
          Offset(x, y),
          Offset(x + w, y),
          Offset(x + w, y + h),
          Offset(x, y + h),
        ];
      }
    }

    const margin = 0.05;
    return [
      const Offset(margin, margin),
      const Offset(1 - margin, margin),
      const Offset(1 - margin, 1 - margin),
      const Offset(margin, 1 - margin),
    ];
  }

  Future<void> _saveAndRerun() async {
    final frontPts = _quads['front'];
    if (frontPts == null) {
      setState(() => _error = 'Front quad is required');
      return;
    }
    setState(() => _loading = true);

    try {
      final payload = <String, List<List<double>>>{};
      payload['front'] = frontPts.map((p) => [p.dx, p.dy]).toList();
      if (_quads['back'] != null) {
        payload['back'] = _quads['back']!.map((p) => [p.dx, p.dy]).toList();
      }
      final analysisKey = await _service.insertUserQuadAnalysis(
        snapshotId: widget.snapshotId,
        quads: payload,
      );
      if (kDebugMode) {
        debugPrint(
          '[DEBUG] user_quad_insert_ok: snapshot=${widget.snapshotId} analysis_key=$analysisKey',
        );
      }
      await _service.enqueueConditionAnalysis(widget.snapshotId);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[DEBUG] user_quad_insert_error: $e');
      }
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Crop & Align'),
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        _error!,
                        style: theme.textTheme.bodyMedium
                            ?.copyWith(color: colorScheme.error),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Drag the corners to match the card edges. Save to re-run centering.',
                          style: theme.textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 12),
                        SegmentedButton<String>(
                          segments: const [
                            ButtonSegment(value: 'front', label: Text('Front')),
                            ButtonSegment(value: 'back', label: Text('Back')),
                          ],
                          selected: {_activeFace},
                          onSelectionChanged: (values) {
                            setState(() => _activeFace = values.first);
                          },
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: _buildEditorForFace(
                            face: _activeFace,
                            url: _activeFace == 'front' ? _frontUrl : _backUrl,
                            aspect: _activeFace == 'front' ? _frontAspect : _backAspect,
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: _loading ? null : _saveAndRerun,
                          icon: const Icon(Icons.save),
                          label: const Text('Save & Re-run'),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Snapshot: ${widget.snapshotId}',
                          style: theme.textTheme.labelSmall,
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildEditorForFace({
    required String face,
    required String? url,
    required double aspect,
  }) {
    final quad = _quads[face];
    if (url == null || quad == null) {
      return const Center(child: Text('Missing image or quad'));
    }

    return QuadEditor(
      imageUrl: url,
      aspectRatio: aspect,
      initialPoints: quad,
      onChanged: (points) {
        setState(() => _quads[face] = points);
      },
    );
  }
}

class QuadEditor extends StatefulWidget {
  final String imageUrl;
  final double aspectRatio;
  final List<Offset> initialPoints;
  final ValueChanged<List<Offset>> onChanged;

  const QuadEditor({
    super.key,
    required this.imageUrl,
    required this.aspectRatio,
    required this.initialPoints,
    required this.onChanged,
  });

  @override
  State<QuadEditor> createState() => _QuadEditorState();
}

class _QuadEditorState extends State<QuadEditor> {
  late List<Offset> _points;

  @override
  void initState() {
    super.initState();
    _points = List.of(widget.initialPoints);
  }

  void _updatePoint(int idx, Offset delta, Size size) {
    final dx = delta.dx / size.width;
    final dy = delta.dy / size.height;
    final next = List<Offset>.from(_points);
    final pt = next[idx];
    final clamped = Offset(
      min(1, max(0, pt.dx + dx)),
      min(1, max(0, pt.dy + dy)),
    );
    next[idx] = clamped;
    setState(() {
      _points = next;
    });
    widget.onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = width / widget.aspectRatio;
        return Center(
          child: SizedBox(
            width: width,
            height: height,
            child: Stack(
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      widget.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: theme.colorScheme.surfaceVariant,
                        child: const Icon(Icons.broken_image),
                      ),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: CustomPaint(
                    painter: _QuadPainter(points: _points),
                  ),
                ),
                Positioned.fill(
                  child: _buildHandles(Size(width, height)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHandles(Size size) {
    return Stack(
      children: List.generate(_points.length, (idx) {
        final pt = _points[idx];
        final left = pt.dx * size.width;
        final top = pt.dy * size.height;
        return Positioned(
          left: left - 12,
          top: top - 12,
          child: GestureDetector(
            onPanUpdate: (details) => _updatePoint(idx, details.delta, size),
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: Colors.blueAccent, width: 2),
                shape: BoxShape.circle,
                boxShadow: const [
                  BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }
}

class _QuadPainter extends CustomPainter {
  final List<Offset> points;

  _QuadPainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    final paintLine = Paint()
      ..color = Colors.lightBlueAccent
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final paintFill = Paint()
      ..color = Colors.blueAccent.withOpacity(0.1)
      ..style = PaintingStyle.fill;

    final path = Path();
    for (var i = 0; i < points.length; i++) {
      final p = Offset(points[i].dx * size.width, points[i].dy * size.height);
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }
    path.close();

    canvas.drawPath(path, paintFill);
    canvas.drawPath(path, paintLine);
  }

  @override
  bool shouldRepaint(covariant _QuadPainter oldDelegate) {
    return oldDelegate.points != points;
  }
}
