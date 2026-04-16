import 'package:supabase_flutter/supabase_flutter.dart';

const String _kFounderEmail = 'ccabrl@gmail.com';
const String _kFounderSignalsFunction = 'founder-market-signals-mobile-v1';
const String _kFounderSignalDrilldownFunction =
    'founder-signal-drill-mobile-v1';

enum FounderInsightRowType { card, set }

class FounderInsightBundle {
  const FounderInsightBundle({
    required this.generatedAt,
    required this.sections,
  });

  final DateTime? generatedAt;
  final List<FounderInsightSection> sections;

  factory FounderInsightBundle.fromJson(Map<String, dynamic> json) {
    final rawSections = json['sections'];
    final sections = rawSections is List
        ? rawSections
              .whereType<Map>()
              .map(
                (section) => FounderInsightSection.fromJson(
                  Map<String, dynamic>.from(section),
                ),
              )
              .toList(growable: false)
        : const <FounderInsightSection>[];

    return FounderInsightBundle(
      generatedAt: _parseDateTime(json['generated_at']),
      sections: sections,
    );
  }
}

class FounderInsightSection {
  const FounderInsightSection({
    required this.key,
    required this.title,
    required this.description,
    required this.scoreLabel,
    required this.rowType,
    required this.emptyMessage,
    required this.cardRows,
    required this.setRows,
  });

  final String key;
  final String title;
  final String description;
  final String scoreLabel;
  final FounderInsightRowType rowType;
  final String emptyMessage;
  final List<FounderInsightCardRow> cardRows;
  final List<FounderInsightSetRow> setRows;

  bool get hasRows => rowType == FounderInsightRowType.set
      ? setRows.isNotEmpty
      : cardRows.isNotEmpty;

  factory FounderInsightSection.fromJson(Map<String, dynamic> json) {
    final rowType = _parseRowType(json['row_type']?.toString());
    final rawRows = json['rows'];
    final rows = rawRows is List ? rawRows.whereType<Map>().toList() : const [];

    return FounderInsightSection(
      key: json['key']?.toString() ?? 'section',
      title: json['title']?.toString() ?? 'Section',
      description: json['description']?.toString() ?? '',
      scoreLabel: json['score_label']?.toString() ?? 'Score',
      rowType: rowType,
      emptyMessage:
          json['empty_message']?.toString() ??
          'Signals will appear as collectors use the app.',
      cardRows: rowType == FounderInsightRowType.card
          ? rows
                .map(
                  (row) => FounderInsightCardRow.fromJson(
                    Map<String, dynamic>.from(row),
                  ),
                )
                .toList(growable: false)
          : const <FounderInsightCardRow>[],
      setRows: rowType == FounderInsightRowType.set
          ? rows
                .map(
                  (row) => FounderInsightSetRow.fromJson(
                    Map<String, dynamic>.from(row),
                  ),
                )
                .toList(growable: false)
          : const <FounderInsightSetRow>[],
    );
  }
}

class FounderInsightCardRow {
  const FounderInsightCardRow({
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.setCode,
    required this.setName,
    required this.number,
    required this.variantKey,
    required this.printedIdentityModifier,
    required this.setIdentityModel,
    required this.imageUrl,
    required this.imageAltUrl,
    required this.score,
    required this.reason,
    required this.signalBreakdown,
    required this.recommendation,
  });

  final String cardPrintId;
  final String? gvId;
  final String name;
  final String? setCode;
  final String? setName;
  final String? number;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;
  final String? imageUrl;
  final String? imageAltUrl;
  final int score;
  final String reason;
  final Map<String, int> signalBreakdown;
  final String? recommendation;

  String? get preferredImageUrl => imageUrl ?? imageAltUrl;

  factory FounderInsightCardRow.fromJson(Map<String, dynamic> json) {
    return FounderInsightCardRow(
      cardPrintId: json['card_print_id']?.toString() ?? '',
      gvId: _nullableString(json['gv_id']),
      name: json['name']?.toString() ?? 'Unknown card',
      setCode: _nullableString(json['set_code']),
      setName: _nullableString(json['set_name']),
      number: _nullableString(json['number']),
      variantKey: _nullableString(json['variant_key']),
      printedIdentityModifier: _nullableString(
        json['printed_identity_modifier'],
      ),
      setIdentityModel: _nullableString(json['set_identity_model']),
      imageUrl: _nullableString(json['image_url']),
      imageAltUrl: _nullableString(json['image_alt_url']),
      score: _parseInt(json['score']),
      reason: json['reason']?.toString() ?? '',
      signalBreakdown: _parseBreakdown(
        json['signal_breakdown'] ?? json['breakdown'],
      ),
      recommendation: _nullableString(json['recommendation']),
    );
  }
}

