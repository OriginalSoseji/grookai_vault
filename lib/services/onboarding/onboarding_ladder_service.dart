import 'package:supabase_flutter/supabase_flutter.dart';

const bool kOnboardingLadderEnabled = bool.fromEnvironment(
  'ONBOARDING_LADDER_ENABLED',
  defaultValue: true,
);

class OnboardingLadderState {
  const OnboardingLadderState({
    this.userId = '',
    this.ownedCardPrintId = '',
    this.wantedCardPrintId = '',
    this.firstFollowedUserId = '',
    this.needsOwned = true,
    this.needsWanted = true,
    this.shouldShowLoopPromise = false,
    this.shouldShowCollectorSuggestions = false,
    this.isComplete = false,
    this.isDismissed = false,
    this.dismissedForeverAt,
  });

  final String userId;
  final String ownedCardPrintId;
  final String wantedCardPrintId;
  final String firstFollowedUserId;
  final bool needsOwned;
  final bool needsWanted;
  final bool shouldShowLoopPromise;
  final bool shouldShowCollectorSuggestions;
  final bool isComplete;
  final bool isDismissed;
  final DateTime? dismissedForeverAt;

  bool get hasOwned => ownedCardPrintId.isNotEmpty || !needsOwned;
  bool get hasWanted => wantedCardPrintId.isNotEmpty || !needsWanted;
  bool get hasFollowed => firstFollowedUserId.isNotEmpty;

  static OnboardingLadderState fromJson(Map<String, dynamic> json) {
    return OnboardingLadderState(
      userId: _text(json['user_id']),
      ownedCardPrintId: _text(json['owned_card_print_id']),
      wantedCardPrintId: _text(json['wanted_card_print_id']),
      firstFollowedUserId: _text(json['first_followed_user_id']),
      needsOwned: json['needs_owned'] == true,
      needsWanted: json['needs_wanted'] == true,
      shouldShowLoopPromise: json['should_show_loop_promise'] == true,
      shouldShowCollectorSuggestions:
          json['should_show_collector_suggestions'] == true,
      isComplete: json['is_complete'] == true,
      isDismissed: json['is_dismissed'] == true,
      dismissedForeverAt: _date(json['dismissed_forever_at']),
    );
  }
}

class OnboardingCollectorSuggestion {
  const OnboardingCollectorSuggestion({
    required this.collectorUserId,
    required this.displayName,
    this.avatarUrl,
    this.overlapSummary,
    this.proximityLabel,
    this.sampleImageUrl,
  });

  final String collectorUserId;
  final String displayName;
  final String? avatarUrl;
  final String? overlapSummary;
  final String? proximityLabel;
  final String? sampleImageUrl;

  String get reasonLine {
    final overlap = _text(overlapSummary);
    if (overlap.isNotEmpty) return overlap;
    final proximity = _text(proximityLabel);
    if (proximity.isNotEmpty) return proximity;
    return 'Shares collector overlap';
  }

  static OnboardingCollectorSuggestion fromJson(Map<String, dynamic> json) {
    return OnboardingCollectorSuggestion(
      collectorUserId: _firstText(json, const [
        'collector_user_id',
        'user_id',
        'followed_user_id',
      ]),
      displayName: _firstText(json, const [
        'display_name',
        'collector_display_name',
        'name',
      ]),
      avatarUrl: _firstOptionalText(json, const [
        'avatar_url',
        'collector_avatar_url',
      ]),
      overlapSummary: _firstOptionalText(json, const [
        'overlap_summary',
        'reason',
        'reason_line',
      ]),
      proximityLabel: _firstOptionalText(json, const [
        'proximity_label',
        'area_label',
        'locality_label',
      ]),
      sampleImageUrl: _sampleImage(json),
    );
  }
}

class OnboardingSearchCard {
  const OnboardingSearchCard({
    required this.cardPrintId,
    required this.name,
    this.gvId,
    this.setCode,
    this.number,
    this.imageUrl,
  });

