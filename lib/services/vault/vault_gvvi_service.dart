import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../secrets.dart';
import '../public/card_surface_pricing_service.dart';

enum GvviImageSide { front, back }

enum GvviPricingMode { market, asking }

enum GvviImageDisplayMode { canonical, uploaded }

class PublicGvviData {
  const PublicGvviData({
    required this.instanceId,
    required this.gvviId,
    required this.vaultItemId,
    required this.ownerUserId,
    required this.ownerSlug,
    required this.ownerDisplayName,
    required this.cardPrintId,
    required this.gvId,
    required this.cardName,
    required this.setCode,
    required this.setName,
    required this.number,
    required this.intent,
    required this.isDiscoverable,
    required this.isGraded,
    required this.pricingMode,
    this.imageUrl,
    this.frontImageUrl,
    this.backImageUrl,
    this.imageDisplayMode = GvviImageDisplayMode.canonical,
    this.conditionLabel,
    this.grader,
    this.grade,
    this.certNumber,
    this.createdAt,
    this.askingPriceAmount,
    this.askingPriceCurrency,
    this.askingPriceNote,
    this.marketReferencePrice,
    this.marketReferenceSource,
    this.publicNote,
  });

  final String instanceId;
  final String gvviId;
  final String vaultItemId;
  final String ownerUserId;
  final String ownerSlug;
  final String ownerDisplayName;
  final String cardPrintId;
  final String gvId;
  final String cardName;
  final String setCode;
  final String setName;
  final String number;
  final String intent;
  final bool isDiscoverable;
  final bool isGraded;
  final String? imageUrl;
  final String? frontImageUrl;
  final String? backImageUrl;
  final GvviImageDisplayMode imageDisplayMode;
  final String? conditionLabel;
  final String? grader;
  final String? grade;
  final String? certNumber;
  final DateTime? createdAt;
  final GvviPricingMode pricingMode;
  final double? askingPriceAmount;
  final String? askingPriceCurrency;
  final String? askingPriceNote;
  final double? marketReferencePrice;
  final String? marketReferenceSource;
  final String? publicNote;

  String? get primaryImageUrl {
    if (imageDisplayMode == GvviImageDisplayMode.uploaded) {
      return frontImageUrl ?? imageUrl;
    }
    return imageUrl;
  }

  String? get fallbackImageUrl {
    if (imageDisplayMode == GvviImageDisplayMode.uploaded &&
        (frontImageUrl ?? '').trim().isNotEmpty &&
        (imageUrl ?? '').trim().isNotEmpty &&
        frontImageUrl != imageUrl) {
      return imageUrl;
    }
    return null;
  }

  bool get hasExactMedia =>
      (frontImageUrl ?? '').trim().isNotEmpty ||
      (backImageUrl ?? '').trim().isNotEmpty;

  bool get hasVisiblePrice => pricingMode == GvviPricingMode.asking
      ? askingPriceAmount != null
      : marketReferencePrice != null;
}

class VaultGvviOutcome {
  const VaultGvviOutcome({
    required this.id,
    required this.outcomeType,
    required this.role,
    this.createdAt,
    this.priceAmount,
    this.priceCurrency,
  });

  final String id;
  final String outcomeType;
  final String role;
  final DateTime? createdAt;
  final double? priceAmount;
  final String? priceCurrency;
}

class VaultGvviData {
  const VaultGvviData({
    required this.instanceId,
    required this.gvviId,
    required this.vaultItemId,
    required this.activeCopyCount,
    required this.cardPrintId,
    required this.gvId,
    required this.cardName,
    required this.setCode,
    required this.setName,
    required this.number,
    required this.intent,
    required this.isGraded,
    required this.isArchived,
    required this.pricingMode,
    required this.isSharedOnWall,
    required this.publicProfileEnabled,
    required this.vaultSharingEnabled,
    required this.outcomes,
    this.imageUrl,
    this.frontImageUrl,
    this.backImageUrl,
    this.frontImagePath,
    this.backImagePath,
    this.imageDisplayMode = GvviImageDisplayMode.canonical,
    this.conditionLabel,
    this.grader,
    this.grade,
    this.certNumber,
    this.notes,
    this.createdAt,
    this.archivedAt,
    this.publicSlug,
    this.askingPriceAmount,
    this.askingPriceCurrency,
    this.askingPriceNote,
    this.marketReferencePrice,
    this.marketReferenceSource,
  });

