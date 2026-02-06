import 'dart:io';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:crypto/crypto.dart';

class SignedUpload {
  final String path;
  final String signedUrl;

  SignedUpload({required this.path, required this.signedUrl});
}

class UploadPlan {
  final String snapshotId;
  final String bucket;
  final Map<String, SignedUpload> uploads;
  final String contentType;
  final String method;

  UploadPlan({
    required this.snapshotId,
    required this.bucket,
    required this.uploads,
    required this.contentType,
    required this.method,
  });
}

class ConditionScanService {
  ConditionScanService({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  Future<UploadPlan> getUploadPlan({required String vaultItemId}) async {
    try {
      final response = await _client.functions.invoke(
        'scan-upload-plan',
        body: {
          'vault_item_id': vaultItemId,
          'slots': ['front', 'back'],
        },
      );

      if (response.status < 200 || response.status >= 300) {
        throw Exception(
          'scan-upload-plan failed: status=${response.status}, data=${response.data}',
        );
      }

      final data = response.data;
      if (data is! Map) {
        throw Exception(
          'scan-upload-plan bad response shape: status=${response.status}, data=${response.data}',
        );
      }

      final snapshotId = (data['snapshot_id'] ?? '').toString();
      final bucket = (data['bucket'] ?? '').toString();
      final notes = (data['notes'] as Map?) ?? const {};
      final uploadsRaw = (data['uploads'] as Map?) ?? const {};

      if (snapshotId.isEmpty || bucket.isEmpty || uploadsRaw.isEmpty) {
        throw Exception('scan-upload-plan missing required fields');
      }

      final uploads = <String, SignedUpload>{};
      for (final entry in uploadsRaw.entries) {
        final slot = entry.key.toString();
        final val = entry.value as Map?;
        final path = val?['path']?.toString() ?? '';
        final signedUrl = val?['signed_url']?.toString() ?? '';
        if (path.isEmpty || signedUrl.isEmpty) continue;
        uploads[slot] = SignedUpload(path: path, signedUrl: signedUrl);
      }

      final contentType =
          (notes['content_type'] ?? 'image/jpeg').toString().trim();
      final method = (notes['method'] ?? 'PUT').toString().toUpperCase();

      return UploadPlan(
        snapshotId: snapshotId,
        bucket: bucket,
        uploads: uploads,
        contentType: contentType.isNotEmpty ? contentType : 'image/jpeg',
        method: method.isNotEmpty ? method : 'PUT',
      );
    } on FunctionException catch (e) {
      throw Exception(
        'scan-upload-plan failed: status=${e.status}, details=${e.details}, reason=${e.reasonPhrase}',
      );
    }
  }

  Future<void> uploadToSignedUrl({
    required String signedUrl,
    required File file,
    String contentType = 'image/jpeg',
  }) async {
    final bytes = await file.readAsBytes();
    final res = await http.put(
      Uri.parse(signedUrl),
      headers: {HttpHeaders.contentTypeHeader: contentType},
      body: bytes,
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Upload failed (${res.statusCode}): ${res.body.isNotEmpty ? res.body : 'no body'}',
      );
    }
  }

  Map<String, dynamic> buildImagesPayload(UploadPlan plan) {
    final frontPath = plan.uploads['front']?.path;
    final backPath = plan.uploads['back']?.path;

    if (frontPath == null || backPath == null) {
      throw Exception('Upload plan missing front/back paths');
    }

    final corners = <String, dynamic>{
      'corner_tl': null,
      'corner_tr': null,
      'corner_bl': null,
      'corner_br': null,
    };

    return {
      'bucket': plan.bucket,
      'paths': {
        'front': frontPath,
        'back': backPath,
        'corners': corners,
      },
      'front': {'path': frontPath},
      'back': {'path': backPath},
      'corners': corners,
    };
  }

  Future<String> finalizeSnapshot({
    required String vaultItemId,
    required Map<String, dynamic> imagesJson,
  }) async {
    final response = await _client.rpc(
      'condition_snapshots_insert_v1',
      params: {
        'p_vault_item_id': vaultItemId,
        'p_images': imagesJson,
      },
    );

    final id = response.toString();
    if (id == null || id.isEmpty) {
      throw Exception('Snapshot finalize returned empty id');
    }

    if (kDebugMode) {
      debugPrint(
        '[scanner] condition_snapshots_insert_v1 ok: id=$id vault_item_id=$vaultItemId',
      );
    }

    return id;
  }

  Future<Map<String, dynamic>?> fetchLatestAnalysis(String snapshotId) async {
    Map<String, dynamic>? data;
    // Preferred: v2_centering
    try {
      final preferred = await _client
          .from('condition_snapshot_analyses')
          .select(
              'snapshot_id, created_at, analysis_version, analysis_key, scan_quality, confidence, measurements, defects')
          .eq('snapshot_id', snapshotId)
          .eq('analysis_version', 'v2_centering')
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();
      if (preferred != null) {
        data = preferred is Map<String, dynamic>
            ? preferred
            : Map<String, dynamic>.from(preferred as Map);
      }
    } catch (_) {
      // ignore and fallback
    }

    // Fallback: latest excluding v_user_quad_v1
    if (data == null) {
      try {
        final fallback = await _client
            .from('condition_snapshot_analyses')
            .select(
                'snapshot_id, created_at, analysis_version, analysis_key, scan_quality, confidence, measurements, defects')
            .eq('snapshot_id', snapshotId)
            .neq('analysis_version', 'v_user_quad_v1')
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle();
        if (fallback != null) {
          data = fallback is Map<String, dynamic>
              ? fallback
              : Map<String, dynamic>.from(fallback as Map);
        }
      } catch (_) {
        // ignore
      }
    }

    if (kDebugMode) {
      debugPrint(
          '[DEBUG] preferredAnalysis snapshot=$snapshotId version=${data?['analysis_version']} conf=${data?['confidence']}');
    }

    return data;
  }

  Future<List<Map<String, dynamic>>> fetchSnapshotsForVaultItem(
      String vaultItemId) async {
    final rows = await _client
        .from('condition_snapshots')
        .select('id, created_at')
        .eq('vault_item_id', vaultItemId)
        .order('created_at', ascending: false)
        .limit(20);

    if (rows is! List) return const [];

    final List<Map<String, dynamic>> out = [];
    for (final raw in rows) {
      if (raw is! Map) continue;
      final snapId = (raw['id'] ?? '').toString();
      if (snapId.isEmpty) continue;
      Map<String, dynamic>? latest;
      try {
        latest = await fetchLatestAnalysis(snapId);
      } catch (_) {
        latest = null;
      }
      final scanQuality = latest?['scan_quality'] as Map?;
      final analysisStatus =
          scanQuality is Map ? (scanQuality['analysis_status'] ?? '') : '';
      final okFlag = scanQuality is Map ? (scanQuality['ok'] == true) : false;
      final failureReason =
          scanQuality is Map ? (scanQuality['failure_reason'] ?? '') : '';
      final confidence = (latest?['confidence'] as num?)?.toDouble();
      out.add({
        'snapshot_id': snapId,
        'created_at': raw['created_at']?.toString(),
        'analysis_status': analysisStatus,
        'analysis_ok': okFlag,
        'failure_reason': failureReason,
        'confidence': confidence,
        'analysis_version': latest?['analysis_version']?.toString(),
      });
    }
    return out;
  }

  Future<Map<String, dynamic>?> fetchSnapshot(String snapshotId) async {
    final data = await _client
        .from('condition_snapshots')
        .select('id, images, scan_quality, measurements, created_at')
        .eq('id', snapshotId)
        .maybeSingle();

    if (data == null) return null;
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw Exception('snapshot fetch bad shape: ${data.runtimeType}');
  }

  Future<Map<String, dynamic>?> fetchMatchCardForSnapshot(
      String snapshotId) async {
    final row = await _client
        .from('v_condition_snapshot_analyses_match_card_v1')
        .select(
            'analysis_snapshot_id, analysis_key, analysis_version, decision, best_candidate_card_print_id, best_candidate_name, best_candidate_set_code, best_candidate_number, best_candidate_image_best')
        .eq('analysis_snapshot_id', snapshotId)
        .order('analysis_created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (row == null) return null;
    if (row is Map<String, dynamic>) return row;
    if (row is Map) return Map<String, dynamic>.from(row);
    throw Exception('match card fetch bad shape: ${row.runtimeType}');
  }

  Future<void> saveQuadOverride({
    required String snapshotId,
    required Map<String, List<List<double>>> quads,
  }) async {
    final snap = await fetchSnapshot(snapshotId);
    if (snap == null) {
      throw Exception('Snapshot not found');
    }

    final images = Map<String, dynamic>.from(snap['images'] ?? {});
    final aiOverrides = Map<String, dynamic>.from(images['ai_overrides'] ?? {});
    final quadV1 = Map<String, dynamic>.from(aiOverrides['quad_v1'] ?? {});
    final nowIso = DateTime.now().toIso8601String();

    void applyFace(String face) {
      final pts = quads[face];
      if (pts == null) return;
      quadV1[face] = {
        'points_norm': pts,
        'source': 'user',
        'updated_at': nowIso,
      };
    }

    applyFace('front');
    applyFace('back');

    aiOverrides['quad_v1'] = quadV1;
    images['ai_overrides'] = aiOverrides;

    await _client
        .from('condition_snapshots')
        .update({'images': images}).eq('id', snapshotId);
  }

  Future<String> insertUserQuadAnalysis({
    required String snapshotId,
    required Map<String, List<List<double>>> quads,
  }) async {
    final updatedAt = DateTime.now().toIso8601String();
    final measurements = {
      'version': 1,
      'user_quad_v1': {
        'front': quads['front'] != null
            ? {
                'points_norm': quads['front'],
                'source': 'user',
                'updated_at': updatedAt,
              }
            : null,
        'back': quads['back'] != null
            ? {
                'points_norm': quads['back'],
                'source': 'user',
                'updated_at': updatedAt,
              }
            : null,
      },
    };

    final scanQuality = {
      'ok': true,
      'analysis_status': 'ok',
      'notes': ['user-quad'],
    };
    final analysisVersion = 'v_user_quad_v1';
    final keyMaterial = jsonEncode({
      'snapshot_id': snapshotId,
      'version': analysisVersion,
      'updated_at': updatedAt,
      'points': quads,
    });
    final analysisKey = sha256.convert(utf8.encode(keyMaterial)).toString();

    try {
      await _client.rpc(
        'admin_condition_assist_insert_analysis_v1',
        params: {
          'p_snapshot_id': snapshotId,
          'p_analysis_version': analysisVersion,
          'p_analysis_key': analysisKey,
          'p_scan_quality': scanQuality,
          'p_measurements': measurements,
          'p_defects': <String, dynamic>{},
          'p_confidence': 1.0,
        },
      );
    } on FunctionException catch (e) {
      debugPrint('[DEBUG] insert v_user_quad_v1 failed: $e');
      rethrow;
    }

    if (kDebugMode) {
      debugPrint(
        '[DEBUG] inserted v_user_quad_v1 for snapshot=$snapshotId analysis_key=$analysisKey',
      );
    }
    return analysisKey;
  }

  Future<bool> enqueueConditionAnalysis(String snapshotId) async {
    try {
      await _client.from('ingestion_jobs').insert({
        'job_type': 'condition_analysis_v1',
        'status': 'pending',
        'payload': {'snapshot_id': snapshotId},
      });
      if (kDebugMode) {
        debugPrint('[DEBUG] enqueue centering rerun ok=true err=null');
      }
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[DEBUG] enqueue centering rerun ok=false err=$e');
      }
      return false;
    }
  }

  Future<String?> fetchLatestJobStatus(String snapshotId) async {
    final data = await _client
        .from('ingestion_jobs')
        .select('status')
        .eq('job_type', 'condition_analysis_v1')
        .filter('payload->>snapshot_id', 'eq', snapshotId)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (data == null) return null;
    if (data is Map && data['status'] != null) return data['status'].toString();
    return null;
  }
}
