import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void _identityScanTimingLog(String stage, Map<String, Object?> fields) {
  if (!kDebugMode) {
    return;
  }
  final details = fields.entries
      .map((entry) => '${entry.key}=${entry.value}')
      .join(' ');
  debugPrint('[identity_scan_timing] $stage $details');
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
    this.candidates = const [],
    this.signals,
  });

  final String status;
  final String eventId;
  final String snapshotId;
  final String? error;
  final List<dynamic> candidates;
  final Map<String, dynamic>? signals;

  bool get isFailed {
    final normalized = status.trim().toLowerCase();
    return normalized == 'failed' ||
        normalized == 'error' ||
        normalized == 'cancelled';
  }

  bool get isReady {
    final normalized = status.trim().toLowerCase();
    return normalized == 'ready' ||
        normalized == 'completed' ||
        normalized == 'complete' ||
        normalized == 'succeeded' ||
        normalized == 'success';
  }

  bool get isPending {
    final normalized = status.trim().toLowerCase();
    return !isFailed && !isReady && normalized != 'idle';
  }

  IdentityScanSignal? get primarySignal {
    final rawSignal =
        signals?['primary_signal'] ?? signals?['primarySignal'] ?? signals;
    if (rawSignal is Map) {
      return IdentityScanSignal(Map<String, dynamic>.from(rawSignal));
    }
    return null;
  }
}

class IdentityScanCandidate {
  const IdentityScanCandidate({
    this.name,
    this.setName,
    this.setCode,
    this.number,
    this.variantKey,
    this.printedIdentityModifier,
  });

  factory IdentityScanCandidate.fromJson(Map<String, dynamic> json) {
    String? clean(String key) {
      final value = json[key]?.toString().trim();
      return value == null || value.isEmpty ? null : value;
    }

    return IdentityScanCandidate(
      name: clean('name') ?? clean('card_name'),
      setName: clean('set_name'),
      setCode: clean('set_code'),
      number: clean('number') ?? clean('collector_number'),
      variantKey: clean('variant_key'),
      printedIdentityModifier: clean('printed_identity_modifier'),
    );
  }

  final String? name;
  final String? setName;
  final String? setCode;
  final String? number;
  final String? variantKey;
  final String? printedIdentityModifier;
}

class IdentityScanSignal {
  const IdentityScanSignal(this._json);

  final Map<String, dynamic> _json;

  String? get guidanceReason =>
      _clean('guidance_reason') ?? _clean('guidanceReason');
  String? get likelyName =>
      _clean('likely_name') ?? _clean('likelyName') ?? _clean('name');
  String? get likelySetName =>
      _clean('likely_set_name') ??
      _clean('likelySetName') ??
      _clean('set_name');
  String? get exactResultCollectorNumber =>
      _clean('exact_result_collector_number') ??
      _clean('exactResultCollectorNumber') ??
      _clean('collector_number');
  String? get exactResultCardName =>
      _clean('exact_result_card_name') ?? _clean('exactResultCardName');
  String? get exactResultSetName =>
      _clean('exact_result_set_name') ?? _clean('exactResultSetName');
  String? get lockedCandidateName =>
      _clean('locked_candidate_name') ?? _clean('lockedCandidateName');

  bool get hasSuccessfulExactResult =>
      _truthy('has_successful_exact_result') ||
      _truthy('hasSuccessfulExactResult') ||
      _clean('result_kind') == 'exact';

  bool get hasInsufficientEvidenceResult =>
      _truthy('has_insufficient_evidence_result') ||
      _truthy('hasInsufficientEvidenceResult') ||
      _clean('result_kind') == 'insufficient_evidence';

  bool get isLocked => _truthy('is_locked') || _truthy('isLocked');
  bool get hasPreviewHint =>
      _truthy('has_preview_hint') ||
      _truthy('hasPreviewHint') ||
      likelyName != null;

  double? get scanConfidence01 =>
      _number('scan_confidence_01') ?? _number('scanConfidence01');
  double? get confidence01 =>
      _number('confidence_01') ??
      _number('confidence01') ??
      _number('confidence');

  String? _clean(String key) {
    final value = _json[key]?.toString().trim();
    return value == null || value.isEmpty ? null : value;
  }

