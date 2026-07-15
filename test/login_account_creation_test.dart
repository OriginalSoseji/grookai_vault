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
  });
}
