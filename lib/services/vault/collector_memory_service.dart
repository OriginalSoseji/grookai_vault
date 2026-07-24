import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../identity/catalog_artwork_resolution.dart';

const bool kCollectorMemoriesEnabled = bool.fromEnvironment(
  'COLLECTOR_MEMORIES_ENABLED',
  defaultValue: true,
);

typedef CollectorMemoryRpc =
    Future<dynamic> Function(
      String functionName, {
      Map<String, dynamic>? params,
    });

typedef CollectorMemoryStorageUpload =
    Future<void> Function({
      required String bucket,
      required String path,
      required Uint8List bytes,
      required String contentType,
    });

typedef CollectorMemoryStorageRemove =
    Future<void> Function({
      required String bucket,
      required List<String> paths,
    });

typedef CollectorMemoryStorageSign =
    Future<String> Function({
      required String bucket,
      required String path,
      required int expiresIn,
    });

typedef CollectorMemoryCatalogLookup =
    Future<List<Map<String, dynamic>>> Function(List<String> cardPrintIds);

class CollectorMemoryServiceException implements Exception {
  const CollectorMemoryServiceException(this.operation, this.cause);

  final String operation;
  final Object cause;

  @override
  String toString() => 'CollectorMemoryServiceException($operation): $cause';
}

enum CollectorMemoryType {
  addedPlace('added_place'),
  occasion('occasion'),
  first('first'),
  note('note');

  const CollectorMemoryType(this.rpcValue);

  final String rpcValue;

  static CollectorMemoryType fromRpc(dynamic value) {
    final normalized = _text(value).toLowerCase();
    return CollectorMemoryType.values.firstWhere(
      (type) => type.rpcValue == normalized,
      orElse: () => CollectorMemoryType.note,
    );
  }
}

