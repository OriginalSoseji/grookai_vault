import 'package:supabase_flutter/supabase_flutter.dart';

const bool kMtgSealedClientV1Enabled = false;
const int kMtgSealedImageSignedUrlTtlSecondsV1 = 60 * 60;

enum MtgSealedCatalogStatusV1 {
  disabled,
  loading,
  signedOut,
  empty,
  ready,
  missingImage,
  stale,
  offline,
  error,
}

class MtgSealedCatalogStateV1 {
  const MtgSealedCatalogStateV1({
    required this.status,
    this.rows = const <MtgSealedCatalogRowV1>[],
    this.withheldRows = 0,
    this.message,
  });

  static const disabled = MtgSealedCatalogStateV1(
    status: MtgSealedCatalogStatusV1.disabled,
  );
  static const loading = MtgSealedCatalogStateV1(
    status: MtgSealedCatalogStatusV1.loading,
  );
  static const signedOut = MtgSealedCatalogStateV1(
    status: MtgSealedCatalogStatusV1.signedOut,
  );
  static const empty = MtgSealedCatalogStateV1(
    status: MtgSealedCatalogStatusV1.empty,
  );

  final MtgSealedCatalogStatusV1 status;
  final List<MtgSealedCatalogRowV1> rows;
  final int withheldRows;
  final String? message;
}

class MtgSealedCatalogRowV1 {
  const MtgSealedCatalogRowV1({
    required this.priceReleaseId,
    required this.imageReleaseId,
    required this.familyId,
    required this.variantId,
    required this.canonicalName,
    required this.packageForm,
    required this.languageCode,
    required this.observedOn,
    required this.currency,
    required this.marketPrice,
    required this.imageStorageBucket,
    required this.imageObjectPath,
    required this.imageContentSha256,
    required this.imageMime,
    required this.imageWidth,
    required this.imageHeight,
    required this.imageBytes,
    this.regionCode,
    this.edition,
    this.wave,
    this.releaseDate,
    this.imageUrl,
  });

  final String priceReleaseId;
  final String imageReleaseId;
  final String familyId;
  final String variantId;
  final String canonicalName;
  final String packageForm;
  final String languageCode;
  final String? regionCode;
  final String? edition;
  final String? wave;
  final String? releaseDate;
  final String observedOn;
  final String currency;
  final double marketPrice;
  final String imageStorageBucket;
  final String imageObjectPath;
  final String imageContentSha256;
  final String imageMime;
  final int imageWidth;
  final int imageHeight;
  final int imageBytes;
  final String? imageUrl;

  MtgSealedCatalogRowV1 withImageUrl(String value) {
    return MtgSealedCatalogRowV1(
      priceReleaseId: priceReleaseId,
      imageReleaseId: imageReleaseId,
      familyId: familyId,
      variantId: variantId,
      canonicalName: canonicalName,
      packageForm: packageForm,
      languageCode: languageCode,
      regionCode: regionCode,
      edition: edition,
      wave: wave,
      releaseDate: releaseDate,
      observedOn: observedOn,
      currency: currency,
      marketPrice: marketPrice,
      imageStorageBucket: imageStorageBucket,
      imageObjectPath: imageObjectPath,
      imageContentSha256: imageContentSha256,
      imageMime: imageMime,
      imageWidth: imageWidth,
      imageHeight: imageHeight,
      imageBytes: imageBytes,
      imageUrl: value,
    );
  }
}

abstract interface class MtgSealedClientTransportV1 {
  Future<bool> isAuthenticated();

  Future<dynamic> fetchRows({
    required String gameKey,
    required String? query,
    required int limit,
    required int offset,
  });

  Future<String> createSignedImageUrl({
    required String bucket,
    required String objectPath,
    required int expiresInSeconds,
  });
}

class SupabaseMtgSealedClientTransportV1 implements MtgSealedClientTransportV1 {
  const SupabaseMtgSealedClientTransportV1({required SupabaseClient client})
    : _client = client;

  final SupabaseClient _client;

  @override
  Future<bool> isAuthenticated() async => _client.auth.currentUser != null;

  @override
  Future<dynamic> fetchRows({
    required String gameKey,
    required String? query,
    required int limit,
    required int offset,
  }) {
    return _client.rpc(
      'get_active_sealed_product_pricing_v3',
      params: <String, dynamic>{
        'p_game_key': gameKey,
        'p_query': query,
        'p_limit': limit,
        'p_offset': offset,
      },
    );
  }

