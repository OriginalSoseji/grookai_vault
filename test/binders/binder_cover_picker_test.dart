import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';
import 'package:grookai_vault/widgets/binders/binder_cover_picker_sheet.dart';
import '../support/collector_refinement/binder_library_repository.dart';
import '../support/collector_refinement/catalog.dart';
import '../support/collector_refinement/main.dart' as preview;
import 'binder_refinement_test.dart' as f;
import 'binder_main_integration_test.dart' as integration;
import 'binder_page_picker_test.dart' as picker;

const candidates = [
  BinderChecklistItem(
    slotId: 'a',
    cardPrintId: 'eevee-1',
    name: 'Eevee',
    setLabel: 'Scarlet & Violet Promos',
    number: '173',
    requiredQuantity: 1,
    activeQuantity: 0,
    hasHostedImage: true,
  ),
  BinderChecklistItem(
    slotId: 'b',
    cardPrintId: 'eevee-2',
    name: 'Eevee',
    setLabel: 'Jungle',
    number: '51',
    requiredQuantity: 1,
    activeQuantity: 0,
    hasHostedImage: true,
  ),
  BinderChecklistItem(
    slotId: 'c',
    cardPrintId: 'alakazam',
    name: 'Alakazam',
    setLabel: 'Base Set',
    number: '1',
    requiredQuantity: 1,
    activeQuantity: 0,
    hasHostedImage: true,
  ),
];

Future<void> mountPicker(
  WidgetTester tester, {
  List<BinderChecklistItem> cards = candidates,
  String selected = '',
  String current = '',
  bool canKeep = false,
  Brightness mode = Brightness.dark,
  double scale = 1,
  double keyboard = 0,
  void Function(String?)? result,
}) async {
  await tester.pumpWidget(
    f.app(
      Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              final value = await showModalBottomSheet<String>(
                context: context,
                isScrollControlled: true,
                useSafeArea: true,
                constraints: const BoxConstraints(maxWidth: 640),
                builder: (_) => BinderCoverPickerSheet(
                  candidates: cards,
                  selectedId: selected,
                  currentId: current,
                  canKeepCurrent: canKeep,
                ),
              );
              result?.call(value);
            },
            child: const Text('Open'),
          ),
        ),
      ),
      mode: mode,
      scale: scale,
      keyboard: keyboard,
    ),
  );
  await tester.tap(find.text('Open'));
  await tester.pumpAndSettle();
}

class CoverRepository extends PreviewBinderLibraryRepository {
  CoverRepository()
    : super(
        catalog: preview.PreviewBinderRepository(),
        initialSlots: [
          for (final card in previewCatalog.take(3))
            BinderCustomSlotDraft(
              card: BinderCatalogCard(
                cardPrintId: card['id']!,
                name: card['name']!,
                setLabel: preview.previewSet(card),
                number: card['number'],
                hostedImageUrl: preview.previewImage(card),
              ),
              finish: f.anyFinish,
            ),
        ],
      );
  int updates = 0;
  @override
  Future<void> updateMetadata({
    required String publicId,
    required String title,
    required String description,
    required String? coverCardPrintId,
  }) async {
    updates++;
    await super.updateMetadata(
      publicId: publicId,
      title: title,
      description: description,
      coverCardPrintId: coverCardPrintId,
    );
  }
}

