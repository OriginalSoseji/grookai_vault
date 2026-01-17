import 'dart:io';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/scanner/condition_scan_service.dart';
import 'condition_camera_screen.dart';
import 'quad_adjust_screen.dart';

enum _ScanStatus { idle, uploading, saving, success }
enum _AnalysisState { idle, analyzing, complete, failed, timeout }

class ScanCaptureScreen extends StatefulWidget {
  final String vaultItemId;
  final String? cardName;

  const ScanCaptureScreen({
    super.key,
    required this.vaultItemId,
    this.cardName,
  });

  @override
  State<ScanCaptureScreen> createState() => _ScanCaptureScreenState();
}

class _ScanCaptureScreenState extends State<ScanCaptureScreen> {
  final _picker = ImagePicker();
  final _service = ConditionScanService();

  XFile? _front;
  XFile? _back;
  _ScanStatus _status = _ScanStatus.idle;
  String? _error;
  String? _snapshotId;
  String? _activeSnapshotId;
  bool _submitting = false;
  bool _confirmCorrectCard = false;
  _AnalysisState _analysisState = _AnalysisState.idle;
  Map<String, dynamic>? _analysisRow;
  bool _pollingCancelled = false;
  bool _rerunRequested = false;
  bool _historyLoading = false;
  List<Map<String, dynamic>> _history = [];
  bool _showAdjustCorners = false;

  @override
  void initState() {
    super.initState();
    unawaited(_loadHistory());
  }

  Future<void> _captureWithCamera(String slot) async {
    final title = slot == 'front' ? 'Capture Front' : 'Capture Back';
    final result = await Navigator.of(context).push<XFile?>(
      MaterialPageRoute(
        builder: (_) => ConditionCameraScreen(
          title: title,
          hintText: 'Align card inside frame',
        ),
      ),
    );
    if (result == null) return;
    setState(() {
      if (slot == 'front') {
        _front = result;
      } else {
        _back = result;
      }
      _confirmCorrectCard = false;
    });
  }

