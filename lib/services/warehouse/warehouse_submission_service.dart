import 'dart:io';
import 'dart:math';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum WarehouseSubmissionIntentType { missingCard, missingImage }

enum WarehouseEvidenceImageType { front, back }

class WarehouseSubmissionValidationErrors {
  const WarehouseSubmissionValidationErrors({
    this.submissionIntent,
    this.notes,
    this.tcgplayerId,
    this.frontImage,
    this.backImage,
  });

  final String? submissionIntent;
  final String? notes;
  final String? tcgplayerId;
  final String? frontImage;
  final String? backImage;

  bool get hasErrors =>
      submissionIntent != null ||
      notes != null ||
      tcgplayerId != null ||
      frontImage != null ||
      backImage != null;
}

class WarehouseSubmissionResult {
  const WarehouseSubmissionResult({required this.candidateId});

  final String candidateId;
}

class WarehouseSubmissionService {
  static const String bucketName = 'user-card-images';
  static const int maxImageBytes = 10 * 1024 * 1024;

  static WarehouseSubmissionValidationErrors validate({
    required WarehouseSubmissionIntentType? intent,
    required String notes,
    required String tcgplayerId,
    required XFile? frontImage,
    required XFile? backImage,
  }) {
    return WarehouseSubmissionValidationErrors(
      submissionIntent: intent == null
          ? 'Choose whether you are reporting a missing card or a missing image.'
          : null,
      notes: _normalizeText(notes) == null ? 'Notes are required.' : null,
      tcgplayerId:
          intent == WarehouseSubmissionIntentType.missingImage &&
              _normalizeText(tcgplayerId) == null
          ? 'Missing image submissions currently require a TCGPlayer ID.'
          : null,
      frontImage: frontImage == null
          ? 'A front image is required.'
          : _validateImageFile(frontImage),
      backImage: _validateImageFile(backImage),
    );
  }

  static Future<WarehouseSubmissionResult> submit({
    required SupabaseClient client,
    required String userId,
    required WarehouseSubmissionIntentType intent,
    required String notes,
    required String tcgplayerId,
    required XFile frontImage,
    required XFile? backImage,
    void Function(String message)? onStage,
  }) async {
    final normalizedNotes = _normalizeText(notes);
    if (normalizedNotes == null) {
      throw Exception('Notes are required.');
    }

    final validation = validate(
      intent: intent,
      notes: notes,
      tcgplayerId: tcgplayerId,
      frontImage: frontImage,
      backImage: backImage,
    );
    if (validation.hasErrors) {
      throw Exception('Fix the highlighted fields before submitting.');
    }

    final submissionId = _newSubmissionId();
    final uploadedPaths = <String>[];

    try {
      onStage?.call('Uploading evidence...');
      final uploadedFront = await uploadEvidenceImage(
        client: client,
        userId: userId,
        submissionId: submissionId,
        imageType: WarehouseEvidenceImageType.front,
        file: frontImage,
      );
      uploadedPaths.add(uploadedFront);

      String? uploadedBack;
      if (backImage != null) {
        uploadedBack = await uploadEvidenceImage(
          client: client,
          userId: userId,
          submissionId: submissionId,
          imageType: WarehouseEvidenceImageType.back,
          file: backImage,
        );
        uploadedPaths.add(uploadedBack);
      }

      onStage?.call('Submitting to warehouse review...');
      final response = await client.functions.invoke(
        'warehouse-intake-v1',
        body: {
          'notes': normalizedNotes,
          'tcgplayer_id': _normalizeText(tcgplayerId),
          'submission_intent': _intentValue(intent),
          'intake_channel': 'UPLOAD',
          'evidence': {
            'images': [
              {'type': 'front', 'storage_path': uploadedFront},
              if (uploadedBack != null)
                {'type': 'back', 'storage_path': uploadedBack},
            ],
          },
        },
      );

      if (response.status < 200 || response.status >= 300) {
        throw Exception(
          _extractInvokeError(response.data) ?? 'Warehouse intake failed.',
        );
      }

      final data = response.data;
      if (data is! Map) {
        throw Exception('Warehouse intake did not return a candidate id.');
      }
      final success = data['success'] == true;
      final candidateId = (data['candidate_id'] ?? '').toString().trim();

      if (!success || candidateId.isEmpty) {
        throw Exception(
          _extractInvokeError(data) ??
              'Warehouse intake did not return a candidate id.',
        );
      }

      return WarehouseSubmissionResult(candidateId: candidateId);
    } catch (error) {
      await removeEvidenceImages(client: client, paths: uploadedPaths);
      rethrow;
    }
  }