Future<void> editDetails(WidgetTester tester, CoverRepository repo) async {
  await integration.mount(tester, repo);
  await integration.openBinder(tester, 'Family Binder · Sample');
  await tester.ensureVisible(find.text('Settings'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Settings'));
  await tester.pumpAndSettle();
  await integration.reveal(tester, find.text('Title and description'));
  await tester.tap(find.text('Title and description'));
  await tester.pumpAndSettle();
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  testWidgets(
    'search distinguishes same-name cards by set and number; selection returns only canonical ID',
    (tester) async {
      String? chosen;
      await mountPicker(tester, result: (v) => chosen = v);
      await tester.enterText(
        find.byKey(const ValueKey('binder-cover-search')),
        ' EEVEE  #173 ',
      );
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text('1 cover'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('binder-cover-choice-eevee-2')),
        findsNothing,
      );
      await tester.tap(
        find.byKey(const ValueKey('binder-cover-choice-eevee-1')),
      );
      await tester.pumpAndSettle();
      expect(chosen, 'eevee-1');
    },
  );
  testWidgets(
    'No cover stays available with no matches and search can recover',
    (tester) async {
      String? chosen;
      await mountPicker(tester, result: (v) => chosen = v);
      await tester.enterText(
        find.byKey(const ValueKey('binder-cover-search')),
        'unmatched',
      );
      await tester.pumpAndSettle();
      expect(find.text('No matching artwork'), findsOneWidget);
      expect(find.text('No cover'), findsOneWidget);
      await tester.tap(find.text('Clear search'));
      await tester.pumpAndSettle();
      expect(find.text('3 covers'), findsOneWidget);
      await tester.tap(find.text('No cover'));
      await tester.pumpAndSettle();
      expect(chosen, '');
    },
  );
  testWidgets('close cancels rather than clearing the current cover', (
    tester,
  ) async {
    String? chosen = 'not-returned';
    await mountPicker(tester, selected: 'eevee-1', result: (v) => chosen = v);
    await tester.tap(find.byTooltip('Close cover picker'));
    await tester.pumpAndSettle();
    expect(chosen, isNull);
  });
  testWidgets(
    'empty eligible set offers explicit No cover without enabling a forbidden current cover',
    (tester) async {
      await mountPicker(tester, cards: [], selected: 'old', current: 'old');
      expect(
        find.text('No eligible checklist artwork available.'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<ListTile>(
              find.widgetWithText(ListTile, 'Current cover needs replacement'),
            )
            .enabled,
        isFalse,
      );
      await tester.tap(find.text('No cover'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('permitted legacy current cover remains an explicit choice', (
    tester,
  ) async {
    String? chosen;
    await mountPicker(
      tester,
      cards: [],
      current: 'legacy',
      canKeep: true,
      result: (v) => chosen = v,
    );
    await tester.tap(find.text('Keep current cover'));
    await tester.pumpAndSettle();
    expect(chosen, 'legacy');
  });
  testWidgets(
    'selected artwork exposes full card identity and selection to screen readers',
    (tester) async {
      final semantics = tester.ensureSemantics();
      await mountPicker(tester, selected: 'eevee-1');
      expect(
        find.bySemanticsLabel(
          'Eevee. Scarlet & Violet Promos · #173. Use as Binder cover.',
        ),
        findsOneWidget,
      );
      expect(find.byIcon(Icons.check_circle_rounded), findsOneWidget);
      semantics.dispose();
    },
  );
  testWidgets(
    'gallery choice stays a draft and Cancel makes no repository update',
    (tester) async {
      final repo = CoverRepository();
      await editDetails(tester, repo);
      await tester.enterText(
        find.widgetWithText(TextField, 'Title'),
        'Unsaved sample name',
      );
      await tester.tap(find.text('Choose artwork'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.byKey(
          ValueKey('binder-cover-choice-${previewCatalog.first['id']}'),
        ),
      );
      await tester.pumpAndSettle();
      expect(repo.updates, 0);
      expect(find.text('Unsaved sample name'), findsOneWidget);
      expect(find.text('Scarlet & Violet Promos · #173'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(repo.updates, 0);
      expect(
        (await repo.loadDetail(
          PreviewBinderLibraryRepository.familyId,
        )).coverCardPrintId,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'Save uses existing metadata boundary and returns cover artwork to main library',
    (tester) async {
      final repo = CoverRepository();
      await editDetails(tester, repo);
      await tester.tap(find.text('Choose artwork'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.byKey(
          ValueKey('binder-cover-choice-${previewCatalog.first['id']}'),
        ),
      );
      await tester.pumpAndSettle();
      expect(repo.updates, 0);
      await tester.tap(find.widgetWithText(FilledButton, 'Save'));
      await tester.pumpAndSettle();
      expect(repo.updates, 1);
      final detail = await repo.loadDetail(
        PreviewBinderLibraryRepository.familyId,
      );
      expect(detail.coverCardPrintId, previewCatalog.first['id']);
      expect(
        detail.summary.coverImageUrl,
        preview.previewImage(previewCatalog.first),
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(
        (await repo.loadLibrary()).binders
            .firstWhere(
              (b) => b.publicId == PreviewBinderLibraryRepository.familyId,
            )
            .coverImageUrl,
        detail.summary.coverImageUrl,
      );
      expect(tester.takeException(), isNull);
    },
  );
  test(
    'preview adapter rejects unknown/non-checklist artwork before changing metadata',
    () async {
      final repo = CoverRepository();
      await expectLater(
        repo.updateMetadata(
          publicId: PreviewBinderLibraryRepository.familyId,
          title: 'Rejected',
          description: '',
          coverCardPrintId: 'unrelated-card',
        ),
        throwsA(isA<BinderException>()),
      );
      expect(
        (await repo.loadDetail(
          PreviewBinderLibraryRepository.familyId,
        )).summary.title,
        'Family Binder · Sample',
      );
      await expectLater(
        repo.updateMetadata(
          publicId: PreviewBinderLibraryRepository.sharedId,
          title: 'Rejected',
          description: '',
          coverCardPrintId: previewCatalog.first['id'],
        ),
        throwsA(isA<BinderException>()),
      );
    },
  );
  for (final mode in Brightness.values) {
    for (final keyboard in [0.0, 300.0]) {
      testWidgets('gallery fits 320px enlarged text $mode keyboard $keyboard', (
        tester,
      ) async {
        picker.viewport(tester, const Size(320, 640));
        await mountPicker(tester, mode: mode, scale: 1.6, keyboard: keyboard);
        await tester.tap(find.byTooltip('Close cover picker'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });
    }
    testWidgets('gallery fits desktop and retains 9px gaps $mode', (
      tester,
    ) async {
      picker.viewport(tester, const Size(1280, 900));
      await mountPicker(tester, mode: mode);
      final grid = tester.widget<SliverGrid>(find.byType(SliverGrid));
      final delegate =
          grid.gridDelegate as SliverGridDelegateWithFixedCrossAxisCount;
      expect(delegate.crossAxisSpacing, 9);
      expect(delegate.mainAxisSpacing, 9);
      expect(tester.takeException(), isNull);
    });
  }
}