  final String instanceId;
  final String gvviId;
  final String vaultItemId;
  final int activeCopyCount;
  final String cardPrintId;
  final String gvId;
  final String cardName;
  final String setCode;
  final String setName;
  final String number;
  final String intent;
  final bool isGraded;
  final bool isArchived;
  final String? imageUrl;
  final String? frontImageUrl;
  final String? backImageUrl;
  final String? frontImagePath;
  final String? backImagePath;
  final GvviImageDisplayMode imageDisplayMode;
  final String? conditionLabel;
  final String? grader;
  final String? grade;
  final String? certNumber;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? archivedAt;
  final GvviPricingMode pricingMode;
  final double? askingPriceAmount;
  final String? askingPriceCurrency;
  final String? askingPriceNote;
  final double? marketReferencePrice;
  final String? marketReferenceSource;
  final bool isSharedOnWall;
  final bool publicProfileEnabled;
  final bool vaultSharingEnabled;
  final String? publicSlug;
  final List<VaultGvviOutcome> outcomes;

  bool get canOpenPublicPage => !isArchived && intent != 'hold';

  String? get primaryImageUrl {
    if (imageDisplayMode == GvviImageDisplayMode.uploaded) {
      return frontImageUrl ?? imageUrl;
    }
    return imageUrl;
  }

  String? get fallbackImageUrl {
    if (imageDisplayMode == GvviImageDisplayMode.uploaded &&
        (frontImageUrl ?? '').trim().isNotEmpty &&
        (imageUrl ?? '').trim().isNotEmpty &&
        frontImageUrl != imageUrl) {
      return imageUrl;
    }
    return null;
  }

  VaultGvviData copyWith({
    String? notes,
    bool clearNotes = false,
    String? frontImagePath,
    bool clearFrontImagePath = false,
    String? backImagePath,
    bool clearBackImagePath = false,
    String? frontImageUrl,
    bool clearFrontImageUrl = false,
    String? backImageUrl,
    bool clearBackImageUrl = false,
    bool? isSharedOnWall,
    GvviImageDisplayMode? imageDisplayMode,
  }) {
    return VaultGvviData(
      instanceId: instanceId,
      gvviId: gvviId,
      vaultItemId: vaultItemId,
      activeCopyCount: activeCopyCount,
      cardPrintId: cardPrintId,
      gvId: gvId,
      cardName: cardName,
      setCode: setCode,
      setName: setName,
      number: number,
      intent: intent,
      isGraded: isGraded,
      isArchived: isArchived,
      imageUrl: imageUrl,
      frontImageUrl: clearFrontImageUrl
          ? null
          : frontImageUrl ?? this.frontImageUrl,
      backImageUrl: clearBackImageUrl
          ? null
          : backImageUrl ?? this.backImageUrl,
      frontImagePath: clearFrontImagePath
          ? null
          : frontImagePath ?? this.frontImagePath,
      backImagePath: clearBackImagePath
          ? null
          : backImagePath ?? this.backImagePath,
      imageDisplayMode: imageDisplayMode ?? this.imageDisplayMode,
      conditionLabel: conditionLabel,
      grader: grader,
      grade: grade,
      certNumber: certNumber,
      notes: clearNotes ? null : notes ?? this.notes,
      createdAt: createdAt,
      archivedAt: archivedAt,
      pricingMode: pricingMode,
      askingPriceAmount: askingPriceAmount,
      askingPriceCurrency: askingPriceCurrency,
      askingPriceNote: askingPriceNote,
      marketReferencePrice: marketReferencePrice,
      marketReferenceSource: marketReferenceSource,
      isSharedOnWall: isSharedOnWall ?? this.isSharedOnWall,
      publicProfileEnabled: publicProfileEnabled,
      vaultSharingEnabled: vaultSharingEnabled,
      publicSlug: publicSlug,
      outcomes: outcomes,
    );
  }
}

