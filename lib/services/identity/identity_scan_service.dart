import 'dart:math';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

String? _cleanString(dynamic value) {
  final text = (value ?? '').toString().trim();
  return text.isEmpty ? null : text;
}

Map<String, dynamic>? _toMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return null;
}

List<Map<String, dynamic>> _toMapList(dynamic value) {
  if (value is! List) {
    return const [];
  }
  return value.map(_toMap).whereType<Map<String, dynamic>>().toList();
}

double? _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value.trim());
  }
  return null;
}

bool _toBool(dynamic value) {
  if (value is bool) {
    return value;
  }
  final normalized = _cleanString(value)?.toLowerCase();
  return normalized == 'true' || normalized == '1' || normalized == 'yes';
}

class IdentityScanCandidate {
  const IdentityScanCandidate({
    required this.raw,
    this.cardPrintId,
    this.name,
    this.setCode,
    this.setName,
    this.number,
    this.imageUrl,
    this.confidence01,
    this.gvId,
  });

  final Map<String, dynamic> raw;
  final String? cardPrintId;
  final String? name;
  final String? setCode;
  final String? setName;
  final String? number;
  final String? imageUrl;
  final double? confidence01;
  final String? gvId;

  factory IdentityScanCandidate.fromJson(Map<String, dynamic> json) {
    final setData = _toMap(json['set']) ?? _toMap(json['sets']);
    return IdentityScanCandidate(
      raw: json,
      cardPrintId:
          _cleanString(json['card_print_id']) ?? _cleanString(json['id']),
      name: _cleanString(json['name']),
      setCode:
          _cleanString(json['set_code']) ??
          _cleanString(setData?['code']) ??
          _cleanString(setData?['set_code']),
      setName:
          _cleanString(json['set_name']) ??
          _cleanString(setData?['name']) ??
          _cleanString(setData?['set_name']),
      number:
          _cleanString(json['number']) ??
          _cleanString(json['collector_number']) ??
          _cleanString(json['number_plain']),
      imageUrl:
          _cleanString(json['image_url']) ??
          _cleanString(json['image_best']) ??
          _cleanString(json['image_alt_url']),
      confidence01:
          _toDouble(json['confidence_0_1']) ??
          _toDouble(json['confidence']) ??
          _toDouble(json['score_0_1']) ??
          _toDouble(json['score']),
      gvId: _cleanString(json['gv_id']),
    );
  }
}

class IdentityScanEngineSignal {
  const IdentityScanEngineSignal({
    required this.raw,
    this.guidanceReason,
    this.likelyName,
    this.likelySetName,
    this.exactResultCardName,
    this.exactResultSetName,
    this.exactResultCollectorNumber,
    this.lockedCandidateName,
    this.scanConfidence01,
    this.confidence01,
    this.hasSuccessfulExactResult = false,
    this.hasInsufficientEvidenceResult = false,
    this.hasPreviewHint = false,
    this.isLocked = false,
  });

  final Map<String, dynamic> raw;
  final String? guidanceReason;
  final String? likelyName;
  final String? likelySetName;
  final String? exactResultCardName;
  final String? exactResultSetName;
  final String? exactResultCollectorNumber;
  final String? lockedCandidateName;
  final double? scanConfidence01;
  final double? confidence01;
  final bool hasSuccessfulExactResult;
  final bool hasInsufficientEvidenceResult;
  final bool hasPreviewHint;
  final bool isLocked;

