import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/auth/oauth_callback_uri_service.dart';

void main() {
  group('OAuthCallbackUriService', () {
    test('uses the slash-normalized Supabase mobile redirect URI', () {
      expect(
        OAuthCallbackUriService.redirectUri,
        'grookaivault://login-callback/',
      );
    });

    test('recognizes the registered host callback with PKCE code', () {
      final uri = Uri.parse('grookaivault://login-callback/?code=abc123');

      expect(OAuthCallbackUriService.extractLoginCallback(uri), uri);
      expect(OAuthCallbackUriService.hasOAuthPayload(uri), isTrue);
    });

    test('recognizes legacy callback without trailing slash', () {
      final uri = Uri.parse('grookaivault://login-callback?code=abc123');

      expect(OAuthCallbackUriService.extractLoginCallback(uri), uri);
      expect(OAuthCallbackUriService.hasOAuthPayload(uri), isTrue);
    });

    test('recognizes path-style callbacks from platform variants', () {
      final uri = Uri.parse('grookaivault:/login-callback?code=abc123');

      expect(OAuthCallbackUriService.extractLoginCallback(uri), uri);
      expect(OAuthCallbackUriService.hasOAuthPayload(uri), isTrue);
    });

    test('recognizes implicit token callbacks in the fragment', () {
      final uri = Uri.parse(
        'grookaivault://login-callback/#access_token=token&refresh_token=refresh',
      );

      expect(OAuthCallbackUriService.extractLoginCallback(uri), uri);
      expect(OAuthCallbackUriService.hasOAuthPayload(uri), isTrue);
    });

    test('extracts nested app link callbacks', () {
      final callback = Uri.encodeComponent(
        'grookaivault://login-callback/?code=abc123',
      );
      final uri = Uri.parse('https://grookaivault.com/auth?link=$callback');

      final extracted = OAuthCallbackUriService.extractLoginCallback(uri);

      expect(extracted, isNotNull);
      expect(extracted!.scheme, 'grookaivault');
      expect(extracted.host, 'login-callback');
      expect(extracted.queryParameters['code'], 'abc123');
      expect(OAuthCallbackUriService.hasOAuthPayload(extracted), isTrue);
    });

    test('keeps ordinary canonical links out of auth handling', () {
      final uri = Uri.parse('grookaivault://card/GV-PK-HP-101');

      expect(OAuthCallbackUriService.extractLoginCallback(uri), isNull);
    });
  });

  test('mobile platforms register the Grookai auth callback scheme', () {
    final androidManifest = File(
      'android/app/src/main/AndroidManifest.xml',
    ).readAsStringSync();
    final iosInfoPlist = File('ios/Runner/Info.plist').readAsStringSync();

    expect(androidManifest, contains('android:scheme="grookaivault"'));
    expect(androidManifest, contains('android:host="login-callback"'));
    expect(iosInfoPlist, contains('<string>grookaivault</string>'));
  });
}