class VaultGvviService {
  static const String mediaBucket = 'user-card-images';
  static const int mediaMaxBytes = 10 * 1024 * 1024;

  static Future<PublicGvviData?> loadPublic({
    required SupabaseClient client,
    required String gvviId,
  }) async {
    final normalizedGvviId = _clean(gvviId);
    if (normalizedGvviId.isEmpty) {
      return null;
    }

    final rawData = await client.rpc(
      'public_vault_instance_detail_v1',
      params: {'p_gv_vi_id': normalizedGvviId},
    );
    if (rawData == null) {
      return null;
    }

    final data = Map<String, dynamic>.from(rawData as Map);
    final cardPrintId = _nullable(data['card_print_id']);
    final ownerUserId = _clean(data['owner_user_id']);
    final ownerSlug = _clean(data['owner_slug']);
    final ownerDisplayName = _clean(data['owner_display_name']);
    final vaultItemId = _nullable(data['legacy_vault_item_id']) ?? '';
    if (cardPrintId == null ||
        ownerUserId.isEmpty ||
        ownerSlug.isEmpty ||
        ownerDisplayName.isEmpty ||
        vaultItemId.isEmpty) {
      return null;
    }

    final pricingById = await CardSurfacePricingService.fetchByCardPrintIds(
      client: client,
      cardPrintIds: [cardPrintId],
    );
    final pricing = pricingById[cardPrintId];
    final normalizedIntent = _normalizeIntent(data['intent']);
    return PublicGvviData(
      instanceId: _clean(data['id']),
      gvviId: normalizedGvviId,
      vaultItemId: vaultItemId,
      ownerUserId: ownerUserId,
      ownerSlug: ownerSlug,
      ownerDisplayName: ownerDisplayName,
      cardPrintId: cardPrintId,
      gvId: _clean(data['card_gv_id']),
      cardName: _nullable(data['card_name']) ?? 'Unknown card',
      setCode: _nullable(data['card_set_code']) ?? 'Unknown set',
      setName: _nullable(data['card_set_name']) ?? 'Unknown set',
      number: _nullable(data['card_number']) ?? '—',
      imageUrl: _bestPublicImageUrl(
        primary: data['card_image_url'],
        fallback: data['card_image_alt_url'],
      ),
      frontImageUrl: resolveMediaUrl(_nullable(data['image_url'])),
      backImageUrl: resolveMediaUrl(_nullable(data['image_back_url'])),
      imageDisplayMode: _normalizeImageDisplayMode(data['image_display_mode']),
      intent: normalizedIntent,
      isDiscoverable: data['is_discoverable'] == true,
      conditionLabel: _nullable(data['condition_label']),
      isGraded: _nullable(data['cert_number']) != null,
      grader: _nullable(data['grade_company']),
      grade: _nullable(data['grade_label']) ?? _nullable(data['grade_value']),
      certNumber: _nullable(data['cert_number']),
      createdAt: DateTime.tryParse(_clean(data['created_at'])),
      pricingMode: _normalizePricingMode(data['pricing_mode']),
      askingPriceAmount: _toMoney(data['asking_price_amount']),
      askingPriceCurrency: _normalizeCurrency(data['asking_price_currency']),
      askingPriceNote: _nullable(data['asking_price_note']),
      marketReferencePrice: _nullable(data['cert_number']) != null
          ? null
          : pricing?.visibleValue,
      marketReferenceSource: _nullable(data['cert_number']) != null
          ? null
          : _normalizeSource(pricing?.primarySource),
      publicNote: _nullable(data['public_note']),
    );
  }

