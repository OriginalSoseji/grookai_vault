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
  bool showDraftList = false;
  final draftSummaries = <Map<String, dynamic>>[
    {
      'id': _draft,
      'instanceId': _instance,
      'state': 'editing',
      'revision': 2,
      'title': 'Eevee · Japanese 173',
    },
    {
      'id': 'ef000000-0000-4000-8000-000000000004',
      'instanceId': _instance,
      'state': 'live',
      'revision': 4,
      'title': 'Pikachu · Base Set 58',
    },
  ];
  @override
  Future<Map<String, dynamic>> workspace({String? instanceId}) async => {
    'account': {
      'linked': true,
      'username': 'Collector seller',
      'linkingEnabled': true,
      'preparationEnabled': true,
      'publicationEnabled': true,
    },
    'copy': showDraftList
        ? null
        : {
            'id': _instance,
            'name': 'Eevee',
            'setCode': 'PR-SV',
            'number': '173',
            'condition': null,
            'isGraded': false,
          },
    'drafts': showDraftList ? draftSummaries : [],
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
    if (action == 'abandon') {
      final row = draftSummaries.firstWhere(
        (item) => item['id'] == payload['draftId'],
      );
      row['state'] = 'abandoned';
      return {
        'state': 'abandoned',
        'revision': (payload['revision'] as int) + 1,
      };
    }
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
  testWidgets('saved listing drafts can be removed from their list', (
    tester,
  ) async {
    final api = _Api()..showDraftList = true;
    final model = EbaySellerController(api: api);
    addTearDown(model.dispose);
    await model.refresh();
    await tester.pumpWidget(
      MaterialApp(home: EbaySellerScreen(controller: model)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Eevee · Japanese 173'), findsOneWidget);
    expect(find.text('Pikachu · Base Set 58'), findsOneWidget);
    expect(find.byTooltip('Remove draft'), findsOneWidget);
    await tester.tap(find.byTooltip('Remove draft'));
    await tester.pumpAndSettle();
    expect(find.text('Remove this draft?'), findsOneWidget);
    await tester.tap(find.text('Keep draft'));
    await tester.pumpAndSettle();
    expect(api.actions, isEmpty);

    await tester.tap(find.byTooltip('Remove draft'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Remove draft'));
    await tester.pumpAndSettle();
    expect(api.actions, ['abandon']);
    expect(find.text('Eevee · Japanese 173'), findsNothing);
    expect(find.text('Pikachu · Base Set 58'), findsOneWidget);
    expect(find.byTooltip('Remove draft'), findsNothing);
  });

  for (final state in ['editing', 'prepared']) {
    testWidgets('$state draft removal requires explicit confirmation', (
      tester,
    ) async {
      final api = _Api();
      final model = EbaySellerController(api: api);
      addTearDown(model.dispose);
      model.local = const EbaySellerLocalDraft(
        ownerId: _owner,
        instanceId: _instance,
        draftId: _draft,
        revision: 1,
        dirty: false,
        input: {},
      );
      model.draft = {'id': _draft, 'revision': 1, 'state': state};
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: EbaySellerReview(controller: model, nowMillis: 0),
            ),
          ),
        ),
      );
      final remove = find.widgetWithText(OutlinedButton, 'Remove draft');
      await tester.ensureVisible(remove);
      await tester.tap(remove);
      await tester.pumpAndSettle();
      expect(find.text('Remove this draft?'), findsOneWidget);
      expect(api.actions, isEmpty);
      await tester.tap(find.text('Keep draft'));
      await tester.pumpAndSettle();
      expect(api.actions, isEmpty);
      await tester.tap(remove);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Remove draft'));
      await tester.pumpAndSettle();
      expect(api.actions, ['abandon']);
    });
  }
  for (final state in [
    'uncertain',
    'preparing',
    'publishing',
    'live',
    'sold',
  ]) {
    testWidgets('$state cannot remove a draft from the review surface', (
      tester,
    ) async {
      final api = _Api();
      final model = EbaySellerController(api: api);
      addTearDown(model.dispose);
      model.draft = {'id': _draft, 'revision': 1, 'state': state};
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: EbaySellerReview(controller: model, nowMillis: 0),
            ),
          ),
        ),
      );
      expect(find.text('Remove draft'), findsNothing);
      expect(api.actions, isEmpty);
    });
  }
  testWidgets('cold OAuth return offers the saved sale-card resume action', (
    tester,
  ) async {
    final model = EbaySellerController(api: _Api());
    var resumed = false;
    await tester.pumpWidget(
      MaterialApp(
        home: EbaySellerScreen(
          controller: model,
          onResumeSaleCard: () => resumed = true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    final resume = find.widgetWithText(OutlinedButton, 'Resume sale card');
    expect(resume, findsOneWidget);
    await tester.tap(resume);
    expect(resumed, isTrue);

    await tester.pumpWidget(const SizedBox.shrink());
    model.dispose();
  });

  for (final state in ['live', 'publishing', 'preparing']) {
    testWidgets('$state keeps an explicit provider-status recovery action', (
      tester,
    ) async {
      final api = _Api();
      final model = EbaySellerController(api: api);
      addTearDown(model.dispose);
      model.draft = {'id': _draft, 'revision': 1, 'state': state};
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EbaySellerReview(controller: model, nowMillis: 0),
          ),
        ),
      );
      final status = find.widgetWithText(OutlinedButton, 'Check eBay status');
      expect(status, findsOneWidget);
      expect(tester.widget<OutlinedButton>(status).onPressed, isNotNull);
      expect(api.actions, isEmpty);
    });
  }
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
    model.draft = {...model.draft, 'state': 'publishing'};
    await render();
    model.draft = {...model.draft, 'state': 'prepared'};
    await render();
    expect(publish().onPressed, isNull);
    expect(
      tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
      false,
    );
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
