import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/scanner_v5/scan_capture_v5_screen.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_v5_identity_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:image/image.dart' as img;

void main() {
  group('Scanner V5 identity service failures', () {
    test('defaults to the public scanner endpoint when unconfigured', () {
      final service = ScannerV5IdentityService(
        client: MockClient((_) async {
          fail('default endpoint check should not send a request');
        }),
      );

      expect(service.endpoint, scannerV5DefaultIdentifyEndpoint);
    });

    test('maps transport failures to ScannerV5UnreachableException', () async {
      final service = ScannerV5IdentityService(
        endpoint: 'https://scanner.example.com/scanner-v5/identify',
        client: MockClient((request) {
          throw http.ClientException('connection refused', request.url);
        }),
      );

      await expectLater(
        service.identify(Uint8List.fromList(const [1, 2, 3])),
        throwsA(isA<ScannerV5UnreachableException>()),
      );
    });

    test('maps non-2xx responses to ScannerV5HttpException', () async {
      final service = ScannerV5IdentityService(
        endpoint: 'https://scanner.example.com/scanner-v5/identify',
        client: MockClient(
          (_) async => http.Response('temporarily unavailable', 503),
        ),
      );

      await expectLater(
        service.identify(Uint8List.fromList(const [1, 2, 3])),
        throwsA(
          isA<ScannerV5HttpException>().having(
            (error) => error.statusCode,
            'statusCode',
            503,
          ),
        ),
      );
    });

    test('maps malformed JSON to ScannerV5ProtocolException', () async {
      final service = ScannerV5IdentityService(
        endpoint: 'https://scanner.example.com/scanner-v5/identify',
        client: MockClient((_) async => http.Response('not json', 200)),
      );

      await expectLater(
        service.identify(Uint8List.fromList(const [1, 2, 3])),
        throwsA(isA<ScannerV5ProtocolException>()),
      );
    });
  });

  group('Scanner V5 user-facing error copy', () {
    test('uses honest copy for typed failures', () {
      expect(
        scannerV5UserFacingError(
          const ScannerV5UnreachableException('https://scanner.example.com'),
        ).title,
        'Scanner offline',
      );
      expect(
        scannerV5UserFacingError(
          const ScannerV5HttpException(
            endpoint: 'https://scanner.example.com',
            statusCode: 503,
          ),
        ).message,
        'Scanner service error — try again in a moment.',
      );
      expect(
        scannerV5UserFacingError(
          const ScannerV5ProtocolException('https://scanner.example.com'),
        ).message,
        'Scanner returned an unexpected response.',
      );
      expect(
        scannerV5UserFacingError(TimeoutException('slow')).message,
        'Scanner timed out. Try again with the card centered.',
      );
    });

    test('catch-path error copy never blames glare', () {
      final errors = <Object>[
        const ScannerV5UnreachableException('https://scanner.example.com'),
        const ScannerV5HttpException(
          endpoint: 'https://scanner.example.com',
          statusCode: 503,
        ),
        const ScannerV5ProtocolException('https://scanner.example.com'),
        TimeoutException('slow'),
        StateError('unexpected'),
      ];

      for (final error in errors) {
        final copy = scannerV5UserFacingError(error);
        expect(copy.title.toLowerCase(), isNot(contains('glare')));
        expect(copy.message.toLowerCase(), isNot(contains('glare')));
      }
    });
  });

  group('Scanner V5 endpoint startup guard', () {
    test('flags local-only endpoints for physical-device builds', () {
      expect(
        scannerV5EndpointNotConfiguredForDevice(
          endpoint: 'http://127.0.0.1:8795/scanner-v5/identify',
          isPhysicalDevice: true,
        ),
        isTrue,
      );
      expect(
        scannerV5EndpointNotConfiguredForDevice(
          endpoint: 'http://10.0.2.2:8795/scanner-v5/identify',
          isPhysicalDevice: true,
        ),
        isTrue,
      );
      expect(
        scannerV5EndpointNotConfiguredForDevice(
          endpoint:
              'https://scanner-identity.grookaivault.com/scanner-v5/identify',
          isPhysicalDevice: true,
        ),
        isFalse,
      );
      expect(
        scannerV5EndpointNotConfiguredForDevice(
          endpoint: 'http://127.0.0.1:8795/scanner-v5/identify',
          isPhysicalDevice: false,
        ),
        isFalse,
      );
    });
  });

  group('Scanner V5 photo import preparation', () {
    test('keeps imported gallery photos uncropped and upload sized', () {
      final source = img.Image(width: 2400, height: 1600);
      final sourceBytes = Uint8List.fromList(img.encodeJpg(source));

      final preparedBytes = scannerV5PrepareImportedPhotoForUpload(sourceBytes);
      final prepared = img.decodeImage(preparedBytes);

      expect(prepared, isNotNull);
      expect(prepared!.width, 1200);
      expect(prepared.height, 800);
    });
  });
}
