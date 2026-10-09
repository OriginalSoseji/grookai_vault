import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('login screen exposes first-class account creation', () {
    final source = File('lib/main_shell.dart').readAsStringSync();

    expect(source, contains('Create account'));
    expect(source, contains('Create your account'));
    expect(source, contains('New here? Create account'));
    expect(source, contains('Already have an account? Sign in'));
    expect(source, contains('supabase.auth.signUp'));
    expect(source, contains('_creatingAccount'));
    expect(source, contains('_signupConfirmationEmail'));
    expect(source, contains('Check your email'));
  });

  test('private collecting opens without publishing a social profile', () {
    final main = File('lib/main.dart').readAsStringSync();
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final account = File(
      'lib/screens/account/account_screen.dart',
    ).readAsStringSync();
    expect(main, isNot(contains('RequiredProfileSetupGate')));
    expect(main, contains('collector-shell-'));
    expect(shell, contains('_ShellDestination.vault;'));
    expect(account, contains('bool _publicProfileEnabled = false'));
    expect(account, contains('bool _vaultSharingEnabled = false'));
    expect(account, contains('AccountProfileService.save'));
  });
}