  static Future<VaultGvviData?> loadPrivate({
    required SupabaseClient client,
    required String gvviId,
  }) async {
    final normalizedGvviId = _clean(gvviId);
    if (normalizedGvviId.isEmpty) {
      return null;
    }

    final rawData = await client.rpc(
      'vault_mobile_instance_detail_v1',
      params: {'p_gv_vi_id': normalizedGvviId},
    );
    if (rawData == null) {
      return null;
    }

    final data = Map<String, dynamic>.from(rawData as Map);
    final cardPrintId = _nullable(data['card_print_id']);
    if (cardPrintId == null) {
      return null;
    }

    final pricingById = await CardSurfacePricingService.fetchByCardPrintIds(
      client: client,
      cardPrintIds: [cardPrintId],
    );
    final pricing = pricingById[cardPrintId];
    final isArchived = data['archived_at'] != null;
    final outcomeRows = (data['outcomes'] as List<dynamic>? ?? const []);

    return VaultGvviData(
      instanceId: _clean(data['id']),
      gvviId: normalizedGvviId,
      vaultItemId:
          _nullable(data['legacy_vault_item_id']) ?? _clean(data['id']),
      activeCopyCount: _toInt(data['active_copy_count']) ?? 0,
      cardPrintId: cardPrintId,
      gvId: _clean(data['card_gv_id']),
      cardName: _nullable(data['card_name']) ?? 'Unknown card',
      setCode: _nullable(data['card_set_code']) ?? 'Unknown set',
      setName: _nullable(data['card_set_name']) ?? 'Unknown set',
      number: _nullable(data['card_number']) ?? '—',
      intent: _normalizeIntent(data['intent']),
      isGraded: _nullable(data['cert_number']) != null,
      isArchived: isArchived,
      imageUrl: _bestPublicImageUrl(
        primary: data['card_image_url'],
        fallback: data['card_image_alt_url'],
      ),
      frontImagePath: _nullable(data['image_url']),
      backImagePath: _nullable(data['image_back_url']),
      frontImageUrl: resolveMediaUrl(_nullable(data['image_url'])),
      backImageUrl: resolveMediaUrl(_nullable(data['image_back_url'])),
      imageDisplayMode: _normalizeImageDisplayMode(data['image_display_mode']),
      conditionLabel: _nullable(data['condition_label']),
      grader: _nullable(data['grade_company']),
      grade: _nullable(data['grade_label']) ?? _nullable(data['grade_value']),
      certNumber: _nullable(data['cert_number']),
      notes: _nullable(data['notes']),
      createdAt: DateTime.tryParse(_clean(data['created_at'])),
      archivedAt: DateTime.tryParse(_clean(data['archived_at'])),
      pricingMode: _normalizePricingMode(data['pricing_mode']),
      askingPriceAmount: _toMoney(data['asking_price_amount']),
      askingPriceCurrency: _normalizeCurrency(data['asking_price_currency']),
      askingPriceNote: _nullable(data['asking_price_note']),
      marketReferencePrice: _nullable(data['cert_number']) != null
          ? null
          : pricing?.visibleValue,
      marketReferenceSource: _nullable(data['cert_number']) != null
          ? null
          : _normalizeSource(pricing?.primarySource),
      isSharedOnWall: data['is_shared_on_wall'] == true,
      publicProfileEnabled: data['public_profile_enabled'] == true,
      vaultSharingEnabled: data['vault_sharing_enabled'] == true,
      publicSlug: _nullable(data['public_slug']),
      outcomes: outcomeRows
          .whereType<Map>()
          .map((raw) => Map<String, dynamic>.from(raw))
          .where((row) {
            final type = _clean(row['outcome_type']);
            return type == 'sale' || type == 'trade';
          })
          .map(
            (row) => VaultGvviOutcome(
              id: _clean(row['id']),
              outcomeType: _clean(row['outcome_type']),
              role: _clean(row['source_instance_id']) == _clean(data['id'])
                  ? 'source'
                  : 'result',
              createdAt: DateTime.tryParse(_clean(row['created_at'])),
              priceAmount: _toMoney(row['price_amount']),
              priceCurrency: _normalizeCurrency(row['price_currency']),
            ),
          )
          .toList(),
    );
  }

