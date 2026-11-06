import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/scanner_v5/scan_capture_v5_screen.dart';
import 'package:grookai_vault/screens/scanner_v5/widgets/scanner_result_sheet.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_camera_session.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_session_log.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_v5_identity_service.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_vault_add.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'camera resumes after its previous controller has been released',
    () async {
      var next = 0;
      final released = <int>[];
      final camera = ScannerCameraSession<int>(
        create: () async => ++next,
        release: (id) async => released.add(id),
      );
      await camera.resume();
      expect(camera.current, 1);
      await camera.suspend();
      expect(camera.current, isNull);
      await camera.resume();
      expect(camera.current, 2);
      expect(released, [1]);
      await camera.close();
      expect(released, [1, 2]);
    },
  );

  test(
    'backgrounding during initialization cannot leak or install an old camera',
    () async {
      final opening = Completer<int>();
      final released = <int>[];
      var attempts = 0;
      final camera = ScannerCameraSession<int>(
        create: () async => ++attempts == 1 ? opening.future : 2,
        release: (id) async => released.add(id),
      );
      final first = camera.resume();
      await Future<void>.delayed(Duration.zero);
      final paused = camera.suspend();
      final resumed = camera.resume();
      opening.complete(1);
      await Future.wait([first, paused, resumed]);
      expect(camera.current, 2);
      expect(released, [1]);
      await camera.close();
    },
  );

  test('closing during initialization releases the late controller', () async {
    final opening = Completer<int>();
    final released = <int>[];
    final camera = ScannerCameraSession<int>(
      create: () => opening.future,
      release: (id) async => released.add(id),
    );
    final pending = camera.resume();
    await Future<void>.delayed(Duration.zero);
    final closing = camera.close();
    opening.complete(1);
    await Future.wait([pending, closing]);
    expect(camera.current, isNull);
    expect(released, [1]);
  });

  test('camera initialization failures can be retried', () async {
    var calls = 0;
    final camera = ScannerCameraSession<int>(
      create: () async {
        if (++calls == 1) throw StateError('permission denied');
        return 1;
      },
      release: (_) async {},
    );
    await expectLater(camera.resume(), throwsStateError);
    await camera.resume();
    expect(camera.current, 1);
    await camera.close();
  });

  test(
    'a committed Vault add stays successful when diagnostic logging fails',
    () async {
      var writes = 0;
      final id = await commitScannerVaultAdd<String>(
        commit: () async {
          writes += 1;
          return 'copy-id';
        },
        afterCommit: (_) async => throw StateError('storage failed'),
      );
      expect(id, 'copy-id');
      expect(writes, 1);
    },
  );

  test(
    'a failed Vault write propagates without running confirmation effects',
    () async {
      var confirmations = 0;
      await expectLater(
        commitScannerVaultAdd<String>(
          commit: () async => throw StateError('offline'),
          afterCommit: (_) async {
            confirmations += 1;
          },
        ),
        throwsStateError,
      );
      expect(confirmations, 0);
    },
  );

  test(
    'session log serializes concurrent appends and exports actual events',
    () async {
      SharedPreferences.setMockInitialValues({});
      await Future.wait(
        List.generate(
          12,
          (i) => ScannerSessionLog.append({'scan_id': 'scan-$i'}),
        ),
      );
      final rows = (await ScannerSessionLog.export())
          .split('\n')
          .map(jsonDecode)
          .toList();
      expect(rows.length, 12);
      expect(rows.map((dynamic r) => r['scan_id']).toSet().length, 12);
    },
  );

  test(
    'identity service rejects failed and malformed successful HTTP payloads',
    () async {
      for (final payload in [
        {'ok': false, 'mode': 'unreadable', 'candidates': []},
        {'ok': true, 'mode': 'unknown', 'candidates': []},
        {'ok': true, 'mode': 'fused'},
        {
          'ok': true,
          'mode': 'fused',
          'candidates': [
            {'card_id': 'GV-PK-BS-4'},
          ],
        },
        {'ok': true, 'mode': 'ocr_exact', 'candidates': []},
      ]) {
        final service = ScannerV5IdentityService(
          endpoint: 'https://example.test/identify',
          client: MockClient(
            (_) async => http.Response(jsonEncode(payload), 200),
          ),
        );
        await expectLater(
          service.identify(Uint8List(1)),
          throwsA(isA<ScannerV5ProtocolException>()),
        );
      }
    },
  );

  testWidgets('camera failure keeps Photos, retry and exit available', (
    tester,
  ) async {
    const channel = MethodChannel('plugins.flutter.io/camera');
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (
      call,
    ) async {
      if (call.method == 'availableCameras') {
        throw PlatformException(code: 'CameraAccessDenied');
      }
      return null;
    });
    await tester.pumpWidget(const MaterialApp(home: ScanCaptureV5Screen()));
    await tester.pumpAndSettle();
    expect(find.text('Camera unavailable'), findsOneWidget);
    expect(find.text('Photos'), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
    expect(find.byTooltip('Close scanner'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      null,
    );
  });

  testWidgets(
    'photo permission failures are handled without losing scanner controls',
    (tester) async {
      const camera = MethodChannel('plugins.flutter.io/camera');
      const picker = MethodChannel('plugins.flutter.io/image_picker');
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        camera,
        (_) async => throw PlatformException(code: 'CameraAccessDenied'),
      );
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        picker,
        (_) async => throw PlatformException(code: 'photo_access_denied'),
      );
      await tester.pumpWidget(const MaterialApp(home: ScanCaptureV5Screen()));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Photos'));
      await tester.pumpAndSettle();
      expect(find.text('Could not open photo'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        camera,
        null,
      );
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        picker,
        null,
      );
    },
  );

  testWidgets(
    'a late photo-picker result after closing cannot update disposed state',
    (tester) async {
      const camera = MethodChannel('plugins.flutter.io/camera');
      const picker = MethodChannel('plugins.flutter.io/image_picker');
      final picking = Completer<String?>();
      var opened = 0;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        camera,
        (_) async => throw PlatformException(code: 'CameraAccessDenied'),
      );
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(picker, (
        _,
      ) async {
        opened++;
        return picking.future;
      });
      await tester.pumpWidget(const MaterialApp(home: ScanCaptureV5Screen()));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Photos'));
      await tester.pump();
      await tester.tap(find.text('Photos'));
      await tester.pump();
      expect(opened, 1);
      await tester.pumpWidget(const SizedBox.shrink());
      picking.complete('/unused/photo.jpg');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        camera,
        null,
      );
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        picker,
        null,
      );
    },
  );

  testWidgets(
    'exact-match recovery remains scrollable and disabled during Vault writes',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 480));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      const result = ScannerV5IdentifyResult(
        ok: true,
        mode: 'ocr_exact',
        candidates: [ScannerV5Candidate(id: 'a', name: 'Test card')],
        latencyMs: 1,
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Stack(
              children: [
                ScannerResultSheet(
                  result: result,
                  addingToVault: true,
                  showExactAlternates: true,
                  onAddCandidate: (_) {},
                  onDismiss: () {},
                  onRetake: () {},
                  onShowAlternates: () {},
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pump();
      final retake = find.widgetWithText(TextButton, 'Retake');
      await tester.ensureVisible(retake);
      expect(tester.widget<TextButton>(retake).onPressed, isNull);
      expect(
        tester
            .widget<TextButton>(find.widgetWithText(TextButton, 'Scan next'))
            .onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
