import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/secrets.dart';

void main() {
  test('release config accessors tolerate missing dotenv assets', () {
    expect(() => supabaseUrl, returnsNormally);
    expect(() => supabasePublishableKey, returnsNormally);
    expect(grookaiWebBaseUrl, 'https://grookaivault.com');
  });
}
