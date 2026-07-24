import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/controllers/binders/binder_controllers.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/screens/binders/binder_create_screen.dart';
import 'package:grookai_vault/screens/binders/binder_collaboration_screens.dart';
import 'package:grookai_vault/screens/binders/binder_detail_screen.dart';
import 'package:grookai_vault/screens/binders/binder_library_screen.dart';
import 'package:grookai_vault/services/binders/binder_feature_flags.dart';
import 'package:grookai_vault/services/binders/binder_private_cache.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

BinderSummary _summary({
  String role = 'owner',
  String publicId = 'binder-public-1',
  String readAccess = 'private',
  String discoverability = 'unlisted',
  String lifecycle = 'active',
  String moderationState = 'clear',
}) {
  return BinderSummary.fromJson(<String, dynamic>{
    'id': 'internal-$publicId',
    'public_id': publicId,
    'title': 'Pikachu Family Binder',
    'target_kind': 'species',
    'target_label': 'Pikachu',
    'target_id': 'species-pikachu',
    'checklist_mode': 'card_prints',
    'completed_slots': 4,
    'total_slots': 20,
    'member_count': 2,
    'viewer_role': role,
    'read_access': readAccess,
    'discoverability': discoverability,
    'join_policy': 'invite_only',
    'contribution_policy': 'members_direct',
    'lifecycle': lifecycle,
    'moderation_state': moderationState,
    'updated_at': '2026-07-23T12:00:00Z',
  });
}

BinderDetail _detail({
  String? coverCardPrintId,
  String readAccess = 'private',
  String discoverability = 'unlisted',
  String role = 'owner',
  String lifecycle = 'active',
  String moderationState = 'clear',
  BinderPermissions? permissions,
  BinderOwnerTransferOffer? ownerTransferOffer,
}) {
  return BinderDetail(
    summary: _summary(
      role: role,
      readAccess: readAccess,
      discoverability: discoverability,
      lifecycle: lifecycle,
      moderationState: moderationState,
    ),
    coverCardPrintId: coverCardPrintId,
    permissions:
        permissions ??
        const BinderPermissions(
          canAddCopy: true,
          canInvite: true,
          canEdit: true,
          canManagePolicy: true,
          canArchive: true,
          canShare: true,
        ),
    ownerTransferOffer: ownerTransferOffer,
  );
}

class _FlowRepository implements BinderRepository {
  _FlowRepository({
    this.libraryPage,
    this.libraryFailure,
    this.policyFailure,
    this.detailValue,
    this.checklistPage,
  });

  @override
  String? currentUserId = 'user-1';
  BinderLibraryPage? libraryPage;
  BinderException? libraryFailure;
  BinderException? detailFailure;
  BinderException? policyFailure;
  BinderDetail? detailValue;
  BinderChecklistPage? checklistPage;

  int libraryLoads = 0;
  int detailLoads = 0;
  int checklistLoads = 0;
  int targetSearches = 0;
  int createCalls = 0;
  int policyUpdates = 0;
  int inboxResponses = 0;
  int deleteCalls = 0;
  int metadataUpdates = 0;
  CreateBinderInput? createdInput;
  bool? lastInboxAccepted;
  String? deleteConfirmation;
  String? updatedCoverCardPrintId;