  @override
  Future<String> createSignedImageUrl({
    required String bucket,
    required String objectPath,
    required int expiresInSeconds,
  }) async {
    if (expiresInSeconds != kMtgSealedImageSignedUrlTtlSecondsV1) {
      throw StateError('Invalid signed sealed image TTL.');
    }
    final response = await _client.functions.invoke(
      'mtg-sealed-sign-image-v1',
      body: <String, dynamic>{
        'storage_bucket': bucket,
        'object_path': objectPath,
      },
    );
    final data = response.data;
    final signedUrlValue = data is Map ? data['signed_url'] : null;
    final signedUrl =
        signedUrlValue is String && signedUrlValue.trim().isNotEmpty
        ? signedUrlValue.trim()
        : null;
    final returnedTtl = data is Map ? data['expires_in'] : null;
    if (response.status < 200 ||
        response.status >= 300 ||
        signedUrl == null ||
        returnedTtl != kMtgSealedImageSignedUrlTtlSecondsV1) {
      throw StateError('Missing signed sealed image URL.');
    }
    return signedUrl;
  }
}

class MtgSealedClientV1 {
  const MtgSealedClientV1({required MtgSealedClientTransportV1 transport})
    : _transport = transport;

  static final RegExp _uuid = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );
  static final RegExp _sha256 = RegExp(r'^[0-9a-f]{64}$');
  static final RegExp _imagePath = RegExp(
    r'^sealed/mtg/sha256/([0-9a-f]{2})/([0-9a-f]{64})\.(jpg|png|gif|webp)$',
  );

  final MtgSealedClientTransportV1 _transport;

  Future<MtgSealedCatalogStateV1> load({
    String? query,
    int limit = 50,
    int offset = 0,
  }) async {
    if (!kMtgSealedClientV1Enabled) {
      return MtgSealedCatalogStateV1.disabled;
    }

    try {
      if (!await _transport.isAuthenticated()) {
        return MtgSealedCatalogStateV1.signedOut;
      }
      final response = await _transport.fetchRows(
        gameKey: 'mtg',
        query: _text(query),
        limit: limit.clamp(1, 100).toInt(),
        offset: offset < 0 ? 0 : offset,
      );
      final classified = classifyRows(response);
      if (classified.status != MtgSealedCatalogStatusV1.ready) {
        return classified;
      }
      final resolved = await Future.wait(
        classified.rows.map((row) async {
          final imageUrl = await _transport.createSignedImageUrl(
            bucket: row.imageStorageBucket,
            objectPath: row.imageObjectPath,
            expiresInSeconds: kMtgSealedImageSignedUrlTtlSecondsV1,
          );
          return row.withImageUrl(imageUrl);
        }),
      );
      return MtgSealedCatalogStateV1(
        status: MtgSealedCatalogStatusV1.ready,
        rows: resolved,
      );
    } catch (error) {
      final message = error.toString();
      return MtgSealedCatalogStateV1(
        status: _isNetworkFailure(error)
            ? MtgSealedCatalogStatusV1.offline
            : MtgSealedCatalogStatusV1.error,
        message: message,
      );
    }
  }

  static MtgSealedCatalogStateV1 classifyRows(dynamic value, {DateTime? now}) {
    if (value is! List) {
      return const MtgSealedCatalogStateV1(
        status: MtgSealedCatalogStatusV1.error,
        message: 'Invalid sealed catalog response.',
      );
    }
    if (value.isEmpty) return MtgSealedCatalogStateV1.empty;

    final parsed = value
        .map((row) => _parseRow(row, now?.toUtc() ?? DateTime.now().toUtc()))
        .toList(growable: false);
    final invalidCount = parsed
        .where((row) => row.kind == _RowKind.invalid)
        .length;
    final staleCount = parsed.where((row) => row.kind == _RowKind.stale).length;
    final missingImageCount = parsed
        .where((row) => row.kind == _RowKind.missingImage)
        .length;
    if (invalidCount > 0) {
      return const MtgSealedCatalogStateV1(
        status: MtgSealedCatalogStatusV1.error,
        message: 'Sealed catalog evidence did not validate.',
      );
    }
    if (staleCount > 0) {
      return MtgSealedCatalogStateV1(
        status: MtgSealedCatalogStatusV1.stale,
        withheldRows: staleCount,
      );
    }
    if (missingImageCount > 0) {
      return MtgSealedCatalogStateV1(
        status: MtgSealedCatalogStatusV1.missingImage,
        withheldRows: missingImageCount,
      );
    }
    return MtgSealedCatalogStateV1(
      status: MtgSealedCatalogStatusV1.ready,
      rows: parsed.map((row) => row.row!).toList(growable: false),
    );
  }

  static _ParsedRow _parseRow(dynamic value, DateTime now) {
    if (value is! Map) return const _ParsedRow(_RowKind.invalid);
    final row = Map<String, dynamic>.from(value);
    if (<String>[
      'selected_source_url',
      'source_image_url',
      'external_image_url',
      'image_url',
    ].any((key) => _text(row[key]) != null)) {
      return const _ParsedRow(_RowKind.invalid);
    }

    final priceReleaseId = _text(row['price_release_id']);
    final imageReleaseId = _text(row['image_release_id']);
    final familyId = _text(row['family_id']);
    final variantId = _text(row['variant_id']);
    final canonicalName = _text(row['canonical_name']);
    final packageForm = _text(row['package_form']);
    final observedOn = _text(row['observed_on']);
    final marketPrice = _positiveNumber(row['market_price']);
    if (priceReleaseId == null ||
        !_uuid.hasMatch(priceReleaseId) ||
        imageReleaseId == null ||
        !_uuid.hasMatch(imageReleaseId) ||
        familyId == null ||
        !_uuid.hasMatch(familyId) ||
        variantId == null ||
        !_uuid.hasMatch(variantId) ||
        canonicalName == null ||
        packageForm == null ||
        observedOn == null ||
        marketPrice == null ||
        _text(row['game_key']) != 'mtg' ||
        _text(row['language_code']) != 'en' ||
        _text(row['source_provider']) != 'tcgplayer' ||
        _text(row['currency']) != 'USD') {
      return const _ParsedRow(_RowKind.invalid);
    }

    final age = _ageInDays(observedOn, now);
    if (age == null) return const _ParsedRow(_RowKind.invalid);
    if (age < 0 || age > 7) return const _ParsedRow(_RowKind.stale);

    final imageStorageBucket = _text(row['image_storage_bucket']);
    final imageObjectPath = _text(row['image_object_path']);
    final imageContentSha256 = _text(row['image_content_sha256']);
    final imageMime = _text(row['image_mime']);
    final imageWidth = _positiveInteger(row['image_width']);
    final imageHeight = _positiveInteger(row['image_height']);
    final imageBytes = _positiveInteger(row['image_bytes']);
    final pathMatch = imageObjectPath == null
        ? null
        : _imagePath.firstMatch(imageObjectPath);
    final expectedMime = pathMatch == null
        ? null
        : const <String, String>{
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
          }[pathMatch.group(3)];
    if (imageStorageBucket != 'user-card-images' ||
        pathMatch == null ||
        imageContentSha256 == null ||
        !_sha256.hasMatch(imageContentSha256) ||
        pathMatch.group(1) != imageContentSha256.substring(0, 2) ||
        pathMatch.group(2) != imageContentSha256 ||
        expectedMime != imageMime ||
        imageMime == null ||
        !const <String>[
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ].contains(imageMime) ||
        imageWidth == null ||
        imageHeight == null ||
        imageBytes == null) {
      return const _ParsedRow(_RowKind.missingImage);
    }

    return _ParsedRow(
      _RowKind.ready,
      MtgSealedCatalogRowV1(
        priceReleaseId: priceReleaseId,
        imageReleaseId: imageReleaseId,
        familyId: familyId,
        variantId: variantId,
        canonicalName: canonicalName,
        packageForm: packageForm,
        languageCode: 'en',
        regionCode: _text(row['region_code']),
        edition: _text(row['edition']),
        wave: _text(row['wave']),
        releaseDate: _text(row['release_date']),
        observedOn: observedOn,
        currency: 'USD',
        marketPrice: marketPrice,
        imageStorageBucket: 'user-card-images',
        imageObjectPath: imageObjectPath!,
        imageContentSha256: imageContentSha256,
        imageMime: imageMime,
        imageWidth: imageWidth,
        imageHeight: imageHeight,
        imageBytes: imageBytes,
      ),
    );
  }

  static String? _text(dynamic value) {
    if (value is! String) return null;
    final normalized = value.trim();
    return normalized.isEmpty ? null : normalized;
  }

  static double? _positiveNumber(dynamic value) {
    final parsed = switch (value) {
      num number => number.toDouble(),
      String string when RegExp(r'^\d+(?:\.\d+)?$').hasMatch(string.trim()) =>
        double.tryParse(string),
      _ => null,
    };
    return parsed != null && parsed.isFinite && parsed > 0 ? parsed : null;
  }

  static int? _positiveInteger(dynamic value) {
    final parsed = value is int ? value : int.tryParse(value?.toString() ?? '');
    return parsed != null && parsed > 0 ? parsed : null;
  }

  static int? _ageInDays(String value, DateTime now) {
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) return null;
    final parsed = DateTime.tryParse('${value}T00:00:00.000Z');
    if (parsed == null || parsed.toIso8601String().substring(0, 10) != value) {
      return null;
    }
    final today = DateTime.utc(now.year, now.month, now.day);
    return today.difference(parsed).inDays;
  }

  static bool _isNetworkFailure(Object error) {
    return RegExp(
      r'network|offline|timeout|timed out|failed to fetch|socket',
      caseSensitive: false,
    ).hasMatch(error.toString());
  }
}

enum _RowKind { ready, missingImage, stale, invalid }

class _ParsedRow {
  const _ParsedRow(this.kind, [this.row]);

  final _RowKind kind;
  final MtgSealedCatalogRowV1? row;
}
