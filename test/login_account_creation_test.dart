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

  test('new authenticated users must create public slug before shell', () {
    final main = File('lib/main.dart').readAsStringSync();
    final shell = File('lib/main_shell.dart').readAsStringSync();

    expect(main, contains('RequiredProfileSetupGate'));
    expect(shell, contains('Claim your collector link'));
    expect(shell, contains('AccountProfileService.loadCurrentProfile'));
    expect(shell, contains('AccountProfileService.save'));
    expect(shell, contains('publicProfileEnabled: true'));
    expect(shell, contains('vaultSharingEnabled: true'));
    expect(shell, contains('That profile URL is already taken.'));
  });
}