  @override
  Future<BinderLibraryPage> loadLibrary({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    libraryLoads += 1;
    if (libraryFailure case final failure?) throw failure;
    return libraryPage ??
        BinderLibraryPage(binders: <BinderSummary>[_summary()]);
  }

  @override
  Future<BinderPage<BinderInvitation>> loadInvitationInbox({
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    return BinderPage<BinderInvitation>(
      items: libraryPage?.invitations ?? const <BinderInvitation>[],
    );
  }

  @override
  Future<BinderPage<BinderSuspendedAccess>> loadSuspendedBinders({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    return BinderPage<BinderSuspendedAccess>(
      items: libraryPage?.suspendedBinders ?? const <BinderSuspendedAccess>[],
    );
  }

  @override
  Future<BinderDetail> loadDetail(String publicId) async {
    detailLoads += 1;
    if (detailFailure case final failure?) throw failure;
    return detailValue ?? _detail();
  }

  @override
  Future<BinderChecklistPage> loadChecklist({
    required String publicId,
    BinderChecklistFilter filter = BinderChecklistFilter.all,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    checklistLoads += 1;
    return checklistPage ??
        const BinderChecklistPage(items: <BinderChecklistItem>[]);
  }

  @override
  Future<List<BinderTargetSuggestion>> searchTargets({
    required BinderTargetKind kind,
    required String query,
    int limit = 20,
  }) async {
    targetSearches += 1;
    return const <BinderTargetSuggestion>[];
  }

  @override
  Future<String> createBinder(CreateBinderInput input) async {
    createCalls += 1;
    createdInput = input;
    return 'binder-public-1';
  }

  @override
  Future<void> updatePolicy({
    required String publicId,
    required BinderReadAccess readAccess,
    required BinderDiscoverability discoverability,
    required BinderJoinPolicy joinPolicy,
    required BinderContributionPolicy contributionPolicy,
  }) async {
    policyUpdates += 1;
    if (policyFailure case final failure?) throw failure;
  }

  @override
  Future<String?> respondToInboxInvitation({
    required String invitationId,
    required bool accept,
  }) async {
    inboxResponses += 1;
    lastInboxAccepted = accept;
    return null;
  }

  @override
  Future<void> deleteBinder({
    required String publicId,
    required String confirmation,
  }) async {
    deleteCalls += 1;
    deleteConfirmation = confirmation;
  }

  @override
  Future<void> updateMetadata({
    required String publicId,
    required String title,
    required String description,
    required String? coverCardPrintId,
  }) async {
    metadataUpdates += 1;
    updatedCoverCardPrintId = coverCardPrintId;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) {
    return super.noSuchMethod(invocation);
  }
}

class _ConcurrentLibraryRepository extends _FlowRepository {
  final Completer<BinderLibraryPage> dashboard = Completer<BinderLibraryPage>();
  final List<String> starts = <String>[];

  @override
  Future<BinderLibraryPage> loadLibrary({
    BinderCursor? cursor,
    int limit = 20,
  }) {
    starts.add('dashboard');
    return dashboard.future;
  }

  @override
  Future<BinderPage<BinderInvitation>> loadInvitationInbox({
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    starts.add('invitations');
    return const BinderPage<BinderInvitation>(items: <BinderInvitation>[]);
  }

  @override
  Future<BinderPage<BinderSuspendedAccess>> loadSuspendedBinders({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    starts.add('suspended');
    return const BinderPage<BinderSuspendedAccess>(
      items: <BinderSuspendedAccess>[],
    );
  }
}

Widget _routeLauncher(Widget child) {
  return MaterialApp(
    home: Builder(
      builder: (context) => Scaffold(
        body: Center(
          child: FilledButton(
            onPressed: () => Navigator.of(
              context,
            ).push(MaterialPageRoute<void>(builder: (_) => child)),
            child: const Text('Open flow'),
          ),
        ),
      ),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('library starts independent guarded reads concurrently', () async {
    final repository = _ConcurrentLibraryRepository();
    final controller = BinderLibraryController(repository: repository);

    final loading = controller.load(refresh: true);
    await Future<void>.delayed(Duration.zero);

    expect(
      repository.starts,
      unorderedEquals(<String>['dashboard', 'invitations', 'suspended']),
    );
    repository.dashboard.complete(
      BinderLibraryPage(binders: <BinderSummary>[_summary()]),
    );
    await loading;
    expect(controller.status, BinderLoadStatus.ready);
  });

  test(
    'Binder pagination preserves independently loaded invitations',
    () async {
      const loadedInvitation = BinderInvitation(
        id: 'invite-loaded-page-2',
        state: BinderInvitationState.pending,
        maximumRole: BinderRole.contributor,
      );
      const repeatedDashboardInvitation = BinderInvitation(
        id: 'invite-dashboard-fallback',
        state: BinderInvitationState.pending,
        maximumRole: BinderRole.viewer,
      );
      final repository = _FlowRepository(
        libraryPage: BinderLibraryPage(
          binders: <BinderSummary>[_summary(publicId: 'binder-public-page-2')],
          invitations: const <BinderInvitation>[repeatedDashboardInvitation],
        ),
      );
      final controller = BinderLibraryController(repository: repository)
        ..page = BinderLibraryPage(
          binders: <BinderSummary>[_summary()],
          invitations: const <BinderInvitation>[loadedInvitation],
          nextCursor: const BinderCursor(
            id: 'binder-cursor',
            updatedAt: null,
            createdAt: null,
            position: 1,
          ),
        );

      await controller.loadMore();

      expect(controller.page.invitations.map((item) => item.id), <String>[
        'invite-loaded-page-2',
      ]);
    },
  );

  test('library shows safe cached progress when refresh is offline', () async {
    final cached = BinderLibraryPage(
      binders: <BinderSummary>[_summary()],
      loadedAt: DateTime.utc(2026, 7, 23, 12),
    );
    await BinderPrivateCache.writeLibrary('user-1', cached);
    final repository = _FlowRepository(
      libraryFailure: const BinderException(
        BinderFailureKind.offline,
        'You appear to be offline.',
      ),
    );
    final controller = BinderLibraryController(repository: repository);

    await controller.load();

    expect(controller.status, BinderLoadStatus.ready);
    expect(controller.isStale, isTrue);
    expect(controller.page.binders.single.title, 'Pikachu Family Binder');
    expect(controller.error?.kind, BinderFailureKind.offline);
  });

  test('lost access purges previously loaded private Binder detail', () async {
    final repository = _FlowRepository();
    final controller = BinderDetailController(
      publicId: 'binder-public-1',
      repository: repository,
    );
    await controller.load();
    expect(controller.detail, isNotNull);

    repository.detailFailure = const BinderException(
      BinderFailureKind.noAccess,
      'Binder unavailable.',
    );
    await controller.load(preserveContent: true);

    expect(controller.status, BinderLoadStatus.failed);
    expect(controller.detail, isNull);
    expect(controller.checklist.items, isEmpty);
  });

  test(
    'temporary refresh failure preserves already authorized detail',
    () async {
      final repository = _FlowRepository();
      final controller = BinderDetailController(
        publicId: 'binder-public-1',
        repository: repository,
      );
      await controller.load();

      repository.detailFailure = const BinderException(
        BinderFailureKind.offline,
        'You appear to be offline.',
      );
      await controller.load(preserveContent: true);

      expect(controller.status, BinderLoadStatus.ready);
      expect(controller.detail?.summary.publicId, 'binder-public-1');
      expect(controller.error?.kind, BinderFailureKind.offline);
    },
  );

  testWidgets('default-off screens issue no Binder RPCs', (tester) async {
    final libraryRepository = _FlowRepository();
    await tester.pumpWidget(
      MaterialApp(home: BinderLibraryScreen(repository: libraryRepository)),
    );
    await tester.pump();
    expect(find.text('Binders are not enabled'), findsOneWidget);
    expect(libraryRepository.libraryLoads, 0);

    final createRepository = _FlowRepository();
    await tester.pumpWidget(
      MaterialApp(home: BinderCreateScreen(repository: createRepository)),
    );
    await tester.pump();
    expect(find.text('Binders are not enabled'), findsOneWidget);
    expect(createRepository.targetSearches, 0);

    final detailRepository = _FlowRepository();
    await tester.pumpWidget(
      MaterialApp(
        home: BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: detailRepository,
        ),
      ),
    );
    await tester.pump();
    expect(find.text('Binders are not enabled'), findsOneWidget);
    expect(detailRepository.detailLoads, 0);
    expect(detailRepository.checklistLoads, 0);
  });

  testWidgets('Viewer checklist rows hide an empty action affordance', (
    tester,
  ) async {
    final repository = _FlowRepository(
      detailValue: _detail(
        role: 'viewer',
        permissions: const BinderPermissions(),
      ),
      checklistPage: const BinderChecklistPage(
        items: <BinderChecklistItem>[
          BinderChecklistItem(
            slotId: 'slot-viewer',
            cardPrintId: 'print-viewer',
            name: 'Viewer checklist card',
            requiredQuantity: 1,
            activeQuantity: 0,
          ),
        ],
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Viewer checklist card'), findsOneWidget);
    expect(find.byTooltip('Checklist slot actions'), findsNothing);
  });

  testWidgets('authorized checklist row actions remain available', (
    tester,
  ) async {
    final repository = _FlowRepository(
      detailValue: _detail(
        permissions: const BinderPermissions(
          canAddCopy: true,
          canApprove: true,
        ),
      ),
      checklistPage: const BinderChecklistPage(
        items: <BinderChecklistItem>[
          BinderChecklistItem(
            slotId: 'slot-owner',
            cardPrintId: 'print-owner',
            name: 'Owner checklist card',
            requiredQuantity: 1,
            activeQuantity: 0,
            ownedEligibleCount: 1,
            ownContributionIds: <String>['contribution-own'],
            pendingContributionIds: <String>['contribution-pending'],
            removableContributionIds: <String>['contribution-removable'],
          ),
        ],
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Checklist slot actions'));
    await tester.pumpAndSettle();

    expect(
      find.widgetWithText(PopupMenuItem<String>, 'Add your copy'),
      findsOneWidget,
    );
    expect(find.text('Withdraw your copy'), findsOneWidget);
    expect(find.text('Approve contribution'), findsOneWidget);
    expect(find.text('Reject contribution'), findsOneWidget);
    expect(find.text('Remove contribution'), findsOneWidget);
  });

  testWidgets(
    'library renders collector sections and tokenless inbox actions',
    (tester) async {
      final repository = _FlowRepository(
        libraryPage: BinderLibraryPage(
          binders: <BinderSummary>[
            _summary(),
            _summary(role: 'contributor', publicId: 'binder-public-shared'),
          ],
          invitations: const <BinderInvitation>[
            BinderInvitation(
              id: 'invitation-opaque-id',
              state: BinderInvitationState.pending,
              maximumRole: BinderRole.contributor,
              binderTitle: 'Family Mega Binder',
            ),
          ],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: BinderLibraryScreen(
            repository: repository,
            featureFlags: const BinderFeatureFlags.allEnabled(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Continue building'), findsOneWidget);
      expect(find.text('Shared with me'), findsOneWidget);
      expect(find.text('Family Mega Binder'), findsOneWidget);
      expect(find.textContaining('Cards stay in your Vault'), findsOneWidget);

      await tester.tap(find.widgetWithText(TextButton, 'Decline'));
      await tester.pumpAndSettle();
      expect(repository.inboxResponses, 1);
      expect(repository.lastInboxAccepted, isFalse);
    },
  );

  testWidgets('personal create uses canonical target and stays private', (
    tester,
  ) async {
    final repository = _FlowRepository();
    const target = BinderTargetSuggestion(
      id: 'species-pikachu',
      routeKey: 'pikachu',
      title: 'Pikachu',
      kind: BinderTargetKind.species,
      slotCount: 215,
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderCreateScreen(
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
          initialTarget: target,
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();
    final createButton = find.byKey(const ValueKey('binder-create-submit'));
    await tester.scrollUntilVisible(
      createButton,
      300,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.tap(createButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(repository.createCalls, 1);
    expect(repository.createdInput?.targetId, 'species-pikachu');
    expect(repository.createdInput?.targetKind, BinderTargetKind.species);
    expect(
      repository.createdInput?.checklistMode,
      BinderChecklistMode.cardPrints,
    );
    expect(repository.policyUpdates, 0);
  });

  testWidgets('failed collaboration setup leaves Binder private visibly', (
    tester,
  ) async {
    final repository = _FlowRepository(
      policyFailure: const BinderException(
        BinderFailureKind.unavailable,
        'Policy service unavailable.',
      ),
    );
    const target = BinderTargetSuggestion(
      id: 'species-pikachu',
      routeKey: 'pikachu',
      title: 'Pikachu',
      kind: BinderTargetKind.species,
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderCreateScreen(
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
          initialTarget: target,
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();
    final sharedChoice = find.byKey(const ValueKey('binder-preset-shared'));
    await tester.scrollUntilVisible(
      sharedChoice,
      250,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.tap(sharedChoice);
    await tester.pump();
    final createButton = find.byKey(const ValueKey('binder-create-submit'));
    await tester.scrollUntilVisible(
      createButton,
      250,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.tap(createButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(repository.createCalls, 1);
    expect(repository.policyUpdates, 1);
    expect(find.text('Binder created privately'), findsOneWidget);
    expect(
      find.textContaining('collaboration settings could not be enabled'),
      findsOneWidget,
    );
    expect(find.text('Open flow'), findsNothing);

    await tester.tap(find.text('Okay'));
    await tester.pumpAndSettle();
    expect(find.text('Open flow'), findsOneWidget);
  });

  testWidgets('delete requires and submits DELETE plus current title', (
    tester,
  ) async {
    final repository = _FlowRepository();

    await tester.pumpWidget(
      _routeLauncher(
        BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    final deleteTile = find.byKey(const ValueKey('binder-delete-action'));
    await tester.scrollUntilVisible(
      deleteTile,
      300,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.tap(deleteTile);
    await tester.pumpAndSettle();

    expect(
      find.text('Type “DELETE Pikachu Family Binder” to continue.'),
      findsOneWidget,
    );
    final confirmationField = find.byKey(
      const ValueKey('binder-delete-confirmation-input'),
    );
    await tester.enterText(confirmationField, 'DELETE');
    await tester.pump();
    var deleteButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Delete Binder'),
    );
    expect(deleteButton.onPressed, isNull);

    await tester.enterText(confirmationField, 'DELETE Pikachu Family Binder');
    await tester.pump();
    deleteButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Delete Binder'),
    );
    expect(deleteButton.onPressed, isNotNull);
    await tester.tap(find.widgetWithText(FilledButton, 'Delete Binder'));
    await tester.pumpAndSettle();

    expect(repository.deleteCalls, 1);
    expect(repository.deleteConfirmation, 'DELETE Pikachu Family Binder');
  });

  testWidgets('metadata edit preserves the current governed cover', (
    tester,
  ) async {
    final repository = _FlowRepository(
      detailValue: _detail(coverCardPrintId: 'cover-card-1'),
      checklistPage: const BinderChecklistPage(
        items: <BinderChecklistItem>[
          BinderChecklistItem(
            slotId: 'slot-1',
            cardPrintId: 'cover-card-1',
            name: 'Current Cover Card',
            requiredQuantity: 1,
            activeQuantity: 0,
            imageUrl: 'https://grookaivault.com/api/canon/cards/GV-1/image',
            hasHostedImage: true,
          ),
        ],
      ),
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Title and description'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(repository.metadataUpdates, 1);
    expect(repository.updatedCoverCardPrintId, 'cover-card-1');
  });

  testWidgets('public listed metadata cannot preserve an ineligible cover', (
    tester,
  ) async {
    final repository = _FlowRepository(
      detailValue: _detail(
        coverCardPrintId: 'cover-card-1',
        readAccess: 'public',
        discoverability: 'listed',
      ),
      checklistPage: const BinderChecklistPage(
        items: <BinderChecklistItem>[
          BinderChecklistItem(
            slotId: 'slot-1',
            cardPrintId: 'cover-card-1',
            name: 'Provider-only Cover',
            requiredQuantity: 1,
            activeQuantity: 0,
            hasHostedImage: false,
          ),
        ],
      ),
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Title and description'));
    await tester.pumpAndSettle();

    var saveButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Save'),
    );
    expect(saveButton.onPressed, isNull);
    expect(find.textContaining('Choose a Grookai-hosted card'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('binder-cover-cover-card-1')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('No cover').last);
    await tester.pumpAndSettle();
    saveButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Save'),
    );
    expect(saveButton.onPressed, isNotNull);
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(repository.metadataUpdates, 1);
    expect(repository.updatedCoverCardPrintId, isNull);
  });

  testWidgets('metadata edit clears cover only after explicit No cover', (
    tester,
  ) async {
    final repository = _FlowRepository(
      detailValue: _detail(coverCardPrintId: 'cover-card-1'),
      checklistPage: const BinderChecklistPage(
        items: <BinderChecklistItem>[
          BinderChecklistItem(
            slotId: 'slot-1',
            cardPrintId: 'cover-card-1',
            name: 'Current Cover Card',
            requiredQuantity: 1,
            activeQuantity: 0,
            hasHostedImage: true,
          ),
        ],
      ),
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Title and description'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('binder-cover-cover-card-1')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('No cover').last);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(repository.metadataUpdates, 1);
    expect(repository.updatedCoverCardPrintId, isNull);
  });

  testWidgets('owner transfer offers an explicit Leave disposition', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BinderOwnerTransferScreen(
          publicId: 'binder-public-1',
          repository: _FlowRepository(),
          members: const <BinderMember>[
            BinderMember(
              membershipId: 'member-2',
              role: BinderRole.contributor,
              state: BinderMembershipState.active,
              displayLabel: 'Family Collector',
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Manager'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Leave Binder').last);
    await tester.pumpAndSettle();

    expect(find.textContaining('you will leave this Binder'), findsOneWidget);
    expect(
      find.textContaining('Vault copies will remain unchanged'),
      findsOneWidget,
    );
  });

  testWidgets('frozen archived Owner gets no Restore or transfer revoke', (
    tester,
  ) async {
    final repository = _FlowRepository(
      detailValue: _detail(
        lifecycle: 'archived',
        moderationState: 'frozen',
        permissions: const BinderPermissions(),
        ownerTransferOffer: const BinderOwnerTransferOffer(
          id: 'offer-frozen-owner',
          targetMemberId: 'member-2',
          formerOwnerDisposition: BinderOwnerTransferDisposition.manager,
        ),
      ),
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();

    expect(find.text('Restore'), findsNothing);
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    expect(find.text('Ownership transfer pending'), findsOneWidget);
    expect(find.text('Revoke offer'), findsNothing);
  });

  testWidgets('frozen transfer target gets no Accept or Decline controls', (
    tester,
  ) async {
    final repository = _FlowRepository(
      detailValue: _detail(
        role: 'contributor',
        lifecycle: 'archived',
        moderationState: 'frozen',
        permissions: const BinderPermissions(canLeave: true),
        ownerTransferOffer: const BinderOwnerTransferOffer(
          id: 'offer-frozen-target',
          targetMemberId: 'member-target',
          formerOwnerDisposition: BinderOwnerTransferDisposition.manager,
          isTargetViewer: true,
        ),
      ),
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderDetailScreen(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    expect(find.text('Ownership transfer offered'), findsOneWidget);
    expect(find.text('Accept ownership'), findsNothing);
    expect(find.text('Decline'), findsNothing);
    expect(
      find.textContaining('Transfer actions are unavailable'),
      findsWidgets,
    );
  });
}