  Future<void> _pickFromGallery(String slot) async {
    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
    );
    if (picked == null) return;
    setState(() {
      if (slot == 'front') {
        _front = picked;
      } else {
        _back = picked;
      }
      _confirmCorrectCard = false;
    });
  }

  Future<void> _startUpload() async {
    if (_front == null || _back == null) {
      _snack('Capture both front and back first.');
      return;
    }

    setState(() {
      _status = _ScanStatus.uploading;
      _error = null;
      _submitting = true;
    });

    try {
      final plan = await _service.getUploadPlan(
        vaultItemId: widget.vaultItemId,
      );

      final frontUpload = plan.uploads['front'];
      final backUpload = plan.uploads['back'];

      if (frontUpload == null || backUpload == null) {
        throw Exception('Upload plan missing front/back uploads');
      }

      await _service.uploadToSignedUrl(
        signedUrl: frontUpload.signedUrl,
        file: File(_front!.path),
        contentType: plan.contentType,
      );
      await _service.uploadToSignedUrl(
        signedUrl: backUpload.signedUrl,
        file: File(_back!.path),
        contentType: plan.contentType,
      );

      setState(() => _status = _ScanStatus.saving);

      final imagesJson = _service.buildImagesPayload(plan);
      final id = await _service.finalizeSnapshot(
        vaultItemId: widget.vaultItemId,
        imagesJson: imagesJson,
      );

      setState(() {
        _snapshotId = id;
        _activeSnapshotId = id;
        _status = _ScanStatus.success;
        _analysisState = _AnalysisState.analyzing;
      });

      _snack('Scan saved. Analysis will start shortly.');
      unawaited(_pollForAnalysis(id));
      unawaited(_loadHistory());
    } catch (e) {
      setState(() {
        _error = e.toString();
        _status = _ScanStatus.idle;
      });
      _snack('Scan failed: $e');
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg)),
    );
  }

  Future<void> _pollForAnalysis(String snapshotId) async {
    _pollingCancelled = false;
    _analysisRow = null;
    const maxAttempts = 30;
    for (var attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!mounted || _pollingCancelled) return;

      try {
        final jobStatus = await _service.fetchLatestJobStatus(snapshotId);
        if (jobStatus == 'failed') {
          if (!mounted) return;
          setState(() => _analysisState = _AnalysisState.failed);
          return;
        }
      } catch (_) {
        // swallow fetch errors and continue polling
      }

      try {
        final row = await _service.fetchLatestAnalysis(snapshotId);
        if (row != null) {
          final analysisVersion = (row['analysis_version'] ?? '').toString();
          final scanQuality = row['scan_quality'];
          final analysisStatus = scanQuality is Map
              ? (scanQuality['analysis_status'] ?? '').toString()
              : '';
          final okFlag = scanQuality is Map ? (scanQuality['ok'] == true) : false;

          if (analysisVersion == 'v2_centering' &&
              (analysisStatus == 'ok' || okFlag)) {
            if (!mounted) return;
            setState(() {
              _analysisRow = row.cast<String, dynamic>();
              _analysisState = _AnalysisState.complete;
              _rerunRequested = false;
            });
            return;
          }
          if (analysisVersion == 'v2_centering' && analysisStatus == 'failed') {
            if (!mounted) return;
            setState(() {
              _analysisRow = row.cast<String, dynamic>();
              _analysisState = _AnalysisState.failed;
            });
            return;
          }
        }
      } catch (_) {
        // swallow fetch errors and continue polling
      }

      await Future.delayed(const Duration(seconds: 1));
    }

    if (!mounted || _pollingCancelled) return;
    setState(() => _analysisState = _AnalysisState.timeout);
  }

  Future<void> _loadHistory() async {
    setState(() => _historyLoading = true);
    try {
      final rows = await _service.fetchSnapshotsForVaultItem(widget.vaultItemId);
      if (mounted) {
        setState(() {
          _history = rows;
        });
      }
    } catch (_) {
      // ignore fetch errors
    } finally {
      if (mounted) {
        setState(() => _historyLoading = false);
      }
    }
  }

  Future<void> _setActiveSnapshot(String snapshotId) async {
    if (kDebugMode) {
      debugPrint('[DEBUG] setActiveSnapshot: $snapshotId');
    }
    setState(() {
      _activeSnapshotId = snapshotId;
      _snapshotId = snapshotId;
      _analysisState = _AnalysisState.analyzing;
      _analysisRow = null;
    });
    await _pollForAnalysis(snapshotId);
  }

  @override
  void dispose() {
    _pollingCancelled = true;
    super.dispose();
  }

  Widget _buildTile({
    required String label,
    required XFile? file,
    required VoidCallback onCapture,
    required VoidCallback onUpload,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: Theme.of(context).colorScheme.surfaceVariant,
              ),
              child: file == null
                  ? const Icon(Icons.photo_camera, size: 32)
                  : ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(
                        File(file.path),
                        fit: BoxFit.cover,
                      ),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    file == null ? 'Required' : 'Captured',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.7),
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            FilledButton.tonal(
              onPressed: _submitting ? null : onCapture,
              child: Text(file == null ? 'Capture' : 'Retake'),
            ),
            const SizedBox(width: 8),
            TextButton(
              onPressed: _submitting ? null : onUpload,
              child: const Text('Upload'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = widget.cardName?.isNotEmpty == true
        ? 'Scan ${widget.cardName}'
        : 'Scan Condition';

    final statusLabel = switch (_status) {
      _ScanStatus.idle => 'Ready to upload',
      _ScanStatus.uploading => 'Uploading images...',
      _ScanStatus.saving => 'Saving snapshot...',
      _ScanStatus.success => switch (_analysisState) {
          _AnalysisState.analyzing => 'Analyzing...',
          _AnalysisState.complete => 'Analysis complete',
          _AnalysisState.failed => 'Analysis failed',
          _AnalysisState.timeout => 'Still analyzing...',
          _ => 'Analyzing...',
        },
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.cardName != null && widget.cardName!.isNotEmpty)
                  Text(
                    'Scanning: ${widget.cardName}',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                Text(
                  'Vault Item: ${widget.vaultItemId}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Capture front and back. We\'ll upload and queue analysis.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
              _buildTile(
                label: 'Front photo',
                file: _front,
                onCapture: () => _captureWithCamera('front'),
                onUpload: () => _pickFromGallery('front'),
              ),
              _buildTile(
                label: 'Back photo',
                file: _back,
                onCapture: () => _captureWithCamera('back'),
                onUpload: () => _pickFromGallery('back'),
              ),
                const SizedBox(height: 12),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      _error!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.error,
                      ),
                    ),
                  ),
                Row(
                  children: [
                    if (_status == _ScanStatus.uploading ||
                        _status == _ScanStatus.saving)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    if (_status == _ScanStatus.uploading ||
                        _status == _ScanStatus.saving)
                      const SizedBox(width: 8),
                    Text(
                      statusLabel,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _confirmCorrectCard,
                  onChanged: _submitting || _status == _ScanStatus.uploading || _status == _ScanStatus.saving
                      ? null
                      : (v) => setState(() => _confirmCorrectCard = v ?? false),
                  title: const Text('I confirm I am scanning the card shown above.'),
                  controlAffinity: ListTileControlAffinity.leading,
                ),
                FilledButton(
                  onPressed: _submitting
                      ? null
                      : _status == _ScanStatus.success
                          ? () => Navigator.of(context).pop()
                          : (_front != null &&
                                  _back != null &&
                                  _confirmCorrectCard &&
                                  _status == _ScanStatus.idle
                              ? _startUpload
                              : null),
                  child: Text(
                    _status == _ScanStatus.success ? 'Done' : 'Upload & Save',
                  ),
                ),
                const SizedBox(height: 8),
                if (_snapshotId != null)
                  Text(
                    'Snapshot saved: $_snapshotId',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                const SizedBox(height: 8),
                if (_analysisState == _AnalysisState.complete &&
                    _analysisRow != null)
                  _buildAnalysisSummary(theme),
                if (_analysisState == _AnalysisState.failed && _analysisRow != null)
                  _buildFailureActions(theme),
                if (_analysisState == _AnalysisState.failed)
                  FilledButton.tonal(
                    onPressed: _snapshotId == null
                        ? null
                        : () {
                            setState(() => _analysisState = _AnalysisState.analyzing);
                            unawaited(_pollForAnalysis(_snapshotId!));
                          },
                    child: const Text('Retry analysis'),
                  ),
                if (_analysisState == _AnalysisState.timeout)
                  FilledButton.tonal(
                    onPressed: _snapshotId == null
                        ? null
                        : () {
                            setState(() => _analysisState = _AnalysisState.analyzing);
                            unawaited(_pollForAnalysis(_snapshotId!));
                          },
                    child: const Text('Refresh'),
                  ),
                const SizedBox(height: 12),
                _buildHistorySection(theme),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAnalysisSummary(ThemeData theme) {
    final measurements = _analysisRow?['measurements'];
    Map? centering;
    if (measurements is Map) {
      centering = measurements['centering'] as Map?;
    }

    String fmt(num? v) => v == null ? '—' : v.toStringAsFixed(3);
    final scanQuality = _analysisRow?['scan_quality'] as Map?;
    final failureReason =
        scanQuality != null ? (scanQuality['failure_reason'] ?? '') : '';
    final analysisStatus =
        scanQuality != null ? (scanQuality['analysis_status'] ?? '') : '';
    final centeringV3 = _analysisRow?['measurements'] is Map
        ? (_analysisRow!['measurements']['centering_v3'] as Map?)
        : null;
    final overallValid =
        centeringV3 is Map ? (centeringV3['overall']?['is_valid'] == true) : null;
    final confidence = (_analysisRow?['confidence'] as num?)?.toDouble();
    _showAdjustCorners = (analysisStatus == 'failed') || (overallValid == false);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Centering',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text('Front LR: ${fmt(_numOrNull(centering?['front_lr_ratio']))}'),
            Text('Front TB: ${fmt(_numOrNull(centering?['front_tb_ratio']))}'),
            Text('Back LR: ${fmt(_numOrNull(centering?['back_lr_ratio']))}'),
            Text('Back TB: ${fmt(_numOrNull(centering?['back_tb_ratio']))}'),
            if (overallValid != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    Icon(
                      overallValid ? Icons.check_circle : Icons.error_outline,
                      size: 18,
                      color: overallValid
                          ? theme.colorScheme.primary
                          : theme.colorScheme.error,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      overallValid ? 'Centering valid' : 'Centering invalid',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            if (analysisStatus.isNotEmpty)
              Text('Status: $analysisStatus'),
            if ((failureReason as String).isNotEmpty)
              Text(
                'Failure: $failureReason',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.error),
              ),
            if (confidence != null)
              Text('Confidence: ${(confidence * 100).toStringAsFixed(1)}%'),
          ],
        ),
      ),
    );
  }

  Widget _buildFailureActions(ThemeData theme) {
    final scanQuality = _analysisRow?['scan_quality'] as Map?;
    final failureReason =
        scanQuality != null ? (scanQuality['failure_reason'] ?? '') : '';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Analysis failed',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.error,
              ),
            ),
            if ((failureReason as String).isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text('Reason: $failureReason'),
              ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _snapshotId == null ? null : _openAdjustCorners,
              icon: const Icon(Icons.crop),
              label: Text(_rerunRequested ? 'Re-running…' : 'Adjust corners'),
            ),
            if (_showAdjustCorners)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: FilledButton.icon(
                  onPressed: _snapshotId == null ? null : _openAdjustCorners,
                  icon: const Icon(Icons.crop),
                  label: Text(_rerunRequested ? 'Re-running…' : 'Adjust corners'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openAdjustCorners() async {
    if (_snapshotId == null) return;
    if (kDebugMode) {
      debugPrint('[DEBUG] openQuadAdjust: snapshot=$_snapshotId');
    }
    final rerun = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => QuadAdjustScreen(
          snapshotId: _snapshotId!,
          initialAnalysis: _analysisRow,
        ),
      ),
    );
    if (rerun == true && mounted) {
      setState(() {
        _analysisState = _AnalysisState.analyzing;
        _rerunRequested = true;
      });
      if (kDebugMode) {
        debugPrint('[DEBUG] quadAdjustReturn: snapshot=$_snapshotId ok=true');
      }
      unawaited(_pollForAnalysis(_snapshotId!));
      unawaited(_loadHistory());
    } else {
      if (kDebugMode) {
        debugPrint('[DEBUG] quadAdjustReturn: snapshot=$_snapshotId ok=false');
      }
    }
  }

  Widget _buildHistorySection(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Scan History',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            if (_historyLoading)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            else if (_history.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'No scans yet.',
                  style: theme.textTheme.bodySmall,
                ),
              )
            else
              Column(
                children: _history.take(10).map((row) {
                  final id = row['snapshot_id']?.toString() ?? '';
                  final createdAt = row['created_at']?.toString() ?? '';
                  final analysisStatus = row['analysis_status']?.toString() ?? '';
                  final failureReason = row['failure_reason']?.toString() ?? '';
                  final confidence = (row['confidence'] as num?)?.toDouble();
                  final statusLabel = (analysisStatus == 'ok' || row['analysis_ok'] == true)
                      ? 'OK'
                      : (analysisStatus == 'failed' ? 'FAILED' : (analysisStatus.isEmpty ? 'PENDING' : analysisStatus.toUpperCase()));
                  final statusColor = statusLabel == 'OK'
                      ? theme.colorScheme.primary
                      : statusLabel == 'FAILED'
                          ? theme.colorScheme.error
                          : theme.colorScheme.outline;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      createdAt.isEmpty ? id : createdAt,
                      style: theme.textTheme.bodyMedium,
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                statusLabel,
                                style: theme.textTheme.labelSmall?.copyWith(color: statusColor),
                              ),
                            ),
                            if (confidence != null) ...[
                              const SizedBox(width: 8),
                              Text(
                                'Conf: ${(confidence * 100).toStringAsFixed(0)}%',
                                style: theme.textTheme.labelSmall,
                              ),
                            ],
                          ],
                        ),
                        if (failureReason.isNotEmpty)
                          Text(
                            'Failure: $failureReason',
                            style: theme.textTheme.labelSmall
                                ?.copyWith(color: theme.colorScheme.error),
                          ),
                        if (id.isNotEmpty)
                          Text(
                            'ID: $id',
                            style: theme.textTheme.labelSmall
                                ?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.6)),
                          ),
                      ],
                    ),
                    onTap: id.isEmpty
                        ? null
                        : () {
                            unawaited(_setActiveSnapshot(id));
                          },
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  num? _numOrNull(dynamic v) {
    if (v is num) return v;
    if (v is String) {
      return num.tryParse(v);
    }
    return null;
  }
}
