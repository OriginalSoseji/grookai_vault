import 'dart:math';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
    final upload = await _client.storage.from('identity-scans').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: false),
        );

    // If conflict, retry once with a different path
    if (upload.error != null) {
      path = _newPath(user.id);
      final retry = await _client.storage.from('identity-scans').uploadBinary(
            path,
            bytes,
            fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true),
          );
      if (retry.error != null) {
        throw Exception('upload_failed:${retry.error!.message}');
      }
    }

    final images = {
      'bucket': 'identity-scans',
      'paths': {'front': path},
      'front': {'path': path},
    };

    final snapshotId = await _client.rpc(
      'condition_snapshots_insert_identity_v1',
      params: {'p_images': images},
    ) as String;

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
      'identity_scan_get_v1',
      method: HttpMethod.get,
      queryParams: {'event_id': eventId},
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

    if (resultRow is Map) {
      status = (resultRow['status'] ?? status).toString();
      error = resultRow['error']?.toString() ?? error;
      candidates = resultRow['candidates'] is List ? List.from(resultRow['candidates'] as List) : candidates;
      signals = resultRow['signals'] is Map ? Map<String, dynamic>.from(resultRow['signals'] as Map) : null;
    }

    return IdentityScanPollResult(
      status: status,
      eventId: eventId,
      snapshotId: snapshotId,
      error: error,
      candidates: candidates,
      signals: signals,
    );
  }
}