  bool _truthy(String key) {
    final value = _json[key];
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) {
      final normalized = value.trim().toLowerCase();
      return normalized == 'true' || normalized == '1' || normalized == 'yes';
    }
    return false;
  }

  double? _number(String key) {
    final value = _json[key];
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }
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
    final totalWatch = Stopwatch()..start();
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('auth_required');

    final readWatch = Stopwatch()..start();
    final bytes = await frontFile.readAsBytes();
    readWatch.stop();
    _identityScanTimingLog('file_read_done', {
      'elapsed_ms': readWatch.elapsedMilliseconds,
      'bytes': bytes.length,
    });
    var path = _newPath(user.id);

    // Upload front image to condition-scans bucket
    String uploadedPath;
    final uploadWatch = Stopwatch()..start();
    _identityScanTimingLog('upload_start', {'bytes': bytes.length});
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
    uploadWatch.stop();
    _identityScanTimingLog('upload_done', {
      'elapsed_ms': uploadWatch.elapsedMilliseconds,
      'total_ms': totalWatch.elapsedMilliseconds,
    });
    path = uploadedPath;

    final images = {
      'bucket': 'identity-scans',
      'paths': {'front': path},
      'front': {'path': path},
    };

    final snapshotWatch = Stopwatch()..start();
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
    snapshotWatch.stop();
    _identityScanTimingLog('snapshot_created', {
      'elapsed_ms': snapshotWatch.elapsedMilliseconds,
      'total_ms': totalWatch.elapsedMilliseconds,
    });

    final enqueueWatch = Stopwatch()..start();
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
    enqueueWatch.stop();
    totalWatch.stop();
    _identityScanTimingLog('event_created', {
      'elapsed_ms': enqueueWatch.elapsedMilliseconds,
      'total_ms': totalWatch.elapsedMilliseconds,
      'status': enqueueResp.status,
    });

    return IdentityScanStartResult(
      snapshotId: snapshotId,
      eventId: eventId,
      frontPath: path,
    );
  }

  Future<IdentityScanPollResult> pollOnce(String eventId) async {
    final pollWatch = Stopwatch()..start();
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
    List<dynamic> candidates = const [];
    Map<String, dynamic>? signals;

    // Fetch latest result row (append-only) to get real status/candidates
    final resultRow = await _client
        .from('identity_scan_event_results')
        .select('status,error,candidates,signals')
        .eq('identity_scan_event_id', eventId)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (resultRow != null) {
      final rr = Map<String, dynamic>.from(resultRow);
      status = (rr['status'] ?? status).toString();
      error = rr['error']?.toString() ?? error;
      candidates = rr['candidates'] is List
          ? List.from(rr['candidates'] as List)
          : candidates;
      signals = rr['signals'] is Map
          ? Map<String, dynamic>.from(rr['signals'] as Map)
          : null;
    }
    pollWatch.stop();
    _identityScanTimingLog('poll_response', {
      'elapsed_ms': pollWatch.elapsedMilliseconds,
      'status': status,
      'candidates': candidates.length,
      'has_result_row': resultRow != null,
    });

    return IdentityScanPollResult(
      status: status,
      eventId: eventId,
      snapshotId: snapshotId,
      error: error,
      candidates: candidates,
      signals: signals,
    );
  }

  Future<List<dynamic>> hydrateCandidateDisplayIdentity(
    List<dynamic> candidates,
  ) async {
    final ids = candidates
        .whereType<Map>()
        .map(
          (candidate) => (candidate['card_print_id'] ?? '').toString().trim(),
        )
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (ids.isEmpty) {
      return candidates;
    }

    try {
      final rows = await _client
          .from('card_prints')
          .select('id,name,variant_key,printed_identity_modifier')
          .inFilter('id', ids);
      final identityById = <String, Map<String, dynamic>>{
        for (final row in rows.whereType<Map>())
          if ((row['id'] ?? '').toString().trim().isNotEmpty)
            (row['id'] ?? '').toString().trim(): Map<String, dynamic>.from(row),
      };
      return candidates
          .map((candidate) {
            if (candidate is! Map) {
              return candidate;
            }
            final merged = Map<String, dynamic>.from(candidate);
            final id = (merged['card_print_id'] ?? '').toString().trim();
            final identity = identityById[id];
            if (identity == null) {
              return merged;
            }
            merged['name'] = identity['name'] ?? merged['name'];
            merged['variant_key'] = identity['variant_key'];
            merged['printed_identity_modifier'] =
                identity['printed_identity_modifier'];
            return merged;
          })
          .toList(growable: false);
    } catch (error) {
      if (kDebugMode) {
        debugPrint(
          '[identity_scan] candidate identity hydration skipped: $error',
        );
      }
      return candidates;
    }
  }
}
