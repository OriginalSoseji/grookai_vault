String priceTargetAmount(Object? value) {
  if (value is! String ||
      value.length > 1024 ||
      !RegExp(r'^(0|[1-9][0-9]*)(\.[0-9]+)?$').hasMatch(value) ||
      !RegExp(r'[1-9]').hasMatch(value)) {
    throw const FormatException(
      'Enter a positive USD amount using digits and a decimal point.',
    );
  }
  return value.contains('.')
      ? value.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '')
      : value;
}

class PriceTarget {
  PriceTarget.fromJson(Map<String, dynamic> json)
    : data = Map.unmodifiable(json) {
    final uuid = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      caseSensitive: false,
    );
    for (final key in ['id', 'printingId', 'cardPrintId']) {
      if (data[key] is! String || !uuid.hasMatch(data[key] as String)) {
        throw const FormatException('Invalid target identity.');
      }
    }
    if (data['revision'] is! String ||
        !RegExp(r'^[1-9][0-9]{0,18}$').hasMatch(data['revision'] as String) ||
        BigInt.parse(data['revision'] as String) >
            BigInt.parse('9223372036854775807') ||
        data['enabled'] is! bool ||
        data['currency'] != 'USD' ||
        !['at_or_below', 'at_or_above'].contains(data['direction'])) {
      throw const FormatException('Invalid target details.');
    }
    priceTargetAmount(data['amount']);
    for (final key in ['name', 'printingGvId', 'finish']) {
      if (data[key] is! String) {
        throw const FormatException('Incomplete printing details.');
      }
    }
    for (final key in ['lastCheckedAt', 'triggeredAt']) {
      if (!data.containsKey(key) ||
          (data[key] != null &&
              (data[key] is! String ||
                  DateTime.tryParse(data[key] as String) == null))) {
        throw const FormatException('Invalid target date.');
      }
    }
    if (!data.containsKey('reference')) {
      throw const FormatException('Incomplete price reference.');
    }
    final reference = data['reference'];
    if (reference != null) {
      if (reference is! Map || reference['currency'] != 'USD') {
        throw const FormatException('Invalid price reference.');
      }
      priceTargetAmount(reference['amount']);
      for (final key in ['provenanceId', 'publicationSetId', 'runId']) {
        if (reference[key] is! String ||
            !uuid.hasMatch(reference[key] as String)) {
          throw const FormatException('Invalid price evidence.');
        }
      }
      for (final key in ['observedAt', 'publishedAt']) {
        if (reference[key] is! String ||
            DateTime.tryParse(reference[key] as String) == null) {
          throw const FormatException('Invalid price date.');
        }
      }
    }
  }
  final Map<String, dynamic> data;
  String get id => data['id'] as String;
  String get name => data['name'] as String;
  String get amount => data['amount'] as String;
  String get revision => data['revision'] as String;
  String get printingId => data['printingId'] as String;
  String get printingGvId => data['printingGvId'] as String;
  String get finish => data['finish'] as String;
  String get direction => data['direction'] as String;
  bool get enabled => data['enabled'] as bool;
  String get status => !enabled
      ? 'Paused'
      : data['triggeredAt'] != null
      ? 'Target matched'
      : data['reference'] != null
      ? 'Watching for your target'
      : 'Waiting for an eligible price';
}

class PriceTargets {
  PriceTargets.fromJson(String owner, Map<String, dynamic> data)
    : editEnabled = data['editEnabled'] as bool,
      targets = (data['targets'] as List)
          .map((t) => PriceTarget.fromJson(Map<String, dynamic>.from(t as Map)))
          .toList(growable: false) {
    if (data['ownerId'] != owner ||
        data['version'] != 1 ||
        targets.length > 1000 ||
        targets.map((t) => t.id).toSet().length != targets.length) {
      throw const FormatException('Price targets are incomplete.');
    }
  }
  final bool editEnabled;
  final List<PriceTarget> targets;
}