  factory IdentityScanEngineSignal.fromJson(Map<String, dynamic> raw) {
    final ai = _toMap(raw['ai']);
    final gv = _toMap(raw['grookai_vision']);
    final exact =
        _toMap(raw['exact_result']) ??
        _toMap(raw['exactResult']) ??
        _toMap(raw['resolved_candidate']) ??
        _toMap(raw['resolvedCandidate']);
    final lockedCandidate =
        _toMap(raw['locked_candidate']) ?? _toMap(raw['lockedCandidate']);
    final likelySetName =
        _cleanString(raw['likely_set_name']) ??
        _cleanString(raw['likelySetName']) ??
        _cleanString(exact?['set_name']) ??
        _cleanString(ai?['set_name']) ??
        _cleanString(gv?['set_name']);
    final exactCollectorNumber =
        _cleanString(exact?['number']) ??
        _cleanString(exact?['collector_number']) ??
        _cleanString(ai?['collector_number']) ??
        _cleanString(gv?['number_raw']) ??
        _cleanString(gv?['collector_number']);
    final likelyName =
        _cleanString(raw['likely_name']) ??
        _cleanString(raw['likelyName']) ??
        _cleanString(exact?['name']) ??
        _cleanString(ai?['name']) ??
        _cleanString(gv?['name']);
    final scanConfidence =
        _toDouble(raw['scan_confidence_0_1']) ??
        _toDouble(raw['scanConfidence01']) ??
        _toDouble(ai?['confidence']) ??
        _toDouble(gv?['confidence_0_1']);
    final exactCardName = _cleanString(exact?['name']);
    final exactSetName =
        _cleanString(exact?['set_name']) ?? _cleanString(exact?['set_code']);
    final hasExact =
        _toBool(raw['has_successful_exact_result']) ||
        _toBool(raw['hasSuccessfulExactResult']) ||
        (exactCardName != null &&
            (_cleanString(exact?['card_print_id']) != null ||
                _cleanString(exact?['id']) != null));
    final hasInsufficientEvidence =
        _toBool(raw['has_insufficient_evidence_result']) ||
        _toBool(raw['hasInsufficientEvidenceResult']) ||
        _cleanString(raw['result'])?.toLowerCase() == 'insufficient_evidence' ||
        _cleanString(raw['reason'])?.toLowerCase() == 'insufficient_evidence';
    return IdentityScanEngineSignal(
      raw: raw,
      guidanceReason:
          _cleanString(raw['guidance_reason']) ??
          _cleanString(raw['guidanceReason']) ??
          _cleanString(_toMap(raw['ui'])?['guidance_reason']),
      likelyName: likelyName,
      likelySetName: likelySetName,
      exactResultCardName: exactCardName,
      exactResultSetName: exactSetName,
      exactResultCollectorNumber: exactCollectorNumber,
      lockedCandidateName:
          _cleanString(lockedCandidate?['name']) ?? exactCardName ?? likelyName,
      scanConfidence01: scanConfidence,
      confidence01:
          _toDouble(raw['confidence_0_1']) ??
          _toDouble(raw['confidence01']) ??
          scanConfidence,
      hasSuccessfulExactResult: hasExact,
      hasInsufficientEvidenceResult: hasInsufficientEvidence,
      hasPreviewHint:
          likelyName != null ||
          likelySetName != null ||
          exactCollectorNumber != null,
      isLocked:
          _toBool(raw['locked']) ||
          _toBool(raw['is_locked']) ||
          _toBool(raw['isLocked']) ||
          _toBool(_toMap(raw['ui'])?['locked']),
    );
  }
}

class IdentityScanSignals {
  const IdentityScanSignals({required this.raw, required this.primarySignal});

  final Map<String, dynamic> raw;
  final IdentityScanEngineSignal primarySignal;

  factory IdentityScanSignals.fromJson(Map<String, dynamic> raw) {
    return IdentityScanSignals(
      raw: raw,
      primarySignal: IdentityScanEngineSignal.fromJson(raw),
    );
  }
}

class IdentityScanStartResult {
  IdentityScanStartResult({
    required this.snapshotId,
    required this.eventId,
    required this.frontPath,
  });

  final String snapshotId;
  final String eventId;
  final String frontPath;
}

class IdentityScanPollResult {
  IdentityScanPollResult({
    required this.status,
    required this.eventId,
    required this.snapshotId,
    this.error,
    this.candidates = const <IdentityScanCandidate>[],
    this.signals,
    this.signalsRaw,
  });

  final String status;
  final String eventId;
  final String snapshotId;
  final String? error;
  final List<IdentityScanCandidate> candidates;
  final IdentityScanSignals? signals;
  final Map<String, dynamic>? signalsRaw;

  IdentityScanEngineSignal? get primarySignal => signals?.primarySignal;

  IdentityScanCandidate? get topCandidate =>
      candidates.isEmpty ? null : candidates.first;

  String get normalizedStatus => status.trim().toLowerCase();

  bool get isPending => switch (normalizedStatus) {
    'pending' || 'queued' || 'processing' || 'running' => true,
    _ => false,
  };

  bool get isFailed => switch (normalizedStatus) {
    'failed' || 'error' => true,
    _ => false,
  };

  bool get isReady => !isPending && !isFailed;
}