class FounderInsightSetRow {
  const FounderInsightSetRow({
    required this.setId,
    required this.setCode,
    required this.setName,
    required this.score,
    required this.reason,
    required this.signalBreakdown,
  });

  final String? setId;
  final String? setCode;
  final String? setName;
  final int score;
  final String reason;
  final Map<String, int> signalBreakdown;

  factory FounderInsightSetRow.fromJson(Map<String, dynamic> json) {
    return FounderInsightSetRow(
      setId: _nullableString(json['set_id']),
      setCode: _nullableString(json['set_code']),
      setName: _nullableString(json['set_name']),
      score: _parseInt(json['score']),
      reason: json['reason']?.toString() ?? '',
      signalBreakdown: _parseBreakdown(json['signal_breakdown']),
    );
  }
}

class FounderSignalCardIdentity {
  const FounderSignalCardIdentity({
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.setId,
    required this.setCode,
    required this.setName,
    required this.number,
    required this.variantKey,
    required this.printedIdentityModifier,
    required this.setIdentityModel,
    required this.imageUrl,
    required this.imageAltUrl,
  });

  final String cardPrintId;
  final String? gvId;
  final String name;
  final String? setId;
  final String? setCode;
  final String? setName;
  final String? number;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;
  final String? imageUrl;
  final String? imageAltUrl;

  String? get preferredImageUrl => imageUrl ?? imageAltUrl;

  factory FounderSignalCardIdentity.fromJson(Map<String, dynamic> json) {
    return FounderSignalCardIdentity(
      cardPrintId: json['card_print_id']?.toString() ?? '',
      gvId: _nullableString(json['gv_id']),
      name: json['name']?.toString() ?? 'Unknown card',
      setId: _nullableString(json['set_id']),
      setCode: _nullableString(json['set_code']),
      setName: _nullableString(json['set_name']),
      number: _nullableString(json['number']),
      variantKey: _nullableString(json['variant_key']),
      printedIdentityModifier: _nullableString(
        json['printed_identity_modifier'],
      ),
      setIdentityModel: _nullableString(json['set_identity_model']),
      imageUrl: _nullableString(json['image_url']),
      imageAltUrl: _nullableString(json['image_alt_url']),
    );
  }
}

class FounderSignalSetIdentity {
  const FounderSignalSetIdentity({
    required this.setId,
    required this.setCode,
    required this.setName,
  });

  final String? setId;
  final String? setCode;
  final String? setName;

  factory FounderSignalSetIdentity.fromJson(Map<String, dynamic> json) {
    return FounderSignalSetIdentity(
      setId: _nullableString(json['set_id']),
      setCode: _nullableString(json['set_code']),
      setName: _nullableString(json['set_name']),
    );
  }
}

class FounderSignalMetricWindow {
  const FounderSignalMetricWindow({
    required this.opens,
    required this.adds,
    required this.comments,
    required this.wantOn,
  });

  final int opens;
  final int adds;
  final int comments;
  final int wantOn;

  int get total => opens + adds + comments + wantOn;

  factory FounderSignalMetricWindow.fromJson(
    Map<String, dynamic> json, {
    required String suffix,
  }) {
    return FounderSignalMetricWindow(
      opens: _parseInt(json['opens_$suffix']),
      adds: _parseInt(json['adds_$suffix']),
      comments: _parseInt(json['comments_$suffix']),
      wantOn: _parseInt(json['want_on_$suffix']),
    );
  }
}

class FounderSignalMetricDeltas {
  const FounderSignalMetricDeltas({
    required this.opens,
    required this.adds,
    required this.comments,
    required this.want,
  });

  final int opens;
  final int adds;
  final int comments;
  final int want;

  factory FounderSignalMetricDeltas.fromJson(Map<String, dynamic> json) {
    return FounderSignalMetricDeltas(
      opens: _parseInt(json['opens_delta']),
      adds: _parseInt(json['adds_delta']),
      comments: _parseInt(json['comments_delta']),
      want: _parseInt(json['want_delta']),
    );
  }
}

class FounderCardSignalCurrentState {
  const FounderCardSignalCurrentState({
    required this.activeWants,
    required this.activeOwners,
    required this.demandSupplyGap,
  });

  final int activeWants;
  final int activeOwners;
  final int demandSupplyGap;

  factory FounderCardSignalCurrentState.fromJson(Map<String, dynamic> json) {
    return FounderCardSignalCurrentState(
      activeWants: _parseInt(json['active_wants']),
      activeOwners: _parseInt(json['active_owners']),
      demandSupplyGap: _parseInt(json['demand_supply_gap']),
    );
  }
}

