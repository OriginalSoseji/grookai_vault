import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/screens/ebay/ebay_seller_screen.dart';
import 'package:grookai_vault/screens/ebay/ebay_seller_review.dart';
import 'package:grookai_vault/services/ebay/ebay_seller_controller.dart';
import 'package:grookai_vault/services/ebay/ebay_seller_draft_store.dart';
import 'package:grookai_vault/services/ebay/ebay_seller_service.dart';

const _owner = 'ef000000-0000-4000-8000-000000000001';
const _instance = 'ef000000-0000-4000-8000-000000000002';
const _draft = 'ef000000-0000-4000-8000-000000000003';

class _Api implements EbaySellerApi {
  @override
  String get ownerId => _owner;
  final actions = <String>[];
  @override
  Future<Map<String, dynamic>> workspace({String? instanceId}) async => {
    'account': {
      'linked': true,
      'username': 'Collector seller',
      'linkingEnabled': true,
      'preparationEnabled': true,
      'publicationEnabled': true,
    },
    'copy': {
      'id': _instance,
      'name': 'Eevee',
      'setCode': 'PR-SV',
      'number': '173',
      'condition': null,
      'isGraded': false,
    },
    'drafts': [],
  };
  @override
  Future<Map<String, dynamic>> draft(String draftId) async => {};
  @override
  Future<String?> photoPreview(String path) async => null;
  @override
  Future<Map<String, dynamic>> call(
    String action,
    Map<String, dynamic> payload,
  ) async {
    actions.add(action);
    throw StateError('Synthetic fixture does not perform provider operations.');
  }

  @override
  Future<void> uploadPhoto({
    required String draftId,
    required String photoId,
    required String path,
    required Uint8List bytes,
    required String contentType,
  }) async {}
  @override
  void dispose() {}
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  for (final width in [384.0, 1024.0]) {
    for (final brightness in Brightness.values) {
      testWidgets(
        'listing screen fits $width ${brightness.name} at enlarged text',
        (tester) async {
          tester.view.physicalSize = Size(width, 1000);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final api = _Api();
          final model = EbaySellerController(
            api: api,
            initialInstanceId: _instance,
          );
          await tester.pumpWidget(
            MaterialApp(
              theme: ThemeData(brightness: brightness, fontFamily: 'Roboto'),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: const TextScaler.linear(1.5)),
                child: child!,
              ),
              home: EbaySellerScreen(controller: model),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.text('eBay listings'), findsOneWidget);
          expect(find.textContaining('Condition unknown'), findsOneWidget);
          expect(find.text('Load eBay options'), findsOneWidget);
          expect(model.local!.input['condition']['conditionId'], isEmpty);
          final scroll = find.byType(Scrollable).first;
          await tester.scrollUntilVisible(
            find.text('Prepare listing'),
            350,
            scrollable: scroll,
          );
          expect(
            tester
                .widget<FilledButton>(
                  find.widgetWithText(FilledButton, 'Prepare listing'),
                )
                .onPressed,
            isNull,
          );
          expect(tester.takeException(), isNull);
          expect(
            api.actions,
            isEmpty,
            reason: 'Opening a listing never calls a provider mutation.',
          );
          await tester.pumpWidget(const SizedBox.shrink());
          model.dispose();
        },
      );
    }
  }
  testWidgets('every new prepared revision clears the publish confirmation', (
    tester,
  ) async {
    final api = _Api();
    final model = EbaySellerController(api: api);
    addTearDown(model.dispose);
    model.workspace = {
      'account': {'publicationEnabled': true},
    };
    model.local = const EbaySellerLocalDraft(
      ownerId: _owner,
      instanceId: _instance,
      draftId: _draft,
      revision: 1,
      dirty: false,
      input: {'priceCents': 1234},
    );
    model.draft = {
      'id': _draft,
      'revision': 1,
      'reviewHash': 'first-reviewed-payload',
      'state': 'prepared',
      'feeQuote': {'requestedAt': 100000, 'fees': []},
    };
    Future<void> render() => tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: EbaySellerReview(controller: model, nowMillis: 101000),
          ),
        ),
      ),
    );
    await render();
    FilledButton publish() => tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Publish on eBay'),
    );
    expect(publish().onPressed, isNull);
    await tester.tap(find.byType(CheckboxListTile));
    await tester.pump();
    expect(publish().onPressed, isNotNull);
    model.draft = {
      ...model.draft,
      'revision': 2,
      'reviewHash': 'different-reviewed-payload',
    };
    await render();
    expect(
      tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
      false,
    );
    expect(publish().onPressed, isNull);
    expect(api.actions, isEmpty);
  });
}