class IdentityScanService {
  IdentityScanService({SupabaseClient? client})
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  String _newPath(String userId) {
    final rand = Random().nextInt(1 << 32);
    final ms = DateTime.now().millisecondsSinceEpoch;
    return '$userId/identity/$ms-$rand/front.jpg';
  }

  Future<IdentityScanStartResult> startScan({required XFile frontFile}) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('auth_required');

    final bytes = await frontFile.readAsBytes();
    var path = _newPath(user.id);

    // Upload front image to condition-scans bucket
    String uploadedPath;
    try {
      uploadedPath = await _client.storage
          .from('identity-scans')
          .uploadBinary(
            path,
            bytes,
            fileOptions: const FileOptions(
              contentType: 'image/jpeg',
              upsert: false,
            ),
          );
    } on StorageException {
      path = _newPath(user.id);
      try {
        uploadedPath = await _client.storage
            .from('identity-scans')
            .uploadBinary(
              path,
              bytes,
              fileOptions: const FileOptions(
                contentType: 'image/jpeg',
                upsert: true,
              ),
            );
      } on StorageException catch (retryErr) {
        throw Exception('upload_failed:${retryErr.message}');
      }
    } catch (e) {
      path = _newPath(user.id);
      try {
        uploadedPath = await _client.storage
            .from('identity-scans')
            .uploadBinary(
              path,
              bytes,
              fileOptions: const FileOptions(
                contentType: 'image/jpeg',
                upsert: true,
              ),
            );
      } catch (retryErr) {
        throw Exception('upload_failed:$retryErr');
      }
    }
    path = uploadedPath;

    final images = {
      'bucket': 'identity-scans',
      'paths': {'front': path},
      'front': {'path': path},
    };

    final resp = await _client
        .from('identity_snapshots')
        .insert({
          'images': images,
          'scan_quality': {
            'ok': false,
            'pending': true,
            'source': 'identity_scan_v1',
          },
        })
        .select('id')
        .single();

    final snapshotId = resp['id'] as String;

    final enqueueResp = await _client.functions.invoke(
      'identity_scan_enqueue_v1',
      body: {'snapshot_id': snapshotId},
    );

    if (enqueueResp.status < 200 || enqueueResp.status >= 300) {
      throw Exception('enqueue_failed:${enqueueResp.status}');
    }
    final data = enqueueResp.data;
    if (data is! Map) throw Exception('enqueue_bad_shape');
    final eventId = (data['identity_scan_event_id'] ?? '').toString();
    if (eventId.isEmpty) throw Exception('enqueue_missing_event_id');

    return IdentityScanStartResult(
      snapshotId: snapshotId,
      eventId: eventId,
      frontPath: path,
    );
  }

  Future<IdentityScanPollResult> pollOnce(String eventId) async {
    final resp = await _client.functions.invoke(
      'identity_scan_get_v1?event_id=$eventId',
      method: HttpMethod.get,
    );

    Map<String, dynamic>? event;
    if (resp.data is Map && resp.data['event'] is Map) {
      event = Map<String, dynamic>.from(resp.data['event'] as Map);
    }

    String status = event?['status']?.toString() ?? 'pending';
    final snapshotId = event?['snapshot_id']?.toString() ?? '';
    String? error = event?['error']?.toString();
    List<IdentityScanCandidate> candidates = const <IdentityScanCandidate>[];
    Map<String, dynamic>? signalsRaw;

    // Fetch latest result row (append-only) to get real status/candidates
    final resultRow = await _client
        .from('identity_scan_event_results')
        .select('status,error,candidates,signals')
        .eq('identity_scan_event_id', eventId)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (resultRow != null) {
      final rr = Map<String, dynamic>.from(resultRow as Map);
      status = (rr['status'] ?? status).toString();
      error = rr['error']?.toString() ?? error;
      candidates = rr['candidates'] is List
          ? _toMapList(
              rr['candidates'],
            ).map(IdentityScanCandidate.fromJson).toList()
          : candidates;
      signalsRaw = rr['signals'] is Map
          ? Map<String, dynamic>.from(rr['signals'] as Map)
          : null;
    }

    return IdentityScanPollResult(
      status: status,
      eventId: eventId,
      snapshotId: snapshotId,
      error: error,
      candidates: candidates,
      signals: signalsRaw == null
          ? null
          : IdentityScanSignals.fromJson(signalsRaw),
      signalsRaw: signalsRaw,
    );
  }
}