class FounderSetSignalCurrentState {
  const FounderSetSignalCurrentState({
    required this.activeWants,
    required this.cardsWithSignal,
  });

  final int activeWants;
  final int cardsWithSignal;

  factory FounderSetSignalCurrentState.fromJson(Map<String, dynamic> json) {
    return FounderSetSignalCurrentState(
      activeWants: _parseInt(json['active_wants']),
      cardsWithSignal: _parseInt(json['cards_with_signal']),
    );
  }
}

class FounderCardSignalDrilldown {
  const FounderCardSignalDrilldown({
    required this.generatedAt,
    required this.card,
    required this.current,
    required this.metrics7d,
    required this.metrics30d,
    required this.previous7d,
    required this.deltas,
    required this.confidence,
    required this.trendSpeed,
    required this.spike,
    required this.recommendation,
    required this.insightSummary,
    required this.summaryLines,
  });

  final DateTime? generatedAt;
  final FounderSignalCardIdentity card;
  final FounderCardSignalCurrentState current;
  final FounderSignalMetricWindow metrics7d;
  final FounderSignalMetricWindow metrics30d;
  final FounderSignalMetricWindow previous7d;
  final FounderSignalMetricDeltas deltas;
  final String confidence;
  final String trendSpeed;
  final bool spike;
  final String? recommendation;
  final List<String> insightSummary;
  final List<String> summaryLines;

  factory FounderCardSignalDrilldown.fromJson(Map<String, dynamic> json) {
    return FounderCardSignalDrilldown(
      generatedAt: _parseDateTime(json['generated_at']),
      card: FounderSignalCardIdentity.fromJson(
        Map<String, dynamic>.from((json['card'] as Map?) ?? const {}),
      ),
      current: FounderCardSignalCurrentState.fromJson(
        Map<String, dynamic>.from((json['current'] as Map?) ?? const {}),
      ),
      metrics7d: FounderSignalMetricWindow.fromJson(
        Map<String, dynamic>.from((json['metrics_7d'] as Map?) ?? const {}),
        suffix: '7d',
      ),
      metrics30d: FounderSignalMetricWindow.fromJson(
        Map<String, dynamic>.from((json['metrics_30d'] as Map?) ?? const {}),
        suffix: '30d',
      ),
      previous7d: FounderSignalMetricWindow.fromJson(
        Map<String, dynamic>.from((json['previous_7d'] as Map?) ?? const {}),
        suffix: 'previous_7d',
      ),
      deltas: FounderSignalMetricDeltas.fromJson(
        Map<String, dynamic>.from((json['deltas'] as Map?) ?? const {}),
      ),
      confidence: _nullableString(json['confidence']) ?? 'low',
      trendSpeed: _nullableString(json['trend_speed']) ?? 'flat',
      spike: json['spike'] == true,
      recommendation: _nullableString(json['recommendation']),
      insightSummary: _parseStringList(json['insight_summary']),
      summaryLines: _parseStringList(json['summary_lines']),
    );
  }
}

class FounderSetSignalDrilldown {
  const FounderSetSignalDrilldown({
    required this.generatedAt,
    required this.set,
    required this.current,
    required this.metrics7d,
    required this.metrics30d,
    required this.previous7d,
    required this.deltas,
    required this.topDrivers,
    required this.summaryLines,
  });

  final DateTime? generatedAt;
  final FounderSignalSetIdentity set;
  final FounderSetSignalCurrentState current;
  final FounderSignalMetricWindow metrics7d;
  final FounderSignalMetricWindow metrics30d;
  final FounderSignalMetricWindow previous7d;
  final FounderSignalMetricDeltas deltas;
  final List<FounderInsightCardRow> topDrivers;
  final List<String> summaryLines;

  factory FounderSetSignalDrilldown.fromJson(Map<String, dynamic> json) {
    final rawTopDrivers = json['top_drivers'] ?? json['top_cards'];
    return FounderSetSignalDrilldown(
      generatedAt: _parseDateTime(json['generated_at']),
      set: FounderSignalSetIdentity.fromJson(
        Map<String, dynamic>.from((json['set'] as Map?) ?? const {}),
      ),
      current: FounderSetSignalCurrentState.fromJson(
        Map<String, dynamic>.from((json['current'] as Map?) ?? const {}),
      ),
      metrics7d: FounderSignalMetricWindow.fromJson(
        Map<String, dynamic>.from((json['metrics_7d'] as Map?) ?? const {}),
        suffix: '7d',
      ),
      metrics30d: FounderSignalMetricWindow.fromJson(
        Map<String, dynamic>.from((json['metrics_30d'] as Map?) ?? const {}),
        suffix: '30d',
      ),
      previous7d: FounderSignalMetricWindow.fromJson(
        Map<String, dynamic>.from((json['previous_7d'] as Map?) ?? const {}),
        suffix: 'previous_7d',
      ),
      deltas: FounderSignalMetricDeltas.fromJson(
        Map<String, dynamic>.from((json['deltas'] as Map?) ?? const {}),
      ),
      topDrivers: rawTopDrivers is List
          ? rawTopDrivers
                .whereType<Map>()
                .map(
                  (row) => FounderInsightCardRow.fromJson(
                    Map<String, dynamic>.from(row),
                  ),
                )
                .toList(growable: false)
          : const <FounderInsightCardRow>[],
      summaryLines: _parseStringList(json['summary_lines']),
    );
  }
}

