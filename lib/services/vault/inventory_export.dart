import 'dart:convert';

/// A detached, complete owner snapshot. Decimal strings never become doubles.
class InventoryExport {
  InventoryExport._(
    this._json,
    this.ownerId,
    this.capturedAt,
    this.copyCount,
    this.cardCount,
    this.slabCount,
    this.sealedCount,
  );

  final String _json;
  final String ownerId;
  final String capturedAt;
  final int copyCount;
  final int cardCount;
  final int slabCount;
  final int sealedCount;

  static Never _invalid() => throw const FormatException(
    'The complete inventory export could not be confirmed. Please retry.',
  );
  static final _id = RegExp(r'^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$');
  static bool _uuid(Object? v) => v is String && _id.hasMatch(v);
  static bool _nullableId(Object? v) => v == null || _uuid(v);
  static bool _decimal(Object? v) =>
      v == null ||
      v is String &&
          RegExp(r'^(?:-?\d+(?:\.\d+)?|NaN|Infinity|-Infinity)$').hasMatch(v);
  static bool _utc(Object? v) {
    if (v is! String ||
        !RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$').hasMatch(v)) {
      return false;
    }
    final date = DateTime.tryParse(v);
    return date != null &&
        date.toUtc().toIso8601String().substring(0, 19) == v.substring(0, 19);
  }

  static Map<String, dynamic> _object(Object? v) {
    if (v is! Map || v.keys.any((k) => k is! String)) _invalid();
    return Map<String, dynamic>.from(v);
  }

  static void _keys(Map<String, dynamic> row, String expected) {
    final actual = row.keys.toList()..sort();
    final names = expected.split(' ')..sort();
    if (actual.join('|') != names.join('|')) _invalid();
  }

  static Map<String, dynamic> _projection(
    Object? v,
    String expected, [
    Map<String, bool Function(Object?)> special = const {},
  ]) {
    final row = _object(v);
    _keys(row, expected);
    for (final entry in row.entries) {
      final valid =
          special[entry.key]?.call(entry.value) ??
          (entry.value == null || entry.value is String);
      if (!valid) _invalid();
    }
    return row;
  }

  static const _recordKeys =
      'id user_id gv_vi_id card_print_id card_printing_id slab_cert_id sealed_product_variant_id legacy_vault_item_id acquisition_cost acquisition_currency condition_label condition_score is_graded grade_company grade_value grade_label notes name set_name intent pricing_mode asking_price_amount asking_price_currency asking_price_note seal_state package_condition photo_url image_source image_url image_back_source image_back_url image_display_mode created_at updated_at';
  static const _cardKeys =
      'id gv_id name number set_id set_code set_name game_id game_key identity_domain variant_key printed_identity_modifier set_identity_model print_identity_key';
  static const _printingKeys =
      'id card_print_id printing_gv_id finish_key is_provisional';
  static const _certificateKeys =
      'id gv_slab_id card_print_id grader cert_number grade qualifiers subgrades_json label_variant label_metadata_json';
  static const _sealedKeys =
      'id family_id family_name game_key variant_key name package_form language_code region_code edition wave manufacturer_sku upc release_date explicit_contents_json identity_contract_version identity_fingerprint';

  factory InventoryExport.parse(String ownerId, Object? input) {
    final doc = _object(input);
    _keys(
      doc,
      'schema version ownerId scope complete capturedAt copyCount copies',
    );
    final count = doc['copyCount'], copies = doc['copies'];
    if (!_uuid(ownerId) ||
        doc['ownerId'] != ownerId ||
        doc['schema'] != 'grookai-inventory-export-v1' ||
        doc['version'] != 1 ||
        doc['scope'] != 'all_active_owned_copies' ||
        doc['complete'] != true ||
        !_utc(doc['capturedAt']) ||
        count is! int ||
        count < 0 ||
        count > 20000 ||
        copies is! List ||
        copies.length != count) {
      _invalid();
    }
    final ids = <String>{}, counts = {'card': 0, 'slab': 0, 'sealed': 0};
    for (final value in copies) {
      final copy = _object(value);
      _keys(copy, 'kind record card printing certificate sealed sections');
      final r = _projection(copy['record'], _recordKeys, {
        'is_graded': (v) => v is bool,
        'condition_score': (v) => v == null || v is int,
      });
      if (!_uuid(r['id']) ||
          !ids.add(r['id'] as String) ||
          r['user_id'] != ownerId ||
          !_utc(r['created_at']) ||
          !_utc(r['updated_at'])) {
        _invalid();
      }
      for (final key in [
        'card_print_id',
        'card_printing_id',
        'slab_cert_id',
        'sealed_product_variant_id',
        'legacy_vault_item_id',
      ]) {
        if (!_nullableId(r[key])) _invalid();
      }
      if ([
                r['card_print_id'],
                r['slab_cert_id'],
                r['sealed_product_variant_id'],
              ].where((v) => v != null).length !=
              1 ||
          !_decimal(r['acquisition_cost']) ||
          !_decimal(r['asking_price_amount'])) {
        _invalid();
      }
      final kind = r['slab_cert_id'] != null
          ? 'slab'
          : r['sealed_product_variant_id'] != null
          ? 'sealed'
          : 'card';
      if (copy['kind'] != kind ||
          kind == 'sealed' && r['card_printing_id'] != null ||
          kind == 'slab' && r['is_graded'] != true) {
        _invalid();
      }
      counts[kind] = counts[kind]! + 1;
      final cert = copy['certificate'] == null
          ? null
          : _projection(copy['certificate'], _certificateKeys, {
              'qualifiers': (v) =>
                  v == null || v is List && v.every((x) => x is String),
            });
      if (cert != null &&
          (kind != 'slab' ||
              cert['id'] != r['slab_cert_id'] ||
              !_uuid(cert['card_print_id']) ||
              !_decimal(cert['grade']))) {
        _invalid();
      }
      final cardId = r['card_print_id'] ?? cert?['card_print_id'];
      final card = copy['card'] == null
          ? null
          : _projection(copy['card'], _cardKeys);
      if (card != null &&
          (!_uuid(card['id']) || card['id'] != cardId || kind == 'sealed')) {
        _invalid();
      }
      final printing = copy['printing'] == null
          ? null
          : _projection(copy['printing'], _printingKeys, {
              'is_provisional': (v) => v is bool,
            });
      if (printing != null &&
          (!_uuid(printing['id']) ||
              printing['id'] != r['card_printing_id'] ||
              printing['card_print_id'] != cardId ||
              kind == 'sealed')) {
        _invalid();
      }
      final sealed = copy['sealed'] == null
          ? null
          : _projection(copy['sealed'], _sealedKeys);
      if (sealed != null &&
          (kind != 'sealed' ||
              sealed['id'] != r['sealed_product_variant_id'] ||
              !_uuid(sealed['family_id']))) {
        _invalid();
      }
      final sections = copy['sections'];
      if (sections is! List) _invalid();
      final sectionIds = <String>{};
      for (final value in sections) {
        final section = _projection(value, 'id name position is_public', {
          'position': (v) => v is int,
          'is_public': (v) => v is bool,
        });
        if (!_uuid(section['id']) ||
            !sectionIds.add(section['id'] as String) ||
            section['name'] is! String) {
          _invalid();
        }
      }
    }
    final text = jsonEncode(doc);
    if (utf8.encode(text).length > 33554432) _invalid();
    return InventoryExport._(
      text,
      ownerId,
      doc['capturedAt'] as String,
      count,
      counts['card']!,
      counts['slab']!,
      counts['sealed']!,
    );
  }

