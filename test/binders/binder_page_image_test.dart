import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart';
import 'package:grookai_vault/models/binders/binder_grid_layout.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/theme/gv_typography.dart';
import 'package:grookai_vault/widgets/binders/binder_page_image.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'package:grookai_vault/widgets/binders/binder_page_image_sheet.dart';
import 'binder_refinement_test.dart' as f;
import 'binder_drag_arrangement_test.dart' as drag;
import 'binder_grid_size_test.dart' as grid;
import 'binder_move_history_test.dart' as history;
import 'binder_page_picker_test.dart' as picker;
import 'binder_editor_navigation_test.dart' as nav;
import 'binder_draft_exit_test.dart' as exit;

final share = find.byKey(const ValueKey('binder-share-image-confirm'));
final close = find.byTooltip('Close page image');
final sheet = find.byType(BinderPageImageSheet);

class FakeExport extends GrookaiObjectExportService {
  int captures = 0, shares = 0;
  bool captureFails = false, shareFails = false;
  Completer<Uint8List>? pending;
  String? file, subject;
  Rect? origin;
  ShareResult result = const ShareResult(
    'dismissed',
    ShareResultStatus.dismissed,
  );
  @override
  Future<Uint8List> capturePng(GlobalKey key, {double pixelRatio = 3}) async {
    captures++;
    expect(pixelRatio, 2);
    expect(key.currentContext, isNotNull);
    if (captureFails) throw StateError('capture');
    return pending == null
        ? Uint8List.fromList([137, 80, 78, 71])
        : pending!.future;
  }

  @override
  Future<ShareResult> sharePng({
    required Uint8List bytes,
    required String fileName,
    String? text,
    String? subject,
    Rect? sharePositionOrigin,
  }) async {
    shares++;
    file = fileName;
    this.subject = subject;
    origin = sharePositionOrigin;
    expect(bytes, [137, 80, 78, 71]);
    expect(text, isNull);
    if (shareFails) throw StateError('share');
    return result;
  }
}

Future<void> show(
  WidgetTester tester,
  FakeExport service, {
  bool Function()? current,
  Brightness mode = Brightness.dark,
  double scale = 1,
  List<BinderCustomSlotDraft>? slots,
}) async {
  await tester.pumpWidget(
    f.app(
      Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () => showModalBottomSheet<void>(
              context: context,
              isScrollControlled: true,
              useSafeArea: true,
              constraints: BoxConstraints(
                maxWidth: 660,
                maxHeight: MediaQuery.sizeOf(context).height * .9,
              ),
              builder: (_) => BinderPageImageSheet(
                slots: slots ?? drag.sampleSlots(3),
                layout: BinderGridLayout.twoByTwo,
                page: 1,
                totalPages: 3,
                isCurrent: current ?? () => true,
                exportService: service,
              ),
            ),
            child: const Text('Open'),
          ),
        ),
      ),
      mode: mode,
      scale: scale,
    ),
  );
  await tester.tap(find.text('Open'));
  await tester.pumpAndSettle();
}

Future<void> openFromGrid(WidgetTester tester) async {
  final button = find.byKey(const ValueKey('binder-share-page'));
  await tester.ensureVisible(button);
  await tester.pumpAndSettle();
  await tester.tap(button);
  await tester.pumpAndSettle();
}

