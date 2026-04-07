import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const int kMaxCompareCards = 4;
const int kMinCompareCards = 2;

final RegExp _compareCardIdPattern = RegExp(
  r'^GV-[A-Z0-9]+(?:-[A-Z0-9.]+)+$',
);

String normalizeCompareCardId(String value) {
  final normalized = value.trim().toUpperCase();
  return _compareCardIdPattern.hasMatch(normalized) ? normalized : '';
}

List<String> normalizeCompareCardIds(Iterable<String> values) {
  final seen = <String>{};
  final normalized = <String>[];

  for (final value in values) {
    final candidate = normalizeCompareCardId(value);
    if (candidate.isEmpty || seen.contains(candidate)) {
      continue;
    }

    seen.add(candidate);
    normalized.add(candidate);

    if (normalized.length >= kMaxCompareCards) {
      break;
    }
  }

  return normalized;
}

class CompareCardSelectionController {
  CompareCardSelectionController._();

  static final CompareCardSelectionController instance =
      CompareCardSelectionController._();

  final ValueNotifier<List<String>> _selectedIds =
      ValueNotifier<List<String>>(const []);

  ValueListenable<List<String>> get listenable => _selectedIds;

  List<String> get selectedIds => List<String>.unmodifiable(_selectedIds.value);

  bool contains(String? gvId) {
    if (gvId == null) {
      return false;
    }

    final normalized = normalizeCompareCardId(gvId);
    return normalized.isNotEmpty && _selectedIds.value.contains(normalized);
  }

  void clear() {
    _selectedIds.value = const [];
  }

  void toggle(String gvId) {
    final normalized = normalizeCompareCardId(gvId);
    if (normalized.isEmpty) {
      return;
    }

    final current = List<String>.from(_selectedIds.value);
    if (current.contains(normalized)) {
      current.remove(normalized);
    } else if (current.length < kMaxCompareCards) {
      current.add(normalized);
    }

    _selectedIds.value = normalizeCompareCardIds(current);
  }
}

class ComparePublicCard {
  const ComparePublicCard({
    required this.id,
    required this.gvId,
    required this.name,
    required this.number,
    this.setName,
    this.setCode,
    this.rarity,
    this.releaseYear,
    this.artist,
    this.imageUrl,
    this.rawPrice,
    this.rawPriceSource,
    this.rawPriceTimestamp,
    this.variantKey,
  });

  final String id;
  final String gvId;
  final String name;
  final String number;
  final String? setName;
  final String? setCode;
  final String? rarity;
  final int? releaseYear;
  final String? artist;
  final String? imageUrl;
  final double? rawPrice;
  final String? rawPriceSource;
  final String? rawPriceTimestamp;
  final String? variantKey;

  String? get variantLabel {
    final key = (variantKey ?? '').trim();
    if (key.isEmpty) {
      return null;
    }

    return key
        .split(RegExp(r'[_-]+'))
        .where((part) => part.isNotEmpty)
        .map((part) {
          final lower = part.toLowerCase();
          return '${lower[0].toUpperCase()}${lower.substring(1)}';
        })
        .join(' ');
  }
}

class PublicCompareService {
  static Future<List<ComparePublicCard>> fetchCardsByGvIds({
    required SupabaseClient client,
    required Iterable<String> gvIds,
  }) async {
    final normalizedIds = normalizeCompareCardIds(gvIds);
    if (normalizedIds.isEmpty) {
      return const [];
    }

    final rows = await client
        .from('card_prints')
        .select(
          'id,gv_id,name,set_code,number,rarity,artist,image_url,image_alt_url,variant_key,sets(name,release_date)',
        )
        .inFilter('gv_id', normalizedIds);

    final normalizedRows = (rows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .where((row) => _cleanText(row['gv_id']).isNotEmpty)
        .toList();

    final cardIds = normalizedRows
        .map((row) => _cleanText(row['id']))
        .where((value) => value.isNotEmpty)
        .toList();

    final priceByCardId = <String, Map<String, dynamic>>{};
    if (cardIds.isNotEmpty) {
      final priceRows = await client
          .from('v_best_prices_all_gv_v1')
          .select('card_id,base_market,base_source,base_ts')
          .inFilter('card_id', cardIds);

      for (final rawRow in priceRows as List<dynamic>) {
        final row = Map<String, dynamic>.from(rawRow as Map);
        final cardId = _cleanText(row['card_id']);
        if (cardId.isNotEmpty) {
          priceByCardId[cardId] = row;
        }
      }
    }

    final rowByGvId = <String, Map<String, dynamic>>{};
    for (final row in normalizedRows) {
      final gvId = _cleanText(row['gv_id']);
      if (gvId.isNotEmpty) {
        rowByGvId[gvId] = row;
      }
    }

    return normalizedIds.map((gvId) {
      final row = rowByGvId[gvId];
      if (row == null) {
        return null;
      }

      final setRecord = _extractSetRecord(row['sets']);
      final cardId = _cleanText(row['id']);
      final priceRow = priceByCardId[cardId];

      return ComparePublicCard(
        id: cardId.isEmpty ? gvId : cardId,
        gvId: gvId,
        name: _cleanText(row['name']).isEmpty ? 'Unknown card' : _cleanText(row['name']),
        setName: _normalizeOptionalText(setRecord?['name']),
        setCode: _normalizeOptionalText(row['set_code']),
        number: _cleanText(row['number']).isEmpty ? '—' : _cleanText(row['number']),
        rarity: _normalizeOptionalText(row['rarity']),
        releaseYear: _parseReleaseYear(setRecord?['release_date']),
        artist: _normalizeOptionalText(row['artist']),
        imageUrl: _bestImageUrl(
          primary: row['image_url'],
          fallback: row['image_alt_url'],
        ),
        rawPrice: priceRow?['base_market'] is num
            ? (priceRow!['base_market'] as num).toDouble()
            : null,
        rawPriceSource: _normalizeOptionalText(priceRow?['base_source']),
        rawPriceTimestamp: _normalizeOptionalText(priceRow?['base_ts']),
        variantKey: _normalizeOptionalText(row['variant_key']),
      );
    }).whereType<ComparePublicCard>().toList();
  }

  static Map<String, dynamic>? _extractSetRecord(dynamic rawValue) {
    if (rawValue is List && rawValue.isNotEmpty && rawValue.first is Map) {
      return Map<String, dynamic>.from(rawValue.first as Map);
    }

    if (rawValue is Map) {
      return Map<String, dynamic>.from(rawValue);
    }

    return null;
  }

  static int? _parseReleaseYear(dynamic rawDate) {
    final value = _cleanText(rawDate);
    final match = RegExp(r'^(\d{4})').firstMatch(value);
    if (match == null) {
      return null;
    }

    final parsed = int.tryParse(match.group(1)!);
    return parsed;
  }

  static String? _bestImageUrl({
    required dynamic primary,
    required dynamic fallback,
  }) {
    final primaryUrl = _normalizeHttpUrl(primary);
    if (primaryUrl != null) {
      return primaryUrl;
    }

    return _normalizeHttpUrl(fallback);
  }

  static String? _normalizeOptionalText(dynamic value) {
    final cleaned = _cleanText(value);
    return cleaned.isEmpty ? null : cleaned;
  }

  static String _cleanText(dynamic value) {
    return (value ?? '').toString().trim();
  }

  static String? _normalizeHttpUrl(dynamic value) {
    final url = _cleanText(value);
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
}