  Map<String, dynamic> get document =>
      jsonDecode(_json) as Map<String, dynamic>;
  String toJsonString() => '$_json\n';
  String fileName(String extension) =>
      'grookai-inventory-${capturedAt.replaceAll(RegExp(r'[^0-9]'), '')}.$extension';

  static String csvCell(Object? value) {
    var text = value?.toString() ?? '';
    if (RegExp(
          r'^[\s\u0000-\u001f\u007f]*[=+@-]',
          unicode: true,
        ).hasMatch(text) ||
        RegExp(r'^[\t\r\n]').hasMatch(text)) {
      text = "'$text";
    }
    return '"${text.replaceAll('"', '""')}"';
  }

  String toCsvString() {
    final rows = <List<Object?>>[
      [
        'Copy ID',
        'Kind',
        'GVVI',
        'Name',
        'Set',
        'Number',
        'Game',
        'Card ID',
        'Printing ID',
        'Finish',
        'Certificate ID',
        'Grader',
        'Certificate number',
        'Certificate grade',
        'Sealed variant ID',
        'Package',
        'Language',
        'Condition',
        'Legacy graded',
        'Legacy grader',
        'Legacy grade',
        'Legacy grade label',
        'Seal state',
        'Package condition',
        'Acquisition cost',
        'Acquisition currency',
        'Intent',
        'Asking amount',
        'Asking currency',
        'Asking note',
        'Notes',
        'Sections',
        'Created at',
        'Updated at',
        'Photo reference',
        'Back photo reference',
        'Captured at',
      ],
    ];
    for (final value in document['copies'] as List) {
      final copy = value as Map<String, dynamic>,
          r = copy['record'] as Map<String, dynamic>;
      final c = copy['card'] as Map<String, dynamic>?,
          cert = copy['certificate'] as Map<String, dynamic>?;
      final sealed = copy['sealed'] as Map<String, dynamic>?,
          printing = copy['printing'] as Map<String, dynamic>?;
      rows.add([
        r['id'],
        copy['kind'],
        r['gv_vi_id'],
        r['name'] ?? c?['name'] ?? sealed?['name'],
        r['set_name'] ?? c?['set_name'],
        c?['number'],
        c?['game_key'] ?? sealed?['game_key'],
        r['card_print_id'] ?? cert?['card_print_id'],
        r['card_printing_id'],
        printing?['finish_key'],
        r['slab_cert_id'],
        cert?['grader'],
        cert?['cert_number'],
        cert?['grade'],
        r['sealed_product_variant_id'],
        sealed?['package_form'],
        sealed?['language_code'],
        r['condition_label'],
        r['is_graded'],
        r['grade_company'],
        r['grade_value'],
        r['grade_label'],
        r['seal_state'],
        r['package_condition'],
        r['acquisition_cost'],
        r['acquisition_currency'],
        r['intent'],
        r['asking_price_amount'],
        r['asking_price_currency'],
        r['asking_price_note'],
        r['notes'],
        jsonEncode(
          (copy['sections'] as List)
              .map((s) => {'id': s['id'], 'name': s['name']})
              .toList(),
        ),
        r['created_at'],
        r['updated_at'],
        r['image_url'] ?? r['photo_url'],
        r['image_back_url'],
        capturedAt,
      ]);
    }
    return '\uFEFF${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n';
  }
}