class FounderInsightService {
  FounderInsightService._();

  static bool isFounderUser(User? user) {
    final email = user?.email?.trim().toLowerCase();
    return email == _kFounderEmail;
  }

  static Future<FounderInsightBundle> load({SupabaseClient? client}) async {
    final data = await _invokeFounderJsonFunction(
      functionName: _kFounderSignalsFunction,
      client: client,
      body: const <String, dynamic>{},
    );
    return FounderInsightBundle.fromJson(data);
  }

  static Future<FounderCardSignalDrilldown> fetchCardDrilldown(
    String cardPrintId, {
    SupabaseClient? client,
  }) async {
    final data = await _invokeFounderJsonFunction(
      functionName: _kFounderSignalDrilldownFunction,
      client: client,
      body: <String, dynamic>{'kind': 'card', 'card_print_id': cardPrintId},
    );
    return FounderCardSignalDrilldown.fromJson(data);
  }

  static Future<FounderSetSignalDrilldown> fetchSetDrilldown(
    String setCode, {
    SupabaseClient? client,
  }) async {
    final data = await _invokeFounderJsonFunction(
      functionName: _kFounderSignalDrilldownFunction,
      client: client,
      body: <String, dynamic>{'kind': 'set', 'set_code': setCode},
    );
    return FounderSetSignalDrilldown.fromJson(data);
  }

  static Future<Map<String, dynamic>> _invokeFounderJsonFunction({
    required String functionName,
    required Map<String, dynamic> body,
    SupabaseClient? client,
  }) async {
    final sb = client ?? Supabase.instance.client;
    final session = sb.auth.currentSession;
    final user = sb.auth.currentUser;

    if (user == null || session == null || session.accessToken.isEmpty) {
      throw Exception('Sign in to use Vendor Tools.');
    }
    if (!isFounderUser(user)) {
      throw Exception(
        'Vendor Tools are only available to the founder account.',
      );
    }

    final response = await sb.functions.invoke(functionName, body: body);
    final data = _coerceJsonMap(response.data);

    if (response.status < 200 || response.status >= 300) {
      throw Exception(
        _extractError(data) ??
            'Vendor tools are unavailable right now.',
      );
    }
    if (data.isEmpty) {
      throw Exception('Vendor tools are unavailable right now.');
    }
    return data;
  }

  static String? _extractError(dynamic data) {
    if (data is Map) {
      final error = _nullableString(data['error']);
      final detail = _nullableString(data['detail']);
      if (detail != null && detail.isNotEmpty) {
        return detail;
      }
      if (error == 'forbidden') {
        return 'Vendor Tools are only available to the founder account.';
      }
    }
    return null;
  }
}

Map<String, dynamic> _coerceJsonMap(dynamic body) {
  if (body == null) {
    return const <String, dynamic>{};
  }
  if (body is Map<String, dynamic>) {
    return body;
  }
  if (body is Map) {
    return Map<String, dynamic>.from(body);
  }
  return const <String, dynamic>{};
}

FounderInsightRowType _parseRowType(String? value) {
  if (value == 'set') {
    return FounderInsightRowType.set;
  }
  return FounderInsightRowType.card;
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) {
    return null;
  }
  return DateTime.tryParse(value.toString());
}

String? _nullableString(dynamic value) {
  if (value == null) {
    return null;
  }
  final normalized = value.toString().trim();
  return normalized.isEmpty ? null : normalized;
}

int _parseInt(dynamic value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.round();
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

Map<String, int> _parseBreakdown(dynamic value) {
  if (value is! Map) {
    return const <String, int>{};
  }

  final breakdown = <String, int>{};
  for (final entry in value.entries) {
    final key = entry.key.toString();
    breakdown[key] = _parseInt(entry.value);
  }
  return breakdown;
}

List<String> _parseStringList(dynamic value) {
  if (value is! List) {
    return const <String>[];
  }

  return value
      .map((entry) => entry?.toString().trim() ?? '')
      .where((entry) => entry.isNotEmpty)
      .toList(growable: false);
}
