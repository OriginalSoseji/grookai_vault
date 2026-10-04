import 'package:supabase_flutter/supabase_flutter.dart';

Future<Set<String>> getJungleDiscoveryExclusions(SupabaseClient client) async {
  const rpc = 'get_jungle_edition_discovery_exclusions_v1';
  dynamic data;
  try {
    data = await client.rpc(rpc);
  } on PostgrestException catch (error) {
    if (error.code == 'PGRST202' && error.message.contains(rpc)) return {};
    rethrow;
  }
  final uuid = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );
  if (data is! List ||
      data.any((id) => id is! String || !uuid.hasMatch(id)) ||
      data.toSet().length != data.length) {
    throw const FormatException(
      'Jungle catalog choices could not be checked. Please retry.',
    );
  }
  return data.cast<String>().toSet();
}

String? jungleEditionFailureMessage(dynamic details) {
  if (details is! Map) return null;
  const messages = {
    'JUNGLE_EDITION_REQUIRED':
        'Choose First Edition or Unlimited on the card page before adding a new copy.',
    'JUNGLE_EDITION_UNAVAILABLE':
        'Edition choices are being reviewed. Your saved copies remain available.',
    'JUNGLE_EDITION_PRINTING_REQUIRED':
        'Choose the verified printing for this edition on the card page.',
    'JUNGLE_EDITION_OWNED_RESOLUTION_REQUIRED':
        'Changing an existing copy\'s edition requires a separate confirmation.',
  };
  return messages[details['error']];
}

class JungleEditionWriteFailure implements Exception {
  const JungleEditionWriteFailure(this.message);
  final String message;
  @override
  String toString() => message;
}

class JungleEditionOption {
  const JungleEditionOption({
    required this.cardPrintId,
    required this.cardPrintingId,
    required this.gvId,
    required this.printingGvId,
    required this.edition,
    required this.finishKey,
  });
  final String cardPrintId,
      cardPrintingId,
      gvId,
      printingGvId,
      edition,
      finishKey;
  String get label =>
      '${edition == 'first_edition' ? 'First Edition' : 'Unlimited'} · ${finishKey == 'holo' ? 'Holo' : 'Normal'}';
}

class JungleEditionResolution {
  const JungleEditionResolution({
    required this.status,
    this.options = const [],
  });
  final String status;
  final List<JungleEditionOption> options;
  bool get requiresSelection =>
      status == 'selection_required' || status == 'unavailable';
  factory JungleEditionResolution.fromJson(dynamic value) {
    final uuid = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      caseSensitive: false,
    );
    if (value is! Map ||
        value['version'] != 1 ||
        value['options'] is! List ||
        ![
          'not_applicable',
          'selection_required',
          'ready',
          'unavailable',
        ].contains(value['status'])) {
      throw const FormatException('Invalid edition response');
    }
    final status = value['status'] as String;
    if (status != 'not_applicable' &&
        !uuid.hasMatch('${value['legacy_card_print_id']}')) {
      throw const FormatException('Invalid edition parent');
    }
    final options = <JungleEditionOption>[];
    for (final item in value['options'] as List) {
      if (item is! Map ||
          !uuid.hasMatch('${item['card_print_id']}') ||
          !uuid.hasMatch('${item['card_printing_id']}') ||
          !['first_edition', 'unlimited'].contains(item['edition']) ||
          !['normal', 'holo'].contains(item['finish_key'])) {
        throw const FormatException('Invalid edition choice');
      }
      final gvId = '${item['gv_id']}';
      if (!RegExp(
            r'^GV-PK-JU-([1-9]|[1-5][0-9]|6[0-4])-(FIRST-EDITION|UNLIMITED)$',
          ).hasMatch(gvId) ||
          !gvId.endsWith(
            item['edition'] == 'first_edition'
                ? '-FIRST-EDITION'
                : '-UNLIMITED',
          ) ||
          item['printing_gv_id'] !=
              '$gvId-${(item['finish_key'] as String).toUpperCase()}') {
        throw const FormatException('Invalid edition identity');
      }
      options.add(
        JungleEditionOption(
          cardPrintId: item['card_print_id'],
          cardPrintingId: item['card_printing_id'],
          gvId: gvId,
          printingGvId: item['printing_gv_id'],
          edition: item['edition'],
          finishKey: item['finish_key'],
        ),
      );
    }
    if ((status == 'ready' || status == 'selection_required') &&
            options.length != 2 ||
        status == 'not_applicable' && options.isNotEmpty ||
        ![0, 2].contains(options.length)) {
      throw const FormatException('Incomplete edition choices');
    }
    if (options.length == 2 &&
        (options.map((x) => x.edition).toSet().length != 2 ||
            options.map((x) => x.cardPrintId).toSet().length != 2 ||
            options.map((x) => x.cardPrintingId).toSet().length != 2 ||
            options.map((x) => x.gvId.split('-')[3]).toSet().length != 1 ||
            options[0].finishKey != options[1].finishKey)) {
      throw const FormatException('Conflicting edition choices');
    }
    return JungleEditionResolution(
      status: status,
      options: List.unmodifiable(options),
    );
  }
  void assertSelection(String parent, String? child) {
    if (status == 'not_applicable') return;
    if (requiresSelection) throw JungleEditionSelectionRequired(this);
    if (!options.any(
      (x) => x.cardPrintId == parent && x.cardPrintingId == child,
    )) {
      throw JungleEditionSelectionRequired(this);
    }
  }
}

class JungleEditionSelectionRequired implements Exception {
  const JungleEditionSelectionRequired(this.resolution);
  final JungleEditionResolution resolution;
  @override
  String toString() => resolution.status != 'unavailable'
      ? 'Choose First Edition or Unlimited on the card page before adding a new copy.'
      : 'Edition choices are being reviewed. Your saved copies remain available.';
}

Future<JungleEditionResolution> getJungleEditionResolution(
  SupabaseClient client,
  String cardPrintId,
) async {
  const rpc = 'get_jungle_edition_resolution_v1';
  try {
    return JungleEditionResolution.fromJson(
      await client.rpc(rpc, params: {'p_card_print_id': cardPrintId}),
    );
  } on PostgrestException catch (error) {
    if (error.code == 'PGRST202' && error.message.contains(rpc)) {
      return const JungleEditionResolution(status: 'not_applicable');
    }
    rethrow;
  }
}
