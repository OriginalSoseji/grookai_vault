import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/navigation/grookai_web_route_service.dart';

void main() {
  const instance = 'ef000000-0000-4000-8000-000000000002';
  const draft = 'ef000000-0000-4000-8000-000000000003';
  test(
    'native and canonical seller returns select the same private workspace',
    () {
      for (final path in [
        'grookai://ebay-seller',
        'grookaivault://ebay-seller',
        'https://grookaivault.com/vault/ebay',
      ]) {
        final result = GrookaiWebRouteService.parseCanonicalUri(
          Uri.parse(path),
        );
        expect(result?.kind, GrookaiCanonicalRouteKind.ebaySeller);
        expect(result?.path, '/vault/ebay');
      }
      final result = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse(
          'https://grookaivault.com/vault/ebay?instanceId=$instance&draftId=$draft',
        ),
      );
      expect(result?.value, instance);
      expect(result?.draftId, draft);
    },
  );
  test(
    'credential-bearing, duplicate, malformed and foreign returns are rejected',
    () {
      for (final path in [
        'grookai://ebay-seller?code=private-code',
        'grookai://private-credential@ebay-seller',
        'grookai://ebay-seller:444',
        'grookai://ebay-seller?state=private-state',
        'grookai://ebay-seller#access_token=private-token',
        'grookai://ebay-seller?instanceId=$instance&instanceId=$instance',
        'grookai://ebay-seller?draftId=not-a-copy',
        'https://untrusted.example/vault/ebay?instanceId=$instance',
        'https://grookaivault.com/api/ebay/seller/oauth/callback?code=private-code',
      ]) {
        expect(
          GrookaiWebRouteService.parseCanonicalUri(Uri.parse(path)),
          isNull,
          reason:
              'Only credential-free, exact seller destinations may enter the app.',
        );
      }
    },
  );
}
