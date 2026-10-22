import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Roboto is the bundled application typeface', () {
    final pubspec = File('pubspec.yaml').readAsStringSync();
    final main = File('lib/main.dart').readAsStringSync();
    final tokens = File('lib/theme/gv_tokens.dart').readAsStringSync();
    final typography = File('lib/theme/gv_typography.dart').readAsStringSync();

    expect(pubspec, contains('family: Roboto'));
    expect(pubspec, contains('Roboto-Regular.ttf'));
    expect(pubspec, contains('Roboto-Black.ttf'));
    expect(typography, contains("fontFamily = 'Roboto'"));
    expect(main, contains('fontFamily: GvTypography.fontFamily'));
    expect(tokens, contains('fontFamily: GvTypography.fontFamily'));

    for (final font in <String>[
      'Roboto-Thin.ttf',
      'Roboto-Light.ttf',
      'Roboto-Regular.ttf',
      'Roboto-Medium.ttf',
      'Roboto-Bold.ttf',
      'Roboto-Black.ttf',
    ]) {
      expect(File('assets/fonts/Roboto/$font').existsSync(), isTrue);
    }
  });

  test('brand lockups are lowercase Roboto Black by contract', () {
    final typography = File('lib/theme/gv_typography.dart').readAsStringSync();
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final main = File('lib/main.dart').readAsStringSync();
    final contract = File(
      'docs/contracts/BRAND_TYPOGRAPHY_CONTRACT_V1.md',
    ).readAsStringSync();

    expect(typography, contains("brandName = 'grookai'"));
    expect(typography, contains("productName = 'grookai vault'"));
    expect(typography, contains('brandWeight = FontWeight.w900'));
    expect(typography, contains('class GrookaiBrandText'));
    expect(shell, contains('GrookaiBrandText('));
    expect(main, contains('const GrookaiBrandText('));
    expect(contract, contains('`grookai vault`'));

    final shellWordmark = shell
        .split('class _GrookaiWordmark')
        .last
        .split('class _GrookaiNotificationButton')
        .first;
    expect(shellWordmark, contains('AssetImage(_logoAsset)'));
    expect(
      shellWordmark.contains("'G'"),
      isFalse,
      reason: 'The shell wordmark must use the original logo, not a typed G',
    );

    final runtimeSources = <File>[
      ...Directory('lib')
          .listSync(recursive: true)
          .whereType<File>()
          .where((file) => file.path.endsWith('.dart')),
    ];
    for (final file in runtimeSources) {
      final source = file.readAsStringSync();
      expect(
        source.contains("'Grookai Vault'") ||
            source.contains('"Grookai Vault"') ||
            source.contains("'GROOKAI VAULT'") ||
            source.contains('"GROOKAI VAULT"'),
        isFalse,
        reason: '${file.path} reintroduced the retired product casing',
      );
    }
  });
}