class CollectorMemory {
  const CollectorMemory({
    required this.id,
    required this.vaultItemInstanceId,
    required this.gvviId,
    required this.memoryType,
    this.note,
    this.photoPath,
    this.placeLabel,
    this.occasionLabel,
    this.memoryDate,
    this.promptKey,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String vaultItemInstanceId;
  final String gvviId;
  final CollectorMemoryType memoryType;
  final String? note;
  final String? photoPath;
  final String? placeLabel;
  final String? occasionLabel;
  final DateTime? memoryDate;
  final String? promptKey;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  static CollectorMemory? fromJson(Map<String, dynamic> json) {
    final id = _text(json['id']);
    if (id.isEmpty) return null;
    return CollectorMemory(
      id: id,
      vaultItemInstanceId: _text(json['vault_item_instance_id']),
      gvviId: _text(json['gv_vi_id']),
      memoryType: CollectorMemoryType.fromRpc(json['memory_type']),
      note: _optionalText(json['note']),
      photoPath: _optionalText(json['photo_path']),
      placeLabel: _optionalText(json['place_label']),
      occasionLabel: _optionalText(json['occasion_label']),
      memoryDate: _date(json['memory_date']),
      promptKey: _optionalText(json['prompt_key']),
      createdAt: _date(json['created_at']),
      updatedAt: _date(json['updated_at']),
    );
  }
}

class OwnerCollectorMemory {
  const OwnerCollectorMemory({
    required this.memory,
    required this.cardPrintId,
    required this.cardName,
    required this.setName,
    this.gvId,
    this.cardImageUrl,
  });

  final CollectorMemory memory;
  final String cardPrintId;
  final String cardName;
  final String setName;
  final String? gvId;
  final String? cardImageUrl;

  CatalogArtworkResolution get catalogArtwork =>
      resolveCatalogArtwork(gvId: gvId, providerImageUrl: cardImageUrl);

  OwnerCollectorMemory withCatalogIdentity({
    String? gvId,
    String? providerImageUrl,
  }) {
    return OwnerCollectorMemory(
      memory: memory,
      cardPrintId: cardPrintId,
      cardName: cardName,
      setName: setName,
      gvId: _optionalText(gvId) ?? this.gvId,
      cardImageUrl: _optionalText(providerImageUrl) ?? cardImageUrl,
    );
  }

  static OwnerCollectorMemory? fromJson(Map<String, dynamic> json) {
    final memory = CollectorMemory.fromJson(json);
    if (memory == null) return null;
    final cardPrintId = _text(json['card_print_id']);
    final cardName = _text(json['card_name']);
    return OwnerCollectorMemory(
      memory: memory,
      cardPrintId: cardPrintId,
      cardName: cardName.isEmpty ? 'Card memory' : cardName,
      setName: _text(json['set_name']),
      gvId: _optionalText(json['gv_id']),
      cardImageUrl: _optionalText(json['card_image_url']),
    );
  }
}

class CollectorMemoryPrompt {
  const CollectorMemoryPrompt({
    required this.promptKey,
    required this.promptType,
    required this.promptTitle,
    required this.promptBody,
    this.suggestedPlaceLabel,
    this.suggestedOccasionLabel,
    this.suggestedMemoryDate,
    this.cardName,
    this.cardImageUrl,
  });

  final String promptKey;
  final CollectorMemoryType promptType;
  final String promptTitle;
  final String promptBody;
  final String? suggestedPlaceLabel;
  final String? suggestedOccasionLabel;
  final DateTime? suggestedMemoryDate;
  final String? cardName;
  final String? cardImageUrl;

  static CollectorMemoryPrompt? fromJson(Map<String, dynamic> json) {
    final promptKey = _text(json['prompt_key']);
    if (promptKey.isEmpty) return null;
    return CollectorMemoryPrompt(
      promptKey: promptKey,
      promptType: CollectorMemoryType.fromRpc(json['prompt_type']),
      promptTitle: _text(json['prompt_title']),
      promptBody: _text(json['prompt_body']),
      suggestedPlaceLabel: _optionalText(json['suggested_place_label']),
      suggestedOccasionLabel: _optionalText(json['suggested_occasion_label']),
      suggestedMemoryDate: _date(json['suggested_memory_date']),
      cardName: _optionalText(json['card_name']),
      cardImageUrl: _httpUrl(json['card_image_url']),
    );
  }
}

class CollectorMemoryService {
  CollectorMemoryService({
    SupabaseClient? client,
    CollectorMemoryRpc? rpc,
    CollectorMemoryStorageUpload? upload,
    CollectorMemoryStorageRemove? remove,
    CollectorMemoryStorageSign? sign,
    CollectorMemoryCatalogLookup? catalogLookup,
  }) : _client = client ?? (rpc == null ? Supabase.instance.client : null),
       _rpc = rpc,
       _upload = upload,
       _remove = remove,
       _sign = sign,
       _catalogLookup = catalogLookup;

  static const String memoryBucket = 'collector-memory-images';
  static const int photoMaxBytes = 10 * 1024 * 1024;

  final SupabaseClient? _client;
  final CollectorMemoryRpc? _rpc;
  final CollectorMemoryStorageUpload? _upload;
  final CollectorMemoryStorageRemove? _remove;
  final CollectorMemoryStorageSign? _sign;
  final CollectorMemoryCatalogLookup? _catalogLookup;

  bool get isFeatureEnabled => kCollectorMemoriesEnabled;

  Future<List<CollectorMemory>> loadForGvvi({
    required String gvviId,
    int limit = 20,
    DateTime? beforeCreatedAt,
    String? beforeId,
  }) async {
    final response = await _callRpc(
      'collector_memories_for_gvvi_v1',
      params: _withoutNulls(<String, dynamic>{
        'p_gv_vi_id': _text(gvviId),
        'p_limit': limit.clamp(1, 50).toInt(),
        'p_before_created_at': beforeCreatedAt?.toUtc().toIso8601String(),
        'p_before_id': _optionalText(beforeId),
      }),
    );

    return _maps(response)
        .map(CollectorMemory.fromJson)
        .whereType<CollectorMemory>()
        .toList(growable: false);
  }

  Future<List<OwnerCollectorMemory>> loadOwnerMemories({
    int limit = 50,
    DateTime? beforeCreatedAt,
    String? beforeId,
  }) async {
    final response = await _callRpc(
      'collector_memories_for_owner_v1',
      params: _withoutNulls(<String, dynamic>{
        'p_limit': limit.clamp(1, 100).toInt(),
        'p_before_created_at': beforeCreatedAt?.toUtc().toIso8601String(),
        'p_before_id': _optionalText(beforeId),
      }),
    );

    final memories = _maps(response)
        .map(OwnerCollectorMemory.fromJson)
        .whereType<OwnerCollectorMemory>()
        .toList(growable: false);
    if (memories.isEmpty) {
      return memories;
    }

    final cardPrintIds = memories
        .map((memory) => memory.cardPrintId.trim())
        .where((cardPrintId) => cardPrintId.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (cardPrintIds.isEmpty) {
      return memories;
    }

    try {
      final catalogRows = await _loadCatalogRows(cardPrintIds);
      final catalogByCardPrintId = <String, Map<String, dynamic>>{
        for (final row in catalogRows)
          if (_text(row['id']).isNotEmpty) _text(row['id']): row,
      };
      return memories
          .map((memory) {
            final row = catalogByCardPrintId[memory.cardPrintId];
            if (row == null) {
              return memory;
            }
            return memory.withCatalogIdentity(
              gvId: _optionalText(row['gv_id']),
              providerImageUrl:
                  _optionalText(row['image_url']) ??
                  _optionalText(row['image_alt_url']) ??
                  _optionalText(row['representative_image_url']),
            );
          })
          .toList(growable: false);
    } catch (_) {
      // Catalog enrichment is best-effort. A transient lookup failure must not
      // hide the owner's private memories or their signed photos.
      return memories;
    }
  }

  Future<List<Map<String, dynamic>>> _loadCatalogRows(
    List<String> cardPrintIds,
  ) async {
    final injected = _catalogLookup;
    if (injected != null) {
      return injected(cardPrintIds);
    }

    final response = await _requiredClient()
        .from('card_prints')
        .select('id,gv_id,image_url,image_alt_url,representative_image_url')
        .inFilter('id', cardPrintIds);
    return (response as List<dynamic>)
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
  }

  Future<List<CollectorMemoryPrompt>> loadPrompts({
    required String gvviId,
  }) async {
    final response = await _callRpc(
      'collector_memory_prompt_state_v1',
      params: <String, dynamic>{'p_gv_vi_id': _text(gvviId)},
    );
    return _maps(response)
        .map(CollectorMemoryPrompt.fromJson)
        .whereType<CollectorMemoryPrompt>()
        .toList(growable: false);
  }

  Future<CollectorMemory> create({
    required String gvviId,
    required CollectorMemoryType memoryType,
    String? note,
    String? photoPath,
    String? placeLabel,
    String? occasionLabel,
    DateTime? memoryDate,
    String? promptKey,
  }) async {
    final response = await _callRpc(
      'collector_memory_create_v1',
      params: <String, dynamic>{
        'p_gv_vi_id': _text(gvviId),
        'p_memory_type': memoryType.rpcValue,
        'p_note': _optionalText(note),
        'p_photo_path': normalizePhotoPath(photoPath),
        'p_place_label': _optionalText(placeLabel),
        'p_occasion_label': _optionalText(occasionLabel),
        'p_memory_date': _dateParam(memoryDate),
        'p_prompt_key': _optionalText(promptKey),
      },
    );
    return _requiredMemory(response, 'collector_memory_create_v1');
  }

  Future<CollectorMemory> update({
    required String memoryId,
    String? note,
    String? photoPath,
    String? placeLabel,
    String? occasionLabel,
    DateTime? memoryDate,
  }) async {
    final response = await _callRpc(
      'collector_memory_update_v1',
      params: <String, dynamic>{
        'p_memory_id': _text(memoryId),
        'p_note': _optionalText(note),
        'p_photo_path': normalizePhotoPath(photoPath),
        'p_place_label': _optionalText(placeLabel),
        'p_occasion_label': _optionalText(occasionLabel),
        'p_memory_date': _dateParam(memoryDate),
      },
    );
    return _requiredMemory(response, 'collector_memory_update_v1');
  }

  Future<void> archive({required String memoryId, String? photoPath}) async {
    final normalizedPhotoPath = normalizePhotoPath(photoPath);
    if (normalizedPhotoPath != null) {
      await removePhoto(normalizedPhotoPath);
    }
    await _callRpc(
      'collector_memory_archive_v1',
      params: <String, dynamic>{'p_memory_id': _text(memoryId)},
    );
  }

  Future<void> dismissPrompt({required String promptKey}) async {
    await _callRpc(
      'collector_memory_prompt_dismiss_v1',
      params: <String, dynamic>{'p_prompt_key': _text(promptKey)},
    );
  }

  Future<String> uploadPhoto({
    required String userId,
    required String memoryId,
    required XFile file,
  }) async {
    final bytes = await file.readAsBytes();
    return uploadPhotoBytes(
      userId: userId,
      memoryId: memoryId,
      bytes: bytes,
      fileName: file.name.isEmpty ? file.path : file.name,
    );
  }

  Future<String> uploadPhotoBytes({
    required String userId,
    required String memoryId,
    required Uint8List bytes,
    String? fileName,
  }) async {
    if (bytes.isEmpty) {
      throw Exception('Memory photo is empty.');
    }
    if (bytes.length > photoMaxBytes) {
      throw Exception('Memory photos must be 10 MB or smaller.');
    }
    final path = buildPhotoPath(userId: userId, memoryId: memoryId);
    final contentType = _contentType(fileName);

    final injected = _upload;
    if (injected != null) {
      await injected(
        bucket: memoryBucket,
        path: path,
        bytes: bytes,
        contentType: contentType,
      );
      return path;
    }

    final client = _requiredClient();
    await client.storage
        .from(memoryBucket)
        .uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(upsert: true, contentType: contentType),
        );
    return path;
  }

  Future<void> removePhoto(String photoPath) async {
    final normalizedPath = normalizePhotoPath(photoPath);
    if (normalizedPath == null) return;

    final injected = _remove;
    if (injected != null) {
      await injected(bucket: memoryBucket, paths: <String>[normalizedPath]);
      return;
    }

    final client = _requiredClient();
    await client.storage.from(memoryBucket).remove(<String>[normalizedPath]);
  }

  Future<String?> createSignedPhotoUrl(
    String? photoPath, {
    int expiresIn = 3600,
  }) async {
    final normalizedPath = normalizePhotoPath(photoPath);
    if (normalizedPath == null) return null;

    final injected = _sign;
    if (injected != null) {
      return injected(
        bucket: memoryBucket,
        path: normalizedPath,
        expiresIn: expiresIn,
      );
    }

    final client = _requiredClient();
    return client.storage
        .from(memoryBucket)
        .createSignedUrl(normalizedPath, expiresIn);
  }

  static String buildPhotoPath({
    required String userId,
    required String memoryId,
  }) {
    return '${_text(userId)}/memories/${_text(memoryId)}/photo';
  }

  static String? normalizePhotoPath(String? value) {
    final normalized = _text(value).replaceFirst(RegExp(r'^/+'), '');
    return normalized.isEmpty ? null : normalized;
  }

  Future<dynamic> _callRpc(
    String functionName, {
    Map<String, dynamic>? params,
  }) async {
    try {
      final injected = _rpc;
      if (injected != null) {
        return await injected(functionName, params: params);
      }
      return await _requiredClient().rpc(functionName, params: params ?? {});
    } catch (error, stackTrace) {
      Error.throwWithStackTrace(
        CollectorMemoryServiceException(functionName, error),
        stackTrace,
      );
    }
  }

  SupabaseClient _requiredClient() {
    final client = _client;
    if (client == null) {
      throw StateError('CollectorMemoryService requires a Supabase client.');
    }
    return client;
  }
}

CollectorMemory _requiredMemory(dynamic response, String operation) {
  final row = _firstMap(response);
  final memory = row == null ? null : CollectorMemory.fromJson(row);
  if (memory == null) {
    throw CollectorMemoryServiceException(
      operation,
      StateError('Collector memory response was empty.'),
    );
  }
  return memory;
}

List<Map<String, dynamic>> _maps(dynamic response) {
  if (response is List) {
    return response
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
  }
  final first = _firstMap(response);
  return first == null
      ? const <Map<String, dynamic>>[]
      : <Map<String, dynamic>>[first];
}

Map<String, dynamic>? _firstMap(dynamic response) {
  if (response is Map) return Map<String, dynamic>.from(response);
  if (response is List && response.isNotEmpty && response.first is Map) {
    return Map<String, dynamic>.from(response.first as Map);
  }
  return null;
}

Map<String, dynamic> _withoutNulls(Map<String, dynamic> value) {
  return Map<String, dynamic>.from(value)
    ..removeWhere((_, dynamic item) => item == null);
}

String _text(dynamic value) => (value ?? '').toString().trim();

String? _optionalText(dynamic value) {
  final normalized = _text(value);
  return normalized.isEmpty ? null : normalized;
}

DateTime? _date(dynamic value) {
  final normalized = _text(value);
  return normalized.isEmpty ? null : DateTime.tryParse(normalized);
}

String? _dateParam(DateTime? value) =>
    value?.toIso8601String().split('T').first;

String? _httpUrl(dynamic value) {
  final normalized = _text(value);
  if (normalized.isEmpty) return null;
  final uri = Uri.tryParse(normalized);
  if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
    return null;
  }
  return normalized;
}

String _contentType(String? fileName) {
  final extension = _text(fileName).split('.').last.toLowerCase();
  return switch (extension) {
    'png' => 'image/png',
    'webp' => 'image/webp',
    _ => 'image/jpeg',
  };
}
