import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final tokens = File('lib/theme/gv_tokens.dart').readAsStringSync();
  final shell = File('lib/main_shell.dart').readAsStringSync();
  final pulse = File(
    'lib/screens/network/network_screen.dart',
  ).readAsStringSync();
  final vault = File('lib/main_vault.dart').readAsStringSync();
  final detail = File('lib/card_detail_screen.dart').readAsStringSync();

  test('V2 uses one graphite, ivory, and mint visual system', () {
    expect(tokens, contains('Color(0xFF0B0F14)'));
    expect(tokens, contains('Color(0xFFF5F1E8)'));
    expect(tokens, contains('Color(0xFF59D7C1)'));
    expect(tokens, contains('ThemeData buildGvRedesignV2Theme()'));
    expect(shell, contains('data: buildGvRedesignV2Theme()'));
    expect(detail, contains('data: buildGvRedesignV2Theme()'));
  });

  test('Pulse opens the collector feed with two familiar choices', () {
    expect(
      pulse,
      contains('_NetworkHomeSegment _segment = _NetworkHomeSegment.discover'),
    );
    expect(pulse, contains("_NetworkHomeSegment.discover => 'For you'"));
    expect(pulse, contains("_NetworkHomeSegment.following => 'Following'"));
    expect(pulse, contains("'Filter Pulse'"));
    expect(pulse, isNot(contains('class _IntentChip')));
    expect(pulse, contains('layout: NetworkInteractionCardLayout.feed'));
  });

  test('Vault exposes cards, sets, and lists above a quiet grid', () {
    expect(vault, contains('class _VaultPrimaryTabs'));
    expect(vault, contains("('Cards', onCards)"));
    expect(vault, contains("('Sets', onSets)"));
    expect(vault, contains("('Lists', onLists)"));
    expect(vault, contains("maxLines: 1"));
    expect(vault, isNot(contains("'Recently Added'")));
  });

  test('Card detail prioritizes evidence and real management actions', () {
    final pricingIndex = detail.indexOf(
      '_buildPricingSection(theme, colorScheme)',
      detail.indexOf('Widget build(BuildContext context)'),
    );
    final tabsIndex = detail.indexOf(
      '_buildDetailTabRail(theme, colorScheme)',
      detail.indexOf('Widget build(BuildContext context)'),
    );
    expect(pricingIndex, greaterThan(-1));
    expect(tabsIndex, greaterThan(pricingIndex));
    expect(detail, contains("'Manage copy'"));
    expect(detail, contains('Icons.bookmark_border_rounded'));
    expect(detail, contains("'Card family'"));
  });
}