  static Future<String?> saveNotes({
    required SupabaseClient client,
    required String instanceId,
    required String notes,
  }) async {
    final normalizedInstanceId = _clean(instanceId);
    if (normalizedInstanceId.isEmpty) {
      throw Exception('Sign in required.');
    }

    final trimmedNotes = _nullable(notes);
    final nextNotes = trimmedNotes?.substring(
      0,
      trimmedNotes.length > 2000 ? 2000 : trimmedNotes.length,
    );
    final result = await client.rpc(
      'vault_save_instance_notes_v1',
      params: {'p_instance_id': normalizedInstanceId, 'p_notes': nextNotes},
    );
    if (result == null) {
      throw Exception('Notes could not be saved.');
    }

    return nextNotes;
  }

  static Future<String> uploadMedia({
    required SupabaseClient client,
    required String userId,
    required String instanceId,
    required GvviImageSide side,
    required XFile file,
  }) async {
    final bytes = await file.readAsBytes();
    if (bytes.length > mediaMaxBytes) {
      throw Exception('Images must be 10 MB or smaller.');
    }

    final storagePath = buildMediaPath(
      userId: userId,
      instanceId: instanceId,
      side: side,
    );
    final extension = file.path.split('.').last.toLowerCase();
    final contentType = switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => 'image/jpeg',
    };

    await client.storage
        .from(mediaBucket)
        .uploadBinary(
          storagePath,
          bytes,
          fileOptions: FileOptions(upsert: true, contentType: contentType),
        );

    await client.rpc(
      'vault_save_instance_media_path_v1',
      params: {
        'p_instance_id': instanceId,
        'p_side': side.name,
        'p_storage_path': storagePath,
      },
    );

    return storagePath;
  }

  static Future<void> removeMedia({
    required SupabaseClient client,
    required String instanceId,
    required GvviImageSide side,
    String? currentPath,
  }) async {
    final normalizedPath = normalizeMediaPath(currentPath);
    if (normalizedPath != null) {
      await client.storage.from(mediaBucket).remove([normalizedPath]);
    }

    await client.rpc(
      'vault_save_instance_media_path_v1',
      params: {
        'p_instance_id': instanceId,
        'p_side': side.name,
        'p_storage_path': null,
      },
    );
  }

  static Future<void> archiveExactCopy({
    required SupabaseClient client,
    required String instanceId,
  }) async {
    final normalizedInstanceId = _clean(instanceId);
    if (normalizedInstanceId.isEmpty) {
      throw Exception('Exact copy target could not be resolved.');
    }

    final result = await client.rpc(
      'vault_archive_exact_instance_v1',
      params: {'p_instance_id': normalizedInstanceId},
    );
    if (result == null) {
      return;
    }
  }

  static String buildMediaPath({
    required String userId,
    required String instanceId,
    required GvviImageSide side,
  }) {
    return '${userId.trim()}/vault-instances/${instanceId.trim()}/${side.name}/current';
  }

  static String? normalizeMediaPath(String? value) {
    final normalized = _clean(value).replaceFirst(RegExp(r'^/+'), '');
    return normalized.isEmpty ? null : normalized;
  }

  static String? resolveMediaUrl(String? path) {
    final normalized = normalizeMediaPath(path);
    final baseUrl = supabaseUrl.replaceFirst(RegExp(r'/+$'), '');
    if (normalized == null || baseUrl.isEmpty) {
      return null;
    }

    final encodedPath = normalized
        .split('/')
        .where((segment) => segment.isNotEmpty)
        .map(Uri.encodeComponent)
        .join('/');
    return '$baseUrl/storage/v1/object/public/${Uri.encodeComponent(mediaBucket)}/$encodedPath';
  }

  static String? formatPrice(double? amount, {String currency = 'USD'}) {
    if (amount == null) {
      return null;
    }
    try {
      return NumberFormatCurrencyCache.format(amount, currency);
    } catch (_) {
      return '$currency ${amount.toStringAsFixed(2)}';
    }
  }
}

