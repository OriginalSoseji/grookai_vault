import 'package:supabase_flutter/supabase_flutter.dart';

class CardPrint {
  CardPrint({
    required this.id,
    required this.name,
    required this.setCode,
    this.setName,
    this.number,
    this.numberPlain,
    this.rarity,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String setCode;
  final String? setName;
  final String? number;
  final String? numberPlain;
  final String? rarity;
  final String? imageUrl;

  String get displaySet => (setName ?? '').isNotEmpty ? setName! : setCode;
  String get displayNumber =>
      (numberPlain ?? '').isNotEmpty ? numberPlain! : (number ?? '');
  String? get displayImage => (imageUrl ?? '').isNotEmpty ? imageUrl : null;

  factory CardPrint.fromJson(Map<String, dynamic> json) {
    final set = json['set'] as Map<String, dynamic>?;
    return CardPrint(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      setCode: (json['set_code'] ?? '').toString(),
      setName: set != null ? (set['name'] ?? '').toString() : null,
      number: json['number']?.toString(),
      numberPlain: json['number_plain']?.toString(),
      rarity: json['rarity']?.toString(),
      imageUrl: json['image_url']?.toString(),
    );
  }
}

const _cardPrintSelect =
    'id,name,number,number_plain,rarity,set_code,image_url,set:sets(name,code)';

class CardPrintRepository {
  static Future<List<CardPrint>> searchCardPrints({
    required SupabaseClient client,
    String? query,
    int defaultLimit = 200,
    int searchLimit = 500,
  }) async {
    final raw = query ?? '';
    final trimmed = raw.trim();

    // -----------------------
    // Mode 0: Empty query -> default catalog page
    // -----------------------
    if (trimmed.isEmpty) {
      final List<dynamic> data = await client
          .from('card_prints')
          .select(_cardPrintSelect)
          .order('name', ascending: true)
          .limit(defaultLimit);

      // ignore: avoid_print
      print('[catalog] mode=empty -> ${data.length} rows');

      return data
          .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
          .toList();
    }

    final lower = trimmed.toLowerCase();
    final parts = lower.split(RegExp(r'\\s+|-'));

    final maybeSet = parts.isNotEmpty ? parts.first : '';
    final maybeNumber = parts.length > 1 ? parts.last : '';

    bool looksLikeCode(String s) => RegExp(r'^[a-z]{2,4}\\d*$').hasMatch(s);
    bool looksLikeNumber(String s) => RegExp(r'^\\d{1,4}[a-z]?$').hasMatch(s);

    final isSetPlusNumber =
        looksLikeCode(maybeSet) && looksLikeNumber(maybeNumber);
    final isSetOnly = looksLikeCode(maybeSet) && parts.length == 1;
    final isNumberOnly = looksLikeNumber(trimmed) && parts.length == 1;

    List<dynamic> data;
    String mode;

    // -----------------------
    // Mode 1: set + number (e.g., "sv2 143", "sv02-143")
    // -----------------------
    if (isSetPlusNumber) {
      mode = 'set+number';
      final setCode = maybeSet;
      final numPart = maybeNumber;

      data = await client
          .from('card_prints')
          .select(_cardPrintSelect)
          .eq('set_code', setCode)
          .or('number.eq.$numPart,number_plain.eq.$numPart')
          .order('name', ascending: true)
          .limit(searchLimit);

    // -----------------------
    // Mode 2: set-only (e.g., "sv2")
    // -----------------------
    } else if (isSetOnly) {
      mode = 'set';
      final setCode = maybeSet;

      data = await client
          .from('card_prints')
          .select(_cardPrintSelect)
          .eq('set_code', setCode)
          .order('name', ascending: true)
          .limit(searchLimit);

    // -----------------------
    // Mode 3: number-only (e.g., "143")
    // -----------------------
    } else if (isNumberOnly) {
      mode = 'number';
      final numPart = trimmed;

      data = await client
          .from('card_prints')
          .select(_cardPrintSelect)
          .or('number.eq.$numPart,number_plain.eq.$numPart')
          .order('name', ascending: true)
          .limit(searchLimit);

    // -----------------------
    // Mode 4: name search (e.g., "charizard")
    // -----------------------
    } else {
      mode = 'name';
      final pattern = '%$trimmed%';

      data = await client
          .from('card_prints')
          .select(_cardPrintSelect)
          .ilike('name', pattern)
          .order('name', ascending: true)
          .limit(searchLimit);
    }

    // ignore: avoid_print
    print('[catalog] mode=$mode query="$trimmed" -> ${data.length} hits');

    var results = data
        .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
        .toList();

    // -----------------------
    // Simple fallback for name mode: relax search if no hits
    // -----------------------
    if (results.isEmpty && mode == 'name') {
      final tokens = trimmed.split(' ');
      if (tokens.length > 1) {
        final first = tokens.first;
        final relaxedPattern = '%$first%';

        final List<dynamic> data2 = await client
            .from('card_prints')
            .select(_cardPrintSelect)
            .ilike('name', relaxedPattern)
            .order('name', ascending: true)
            .limit(searchLimit);

        // ignore: avoid_print
        print('[catalog] mode=name-fallback query="$trimmed" -> ${data2.length} hits');

        results = data2
            .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
            .toList();
      }
    }

    return results;
  }

  static Future<List<CardPrint>> fetchTrending({
    required SupabaseClient client,
    int limitPerName = 8,
  }) async {
    const popularNames = [
      'Charizard',
      'Pikachu',
      'Gardevoir',
      'Mewtwo',
      'Lugia',
      'Umbreon',
      'Rayquaza',
      'Eevee',
    ];

    final List<CardPrint> trending = [];

    for (final name in popularNames) {
      final List<dynamic> data = await client
          .from('card_prints')
          .select(_cardPrintSelect)
          .ilike('name', '%$name%')
          .order('name', ascending: true)
          .limit(limitPerName);

      trending.addAll(
        data
            .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
            .toList(),
      );
    }

    return trending;
  }
}
