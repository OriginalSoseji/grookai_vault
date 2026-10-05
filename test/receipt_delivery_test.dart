import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:grookai_vault/services/sales/receipt_delivery_service.dart';
import 'package:grookai_vault/screens/sales/receipt_delivery_panel.dart';

const receipt = '10000000-0000-4000-8000-000000000001';
const request = '20000000-0000-4000-8000-000000000001';
const delivery = {
  'id': 'delivery',
  'receiptId': receipt,
  'destination': 'buyer@fixture.invalid',
  'channel': 'email',
  'status': 'accepted',
};

void main() {
  test(
    'native sends only saved receipt identity and destination over authenticated no-redirect requests',
    () async {
      final calls = <http.Request>[];
      final service = ReceiptDeliveryService(
        session: () => (owner: 'owner', token: 'synthetic'),
        transport: MockClient((r) async {
          calls.add(r);
          expect(r.url.origin, 'https://grookaivault.com');
          expect(r.followRedirects, isFalse);
          expect(r.headers['Authorization'], 'Bearer synthetic');
          return http.Response(
            jsonEncode({
              'deliveries': [delivery],
            }),
            200,
          );
        }),
      );
      await service.send(
        receiptId: receipt,
        requestId: request,
        channel: 'email',
        destination: ' buyer@fixture.invalid ',
      );
      expect(jsonDecode(calls.single.body), {
        'receiptId': receipt,
        'requestId': request,
        'channel': 'email',
        'destination': 'buyer@fixture.invalid',
        'confirmed': true,
      });
      service.dispose();
    },
  );
  test(
    'native rejects foreign response identities and account switches',
    () async {
      var owner = 'owner';
      var changed = false;
      final service = ReceiptDeliveryService(
        session: () => (owner: owner, token: 'synthetic'),
        transport: MockClient((r) async {
          if (changed) owner = 'other';
          return http.Response(
            jsonEncode({
              'deliveries': [
                {...delivery, 'receiptId': 'foreign'},
              ],
            }),
            200,
          );
        }),
      );
      await expectLater(service.read(receipt), throwsStateError);
      changed = true;
      await expectLater(service.read(receipt), throwsStateError);
      await expectLater(service.read(receipt), throwsStateError);
      service.dispose();
    },
  );
  test(
    'native invalid recipients and untrusted origins never issue HTTP',
    () async {
      var calls = 0;
      final transport = MockClient((r) async {
        calls++;
        return http.Response('{}', 200);
      });
      final service = ReceiptDeliveryService(
        session: () => (owner: 'owner', token: 'synthetic'),
        transport: transport,
      );
      await expectLater(
        service.send(
          receiptId: receipt,
          requestId: request,
          channel: 'sms',
          destination: '5551234567',
        ),
        throwsStateError,
      );
      await expectLater(
        service.send(
          receiptId: receipt,
          requestId: request,
          channel: 'email',
          destination: 'x@fixture.invalid\nBcc:other',
        ),
        throwsStateError,
      );
      final foreign = ReceiptDeliveryService(
        origin: Uri.parse('https://elsewhere.invalid'),
        session: () => (owner: 'owner', token: 'synthetic'),
        transport: transport,
      );
      await expectLater(foreign.capabilities(), throwsStateError);
      expect(calls, 0);
      service.dispose();
    },
  );
  test('native status refresh never creates a send request', () async {
    final service = ReceiptDeliveryService(
      session: () => (owner: 'owner', token: 'synthetic'),
      transport: MockClient((r) async {
        expect(jsonDecode(r.body), {'refreshReceiptId': receipt});
        return http.Response('{"deliveries":[]}', 200);
      }),
    );
    await service.read(receipt, refresh: true);
    service.dispose();
    expect(receiptDeliveryStatus('accepted'), contains('not yet confirmed'));
    expect(receiptDeliveryStatus('uncertain'), contains('do not resend'));
  });
  testWidgets(
    'phone receipt panel requires consent, blocks duplicate taps, retains retry ID and resets consent for changed recipients',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final service = FakeDelivery();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: ReceiptDeliveryPanel(
                receiptId: receipt,
                email: 'buyer@fixture.invalid',
                phone: '+15555550123',
                service: service,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final send = find.widgetWithText(FilledButton, 'Send email receipt');
      expect(tester.widget<FilledButton>(send).onPressed, isNull);
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pump();
      await tester.tap(send);
      await tester.pump();
      expect(service.requests.length, 1);
      expect(tester.widget<FilledButton>(send).onPressed, isNull);
      service.pending.complete([delivery]);
      await tester.pumpAndSettle();
      expect(find.textContaining('delivery not yet confirmed'), findsOneWidget);
      service.pending = Completer<List<Map<String, dynamic>>>();
      await tester.tap(send);
      await tester.pump();
      expect(service.requests.toSet().length, 1);
      service.pending.complete([delivery]);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextField).first,
        'changed@fixture.invalid',
      );
      await tester.pump();
      expect(tester.widget<FilledButton>(send).onPressed, isNull);
      await tester.tap(find.text('Check delivery status'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Delivered'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}

class FakeDelivery extends ReceiptDeliveryService {
  final requests = <String>[];
  Completer<List<Map<String, dynamic>>> pending = Completer();
  @override
  Future<({bool email, bool sms})> capabilities() async =>
      (email: true, sms: true);
  @override
  Future<List<Map<String, dynamic>>> read(
    String id, {
    bool refresh = false,
  }) async => refresh
      ? [
          {...delivery, 'status': 'delivered'},
        ]
      : [];
  @override
  Future<List<Map<String, dynamic>>> send({
    required String receiptId,
    required String requestId,
    required String channel,
    required String destination,
  }) {
    requests.add(requestId);
    return pending.future;
  }
}