class NumberFormatCurrencyCache {
  static final Map<String, dynamic> _cache = <String, dynamic>{};

  static String format(double amount, String currency) {
    final key = currency.toUpperCase();
    final formatter =
        _cache.putIfAbsent(key, () => NumberFormatWrapper(currency: key))
            as NumberFormatWrapper;
    return formatter.format(amount);
  }
}

class NumberFormatWrapper {
  NumberFormatWrapper({required this.currency});

  final String currency;

  String format(double amount) {
    final symbol = switch (currency) {
      'USD' => '\$',
      _ => '$currency ',
    };
    return '$symbol${amount.toStringAsFixed(2)}';
  }
}

String _clean(dynamic value) => (value ?? '').toString().trim();

String? _nullable(dynamic value) {
  final normalized = _clean(value);
  return normalized.isEmpty ? null : normalized;
}

String _normalizeIntent(dynamic value) {
  switch (_clean(value).toLowerCase()) {
    case 'trade':
      return 'trade';
    case 'sell':
      return 'sell';
    case 'showcase':
      return 'showcase';
    default:
      return 'hold';
  }
}

String? _normalizeCurrency(dynamic value) {
  final normalized = _clean(value).toUpperCase();
  if (normalized.length != 3 || RegExp(r'[^A-Z]').hasMatch(normalized)) {
    return null;
  }
  return normalized;
}

double? _toMoney(dynamic value) {
  if (value is num) {
    final normalized = value.toDouble();
    return normalized.isFinite ? normalized : null;
  }
  final parsed = double.tryParse(_clean(value));
  if (parsed == null || !parsed.isFinite || parsed < 0) {
    return null;
  }
  return double.parse(parsed.toStringAsFixed(2));
}

int? _toInt(dynamic value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    final normalized = value.toInt();
    return normalized >= 0 ? normalized : null;
  }
  final parsed = int.tryParse(_clean(value));
  if (parsed == null || parsed < 0) {
    return null;
  }
  return parsed;
}

String? _normalizeSource(String? value) {
  final normalized = _clean(value).toLowerCase();
  if (normalized == 'justtcg' || normalized == 'ebay') {
    return normalized;
  }
  return null;
}

GvviPricingMode _normalizePricingMode(dynamic value) {
  return _clean(value).toLowerCase() == 'asking'
      ? GvviPricingMode.asking
      : GvviPricingMode.market;
}

GvviImageDisplayMode _normalizeImageDisplayMode(dynamic value) {
  return _clean(value).toLowerCase() == 'uploaded'
      ? GvviImageDisplayMode.uploaded
      : GvviImageDisplayMode.canonical;
}

String? _bestPublicImageUrl({
  required dynamic primary,
  required dynamic fallback,
}) {
  final primaryUrl = _normalizeHttpUrl(primary);
  if (primaryUrl != null) {
    return primaryUrl;
  }
  return _normalizeHttpUrl(fallback);
}

String? _normalizeHttpUrl(dynamic value) {
  final url = _clean(value);
  if (url.isEmpty) {
    return null;
  }
  final parsed = Uri.tryParse(url);
  if (parsed == null) {
    return null;
  }
  if (parsed.scheme != 'http' && parsed.scheme != 'https') {
    return null;
  }
  return url;
}
