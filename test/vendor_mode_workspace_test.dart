import 'dart:async';
import 'package:grookai_vault/services/pricing/condition_price_service.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/gvvi/vendor_pricing_workspace_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';

void main() {
  testWidgets(
    'exact references follow pending condition and printing and restore failed saves',
    (tester) async {
      final service = _FakeVendorService(
        VendorPricingWorkspaceData(
          rows: [_row(instanceId: 'reference-copy', askingPrice: 20)],
          sections: const [],
        ),
      );
      final requests = <(String, String)>[];
      await tester.pumpWidget(
        MaterialApp(
          home: VendorPricingWorkspaceScreen(
            service: service,
            conditionPriceReader: () => _ReferencePrices(requests),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('2.51'), findsOneWidget);
      final pending = Completer<VendorPricingWorkspaceRow>();
      service.pendingConditionSave = pending;
      final field = find.byKey(const Key('vendor_condition_reference-copy'));
      await tester.ensureVisible(field);
      await tester.tap(field);
      await tester.pumpAndSettle();
      await tester.tap(find.text('LP').last);
      await tester.pump();
      await tester.pump();
      expect(find.text('1.16'), findsOneWidget);
      expect(find.text('2.51'), findsNothing);
      pending.completeError(StateError('fixture save failed'));
      await tester.pumpAndSettle();
      expect(find.text('2.51'), findsOneWidget);
      expect(find.text('1.16'), findsNothing);
      expect(
        tester.widget<DropdownButtonFormField<String>>(field).initialValue,
        'NM',
      );
      expect(requests, [
        ('printing-reference-copy', 'NM'),
        ('printing-reference-copy', 'LP'),
        ('printing-reference-copy', 'NM'),
      ]);
      expect(service.priceSaves, isEmpty);
      expect(
        tester
            .widget<TextField>(
              find.byKey(const Key('vendor_price_reference-copy')),
            )
            .controller!
            .text,
        '20.00',
      );
      final printingSave = Completer<VendorPricingWorkspaceRow>();
      service.pendingPrintingSave = printingSave;
      final printingField = find.byKey(
        const Key('vendor_printing_reference-copy'),
      );
      await tester.ensureVisible(printingField);
      await tester.pumpAndSettle();
      await tester.tap(printingField);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reverse Holo').last);
      await tester.pump();
      await tester.pump();
      expect(find.text('5.34'), findsOneWidget);
      expect(find.text('2.51'), findsNothing);
      printingSave.completeError(StateError('fixture printing save failed'));
      await tester.pumpAndSettle();
      expect(find.text('2.51'), findsOneWidget);
      expect(find.text('5.34'), findsNothing);
      expect(requests.skip(3), [
        ('printing-reverse-reference-copy', 'NM'),
        ('printing-reference-copy', 'NM'),
      ]);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'sale review refreshes the selected copy and retains search and scroll',
    (tester) async {
      final service = _FakeVendorService(
        VendorPricingWorkspaceData(
          rows: List.generate(
            8,
            (index) => _row(instanceId: 'copy-$index', name: 'Eevee $index'),
          ),
          sections: const [],
        ),
      );
      final opened = <String>[];
      await tester.pumpWidget(
        MaterialApp(
          home: VendorPricingWorkspaceScreen(
            service: service,
            saleSheetOpener: (context, gvviId) async {
              opened.add(gvviId);
              return await showModalBottomSheet<bool>(
                    context: context,
                    builder: (context) => TextButton(
                      onPressed: () {
                        service.data = VendorPricingWorkspaceData(
                          rows: service.data.rows
                              .map(
                                (row) => row.gvviId == gvviId
                                    ? row.copyWith(
                                        askingPrice: 21,
                                        intent: 'sell',
                                      )
                                    : row,
                              )
                              .toList(),
                          sections: const [],
                        );
                        Navigator.pop(context, true);
                      },
                      child: const Text('Finish review'),
                    ),
                  ) ??
                  false;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('vendor_search')), 'Eevee');
      await tester.pumpAndSettle();
      final list = find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first;
      final review = find.byKey(const Key('vendor_review_sale_copy-5'));
      await tester.scrollUntilVisible(review, 300, scrollable: list);
      await tester.pumpAndSettle();
      await tester.ensureVisible(review);
      await tester.pumpAndSettle();
      final before = tester.state<ScrollableState>(list).position.pixels;
      final priceController = tester
          .widget<TextField>(find.byKey(const Key('vendor_price_copy-5')))
          .controller!;
      expect(before, greaterThan(0));
      await tester.tap(review);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));
      await tester.tap(find.text('Finish review'));
      await tester.pumpAndSettle();
      expect(opened, ['GVVI-copy-5']);
      expect(service.copyLoads, [
        <String>{'copy-5'},
      ]);
      expect(service.loadCount, 1);
      expect(tester.state<ScrollableState>(list).position.pixels, before);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('vendor_search')))
            .controller!
            .text,
        'Eevee',
      );
      expect(priceController.text, '21.00');
      expect(service.priceSaves, isEmpty);
      expect(service.archivedCopies, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('sale review waits for pending and failed inline price edits', (
    tester,
  ) async {
    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [_row(instanceId: 'copy', askingPrice: 20)],
        sections: const [],
      ),
    );
    final saving = Completer<VendorPricingWorkspaceRow>();
    service.pendingPriceSave = saving;
    var opened = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: VendorPricingWorkspaceScreen(
          service: service,
          saleSheetOpener: (_, _) async {
            opened++;
            return false;
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    final review = find.byKey(const Key('vendor_review_sale_copy'));
    final price = find.byKey(const Key('vendor_price_copy'));
    await tester.enterText(price, '24');
    await tester.pump();
    expect(tester.widget<OutlinedButton>(review).onPressed, isNull);
    await tester.pump(const Duration(milliseconds: 950));
    expect(service.priceSaves, [('copy', 24.0)]);
    expect(tester.widget<OutlinedButton>(review).onPressed, isNull);
    saving.completeError(StateError('Price save failed'));
    await tester.pumpAndSettle();
    expect(tester.widget<OutlinedButton>(review).onPressed, isNull);
    expect(tester.widget<TextField>(price).controller!.text, '24');
    expect(opened, 0);
    expect(service.copyLoads, isEmpty);
    service.pendingPriceSave = null;
    await tester.tap(find.byTooltip('Save price'));
    await tester.pumpAndSettle();
    expect(tester.widget<OutlinedButton>(review).onPressed, isNotNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('an older inventory refresh cannot overwrite sale readback', (
    tester,
  ) async {
    final lifecycle = tester.binding.lifecycleState;
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    addTearDown(
      () => tester.binding.handleAppLifecycleStateChanged(
        lifecycle ?? AppLifecycleState.detached,
      ),
    );
    final oldData = VendorPricingWorkspaceData(
      rows: [_row(instanceId: 'copy', askingPrice: 20)],
      sections: const [],
    );
    final service = _FakeVendorService(oldData);
    await tester.pumpWidget(
      MaterialApp(
        home: VendorPricingWorkspaceScreen(
          service: service,
          saleSheetOpener: (_, _) async {
            service.data = VendorPricingWorkspaceData(
              rows: [_row(instanceId: 'copy', askingPrice: 21, intent: 'sell')],
              sections: const [],
            );
            return true;
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    final oldRead = Completer<VendorPricingWorkspaceData>();
    service.pendingLoad = oldRead;
    await tester.pump(const Duration(seconds: 30));
    expect(service.loadCount, 2);
    final review = find.byKey(const Key('vendor_review_sale_copy'));
    await tester.ensureVisible(review);
    await tester.tap(review);
    await tester.pumpAndSettle();
    final price = find.byKey(const Key('vendor_price_copy'));
    expect(tester.widget<TextField>(price).controller!.text, '21.00');
    oldRead.complete(oldData);
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(price).controller!.text, '21.00');
    expect(service.copyLoads, [
      <String>{'copy'},
    ]);
    expect(service.priceSaves, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('cancelled review preserves another copy draft and opens once', (
    tester,
  ) async {
    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [
          _row(instanceId: 'first'),
          _row(instanceId: 'draft'),
        ],
        sections: const [],
      ),
    );
    final reviewResult = Completer<bool>();
    var opened = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: VendorPricingWorkspaceScreen(
          service: service,
          saleSheetOpener: (_, _) {
            opened++;
            return reviewResult.future;
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    final firstReview = find.byKey(const Key('vendor_review_sale_first'));
    final list = find
        .descendant(
          of: find.byType(ListView),
          matching: find.byType(Scrollable),
        )
        .first;
    await tester.scrollUntilVisible(firstReview, 200, scrollable: list);
    await tester.pumpAndSettle();
    final open = tester.widget<OutlinedButton>(firstReview).onPressed!;
    final draft = find.byKey(const Key('vendor_price_draft'));
    await tester.scrollUntilVisible(draft, -200, scrollable: list);
    await tester.pumpAndSettle();
    final draftController = tester.widget<TextField>(draft).controller!;
    open();
    open();
    await tester.pump();
    expect(opened, 1);
    // A separate row's unsaved draft must survive the selected copy readback.
    draftController.text = 'invalid draft';
    reviewResult.complete(false);
    await tester.pumpAndSettle();
    expect(draftController.text, 'invalid draft');
    expect(service.copyLoads, [
      <String>{'first'},
    ]);
    expect(service.priceSaves, isEmpty);
    await tester.scrollUntilVisible(firstReview, 200, scrollable: list);
    await tester.pumpAndSettle();
    expect(tester.widget<OutlinedButton>(firstReview).onPressed, isNotNull);
    expect(tester.takeException(), isNull);
  });

  for (final failure in ['open', 'refresh', 'identity']) {
    testWidgets('sale review $failure failure remains visible and retryable', (
      tester,
    ) async {
      final original = _row(instanceId: 'copy', askingPrice: 20);
      final service = _FakeVendorService(
        VendorPricingWorkspaceData(rows: [original], sections: const []),
      );
      if (failure == 'refresh') {
        service.copyLoadError = 'Copy refresh failed';
      }
      await tester.pumpWidget(
        MaterialApp(
          home: VendorPricingWorkspaceScreen(
            service: service,
            saleSheetOpener: (_, _) async {
              if (failure == 'open') {
                throw StateError('Sale review unavailable');
              }
              if (failure == 'identity') {
                service.data = VendorPricingWorkspaceData(
                  rows: [_row(instanceId: 'copy', gvviId: 'GVVI-other')],
                  sections: const [],
                );
              }
              return false;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      final review = find.byKey(const Key('vendor_review_sale_copy'));
      await tester.ensureVisible(review);
      await tester.tap(review);
      await tester.pumpAndSettle();
      expect(tester.widget<OutlinedButton>(review).onPressed, isNotNull);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('vendor_price_copy')))
            .controller!
            .text,
        '20.00',
      );
      expect(
        find.textContaining(switch (failure) {
          'open' => 'Sale review unavailable',
          'refresh' => 'Copy refresh failed',
          _ => 'verify this exact copy',
        }),
        findsOneWidget,
      );
      expect(service.priceSaves, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('review readback removes only the copy that became inactive', (
    tester,
  ) async {
    final sibling = _row(instanceId: 'sibling');
    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [
          _row(instanceId: 'copy'),
          sibling,
        ],
        sections: const [],
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: VendorPricingWorkspaceScreen(
          service: service,
          saleSheetOpener: (_, _) async {
            service.data = VendorPricingWorkspaceData(
              rows: [sibling],
              sections: const [],
            );
            return false;
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('vendor_review_sale_copy')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vendor_row_copy')), findsNothing);
    expect(find.byKey(const Key('vendor_row_sibling')), findsOneWidget);
    expect(service.archivedCopies, isEmpty);
    expect(tester.takeException(), isNull);
  });

  for (final brightness in Brightness.values) {
    testWidgets('review action fits 320px at 200% text in $brightness', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 812);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final service = _FakeVendorService(
        VendorPricingWorkspaceData(
          rows: [_row(instanceId: 'copy', askingPrice: 20)],
          sections: const [],
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(brightness: brightness),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(2)),
            child: child!,
          ),
          home: VendorPricingWorkspaceScreen(service: service),
        ),
      );
      await tester.pumpAndSettle();
      final review = find.byKey(const Key('vendor_review_sale_copy'));
      await tester.ensureVisible(review);
      await tester.pumpAndSettle();
      expect(tester.getSize(review).height, greaterThanOrEqualTo(44));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('keyboard leaves the enlarged-text inventory scrollable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(375, 640);
    tester.view.devicePixelRatio = 1;
    tester.view.viewInsets = const FakeViewPadding(bottom: 280);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetViewInsets);
    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [
          _row(instanceId: 'keyboard', askingPrice: 20, marketPrice: 19.2),
        ],
        sections: const [],
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(2)),
          child: child!,
        ),
        home: VendorPricingWorkspaceScreen(service: service),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('Pricing'), findsNothing);
    await tester.tap(find.byTooltip('Vendor tools'));
    await tester.pumpAndSettle();
    expect(find.text('Pricing rules'), findsOneWidget);
    expect(find.text('Print card labels'), findsOneWidget);
    expect(find.text('Square setup'), findsOneWidget);
    expect(service.priceSaves, isEmpty);
  });
  testWidgets('enlarged text keeps the full asking price readable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [
          _row(instanceId: 'large-text', askingPrice: 20, marketPrice: 19.2),
        ],
        sections: const [],
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(2)),
          child: child!,
        ),
        home: VendorPricingWorkspaceScreen(service: service),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      tester.getTopLeft(find.text('TCGPlayer Market')).dy,
      greaterThan(tester.getTopLeft(find.text('Condition')).dy),
    );
    expect(
      tester.getTopLeft(find.text('My price')).dy,
      greaterThan(tester.getTopLeft(find.text('TCGPlayer Market')).dy),
    );
    expect(
      tester.getSize(find.byKey(const Key('vendor_price_large-text'))).height,
      greaterThan(44),
    );
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('vendor_price_large-text')))
          .controller!
          .text,
      '20.00',
    );
    expect(tester.takeException(), isNull);
    expect(service.priceSaves, isEmpty);
  });
  testWidgets(
    'Add card returns to the same filtered inventory without pricing writes',
    (tester) async {
      final service = _FakeVendorService(
        VendorPricingWorkspaceData(
          rows: [
            _row(instanceId: 'copy-1', name: 'Eevee'),
            _row(instanceId: 'copy-2', name: 'Pikachu'),
          ],
          sections: const [],
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: VendorPricingWorkspaceScreen(service: service),
          onGenerateRoute: (settings) {
            expect(settings.name, '/search');
            expect(settings.arguments, Uri.parse('/search'));
            return MaterialPageRoute<void>(
              builder: (context) => Scaffold(
                appBar: AppBar(title: const Text('Search')),
                body: TextButton(
                  onPressed: () {
                    service.data = VendorPricingWorkspaceData(
                      rows: [
                        ...service.data.rows,
                        _row(instanceId: 'new-copy', name: 'Eevee VMAX'),
                      ],
                      sections: const [],
                    );
                    Navigator.pop(context);
                  },
                  child: const Text('Return to vendor'),
                ),
              ),
            );
          },
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('vendor_search')), 'Eevee');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Add card'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Return to vendor'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('vendor_search')))
            .controller!
            .text,
        'Eevee',
      );
      expect(find.byKey(const Key('vendor_row_copy-1')), findsOneWidget);
      expect(find.byKey(const Key('vendor_row_copy-2')), findsNothing);
      expect(find.text('3 exact copies'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const Key('vendor_row_new-copy')),
        300,
        scrollable: find
            .descendant(
              of: find.byType(ListView),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(find.byKey(const Key('vendor_row_new-copy')), findsOneWidget);
      expect(service.priceSaves, isEmpty);
      expect(service.archivedCopies, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'vendor tools exposes pricing and an exact-copy batch label picker',
    (tester) async {
      final service = _FakeVendorService(
        VendorPricingWorkspaceData(
          rows: [
            _row(
              instanceId: 'label-copy',
              gvviId: 'GVVI-AC000001-000001',
              name: 'Eevee',
              askingPrice: 20,
              intent: 'sell',
            ),
          ],
          sections: const [],
        ),
      );
      await tester.pumpWidget(
        MaterialApp(home: VendorPricingWorkspaceScreen(service: service)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Vendor tools'));
      await tester.pumpAndSettle();
      expect(find.text('Pricing rules'), findsOneWidget);
      await tester.tap(find.text('Print card labels'));
      await tester.pumpAndSettle();
      expect(find.text('Choose card labels'), findsOneWidget);
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Preview 1 label'),
            )
            .onPressed,
        isNotNull,
      );
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(service.priceSaves, isEmpty);
    },
  );
  testWidgets(
    'unknown condition is unselected until the collector chooses a grade',
    (tester) async {
      final service = _FakeVendorService(
        VendorPricingWorkspaceData(
          rows: [
            _row(
              instanceId: 'unknown-copy',
              name: 'Unknown condition card',
              conditionLabel: 'Unknown',
            ),
          ],
          sections: const [],
        ),
      );
      await tester.pumpWidget(
        MaterialApp(home: VendorPricingWorkspaceScreen(service: service)),
      );
      await tester.pumpAndSettle();
      final field = find.byKey(const Key('vendor_condition_unknown-copy'));
      await tester.ensureVisible(field);
      final control = tester.widget<DropdownButtonFormField<String>>(field);
      expect(control.initialValue, isNull);
      expect(find.text('Unknown'), findsWidgets);
      expect(service.conditionSaves, isEmpty);
      await tester.tap(field);
      await tester.pumpAndSettle();
      await tester.tap(find.text('LP').last);
      await tester.pumpAndSettle();
      expect(service.conditionSaves.single, ('unknown-copy', 'LP'));
      expect(tester.takeException(), isNull);
    },
  );
  test('market comparison is exact, deterministic, and triage ordered', () {
    final below = _row(instanceId: 'below', askingPrice: 15, marketPrice: 20);
    final above = _row(instanceId: 'above', askingPrice: 24, marketPrice: 20);
    final unpriced = _row(instanceId: 'unpriced', marketPrice: 20);
    final noMarket = _row(instanceId: 'no-market', askingPrice: 12);

    expect(below.marketPosition, VendorMarketPosition.below);
    expect(below.varianceAmount, -5);
    expect(below.variancePercent, -25);
    expect(above.marketPosition, VendorMarketPosition.above);
    expect(unpriced.marketPosition, VendorMarketPosition.unpriced);
    expect(noMarket.marketPosition, VendorMarketPosition.noExactMarket);

    final rows = [noMarket, unpriced, above, below]
      ..sort(compareVendorWorkspaceRows);
    expect(rows.map((row) => row.instanceId), [
      'below',
      'above',
      'no-market',
      'unpriced',
    ]);
  });

  testWidgets('Vendor Mode edits an exact copy without leaving the screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 4500);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [
          _row(
            instanceId: 'copy-1',
            gvviId: 'GVVI-ONE',
            name: 'Charizard ex',
            askingPrice: 15,
            marketPrice: 20,
            intent: 'sell',
          ),
          _row(
            instanceId: 'copy-2',
            gvviId: 'GVVI-TWO',
            name: 'Pikachu',
            marketPrice: 10,
          ),
        ],
        sections: const [
          VendorWorkspaceSection(id: 'sir', name: 'High-end SIR', position: 0),
        ],
      ),
    );

    await tester.pumpWidget(
      MaterialApp(home: VendorPricingWorkspaceScreen(service: service)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Vendor Mode'), findsOneWidget);
    expect(find.text('Add card'), findsOneWidget);
    expect(find.text('Pricing'), findsOneWidget);
    expect(find.text('Labels'), findsOneWidget);
    expect(find.text('Square'), findsOneWidget);
    await tester.tap(find.byTooltip('Vendor tools'));
    await tester.pumpAndSettle();
    expect(find.text('Manage store'), findsOneWidget);
    await tester.tapAt(const Offset(5, 300));
    await tester.pumpAndSettle();
    expect(find.text('Manage store'), findsNothing);
    expect(find.text('2 exact copies'), findsOneWidget);
    expect(find.byKey(const Key('vendor_row_copy-1')), findsOneWidget);
    expect(find.byKey(const Key('vendor_row_copy-2')), findsOneWidget);
    expect(find.textContaining('25% below market'), findsOneWidget);
    expect(find.text('Has ask 1'), findsOneWidget);
    expect(find.text('Needs ask 1'), findsOneWidget);
    expect(find.text('No asking price'), findsOneWidget);

    await tester.tap(find.byKey(const Key('vendor_filter_priced')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vendor_row_copy-1')), findsOneWidget);
    expect(find.byKey(const Key('vendor_row_copy-2')), findsNothing);

    final printingField = find.byKey(const Key('vendor_printing_copy-2')).last;
    await tester.tap(find.byKey(const Key('vendor_filter_all')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(printingField);
    await tester.tap(printingField);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reverse Holo').last);
    await tester.pumpAndSettle();
    expect(service.printingSaves, [('copy-2', 'printing-reverse-copy-2')]);

    await tester.tap(find.byKey(const Key('vendor_more_filters')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('vendor_filter_belowMarket')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vendor_row_copy-1')), findsOneWidget);
    expect(find.byKey(const Key('vendor_row_copy-2')), findsNothing);

    await tester.tap(find.byKey(const Key('vendor_filter_all')));
    await tester.pumpAndSettle();
    final priceField = find.byKey(const Key('vendor_price_copy-2')).last;
    await tester.ensureVisible(priceField);
    await tester.enterText(priceField, '9.00');
    await tester.pump(const Duration(milliseconds: 950));
    await tester.pumpAndSettle();

    expect(service.priceSaves, [('copy-2', 9.0)]);
    expect(
      tester
          .widget<Checkbox>(find.byKey(const Key('vendor_wall_copy-2')))
          .value,
      isTrue,
    );

    final conditionField = find
        .byKey(const Key('vendor_condition_copy-2'))
        .last;
    await tester.ensureVisible(conditionField);
    await tester.tap(conditionField);
    await tester.pumpAndSettle();
    await tester.tap(find.text('LP').last);
    await tester.pumpAndSettle();
    expect(service.conditionSaves, [('copy-2', 'LP')]);

    final sectionsButton = find.byKey(const Key('vendor_sections_copy-2')).last;
    await tester.drag(find.byType(ListView), const Offset(0, -280));
    await tester.pumpAndSettle();
    await tester.ensureVisible(sectionsButton);
    await tester.pumpAndSettle();
    await tester.tap(sectionsButton);
    await tester.pumpAndSettle();
    await tester.tap(find.text('High-end SIR'));
    await tester.pumpAndSettle();
    expect(service.sectionSaves, [('copy-2', 'sir', true)]);
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();

    final soldDismissible = find.byKey(const Key('vendor_dismiss_copy-1'));
    await tester.ensureVisible(soldDismissible);
    await tester.drag(soldDismissible, const Offset(700, 0));
    await tester.pumpAndSettle();
    expect(find.text('Sold'), findsOneWidget);
    expect(find.text('Traded'), findsOneWidget);
    expect(
      tester
          .widget<TextField>(
            find.byKey(const Key('vendor_disposition_sale_price')),
          )
          .controller!
          .text,
      '15.00',
    );
    await tester.enterText(
      find.byKey(const Key('vendor_disposition_counterparty')),
      'Local collector',
    );
    await tester.tap(find.byKey(const Key('vendor_disposition_record')));
    await tester.pumpAndSettle();
    expect(service.dispositions.single.$1, 'copy-1');
    expect(
      service.dispositions.single.$2.disposition,
      VendorCopyDisposition.sold,
    );
    expect(service.dispositions.single.$2.salePrice, 15);
    expect(service.dispositions.single.$2.counterparty, 'Local collector');
    expect(find.byKey(const Key('vendor_row_copy-1')), findsNothing);
    expect(find.text('1 exact copy'), findsOneWidget);

    final dismissible = find.byKey(const Key('vendor_dismiss_copy-2'));
    await tester.ensureVisible(dismissible);
    await tester.drag(dismissible, const Offset(-700, 0));
    await tester.pumpAndSettle();
    expect(find.text('Remove this copy?'), findsOneWidget);
    expect(
      find.textContaining(
        'Pikachu\nGVVI-TWO\n\nThis archives only this exact copy.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Remove from Vault'));
    await tester.pumpAndSettle();
    expect(service.archivedCopies, ['copy-2']);
    expect(find.byKey(const Key('vendor_row_copy-2')), findsNothing);
    expect(find.text('No vendor inventory yet'), findsOneWidget);
  });

  testWidgets('trade records received items and a cash adjustment', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 3000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [_row(instanceId: 'trade-copy', name: 'Trade card')],
        sections: const [],
      ),
    );
    await tester.pumpWidget(
      MaterialApp(home: VendorPricingWorkspaceScreen(service: service)),
    );
    await tester.pumpAndSettle();

    final dismissible = find.byKey(const Key('vendor_dismiss_trade-copy'));
    await tester.drag(dismissible, const Offset(700, 0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Traded'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('vendor_disposition_counterparty')),
      '@PokeJavi',
    );
    await tester.enterText(
      find.byKey(const Key('vendor_disposition_trade_received')),
      'Two vintage cards',
    );
    final cashMode = find.byKey(
      const Key('vendor_disposition_trade_cash_mode'),
    );
    await tester.ensureVisible(cashMode);
    await tester.tap(cashMode);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cash received').last);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('vendor_disposition_trade_cash_amount')),
      '25.00',
    );
    await tester.ensureVisible(
      find.byKey(const Key('vendor_disposition_record')),
    );
    await tester.tap(find.byKey(const Key('vendor_disposition_record')));
    await tester.pumpAndSettle();

    final submission = service.dispositions.single.$2;
    expect(submission.disposition, VendorCopyDisposition.traded);
    expect(submission.counterparty, '@PokeJavi');
    expect(submission.tradeReceived, 'Two vintage cards');
    expect(submission.tradeCashDirection, VendorTradeCashDirection.received);
    expect(submission.tradeCashAmount, 25);
    expect(find.byKey(const Key('vendor_row_trade-copy')), findsNothing);
  });
}

class _FakeVendorService extends VendorPricingWorkspaceService {
  _FakeVendorService(this.data);

  VendorPricingWorkspaceData data;
  final List<(String, double)> priceSaves = [];
  final List<(String, String)> conditionSaves = [];
  final List<(String, String)> printingSaves = [];
  final List<(String, String, bool)> sectionSaves = [];
  final List<String> archivedCopies = [];
  final List<(String, VendorDispositionSubmission)> dispositions = [];
  final List<Set<String>> copyLoads = [];
  int loadCount = 0;
  String? copyLoadError;
  Completer<VendorPricingWorkspaceRow>? pendingPriceSave;
  Completer<VendorPricingWorkspaceRow>? pendingConditionSave;
  Completer<VendorPricingWorkspaceRow>? pendingPrintingSave;
  Completer<VendorPricingWorkspaceData>? pendingLoad;

  @override
  Future<VendorPricingWorkspaceData> load() async {
    loadCount++;
    final pending = pendingLoad;
    if (pending != null) return pending.future;
    return data;
  }

  @override
  Future<VendorPricingWorkspaceData> loadCopies(Set<String> instanceIds) async {
    copyLoads.add(instanceIds.toSet());
    if (copyLoadError != null) throw StateError(copyLoadError!);
    return VendorPricingWorkspaceData(
      rows: data.rows
          .where((row) => instanceIds.contains(row.instanceId))
          .toList(),
      sections: data.sections,
    );
  }

  @override
  Future<VendorPricingWorkspaceRow> savePrice({
    required VendorPricingWorkspaceRow row,
    required double price,
  }) async {
    priceSaves.add((row.instanceId, price));
    if (pendingPriceSave != null) return pendingPriceSave!.future;
    return row.copyWith(askingPrice: price, intent: 'sell');
  }

  @override
  Future<VendorPricingWorkspaceRow> saveCondition({
    required VendorPricingWorkspaceRow row,
    required String condition,
  }) async {
    conditionSaves.add((row.instanceId, condition));
    if (pendingConditionSave != null) return pendingConditionSave!.future;
    return row.copyWith(conditionLabel: condition);
  }

  @override
  Future<VendorPricingWorkspaceRow> savePrinting({
    required VendorPricingWorkspaceRow row,
    required String cardPrintingId,
  }) async {
    printingSaves.add((row.instanceId, cardPrintingId));
    if (pendingPrintingSave != null) return pendingPrintingSave!.future;
    final option = row.printingOptions.firstWhere(
      (value) => value.id == cardPrintingId,
    );
    return row.copyWith(
      cardPrintingId: option.id,
      printingLabel: option.label,
      marketPrice: 12,
      marketObservedAt: DateTime.utc(2026, 8, 17),
      marketProvenanceId: 'proof-${row.instanceId}',
      clearMarketEvidence: true,
    );
  }

  @override
  Future<VendorPricingWorkspaceRow> saveSectionMembership({
    required VendorPricingWorkspaceRow row,
    required String sectionId,
    required bool selected,
  }) async {
    sectionSaves.add((row.instanceId, sectionId, selected));
    final next = row.sectionIds.toSet();
    selected ? next.add(sectionId) : next.remove(sectionId);
    return row.copyWith(sectionIds: next);
  }

  @override
  Future<void> archiveCopy({required VendorPricingWorkspaceRow row}) async {
    archivedCopies.add(row.instanceId);
  }

  @override
  Future<void> disposeCopy({
    required VendorPricingWorkspaceRow row,
    required VendorDispositionSubmission submission,
  }) async {
    dispositions.add((row.instanceId, submission));
  }
}

class _ReferencePrices implements ConditionPriceReader {
  _ReferencePrices(this.requests);
  final List<(String, String)> requests;
  @override
  Future<ConditionPriceReference> read(
    String printingId,
    String condition,
  ) async {
    requests.add((printingId, condition));
    return ConditionPriceReference(
      printingId: printingId,
      condition: condition,
      amount: printingId.contains('reverse')
          ? 5.34
          : condition == 'NM'
          ? 2.51
          : 1.16,
      updatedAt: DateTime.utc(2026, 11, 17),
    );
  }

  @override
  void dispose() {}
}

VendorPricingWorkspaceRow _row({
  required String instanceId,
  String? gvviId,
  String name = 'Test card',
  double? askingPrice,
  double? marketPrice,
  String intent = 'hold',
  String conditionLabel = 'NM',
}) {
  return VendorPricingWorkspaceRow(
    instanceId: instanceId,
    gvviId: gvviId ?? 'GVVI-$instanceId',
    vaultItemId: 'vault-$instanceId',
    cardPrintId: 'card-$instanceId',
    cardPrintingId: 'printing-$instanceId',
    gvId: 'GV-PK-TEST-$instanceId',
    name: name,
    displayName: name,
    setName: 'Test Set',
    setCode: 'tst',
    number: '1',
    printingLabel: 'Holo',
    conditionLabel: conditionLabel,
    intent: intent,
    isGraded: false,
    marketPrice: marketPrice,
    marketObservedAt: DateTime.utc(2026, 8, 17),
    marketProvenanceId: marketPrice == null ? null : 'proof-$instanceId',
    askingPrice: askingPrice,
    currency: 'USD',
    sectionIds: const {},
    printingOptions: [
      VendorPrintingOption(
        id: 'printing-$instanceId',
        cardPrintId: 'card-$instanceId',
        label: 'Holo',
        sortOrder: 0,
      ),
      VendorPrintingOption(
        id: 'printing-reverse-$instanceId',
        cardPrintId: 'card-$instanceId',
        label: 'Reverse Holo',
        sortOrder: 1,
      ),
    ],
  );
}