  final String cardPrintId;
  final String name;
  final String? gvId;
  final String? setCode;
  final String? number;
  final String? imageUrl;

  String get meta {
    final parts = <String>[
      if (_text(setCode).isNotEmpty) _text(setCode),
      if (_text(number).isNotEmpty) '#${_text(number)}',
    ];
    return parts.join(' ');
  }

  static OnboardingSearchCard fromJson(Map<String, dynamic> json) {
    return OnboardingSearchCard(
      cardPrintId: _text(json['id']),
      name: _text(json['name']).isEmpty ? 'Pokemon card' : _text(json['name']),
      gvId: _optionalText(json['gv_id']),
      setCode: _optionalText(json['set_code']),
      number:
          _optionalText(json['number']) ?? _optionalText(json['number_plain']),
      imageUrl:
          _httpUrl(json['display_image_url']) ??
          _httpUrl(json['image_url']) ??
          _httpUrl(json['image_alt_url']) ??
          _httpUrl(json['representative_image_url']),
    );
  }
}

class OnboardingLadderService {
  const OnboardingLadderService({required this.client});

  final SupabaseClient client;

  Future<OnboardingLadderState> loadState() async {
    final raw = await client.rpc('onboarding_ladder_state_v1');
    final row = _firstRow(raw);
    return OnboardingLadderState.fromJson(row ?? const <String, dynamic>{});
  }

  Future<OnboardingLadderState> recordOwned({
    required String cardPrintId,
    required String source,
  }) {
    return _record(
      eventType: 'rung_1_owned',
      cardPrintId: cardPrintId,
      source: _ownedSource(source),
    );
  }

  Future<OnboardingLadderState> recordWanted({
    required String cardPrintId,
    required String source,
  }) {
    return _record(
      eventType: 'rung_1_wanted',
      cardPrintId: cardPrintId,
      source: _wantedSource(source),
    );
  }

  Future<OnboardingLadderState> recordLoopPromiseShown() {
    return _record(eventType: 'loop_promise_shown');
  }

  Future<OnboardingLadderState> recordFollowed({
    required String collectorUserId,
    Map<String, dynamic>? payload,
  }) {
    return _record(
      eventType: 'rung_2_followed',
      collectorUserId: collectorUserId,
      payload: payload,
    );
  }

  Future<OnboardingLadderState> skip({String scope = 'step'}) async {
    final raw = await client.rpc(
      'onboarding_skip_v1',
      params: {'p_scope': scope},
    );
    final row = _firstRow(raw);
    return OnboardingLadderState.fromJson(row ?? const <String, dynamic>{});
  }

  Future<List<OnboardingCollectorSuggestion>> loadCollectorSuggestions({
    int limit = 3,
  }) async {
    final raw = await client.rpc(
      'onboarding_collector_suggestions_v1',
      params: {'p_limit': limit},
    );
    if (raw is! List) return const <OnboardingCollectorSuggestion>[];
    return raw
        .whereType<Map>()
        .map(
          (row) => OnboardingCollectorSuggestion.fromJson(
            Map<String, dynamic>.from(row),
          ),
        )
        .where((row) => row.collectorUserId.isNotEmpty)
        .take(limit)
        .toList(growable: false);
  }

  Future<List<OnboardingSearchCard>> searchCards(String query) async {
    final normalized = query.trim();
    if (normalized.length < 2) return const <OnboardingSearchCard>[];
    final rows = await client
        .from('card_prints')
        .select(
          'id,gv_id,name,set_code,number,number_plain,image_url,image_alt_url,representative_image_url',
        )
        .ilike('name', '%$normalized%')
        .limit(6);
    return rows
        .whereType<Map>()
        .map(
          (row) =>
              OnboardingSearchCard.fromJson(Map<String, dynamic>.from(row)),
        )
        .where((row) => row.cardPrintId.isNotEmpty)
        .toList(growable: false);
  }