  static Future<String> uploadEvidenceImage({
    required SupabaseClient client,
    required String userId,
    required String submissionId,
    required WarehouseEvidenceImageType imageType,
    required XFile file,
  }) async {
    final imageError = _validateImageFile(file);
    if (imageError != null) {
      throw Exception(imageError);
    }

    final bytes = await file.readAsBytes();
    final extension = _fileExtension(
      file.name.isNotEmpty ? file.name : file.path,
    );
    final contentType = switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => 'image/jpeg',
    };
    final path = buildStoragePath(
      userId: userId,
      submissionId: submissionId,
      imageType: imageType,
      fileName: file.name.isNotEmpty ? file.name : '${imageType.name}.jpg',
    );

    await client.storage
        .from(bucketName)
        .uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(upsert: false, contentType: contentType),
        );

    return path;
  }

  static Future<void> removeEvidenceImages({
    required SupabaseClient client,
    required List<String?> paths,
  }) async {
    final normalizedPaths = paths
        .map(_normalizeStoragePath)
        .whereType<String>()
        .toSet()
        .toList();

    if (normalizedPaths.isEmpty) {
      return;
    }

    try {
      await client.storage.from(bucketName).remove(normalizedPaths);
    } catch (_) {
      // Cleanup failure should not override the primary submission error.
    }
  }

  static String buildStoragePath({
    required String userId,
    required String submissionId,
    required WarehouseEvidenceImageType imageType,
    required String fileName,
  }) {
    final normalizedFileName = fileName
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'[^a-z0-9._-]'), '')
        .replaceAll(RegExp(r'-+'), '-');
    final safeFileName = normalizedFileName.isEmpty
        ? '${imageType.name}-image'
        : normalizedFileName;
    return '${userId.trim()}/warehouse-submissions/${submissionId.trim()}/${imageType.name}/$safeFileName';
  }

  static String _newSubmissionId() {
    final random = Random();
    final suffix = random.nextInt(1 << 32).toRadixString(16);
    return '${DateTime.now().millisecondsSinceEpoch}-$suffix';
  }

  static String? _normalizeText(String? value) {
    final normalized = value?.trim() ?? '';
    return normalized.isEmpty ? null : normalized;
  }

  static String? _validateImageFile(XFile? file) {
    if (file == null) {
      return null;
    }

    final mimeType = file.mimeType?.toLowerCase();
    final extension = _fileExtension(
      file.name.isNotEmpty ? file.name : file.path,
    );
    final looksLikeImage =
        (mimeType?.startsWith('image/') ?? false) ||
        const {
          'jpg',
          'jpeg',
          'png',
          'webp',
          'heic',
          'heif',
        }.contains(extension);
    if (!looksLikeImage) {
      return 'Upload an image file.';
    }

    final fileSize = file.path.isNotEmpty ? File(file.path).lengthSync() : null;
    if (fileSize != null && fileSize > maxImageBytes) {
      return 'Images must be ${maxImageBytes ~/ (1024 * 1024)} MB or smaller.';
    }

    return null;
  }

  static String _intentValue(WarehouseSubmissionIntentType intent) {
    return switch (intent) {
      WarehouseSubmissionIntentType.missingCard => 'MISSING_CARD',
      WarehouseSubmissionIntentType.missingImage => 'MISSING_IMAGE',
    };
  }

  static String? _extractInvokeError(dynamic value) {
    if (value is Map) {
      final message = value['message']?.toString().trim();
      if (message != null && message.isNotEmpty) {
        return message;
      }
      final detail = value['detail']?.toString().trim();
      if (detail != null && detail.isNotEmpty) {
        return detail;
      }
      final error = value['error']?.toString().trim();
      if (error != null && error.isNotEmpty) {
        return error;
      }
    }
    return null;
  }

  static String _fileExtension(String path) {
    final dotIndex = path.lastIndexOf('.');
    if (dotIndex == -1 || dotIndex == path.length - 1) {
      return '';
    }
    return path.substring(dotIndex + 1).toLowerCase();
  }

  static String? _normalizeStoragePath(String? path) {
    final normalized = path?.trim().replaceFirst(RegExp(r'^/+'), '') ?? '';
    return normalized.isEmpty ? null : normalized;
  }
}
