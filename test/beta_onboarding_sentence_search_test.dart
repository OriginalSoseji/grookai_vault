import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Search teaches sentence-style queries with runnable examples', () {
    final main = File('lib/main.dart').readAsStringSync();

    expect(main, contains('Search in a sentence'));
    expect(main, contains('Search like a sentence'));
    expect(main, contains('Charizard from 151'));
    expect(main, contains('Japanese Pikachu promo'));
    expect(main, contains('Umbreon alt art'));
    expect(main, contains('Lugia silver tempest secret rare'));
    expect(main, contains('_runSentenceSearchExample'));
  });

  test('onboarding first card step offers sentence search and scan', () {
    final onboarding = File(
      'lib/widgets/onboarding/onboarding_ladder_sheet.dart',
    ).readAsStringSync();

    expect(onboarding, contains('Search by sentence'));
    expect(onboarding, contains('Scan a card'));
    expect(onboarding, contains('Both paths can add to your Vault.'));
  });

  test('Getting Started is reachable from Account and drawer', () {
    final account = File(
      'lib/screens/account/account_screen.dart',
    ).readAsStringSync();
    final shell = File('lib/main_shell.dart').readAsStringSync();

    expect(account, contains('AccountHubAction.gettingStarted'));
    expect(account, contains('Getting Started'));
    expect(shell, contains('class GettingStartedScreen'));
    expect(shell, contains('onOpenGettingStarted'));
    expect(shell, contains('Search in a sentence'));
    expect(shell, contains('Scan or import a photo'));
    expect(shell, contains('Share your Wall'));
  });
}
