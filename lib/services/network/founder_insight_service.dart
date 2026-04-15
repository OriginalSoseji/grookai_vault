import 'package:supabase_flutter/supabase_flutter.dart';

const String _kFounderEmail = 'ccabrl@gmail.com';
const String _kFounderSignalsFunction = 'founder-market-signals-v1';

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
    required this.imageUrl,
    required this.imageAltUrl,
    required this.score,
    required this.reason,
    required this.signalBreakdown,
  });

  final String cardPrintId;
  final String? gvId;
  final String name;
  final String? setCode;
  final String? setName;
  final String? number;
  final String? imageUrl;
  final String? imageAltUrl;
  final int score;
  final String reason;
  final Map<String, int> signalBreakdown;

  String? get preferredImageUrl => imageUrl ?? imageAltUrl;

  factory FounderInsightCardRow.fromJson(Map<String, dynamic> json) {
    return FounderInsightCardRow(
      cardPrintId: json['card_print_id']?.toString() ?? '',
      gvId: _nullableString(json['gv_id']),
      name: json['name']?.toString() ?? 'Unknown card',
      setCode: _nullableString(json['set_code']),
      setName: _nullableString(json['set_name']),
      number: _nullableString(json['number']),
      imageUrl: _nullableString(json['image_url']),
      imageAltUrl: _nullableString(json['image_alt_url']),
      score: _parseInt(json['score']),
      reason: json['reason']?.toString() ?? '',
      signalBreakdown: _parseBreakdown(json['signal_breakdown']),
    );
  }
}

class FounderInsightSetRow {
  const FounderInsightSetRow({
    required this.setCode,
    required this.setName,
    required this.score,
    required this.reason,
    required this.signalBreakdown,
  });

  final String? setCode;
  final String? setName;
  final int score;
  final String reason;
  final Map<String, int> signalBreakdown;

  factory FounderInsightSetRow.fromJson(Map<String, dynamic> json) {
    return FounderInsightSetRow(
      setCode: _nullableString(json['set_code']),
      setName: _nullableString(json['set_name']),
      score: _parseInt(json['score']),
      reason: json['reason']?.toString() ?? '',
      signalBreakdown: _parseBreakdown(json['signal_breakdown']),
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
    final sb = client ?? Supabase.instance.client;
    final user = sb.auth.currentUser;

    if (user == null) {
      throw Exception('Sign in to use Vendor Tools.');
    }
    if (!isFounderUser(user)) {
      throw Exception(
        'Vendor Tools are only available to the founder account.',
      );
    }

    final response = await sb.functions.invoke(
      _kFounderSignalsFunction,
      body: const <String, dynamic>{},
    );

    if (response.status < 200 || response.status >= 300) {
      throw Exception(
        _extractError(response.data) ??
            'Vendor tools are unavailable right now.',
      );
    }

    final data = response.data;
    if (data is! Map) {
      throw Exception('Vendor tools are unavailable right now.');
    }

    return FounderInsightBundle.fromJson(Map<String, dynamic>.from(data));
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
