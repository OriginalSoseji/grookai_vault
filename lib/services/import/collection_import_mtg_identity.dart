// Fallback name matching requires one governed identity, never a stripped label
// alone. Keep this predicate aligned with the server and shared fixture corpus.
bool matchesCollectrMtgIdentity({
  required String sourceName,
  required String sourceNumber,
  required String game,
  required Map<String, dynamic> card,
  required List<Map<String, dynamic>> identities,
}) {
  String text(dynamic value) => value is String
      ? value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase()
      : '';
  String number(dynamic value) {
    final raw = text(
      value,
    ).replaceFirst(RegExp(r'^#'), '').split('/').first.trim();
    final parts = RegExp(r'^([a-z]*)(\d+)([a-z]*)$').firstMatch(raw);
    if (parts == null) return raw;
    final digits = parts.group(2)!.replaceFirst(RegExp(r'^0+'), '');
    return '${parts.group(1)}${digits.isEmpty ? '0' : digits}${parts.group(3)}';
  }

  if (game != 'mtg' || identities.length != 1) return false;
  final identity = identities.single;
  final payload = identity['identity_payload'];
  if (payload is! Map ||
      identity['is_active'] != true ||
      identity['card_print_id'] != card['id'] ||
      identity['identity_domain'] != 'mtg_eng_paper_print' ||
      card['identity_domain'] != 'mtg_eng_paper_print' ||
      identity['identity_key_version'] != 'MTG_ENG_PAPER_PRINT_IDENTITY_V1' ||
      text(payload['language']) != 'en' ||
      text(payload['scryfall_print_id']).isEmpty ||
      text(card['variant_key']) !=
          'scryfall:${text(payload['scryfall_print_id'])}' ||
      text(card['set_code']).isEmpty ||
      text(identity['set_code_identity']) != text(card['set_code']) ||
      text(payload['set_code']) != text(card['set_code']) ||
      number(identity['printed_number']) != number(card['number']) ||
      number(payload['collector_number']) != number(card['number']) ||
      number(sourceNumber).isEmpty ||
      number(sourceNumber) != number(card['number']) ||
      text(payload['name']).isEmpty ||
      text(payload['name']) != text(card['name'])) {
    return false;
  }
  var name = text(sourceName);
  final labels = <String>{};
  while (true) {
    final suffix = RegExp(r'\s+\(([^()]*)\)$').firstMatch(name);
    if (suffix == null) break;
    final label = text(suffix.group(1));
    if (!labels.add(label)) return false;
    final effects = payload['frame_effects'];
    final verified = switch (label) {
      'extended art' => effects is List && effects.contains('extendedart'),
      'showcase' => effects is List && effects.contains('showcase'),
      'borderless' => payload['border_color'] == 'borderless',
      _ =>
        RegExp(r'^\d+$').hasMatch(label) &&
            number(label) == number(sourceNumber),
    };
    if (!verified) return false;
    name = name.substring(0, suffix.start);
  }
  if (name == text(card['name'])) return true;
  // A Collectr front-face name can identify the full double-faced print only
  // when its governed layout, complete name and collector number agree.
  final faces = text(payload['name']).split(' // ');
  return const ['transform', 'modal_dfc'].contains(payload['layout']) &&
      faces.length == 2 &&
      faces.every((face) => face.isNotEmpty) &&
      name == faces.first;
}
