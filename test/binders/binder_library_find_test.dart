import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/screens/binders/binder_library_screen.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';
import 'package:grookai_vault/widgets/binders/binder_widgets.dart';
import 'binder_refinement_test.dart' as f;
import 'binder_page_picker_test.dart' as picker;
import 'binder_main_integration_test.dart' as integration;

BinderSummary row(
  String id,
  String title, {
  String role = 'owner',
  String read = 'private',
  String join = 'closed',
  String lifecycle = 'active',
  int complete = 0,
  String target = 'Eevee',
  bool community = false,
}) => BinderSummary.fromJson({
  'id': id,
  'public_id': id,
  'title': title,
  'description': 'Promo collection',
  'target_label': target,
  'viewer_role': role,
  'read_access': read,
  'join_policy': join,
  'discoverability': community ? 'listed' : 'unlisted',
  'contribution_policy': community ? 'approval_required' : 'owner_only',
  'lifecycle': lifecycle,
  'total_slots': 12,
  'completed_slots': complete,
});

class LibraryRepository implements BinderRepository {
  final rows = [
    row('a', 'Eevee private'),
    row(
      'b',
      'Family goal',
      role: 'contributor',
      join: 'invite_only',
      target: 'Pikachu',
    ),
    row('c', 'Finished Eevee', complete: 12),
    row('d', 'Archived Eevee', lifecycle: 'archived'),
  ];
  bool paginated = false;
  bool failMore = false;
  int reads = 0;
  bool invitations = false;
  @override
  String? get currentUserId => 'local-search-test';
  @override
  Future<BinderLibraryPage> loadLibrary({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    reads++;
    if (cursor != null && failMore) {
      throw const BinderException(
        BinderFailureKind.unavailable,
        'Unable to load more. Try again.',
      );
    }
    return BinderLibraryPage(
      binders: !paginated
          ? rows
          : cursor == null
          ? [rows.first]
          : [rows[1]],
      hasMore: paginated && cursor == null,
      nextCursor: paginated && cursor == null
          ? const BinderCursor(id: 'next')
          : null,
    );
  }

  @override
  Future<BinderPage<BinderInvitation>> loadInvitationInbox({
    BinderCursor? cursor,
    int limit = 50,
  }) async => BinderPage(
    items: invitations
        ? [
            const BinderInvitation(
              id: 'inv',
              state: BinderInvitationState.pending,
              maximumRole: BinderRole.contributor,
              binderTitle: 'Unrelated invitation',
            ),
          ]
        : [],
  );
  @override
  Future<BinderPage<BinderSuspendedAccess>> loadSuspendedBinders({
    BinderCursor? cursor,
    int limit = 20,
  }) async => const BinderPage(items: []);
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected mutation or read: ${invocation.memberName}');
}

Future<void> mount(
  WidgetTester tester,
  BinderRepository repo, {
  Brightness mode = Brightness.dark,
  double scale = 1,
}) async {
  await tester.pumpWidget(
    f.app(
      BinderLibraryScreen(repository: repo),
      mode: mode,
      scale: scale,
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> search(WidgetTester tester, String text) async {
  await tester.enterText(
    find.byKey(const ValueKey('binder-library-search')),
    text,
  );
  await tester.testTextInput.receiveAction(TextInputAction.search);
  await tester.pumpAndSettle();
}

Future<void> reveal(WidgetTester tester, Finder target) =>
    integration.reveal(tester, target);

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  testWidgets(
    'multi-term search includes title and target and retains completed and archived sections',
    (tester) async {
      final repo = LibraryRepository();
      await mount(tester, repo);
      await search(tester, '  EEVEE   promo ');
      expect(find.text('3 Binders shown'), findsOneWidget);
      expect(find.text('Family goal'), findsNothing);
      await reveal(tester, find.text('Finished Eevee'));
      expect(find.text('Completed'), findsOneWidget);
      await reveal(tester, find.text('Archived Eevee'));
      expect(find.text('Archived'), findsOneWidget);
      expect(repo.reads, 1);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'shared scope combines with search and clear search preserves scope',
    (tester) async {
      final repo = LibraryRepository();
      await mount(tester, repo);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Shared'));
      await tester.pumpAndSettle();
      await search(tester, 'family');
      expect(find.text('1 Binder shown'), findsOneWidget);
      expect(find.text('Eevee private'), findsNothing);
      await tester.tap(find.byTooltip('Clear Binder search'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Shared'))
            .selected,
        isTrue,
      );
      expect(find.text('1 Binder shown'), findsOneWidget);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Mine'));
      await tester.pumpAndSettle();
      expect(find.text('3 Binders shown'), findsOneWidget);
    },
  );
  testWidgets('no match clear resets both search and scope', (tester) async {
    await mount(tester, LibraryRepository());
    await tester.tap(find.widgetWithText(ChoiceChip, 'Shared'));
    await search(tester, 'Blastoise');
    expect(find.text('No matching Binders'), findsOneWidget);
    await tester.tap(find.text('Clear filters'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      isEmpty,
    );
    expect(
      tester
          .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'All'))
          .selected,
      isTrue,
    );
    expect(find.text('Eevee private'), findsOneWidget);
  });
  testWidgets(
    'search keeps invitation lane visible without treating it as a search result',
    (tester) async {
      final repo = LibraryRepository()..invitations = true;
      await mount(tester, repo);
      await search(tester, 'no match');
      expect(find.text('0 Binders shown'), findsOneWidget);
      await reveal(tester, find.text('Unrelated invitation'));
      expect(find.text('Invitations'), findsOneWidget);
      await reveal(tester, find.text('No matching Binders'));
      expect(find.text('No matching Binders'), findsOneWidget);
    },
  );
  testWidgets(
    'pagination remains explicit and current query filters the next authorized page',
    (tester) async {
      final repo = LibraryRepository()..paginated = true;
      await mount(tester, repo);
      await search(tester, 'family');
      expect(
        find.text('0 Binders in 1 loaded. Load more to include others.'),
        findsOneWidget,
      );
      await reveal(tester, find.text('Load more'));
      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();
      expect(repo.reads, 2);
      await reveal(tester, find.text('Family goal'));
      expect(find.text('Eevee private'), findsNothing);
      expect(find.text('Load more'), findsNothing);
    },
  );
  testWidgets('pagination failure retains search and can retry the same page', (
    tester,
  ) async {
    final repo = LibraryRepository()
      ..paginated = true
      ..failMore = true;
    await mount(tester, repo);
    await search(tester, 'family');
    await reveal(tester, find.text('Load more'));
    await tester.tap(find.text('Load more'));
    await tester.pumpAndSettle();
    expect(find.text('Unable to load more. Try again.'), findsOneWidget);
    repo.failMore = false;
    await tester.tap(find.text('Load more'));
    await tester.pumpAndSettle();
    expect(find.text('Unable to load more. Try again.'), findsNothing);
    await reveal(tester, find.text('Family goal'));
    expect(find.text('Family goal'), findsOneWidget);
  });
  testWidgets(
    'opening actual shared Binder and returning retains query and scope',
    (tester) async {
      await mount(tester, integration.repository());
      await tester.tap(find.widgetWithText(ChoiceChip, 'Shared'));
      await search(tester, 'family');
      await reveal(tester, find.text('Shared family Binder · Sample'));
      await tester.tap(find.text('Shared family Binder · Sample'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'family',
      );
      expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Shared'))
            .selected,
        isTrue,
      );
      expect(find.text('1 Binder shown'), findsOneWidget);
    },
  );
  for (final mode in Brightness.values) {
    testWidgets('filters and empty state fit narrow enlarged text $mode', (
      tester,
    ) async {
      picker.viewport(tester, const Size(320, 640));
      await mount(tester, LibraryRepository(), mode: mode, scale: 1.6);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Shared'));
      await search(tester, 'unmatched');
      await reveal(tester, find.text('Clear filters'));
      await tester.tap(find.text('Clear filters'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
    testWidgets(
      'privacy semantics distinguish invite-only public and Community $mode',
      (tester) async {
        final semantics = tester.ensureSemantics();
        final rows = [
          row('a', 'Personal sample'),
          row('b', 'Family sample', join: 'invite_only'),
          row('c', 'Public sample', read: 'public'),
          row(
            'd',
            'Community sample',
            read: 'public',
            join: 'request_to_join',
            community: true,
          ),
        ];
        await tester.pumpWidget(
          f.app(
            Scaffold(
              body: SingleChildScrollView(
                child: Column(
                  children: [
                    for (final r in rows)
                      BinderSummaryCard(binder: r, onTap: () {}),
                  ],
                ),
              ),
            ),
            mode: mode,
            scale: 1.6,
          ),
        );
        expect(
          find.bySemanticsLabel(RegExp('Personal sample.*Private')),
          findsOneWidget,
        );
        expect(
          find.bySemanticsLabel(RegExp('Family sample.*Private · Invite-only')),
          findsOneWidget,
        );
        expect(
          find.bySemanticsLabel(RegExp('Public sample.*Public')),
          findsOneWidget,
        );
        expect(
          find.bySemanticsLabel(RegExp('Community sample.*Community')),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        semantics.dispose();
      },
    );
  }
}