  Future<Map<String, OnboardingSearchCard>> loadCardsById(
    Iterable<String> cardPrintIds,
  ) async {
    final ids = cardPrintIds
        .map(_text)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (ids.isEmpty) return const <String, OnboardingSearchCard>{};
    final rows = await client
        .from('card_prints')
        .select(
          'id,gv_id,name,set_code,number,number_plain,image_url,image_alt_url,representative_image_url',
        )
        .inFilter('id', ids);
    final cards = <String, OnboardingSearchCard>{};
    for (final row in rows.whereType<Map>()) {
      final card = OnboardingSearchCard.fromJson(
        Map<String, dynamic>.from(row),
      );
      if (card.cardPrintId.isNotEmpty) {
        cards[card.cardPrintId] = card;
      }
    }
    return cards;
  }

  Future<OnboardingLadderState> _record({
    required String eventType,
    String? cardPrintId,
    String? collectorUserId,
    String? source,
    Map<String, dynamic>? payload,
  }) async {
    final raw = await client.rpc(
      'onboarding_record_rung_v1',
      params: {
        'p_event_type': eventType,
        'p_card_print_id': _nullableUuid(cardPrintId),
        'p_collector_user_id': _nullableUuid(collectorUserId),
        'p_source': _optionalText(source),
        'p_payload': payload ?? const <String, dynamic>{},
      },
    );
    final row = _firstRow(raw);
    return OnboardingLadderState.fromJson(row ?? const <String, dynamic>{});
  }

  static Future<void> recordOwnedBestEffort({
    required SupabaseClient client,
    required String cardPrintId,
    required String source,
  }) async {
    if (!kOnboardingLadderEnabled) return;
    try {
      await OnboardingLadderService(
        client: client,
      ).recordOwned(cardPrintId: cardPrintId, source: source);
    } catch (_) {}
  }

  static Future<void> recordWantedBestEffort({
    required SupabaseClient client,
    required String cardPrintId,
    required String source,
  }) async {
    if (!kOnboardingLadderEnabled) return;
    try {
      await OnboardingLadderService(
        client: client,
      ).recordWanted(cardPrintId: cardPrintId, source: source);
    } catch (_) {}
  }
}

Map<String, dynamic>? _firstRow(dynamic raw) {
  if (raw is List && raw.isNotEmpty && raw.first is Map) {
    return Map<String, dynamic>.from(raw.first as Map);
  }
  if (raw is Map) return Map<String, dynamic>.from(raw);
  return null;
}

String _ownedSource(String source) {
  final normalized = source.trim().toLowerCase();
  return normalized == 'scan' ? 'scan' : 'search';
}

String _wantedSource(String source) {
  final normalized = source.trim().toLowerCase();
  return normalized.contains('set') ? 'set_browse' : 'search';
}

String? _nullableUuid(String? value) {
  final normalized = _text(value);
  return normalized.isEmpty ? null : normalized;
}

String _firstText(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = _text(json[key]);
    if (value.isNotEmpty) return value;
  }
  return '';
}

String? _firstOptionalText(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = _optionalText(json[key]);
    if (value != null) return value;
  }
  return null;
}

String? _sampleImage(Map<String, dynamic> json) {
  final direct = _firstOptionalText(json, const [
    'sample_image_url',
    'image_url',
    'card_image_url',
  ]);
  if (_httpUrl(direct) != null) return direct;
  final raw = json['sample_card_images'];
  if (raw is List) {
    for (final value in raw) {
      final url = _httpUrl(value);
      if (url != null) return url;
    }
  }
  return null;
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

String? _httpUrl(dynamic value) {
  final normalized = _text(value);
  if (normalized.isEmpty) return null;
  final uri = Uri.tryParse(normalized);
  if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
    return null;
  }
  return normalized;
}
