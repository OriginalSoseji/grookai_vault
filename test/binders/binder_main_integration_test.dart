import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/binders/binder_feature_flags.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';
import 'package:grookai_vault/screens/binders/binder_library_screen.dart';
import 'package:grookai_vault/screens/binders/binder_detail_screen.dart';
import 'package:grookai_vault/screens/binders/binder_collaboration_screens.dart';
import 'package:grookai_vault/screens/binders/binder_discovery_screens.dart';
import 'package:grookai_vault/screens/binders/binder_custom_checklist_screen.dart';
import 'package:grookai_vault/screens/binders/binder_create_screen.dart';
import '../support/collector_refinement/main.dart' as preview;
import '../support/collector_refinement/catalog.dart';
import '../support/collector_refinement/binder_library_repository.dart';
import 'binder_refinement_test.dart' as f;
import 'binder_editor_navigation_test.dart' as nav;
import 'binder_page_picker_test.dart' as picker;

PreviewBinderLibraryRepository repository() => PreviewBinderLibraryRepository(
  catalog: preview.PreviewBinderRepository(),
  initialSlots: [
    for (final card in previewCatalog)
      BinderCustomSlotDraft(
        card: BinderCatalogCard(
          cardPrintId: card['id']!,
          name: card['name']!,
          setLabel: preview.previewSet(card),
          number: card['number'],
          hostedImageUrl: null,
        ),
        finish: f.anyFinish,
      ),
  ],
);
Future<void> mount(
  WidgetTester tester,
  PreviewBinderLibraryRepository repo, {
  Brightness mode = Brightness.dark,
  double scale = 1,
}) async {
  await tester.pumpWidget(
    f.app(
      BinderLibraryScreen(
        repository: repo,
        featureFlags: BinderFeatureFlags.production,
      ),
      mode: mode,
      scale: scale,
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> reveal(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(
    target,
    160,
    scrollable: find
        .byWidgetPredicate(
          (w) =>
              w is Scrollable &&
              w.axisDirection == AxisDirection.down &&
              w.restorationId != 'editable',
        )
        .last,
  );
  await tester.pumpAndSettle();
}

Future<void> openBinder(WidgetTester tester, String title) async {
  await reveal(tester, find.text(title));
  await tester.tap(find.text(title));
  await tester.pumpAndSettle();
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test(
    'production gates are reused without enabling unreleased notifications or set targets',
    () {
      const flags = BinderFeatureFlags.production;
      expect(flags.sharedAvailable, isTrue);
      expect(flags.communityAvailable, isTrue);
      expect(flags.customBindersAvailable, isTrue);
      expect(flags.notifications, isFalse);
      expect(flags.pulseSharing, isFalse);
      expect(flags.setBinders, isFalse);
    },
  );
  test(
    'library has private and family goals, community remains discoverable separately',
    () async {
      final repo = repository();
      final page = await repo.loadLibrary();
      expect(page.binders.length, 3);
      expect(page.continueBuilding.length, 2);
      expect(page.sharedWithMe.length, 1);
      for (final b in page.binders) {
        expect(b.readAccess, BinderReadAccess.private);
        expect(b.discoverability, BinderDiscoverability.unlisted);
        expect(b.completedSlots, 0);
      }
      final community = await repo.explore();
      expect(community.items.length, 1);
      expect(
        community.items.single.publicId,
        PreviewBinderLibraryRepository.communityId,
      );
      expect(community.items.single.isExternalProjection, isTrue);
      expect(
        community.items.any(
          (b) =>
              b.publicId == PreviewBinderLibraryRepository.privateId ||
              b.publicId == PreviewBinderLibraryRepository.familyId,
        ),
        isFalse,
      );
      await expectLater(
        repo.loadPublicDetail(PreviewBinderLibraryRepository.privateId),
        throwsA(isA<BinderException>()),
      );
      await expectLater(
        repo.loadPublicDetail(PreviewBinderLibraryRepository.familyId),
        throwsA(isA<BinderException>()),
      );
    },
  );
  test(
    'community uses hardened external projection and request/withdraw remains local',
    () async {
      final repo = repository();
      var detail = await repo.loadPublicDetail(
        PreviewBinderLibraryRepository.communityId,
      );
      expect(detail.externalChecklist.items.length, 12);
      expect(detail.permissions.canEdit, isFalse);
      expect(detail.permissions.canInvite, isFalse);
      expect(detail.viewLinks, isEmpty);
      expect(detail.pendingInvitations, isEmpty);
      expect(detail.canRequestToJoin, isTrue);
      await repo.requestToJoin(PreviewBinderLibraryRepository.communityId);
      detail = await repo.loadPublicDetail(
        PreviewBinderLibraryRepository.communityId,
      );
      expect(detail.pendingJoinRequest, isNotNull);
      expect(detail.canRequestToJoin, isFalse);
      await repo.withdrawJoinRequest(detail.pendingJoinRequest!.id);
      expect(
        (await repo.loadPublicDetail(
          PreviewBinderLibraryRepository.communityId,
        )).canRequestToJoin,
        isTrue,
      );
    },
  );
  test(
    'private default remains private even after the sample owner changes an existing policy',
    () async {
      final repo = repository();
      await repo.updatePolicy(
        publicId: PreviewBinderLibraryRepository.privateId,
        readAccess: BinderReadAccess.public,
        discoverability: BinderDiscoverability.listed,
        joinPolicy: BinderJoinPolicy.requestToJoin,
        contributionPolicy: BinderContributionPolicy.approvalRequired,
      );
      final id = await repo.createBinder(
        const CreateBinderInput(
          title: 'New private sample',
          description: '',
          targetKind: BinderTargetKind.species,
          targetId: 'sample-eevee-target',
          checklistMode: BinderChecklistMode.cardPrints,
        ),
      );
      final row = (await repo.loadDetail(id)).summary;
      expect(row.readAccess, BinderReadAccess.private);
      expect(row.joinPolicy, BinderJoinPolicy.closed);
      expect(row.contributionPolicy, BinderContributionPolicy.ownerOnly);
    },
  );
  test(
    'exact revised checklist survives returning through the main detail controller',
    () async {
      final repo = repository();
      final cards = await repo.searchCustomCards(query: 'Eevee');
      final finishes = await repo.loadCardFinishOptions(
        cards.single.cardPrintId,
      );
      final slot = BinderCustomSlotDraft(
        card: cards.single,
        finish: finishes.firstWhere((f) => f.cardPrintingId != null),
        requiredQuantity: 3,
      );
      await repo.publishCustomRevision(
        publicId: PreviewBinderLibraryRepository.privateId,
        slots: [slot.toWireJson()],
      );
      final page = await repo.loadChecklist(
        publicId: PreviewBinderLibraryRepository.privateId,
      );
      expect(page.items.single.cardPrintingId, preview.previewPrintingId);
      expect(page.items.single.requiredQuantity, 3);
      expect(
        (await repo.loadDetail(
          PreviewBinderLibraryRepository.privateId,
        )).definitionRevision,
        2,
      );
    },
  );
  test(
    'preview never issues invitation tokens, view links, consent changes or eligible owned copies',
    () async {
      final repo = repository();
      expect(
        (await repo.loadEligibleCopies(
          publicId: PreviewBinderLibraryRepository.familyId,
        )).items,
        isEmpty,
      );
      await expectLater(
        Future.sync(
          () => repo.createInvitation(
            publicId: PreviewBinderLibraryRepository.familyId,
            maximumRole: BinderRole.contributor,
          ),
        ),
        throwsA(isA<BinderException>()),
      );
      await expectLater(
        Future.sync(
          () => repo.createViewLink(
            publicId: PreviewBinderLibraryRepository.familyId,
          ),
        ),
        throwsA(isA<BinderException>()),
      );
      await expectLater(
        repo.updateMemberPreferences(
          publicId: PreviewBinderLibraryRepository.familyId,
          contentScope: BinderConsentScope.none,
          identityScope: BinderConsentScope.none,
        ),
        throwsA(isA<BinderException>()),
      );
    },
  );
  for (final mode in Brightness.values) {
    testWidgets(
      'existing library opens family members and existing invite/share screens $mode',
      (tester) async {
        final repo = repository();
        await mount(tester, repo, mode: mode);
        expect(find.byType(BinderLibraryScreen), findsOneWidget);
        await openBinder(tester, 'Family Binder · Sample');
        expect(find.byType(BinderDetailScreen), findsOneWidget);
        await tester.tap(find.text('Members'));
        await tester.pumpAndSettle();
        expect(find.text('Family member · Sample'), findsOneWidget);
        await tester.tap(find.text('Invite people'));
        await tester.pumpAndSettle();
        expect(find.byType(BinderInvitePeopleScreen), findsOneWidget);
        expect(find.text('Maximum role'), findsOneWidget);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Share or invite'));
        await tester.pumpAndSettle();
        expect(find.byType(BinderShareSettingsScreen), findsOneWidget);
        expect(find.text('Invite people'), findsOneWidget);
        expect(find.text('Create view-only link'), findsOneWidget);
        expect(find.text('Make public'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
    testWidgets(
      'existing Community explorer opens sanitized public detail $mode',
      (tester) async {
        await mount(tester, repository(), mode: mode);
        await tester.tap(find.byTooltip('Explore Community Binders'));
        await tester.pumpAndSettle();
        expect(find.byType(BinderExploreScreen), findsOneWidget);
        await tester.tap(find.text('Community Binder · Sample'));
        await tester.pumpAndSettle();
        expect(find.byType(BinderExternalProjectionScreen), findsOneWidget);
        expect(find.text('Request to join'), findsOneWidget);
        expect(find.text('Members'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('main private checklist entry contains all refined page tools', (
    tester,
  ) async {
    await mount(tester, repository());
    await openBinder(tester, 'Private Binder · Sample');
    await tester.ensureVisible(find.text('Settings'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    final edit = find.text('Edit custom checklist');
    await reveal(tester, edit);
    await tester.tap(edit);
    await tester.pumpAndSettle();
    expect(find.byType(BinderCustomChecklistEditorScreen), findsOneWidget);
    await nav.switchView(tester, 'arrange');
    expect(find.byKey(const ValueKey('binder-grid-size')), findsOneWidget);
    expect(find.byKey(const ValueKey('binder-share-page')), findsOneWidget);
    expect(find.byKey(const ValueKey('binder-pocket-0')), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(BinderDetailScreen), findsOneWidget);
    expect(find.text('Review checklist'), findsNothing);
  });
  testWidgets(
    'create presets remain main-build Personal Shared/family and Community',
    (tester) async {
      await mount(tester, repository());
      await tester.tap(find.text('Create Binder'));
      await tester.pumpAndSettle();
      expect(find.byType(BinderCreateScreen), findsOneWidget);
      await reveal(tester, find.text('Family or friends'));
      expect(find.text('Family or friends'), findsOneWidget);
      expect(find.text('Community Binder'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'actual review app Binder root uses the main library and retains sample boundary on pushed routes',
    (tester) async {
      await tester.pumpWidget(
        const preview.CollectorPreviewApp(initialIndex: 3),
      );
      await tester.pumpAndSettle();
      expect(find.byType(BinderLibraryScreen), findsOneWidget);
      expect(
        find.text('Sample data · Changes stay in this preview'),
        findsOneWidget,
      );
      final banner = tester.widget<Text>(
        find.text('Sample data · Changes stay in this preview'),
      );
      expect(banner.style!.fontFamily, 'Roboto');
      expect(banner.style!.decoration, TextDecoration.none);
      await openBinder(tester, 'Family Binder · Sample');
      expect(find.byType(BinderDetailScreen), findsOneWidget);
      expect(
        find.text('Sample data · Changes stay in this preview'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'review shell background and banner follow the main light theme',
    (tester) async {
      await tester.pumpWidget(
        const preview.CollectorPreviewApp(initialIndex: 3),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Switch theme'));
      await tester.pumpAndSettle();
      final backdrop = tester.widget<ColoredBox>(
        find.byKey(const ValueKey('collector-preview-background')),
      );
      expect(backdrop.color, const Color(0xFFF4F5ED));
      final banner = tester.widget<Text>(
        find.text('Sample data · Changes stay in this preview'),
      );
      expect(banner.style!.color, const Color(0xFF080B09));
      expect(banner.style!.fontFamily, 'Roboto');
      expect(tester.takeException(), isNull);
    },
  );

  for (final preset in ['Personal', 'Family or friends', 'Community Binder']) {
    testWidgets(
      'existing create workflow applies $preset through the same repository boundary',
      (tester) async {
        final repo = repository();
        await mount(tester, repo);
        await tester.tap(find.text('Create Binder'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Eevee · Sample'));
        await tester.pumpAndSettle();
        await reveal(tester, find.text(preset));
        await tester.tap(find.text(preset));
        await tester.pumpAndSettle();
        final create = find.widgetWithText(FilledButton, 'Create Binder');
        await reveal(tester, create);
        await tester.tap(create);
        await tester.pumpAndSettle();
        final created = (await repo.loadLibrary()).binders.last;
        expect(find.byType(BinderDetailScreen), findsOneWidget);
        expect(
          created.readAccess,
          preset == 'Community Binder'
              ? BinderReadAccess.public
              : BinderReadAccess.private,
        );
        expect(
          created.joinPolicy,
          preset == 'Personal'
              ? BinderJoinPolicy.closed
              : preset == 'Family or friends'
              ? BinderJoinPolicy.inviteOnly
              : BinderJoinPolicy.requestToJoin,
        );
        expect(
          created.contributionPolicy,
          preset == 'Personal'
              ? BinderContributionPolicy.ownerOnly
              : preset == 'Family or friends'
              ? BinderContributionPolicy.membersDirect
              : BinderContributionPolicy.approvalRequired,
        );
        expect(created.completedSlots, 0);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'existing invitation form fails closed locally without producing a production token',
    (tester) async {
      await mount(tester, repository());
      await openBinder(tester, 'Family Binder · Sample');
      await tester.tap(find.byTooltip('Share or invite'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Invite people'));
      await tester.pumpAndSettle();
      final create = find.text('Create invitation');
      await reveal(tester, create);
      await tester.tap(create);
      await tester.pumpAndSettle();
      expect(
        find.textContaining('This action needs the signed-in main build.'),
        findsOneWidget,
      );
      expect(find.text('Copy invitation link'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('shared contributor cannot edit checklist or manage privacy', (
    tester,
  ) async {
    await mount(tester, repository());
    await openBinder(tester, 'Shared family Binder · Sample');
    expect(find.text('Edit custom checklist'), findsNothing);
    await tester.ensureVisible(find.text('Settings'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    expect(find.text('Access and collaboration'), findsNothing);
    expect(find.text('Save access settings'), findsNothing);
    expect(tester.takeException(), isNull);
  });
  for (final mode in Brightness.values) {
    testWidgets(
      'library and private settings fit a narrow enlarged preview $mode',
      (tester) async {
        picker.viewport(tester, const Size(320, 640));
        await mount(tester, repository(), mode: mode, scale: 1.6);
        await openBinder(tester, 'Private Binder · Sample');
        await tester.ensureVisible(find.text('Settings'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Settings'));
        await tester.pumpAndSettle();
        await reveal(tester, find.text('Read access'));
        expect(find.text('Read access'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