void main() {
  for (final layout in BinderGridLayout.values) {
    for (final mode in Brightness.values) {
      testWidgets(
        'full PNG for ${layout.storageKey} $mode includes offscreen rows at fixed 1080px width',
        (tester) async {
          picker.viewport(tester, const Size(700, 420));
          final boundary = GlobalKey();
          final slots = drag.sampleSlots(layout.pockets);
          final imageWidget = BinderPageImage(
            slots: slots,
            artworkUrls: List.filled(slots.length, null),
            layout: layout,
            page: 1,
            totalPages: 3,
          );
          final preview = FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.topCenter,
            child: SizedBox(
              width: BinderPageImage.width,
              child: RepaintBoundary(key: boundary, child: imageWidget),
            ),
          );
          await tester.pumpWidget(
            f.app(
              Scaffold(body: SingleChildScrollView(child: preview)),
              mode: mode,
              scale: 1.6,
            ),
          );
          await tester.pumpAndSettle();
          expect(find.text('Pocket ${layout.pockets + 1}'), findsOneWidget);
          expect(find.text('Pocket ${layout.pockets * 2}'), findsOneWidget);
          expect(
            find.text('Checklist requirements · Ownership not shown'),
            findsOneWidget,
          );
          final brand = tester.widget<GrookaiBrandText>(
            find.byType(GrookaiBrandText),
          );
          expect(brand.includeVault, isTrue);
          final render =
              boundary.currentContext!.findRenderObject()!
                  as RenderRepaintBoundary;
          Uint8List? bytes;
          await tester.runAsync(() async {
            final image = await render.toImage(pixelRatio: 2);
            final data = await image.toByteData(format: ui.ImageByteFormat.png);
            bytes = data!.buffer.asUint8List();
            image.dispose();
          });
          expect(bytes!.sublist(0, 8), [137, 80, 78, 71, 13, 10, 26, 10]);
          final header = ByteData.sublistView(bytes!);
          expect(header.getUint32(16), 1080);
          expect(header.getUint32(20), greaterThan(840));
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
  testWidgets(
    'partial page preserves exact printed identity, finishes and quantities with unused pockets',
    (tester) async {
      const card = BinderCatalogCard(
        cardPrintId: 'canonical-id-never-printed',
        name: 'Eevee',
        setLabel: 'Scarlet & Violet Promos',
        number: '173',
        printedIdentityModifier: 'pokemon_center_stamp',
      );
      const slots = [
        BinderCustomSlotDraft(
          card: card,
          finish: f.reverseFinish,
          requiredQuantity: 3,
        ),
      ];
      await tester.pumpWidget(
        f.app(
          Scaffold(
            body: SingleChildScrollView(
              child: SizedBox(
                width: 540,
                child: BinderPageImage(
                  slots: slots,
                  artworkUrls: const [null],
                  layout: BinderGridLayout.twoByTwo,
                  page: 2,
                  totalPages: 3,
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Eevee · Pokémon Center Stamp'), findsOneWidget);
      expect(find.text('Reverse Holo · 3 copies required'), findsOneWidget);
      expect(find.text('Pocket 9'), findsOneWidget);
      expect(find.text('Unused'), findsNWidgets(3));
      expect(find.textContaining('canonical-id-never-printed'), findsNothing);
      expect(find.textContaining('exact-reverse'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'explicit share passes PNG with stable filename and platform anchor; cancellation keeps preview',
    (tester) async {
      final service = FakeExport();
      await show(tester, service);
      expect(
        find.text(
          '3 artwork images are unavailable. Placeholders will be included.',
        ),
        findsOneWidget,
      );
      await tester.tap(share);
      await tester.pumpAndSettle();
      expect(service.captures, 1);
      expect(service.shares, 1);
      expect(service.file, 'grookai-binder-page-2-2x2.png');
      expect(service.subject, 'grookai vault · Binder checklist · Page 2');
      expect(service.origin!.width, greaterThan(0));
      expect(service.origin!.height, greaterThan(0));
      expect(sheet, findsOneWidget);
    },
  );
  for (final kind in ['capture', 'share', 'unavailable']) {
    testWidgets('$kind failure can recover without discarding the preview', (
      tester,
    ) async {
      final service = FakeExport();
      service.captureFails = kind == 'capture';
      service.shareFails = kind == 'share';
      if (kind == 'unavailable') service.result = ShareResult.unavailable;
      await show(tester, service);
      await tester.tap(share);
      await tester.pumpAndSettle();
      expect(
        find.text(
          kind == 'capture'
              ? 'Could not prepare the page image. Try again.'
              : kind == 'share'
              ? 'Could not open sharing. Try again.'
              : 'Sharing is unavailable on this device.',
        ),
        findsOneWidget,
      );
      service.captureFails = false;
      service.shareFails = false;
      service.result = const ShareResult(
        'dismissed',
        ShareResultStatus.dismissed,
      );
      await tester.tap(share);
      await tester.pumpAndSettle();
      expect(service.captures, 2);
      expect(service.shares, kind == 'capture' ? 1 : 2);
      expect(tester.takeException(), isNull);
    });
  }
  testWidgets('stale snapshot blocks sharing before capture', (tester) async {
    var current = true;
    final service = FakeExport();
    await show(tester, service, current: () => current);
    current = false;
    await tester.tap(share);
    await tester.pumpAndSettle();
    expect(service.captures, 0);
    expect(service.shares, 0);
    expect(
      find.text(
        'The checklist or grid changed. Close this preview and open it again.',
      ),
      findsOneWidget,
    );
    expect(tester.widget<FilledButton>(share).onPressed, isNull);
  });
  testWidgets(
    'snapshot becoming stale during capture never reaches native sharing',
    (tester) async {
      var current = true;
      final service = FakeExport()..pending = Completer<Uint8List>();
      await show(tester, service, current: () => current);
      await tester.tap(share);
      await tester.pump();
      current = false;
      service.pending!.complete(Uint8List.fromList([137, 80, 78, 71]));
      await tester.pumpAndSettle();
      expect(service.captures, 1);
      expect(service.shares, 0);
      expect(
        find.text(
          'The checklist or grid changed. Close this preview and open it again.',
        ),
        findsOneWidget,
      );
    },
  );
  testWidgets(
    'duplicate taps capture once and closing during capture cancels the handoff',
    (tester) async {
      final service = FakeExport()..pending = Completer<Uint8List>();
      await show(tester, service);
      await tester.tap(share);
      await tester.tap(share, warnIfMissed: false);
      await tester.pump();
      expect(service.captures, 1);
      await tester.tap(close);
      await tester.pumpAndSettle();
      service.pending!.complete(Uint8List.fromList([137, 80, 78, 71]));
      await tester.pumpAndSettle();
      expect(service.shares, 0);
      expect(sheet, findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'missing artwork retries with the same page and exact requirement',
    (tester) async {
      final service = FakeExport();
      await show(tester, service, slots: const [nav.exactSlot]);
      final retry = find.text('Retry artwork');
      await tester.ensureVisible(retry);
      await tester.pumpAndSettle();
      await tester.tap(retry);
      await tester.pumpAndSettle();
      expect(
        find.text(
          '1 artwork image is unavailable. Placeholders will be included.',
        ),
        findsOneWidget,
      );
      expect(find.text('Reverse Holo · 3 copies required'), findsOneWidget);
      expect(service.captures, 0);
    },
  );
  testWidgets(
    'failed primary and fallback artwork remain explicit placeholders and can retry',
    (tester) async {
      const slot = BinderCustomSlotDraft(
        card: BinderCatalogCard(
          cardPrintId: 'unavailable-art',
          name: 'Eevee',
          setLabel: 'Promos',
          hostedImageUrl: 'https://invalid.example/primary.png',
          fallbackImageUrl: 'https://invalid.example/fallback.png',
        ),
        finish: f.holoFinish,
      );
      await show(tester, FakeExport(), slots: const [slot]);
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          '1 artwork image is unavailable. Placeholders will be included.',
        ),
        findsOneWidget,
      );
      final retry = find.text('Retry artwork');
      await tester.ensureVisible(retry);
      await tester.pumpAndSettle();
      await tester.tap(retry);
      await tester.pumpAndSettle();
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          '1 artwork image is unavailable. Placeholders will be included.',
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  for (final mode in Brightness.values) {
    for (final size in [
      const Size(320, 640),
      const Size(390, 844),
      const Size(700, 420),
      const Size(1100, 700),
    ]) {
      testWidgets(
        'page image preview fits $mode $size enlarged text with fixed controls',
        (tester) async {
          picker.viewport(tester, size);
          await show(tester, FakeExport(), mode: mode, scale: 1.6);
          final scroll = find.descendant(
            of: find.byKey(const ValueKey('binder-page-image-scroll')),
            matching: find.byType(Scrollable),
          );
          await tester.scrollUntilVisible(
            find.text('Checklist requirements · Ownership not shown'),
            150,
            scrollable: scroll,
          );
          await tester.pumpAndSettle();
          expect(tester.getRect(close).top, greaterThanOrEqualTo(0));
          expect(tester.getSize(close).height, greaterThanOrEqualTo(48));
          expect(tester.getRect(share).bottom, lessThanOrEqualTo(size.height));
          expect(tester.getSize(share).height, greaterThanOrEqualTo(48));
          await tester.tap(close);
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
  for (final mode in Brightness.values) {
    testWidgets(
      'narrow enlarged arrangement header keeps sharing and page controls reachable $mode',
      (tester) async {
        picker.viewport(tester, const Size(320, 640));
        await grid.showGrid(
          tester,
          grid.localPreferences(),
          drag.sampleSlots(12),
          <List<int>>[],
          mode: mode,
          scale: 1.6,
        );
        expect(tester.takeException(), isNull);
        await openFromGrid(tester);
        expect(sheet, findsOneWidget);
        await tester.tap(close);
        await tester.pumpAndSettle();
        expect(find.byTooltip('Next binder page'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'only current page is captured; page and move selection survive preview',
    (tester) async {
      final slots = drag.sampleSlots(12);
      final moves = <List<int>>[];
      await grid.showGrid(tester, grid.localPreferences(), slots, moves);
      final pocket = find.byKey(const ValueKey('binder-pocket-0'));
      await tester.tapAt(tester.getTopLeft(pocket) + const Offset(20, 20));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Next binder page'));
      await tester.pumpAndSettle();
      await openFromGrid(tester);
      final preview = tester.widget<BinderPageImageSheet>(sheet);
      expect(preview.page, 1);
      expect(preview.totalPages, 2);
      expect(preview.slots.length, 3);
      expect(preview.slots.first.card.name, 'Card 9');
      await tester.tap(close);
      await tester.pumpAndSettle();
      expect(find.text('2 / 2'), findsOneWidget);
      expect(find.text('Moving from pocket 1'), findsOneWidget);
      expect(moves, isEmpty);
    },
  );
  testWidgets('preview preserves Undo history and does not dirty an editor', (
    tester,
  ) async {
    await exit.openEditor(tester);
    await nav.switchView(tester, 'arrange');
    await history.move(tester, 0, 1);
    await openFromGrid(tester);
    await tester.tap(close);
    await tester.pumpAndSettle();
    await history.action(tester, 'undo');
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Open editor'), findsOneWidget);
    expect(find.text('Discard checklist changes?'), findsNothing);
  });
  testWidgets(
    'live external change is rejected by the arrangement snapshot guard',
    (tester) async {
      final slots = drag.sampleSlots(3);
      late StateSetter update;
      await tester.pumpWidget(
        f.app(
          Scaffold(
            body: SingleChildScrollView(
              child: StatefulBuilder(
                builder: (_, set) {
                  update = set;
                  return BinderPageArrangement(slots: slots, onMove: (_, _) {});
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await openFromGrid(tester);
      update(() => slots.removeLast());
      await tester.pumpAndSettle();
      expect(tester.widget<BinderPageImageSheet>(sheet).slots.length, 3);
      expect(tester.widget<BinderPageImageSheet>(sheet).isCurrent(), isFalse);
      await tester.tap(share);
      await tester.pumpAndSettle();
      expect(
        find.text(
          'The checklist or grid changed. Close this preview and open it again.',
        ),
        findsOneWidget,
      );
    },
  );
  testWidgets('sharing control is disabled during an active drag', (
    tester,
  ) async {
    final slots = drag.sampleSlots(3);
    await grid.showGrid(tester, grid.localPreferences(), slots, <List<int>>[]);
    final gesture = await drag.lift(tester);
    expect(
      tester
          .widget<IconButton>(find.byKey(const ValueKey('binder-share-page')))
          .onPressed,
      isNull,
    );
    await gesture.cancel();
    await tester.pumpAndSettle();
  });
}
